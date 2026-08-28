import { Router } from "express";
import { getPaymentSummary, getStudentRegister } from "../controllers/reports.controller.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireRole } from "../middlewares/requireRole.js";

const router = Router();

router.get("/payment-summary", requireAuth, requireRole("admin"), getPaymentSummary);
router.get("/student-register", requireAuth, requireRole("admin"), getStudentRegister);

export default router;
