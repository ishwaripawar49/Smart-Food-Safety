const crypto = require("crypto");
const { Complaint } = require("../models");
const { sequelize } = require("../config/database");

/**
 * Custom error thrown when unique complaint ID allocation exceeds retry limits.
 */
class ComplaintIdExhaustionError extends Error {
  constructor(message = "Unable to allocate unique complaint identifier after maximum retry attempts.", attempts = 0) {
    super(message);
    this.name = "ComplaintIdExhaustionError";
    this.attempts = attempts;
    this.isControlled = true;
  }
}

/**
 * Generate a standard FoodSafe AI complaint tracking identifier.
 * Format: FSA-YYYY-XXXXXX (where XXXXXX is a cryptographically uniform 6-digit integer in 100000..999999)
 *
 * NOTE ON FUTURE SCALABILITY:
 * A 6-digit uniform suffix provides 900,000 discrete tracking IDs per calendar year.
 * The complaints table maintains an internal auto-increment primary key (id: INT) as the authoritative record key.
 * If annual grievance volume approaches ID space saturation, the system can migrate to an 8-digit suffix
 * or alphanumeric Base32 format (e.g., FSA-YYYY-XXXXXXXX) via versioned ID generator routing.
 */
const generateComplaintId = () => {
  const year = new Date().getFullYear();
  const randomNumber = crypto.randomInt(100000, 1000000);
  return `FSA-${year}-${randomNumber}`;
};

/**
 * Check whether a caught error is specifically a unique constraint violation on `complaint_id`.
 * Unrelated database errors (foreign key violations, deadlocks, connection resets, null constraints) must NOT be retried.
 */
const isComplaintIdCollisionError = (error) => {
  if (!error) return false;

  // Sequelize Unique Constraint Error
  if (error.name === "SequelizeUniqueConstraintError") {
    if (error.fields && ("complaint_id" in error.fields || "complaints.complaint_id" in error.fields)) {
      return true;
    }
    if (Array.isArray(error.errors) && error.errors.some((e) => e.path === "complaint_id" || e.message?.includes("complaint_id"))) {
      return true;
    }
    if (error.parent && error.parent.code === "ER_DUP_ENTRY") {
      const msg = String(error.parent.sqlMessage || error.parent.message || "");
      if (msg.includes("complaint_id") || msg.includes("FSA-")) {
        return true;
      }
    }
  }

  // Direct MySQL driver duplicate entry code
  if (error.code === "ER_DUP_ENTRY" || (error.parent && error.parent.code === "ER_DUP_ENTRY")) {
    const msg = String(error.sqlMessage || error.message || error.parent?.sqlMessage || "");
    if (msg.includes("complaint_id") || msg.includes("FSA-")) {
      return true;
    }
  }

  return false;
};

/**
 * Create a Complaint record with collision-safe retries backed by database UNIQUE constraint.
 *
 * @param {object} complaintData - Complaint attributes (excluding complaint_id)
 * @param {object} options
 * @param {number} [options.maxRetries=10] - Maximum bounded retry attempts (default: 10)
 * @param {function} [options.idGenerator] - Optional custom generator (for test collision simulation)
 * @returns {Promise<{ complaint: Complaint, attempts: number, generatedIds: string[] }>}
 */
async function createComplaintWithRetry(complaintData, options = {}) {
  const maxRetries = Number.isInteger(options.maxRetries) && options.maxRetries > 0 ? options.maxRetries : 10;
  const idGen = typeof options.idGenerator === "function" ? options.idGenerator : generateComplaintId;

  let attempts = 0;
  const generatedIds = [];

  while (attempts < maxRetries) {
    attempts++;
    const candidateId = idGen(attempts);
    generatedIds.push(candidateId);

    // Isolated database transaction for the insertion
    const transaction = await sequelize.transaction();

    try {
      const complaint = await Complaint.create(
        {
          ...complaintData,
          complaint_id: candidateId,
        },
        { transaction }
      );

      // Commit transaction on success
      await transaction.commit();

      if (attempts > 1) {
        console.info(
          `[COMPLAINT-ID-RETRY] Successfully allocated unique ID '${candidateId}' on attempt ${attempts} (resolved collision).`
        );
      }

      return { complaint, attempts, generatedIds };
    } catch (error) {
      // Always roll back failed attempt
      try {
        await transaction.rollback();
      } catch (rbErr) {
        // transaction may already be finished
      }

      // Verify if error is specifically an ID uniqueness collision
      if (isComplaintIdCollisionError(error)) {
        console.warn(
          `[COMPLAINT-ID-COLLISION] ID '${candidateId}' collided with existing database record on attempt ${attempts}/${maxRetries}. Retrying with fresh random identifier...`
        );

        if (attempts >= maxRetries) {
          console.error(
            `[COMPLAINT-ID-EXHAUSTION] Exhausted ${maxRetries} retry attempts without obtaining an available complaint ID.`
          );
          throw new ComplaintIdExhaustionError(
            "System was unable to allocate a unique complaint tracking number after bounded retries.",
            attempts
          );
        }

        // Loop continues to generate a new candidate ID
        continue;
      }

      // Re-throw unrelated database errors immediately without retrying
      throw error;
    }
  }

  throw new ComplaintIdExhaustionError(
    "System was unable to allocate a unique complaint tracking number after bounded retries.",
    attempts
  );
}

module.exports = {
  createComplaintWithRetry,
  generateComplaintId,
  isComplaintIdCollisionError,
  ComplaintIdExhaustionError,
};
