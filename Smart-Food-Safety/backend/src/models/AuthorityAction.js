const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const AuthorityAction = sequelize.define(
  "AuthorityAction",
  {
    // Primary Key
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    // Complaint Reference
    complaint_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    // Authorized Authority ID (User reference)
    authority_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },

    // Authorized Authority
    authority_name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },

    // Investigation Status
    investigation_status: {
      type: DataTypes.ENUM(
        "ASSIGNED",
        "UNDER_INVESTIGATION",
        "ACTION_REQUIRED",
        "ACTION_TAKEN",
        "RESOLVED"
      ),
      allowNull: false,
      defaultValue: "ASSIGNED",
    },

    // Action Taken by Authority
    action_type: {
      type: DataTypes.ENUM(
        "WARNING",
        "INSPECTION_REQUIRED",
        "SAMPLE_TESTING",
        "SHOP_NOTICE",
        "CASE_RESOLVED"
      ),
      allowNull: true,
    },

    // Investigation / Action Remarks
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Date of Authority Action
    action_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "authority_actions",

    timestamps: true,

    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = AuthorityAction;