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
// Live Server (5500), Vite (5173) and any other local static server must all
// be able to reach the API during development.
const localOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
app.use((0, cors_1.default)({
    origin(origin, callback) {
        if (!origin) {
            callback(null, true);
            return;
        }
        callback(null, configuredOrigins.includes(origin) || localOriginPattern.test(origin));
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
app.use((error, _req, res, next) => {
    if (error === csrf_js_1.invalidCsrfTokenError ||
        (typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === csrf_js_1.invalidCsrfTokenError.code)) {
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
