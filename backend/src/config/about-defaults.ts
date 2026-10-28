export const ABOUT_DEFAULTS = {
  heading: "Practical thinking. Thoughtful execution.",
  paragraphOne:
    "My background in Computing has helped me develop an interest in the complete software lifecycle—from understanding a problem and building an application to testing its behaviour and considering its security.",
  paragraphTwo:
    "I enjoy working on projects that turn ideas into practical digital solutions. I also value clear documentation, structured problem-solving, and improving my skills through hands-on practice.",
  focusOneTitle: "Development",
  focusOneDescription:
    "Building responsive web applications and practical software projects.",
  focusTwoTitle: "Security",
  focusTwoDescription:
    "Learning web security, monitoring concepts, and security best practices.",
  focusThreeTitle: "Quality",
  focusThreeDescription:
    "Testing software carefully and documenting issues clearly.",
  imageLabel: "Learning by building",
} as const;

export type AboutContent = {
  heading: string;
  paragraphOne?: string | null;
  paragraphTwo?: string | null;
  focusOneTitle?: string;
  focusOneDescription?: string;
  focusTwoTitle?: string;
  focusTwoDescription?: string;
  focusThreeTitle?: string;
  focusThreeDescription?: string;
  imageLabel?: string;
};

export function mergeAbout(stored: unknown): AboutContent {
  const record =
    typeof stored === "object" && stored !== null
      ? (stored as Record<string, unknown>)
      : {};

  const text = (key: keyof typeof ABOUT_DEFAULTS) => {
    const value = record[key];
    return typeof value === "string" && value.trim()
      ? value
      : ABOUT_DEFAULTS[key];
  };

  return {
    heading: text("heading"),
    paragraphOne: text("paragraphOne"),
    paragraphTwo: text("paragraphTwo"),
    focusOneTitle: text("focusOneTitle"),
    focusOneDescription: text("focusOneDescription"),
    focusTwoTitle: text("focusTwoTitle"),
    focusTwoDescription: text("focusTwoDescription"),
    focusThreeTitle: text("focusThreeTitle"),
    focusThreeDescription: text("focusThreeDescription"),
    imageLabel: text("imageLabel"),
  };
}
