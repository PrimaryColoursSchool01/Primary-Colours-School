import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth.js";
import { getProfile, updateProfile, logoutAllSessions } from "../controllers/profile.controller.js";

const router = Router();

router.get("/", requireAuth, getProfile);
router.put("/", requireAuth, updateProfile);
router.post("/logout-all", requireAuth, logoutAllSessions);

export default router;
