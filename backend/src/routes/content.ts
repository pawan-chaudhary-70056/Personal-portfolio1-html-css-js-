import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { ABOUT_DEFAULTS, mergeAbout } from "../config/about-defaults.js";
import {
  requireAdmin,
  requireRole,
} from "../middlewares/require-admin.js";

const router = Router();

const adminRead = [
  requireAdmin,
  requireRole("OWNER", "ADMIN", "EDITOR"),
];

const adminWrite = [
  requireAdmin,
  requireRole("OWNER", "ADMIN", "EDITOR"),
];

const adminDelete = [
  requireAdmin,
  requireRole("OWNER", "ADMIN"),
];

const nullableUrl = z.union([z.string().url(), z.literal(""), z.null()]).optional();

const profileSchema = z.object({
  fullName: z.string().trim().min(1).max(160),
  headline: z.string().trim().max(240).nullable().optional(),
  professionalSummary: z.string().trim().nullable().optional(),
  email: z.union([z.string().email().max(254), z.literal(""), z.null()]).optional(),
  phone: z.string().max(40).nullable().optional(),
  location: z.string().max(160).nullable().optional(),
  profileImage: nullableUrl,
  profileImageAlt: z.string().max(500).nullable().optional(),
  githubUrl: nullableUrl,
  linkedinUrl: nullableUrl,
  websiteUrl: nullableUrl,
  seoTitle: z.string().max(255).nullable().optional(),
  seoDescription: z.string().max(500).nullable().optional(),
});

const projectSchema = z.object({
  title: z.string().trim().min(1).max(180),
  slug: z.string().trim().min(1).max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must use lowercase letters, numbers, and hyphens."),
  summary: z.string().trim().min(1),
  description: z.string().nullable().optional(),
  category: z.string().trim().min(1).max(100),
  technologies: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
  repositoryUrl: nullableUrl,
  liveUrl: nullableUrl,
  imageUrl: nullableUrl,
  imageAlt: z.string().max(500).nullable().optional(),
  featured: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(100000).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

const experienceBaseSchema = z.object({
  company: z.string().trim().min(1).max(180),
  position: z.string().trim().min(1).max(180),
  location: z.string().trim().max(180).nullable().optional(),
  description: z.string().trim().nullable().optional(),
  startDate: z.string().datetime({ offset: true }),
  endDate: z.union([
    z.string().datetime({ offset: true }),
    z.literal(""),
    z.null(),
  ]).optional(),
  isCurrent: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(100000).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

const experienceSchema = experienceBaseSchema.superRefine((data, ctx) => {
  const start = new Date(data.startDate);
  const end = data.endDate ? new Date(data.endDate) : null;

  if (data.isCurrent && end) {
    ctx.addIssue({
      code: "custom",
      path: ["endDate"],
      message: "A current position must not have an end date.",
    });
  }

  if (!data.isCurrent && end && end < start) {
    ctx.addIssue({
      code: "custom",
      path: ["endDate"],
      message: "End date must not be earlier than start date.",
    });
  }
});

function sendValidationError(
  res: import("express").Response,
  issues: z.ZodIssue[],
) {
  res.status(400).json({
    error: "Validation failed.",
    details: issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    })),
  });
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}


const educationBaseSchema = z.object({
  institution: z.string().trim().min(1).max(200),
  qualification: z.string().trim().min(1).max(200),
  fieldOfStudy: z.string().trim().max(200).nullable().optional(),
  level: z.string().trim().max(100).nullable().optional(),
  degreeAward: z.string().trim().max(200).nullable().optional(),
  result: z.string().trim().max(100).nullable().optional(),
  startDate: z.union([
    z.string().datetime({ offset: true }),
    z.literal(""),
    z.null(),
  ]).optional(),
  endDate: z.union([
    z.string().datetime({ offset: true }),
    z.literal(""),
    z.null(),
  ]).optional(),
  description: z.string().trim().nullable().optional(),
  sortOrder: z.number().int().min(0).max(100000).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

const educationSchema = educationBaseSchema.superRefine((data, ctx) => {
  if (data.startDate && data.endDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);

    if (end < start) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "End date must not be earlier than start date.",
      });
    }
  }
});

