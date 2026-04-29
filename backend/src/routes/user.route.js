// routes/user.routes.js
import { Router } from "express";
import {
  registerUser,
  getAllUsers,
  getUserById,
  updateUserById,
  markUserNoLongerWorking,
  suspendUser,
  unsuspendUser,
  resetPassword,
} from "../controllers/user.controller.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireRole } from "../middlewares/requireRole.js";

const router = Router();

// All routes require authentication
router.use(requireAuth);

// All routes require admin role
router.use(requireRole("admin"));

// User management routes
router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.post("/", registerUser);
router.put("/:id", updateUserById);
router.post("/:id/no-longer-working", markUserNoLongerWorking);

// User status routes
router.post("/:id/suspend", suspendUser);
router.post("/:id/unsuspend", unsuspendUser);

// Password management routes
router.post("/:id/reset-password", resetPassword);

export default router;
