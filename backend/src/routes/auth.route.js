import { Router } from "express";
import {
  login,
  changePassword,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = Router();

router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/change-password", requireAuth, changePassword);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);

export default router;
