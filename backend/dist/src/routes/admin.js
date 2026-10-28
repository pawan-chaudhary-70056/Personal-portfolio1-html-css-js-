"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const require_admin_js_1 = require("../middlewares/require-admin.js");
const router = (0, express_1.Router)();
router.get("/check", require_admin_js_1.requireAdmin, (0, require_admin_js_1.requireRole)("OWNER", "ADMIN", "EDITOR"), (_req, res) => {
    const admin = res.locals.admin;
    res.json({
        success: true,
        message: "Admin authentication and role verified.",
        admin,
    });
});
exports.default = router;
