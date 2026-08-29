import { Router } from "express";
import {
  getAllItems,
  createItem,
  getItemById,
  updateItemById,
  deleteItemById,
  restockItem,
} from "../controllers/item.controller.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireRole } from "../middlewares/requireRole.js";

const router = Router();

router.get("/", getAllItems);
router.post("/", requireAuth, requireRole("admin"), createItem);
router.get("/:id", getItemById);
router.put("/:id", requireAuth, requireRole("admin"), updateItemById);
router.delete("/:id", requireAuth, requireRole("admin"), deleteItemById);
router.post("/:id/restock", requireAuth, requireRole("admin"), restockItem);

export default router;
