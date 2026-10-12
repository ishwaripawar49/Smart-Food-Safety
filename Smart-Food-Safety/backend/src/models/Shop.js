const { DataTypes } = require("sequelize");

const { sequelize } = require("../config/database");

const Shop = sequelize.define(
  "Shop",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    shop_name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },

    owner_name: {
      type: DataTypes.STRING(100)
    },

    address: {
      type: DataTypes.STRING(255)
    },

    city: {
      type: DataTypes.STRING(100)
    },

    state: {
      type: DataTypes.STRING(100)
    },

    pincode: {
      type: DataTypes.STRING(10)
    },

    phone: {
      type: DataTypes.STRING(20)
    },

    email: {
      type: DataTypes.STRING(150)
    },

    license_number: {
      type: DataTypes.STRING(100)
    },

    status: {
      type: DataTypes.STRING(30),
      defaultValue: "ACTIVE"
    },

    risk_score: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  },
  {
    tableName: "shops",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      { name: "idx_shops_license", fields: ["license_number"] },
      { name: "idx_shops_status", fields: ["status"] }
    ]
  }
);

module.exports = Shop;