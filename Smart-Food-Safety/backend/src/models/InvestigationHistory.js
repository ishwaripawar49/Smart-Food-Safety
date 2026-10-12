const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const InvestigationHistory = sequelize.define(
  "InvestigationHistory",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    complaint_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    authority_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "users",
        key: "id"
      }
    },

    authority_name: {
      type: DataTypes.STRING(150),
      allowNull: true
    },

    status: {
      type: DataTypes.STRING(50),
      allowNull: false
    },

    remarks: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    tableName: "investigation_history",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false
  }
);

module.exports = InvestigationHistory;