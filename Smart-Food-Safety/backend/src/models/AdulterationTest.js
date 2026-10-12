const { DataTypes } = require("sequelize");

const { sequelize } = require("../config/database");

const AdulterationTest = sequelize.define(
  "AdulterationTest",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    complaint_id: {
      type: DataTypes.INTEGER
    },

    test_type: {
      type: DataTypes.STRING(100)
    },

    sample_name: {
      type: DataTypes.STRING(100)
    },

    result: {
      type: DataTypes.STRING(255)
    },

    confidence: {
      type: DataTypes.DECIMAL(5, 2)
    },

    remarks: {
      type: DataTypes.TEXT
    }
  },
  {
    tableName: "adulteration_tests",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false
  }
);

module.exports = AdulterationTest;