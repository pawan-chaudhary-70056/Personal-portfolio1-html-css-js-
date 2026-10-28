import { csrfSync } from "csrf-sync";

export const {
  generateToken,
  csrfSynchronisedProtection,
  invalidCsrfTokenError,
} = csrfSync({
  ignoredMethods: ["GET", "HEAD", "OPTIONS"],
  getTokenFromRequest: (req) => req.headers["x-csrf-token"] as string | undefined,
  getTokenFromState: (req) => req.session.csrfToken,
  storeTokenInState: (req, token) => {
    req.session.csrfToken = token;
  },
});
