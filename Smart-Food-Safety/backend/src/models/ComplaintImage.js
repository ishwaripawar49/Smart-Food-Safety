const { DataTypes } = require("sequelize");

const { sequelize } = require("../config/database");

const ComplaintImage = sequelize.define(
  "ComplaintImage",
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

    image_url: {
      type: DataTypes.STRING,
      allowNull: false
    }
  },
  {
    tableName: "complaint_images",

    timestamps: true,

    createdAt: "uploaded_at",

    updatedAt: false
  }
);

module.exports = ComplaintImage;