const certificationBaseSchema = z.object({
  name: z.string().trim().min(1).max(200),
  issuer: z.string().trim().min(1).max(180),
  credentialId: z.string().trim().max(180).nullable().optional(),
  credentialUrl: nullableUrl,
  issuedAt: z.union([
    z.string().datetime({ offset: true }),
    z.literal(""),
    z.null(),
  ]).optional(),
  expiresAt: z.union([
    z.string().datetime({ offset: true }),
    z.literal(""),
    z.null(),
  ]).optional(),
  description: z.string().trim().nullable().optional(),
  sortOrder: z.number().int().min(0).max(100000).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

const certificationSchema = certificationBaseSchema.superRefine((data, ctx) => {
  if (data.issuedAt && data.expiresAt) {
    const issued = new Date(data.issuedAt);
    const expires = new Date(data.expiresAt);

    if (expires < issued) {
      ctx.addIssue({
        code: "custom",
        path: ["expiresAt"],
        message: "Expiry date must not be earlier than the issue date.",
      });
    }
  }
});

const skillCategorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(300).nullable().optional(),
  sortOrder: z.number().int().min(0).max(100000).optional(),
});

const skillSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  proficiency: z.number().int().min(0).max(100).nullable().optional(),
  sortOrder: z.number().int().min(0).max(100000).optional(),
  isVisible: z.boolean().optional(),
});

const aboutSchema = z.object({
  heading: z.string().trim().min(1).max(200),
  paragraphOne: z.string().trim().max(2000).nullable().optional(),
  paragraphTwo: z.string().trim().max(2000).nullable().optional(),
  focusOneTitle: z.string().trim().max(120).optional(),
  focusOneDescription: z.string().trim().max(300).optional(),
  focusTwoTitle: z.string().trim().max(120).optional(),
  focusTwoDescription: z.string().trim().max(300).optional(),
  focusThreeTitle: z.string().trim().max(120).optional(),
  focusThreeDescription: z.string().trim().max(300).optional(),
  imageLabel: z.string().trim().max(120).optional(),
});


// ---------------- PROFILE ----------------

router.get("/profile", ...adminRead, async (_req, res, next) => {
  try {
    const profile = await prisma.portfolioProfile.findFirst();
    res.json({ success: true, profile });
  } catch (error) {
    next(error);
  }
});

router.put("/profile", ...adminWrite, async (req, res, next) => {
  try {
    const parsed = profileSchema.safeParse(req.body);

    if (!parsed.success) {
      sendValidationError(res, parsed.error.issues);
      return;
    }

    const data = {
      ...parsed.data,
      headline: parsed.data.headline ?? null,
      professionalSummary: parsed.data.professionalSummary ?? null,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      location: parsed.data.location ?? null,
      profileImage: parsed.data.profileImage ?? null,
      profileImageAlt: parsed.data.profileImageAlt ?? null,
      githubUrl: parsed.data.githubUrl ?? null,
      linkedinUrl: parsed.data.linkedinUrl ?? null,
      websiteUrl: parsed.data.websiteUrl ?? null,
      seoTitle: parsed.data.seoTitle ?? null,
      seoDescription: parsed.data.seoDescription ?? null,
    };

    const existing = await prisma.portfolioProfile.findFirst();

    const profile = existing
      ? await prisma.portfolioProfile.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.portfolioProfile.create({ data });

    res.json({ success: true, profile });
  } catch (error) {
    next(error);
  }
});

// ---------------- PROJECTS ----------------

