const jwt = require("jsonwebtoken");
const crypto = require("crypto");
require("dotenv").config();

const jsonAuthMiddleware = (req, res, next) => {
  const authorizationHeader = req.headers.authorization;
  if (!authorizationHeader)
    return res.status(401).json({ msg: "Unauthorized" });

  const token = authorizationHeader.split(" ")[1];

  if (!token) return res.status(401).json({ msg: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.log(error);
    res.status(401).json({ error: "Invalid token" });
  }
};

const generateToken = (userData) => {
  return jwt.sign({ userData }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

const generateResetToken = () => {
  return crypto.randomBytes(20).toString("hex");
};
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};
module.exports = {
  jsonAuthMiddleware,
  generateToken,
  generateVerificationCode,
  generateResetToken,
};
