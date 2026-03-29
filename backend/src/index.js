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
import dashboardRoutes from "./routes/dashboard.route.js";

const allowedOrigins = [
  "http://localhost:5173", // main frontend (admin + staff)
  "http://localhost:5174", // parent form (if running simultaneously)
  process.env.FRONTEND_URL || "https://school-registration-system-psi.vercel.app", // production frontend
  process.env.FORM_URL || "https://school-payment-record-form.vercel.app", // production parent form
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (Postman, mobile apps)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy: origin ${origin} not allowed`));
      }
    },
    credentials: true, // required for httpOnly cookie (refresh token)
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

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
app.use("/roles", roleRoutes);
app.use("/payment-records", paymentRecordRoutes);
app.use("/users", userRoutes);
app.use("/dashboard", dashboardRoutes);

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
