
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const root = document.documentElement;
  const body = document.body;

  const menuToggle = document.getElementById("menu-toggle");
  const navigation = document.getElementById("primary-navigation");
  const themeToggle = document.getElementById("theme-toggle");
  const themeIcon = themeToggle?.querySelector(".theme-icon");
  const backToTop = document.getElementById("back-to-top");
  const currentYear = document.getElementById("current-year");

  const reducedMotionQuery = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );
  const finePointerQuery = window.matchMedia(
    "(hover: hover) and (pointer: fine)"
  );

  const navLinks = Array.from(
    document.querySelectorAll(".primary-navigation .nav-link")
  );

  const sections = navLinks
    .map((link) => {
      const href = link.getAttribute("href");
      if (!href?.startsWith("#")) return null;

      const section = document.getElementById(href.slice(1));
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
      themeToggle.setAttribute("aria-label", `Switch to ${nextTheme} theme`);
      themeToggle.setAttribute("title", `Switch to ${nextTheme} theme`);
    }

    const themeColor = document.querySelector('meta[name="theme-color"]');
    themeColor?.setAttribute(
      "content",
      selectedTheme === "dark" ? "#111110" : "#f7f5ef"
    );
  }

  try {
    const savedTheme = localStorage.getItem("portfolio-theme");
    applyTheme(savedTheme === "light" ? "light" : "dark");
  } catch {
    applyTheme("dark");
  }

  themeToggle?.addEventListener("click", () => {
    const nextTheme =
      root.getAttribute("data-theme") === "dark" ? "light" : "dark";

    applyTheme(nextTheme);

    try {
      localStorage.setItem("portfolio-theme", nextTheme);
    } catch {
      // Theme switching still works if storage is unavailable.
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
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    isOpen ? closeMenu() : openMenu();
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

  /* Active navigation and back-to-top */
  let scrollPending = false;

  function updateScrollUI() {
    const header = document.getElementById("site-header");
    const activationPoint = (header?.offsetHeight ?? 0) + 100;
    let activeSectionId = "home";

    sections.forEach(({ section }) => {
      if (section.getBoundingClientRect().top <= activationPoint) {
        activeSectionId = section.id;
      }
    });

    const atBottom =
      window.innerHeight + window.scrollY >=
      document.documentElement.scrollHeight - 5;

    if (atBottom && sections.length) {
      activeSectionId = sections[sections.length - 1].section.id;
    }

    navLinks.forEach((link) => {
      const active = link.getAttribute("href") === `#${activeSectionId}`;
      link.classList.toggle("active", active);

      if (active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });

    backToTop?.classList.toggle("is-visible", window.scrollY > 450);
    scrollPending = false;
  }

  function requestScrollUpdate() {
    if (scrollPending) return;
    scrollPending = true;
    window.requestAnimationFrame(updateScrollUI);
  }

  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  window.addEventListener("resize", requestScrollUpdate);
  window.addEventListener("load", requestScrollUpdate);
  updateScrollUI();

  backToTop?.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: reducedMotionQuery.matches ? "auto" : "smooth",
    });
  });

  /* Hero image: desktop pointer-driven 3D tilt */
  const tiltFrames = Array.from(
    document.querySelectorAll(".hero-image-frame, .about-image-frame")
  );

  tiltFrames.forEach((frame) => {
    frame.style.setProperty("transform", "perspective(1000px)");

    if (reducedMotionQuery.matches || !finePointerQuery.matches) return;

    let frameRequest = 0;

    frame.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch") return;

      const rect = frame.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;

      cancelAnimationFrame(frameRequest);
      frameRequest = requestAnimationFrame(() => {
        const rotateX = -y * 10;
        const rotateY = x * 12;

        frame.style.transform =
          `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      });
    });

    frame.addEventListener("pointerleave", () => {
      cancelAnimationFrame(frameRequest);
      frame.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg)";
    });
  });

  /* Scroll reveal and staggered cards */
  const revealSelectors = [
    ".section-heading",
    ".about-grid",
    ".focus-item",
    ".skill-card",
    ".project-card",
    ".experience-intro",
    ".experience-card",
    ".education-card",
    ".education-note",
    ".certification-card",
    ".contact-panel",
    ".contact-actions",
  ];

  const revealTargets = Array.from(
    document.querySelectorAll(revealSelectors.join(","))
  );

  const staggerGroups = [
    ".skills-grid",
    ".projects-grid",
    ".certifications-grid",
  ];

  staggerGroups.forEach((selector) => {
    document.querySelectorAll(selector).forEach((group) => {
      Array.from(group.children).forEach((child, index) => {
        child.style.setProperty("--reveal-delay", `${Math.min(index, 7) * 90}ms`);
      });
    });
  });

  if ("IntersectionObserver" in window && !reducedMotionQuery.matches) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.08,
        rootMargin: "0px 0px -35px 0px",
      }
    );

    revealTargets.forEach((element) => {
      element.classList.add("js-reveal");
      revealObserver.observe(element);
    });
  } else {
    revealTargets.forEach((element) => {
      element.classList.add("is-visible");
    });
  }

  /* Re-enable safe states if reduced-motion preference changes */
  reducedMotionQuery.addEventListener("change", (event) => {
    if (!event.matches) return;

    tiltFrames.forEach((frame) => {
      frame.style.transform = "none";
    });

    revealTargets.forEach((element) => {
      element.classList.add("is-visible");
      element.classList.remove("js-reveal");
    });
  });

  /* Footer year */
  if (currentYear) {
    currentYear.textContent = String(new Date().getFullYear());
  }
});
