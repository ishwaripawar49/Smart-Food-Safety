require("dotenv").config({ path: "./.env" });
const { Sequelize } = require("sequelize");
const s = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: "localhost", dialect: "mysql", logging: false,
});
s.query("SELECT id, name, email, role FROM users ORDER BY id")
  .then(([r]) => { console.log(JSON.stringify(r, null, 2)); s.close(); })
  .catch(e => { console.error(e.message); s.close(); });
