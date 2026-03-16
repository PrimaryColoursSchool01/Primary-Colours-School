import User from "../models/user.model.js";

export const requireRole = (requiredUserType) => {
  return async (req, res, next) => {
    if (!req.user) {
      const err = new Error("User not authenticated");
      err.statusCode = 401;
      return next(err);
    }

    const user = await User.findById(req.user.id);

    if (user.userType !== requiredUserType) {
      const err = new Error("Forbidden: Insufficient permissions");
      err.statusCode = 403;
      return next(err);
    }

    next();
  };
};
