const { DataTypes } = require("sequelize");

/**
 * Migration: Add GPS Geolocation Coordinates & Accuracy to Complaints Table
 *
 * Adds non-destructive columns:
 * - latitude: DECIMAL(10,7) Nullable (-90.0000000 to 90.0000000)
 * - longitude: DECIMAL(10,7) Nullable (-180.0000000 to 180.0000000)
 * - location_accuracy: FLOAT Nullable (accuracy radius in meters if provided)
 */

async function up(queryInterface, Sequelize) {
  const tableInfo = await queryInterface.describeTable("complaints");

  // 1. latitude
  if (!tableInfo.latitude) {
    await queryInterface.addColumn("complaints", "latitude", {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
      defaultValue: null,
    });
    console.log("  + Added column 'latitude' (DECIMAL 10,7)");
  }

  // 2. longitude
  if (!tableInfo.longitude) {
    await queryInterface.addColumn("complaints", "longitude", {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
      defaultValue: null,
    });
    console.log("  + Added column 'longitude' (DECIMAL 10,7)");
  }

  // 3. location_accuracy
  if (!tableInfo.location_accuracy) {
    await queryInterface.addColumn("complaints", "location_accuracy", {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: null,
    });
    console.log("  + Added column 'location_accuracy' (FLOAT)");
  }

  // 4. Index on coordinates
  try {
    await queryInterface.addIndex("complaints", ["latitude", "longitude"], {
      name: "idx_complaints_lat_lng",
    });
    console.log("  + Added composite index 'idx_complaints_lat_lng'");
  } catch (idxErr) {
    // index may already exist
  }
}

async function down(queryInterface, Sequelize) {
  try {
    await queryInterface.removeIndex("complaints", "idx_complaints_lat_lng");
  } catch (e) {
    // ignore
  }
  try {
    await queryInterface.removeColumn("complaints", "location_accuracy");
    await queryInterface.removeColumn("complaints", "longitude");
    await queryInterface.removeColumn("complaints", "latitude");
  } catch (e) {
    // ignore
  }
}

module.exports = { up, down };
