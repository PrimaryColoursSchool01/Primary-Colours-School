import { Router } from "express";
import {
  getAllRoles,
  createRole,
  getRoleById,
  updateRoleById,
  deleteRoleById,
} from "../controllers/role.controller.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireRole } from "../middlewares/requireRole.js";

const router = Router();

router.get("/", requireAuth, requireRole("Admin"), getAllRoles);

router.post("/", requireAuth, requireRole("Admin"), createRole);

router.get("/:id", requireAuth, requireRole("Admin"), getRoleById);

router.put("/:id", requireAuth, requireRole("Admin"), updateRoleById);

router.delete("/:id", requireAuth, requireRole("Admin"), deleteRoleById);

export default router;