// Query options: ?status=DRAFT&search=SOC&limit=20&offset=0
router.get("/projects", ...adminRead, async (req, res, next) => {
  try {
    const status = req.query.status;
    const search = req.query.search;
    const limitRaw = Number(req.query.limit ?? 20);
    const offsetRaw = Number(req.query.offset ?? 0);

    if (
      status !== undefined &&
      !["DRAFT", "PUBLISHED", "ARCHIVED"].includes(String(status))
    ) {
      res.status(400).json({ error: "Invalid project status." });
      return;
    }

    if (
      !Number.isInteger(limitRaw) ||
      limitRaw < 1 ||
      limitRaw > 100 ||
      !Number.isInteger(offsetRaw) ||
      offsetRaw < 0
    ) {
      res.status(400).json({
        error: "limit must be 1-100 and offset must be a non-negative integer.",
      });
      return;
    }

    const where = {
      ...(status ? { status: status as "DRAFT" | "PUBLISHED" | "ARCHIVED" } : {}),
      ...(typeof search === "string" && search.trim()
        ? {
            OR: [
              { title: { contains: search.trim(), mode: "insensitive" as const } },
              { summary: { contains: search.trim(), mode: "insensitive" as const } },
              { category: { contains: search.trim(), mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [projects, total] = await prisma.$transaction([
      prisma.project.findMany({
        where,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        take: limitRaw,
        skip: offsetRaw,
      }),
      prisma.project.count({ where }),
    ]);

    res.json({
      success: true,
      projects,
      pagination: {
        total,
        limit: limitRaw,
        offset: offsetRaw,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/projects/:id", ...adminRead, async (req, res, next) => {
  try {
    const projectId = typeof req.params.id === "string" ? req.params.id : undefined;
    if (!projectId) {
      res.status(400).json({ error: "Invalid project ID." });
      return;
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      res.status(404).json({ error: "Project not found." });
      return;
    }

    res.json({ success: true, project });
  } catch (error) {
    next(error);
  }
});

router.post("/projects", ...adminWrite, async (req, res, next) => {
  try {
    const parsed = projectSchema.safeParse(req.body);

    if (!parsed.success) {
      sendValidationError(res, parsed.error.issues);
      return;
    }

    const data = parsed.data;
    const status = data.status ?? "DRAFT";

    const project = await prisma.project.create({
      data: {
        ...data,
        technologies: data.technologies ?? [],
        description: data.description ?? null,
        repositoryUrl: data.repositoryUrl || null,
        liveUrl: data.liveUrl || null,
        imageUrl: data.imageUrl || null,
        imageAlt: data.imageAlt ?? null,
        status,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
        archivedAt: status === "ARCHIVED" ? new Date() : null,
      },
    });

    res.status(201).json({ success: true, project });
  } catch (error) {
    next(error);
  }
});

router.put("/projects/:id", ...adminWrite, async (req, res, next) => {
  try {
    const projectId = typeof req.params.id === "string" ? req.params.id : undefined;
    if (!projectId) {
      res.status(400).json({ error: "Invalid project ID." });
      return;
    }

    const parsed = projectSchema.partial().safeParse(req.body);

    if (!parsed.success) {
      sendValidationError(res, parsed.error.issues);
      return;
    }

    if (Object.keys(parsed.data).length === 0) {
      res.status(400).json({ error: "Provide at least one field to update." });
      return;
    }

    const existing = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!existing) {
      res.status(404).json({ error: "Project not found." });
      return;
    }

    const data = parsed.data;
    const nextStatus = data.status ?? existing.status;

    const project = await prisma.project.update({
      where: { id: existing.id },
      data: {
        ...data,
        ...(data.repositoryUrl !== undefined
          ? { repositoryUrl: data.repositoryUrl || null }
          : {}),
        ...(data.liveUrl !== undefined
          ? { liveUrl: data.liveUrl || null }
          : {}),
        ...(data.imageUrl !== undefined
          ? { imageUrl: data.imageUrl || null }
          : {}),
        ...(data.status !== undefined
          ? {
              publishedAt:
                nextStatus === "PUBLISHED"
                  ? existing.publishedAt ?? new Date()
                  : null,
              archivedAt:
                nextStatus === "ARCHIVED"
                  ? existing.archivedAt ?? new Date()
                  : null,
            }
          : {}),
      },
    });

    res.json({ success: true, project });
  } catch (error) {
    next(error);
  }
});

router.delete("/projects/:id", ...adminDelete, async (req, res, next) => {
  try {
    const projectId = typeof req.params.id === "string" ? req.params.id : undefined;
    if (!projectId) {
      res.status(400).json({ error: "Invalid project ID." });
      return;
    }

    const existing = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!existing) {
      res.status(404).json({ error: "Project not found." });
      return;
    }

    await prisma.project.delete({ where: { id: existing.id } });
    res.json({ success: true, message: "Project deleted." });
  } catch (error) {
    next(error);
  }
});

// ---------------- WORK EXPERIENCE ----------------

router.get("/experience", ...adminRead, async (req, res, next) => {
  try {
    const status = req.query.status;
    const search = String(req.query.search ?? "").trim();

    if (
      status !== undefined &&
      !["DRAFT", "PUBLISHED", "ARCHIVED"].includes(String(status))
    ) {
      res.status(400).json({ error: "Invalid experience status." });
      return;
    }

    const experiences = await prisma.workExperience.findMany({
      where: {
        ...(status ? { status: status as "DRAFT" | "PUBLISHED" | "ARCHIVED" } : {}),
        ...(search
          ? {
              OR: [
                { company: { contains: search, mode: "insensitive" } },
                { position: { contains: search, mode: "insensitive" } },
                { location: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { startDate: "desc" }],
    });

    res.json({ success: true, experiences });
  } catch (error) {
    next(error);
  }
});

router.get("/experience/:id", ...adminRead, async (req, res, next) => {
  try {
    const id = typeof req.params.id === "string" ? req.params.id : undefined;

    if (!id) {
      res.status(400).json({ error: "Invalid experience ID." });
      return;
    }

    const experience = await prisma.workExperience.findUnique({
      where: { id },
    });

    if (!experience) {
      res.status(404).json({ error: "Experience not found." });
      return;
    }

    res.json({ success: true, experience });
  } catch (error) {
    next(error);
  }
});

router.post("/experience", ...adminWrite, async (req, res, next) => {
  try {
    const parsed = experienceSchema.safeParse(req.body);

    if (!parsed.success) {
      sendValidationError(res, parsed.error.issues);
      return;
    }

    const data = parsed.data;
    const status = data.status ?? "DRAFT";
    const startDate = new Date(data.startDate);
    const endDate = data.isCurrent || !data.endDate
      ? null
      : new Date(data.endDate);

    if (endDate && endDate < startDate) {
      res.status(400).json({ error: "End date must not be earlier than start date." });
      return;
    }

    const experience = await prisma.workExperience.create({
      data: {
        company: data.company,
        position: data.position,
        location: data.location || null,
        description: data.description || null,
        startDate,
        endDate,
        isCurrent: data.isCurrent ?? false,
        sortOrder: data.sortOrder ?? 0,
        status,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
        archivedAt: status === "ARCHIVED" ? new Date() : null,
      },
    });

    res.status(201).json({ success: true, experience });
  } catch (error) {
    next(error);
  }
});

router.put("/experience/:id", ...adminWrite, async (req, res, next) => {
  try {
    const id = typeof req.params.id === "string" ? req.params.id : undefined;

    if (!id) {
      res.status(400).json({ error: "Invalid experience ID." });
      return;
    }

    const parsed = experienceBaseSchema.partial().safeParse(req.body);

    if (!parsed.success) {
      sendValidationError(res, parsed.error.issues);
      return;
    }

    if (Object.keys(parsed.data).length === 0) {
      res.status(400).json({ error: "Provide at least one field to update." });
      return;
    }

    const existing = await prisma.workExperience.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ error: "Experience not found." });
      return;
    }

    const data = parsed.data;
    const nextStartDate = data.startDate
      ? new Date(data.startDate)
      : existing.startDate;

    const nextIsCurrent = data.isCurrent ?? existing.isCurrent;

    // If explicitly setting a current role, clear its end date.
    // If switching away from current, the user must provide an end date.
    const nextEndDate =
      nextIsCurrent
        ? null
        : data.endDate !== undefined
          ? data.endDate
            ? new Date(data.endDate)
            : null
          : existing.endDate;

    if (nextEndDate && nextEndDate < nextStartDate) {
      res.status(400).json({
        error: "End date must not be earlier than start date.",
      });
      return;
    }

    const nextStatus = data.status ?? existing.status;

    const experience = await prisma.workExperience.update({
      where: { id },
      data: {
        ...(data.company !== undefined ? { company: data.company } : {}),
        ...(data.position !== undefined ? { position: data.position } : {}),
        ...(data.location !== undefined ? { location: data.location || null } : {}),
        ...(data.description !== undefined
          ? { description: data.description || null }
          : {}),
        ...(data.startDate !== undefined ? { startDate: nextStartDate } : {}),
        ...(data.endDate !== undefined || data.isCurrent !== undefined
          ? { endDate: nextEndDate }
          : {}),
        ...(data.isCurrent !== undefined ? { isCurrent: nextIsCurrent } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        ...(data.status !== undefined
          ? {
              status: nextStatus,
              publishedAt:
                nextStatus === "PUBLISHED"
                  ? existing.publishedAt ?? new Date()
                  : null,
              archivedAt:
                nextStatus === "ARCHIVED"
                  ? existing.archivedAt ?? new Date()
                  : null,
            }
          : {}),
      },
    });

    res.json({ success: true, experience });
  } catch (error) {
    next(error);
  }
});

router.delete("/experience/:id", ...adminDelete, async (req, res, next) => {
  try {
    const id = typeof req.params.id === "string" ? req.params.id : undefined;

    if (!id) {
      res.status(400).json({ error: "Invalid experience ID." });
      return;
    }

    const existing = await prisma.workExperience.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      res.status(404).json({ error: "Experience not found." });
      return;
    }

    await prisma.workExperience.delete({ where: { id } });

    res.json({ success: true, message: "Experience deleted." });
  } catch (error) {
    next(error);
  }
});

// ---------------- EDUCATION ----------------

router.get("/education", ...adminRead, async (req, res, next) => {
  try {
    const status = req.query.status;
    const search = String(req.query.search ?? "").trim();

    if (
      status !== undefined &&
      !["DRAFT", "PUBLISHED", "ARCHIVED"].includes(String(status))
    ) {
      res.status(400).json({ error: "Invalid education status." });
      return;
    }

    const educationRecords = await prisma.education.findMany({
      where: {
        ...(status ? { status: status as "DRAFT" | "PUBLISHED" | "ARCHIVED" } : {}),
        ...(search
          ? {
              OR: [
                { institution: { contains: search, mode: "insensitive" } },
                { qualification: { contains: search, mode: "insensitive" } },
                { fieldOfStudy: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { startDate: "desc" }],
    });

    res.json({ success: true, educationRecords });
  } catch (error) {
    next(error);
  }
});

router.get("/education/:id", ...adminRead, async (req, res, next) => {
  try {
    const id = typeof req.params.id === "string" ? req.params.id : undefined;

    if (!id) {
      res.status(400).json({ error: "Invalid education ID." });
      return;
    }

    const education = await prisma.education.findUnique({
      where: { id },
    });

    if (!education) {
      res.status(404).json({ error: "Education record not found." });
      return;
    }

    res.json({ success: true, education });
  } catch (error) {
    next(error);
  }
});

router.post("/education", ...adminWrite, async (req, res, next) => {
  try {
    const parsed = educationSchema.safeParse(req.body);

    if (!parsed.success) {
      sendValidationError(res, parsed.error.issues);
      return;
    }

    const data = parsed.data;
    const status = data.status ?? "DRAFT";
    const startDate = data.startDate ? new Date(data.startDate) : null;
    const endDate = data.endDate ? new Date(data.endDate) : null;

    if (startDate && endDate && endDate < startDate) {
      res.status(400).json({ error: "End date must not be earlier than start date." });
      return;
    }

    const education = await prisma.education.create({
      data: {
        institution: data.institution,
        qualification: data.qualification,
        fieldOfStudy: data.fieldOfStudy || null,
        level: data.level || null,
        degreeAward: data.degreeAward || null,
        result: data.result || null,
        description: data.description || null,
        startDate,
        endDate,
        sortOrder: data.sortOrder ?? 0,
        status,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
        archivedAt: status === "ARCHIVED" ? new Date() : null,
      },
    });

    res.status(201).json({ success: true, education });
  } catch (error) {
    next(error);
  }
});

router.put("/education/:id", ...adminWrite, async (req, res, next) => {
  try {
    const id = typeof req.params.id === "string" ? req.params.id : undefined;

    if (!id) {
      res.status(400).json({ error: "Invalid education ID." });
      return;
    }

    // Use the base schema so .partial() stays valid alongside the refinement.
    const parsed = educationBaseSchema.partial().safeParse(req.body);

    if (!parsed.success) {
      sendValidationError(res, parsed.error.issues);
      return;
    }

    if (Object.keys(parsed.data).length === 0) {
      res.status(400).json({ error: "Provide at least one field to update." });
      return;
    }

    const existing = await prisma.education.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ error: "Education record not found." });
      return;
    }

    const data = parsed.data;

    const nextStartDate =
      data.startDate !== undefined
        ? data.startDate
          ? new Date(data.startDate)
          : null
        : existing.startDate;

    const nextEndDate =
      data.endDate !== undefined
        ? data.endDate
          ? new Date(data.endDate)
          : null
        : existing.endDate;

    if (nextStartDate && nextEndDate && nextEndDate < nextStartDate) {
      res.status(400).json({
        error: "End date must not be earlier than start date.",
      });
      return;
    }

    const nextStatus = data.status ?? existing.status;

    const education = await prisma.education.update({
      where: { id },
      data: {
        ...(data.institution !== undefined ? { institution: data.institution } : {}),
        ...(data.qualification !== undefined ? { qualification: data.qualification } : {}),
        ...(data.fieldOfStudy !== undefined
          ? { fieldOfStudy: data.fieldOfStudy || null }
          : {}),
        ...(data.level !== undefined ? { level: data.level || null } : {}),
        ...(data.degreeAward !== undefined
          ? { degreeAward: data.degreeAward || null }
          : {}),
        ...(data.result !== undefined ? { result: data.result || null } : {}),
        ...(data.description !== undefined
          ? { description: data.description || null }
          : {}),
        ...(data.startDate !== undefined ? { startDate: nextStartDate } : {}),
        ...(data.endDate !== undefined ? { endDate: nextEndDate } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        ...(data.status !== undefined
          ? {
              status: nextStatus,
              publishedAt:
                nextStatus === "PUBLISHED"
                  ? existing.publishedAt ?? new Date()
                  : null,
              archivedAt:
                nextStatus === "ARCHIVED"
                  ? existing.archivedAt ?? new Date()
                  : null,
            }
          : {}),
      },
    });

    res.json({ success: true, education });
  } catch (error) {
    next(error);
  }
});

router.delete("/education/:id", ...adminDelete, async (req, res, next) => {
  try {
    const id = typeof req.params.id === "string" ? req.params.id : undefined;

    if (!id) {
      res.status(400).json({ error: "Invalid education ID." });
      return;
    }

    const existing = await prisma.education.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      res.status(404).json({ error: "Education record not found." });
      return;
    }

    await prisma.education.delete({ where: { id } });

    res.json({ success: true, message: "Education record deleted." });
  } catch (error) {
    next(error);
  }
});

// ---------------- CERTIFICATIONS ----------------

router.get("/certifications", ...adminRead, async (req, res, next) => {
  try {
    const status = req.query.status;
    const search = String(req.query.search ?? "").trim();

    if (
      status !== undefined &&
      !["DRAFT", "PUBLISHED", "ARCHIVED"].includes(String(status))
    ) {
      res.status(400).json({ error: "Invalid certification status." });
      return;
    }

    const certifications = await prisma.certification.findMany({
      where: {
        ...(status ? { status: status as "DRAFT" | "PUBLISHED" | "ARCHIVED" } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { issuer: { contains: search, mode: "insensitive" } },
                { credentialId: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { issuedAt: "desc" }],
    });

    res.json({ success: true, certifications });
  } catch (error) {
    next(error);
  }
});

router.get("/certifications/:id", ...adminRead, async (req, res, next) => {
  try {
    const id = typeof req.params.id === "string" ? req.params.id : undefined;

    if (!id) {
      res.status(400).json({ error: "Invalid certification ID." });
      return;
    }

    const certification = await prisma.certification.findUnique({
      where: { id },
    });

    if (!certification) {
      res.status(404).json({ error: "Certification not found." });
      return;
    }

    res.json({ success: true, certification });
  } catch (error) {
    next(error);
  }
});

router.post("/certifications", ...adminWrite, async (req, res, next) => {
  try {
    const parsed = certificationSchema.safeParse(req.body);

    if (!parsed.success) {
      sendValidationError(res, parsed.error.issues);
      return;
    }

    const data = parsed.data;
    const status = data.status ?? "DRAFT";
    const issuedAt = data.issuedAt ? new Date(data.issuedAt) : null;
    const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;

    if (issuedAt && expiresAt && expiresAt < issuedAt) {
      res.status(400).json({
        error: "Expiry date must not be earlier than the issue date.",
      });
      return;
    }

    const certification = await prisma.certification.create({
      data: {
        name: data.name,
        issuer: data.issuer,
        credentialId: data.credentialId || null,
        credentialUrl: data.credentialUrl || null,
        description: data.description || null,
        issuedAt,
        expiresAt,
        sortOrder: data.sortOrder ?? 0,
        status,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
        archivedAt: status === "ARCHIVED" ? new Date() : null,
      },
    });

    res.status(201).json({ success: true, certification });
  } catch (error) {
    next(error);
  }
});

router.put("/certifications/:id", ...adminWrite, async (req, res, next) => {
  try {
    const id = typeof req.params.id === "string" ? req.params.id : undefined;

    if (!id) {
      res.status(400).json({ error: "Invalid certification ID." });
      return;
    }

    // Use the base schema so .partial() stays valid alongside the refinement.
    const parsed = certificationBaseSchema.partial().safeParse(req.body);

    if (!parsed.success) {
      sendValidationError(res, parsed.error.issues);
      return;
    }

    if (Object.keys(parsed.data).length === 0) {
      res.status(400).json({ error: "Provide at least one field to update." });
      return;
    }

    const existing = await prisma.certification.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ error: "Certification not found." });
      return;
    }

    const data = parsed.data;

    const nextIssuedAt =
      data.issuedAt !== undefined
        ? data.issuedAt
          ? new Date(data.issuedAt)
          : null
        : existing.issuedAt;

    const nextExpiresAt =
      data.expiresAt !== undefined
        ? data.expiresAt
          ? new Date(data.expiresAt)
          : null
        : existing.expiresAt;

    if (nextIssuedAt && nextExpiresAt && nextExpiresAt < nextIssuedAt) {
      res.status(400).json({
        error: "Expiry date must not be earlier than the issue date.",
      });
      return;
    }

    const nextStatus = data.status ?? existing.status;

    const certification = await prisma.certification.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.issuer !== undefined ? { issuer: data.issuer } : {}),
        ...(data.credentialId !== undefined
          ? { credentialId: data.credentialId || null }
          : {}),
        ...(data.credentialUrl !== undefined
          ? { credentialUrl: data.credentialUrl || null }
          : {}),
        ...(data.description !== undefined
          ? { description: data.description || null }
          : {}),
        ...(data.issuedAt !== undefined ? { issuedAt: nextIssuedAt } : {}),
        ...(data.expiresAt !== undefined ? { expiresAt: nextExpiresAt } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        ...(data.status !== undefined
          ? {
              status: nextStatus,
              publishedAt:
                nextStatus === "PUBLISHED"
                  ? existing.publishedAt ?? new Date()
                  : null,
              archivedAt:
                nextStatus === "ARCHIVED"
                  ? existing.archivedAt ?? new Date()
                  : null,
            }
          : {}),
      },
    });

    res.json({ success: true, certification });
  } catch (error) {
    next(error);
  }
});

router.delete("/certifications/:id", ...adminDelete, async (req, res, next) => {
  try {
    const id = typeof req.params.id === "string" ? req.params.id : undefined;

    if (!id) {
      res.status(400).json({ error: "Invalid certification ID." });
      return;
    }

    const existing = await prisma.certification.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      res.status(404).json({ error: "Certification not found." });
      return;
    }

    await prisma.certification.delete({ where: { id } });

    res.json({ success: true, message: "Certification deleted." });
  } catch (error) {
    next(error);
  }
});

// ---------------- SKILLS ----------------

router.get("/skill-categories", ...adminRead, async (_req, res, next) => {
  try {
    const skillCategories = await prisma.skillCategory.findMany({
      include: {
        skills: {
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    res.json({ success: true, skillCategories });
  } catch (error) {
    next(error);
  }
});

router.post("/skill-categories", ...adminWrite, async (req, res, next) => {
  try {
    const parsed = skillCategorySchema.safeParse(req.body);

    if (!parsed.success) {
      sendValidationError(res, parsed.error.issues);
      return;
    }

    try {
      const skillCategory = await prisma.skillCategory.create({
        data: {
          name: parsed.data.name,
          description: parsed.data.description || null,
          sortOrder: parsed.data.sortOrder ?? 0,
        },
      });

      res.status(201).json({ success: true, skillCategory });
    } catch (error) {
      if (isUniqueViolation(error)) {
        res.status(409).json({
          error: "A skill category with this name already exists.",
        });
        return;
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

router.put("/skill-categories/:id", ...adminWrite, async (req, res, next) => {
  try {
    const id = typeof req.params.id === "string" ? req.params.id : undefined;

    if (!id) {
      res.status(400).json({ error: "Invalid skill category ID." });
      return;
    }

    const parsed = skillCategorySchema.partial().safeParse(req.body);

    if (!parsed.success) {
      sendValidationError(res, parsed.error.issues);
      return;
    }

    if (Object.keys(parsed.data).length === 0) {
      res.status(400).json({ error: "Provide at least one field to update." });
      return;
    }

    const existing = await prisma.skillCategory.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ error: "Skill category not found." });
      return;
    }

    try {
      const skillCategory = await prisma.skillCategory.update({
        where: { id },
        data: {
          ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
          ...(parsed.data.description !== undefined
            ? { description: parsed.data.description || null }
            : {}),
          ...(parsed.data.sortOrder !== undefined
            ? { sortOrder: parsed.data.sortOrder }
            : {}),
        },
      });

      res.json({ success: true, skillCategory });
    } catch (error) {
      if (isUniqueViolation(error)) {
        res.status(409).json({
          error: "A skill category with this name already exists.",
        });
        return;
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

router.delete("/skill-categories/:id", ...adminWrite, async (req, res, next) => {
  try {
    const id = typeof req.params.id === "string" ? req.params.id : undefined;

    if (!id) {
      res.status(400).json({ error: "Invalid skill category ID." });
      return;
    }

    const existing = await prisma.skillCategory.findUnique({
      where: { id },
      include: { _count: { select: { skills: true } } },
    });

    if (!existing) {
      res.status(404).json({ error: "Skill category not found." });
      return;
    }

    await prisma.skillCategory.delete({ where: { id } });

    res.json({
      success: true,
      message: `Skill category and its ${existing._count.skills} skill(s) deleted.`,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/skills", ...adminRead, async (_req, res, next) => {
  try {
    const skills = await prisma.skill.findMany({
      include: {
        category: { select: { id: true, name: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    res.json({ success: true, skills });
  } catch (error) {
    next(error);
  }
});

router.post("/skills", ...adminWrite, async (req, res, next) => {
  try {
    const parsed = skillSchema.safeParse(req.body);

    if (!parsed.success) {
      sendValidationError(res, parsed.error.issues);
      return;
    }

    const category = await prisma.skillCategory.findUnique({
      where: { id: parsed.data.categoryId },
      select: { id: true },
    });

    if (!category) {
      res.status(400).json({ error: "Category not found." });
      return;
    }

    try {
      const skill = await prisma.skill.create({
        data: {
          categoryId: parsed.data.categoryId,
          name: parsed.data.name,
          proficiency: parsed.data.proficiency ?? null,
          sortOrder: parsed.data.sortOrder ?? 0,
          isVisible: parsed.data.isVisible ?? true,
        },
      });

      res.status(201).json({ success: true, skill });
    } catch (error) {
      if (isUniqueViolation(error)) {
        res.status(409).json({
          error: "A skill with this name already exists in this category.",
        });
        return;
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

router.put("/skills/:id", ...adminWrite, async (req, res, next) => {
  try {
    const id = typeof req.params.id === "string" ? req.params.id : undefined;

    if (!id) {
      res.status(400).json({ error: "Invalid skill ID." });
      return;
    }

    const parsed = skillSchema.partial().safeParse(req.body);

    if (!parsed.success) {
      sendValidationError(res, parsed.error.issues);
      return;
    }

    if (Object.keys(parsed.data).length === 0) {
      res.status(400).json({ error: "Provide at least one field to update." });
      return;
    }

    const existing = await prisma.skill.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ error: "Skill not found." });
      return;
    }

    if (parsed.data.categoryId !== undefined) {
      const category = await prisma.skillCategory.findUnique({
        where: { id: parsed.data.categoryId },
        select: { id: true },
      });

      if (!category) {
        res.status(400).json({ error: "Category not found." });
        return;
      }
    }

    try {
      const skill = await prisma.skill.update({
        where: { id },
        data: {
          ...(parsed.data.categoryId !== undefined
            ? { categoryId: parsed.data.categoryId }
            : {}),
          ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
          ...(parsed.data.proficiency !== undefined
            ? { proficiency: parsed.data.proficiency }
            : {}),
          ...(parsed.data.sortOrder !== undefined
            ? { sortOrder: parsed.data.sortOrder }
            : {}),
          ...(parsed.data.isVisible !== undefined
            ? { isVisible: parsed.data.isVisible }
            : {}),
        },
      });

      res.json({ success: true, skill });
    } catch (error) {
      if (isUniqueViolation(error)) {
        res.status(409).json({
          error: "A skill with this name already exists in this category.",
        });
        return;
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

router.delete("/skills/:id", ...adminWrite, async (req, res, next) => {
  try {
    const id = typeof req.params.id === "string" ? req.params.id : undefined;

    if (!id) {
      res.status(400).json({ error: "Invalid skill ID." });
      return;
    }

    const existing = await prisma.skill.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      res.status(404).json({ error: "Skill not found." });
      return;
    }

    await prisma.skill.delete({ where: { id } });

    res.json({ success: true, message: "Skill deleted." });
  } catch (error) {
    next(error);
  }
});

// ---------------- SITE SETTINGS (ABOUT SECTION) ----------------

router.get("/settings/about", ...adminRead, async (_req, res, next) => {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: "about" },
    });

    res.json({ success: true, about: mergeAbout(setting?.value) });
  } catch (error) {
    next(error);
  }
});

router.put("/settings/about", ...adminWrite, async (req, res, next) => {
  try {
    const parsed = aboutSchema.safeParse(req.body);

    if (!parsed.success) {
      sendValidationError(res, parsed.error.issues);
      return;
    }

    const about = mergeAbout({ ...ABOUT_DEFAULTS, ...parsed.data });

    await prisma.siteSetting.upsert({
      where: { key: "about" },
      create: { key: "about", value: about },
      update: { value: about },
    });

    res.json({ success: true, about });
  } catch (error) {
    next(error);
  }
});

export default router;
