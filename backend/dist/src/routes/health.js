"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_js_1 = require("../config/prisma.js");
const router = (0, express_1.Router)();
router.get("/", async (_req, res) => {
    try {
        await prisma_js_1.prisma.$queryRaw `SELECT 1`;
        res.status(200).json({
            success: true,
            message: "Backend and database are connected",
            database: "connected",
        });
    }
    catch (error) {
        console.error("Health check failed:", error);
        res.status(503).json({
            success: false,
            message: "Database connection failed",
        });
    }
});
exports.default = router;
