require("dotenv").config({ path: "./.env" });
const { Sequelize } = require("sequelize");
const s = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: "localhost", dialect: "mysql", logging: true,
});
s.query("SELECT DATABASE() as db")
  .then(([r]) => { console.log("Current DB:", r[0]); })
  .then(() => s.query("SHOW TABLES"))
  .then(([r]) => { console.log("Tables:", r); s.close(); })
  .catch(e => { console.error(e.message); s.close(); });
