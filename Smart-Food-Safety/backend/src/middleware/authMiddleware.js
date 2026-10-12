const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    console.log("AUTH CHECK:");
    console.log("Authorization header present:", !!authHeader);

    if (!authHeader) {
      console.log("ERROR: Authorization header missing");

      return res.status(401).json({
        success: false,
        message: "Access denied. No authentication token provided."
      });
    }

    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
      console.log("ERROR: Invalid Authorization format");

      return res.status(401).json({
        success: false,
        message: "Invalid authentication token format."
      });
    }

    const token = parts[1];

    if (!token) {
      console.log("ERROR: Token missing");

      return res.status(401).json({
        success: false,
        message: "Invalid authentication token."
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "smart_food_safety_secret"
    );

    console.log("AUTH SUCCESS - User ID:", decoded.id);
    console.log("AUTH SUCCESS - Role:", decoded.role);

    req.user = decoded;

    next();

  } catch (error) {
    console.log("AUTH ERROR:", error.name);
    console.log("AUTH ERROR MESSAGE:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token."
    });
  }
};

module.exports = authenticateToken;