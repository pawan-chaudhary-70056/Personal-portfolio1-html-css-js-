"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidCsrfTokenError = exports.csrfSynchronisedProtection = exports.generateToken = void 0;
const csrf_sync_1 = require("csrf-sync");
_a = (0, csrf_sync_1.csrfSync)({
    ignoredMethods: ["GET", "HEAD", "OPTIONS"],
    getTokenFromRequest: (req) => req.headers["x-csrf-token"],
    getTokenFromState: (req) => req.session.csrfToken,
    storeTokenInState: (req, token) => {
        req.session.csrfToken = token;
    },
}), exports.generateToken = _a.generateToken, exports.csrfSynchronisedProtection = _a.csrfSynchronisedProtection, exports.invalidCsrfTokenError = _a.invalidCsrfTokenError;
