import { Router } from "express";
import {
  getAllItems,
  createItem,
  getItemById,
  updateItemById,
  deleteItemById,
} from "../controllers/item.controller.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireRole } from "../middlewares/requireRole.js";

const router = Router();

router.get("/", getAllItems);
router.post("/", requireAuth, requireRole("Admin"), createItem);
router.get("/:id", getItemById);
router.put("/:id", requireAuth, requireRole("Admin"), updateItemById);
router.delete("/:id", requireAuth, requireRole("Admin"), deleteItemById);

export default router;
