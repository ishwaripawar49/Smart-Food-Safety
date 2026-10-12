const { DataTypes } = require("sequelize");

/**
 * Migration: Add authority_id foreign key references to authority_actions and investigation_history
 */

async function up(queryInterface, Sequelize) {
  // 1. Check authority_actions
  try {
    const authorityActionsInfo = await queryInterface.describeTable("authority_actions");
    if (!authorityActionsInfo.authority_id) {
      await queryInterface.addColumn("authority_actions", "authority_id", {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
      });
      console.log("  + Added column 'authority_id' to authority_actions");
    }
  } catch (err) {
    console.error("  ! Error checking authority_actions:", err.message);
  }

  // 2. Check investigation_history
  try {
    const investigationHistoryInfo = await queryInterface.describeTable("investigation_history");
    if (!investigationHistoryInfo.authority_id) {
      await queryInterface.addColumn("investigation_history", "authority_id", {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
      });
      console.log("  + Added column 'authority_id' to investigation_history");
    }
  } catch (err) {
    console.error("  ! Error checking investigation_history:", err.message);
  }
}

async function down(queryInterface, Sequelize) {
  try {
    await queryInterface.removeColumn("authority_actions", "authority_id");
    await queryInterface.removeColumn("investigation_history", "authority_id");
  } catch (err) {
    // ignore
  }
}

module.exports = { up, down };
