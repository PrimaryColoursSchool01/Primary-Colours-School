import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth.js";
import { getConfigurationHealth } from "../controllers/configuration.controller.js";

const router = Router();

//  Protect all configuration health routes
router.use(requireAuth);

router.get("/", getConfigurationHealth);

export default router;
