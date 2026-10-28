"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_js_1 = require("../config/prisma.js");
const about_defaults_js_1 = require("../config/about-defaults.js");
const require_admin_js_1 = require("../middlewares/require-admin.js");
const router = (0, express_1.Router)();
const adminRead = [
    require_admin_js_1.requireAdmin,
    (0, require_admin_js_1.requireRole)("OWNER", "ADMIN", "EDITOR"),
];
const adminWrite = [
    require_admin_js_1.requireAdmin,
    (0, require_admin_js_1.requireRole)("OWNER", "ADMIN", "EDITOR"),
];
const adminDelete = [
    require_admin_js_1.requireAdmin,
    (0, require_admin_js_1.requireRole)("OWNER", "ADMIN"),
];
const nullableUrl = zod_1.z.union([zod_1.z.string().url(), zod_1.z.literal(""), zod_1.z.null()]).optional();
const profileSchema = zod_1.z.object({
    fullName: zod_1.z.string().trim().min(1).max(160),
    headline: zod_1.z.string().trim().max(240).nullable().optional(),
    professionalSummary: zod_1.z.string().trim().nullable().optional(),
    email: zod_1.z.union([zod_1.z.string().email().max(254), zod_1.z.literal(""), zod_1.z.null()]).optional(),
    phone: zod_1.z.string().max(40).nullable().optional(),
    location: zod_1.z.string().max(160).nullable().optional(),
    profileImage: nullableUrl,
    profileImageAlt: zod_1.z.string().max(500).nullable().optional(),
    githubUrl: nullableUrl,
    linkedinUrl: nullableUrl,
    websiteUrl: nullableUrl,
    seoTitle: zod_1.z.string().max(255).nullable().optional(),
    seoDescription: zod_1.z.string().max(500).nullable().optional(),
});
const projectSchema = zod_1.z.object({
    title: zod_1.z.string().trim().min(1).max(180),
    slug: zod_1.z.string().trim().min(1).max(200)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must use lowercase letters, numbers, and hyphens."),
    summary: zod_1.z.string().trim().min(1),
    description: zod_1.z.string().nullable().optional(),
    category: zod_1.z.string().trim().min(1).max(100),
    technologies: zod_1.z.array(zod_1.z.string().trim().min(1).max(100)).max(50).optional(),
    repositoryUrl: nullableUrl,
    liveUrl: nullableUrl,
    imageUrl: nullableUrl,
    imageAlt: zod_1.z.string().max(500).nullable().optional(),
    featured: zod_1.z.boolean().optional(),
    sortOrder: zod_1.z.number().int().min(0).max(100000).optional(),
    status: zod_1.z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});
