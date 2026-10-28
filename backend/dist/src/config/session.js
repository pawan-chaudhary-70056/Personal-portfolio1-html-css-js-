"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionMiddleware = void 0;
require("dotenv/config");
const express_session_1 = __importDefault(require("express-session"));
const connect_pg_simple_1 = __importDefault(require("connect-pg-simple"));
const PgSession = (0, connect_pg_simple_1.default)(express_session_1.default);
const isProduction = process.env.NODE_ENV === "production";
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters.");
}
if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing.");
}
exports.sessionMiddleware = (0, express_session_1.default)({
    name: "portfolio.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    store: new PgSession({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true,
        ttl: 60 * 60 * 8,
        tableName: "session",
    }),
    cookie: {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: 8 * 60 * 60 * 1000,
        path: "/",
    },
});
