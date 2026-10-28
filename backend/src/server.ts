import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import { prisma } from "./config/prisma.js";
import { sessionMiddleware } from "./config/session.js";
import {
  csrfSynchronisedProtection,
  invalidCsrfTokenError,
} from "./config/csrf.js";
import authRouter from "./routes/auth.js";
import csrfRouter from "./routes/csrf.js";
import healthRouter from "./routes/health.js";
import adminRouter from "./routes/admin.js";
import contentRouter from "./routes/content.js";
import publicRouter from "./routes/public.js";

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.disable("x-powered-by");
app.use(helmet());

const configuredOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Live Server (5500), Vite (5173) and any other local static server must all
// be able to reach the API during development.
const localOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      callback(
        null,
        configuredOrigins.includes(origin) || localOriginPattern.test(origin),
      );
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(sessionMiddleware);

// Token endpoint must be accessible before CSRF validation.
app.use("/api/auth", csrfRouter);

// Protect state-changing requests, including login and logout.
app.use(csrfSynchronisedProtection);

app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/admin", contentRouter);
app.use("/api/public", publicRouter);

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "Portfolio API is running",
  });
});

app.use("/api/health/database", healthRouter);

// Return a consistent JSON error for invalid CSRF tokens.
app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    if (
      error === invalidCsrfTokenError ||
      (typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === invalidCsrfTokenError.code)
    ) {
      res.status(403).json({
        error: "Invalid or missing CSRF token.",
        code: "EBADCSRFTOKEN",
      });
      return;
    }

    next(error);
  },
);

const server = app.listen(PORT, () => {
  console.log(`Portfolio API running at http://localhost:${PORT}`);
});

async function shutdown() {
  console.log("Shutting down server...");

  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
