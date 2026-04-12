import User from "../models/user.model.js";

export const requireRole = (requiredUserType) => {
  return async (req, res, next) => {
    if (!req.user?.id) {
      const err = new Error("User not authenticated");
      err.statusCode = 401;
      return next(err);
    }

    try {
      const user = await User.findById(req.user.id).select("-password -refreshToken");

      if (!user) {
        const err = new Error("User not found");
        err.statusCode = 404;
        return next(err);
      }

      if (user.status === "suspended") {
        const err = new Error("Account suspended. Contact administrator.");
        err.statusCode = 403;
        return next(err);
      }

      if (user.userType !== requiredUserType) {
        const err = new Error("Forbidden: Insufficient permissions");
        err.statusCode = 403;
        return next(err);
      }

      // Replace minimal JWT user with fresh DB user
      req.user = user;
      next();
    } catch (error) {
      next(error);
    }
  };
};
