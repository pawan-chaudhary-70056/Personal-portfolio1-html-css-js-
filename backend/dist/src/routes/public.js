"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_js_1 = require("../config/prisma.js");
const about_defaults_js_1 = require("../config/about-defaults.js");
const router = (0, express_1.Router)();
router.get("/profile", async (_req, res, next) => {
    try {
        const profile = await prisma_js_1.prisma.portfolioProfile.findFirst();
        const education = await prisma_js_1.prisma.education.findFirst({
            where: { status: "PUBLISHED" },
            select: { qualification: true, result: true },
            orderBy: [{ sortOrder: "asc" }, { startDate: "desc" }],
        });
        res.setHeader("Cache-Control", "no-store");
        res.json({
            success: true,
            profile,
            educationMeta: education
                ? {
                    education: education.qualification,
                    classification: education.result,
                }
                : null,
        });
    }
    catch (error) {
        next(error);
    }
});
router.get("/about", async (_req, res, next) => {
    try {
        const setting = await prisma_js_1.prisma.siteSetting.findUnique({
            where: { key: "about" },
        });
        res.setHeader("Cache-Control", "no-store");
        res.json({ success: true, about: (0, about_defaults_js_1.mergeAbout)(setting?.value) });
    }
    catch (error) {
        next(error);
    }
});
router.get("/skills", async (_req, res, next) => {
    try {
        const categories = await prisma_js_1.prisma.skillCategory.findMany({
            select: {
                id: true,
                name: true,
                description: true,
                sortOrder: true,
                skills: {
                    where: { isVisible: true },
                    select: {
                        id: true,
                        name: true,
                        proficiency: true,
                        sortOrder: true,
                    },
                    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
                },
            },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        });
        res.setHeader("Cache-Control", "no-store");
        res.json({ success: true, categories });
    }
    catch (error) {
        next(error);
    }
});
router.get("/projects", async (_req, res, next) => {
    try {
        const projects = await prisma_js_1.prisma.project.findMany({
            where: { status: "PUBLISHED" },
            select: {
                id: true,
                title: true,
                slug: true,
                summary: true,
                description: true,
                category: true,
                technologies: true,
                repositoryUrl: true,
                liveUrl: true,
                imageUrl: true,
                imageAlt: true,
                featured: true,
                sortOrder: true,
            },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        });
        res.setHeader("Cache-Control", "no-store");
        res.json({ success: true, projects });
    }
    catch (error) {
        next(error);
    }
});
router.get("/experience", async (_req, res, next) => {
    try {
        const experiences = await prisma_js_1.prisma.workExperience.findMany({
            where: { status: "PUBLISHED" },
            select: {
                id: true,
                company: true,
                position: true,
                location: true,
                description: true,
                startDate: true,
                endDate: true,
                isCurrent: true,
                sortOrder: true,
            },
            orderBy: [{ sortOrder: "asc" }, { startDate: "desc" }],
        });
        res.setHeader("Cache-Control", "no-store");
        res.json({ success: true, experiences });
    }
    catch (error) {
        next(error);
    }
});
router.get("/education", async (_req, res, next) => {
    try {
        const educationRecords = await prisma_js_1.prisma.education.findMany({
            where: { status: "PUBLISHED" },
            select: {
                id: true,
                institution: true,
                qualification: true,
                fieldOfStudy: true,
                level: true,
                degreeAward: true,
                result: true,
                description: true,
                startDate: true,
                endDate: true,
                sortOrder: true,
            },
            orderBy: [{ sortOrder: "asc" }, { startDate: "desc" }],
        });
        res.setHeader("Cache-Control", "no-store");
        res.json({ success: true, educationRecords });
    }
    catch (error) {
        next(error);
    }
});
router.get("/certifications", async (_req, res, next) => {
    try {
        const certifications = await prisma_js_1.prisma.certification.findMany({
            where: { status: "PUBLISHED" },
            select: {
                id: true,
                name: true,
                issuer: true,
                credentialId: true,
                credentialUrl: true,
                description: true,
                issuedAt: true,
                expiresAt: true,
                sortOrder: true,
            },
            orderBy: [{ sortOrder: "asc" }, { issuedAt: "desc" }],
        });
        res.setHeader("Cache-Control", "no-store");
        res.json({ success: true, certifications });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
