import "dotenv/config";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";

const PgSession = connectPgSimple(session);
const isProduction = process.env.NODE_ENV === "production";

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error("SESSION_SECRET must contain at least 32 characters.");
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing.");
}

export const sessionMiddleware = session({
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
