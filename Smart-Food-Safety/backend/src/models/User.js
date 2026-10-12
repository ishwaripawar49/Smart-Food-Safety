const { DataTypes } = require("sequelize");

const { sequelize } = require("../config/database");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },

    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true
    },

    phone: {
      type: DataTypes.STRING(20)
    },

    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },

    role: {
      type: DataTypes.STRING(30),
      defaultValue: "CUSTOMER"
    }
  },
  {
    tableName: "users",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
);

module.exports = User;