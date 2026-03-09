// backend/src/middlewares/error.js
const globalErrorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const status = statusCode >= 400 && statusCode < 500 ? "fail" : "error";

  if (process.env.NODE_ENV === "production") {
    if (statusCode >= 400 && statusCode < 500) {
      res.status(statusCode).json({ status, message: err.message });
    } else {
      console.error("ERROR 💥", err);
      res.status(500).json({ status: "error", message: "Something went very wrong!" });
    }
  } else {
    res.status(statusCode).json({ status, message: err.message, stack: err.stack });
  }
};

export default globalErrorHandler;
