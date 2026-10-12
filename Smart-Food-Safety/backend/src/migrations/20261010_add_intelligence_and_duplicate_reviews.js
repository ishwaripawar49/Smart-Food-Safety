const { DataTypes } = require("sequelize");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add explainable risk and override fields to complaints table
    const [complaintColumns] = await queryInterface.sequelize.query(
      "DESCRIBE complaints"
    );
    const existingColNames = complaintColumns.map((c) => c.Field);

    if (!existingColNames.includes("scoring_version")) {
      await queryInterface.addColumn("complaints", "scoring_version", {
        type: DataTypes.STRING(30),
        allowNull: true,
        defaultValue: "v2.0-explainable",
      });
      console.log("  + Added column 'scoring_version' to complaints table.");
    }

    if (!existingColNames.includes("risk_factors")) {
      await queryInterface.addColumn("complaints", "risk_factors", {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null,
      });
      console.log("  + Added column 'risk_factors' to complaints table.");
    }

    if (!existingColNames.includes("manual_priority_override")) {
      await queryInterface.addColumn("complaints", "manual_priority_override", {
        type: DataTypes.STRING(30),
        allowNull: true,
        defaultValue: null,
      });
      console.log("  + Added column 'manual_priority_override' to complaints table.");
    }

    if (!existingColNames.includes("priority_override_reason")) {
      await queryInterface.addColumn("complaints", "priority_override_reason", {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null,
      });
      console.log("  + Added column 'priority_override_reason' to complaints table.");
    }

    if (!existingColNames.includes("priority_overridden_by")) {
      await queryInterface.addColumn("complaints", "priority_overridden_by", {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
      });
      console.log("  + Added column 'priority_overridden_by' to complaints table.");
    }

    if (!existingColNames.includes("priority_overridden_at")) {
      await queryInterface.addColumn("complaints", "priority_overridden_at", {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
      });
      console.log("  + Added column 'priority_overridden_at' to complaints table.");
    }

    // 2. Create complaint_similarity_reviews table if it does not exist
    const [tables] = await queryInterface.sequelize.query(
      "SHOW TABLES LIKE 'complaint_similarity_reviews'"
    );

    if (tables.length === 0) {
      await queryInterface.createTable("complaint_similarity_reviews", {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        source_complaint_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        target_complaint_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        similarity_score: {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0,
        },
        matching_reasons: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        review_status: {
          type: DataTypes.STRING(30),
          allowNull: false,
          defaultValue: "PENDING",
        },
        reviewed_by: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        review_notes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        reviewed_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
        },
      });

      console.log("  + Created table 'complaint_similarity_reviews'.");

      // Add indexes for high-speed queue lookups
      await queryInterface.addIndex("complaint_similarity_reviews", ["source_complaint_id"], {
        name: "idx_csr_source",
      });
      await queryInterface.addIndex("complaint_similarity_reviews", ["target_complaint_id"], {
        name: "idx_csr_target",
      });
      await queryInterface.addIndex("complaint_similarity_reviews", ["review_status"], {
        name: "idx_csr_status",
      });
      console.log("  + Added indexes to 'complaint_similarity_reviews'.");
    } else {
      console.log("  = Table 'complaint_similarity_reviews' already exists.");
    }
  },

  down: async (queryInterface) => {
    // Non-destructive: down intentionally does not drop data
    console.log("Down migration avoided to protect historical audit data.");
  },
};
