const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
    dialect: "mysql",
    logging: false,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || "10", 10),
      min: parseInt(process.env.DB_POOL_MIN || "2", 10),
      acquire: parseInt(process.env.DB_POOL_ACQUIRE || "30000", 10),
      idle: parseInt(process.env.DB_POOL_IDLE || "10000", 10)
    },
    dialectOptions: {
      decimalNumbers: true,
      connectTimeout: 20000
    },
    timezone: "+00:00"
  }
);

const connectDatabase = async () => {
  try {
    await sequelize.authenticate();

    console.log("MySQL Database Connected Successfully!");
  } catch (error) {
    console.error("Database connection failed:", error.message);
    throw error;
  }
};

module.exports = {
  sequelize,
  connectDatabase
};