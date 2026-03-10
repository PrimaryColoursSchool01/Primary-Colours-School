export const requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      const err = new Error("User not authenticated");
      err.statusCode = 401;
      return next(err);
    }

    if (req.user.role !== requiredRole) {
      const err = new Error("Forbidden: Insufficient permissions");
      err.statusCode = 403;
      return next(err);
    }

    next();
  };
};
