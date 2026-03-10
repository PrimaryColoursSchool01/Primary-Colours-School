import { Router } from "express";
import {
  getAllSections,
  createSection,
  getSectionById,
  updateSectionById,
  deleteSectionById,
} from "../controllers/section.controller.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireRole } from "../middlewares/requireRole.js";

const router = Router();

router.get("/", getAllSections);
router.post("/", requireAuth, requireRole("Admin"), createSection);
router.get("/:id", getSectionById);
router.put("/:id", requireAuth, requireRole("Admin"), updateSectionById);
router.delete("/:id", requireAuth, requireRole("Admin"), deleteSectionById);

export default router;
