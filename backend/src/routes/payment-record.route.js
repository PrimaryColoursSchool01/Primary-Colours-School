// routes/payment-record.routes.js
import { Router } from "express";
import {
  getAllPaymentRecords,
  createPaymentRecord,
  getPaymentRecordById,
  updatePaymentRecordById,
} from "../controllers/payment-record.controller.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireRole } from "../middlewares/requireRole.js";

const router = Router();

// Public endpoint (parents submit payment)
router.post("/", createPaymentRecord);

// Admin only endpoints
router.get("/", requireAuth, requireRole("admin"), getAllPaymentRecords);
router.get("/:id", requireAuth, requireRole("admin"), getPaymentRecordById);
router.put("/:id", requireAuth, requireRole("admin"), updatePaymentRecordById);

export default router;
