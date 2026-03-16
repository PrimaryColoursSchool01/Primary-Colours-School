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

router.get("/", requireAuth, getAllPaymentRecords);

router.post("/", createPaymentRecord);

router.get("/:id", requireAuth, getPaymentRecordById);

router.put("/:id", requireAuth, requireRole("admin"), updatePaymentRecordById);

export default router;
