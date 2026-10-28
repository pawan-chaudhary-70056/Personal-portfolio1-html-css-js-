"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ABOUT_DEFAULTS = void 0;
exports.mergeAbout = mergeAbout;
exports.ABOUT_DEFAULTS = {
    heading: "Practical thinking. Thoughtful execution.",
    paragraphOne: "My background in Computing has helped me develop an interest in the complete software lifecycle—from understanding a problem and building an application to testing its behaviour and considering its security.",
    paragraphTwo: "I enjoy working on projects that turn ideas into practical digital solutions. I also value clear documentation, structured problem-solving, and improving my skills through hands-on practice.",
    focusOneTitle: "Development",
    focusOneDescription: "Building responsive web applications and practical software projects.",
    focusTwoTitle: "Security",
    focusTwoDescription: "Learning web security, monitoring concepts, and security best practices.",
    focusThreeTitle: "Quality",
    focusThreeDescription: "Testing software carefully and documenting issues clearly.",
    imageLabel: "Learning by building",
};
function mergeAbout(stored) {
    const record = typeof stored === "object" && stored !== null
        ? stored
        : {};
    const text = (key) => {
        const value = record[key];
        return typeof value === "string" && value.trim()
            ? value
            : exports.ABOUT_DEFAULTS[key];
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
