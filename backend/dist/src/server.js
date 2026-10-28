"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const prisma_js_1 = require("./config/prisma.js");
const session_js_1 = require("./config/session.js");
const csrf_js_1 = require("./config/csrf.js");
const auth_js_1 = __importDefault(require("./routes/auth.js"));
const csrf_js_2 = __importDefault(require("./routes/csrf.js"));
const health_js_1 = __importDefault(require("./routes/health.js"));
const admin_js_1 = __importDefault(require("./routes/admin.js"));
const content_js_1 = __importDefault(require("./routes/content.js"));
const public_js_1 = __importDefault(require("./routes/public.js"));
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT) || 4000;
app.disable("x-powered-by");
app.use((0, helmet_1.default)());
const configuredOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
const isProduction = process.env.NODE_ENV === "production";
app.use((0, cors_1.default)({
    origin(origin, callback) {
        if (!origin) {
            callback(null, true);
            return;
        }
        if (configuredOrigins.includes(origin)) {
            callback(null, true);
            return;
        }
        // During development any origin is accepted, so Live Server, Vite, the
        // IPv6 loopback, a phone on the same network and port-forwarded preview
        // URLs all work without configuration. Mutations still require a session
        // plus CSRF token. Production trusts FRONTEND_ORIGIN only.
        callback(null, !isProduction);
    },
    credentials: true,
}));
app.use(express_1.default.json({ limit: "1mb" }));
app.use(session_js_1.sessionMiddleware);
// Token endpoint must be accessible before CSRF validation.
app.use("/api/auth", csrf_js_2.default);
// Protect state-changing requests, including login and logout.
app.use(csrf_js_1.csrfSynchronisedProtection);
app.use("/api/auth", auth_js_1.default);
app.use("/api/admin", admin_js_1.default);
app.use("/api/admin", content_js_1.default);
app.use("/api/public", public_js_1.default);
app.get("/api/health", (_req, res) => {
    res.json({
        success: true,
        message: "Portfolio API is running",
    });
});
app.use("/api/health/database", health_js_1.default);
// Return a consistent JSON error for invalid CSRF tokens.
app.use((error, req, res, next) => {
    if (error === csrf_js_1.invalidCsrfTokenError ||
        (typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === csrf_js_1.invalidCsrfTokenError.code)) {
        // A rejected token almost always means the session cookie never arrived,
        // so log the origin and whether a cookie was sent to make that obvious.
        console.warn(`CSRF rejected: ${req.method} ${req.originalUrl} origin=${req.headers.origin ?? "none"} cookie=${req.headers.cookie ? "present" : "missing"}`);
        res.status(403).json({
            error: "Invalid or missing CSRF token.",
            code: "EBADCSRFTOKEN",
        });
        return;
    }
    next(error);
});
const server = app.listen(PORT, () => {
    console.log(`Portfolio API running at http://localhost:${PORT}`);
});
async function shutdown() {
    console.log("Shutting down server...");
    server.close(async () => {
        await prisma_js_1.prisma.$disconnect();
        process.exit(0);
    });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
