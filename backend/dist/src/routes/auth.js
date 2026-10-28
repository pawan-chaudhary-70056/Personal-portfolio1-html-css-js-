"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_rate_limit_1 = require("express-rate-limit");
const argon2_1 = __importDefault(require("argon2"));
const zod_1 = require("zod");
const prisma_js_1 = require("../config/prisma.js");
const router = (0, express_1.Router)();
const loginLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many login attempts. Try again later." },
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().trim().email().max(254),
    password: zod_1.z.string().min(1).max(128),
});
router.post("/login", loginLimiter, async (req, res, next) => {
    try {
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: "Enter a valid email and password." });
            return;
        }
        const email = parsed.data.email.toLowerCase();
        const admin = await prisma_js_1.prisma.adminUser.findUnique({ where: { email } });
        if (!admin ||
            !admin.isActive ||
            !(await argon2_1.default.verify(admin.passwordHash, parsed.data.password))) {
            res.status(401).json({ error: "Invalid email or password." });
            return;
        }
        // Do not allow two-factor authentication to be bypassed.
        if (admin.twoFactorEnabled) {
            res.status(403).json({
                error: "Two-factor verification is required but is not configured in this login flow.",
            });
            return;
        }
        req.session.regenerate((sessionError) => {
            if (sessionError) {
                next(sessionError);
                return;
            }
            req.session.adminId = admin.id;
            req.session.save(async (saveError) => {
                if (saveError) {
                    next(saveError);
                    return;
                }
                try {
                    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
                    await prisma_js_1.prisma.adminSession.create({
                        data: {
                            adminId: admin.id,
                            sessionKey: req.sessionID,
                            ipAddress: req.ip,
                            userAgent: req.get("user-agent")?.slice(0, 500),
                            expiresAt,
                        },
                    });
                    await prisma_js_1.prisma.adminUser.update({
                        where: { id: admin.id },
                        data: { lastLoginAt: new Date() },
                    });
                    res.json({
                        admin: {
                            id: admin.id,
                            email: admin.email,
                            displayName: admin.displayName,
                            role: admin.role,
                        },
                    });
                }
                catch (error) {
                    req.session.destroy(() => next(error));
                }
            });
        });
    }
    catch (error) {
        next(error);
    }
});
router.get("/me", async (req, res, next) => {
    try {
        if (!req.session.adminId) {
            res.status(401).json({ error: "Not authenticated." });
            return;
        }
        const sessionRecord = await prisma_js_1.prisma.adminSession.findFirst({
            where: {
                adminId: req.session.adminId,
                sessionKey: req.sessionID,
                expiresAt: { gt: new Date() },
                admin: { isActive: true },
            },
            include: { admin: true },
        });
        if (!sessionRecord) {
            req.session.destroy(() => {
                res.status(401).json({ error: "Session expired or invalid." });
            });
            return;
        }
        res.json({
            admin: {
                id: sessionRecord.admin.id,
                email: sessionRecord.admin.email,
                displayName: sessionRecord.admin.displayName,
                role: sessionRecord.admin.role,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
router.post("/logout", async (req, res, next) => {
    try {
        const sessionKey = req.sessionID;
        if (sessionKey) {
            await prisma_js_1.prisma.adminSession.deleteMany({ where: { sessionKey } });
        }
        req.session.destroy((error) => {
            if (error) {
                next(error);
                return;
            }
            res.clearCookie("portfolio.sid", { path: "/" });
            res.status(200).json({ message: "Logged out successfully." });
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
