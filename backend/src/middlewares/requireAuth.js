import { verifyAccessToken } from "../utils/token.js";
import User from "../models/user.model.js";
export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    const err = new Error("Authorization header missing or malformed");
    err.statusCode = 401;
    return next(err);
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.id);
    if (!user) {
      const err = new Error("User not found");
      err.statusCode = 401;
      return next(err);
    }

    if (user.tokenVersion !== decoded.tokenVersion) {
      const err = new Error("Token has been revoked");
      err.statusCode = 401;
      return next(err);
    }

    req.user = {
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    const err = new Error("Invalid or expired token");
    err.statusCode = 401;
    return next(err);
  }
};
