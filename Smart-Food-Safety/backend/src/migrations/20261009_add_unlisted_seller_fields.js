const { DataTypes } = require("sequelize");

/**
 * Migration: Add Unlisted Food Seller & Roadside Vendor Reporting Fields to Complaints Table
 *
 * Adds non-destructive columns:
 * - seller_listing_type: 'LISTED' | 'UNLISTED' (default 'LISTED')
 * - seller_type: 'Roadside Food Stall' | 'Food Cart' | 'Small Shop' | 'Restaurant' | 'Temporary Market Stall' | 'Other / Unknown'
 * - reported_shop_name: Optional custom stall or shop name
 * - reported_landmark: Specific landmark / location reference
 * - reported_address: Optional address / street text
 * - reported_registration_number: Optional FSSAI or local registration
 * - registration_verification_status: Verification state ('NOT_APPLICABLE', 'UNVERIFIED', 'PENDING_VERIFICATION', 'VERIFIED_LISTED')
 */

async function up(queryInterface, Sequelize) {
  const tableInfo = await queryInterface.describeTable("complaints");

  // 1. seller_listing_type
  if (!tableInfo.seller_listing_type) {
    await queryInterface.addColumn("complaints", "seller_listing_type", {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "LISTED"
    });
    console.log("  + Added column 'seller_listing_type'");
  }

  // 2. seller_type
  if (!tableInfo.seller_type) {
    await queryInterface.addColumn("complaints", "seller_type", {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: null
    });
    console.log("  + Added column 'seller_type'");
  }

  // 3. reported_shop_name
  if (!tableInfo.reported_shop_name) {
    await queryInterface.addColumn("complaints", "reported_shop_name", {
      type: DataTypes.STRING(150),
      allowNull: true,
      defaultValue: null
    });
    console.log("  + Added column 'reported_shop_name'");
  }

  // 4. reported_landmark
  if (!tableInfo.reported_landmark) {
    await queryInterface.addColumn("complaints", "reported_landmark", {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null
    });
    console.log("  + Added column 'reported_landmark'");
  }

  // 5. reported_address
  if (!tableInfo.reported_address) {
    await queryInterface.addColumn("complaints", "reported_address", {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null
    });
    console.log("  + Added column 'reported_address'");
  }

  // 6. reported_registration_number
  if (!tableInfo.reported_registration_number) {
    await queryInterface.addColumn("complaints", "reported_registration_number", {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: null
    });
    console.log("  + Added column 'reported_registration_number'");
  }

  // 7. registration_verification_status
  if (!tableInfo.registration_verification_status) {
    await queryInterface.addColumn("complaints", "registration_verification_status", {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "NOT_APPLICABLE"
    });
    console.log("  + Added column 'registration_verification_status'");
  }

  // Add non-destructive indexes if not existing
  try {
    await queryInterface.addIndex("complaints", ["seller_listing_type"], {
      name: "idx_complaints_seller_listing_type"
    });
    console.log("  + Added index 'idx_complaints_seller_listing_type'");
  } catch (idxErr) {
    // index may already exist
  }

  try {
    await queryInterface.addIndex("complaints", ["seller_type"], {
      name: "idx_complaints_seller_type"
    });
    console.log("  + Added index 'idx_complaints_seller_type'");
  } catch (idxErr) {
    // index may already exist
  }
}

async function down(queryInterface, Sequelize) {
  const tableInfo = await queryInterface.describeTable("complaints");

  if (tableInfo.registration_verification_status) {
    await queryInterface.removeColumn("complaints", "registration_verification_status");
  }
  if (tableInfo.reported_registration_number) {
    await queryInterface.removeColumn("complaints", "reported_registration_number");
  }
  if (tableInfo.reported_address) {
    await queryInterface.removeColumn("complaints", "reported_address");
  }
  if (tableInfo.reported_landmark) {
    await queryInterface.removeColumn("complaints", "reported_landmark");
  }
  if (tableInfo.reported_shop_name) {
    await queryInterface.removeColumn("complaints", "reported_shop_name");
  }
  if (tableInfo.seller_type) {
    await queryInterface.removeColumn("complaints", "seller_type");
  }
  if (tableInfo.seller_listing_type) {
    await queryInterface.removeColumn("complaints", "seller_listing_type");
  }
}

module.exports = { up, down };
