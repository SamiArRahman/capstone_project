const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getJwtSecret } = require("./config");

async function hashPassword(password) {
  return bcrypt.hash(String(password), 10);
}

async function comparePassword(password, passwordHash) {
  return bcrypt.compare(String(password), String(passwordHash || ""));
}

function signToken(user) {
  return jwt.sign(
    {
      sub: String(user._id),
      role: user.role,
      username: user.username
    },
    getJwtSecret(),
    { expiresIn: "7d" }
  );
}

function verifyToken(token) {
  return jwt.verify(token, getJwtSecret());
}

module.exports = {
  comparePassword,
  hashPassword,
  signToken,
  verifyToken
};
