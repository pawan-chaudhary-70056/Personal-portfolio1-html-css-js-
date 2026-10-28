import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma.js";

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const adminId = req.session.adminId;

    if (!adminId || !req.sessionID) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    const adminSession = await prisma.adminSession.findFirst({
      where: {
        adminId,
        sessionKey: req.sessionID,
        expiresAt: { gt: new Date() },
        admin: { isActive: true },
      },
      select: {
        admin: {
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true,
            isActive: true,
          },
        },
      },
    });

    if (!adminSession) {
      res.status(401).json({ error: "Invalid or expired session." });
      return;
    }

    res.locals.admin = adminSession.admin;
    next();
  } catch (error) {
    next(error);
  }
}

type AdminRole = "OWNER" | "ADMIN" | "EDITOR";

export function requireRole(...allowedRoles: AdminRole[]) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const admin = res.locals.admin as
      | { role: AdminRole }
      | undefined;

    if (!admin) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    if (!allowedRoles.includes(admin.role)) {
      res.status(403).json({ error: "You do not have permission to perform this action." });
      return;
    }

    next();
  };
}
