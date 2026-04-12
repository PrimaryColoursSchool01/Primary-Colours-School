import jwt from "jsonwebtoken";

export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      tokenVersion: user.tokenVersion || 0,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1m" },
  );
};

export const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      tokenVersion: user.tokenVersion || 0,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );
};

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    console.error("Access Token Verification Error:", error);
    throw new Error("Invalid or expired access token");
  }
};

export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    console.error("Refresh Token Verification Error:", error);
    throw new Error("Invalid or expired refresh token");
  }
};
