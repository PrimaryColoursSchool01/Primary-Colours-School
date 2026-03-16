import { Router } from "express";
import {
  getAllPaymentRecords,
  createPaymentRecord,
  getPaymentRecordById,
  deletePaymentRecordById,
  updatePaymentRecordById,
} from "../controllers/payment-record.controller.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireRole } from "../middlewares/requireRole.js";

const router = Router();

router.get("/", requireAuth, getAllPaymentRecords);

router.post("/", createPaymentRecord);

router.get("/:id", requireAuth, getPaymentRecordById);

router.put("/:id", requireAuth, requireRole("Admin"), updatePaymentRecordById);

router.delete("/:id", requireAuth, requireRole("Admin"), deletePaymentRecordById);

export default router;
