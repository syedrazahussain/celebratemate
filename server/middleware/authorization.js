const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader) {
      console.log("Authorization header missing");
      return res.status(403).json("Not Authorized");
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      console.log("Token is missing");
      return res.status(403).json("Not Authorized");
    }

    try {
      const payload = jwt.verify(token, process.env.jwtsecret);
      req.user = payload.user;
      next();
    } catch (err) {
      console.log("JWT Verification Error:", err.message);
      return res.status(403).json("Invalid Token");
    }
  } catch (err) {
    console.error("Authorization Middleware Error:", err.message);
    return res.status(403).json("Not Authorized");
  }
};
