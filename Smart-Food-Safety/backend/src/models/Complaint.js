const { DataTypes } = require("sequelize");

const { sequelize } = require("../config/database");

const Complaint = sequelize.define(
  "Complaint",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    complaint_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },

    user_id: {
      type: DataTypes.INTEGER
    },

    shop_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },

    seller_listing_type: {
      type: DataTypes.STRING(30),
      defaultValue: "LISTED",
      allowNull: false
    },

    seller_type: {
      type: DataTypes.STRING(50),
      allowNull: true
    },

    reported_shop_name: {
      type: DataTypes.STRING(150),
      allowNull: true
    },

    reported_landmark: {
      type: DataTypes.STRING(255),
      allowNull: true
    },

    reported_address: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    reported_registration_number: {
      type: DataTypes.STRING(100),
      allowNull: true
    },

    registration_verification_status: {
      type: DataTypes.STRING(50),
      defaultValue: "NOT_APPLICABLE",
      allowNull: false
    },

    category: {
      type: DataTypes.STRING(100),
      allowNull: false
    },

    product_name: {
      type: DataTypes.STRING(150)
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },

    incident_date: {
      type: DataTypes.DATEONLY
    },

    location: {
      type: DataTypes.STRING(255)
    },

    status: {
      type: DataTypes.STRING(50),
      defaultValue: "SUBMITTED"
    },

    priority: {
      type: DataTypes.STRING(30),
      defaultValue: "MEDIUM"
    },

    risk_score: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },

    admin_remark: {
      type: DataTypes.TEXT
    },

    latitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
      defaultValue: null
    },

    longitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
      defaultValue: null
    },

    location_accuracy: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: null
    },

    scoring_version: {
      type: DataTypes.STRING(30),
      allowNull: true,
      defaultValue: "v2.0-explainable"
    },

    risk_factors: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const raw = this.getDataValue("risk_factors");
        if (!raw) return [];
        try {
          return JSON.parse(raw);
        } catch {
          return [raw];
        }
      },
      set(val) {
        if (typeof val === "object") {
          this.setDataValue("risk_factors", JSON.stringify(val));
        } else {
          this.setDataValue("risk_factors", val);
        }
      }
    },

    manual_priority_override: {
      type: DataTypes.STRING(30),
      allowNull: true,
      defaultValue: null
    },

    priority_override_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null
    },

    priority_overridden_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null
    },

    priority_overridden_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null
    }
  },

  {
    tableName: "complaints",

    timestamps: true,

    createdAt: "created_at",

    updatedAt: "updated_at",

    indexes: [
      { name: "idx_complaints_status", fields: ["status"] },
      { name: "idx_complaints_user_id", fields: ["user_id"] },
      { name: "idx_complaints_shop_id", fields: ["shop_id"] },
      { name: "idx_complaints_created_at", fields: ["created_at"] },
      { name: "idx_complaints_seller_listing_type", fields: ["seller_listing_type"] },
      { name: "idx_complaints_seller_type", fields: ["seller_type"] },
      { name: "idx_complaints_lat_lng", fields: ["latitude", "longitude"] }
    ]
  }
);

module.exports = Complaint;