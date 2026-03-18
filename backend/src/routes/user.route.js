import { Router } from "express";
import {
  registerUser,
  getAllUsers,
  deleteUserById,
  updateUserById,
} from "../controllers/user.controller.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireRole } from "../middlewares/requireRole.js";
const router = Router();

router.get("/", requireAuth, getAllUsers);
router.post("/", requireAuth, requireRole("admin"), registerUser);
router.put("/:id", requireAuth, requireRole("admin"), updateUserById);
router.delete("/:id", requireAuth, requireRole("admin"), deleteUserById);

export default router;
