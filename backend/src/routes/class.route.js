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
router.post("/", requireAuth, requireRole("admin"), createClass);
router.get("/:id", getClassById);
router.put("/:id", requireAuth, requireRole("admin"), updateClassById);
router.delete("/:id", requireAuth, requireRole("admin"), deleteClassById);

export default router;
