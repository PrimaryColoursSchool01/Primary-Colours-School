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

router.get("/", requireAuth, requireRole("admin"), getAllRoles);

router.post("/", requireAuth, requireRole("admin"), createRole);

router.get("/:id", requireAuth, requireRole("admin"), getRoleById);

router.put("/:id", requireAuth, requireRole("admin"), updateRoleById);

router.delete("/:id", requireAuth, requireRole("admin"), deleteRoleById);

export default router;
