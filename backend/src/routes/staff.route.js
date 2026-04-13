import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireRole } from "../middlewares/requireRole.js";
import { getStaffDashboard, getStaffAssignments, markCollected, getStaffHistory } from "../controllers/staff.controller.js";

const router = Router();

// All staff routes require authentication + staff user type
router.use(requireAuth);
router.use(requireRole("staff"));

// Dashboard: workload summary + priority actions
router.get("/dashboard", getStaffDashboard);

// Assignments: full paginated list of pending items
router.get("/assignments", getStaffAssignments);

// Collect: mark a single pending item as collected
router.post("/transactions/:id/collect", markCollected);

// History: read-only log of processed items
router.get("/history", getStaffHistory);

export default router;
