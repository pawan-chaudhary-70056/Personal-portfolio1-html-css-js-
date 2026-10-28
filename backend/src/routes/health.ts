import { Router } from "express";
import { prisma } from "../config/prisma.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      success: true,
      message: "Backend and database are connected",
      database: "connected",
    });
  } catch (error) {
    console.error("Health check failed:", error);

    res.status(503).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

export default router;
