require("dotenv").config();
const { sequelize } = require("./src/config/database");
const migration1 = require("./src/migrations/20261009_add_unlisted_seller_fields");
const migration2 = require("./src/migrations/20261010_add_location_coordinates");
const migration3 = require("./src/migrations/20261010_add_intelligence_and_duplicate_reviews");
const migration4 = require("./src/migrations/20261010_ensure_complaint_id_unique_index");
const migration5 = require("./src/migrations/20261012_add_authority_columns");

async function run() {
  console.log("======================================================================");
  console.log("FOODSAFE AI — RUNNING NON-DESTRUCTIVE DATABASE MIGRATION");
  console.log("======================================================================");

  try {
    await sequelize.authenticate();
    console.log("Database connection authenticated successfully.");

    const queryInterface = sequelize.getQueryInterface();
    console.log("Applying Migration 1 (Unlisted seller fields)...");
    await migration1.up(queryInterface, sequelize.constructor);

    console.log("Applying Migration 2 (Location coordinates & accuracy)...");
    await migration2.up(queryInterface, sequelize.constructor);

    console.log("Applying Migration 3 (Intelligence & duplicate review fields)...");
    await migration3.up(queryInterface, sequelize.constructor);

    console.log("Applying Migration 4 (Physical UNIQUE index on complaint_id)...");
    await migration4.up(queryInterface, sequelize.constructor);

    console.log("Applying Migration 5 (Authority ID foreign key references)...");
    await migration5.up(queryInterface, sequelize.constructor);

    console.log("\nMigrations completed successfully.");

    // Verify columns in complaints table
    const [columns] = await sequelize.query("DESCRIBE complaints");
    console.log("\nUpdated 'complaints' table columns:");
    columns.forEach((col) => {
      console.log(`  - ${col.Field.padEnd(32)} ${col.Type.padEnd(20)} Null: ${col.Null} Default: ${col.Default}`);
    });

    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

run();
