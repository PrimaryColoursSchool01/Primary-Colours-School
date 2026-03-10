import { Router } from "express";
import {
  getAllClasses,
  createClass,
  getClassById,
  updateClassById,
  deleteClassById,
} from "../controllers/class.controller.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireRole } from "../middlewares/requireRole.js";

const router = Router();

router.get("/", getAllClasses);
router.post("/", requireAuth, requireRole("Admin"), createClass);
router.get("/:id", getClassById);
router.put("/:id", requireAuth, requireRole("Admin"), updateClassById);
router.delete("/:id", requireAuth, requireRole("Admin"), deleteClassById);

export default router;
