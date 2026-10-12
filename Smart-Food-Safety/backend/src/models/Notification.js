const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Notification = sequelize.define(
  "Notification",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    complaint_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    recipient_role: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "CUSTOMER"
    },

    title: {
      type: DataTypes.STRING(200),
      allowNull: false
    },

    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },

    notification_type: {
      type: DataTypes.STRING(50),
      defaultValue: "STATUS_UPDATE"
    },

    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  },
  {
    tableName: "notifications",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      { name: "idx_notifications_recipient_role", fields: ["recipient_role"] },
      { name: "idx_notifications_user_id", fields: ["user_id"] },
      { name: "idx_notifications_complaint_id", fields: ["complaint_id"] }
    ]
  }
);

module.exports = Notification;