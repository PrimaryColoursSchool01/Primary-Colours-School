import express from "express";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireRole } from "../middlewares/requireRole.js";
import { getDashboardData, getRecentResponses } from "../controllers/dashboard.controller.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", requireRole("admin"), getDashboardData);
router.get("/recent", requireRole("admin"), getRecentResponses);

export default router;
