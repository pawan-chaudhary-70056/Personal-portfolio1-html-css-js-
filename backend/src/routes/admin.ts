import { Router } from "express";
import {
  requireAdmin,
  requireRole,
} from "../middlewares/require-admin.js";

const router = Router();

router.get(
  "/check",
  requireAdmin,
  requireRole("OWNER", "ADMIN", "EDITOR"),
  (_req, res) => {
    const admin = res.locals.admin as {
      id: string;
      email: string;
      displayName: string;
      role: "OWNER" | "ADMIN" | "EDITOR";
    };

    res.json({
      success: true,
      message: "Admin authentication and role verified.",
      admin,
    });
  },
);

export default router;
