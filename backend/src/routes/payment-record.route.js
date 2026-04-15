import { Router } from "express";
import multer from "multer";
import {
  getAllPaymentRecords,
  createPaymentRecord,
  getPaymentRecordById,
  updatePaymentRecordById,
} from "../controllers/payment-record.controller.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireRole } from "../middlewares/requireRole.js";

const router = Router();

// ── Multer Config (Memory Storage for sharp) ─────────────────
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit before compression
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    cb(allowed.includes(file.mimetype) ? null : new Error("Only JPG, PNG, WEBP allowed"), true);
  },
});

// Public endpoint: parents submit payment (with optional image evidence)
router.post("/", upload.single("evidenceImage"), createPaymentRecord);

// Admin endpoints (unchanged)
router.get("/", requireAuth, requireRole("admin"), getAllPaymentRecords);
router.get("/:id", requireAuth, requireRole("admin"), getPaymentRecordById);
router.put("/:id", requireAuth, requireRole("admin"), updatePaymentRecordById);

export default router;
