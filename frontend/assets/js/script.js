
"use strict";

document.addEventListener("DOMContentLoaded", () => {

  /* Published experience — public API */

  async function loadPublishedExperience() {
    const timeline = document.getElementById("experience-timeline");
    if (!timeline) return;

    try {
      const response = await fetch(
        "http://localhost:4000/api/public/experience",
        {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store"
        }
      );

      if (!response.ok) {
        throw new Error(`Experience API returned ${response.status}`);
      }

      const result = await response.json();
      const experiences = Array.isArray(result.experiences)
        ? result.experiences
        : [];

      if (experiences.length === 0) {
        timeline.innerHTML =
          '<p class="muted">Professional experience will be added soon.</p>';
        return;
      }

      const escapeHtml = (value = "") =>
        String(value ?? "").replace(/[&<>"']/g, (char) => ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        })[char]);

      const formatDate = (value) => {
        if (!value) return "";

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";

        return new Intl.DateTimeFormat("en", {
          month: "short",
          year: "numeric",
          timeZone: "UTC"
        }).format(date);
      };

      timeline.innerHTML = experiences
        .filter((item) => item && item.company && item.position)
        .map((item) => {
          const start = formatDate(item.startDate);
          const end = item.isCurrent
            ? "Present"
            : formatDate(item.endDate) || "End date not set";
          const period = start ? `${start} – ${end}` : end;
          const description = String(item.description || "").trim();

          return `
            <article class="experience-item">
              <div class="timeline-marker"><span></span></div>
              <div class="experience-card">
                <div class="experience-card-header">
                  <div>
                    <p class="experience-category">PROFESSIONAL EXPERIENCE</p>
                    <h3>${escapeHtml(item.position)}</h3>
                    <p class="experience-company">${escapeHtml(item.company)}</p>
                    ${
                      item.location
                        ? `<p class="experience-company">${escapeHtml(item.location)}</p>`
                        : ""
                    }
                  </div>
                  <span class="experience-date">${escapeHtml(period)}</span>
                </div>
                <div class="experience-divider"></div>
                ${
                  description
                    ? `<p class="experience-summary">${escapeHtml(description)}</p>`
                    : ""
                }
              </div>
            </article>`;
        })
        .join("");

      if (!timeline.innerHTML.trim()) {
        timeline.innerHTML =
          '<p class="muted">No published experience is available.</p>';
      }
    } catch (error) {
      console.error("Could not load published experience:", error);
      timeline.innerHTML =
        '<p class="muted">Experience is temporarily unavailable. Please try again later.</p>';
    }
  }

  loadPublishedExperience();

  /* Published education — public API */

  async function loadPublishedEducation() {
    const list = document.getElementById("education-list");
    if (!list) return;

    try {
      const response = await fetch(
        "http://localhost:4000/api/public/education",
        {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store"
        }
      );

      if (!response.ok) {
        throw new Error(`Education API returned ${response.status}`);
      }

      const result = await response.json();
      const educationRecords = Array.isArray(result.educationRecords)
        ? result.educationRecords
        : [];

      if (educationRecords.length === 0) {
        list.innerHTML =
          '<p class="muted">Education details will be added soon.</p>';
        return;
      }

      const escapeHtml = (value = "") =>
        String(value ?? "").replace(/[&<>"']/g, (char) => ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        })[char]);

      /* Dates are stored in the database but deliberately not rendered on the
         public card — the approved design shows no date segment. */

      list.innerHTML = educationRecords
        .filter((item) => item && item.institution && item.qualification)
        .map((item) => {
          const description = String(item.description || "").trim();
          const fieldOfStudy = String(item.fieldOfStudy || "").trim();
          const resultLabel = String(item.result || "").trim();

          // Facts row mirrors the approved design: DEGREE / FIELD / FINAL CLASSIFICATION.
          const details = [
            String(item.degreeAward || "").trim()
              ? { label: "DEGREE", value: String(item.degreeAward).trim() }
              : null,
            fieldOfStudy
              ? { label: "FIELD", value: fieldOfStudy }
              : null,
            resultLabel
              ? { label: "FINAL CLASSIFICATION", value: resultLabel }
              : null
          ].filter(Boolean);

          return `
            <article class="education-card">
              <div class="education-side">
                <span class="education-symbol" aria-hidden="true">∑</span>
                <span class="education-side-label">${escapeHtml(
                  (fieldOfStudy || "Academic record").toUpperCase()
                )}</span>
                <span class="education-side-rule"></span>
                <span class="education-side-foot">ACADEMIC RECORD</span>
              </div>

              <div class="education-main">
                <div class="education-topline">
                  ${
                    item.level
                      ? `<span class="education-badge">${escapeHtml(item.level)}</span>`
                      : ""
                  }
                  ${
                    resultLabel
                      ? `<span class="education-classification">${escapeHtml(resultLabel)}</span>`
                      : ""
                  }
                </div>
                <h3>${escapeHtml(item.qualification)}</h3>
                <p class="education-institution">${escapeHtml(item.institution)}</p>
                ${
                  description
                    ? `<p class="education-description">${escapeHtml(description)}</p>`
                    : ""
                }
                ${
                  details.length
                    ? `<div class="education-details">
                        ${details.map((detail) => `
                          <div><span class="detail-label">${detail.label}</span><strong>${escapeHtml(detail.value)}</strong></div>`).join("")}
                      </div>`
                    : ""
                }
              </div>
            </article>`;
        })
        .join("");

      applyEducationReveal();
    } catch (error) {
      console.error("Could not load published education:", error);
      list.innerHTML =
        '<p class="muted">Education is temporarily unavailable. Please try again later.</p>';
    }
  }

  loadPublishedEducation();

  /* Published certifications — public API */

  async function loadPublishedCertifications() {
    const grid = document.getElementById("certifications-grid");
    if (!grid) return;

    try {
      const response = await fetch(
        "http://localhost:4000/api/public/certifications",
        {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store"
        }
      );

      if (!response.ok) {
        throw new Error(`Certifications API returned ${response.status}`);
      }

      const result = await response.json();
      const records = Array.isArray(result.certifications)
        ? result.certifications
        : [];

      if (records.length === 0) {
        grid.innerHTML =
          '<p class="muted">Verified certifications will be added soon.</p>';
        return;
      }

      const escapeHtml = (value = "") =>
        String(value ?? "").replace(/[&<>"']/g, (char) => ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        })[char]);

      const symbols = ["⌘", "◈", "⌁"];

      grid.innerHTML = records
        .filter((item) => item && item.name && item.issuer)
        .map((item, index) => {
          const description = String(item.description || "").trim();
          const credentialId = String(item.credentialId || "").trim();
          const credentialUrl = String(item.credentialUrl || "").trim();

          const formatDateYear = (value) => {
            if (!value) return "";
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return "";
            return String(new Date(value).getUTCFullYear());
          };

          const issued = formatDateYear(item.issuedAt);
          const expires = formatDateYear(item.expiresAt);
          const validity = [
            issued ? `Issued ${issued}` : "",
            expires ? `Expires ${expires}` : ""
          ].filter(Boolean).join(" · ");

          const symbol = symbols[index % symbols.length];

          return `
            <article class="certification-card">
              <span class="certification-icon" aria-hidden="true">${symbol}</span>
              <p class="certification-status">${escapeHtml(item.issuer.toUpperCase())}</p>
              <h3>${escapeHtml(item.name)}</h3>
              ${
                description
                  ? `<p>${escapeHtml(description)}</p>`
                  : ""
              }
              ${
                validity
                  ? `<span class="credential-note">${escapeHtml(validity)}</span>`
                  : `<span class="credential-note">Credential details to be added</span>`
              }
              ${
                credentialUrl
                  ? `<a class="text-link" href="${escapeHtml(credentialUrl)}" target="_blank" rel="noopener noreferrer">View credential <span aria-hidden="true">↗</span></a>`
                  : ""
              }
            </article>`;
        })
        .join("");

      applyCertificationReveal();
    } catch (error) {
      console.error("Could not load published certifications:", error);
      grid.innerHTML =
        '<p class="muted">Certifications are temporarily unavailable. Please try again later.</p>';
    }
  }

  loadPublishedCertifications();

  /* Published projects — public API */

  async function loadPublishedProjects() {
    const grid = document.getElementById("projects-grid");
    if (!grid) return;

    try {
      const response = await fetch(
        "http://localhost:4000/api/public/projects",
        {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store"
        }
      );

      if (!response.ok) {
        throw new Error(`Projects API returned ${response.status}`);
      }

      const result = await response.json();
      const projects = Array.isArray(result.projects)
        ? result.projects
        : [];

      if (projects.length === 0) {
        grid.innerHTML =
          '<p class="muted">Selected projects will be added soon.</p>';
        return;
      }

      const escapeHtml = (value = "") =>
        String(value ?? "").replace(/[&<>"']/g, (char) => ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        })[char]);

      const decorativeArts = [
        `<span class="art-window">
                  <span class="window-dots">● ● ●</span>
                  <span class="art-line art-line-long"></span>
                  <span class="art-line"></span>
                  <span class="art-blocks"><i></i><i></i><i></i></span>
                </span>`,
        `<span class="security-shape">⌑</span><span class="security-ring"></span><span class="security-label">SECUREDESK</span>`,
        `<span class="medical-cross">+</span><span class="medical-panel"><i></i><i></i><i></i><i></i></span>`
      ];
      const artClasses = ["project-art-one", "project-art-two", "project-art-three"];

      grid.innerHTML = projects
        .filter((item) => item && item.title && item.summary)
        .map((item, index) => {
          const summary = String(item.summary || "").trim();
          const category = String(item.category || "").trim();
          const technologies = Array.isArray(item.technologies)
            ? item.technologies.filter(Boolean)
            : [];
          const repositoryUrl = String(item.repositoryUrl || "").trim();
          const liveUrl = String(item.liveUrl || "").trim();
          const imageUrl = String(item.imageUrl || "").trim();
          const imageAlt = String(item.imageAlt || "").trim();

          const link = repositoryUrl
            ? {
                href: repositoryUrl,
                label: "View repository"
              }
            : liveUrl
              ? { href: liveUrl, label: "View project" }
              : null;

          const number = String(index + 1).padStart(2, "0");
          const artIndex = index % 3;

          return `
            <article class="project-card">
              <div class="project-topline">
                <span class="project-number">PROJECT / ${number}</span>
                <span class="project-arrow" aria-hidden="true">↗</span>
              </div>
              <div class="project-art ${artClasses[artIndex]}" aria-hidden="true">
                ${
                  imageUrl
                    ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(imageAlt || item.title)}" loading="lazy">`
                    : decorativeArts[artIndex]
                }
              </div>
              <div class="project-content">
                ${
                  category
                    ? `<p class="project-type">${escapeHtml(category.toUpperCase())}</p>`
                    : ""
                }
                <h3>${escapeHtml(item.title)}</h3>
                <p>${escapeHtml(summary)}</p>
                ${
                  technologies.length
                    ? `<div class="tag-list">${technologies.map((tech) => `<span>${escapeHtml(tech)}</span>`).join("")}</div>`
                    : ""
                }
                ${
                  link
                    ? `<a class="text-link" href="${escapeHtml(link.href)}" target="_blank" rel="noopener noreferrer">${link.label} <span aria-hidden="true">↗</span></a>`
                    : ""
                }
              </div>
            </article>`;
        })
        .join("");

      applyProjectReveal();
    } catch (error) {
      console.error("Could not load published projects:", error);
      grid.innerHTML =
        '<p class="muted">Projects are temporarily unavailable. Please try again later.</p>';
    }
  }

  loadPublishedProjects();

  /* Hero content — public profile + published education meta */

  async function loadPublicHero() {
    const setText = (id, value) => {
      if (typeof value !== "string" || !value.trim()) return;
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    };

    try {
      const response = await fetch(
        "http://localhost:4000/api/public/profile",
        {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store"
        }
      );

      if (!response.ok) {
        throw new Error(`Profile API returned ${response.status}`);
      }

      const result = await response.json();
      const profile = result.profile || {};

      setText("hero-headline", profile.headline);
      setText("hero-name", profile.fullName);
      setText("hero-description", profile.professionalSummary);

      if (result.educationMeta) {
        setText("hero-education", result.educationMeta.education);
        setText("hero-classification", result.educationMeta.classification);
      }
    } catch (error) {
      console.error("Could not load profile content:", error);
    }
  }

  loadPublicHero();

  /* About section — editable site settings */

  async function loadPublicAbout() {
    const setText = (id, value) => {
      if (typeof value !== "string" || !value.trim()) return;
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    };

    try {
      const response = await fetch("http://localhost:4000/api/public/about", {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`About API returned ${response.status}`);
      }

      const result = await response.json();
      const about = result.about || {};

      setText("about-heading", about.heading);
      setText("about-paragraph-1", about.paragraphOne);
      setText("about-paragraph-2", about.paragraphTwo);
      setText("focus-1-title", about.focusOneTitle);
      setText("focus-1-description", about.focusOneDescription);
      setText("focus-2-title", about.focusTwoTitle);
      setText("focus-2-description", about.focusTwoDescription);
      setText("focus-3-title", about.focusThreeTitle);
      setText("focus-3-description", about.focusThreeDescription);
      setText("about-image-caption", about.imageLabel);
    } catch (error) {
      console.error("Could not load About content:", error);
    }
  }

  loadPublicAbout();

  /* Skills — public API (falls back to the static cards in the markup) */

  async function loadPublicSkills() {
    const grid = document.getElementById("skills-grid");
    if (!grid) return;

    try {
      const response = await fetch(
        "http://localhost:4000/api/public/skills",
        {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store"
        }
      );

      if (!response.ok) {
        throw new Error(`Skills API returned ${response.status}`);
      }

      const result = await response.json();
      const categories = Array.isArray(result.categories)
        ? result.categories
        : [];

      const renderable = categories.filter(
        (category) =>
          category &&
          category.name &&
          Array.isArray(category.skills) &&
          category.skills.length > 0
      );

      if (renderable.length === 0) {
        return;
      }

      const escapeHtml = (value = "") =>
        String(value ?? "").replace(/[&<>"']/g, (char) => ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        })[char]);

      const glyphs = ["</>", "▤", "⌁"];

      grid.innerHTML = renderable
        .map((category, index) => {
          const name = String(category.name || "").trim();
          const description = String(category.description || "").trim();
          const number = String(index + 1).padStart(2, "0");
          const glyph = glyphs[index % glyphs.length];

          return `
            <article class="skill-card">
              <span class="card-index">${number} / ${escapeHtml(name.toUpperCase())}</span>
              <div class="skill-card-icon" aria-hidden="true">${escapeHtml(glyph)}</div>
              <h3>${escapeHtml(name)}</h3>
              ${description ? `<p>${escapeHtml(description)}</p>` : ""}
              <div class="tag-list">${category.skills
                .map((skill) => `<span>${escapeHtml(skill.name)}</span>`)
                .join("")}</div>
            </article>`;
        })
        .join("");

      applySkillsReveal();
    } catch (error) {
      console.error("Could not load skills:", error);
    }
  }

  loadPublicSkills();


  const root = document.documentElement;
  const body = document.body;

  const menuToggle = document.getElementById("menu-toggle");
  const navigation = document.getElementById("primary-navigation");
  const themeToggle = document.getElementById("theme-toggle");
  const themeIcon = themeToggle?.querySelector(".theme-icon");
  const backToTop = document.getElementById("back-to-top");
  const currentYear = document.getElementById("current-year");

  const navLinks = Array.from(
    document.querySelectorAll(".primary-navigation .nav-link")
  );

  const sections = navLinks
    .map((link) => {
      const href = link.getAttribute("href");

      if (!href || !href.startsWith("#")) return null;

      const section = document.querySelector(href);
      return section ? { link, section } : null;
    })
    .filter(Boolean);

  /* Theme toggle */

  function applyTheme(theme) {
    const selectedTheme = theme === "light" ? "light" : "dark";

    root.setAttribute("data-theme", selectedTheme);

    if (themeIcon) {
      themeIcon.textContent = selectedTheme === "dark" ? "☼" : "☾";
    }

    if (themeToggle) {
      const nextTheme = selectedTheme === "dark" ? "light" : "dark";

      themeToggle.setAttribute(
        "aria-label",
        `Switch to ${nextTheme} theme`
      );

      themeToggle.setAttribute("title", `Switch to ${nextTheme} theme`);
    }

    const themeColor = document.querySelector(
      'meta[name="theme-color"]'
    );

    if (themeColor) {
      themeColor.setAttribute(
        "content",
        selectedTheme === "dark" ? "#111110" : "#f7f5ef"
      );
    }
  }

  try {
    const savedTheme = localStorage.getItem("portfolio-theme");
    applyTheme(savedTheme === "light" ? "light" : "dark");
  } catch {
    applyTheme("dark");
  }

  themeToggle?.addEventListener("click", () => {
    const currentTheme = root.getAttribute("data-theme");
    const nextTheme = currentTheme === "dark" ? "light" : "dark";

    applyTheme(nextTheme);

    try {
      localStorage.setItem("portfolio-theme", nextTheme);
    } catch {
      // Theme switching still works without local storage.
    }
  });

  /* Mobile navigation */

  function closeMenu(restoreFocus = false) {
    if (!menuToggle || !navigation) return;

    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation menu");

    navigation.classList.remove("is-open");
    body.classList.remove("menu-open");

    if (restoreFocus) menuToggle.focus();
  }

  function openMenu() {
    if (!menuToggle || !navigation) return;

    menuToggle.setAttribute("aria-expanded", "true");
    menuToggle.setAttribute("aria-label", "Close navigation menu");

    navigation.classList.add("is-open");
    body.classList.add("menu-open");
  }

  menuToggle?.addEventListener("click", () => {
    const isOpen =
      menuToggle.getAttribute("aria-expanded") === "true";

    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => closeMenu());
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      menuToggle?.getAttribute("aria-expanded") === "true"
    ) {
      closeMenu(true);
    }
  });

  document.addEventListener("click", (event) => {
    if (
      !navigation ||
      !menuToggle ||
      menuToggle.getAttribute("aria-expanded") !== "true"
    ) {
      return;
    }

    const target = event.target;

    if (
      target instanceof Node &&
      !navigation.contains(target) &&
      !menuToggle.contains(target)
    ) {
      closeMenu();
    }
  });

  const mobileQuery = window.matchMedia("(max-width: 860px)");

  mobileQuery.addEventListener("change", (event) => {
    if (!event.matches) closeMenu();
  });

  /* Active navigation and scroll UI */

  let scrollPending = false;

  function updateScrollUI() {
    const header = document.getElementById("site-header");
    const headerHeight = header?.offsetHeight ?? 0;
    const activationPoint = headerHeight + 100;

    let activeSectionId = "home";

    for (const item of sections) {
      if (item.section.getBoundingClientRect().top <= activationPoint) {
        activeSectionId = item.section.id;
      }
    }

    const pageBottomReached =
      window.innerHeight + window.scrollY >=
      document.documentElement.scrollHeight - 5;

    if (pageBottomReached && sections.length > 0) {
      activeSectionId = sections[sections.length - 1].section.id;
    }

    navLinks.forEach((link) => {
      const active =
        link.getAttribute("href") === `#${activeSectionId}`;

      link.classList.toggle("active", active);

      if (active) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    backToTop?.classList.toggle(
      "is-visible",
      window.scrollY > 450
    );

    scrollPending = false;
  }

  function requestScrollUpdate() {
    if (scrollPending) return;

    scrollPending = true;
    window.requestAnimationFrame(updateScrollUI);
  }

  window.addEventListener("scroll", requestScrollUpdate, {
    passive: true,
  });

  window.addEventListener("resize", requestScrollUpdate);
  window.addEventListener("load", requestScrollUpdate);

  updateScrollUI();

  /* Hero image — interactive 3D tilt */

  const heroFrame = document.querySelector(".hero-image-frame");

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  const hasFinePointer = window.matchMedia(
    "(hover: hover) and (pointer: fine)"
  );

  if (
    heroFrame &&
    !prefersReducedMotion.matches &&
    hasFinePointer.matches
  ) {
    const maxRotateX = 5;
    const maxRotateY = 7;

    heroFrame.addEventListener("pointermove", (event) => {
      const rect = heroFrame.getBoundingClientRect();

      if (!rect.width || !rect.height) return;

      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;

      const rotateY = (x - 0.5) * 2 * maxRotateY;
      const rotateX = (0.5 - y) * 2 * maxRotateX;

      heroFrame.style.transform =
        `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    heroFrame.addEventListener("pointerleave", () => {
      heroFrame.style.transform = "rotateX(0deg) rotateY(0deg)";
    });

    prefersReducedMotion.addEventListener("change", (event) => {
      if (event.matches) {
        heroFrame.style.transform = "none";
      }
    });
  }

  /* Reveal animation */

  const revealTargets = document.querySelectorAll(
    [
      ".section-heading",
      ".about-grid",
      ".skill-card",
      ".project-card",
      ".experience-intro",
      ".experience-card",
      ".education-card",
      ".education-note",
      ".certification-card",
      ".contact-panel",
    ].join(",")
  );

  const reducedMotion = prefersReducedMotion.matches;

  let revealObserverInstance = null;
  let revealFallback = false;

  function applyEducationReveal() {
    document
      .querySelectorAll("#education-list .education-card")
      .forEach((element) => {
        if (element.classList.contains("js-reveal")) return;

        if (!revealObserverInstance || revealFallback) {
          element.classList.add("is-visible");
        } else {
          element.classList.add("js-reveal");
          revealObserverInstance.observe(element);
        }
      });
  }

  function applySkillsReveal() {
    document
      .querySelectorAll("#skills-grid .skill-card")
      .forEach((element) => {
        if (element.classList.contains("js-reveal")) return;

        if (!revealObserverInstance || revealFallback) {
          element.classList.add("is-visible");
        } else {
          element.classList.add("js-reveal");
          revealObserverInstance.observe(element);
        }
      });
  }

  function applyProjectReveal() {
    document
      .querySelectorAll("#projects-grid .project-card")
      .forEach((element) => {
        if (element.classList.contains("js-reveal")) return;

        if (!revealObserverInstance || revealFallback) {
          element.classList.add("is-visible");
        } else {
          element.classList.add("js-reveal");
          revealObserverInstance.observe(element);
        }
      });
  }

  if ("IntersectionObserver" in window && !reducedMotion) {
    revealObserverInstance = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.08,
        rootMargin: "0px 0px -20px 0px",
      }
    );

    revealTargets.forEach((element) => {
      element.classList.add("js-reveal");
      revealObserverInstance.observe(element);
    });
  } else {
    revealFallback = true;

    revealTargets.forEach((element) => {
      element.classList.add("is-visible");
    });
  }

  /* Back-to-top button */

  backToTop?.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  });

  /* Footer year */

  if (currentYear) {
    currentYear.textContent = String(new Date().getFullYear());
  }
});
