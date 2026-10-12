const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const ComplaintSimilarityReview = sequelize.define(
  "ComplaintSimilarityReview",
  {
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
      get() {
        const raw = this.getDataValue("matching_reasons");
        if (!raw) return [];
        try {
          return JSON.parse(raw);
        } catch {
          return [raw];
        }
      },
      set(val) {
        if (typeof val === "object") {
          this.setDataValue("matching_reasons", JSON.stringify(val));
        } else {
          this.setDataValue("matching_reasons", val);
        }
      },
    },
    review_status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "PENDING", // 'PENDING' | 'RELATED' | 'UNRELATED' | 'DISMISSED'
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
  },
  {
    tableName: "complaint_similarity_reviews",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { name: "idx_csr_source", fields: ["source_complaint_id"] },
      { name: "idx_csr_target", fields: ["target_complaint_id"] },
      { name: "idx_csr_status", fields: ["review_status"] },
    ],
  }
);

module.exports = ComplaintSimilarityReview;
