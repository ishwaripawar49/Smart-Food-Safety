/**
 * Safe Environment Variable Validator
 * Validates critical environment variables without exposing their secret values.
 */

function validateEnv() {
  const required = [
    { key: "DB_NAME", description: "MySQL database name" },
    { key: "DB_USER", description: "MySQL database user" },
    { key: "DB_HOST", description: "MySQL database host" },
    { key: "JWT_SECRET", description: "JWT signature secret key" }
  ];

  const missing = [];
  for (const item of required) {
    const val = process.env[item.key];
    if (!val || String(val).trim() === "") {
      missing.push(`${item.key} (${item.description})`);
    }
  }

  if (missing.length > 0) {
    console.error("FATAL CONFIGURATION ERROR: Missing required environment variables:");
    missing.forEach((m) => console.error(`  - ${m}`));
    console.error("Please configure these variables in your .env file or container environment.");
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
    return false;
  }

  // Security warning for weak JWT secret in production
  if (process.env.NODE_ENV === "production" && process.env.JWT_SECRET) {
    if (process.env.JWT_SECRET.length < 32) {
      console.warn("SECURITY WARNING: JWT_SECRET is under 32 characters in production. Consider generating a 256-bit secure secret.");
    }
  }

  return true;
}

module.exports = { validateEnv };
