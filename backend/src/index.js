import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { logger } from "./middlewares/logger.js";
import globalErrorHandler from "./middlewares/error.js";
import cookieParser from "cookie-parser";

dotenv.config();
const app = express();
const PORT = process.env.PORT;

import connectDB from "./config/database.js";
import { seedAdmin } from "./utils/seedAdmin.js";
import authRoutes from "./routes/auth.route.js";
import sectionsRoutes from "./routes/section.route.js";
import classRoutes from "./routes/class.route.js";
import itemRoutes from "./routes/item.route.js";
import roleRoutes from "./routes/role.route.js";
import paymentRecordRoutes from "./routes/payment-record.route.js";
import userRoutes from "./routes/user.route.js";

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(logger);

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({ message: `Server is healthy and running! on port ${PORT}` });
});

app.use("/auth", authRoutes);
app.use("/sections", sectionsRoutes);
app.use("/classes", classRoutes);
app.use("/item", itemRoutes);
app.use("/role", roleRoutes);
app.use("/payment-records", paymentRecordRoutes);
app.use("/users", userRoutes);

app.use((req, res, next) => {
  const err = new Error(`Can't find ${req.originalUrl} on this server!`);
  err.statusCode = 404;
  next(err);
});

// Global Error Handler
app.use(globalErrorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server is up and running on port ${PORT}`);
  connectDB();
  seedAdmin();
});
