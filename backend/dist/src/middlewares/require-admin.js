"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = requireAdmin;
exports.requireRole = requireRole;
const prisma_js_1 = require("../config/prisma.js");
async function requireAdmin(req, res, next) {
    try {
        const adminId = req.session.adminId;
        if (!adminId || !req.sessionID) {
            res.status(401).json({ error: "Authentication required." });
            return;
        }
        const adminSession = await prisma_js_1.prisma.adminSession.findFirst({
            where: {
                adminId,
                sessionKey: req.sessionID,
                expiresAt: { gt: new Date() },
                admin: { isActive: true },
            },
            select: {
                admin: {
                    select: {
                        id: true,
                        email: true,
                        displayName: true,
                        role: true,
                        isActive: true,
                    },
                },
            },
        });
        if (!adminSession) {
            res.status(401).json({ error: "Invalid or expired session." });
            return;
        }
        res.locals.admin = adminSession.admin;
        next();
    }
    catch (error) {
        next(error);
    }
}
function requireRole(...allowedRoles) {
    return (_req, res, next) => {
        const admin = res.locals.admin;
        if (!admin) {
            res.status(401).json({ error: "Authentication required." });
            return;
        }
        if (!allowedRoles.includes(admin.role)) {
            res.status(403).json({ error: "You do not have permission to perform this action." });
            return;
        }
        next();
    };
}
