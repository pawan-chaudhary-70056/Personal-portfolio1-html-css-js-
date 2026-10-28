import "dotenv/config";
import argon2 from "argon2";
import { z } from "zod";
import { prisma } from "../src/config/prisma.js";

const schema = z.object({
  OWNER_EMAIL: z.string().trim().email().max(254),
  OWNER_PASSWORD: z.string().min(12).max(128),
  OWNER_NAME: z.string().trim().min(1).max(120),
});

async function main() {
  const parsed = schema.safeParse({
    OWNER_EMAIL: process.env.OWNER_EMAIL,
    OWNER_PASSWORD: process.env.OWNER_PASSWORD,
    OWNER_NAME: process.env.OWNER_NAME,
  });

  if (!parsed.success) {
    throw new Error(
      "Provide OWNER_EMAIL, OWNER_PASSWORD (12–128 characters), and OWNER_NAME.",
    );
  }

  const existing = await prisma.adminUser.count();

  if (existing > 0) {
    throw new Error("An admin account already exists. Owner creation stopped.");
  }

  const passwordHash = await argon2.hash(parsed.data.OWNER_PASSWORD, {
    type: argon2.argon2id,
  });

  const owner = await prisma.adminUser.create({
    data: {
      email: parsed.data.OWNER_EMAIL.toLowerCase(),
      displayName: parsed.data.OWNER_NAME,
      passwordHash,
      role: "OWNER",
      isActive: true,
      twoFactorEnabled: false,
    },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
    },
  });

  console.log("Owner account created:", owner);
}

main()
  .catch((error: unknown) => {
    console.error(
      "Owner creation failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
