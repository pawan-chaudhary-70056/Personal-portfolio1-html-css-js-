import { Router } from "express";
import { generateToken } from "../config/csrf.js";

const router = Router();

router.get("/csrf-token", (req, res, next) => {
  try {
    const existingToken = req.session.csrfToken;

    const csrfToken =
      typeof existingToken === "string" && existingToken.length > 0
        ? existingToken
        : generateToken(req, true);

    res.setHeader("Cache-Control", "no-store");

    req.session.save((error) => {
      if (error) {
        next(error);
        return;
      }

      res.json({ csrfToken });
    });
  } catch (error) {
    next(error);
  }
});

export default router;