const experienceBaseSchema = zod_1.z.object({
    company: zod_1.z.string().trim().min(1).max(180),
    position: zod_1.z.string().trim().min(1).max(180),
    location: zod_1.z.string().trim().max(180).nullable().optional(),
    description: zod_1.z.string().trim().nullable().optional(),
    startDate: zod_1.z.string().datetime({ offset: true }),
    endDate: zod_1.z.union([
        zod_1.z.string().datetime({ offset: true }),
        zod_1.z.literal(""),
        zod_1.z.null(),
    ]).optional(),
    isCurrent: zod_1.z.boolean().optional(),
    sortOrder: zod_1.z.number().int().min(0).max(100000).optional(),
    status: zod_1.z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
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
function sendValidationError(res, issues) {
    res.status(400).json({
        error: "Validation failed.",
        details: issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
        })),
    });
}
function isUniqueViolation(error) {
    return (typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002");
}
const educationBaseSchema = zod_1.z.object({
    institution: zod_1.z.string().trim().min(1).max(200),
    qualification: zod_1.z.string().trim().min(1).max(200),
    fieldOfStudy: zod_1.z.string().trim().max(200).nullable().optional(),
    level: zod_1.z.string().trim().max(100).nullable().optional(),
    degreeAward: zod_1.z.string().trim().max(200).nullable().optional(),
    result: zod_1.z.string().trim().max(100).nullable().optional(),
    startDate: zod_1.z.union([
        zod_1.z.string().datetime({ offset: true }),
        zod_1.z.literal(""),
        zod_1.z.null(),
    ]).optional(),
    endDate: zod_1.z.union([
        zod_1.z.string().datetime({ offset: true }),
        zod_1.z.literal(""),
        zod_1.z.null(),
    ]).optional(),
    description: zod_1.z.string().trim().nullable().optional(),
    sortOrder: zod_1.z.number().int().min(0).max(100000).optional(),
    status: zod_1.z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
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
const certificationBaseSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1).max(200),
    issuer: zod_1.z.string().trim().min(1).max(180),
    credentialId: zod_1.z.string().trim().max(180).nullable().optional(),
    credentialUrl: nullableUrl,
    issuedAt: zod_1.z.union([
        zod_1.z.string().datetime({ offset: true }),
        zod_1.z.literal(""),
        zod_1.z.null(),
    ]).optional(),
    expiresAt: zod_1.z.union([
        zod_1.z.string().datetime({ offset: true }),
        zod_1.z.literal(""),
        zod_1.z.null(),
    ]).optional(),
    description: zod_1.z.string().trim().nullable().optional(),
    sortOrder: zod_1.z.number().int().min(0).max(100000).optional(),
    status: zod_1.z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
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
const skillCategorySchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1).max(100),
    description: zod_1.z.string().trim().max(300).nullable().optional(),
    sortOrder: zod_1.z.number().int().min(0).max(100000).optional(),
});
const skillSchema = zod_1.z.object({
    categoryId: zod_1.z.string().uuid(),
    name: zod_1.z.string().trim().min(1).max(120),
    proficiency: zod_1.z.number().int().min(0).max(100).nullable().optional(),
    sortOrder: zod_1.z.number().int().min(0).max(100000).optional(),
    isVisible: zod_1.z.boolean().optional(),
});
const aboutSchema = zod_1.z.object({
    heading: zod_1.z.string().trim().min(1).max(200),
    paragraphOne: zod_1.z.string().trim().max(2000).nullable().optional(),
    paragraphTwo: zod_1.z.string().trim().max(2000).nullable().optional(),
    focusOneTitle: zod_1.z.string().trim().max(120).optional(),
    focusOneDescription: zod_1.z.string().trim().max(300).optional(),
    focusTwoTitle: zod_1.z.string().trim().max(120).optional(),
    focusTwoDescription: zod_1.z.string().trim().max(300).optional(),
    focusThreeTitle: zod_1.z.string().trim().max(120).optional(),
    focusThreeDescription: zod_1.z.string().trim().max(300).optional(),
    imageLabel: zod_1.z.string().trim().max(120).optional(),
});
// ---------------- PROFILE ----------------
router.get("/profile", ...adminRead, async (_req, res, next) => {
    try {
        const profile = await prisma_js_1.prisma.portfolioProfile.findFirst();
        res.json({ success: true, profile });
    }
    catch (error) {
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
        const existing = await prisma_js_1.prisma.portfolioProfile.findFirst();
        const profile = existing
            ? await prisma_js_1.prisma.portfolioProfile.update({
                where: { id: existing.id },
                data,
            })
            : await prisma_js_1.prisma.portfolioProfile.create({ data });
        res.json({ success: true, profile });
    }
    catch (error) {
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
        if (status !== undefined &&
            !["DRAFT", "PUBLISHED", "ARCHIVED"].includes(String(status))) {
            res.status(400).json({ error: "Invalid project status." });
            return;
        }
        if (!Number.isInteger(limitRaw) ||
            limitRaw < 1 ||
            limitRaw > 100 ||
            !Number.isInteger(offsetRaw) ||
            offsetRaw < 0) {
            res.status(400).json({
                error: "limit must be 1-100 and offset must be a non-negative integer.",
            });
            return;
        }
        const where = {
            ...(status ? { status: status } : {}),
            ...(typeof search === "string" && search.trim()
                ? {
                    OR: [
                        { title: { contains: search.trim(), mode: "insensitive" } },
                        { summary: { contains: search.trim(), mode: "insensitive" } },
                        { category: { contains: search.trim(), mode: "insensitive" } },
                    ],
                }
                : {}),
        };
        const [projects, total] = await prisma_js_1.prisma.$transaction([
            prisma_js_1.prisma.project.findMany({
                where,
                orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
                take: limitRaw,
                skip: offsetRaw,
            }),
            prisma_js_1.prisma.project.count({ where }),
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
    }
    catch (error) {
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
        const project = await prisma_js_1.prisma.project.findUnique({
            where: { id: projectId },
        });
        if (!project) {
            res.status(404).json({ error: "Project not found." });
            return;
        }
        res.json({ success: true, project });
    }
    catch (error) {
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
        const project = await prisma_js_1.prisma.project.create({
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
    }
    catch (error) {
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
        const existing = await prisma_js_1.prisma.project.findUnique({
            where: { id: projectId },
        });
        if (!existing) {
            res.status(404).json({ error: "Project not found." });
            return;
        }
        const data = parsed.data;
        const nextStatus = data.status ?? existing.status;
        const project = await prisma_js_1.prisma.project.update({
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
                        publishedAt: nextStatus === "PUBLISHED"
                            ? existing.publishedAt ?? new Date()
                            : null,
                        archivedAt: nextStatus === "ARCHIVED"
                            ? existing.archivedAt ?? new Date()
                            : null,
                    }
                    : {}),
            },
        });
        res.json({ success: true, project });
    }
    catch (error) {
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
        const existing = await prisma_js_1.prisma.project.findUnique({
            where: { id: projectId },
            select: { id: true },
        });
        if (!existing) {
            res.status(404).json({ error: "Project not found." });
            return;
        }
        await prisma_js_1.prisma.project.delete({ where: { id: existing.id } });
        res.json({ success: true, message: "Project deleted." });
    }
    catch (error) {
        next(error);
    }
});
// ---------------- WORK EXPERIENCE ----------------
router.get("/experience", ...adminRead, async (req, res, next) => {
    try {
        const status = req.query.status;
        const search = String(req.query.search ?? "").trim();
        if (status !== undefined &&
            !["DRAFT", "PUBLISHED", "ARCHIVED"].includes(String(status))) {
            res.status(400).json({ error: "Invalid experience status." });
            return;
        }
        const experiences = await prisma_js_1.prisma.workExperience.findMany({
            where: {
                ...(status ? { status: status } : {}),
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
    }
    catch (error) {
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
        const experience = await prisma_js_1.prisma.workExperience.findUnique({
            where: { id },
        });
        if (!experience) {
            res.status(404).json({ error: "Experience not found." });
            return;
        }
        res.json({ success: true, experience });
    }
    catch (error) {
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
        const experience = await prisma_js_1.prisma.workExperience.create({
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
    }
    catch (error) {
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
        const existing = await prisma_js_1.prisma.workExperience.findUnique({ where: { id } });
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
        const nextEndDate = nextIsCurrent
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
        const experience = await prisma_js_1.prisma.workExperience.update({
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
                        publishedAt: nextStatus === "PUBLISHED"
                            ? existing.publishedAt ?? new Date()
                            : null,
                        archivedAt: nextStatus === "ARCHIVED"
                            ? existing.archivedAt ?? new Date()
                            : null,
                    }
                    : {}),
            },
        });
        res.json({ success: true, experience });
    }
    catch (error) {
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
        const existing = await prisma_js_1.prisma.workExperience.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!existing) {
            res.status(404).json({ error: "Experience not found." });
            return;
        }
        await prisma_js_1.prisma.workExperience.delete({ where: { id } });
        res.json({ success: true, message: "Experience deleted." });
    }
    catch (error) {
        next(error);
    }
});
// ---------------- EDUCATION ----------------
router.get("/education", ...adminRead, async (req, res, next) => {
    try {
        const status = req.query.status;
        const search = String(req.query.search ?? "").trim();
        if (status !== undefined &&
            !["DRAFT", "PUBLISHED", "ARCHIVED"].includes(String(status))) {
            res.status(400).json({ error: "Invalid education status." });
            return;
        }
        const educationRecords = await prisma_js_1.prisma.education.findMany({
            where: {
                ...(status ? { status: status } : {}),
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
    }
    catch (error) {
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
        const education = await prisma_js_1.prisma.education.findUnique({
            where: { id },
        });
        if (!education) {
            res.status(404).json({ error: "Education record not found." });
            return;
        }
        res.json({ success: true, education });
    }
    catch (error) {
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
        const education = await prisma_js_1.prisma.education.create({
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
    }
    catch (error) {
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
        const existing = await prisma_js_1.prisma.education.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ error: "Education record not found." });
            return;
        }
        const data = parsed.data;
        const nextStartDate = data.startDate !== undefined
            ? data.startDate
                ? new Date(data.startDate)
                : null
            : existing.startDate;
        const nextEndDate = data.endDate !== undefined
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
        const education = await prisma_js_1.prisma.education.update({
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
                        publishedAt: nextStatus === "PUBLISHED"
                            ? existing.publishedAt ?? new Date()
                            : null,
                        archivedAt: nextStatus === "ARCHIVED"
                            ? existing.archivedAt ?? new Date()
                            : null,
                    }
                    : {}),
            },
        });
        res.json({ success: true, education });
    }
    catch (error) {
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
        const existing = await prisma_js_1.prisma.education.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!existing) {
            res.status(404).json({ error: "Education record not found." });
            return;
        }
        await prisma_js_1.prisma.education.delete({ where: { id } });
        res.json({ success: true, message: "Education record deleted." });
    }
    catch (error) {
        next(error);
    }
});
// ---------------- CERTIFICATIONS ----------------
router.get("/certifications", ...adminRead, async (req, res, next) => {
    try {
        const status = req.query.status;
        const search = String(req.query.search ?? "").trim();
        if (status !== undefined &&
            !["DRAFT", "PUBLISHED", "ARCHIVED"].includes(String(status))) {
            res.status(400).json({ error: "Invalid certification status." });
            return;
        }
        const certifications = await prisma_js_1.prisma.certification.findMany({
            where: {
                ...(status ? { status: status } : {}),
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
    }
    catch (error) {
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
        const certification = await prisma_js_1.prisma.certification.findUnique({
            where: { id },
        });
        if (!certification) {
            res.status(404).json({ error: "Certification not found." });
            return;
        }
        res.json({ success: true, certification });
    }
    catch (error) {
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
        const certification = await prisma_js_1.prisma.certification.create({
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
    }
    catch (error) {
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
        const existing = await prisma_js_1.prisma.certification.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ error: "Certification not found." });
            return;
        }
        const data = parsed.data;
        const nextIssuedAt = data.issuedAt !== undefined
            ? data.issuedAt
                ? new Date(data.issuedAt)
                : null
            : existing.issuedAt;
        const nextExpiresAt = data.expiresAt !== undefined
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
        const certification = await prisma_js_1.prisma.certification.update({
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
                        publishedAt: nextStatus === "PUBLISHED"
                            ? existing.publishedAt ?? new Date()
                            : null,
                        archivedAt: nextStatus === "ARCHIVED"
                            ? existing.archivedAt ?? new Date()
                            : null,
                    }
                    : {}),
            },
        });
        res.json({ success: true, certification });
    }
    catch (error) {
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
        const existing = await prisma_js_1.prisma.certification.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!existing) {
            res.status(404).json({ error: "Certification not found." });
            return;
        }
        await prisma_js_1.prisma.certification.delete({ where: { id } });
        res.json({ success: true, message: "Certification deleted." });
    }
    catch (error) {
        next(error);
    }
});
// ---------------- SKILLS ----------------
router.get("/skill-categories", ...adminRead, async (_req, res, next) => {
    try {
        const skillCategories = await prisma_js_1.prisma.skillCategory.findMany({
            include: {
                skills: {
                    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
                },
            },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        });
        res.json({ success: true, skillCategories });
    }
    catch (error) {
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
            const skillCategory = await prisma_js_1.prisma.skillCategory.create({
                data: {
                    name: parsed.data.name,
                    description: parsed.data.description || null,
                    sortOrder: parsed.data.sortOrder ?? 0,
                },
            });
            res.status(201).json({ success: true, skillCategory });
        }
        catch (error) {
            if (isUniqueViolation(error)) {
                res.status(409).json({
                    error: "A skill category with this name already exists.",
                });
                return;
            }
            throw error;
        }
    }
    catch (error) {
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
        const existing = await prisma_js_1.prisma.skillCategory.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ error: "Skill category not found." });
            return;
        }
        try {
            const skillCategory = await prisma_js_1.prisma.skillCategory.update({
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
        }
        catch (error) {
            if (isUniqueViolation(error)) {
                res.status(409).json({
                    error: "A skill category with this name already exists.",
                });
                return;
            }
            throw error;
        }
    }
    catch (error) {
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
        const existing = await prisma_js_1.prisma.skillCategory.findUnique({
            where: { id },
            include: { _count: { select: { skills: true } } },
        });
        if (!existing) {
            res.status(404).json({ error: "Skill category not found." });
            return;
        }
        await prisma_js_1.prisma.skillCategory.delete({ where: { id } });
        res.json({
            success: true,
            message: `Skill category and its ${existing._count.skills} skill(s) deleted.`,
        });
    }
    catch (error) {
        next(error);
    }
});
router.get("/skills", ...adminRead, async (_req, res, next) => {
    try {
        const skills = await prisma_js_1.prisma.skill.findMany({
            include: {
                category: { select: { id: true, name: true } },
            },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        });
        res.json({ success: true, skills });
    }
    catch (error) {
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
        const category = await prisma_js_1.prisma.skillCategory.findUnique({
            where: { id: parsed.data.categoryId },
            select: { id: true },
        });
        if (!category) {
            res.status(400).json({ error: "Category not found." });
            return;
        }
        try {
            const skill = await prisma_js_1.prisma.skill.create({
                data: {
                    categoryId: parsed.data.categoryId,
                    name: parsed.data.name,
                    proficiency: parsed.data.proficiency ?? null,
                    sortOrder: parsed.data.sortOrder ?? 0,
                    isVisible: parsed.data.isVisible ?? true,
                },
            });
            res.status(201).json({ success: true, skill });
        }
        catch (error) {
            if (isUniqueViolation(error)) {
                res.status(409).json({
                    error: "A skill with this name already exists in this category.",
                });
                return;
            }
            throw error;
        }
    }
    catch (error) {
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
        const existing = await prisma_js_1.prisma.skill.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ error: "Skill not found." });
            return;
        }
        if (parsed.data.categoryId !== undefined) {
            const category = await prisma_js_1.prisma.skillCategory.findUnique({
                where: { id: parsed.data.categoryId },
                select: { id: true },
            });
            if (!category) {
                res.status(400).json({ error: "Category not found." });
                return;
            }
        }
        try {
            const skill = await prisma_js_1.prisma.skill.update({
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
        }
        catch (error) {
            if (isUniqueViolation(error)) {
                res.status(409).json({
                    error: "A skill with this name already exists in this category.",
                });
                return;
            }
            throw error;
        }
    }
    catch (error) {
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
        const existing = await prisma_js_1.prisma.skill.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!existing) {
            res.status(404).json({ error: "Skill not found." });
            return;
        }
        await prisma_js_1.prisma.skill.delete({ where: { id } });
        res.json({ success: true, message: "Skill deleted." });
    }
    catch (error) {
        next(error);
    }
});
// ---------------- SITE SETTINGS (ABOUT SECTION) ----------------
router.get("/settings/about", ...adminRead, async (_req, res, next) => {
    try {
        const setting = await prisma_js_1.prisma.siteSetting.findUnique({
            where: { key: "about" },
        });
        res.json({ success: true, about: (0, about_defaults_js_1.mergeAbout)(setting?.value) });
    }
    catch (error) {
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
        const about = (0, about_defaults_js_1.mergeAbout)({ ...about_defaults_js_1.ABOUT_DEFAULTS, ...parsed.data });
        await prisma_js_1.prisma.siteSetting.upsert({
            where: { key: "about" },
            create: { key: "about", value: about },
            update: { value: about },
        });
        res.json({ success: true, about });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
