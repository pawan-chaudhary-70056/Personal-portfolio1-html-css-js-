"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const csrf_js_1 = require("../config/csrf.js");
const router = (0, express_1.Router)();
router.get("/csrf-token", (req, res, next) => {
    try {
        const existingToken = req.session.csrfToken;
        const csrfToken = typeof existingToken === "string" && existingToken.length > 0
            ? existingToken
            : (0, csrf_js_1.generateToken)(req, true);
        res.setHeader("Cache-Control", "no-store");
        req.session.save((error) => {
            if (error) {
                next(error);
                return;
            }
            res.json({ csrfToken });
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
