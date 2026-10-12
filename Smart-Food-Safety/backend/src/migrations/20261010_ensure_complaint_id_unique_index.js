/**
 * Migration: Ensure complaints.complaint_id has a verified physical UNIQUE index in MySQL.
 *
 * Checks for existing duplicates before adding index.
 * Does not delete or overwrite any existing complaints.
 */

async function up(queryInterface, Sequelize) {
  const sequelize = queryInterface.sequelize;

  // 1. Check for duplicate complaint_id values in the database
  const [dupes] = await sequelize.query(
    "SELECT complaint_id, COUNT(*) as cnt FROM complaints GROUP BY complaint_id HAVING cnt > 1;"
  );

  if (dupes && dupes.length > 0) {
    throw new Error(
      `Cannot create UNIQUE index on complaints.complaint_id: Found ${dupes.length} duplicate ID groups in database!`
    );
  }

  // 2. Inspect existing indexes on complaints table
  const [indexes] = await sequelize.query("SHOW INDEX FROM complaints;");
  const hasUniqueComplaintIdIndex = indexes.some(
    (idx) => idx.Column_name === "complaint_id" && Number(idx.Non_unique) === 0
  );

  if (!hasUniqueComplaintIdIndex) {
    console.log("  + Adding UNIQUE index on complaints.complaint_id...");
    await queryInterface.addIndex("complaints", ["complaint_id"], {
      unique: true,
      name: "complaint_id_unique",
    });
    console.log("  + Verified UNIQUE index 'complaint_id_unique' created successfully.");
  } else {
    console.log("  ✓ Physical UNIQUE index on complaints.complaint_id already exists and is active.");
  }
}

async function down(queryInterface, Sequelize) {
  try {
    await queryInterface.removeIndex("complaints", "complaint_id_unique");
  } catch (err) {
    // If named differently, ignore
  }
}

module.exports = { up, down };
