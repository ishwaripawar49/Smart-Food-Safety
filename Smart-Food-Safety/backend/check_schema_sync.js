require('dotenv').config();
const { sequelize } = require('./src/config/database');
const models = require('./src/models');

async function checkAll() {
  const queryInterface = sequelize.getQueryInterface();
  for (const [name, model] of Object.entries(sequelize.models)) {
    const tableName = model.getTableName();
    try {
      const tableDesc = await queryInterface.describeTable(tableName);
      const dbCols = Object.keys(tableDesc);
      const modelCols = Object.keys(model.rawAttributes);
      const missingInDb = modelCols.filter(c => !dbCols.includes(c));
      if (missingInDb.length > 0) {
        console.log(`Model ${name} (table: ${tableName}) MISSING in DB:`, missingInDb);
      } else {
        console.log(`Model ${name} (table: ${tableName}) is fully synced.`);
      }
    } catch (e) {
      console.log(`Table ${tableName} error:`, e.message);
    }
  }
  await sequelize.close();
}
checkAll();
