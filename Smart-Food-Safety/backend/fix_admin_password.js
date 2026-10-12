require("dotenv").config({ path: "./.env" });
const { Sequelize } = require("sequelize");
const bcrypt = require("bcryptjs");
const s = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: "localhost", dialect: "mysql", logging: false,
});

async function run() {
  await s.authenticate();
  const [users] = await s.query("SELECT id, email, role FROM users");
  console.log("All users:", JSON.stringify(users, null, 2));

  // Update by matching on role instead of email for admin/authority
  const updates = [
    { role: "ADMIN", pw: "admin123" },
    { role: "AUTHORIZED_AUTHORITY", pw: "123456" },
    { role: "CUSTOMER", pw: "test123" },
  ];

  for (const u of updates) {
    const hash = await bcrypt.hash(u.pw, 10);
    const [n] = await s.query(
      "UPDATE users SET password = ? WHERE role = ?",
      { replacements: [hash, u.role] }
    );
    console.log(`Updated ${n} row(s) with role=${u.role} to password="${u.pw}"`);
  }

  await s.close();
  console.log("\nDone.");
}
run().catch(e => { console.error(e.message); s.close(); });
