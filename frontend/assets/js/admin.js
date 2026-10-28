"use strict";

(() => {
  // Talk to the API on the same hostname the page was opened with, so the
  // session cookie stays first-party (a 127.0.0.1 page must call 127.0.0.1).
  const PAGE_HOST = window.location.hostname || "localhost";
  const API_BASE =
    window.PORTFOLIO_API_BASE ||
    `${window.location.protocol === "https:" ? "https" : "http"}://${PAGE_HOST}:4000/api`;
  const FILE_PROTOCOL_HINT =
    "This dashboard has to be served over HTTP. In a terminal, run " +
    "python3 -m http.server 5500 inside the frontend folder (or use Live Server), " +
    "then open http://localhost:5500/admin/login.html.";
  let csrfToken = "";
  let currentView = "overview";
  let projects = [];
  let editingProjectId = null;
  let experiences = [];
  let editingExperienceId = null;
  let educationRecords = [];
  let editingEducationId = null;
  let certifications = [];
  let editingCertificationId = null;
  let skillCategories = [];
  let profileLoaded = false;

  const $ = (selector) => document.querySelector(selector);

  const escapeHtml = (value = "") =>
    String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;",
      '"': "&quot;", "'": "&#39;"
    })[char]);

  async function api(path, options = {}) {
    const method = (options.method || "GET").toUpperCase();
    const headers = new Headers(options.headers || {});

    if (options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const mutating = !["GET", "HEAD", "OPTIONS"].includes(method);

    if (mutating) {
      if (!csrfToken) await refreshCsrfToken();
      headers.set("X-CSRF-Token", csrfToken);
    }

    const send = async () => {
      const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        method,
        headers,
        credentials: "include",
        cache: "no-store"
      });

      const data = await response.json().catch(() => ({}));
      return { response, data };
    };

    let { response, data } = await send();

    // A rejected token is recoverable: the session may have been rotated, or
    // replaced by another tab, so fetch a fresh token and repeat once.
    if (mutating && response.status === 403 && data.code === "EBADCSRFTOKEN") {
      csrfToken = "";
      await refreshCsrfToken();
      headers.set("X-CSRF-Token", csrfToken);
      ({ response, data } = await send());
    }

    if (!response.ok) {
      const error = new Error(
        data.details?.map((item) => item.message).join(" ") ||
        data.error || `Request failed (${response.status}).`
      );
      error.status = response.status;
      error.code = data.code;
      throw error;
    }

    return data;
  }

  async function refreshCsrfToken() {
    const data = await api("/auth/csrf-token");
    if (!data.csrfToken) throw new Error("Could not initialize secure session.");
    csrfToken = data.csrfToken;
  }

  function describeApiFailure(error) {
    if (error?.code === "EBADCSRFTOKEN") {
      return (
        "The browser did not keep the admin session cookie, so the security token was rejected. " +
        "Allow cookies for this site, close other dashboard tabs and reload the page."
      );
    }

    if (typeof error?.status === "number" && error.status >= 400) {
      return error.status === 401
        ? error.message
        : `The API responded with ${error.status}: ${error.message}`;
    }

    return (
      `Could not reach the API at ${API_BASE} from ${window.location.origin}. ` +
      "Start the backend with \"npm run dev\" in the backend folder, then reload this page."
    );
  }

  function notify(message, type = "error") {
    const element = $("#dashboard-message");
    if (!element) return;
    element.textContent = message;
    element.className = `notice ${type}`;
    element.hidden = false;
  }

  function field(label, name, value = "", type = "text", required = false) {
    return `
      <label class="editor-field">
        <span>${escapeHtml(label)}</span>
        <input name="${escapeHtml(name)}" type="${type}"
          value="${escapeHtml(value)}"
          ${required ? "required" : ""}
          ${type === "url" ? 'placeholder="https://..."' : ""}>
      </label>`;
  }

  function area(label, name, value = "", required = false) {
    return `
      <label class="editor-field editor-field-wide">
        <span>${escapeHtml(label)}</span>
        <textarea name="${escapeHtml(name)}" rows="4"
          ${required ? "required" : ""}>${escapeHtml(value)}</textarea>
      </label>`;
  }

  function selectField(label, name, value, options) {
    return `
      <label class="editor-field">
        <span>${escapeHtml(label)}</span>
        <select name="${escapeHtml(name)}">
          ${options.map((option) => `
            <option value="${escapeHtml(option)}"
              ${option === value ? "selected" : ""}>
              ${escapeHtml(option)}
            </option>`).join("")}
        </select>
      </label>`;
  }

  function checkboxField(label, name, checked) {
    return `
      <label class="editor-checkbox">
        <input name="${escapeHtml(name)}" type="checkbox"
          ${checked ? "checked" : ""}>
        <span>${escapeHtml(label)}</span>
      </label>`;
  }

  function showView(view) {
    currentView = view;

    $("#view-overview").hidden = view !== "overview";
    $("#view-placeholder").hidden = view === "overview";

    const headings = {
      overview: "Overview",
      profile: "Profile",
      projects: "Projects",
      experience: "Experience",
      education: "Education",
      certifications: "Certifications",
      skills: "Skills",
      messages: "Contact messages",
      settings: "Site settings",
      audit: "Audit log"
    };

    const heading = headings[view] || "Dashboard";
    $("#page-title").textContent = heading;

    document.querySelectorAll(".admin-nav-link[data-view]").forEach((link) => {
      link.classList.toggle("active", link.dataset.view === view);
    });

    $("#admin-sidebar")?.classList.remove("is-open");
    $("#sidebar-toggle")?.setAttribute("aria-expanded", "false");

    if (view === "profile") loadProfile();
if (view === "projects") loadProjects();
if (view === "experience") loadExperience();
if (view === "education") loadEducation();
if (view === "certifications") loadCertifications();
if (view === "skills") loadSkills();
if (view === "settings") loadAboutSettings();

if (!["overview", "profile", "projects", "experience", "education", "certifications", "skills", "settings"].includes(view)) {
      $("#view-placeholder").innerHTML = `
        <div class="panel empty-state">
          <p class="eyebrow">CONTENT MANAGEMENT</p>
          <h2>${escapeHtml(heading)}</h2>
          <p class="muted">This section will be implemented in a later phase.</p>
        </div>`;
    }
  }

  function renderEditor(content) {
    const container = $("#view-placeholder");
    container.hidden = false;
    $("#view-overview").hidden = true;
    container.innerHTML = content;
  }

  async function loadProfile() {
    renderEditor(`
      <section class="panel">
        <p class="eyebrow">PUBLIC PORTFOLIO</p>
        <h2>Professional profile</h2>
        <p class="muted">Loading profile…</p>
      </section>`);

    try {
      const result = await api("/admin/profile");
      profileLoaded = true;
      const profile = result.profile || {};

      renderEditor(`
        <section class="panel">
          <div class="panel-heading">
            <div>
              <p class="eyebrow">PUBLIC PORTFOLIO</p>
              <h2>Professional profile</h2>
              <p class="muted">Manage the details shown on your portfolio.</p>
            </div>
          </div>

          <form id="profile-form" class="editor-form">
            ${field("Full name", "fullName", profile.fullName || "Pawan Chaudhary", "text", true)}
            ${field("Professional headline", "headline", profile.headline)}
            ${field("Email", "email", profile.email, "email")}
            ${field("Phone", "phone", profile.phone)}
            ${field("Location", "location", profile.location)}
            ${field("Profile image URL", "profileImage", profile.profileImage, "url")}
            ${field("Profile image description (alt text)", "profileImageAlt", profile.profileImageAlt)}
            ${field("GitHub URL", "githubUrl", profile.githubUrl, "url")}
            ${field("LinkedIn URL", "linkedinUrl", profile.linkedinUrl, "url")}
            ${field("Website URL", "websiteUrl", profile.websiteUrl, "url")}
            ${area("Professional summary", "professionalSummary", profile.professionalSummary)}
            ${field("SEO title", "seoTitle", profile.seoTitle)}
            ${area("SEO description", "seoDescription", profile.seoDescription)}

            <div class="editor-actions editor-field-wide">
              <button class="button button-primary" type="submit">Save profile</button>
              <button class="button button-secondary" type="reset">Reset form</button>
            </div>
          </form>
        </section>`);

      $("#profile-form").addEventListener("submit", saveProfile);
    } catch (error) {
      notify(`Could not load profile: ${error.message}`);
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    button.textContent = "Saving…";

    const formData = new FormData(form);
    const value = (key) => String(formData.get(key) || "").trim();

    const payload = {
      fullName: value("fullName"),
      headline: value("headline") || null,
      email: value("email") || null,
      phone: value("phone") || null,
      location: value("location") || null,
      profileImage: value("profileImage") || null,
      profileImageAlt: value("profileImageAlt") || null,
      githubUrl: value("githubUrl") || null,
      linkedinUrl: value("linkedinUrl") || null,
      websiteUrl: value("websiteUrl") || null,
      professionalSummary: value("professionalSummary") || null,
      seoTitle: value("seoTitle") || null,
      seoDescription: value("seoDescription") || null
    };

    try {
      await api("/admin/profile", {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      notify("Profile saved successfully.", "success");
    } catch (error) {
      notify(`Profile was not saved: ${error.message}`);
    } finally {
      button.disabled = false;
      button.textContent = "Save profile";
    }
  }

  async function loadProjects() {
    renderEditor(`
      <section class="panel">
        <p class="eyebrow">PORTFOLIO CONTENT</p>
        <h2>Projects</h2>
        <p class="muted">Loading projects…</p>
      </section>`);

    try {
      const result = await api("/admin/projects?limit=100&offset=0");
      projects = result.projects || [];
      renderProjects();
    } catch (error) {
      notify(`Could not load projects: ${error.message}`);
    }
  }

  function renderProjects() {
    renderEditor(`
      <section class="panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">PORTFOLIO CONTENT</p>
            <h2>Projects</h2>
            <p class="muted">${projects.length} project(s) loaded</p>
          </div>
          <button class="button button-primary" id="new-project" type="button">
            Add project +
          </button>
        </div>

        <div class="project-toolbar">
          <label class="editor-field">
            <span>Search projects</span>
            <input id="project-search" type="search" placeholder="Title, summary or category">
          </label>
          <label class="editor-field">
            <span>Status</span>
            <select id="project-status">
              <option value="">All statuses</option>
              <option value="DRAFT">DRAFT</option>
              <option value="PUBLISHED">PUBLISHED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </label>
        </div>

        <div class="table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Project</th><th>Category</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody id="projects-body"></tbody>
          </table>
        </div>

        <div id="project-editor"></div>
      </section>`);

    $("#new-project").addEventListener("click", () => showProjectForm());
    $("#project-search").addEventListener("input", filterProjects);
    $("#project-status").addEventListener("change", filterProjects);
    filterProjects();
  }

  function filterProjects() {
    const search = $("#project-search").value.trim().toLowerCase();
    const status = $("#project-status").value;

    const filtered = projects.filter((project) => {
      const text = [project.title, project.summary, project.category]
        .join(" ").toLowerCase();
      return text.includes(search) && (!status || project.status === status);
    });

    $("#projects-body").innerHTML = filtered.length
      ? filtered.map((project) => `
        <tr>
          <td>
            <strong>${escapeHtml(project.title)}</strong>
            <small class="table-subtitle">${escapeHtml(project.slug)}</small>
          </td>
          <td>${escapeHtml(project.category)}</td>
          <td><span class="status-pill">${escapeHtml(project.status)}</span></td>
          <td>
            <div class="table-actions">
              <button class="button button-secondary" data-edit="${escapeHtml(project.id)}" type="button">Edit</button>
              <button class="button button-danger" data-delete="${escapeHtml(project.id)}" type="button">Delete</button>
            </div>
          </td>
        </tr>`).join("")
      : `<tr><td colspan="4" class="muted">No projects found.</td></tr>`;

    $("#projects-body").querySelectorAll("[data-edit]").forEach((button) => {
      button.addEventListener("click", () => {
        const project = projects.find((item) => item.id === button.dataset.edit);
        if (project) showProjectForm(project);
      });
    });

    $("#projects-body").querySelectorAll("[data-delete]").forEach((button) => {
      button.addEventListener("click", () => deleteProject(button.dataset.delete));
    });
  }

  function showProjectForm(project = {}) {
    editingProjectId = project.id || null;
    const editor = $("#project-editor");

    editor.innerHTML = `
      <div class="editor-divider"></div>
      <h3>${editingProjectId ? "Edit project" : "Create project"}</h3>
      <form id="project-form" class="editor-form">
        ${field("Title", "title", project.title, "text", true)}
        ${field("Slug", "slug", project.slug, "text", true)}
        ${field("Category", "category", project.category || "Web Development", "text", true)}
        ${field("Technologies (comma-separated)", "technologies", (project.technologies || []).join(", "))}
        ${field("Repository URL", "repositoryUrl", project.repositoryUrl, "url")}
        ${field("Live project URL", "liveUrl", project.liveUrl, "url")}
        ${field("Image URL", "imageUrl", project.imageUrl, "url")}
        ${field("Image alt text", "imageAlt", project.imageAlt)}
        ${area("Short summary", "summary", project.summary, true)}
        ${area("Full description", "description", project.description)}
        ${selectField("Publication status", "status", project.status || "DRAFT", ["DRAFT", "PUBLISHED", "ARCHIVED"])}
        ${field("Sort order", "sortOrder", String(project.sortOrder ?? 0), "number")}
        ${checkboxField("Featured project", "featured", Boolean(project.featured))}
        <div class="editor-actions editor-field-wide">
          <button class="button button-primary" type="submit">${editingProjectId ? "Save changes" : "Create project"}</button>
          <button class="button button-secondary" id="cancel-project" type="button">Cancel</button>
        </div>
      </form>`;

    const titleInput = editor.querySelector('[name="title"]');
    const slugInput = editor.querySelector('[name="slug"]');

    titleInput.addEventListener("input", () => {
      if (!editingProjectId && !slugInput.dataset.edited) {
        slugInput.value = titleInput.value.toLowerCase()
          .trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      }
    });

    slugInput.addEventListener("input", () => {
      slugInput.dataset.edited = "true";
    });

    $("#project-form").addEventListener("submit", saveProject);
    $("#cancel-project").addEventListener("click", () => {
      editingProjectId = null;
      editor.innerHTML = "";
    });

    editor.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function saveProject(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;

    const formData = new FormData(form);
    const value = (key) => String(formData.get(key) || "").trim();
    const status = value("status");

    const payload = {
      title: value("title"),
      slug: value("slug"),
      category: value("category"),
      summary: value("summary"),
      description: value("description") || null,
      technologies: value("technologies").split(",").map((item) => item.trim()).filter(Boolean),
      repositoryUrl: value("repositoryUrl") || null,
      liveUrl: value("liveUrl") || null,
      imageUrl: value("imageUrl") || null,
      imageAlt: value("imageAlt") || null,
      status,
      featured: form.elements.featured.checked,
      sortOrder: Number(value("sortOrder") || 0)
    };

    try {
      const isEditing = Boolean(editingProjectId);
      const path = isEditing
        ? `/admin/projects/${encodeURIComponent(editingProjectId)}`
        : "/admin/projects";

      await api(path, {
        method: isEditing ? "PUT" : "POST",
        body: JSON.stringify(payload)
      });

      editingProjectId = null;
      notify(isEditing ? "Project updated." : "Project created.", "success");
      await loadProjects();
    } catch (error) {
      notify(`Project was not saved: ${error.message}`);
      button.disabled = false;
    }
  }

  async function deleteProject(id) {
    const project = projects.find((item) => item.id === id);
    if (!project) return;

    if (!confirm(`Delete "${project.title}"? This action cannot be undone.`)) return;

    try {
      await api(`/admin/projects/${encodeURIComponent(id)}`, { method: "DELETE" });
      notify("Project deleted.", "success");
      await loadProjects();
    } catch (error) {
      notify(`Project was not deleted: ${error.message}`);
    }
  }


  // ---------------- WORK EXPERIENCE ----------------

  function experienceDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function experienceDateLabel(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat("en", {
      month: "short",
      year: "numeric",
      timeZone: "UTC"
    }).format(date);
  }

  async function loadExperience() {
    renderEditor(`
      <section class="panel">
        <p class="eyebrow">PORTFOLIO CONTENT</p>
        <h2>Work experience</h2>
        <p class="muted">Loading experience records…</p>
      </section>`);

    try {
      const result = await api("/admin/experience");
      experiences = result.experiences || [];
      renderExperience();
    } catch (error) {
      notify(`Could not load experience: ${error.message}`);
      renderEditor(`
        <section class="panel">
          <h2>Work experience</h2>
          <p class="muted">Could not load records. Check the API and try again.</p>
          <button class="button button-secondary" id="retry-experience" type="button">
            Retry
          </button>
        </section>`);
      $("#retry-experience").addEventListener("click", loadExperience);
    }
  }

  function renderExperience() {
    renderEditor(`
      <section class="panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">PORTFOLIO CONTENT</p>
            <h2>Work experience</h2>
            <p class="muted">${experiences.length} record(s) loaded</p>
          </div>
          <button class="button button-primary" id="new-experience" type="button">
            Add experience +
          </button>
        </div>

        <div class="project-toolbar">
          <label class="editor-field">
            <span>Search experience</span>
            <input id="experience-search" type="search"
              placeholder="Company, position or location">
          </label>
          <label class="editor-field">
            <span>Status</span>
            <select id="experience-status">
              <option value="">All statuses</option>
              <option value="DRAFT">DRAFT</option>
              <option value="PUBLISHED">PUBLISHED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </label>
        </div>

        <div class="table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Position</th>
                <th>Company</th>
                <th>Period</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="experience-body"></tbody>
          </table>
        </div>

        <div id="experience-editor"></div>
      </section>`);

    $("#new-experience").addEventListener("click", () => showExperienceForm());
    $("#experience-search").addEventListener("input", filterExperience);
    $("#experience-status").addEventListener("change", filterExperience);
    filterExperience();
  }

  function filterExperience() {
    const search = $("#experience-search").value.trim().toLowerCase();
    const status = $("#experience-status").value;

    const filtered = experiences.filter((item) => {
      const text = [
        item.company,
        item.position,
        item.location
      ].join(" ").toLowerCase();

      return text.includes(search) && (!status || item.status === status);
    });

    $("#experience-body").innerHTML = filtered.length
      ? filtered.map((item) => {
          const period = `${experienceDateLabel(item.startDate)} – ${
            item.isCurrent
              ? "Present"
              : experienceDateLabel(item.endDate) || "End date not set"
          }`;

          return `
            <tr>
              <td><strong>${escapeHtml(item.position)}</strong></td>
              <td>
                ${escapeHtml(item.company)}
                <small class="table-subtitle">${escapeHtml(item.location || "")}</small>
              </td>
              <td>${escapeHtml(period)}</td>
              <td><span class="status-pill">${escapeHtml(item.status)}</span></td>
              <td>
                <div class="table-actions">
                  <button class="button button-secondary"
                    data-experience-edit="${escapeHtml(item.id)}" type="button">
                    Edit
                  </button>
                  <button class="button button-danger"
                    data-experience-delete="${escapeHtml(item.id)}" type="button">
                    Delete
                  </button>
                </div>
              </td>
            </tr>`;
        }).join("")
      : `<tr><td colspan="5" class="muted">No experience records found.</td></tr>`;

    $("#experience-body").querySelectorAll("[data-experience-edit]").forEach((button) => {
      button.addEventListener("click", () => {
        const item = experiences.find((entry) => entry.id === button.dataset.experienceEdit);
        if (item) showExperienceForm(item);
      });
    });

    $("#experience-body").querySelectorAll("[data-experience-delete]").forEach((button) => {
      button.addEventListener("click", () => deleteExperience(button.dataset.experienceDelete));
    });
  }

  function showExperienceForm(item = {}) {
    editingExperienceId = item.id || null;
    const editor = $("#experience-editor");

    editor.innerHTML = `
      <div class="editor-divider"></div>
      <h3>${editingExperienceId ? "Edit experience" : "Add experience"}</h3>

      <form id="experience-form" class="editor-form">
        ${field("Job title / position", "position", item.position, "text", true)}
        ${field("Company / organisation", "company", item.company, "text", true)}
        ${field("Location", "location", item.location)}
        ${field("Start date", "startDate", experienceDate(item.startDate), "month", true)}
        ${field("End date", "endDate", experienceDate(item.endDate), "month")}
        ${checkboxField("I currently work here", "isCurrent", Boolean(item.isCurrent))}
        ${area("Description", "description", item.description || "")}
        ${selectField(
          "Publication status",
          "status",
          item.status || "DRAFT",
          ["DRAFT", "PUBLISHED", "ARCHIVED"]
        )}
        ${field("Sort order (lower numbers appear first)", "sortOrder",
          String(item.sortOrder ?? 0), "number")}

        <div class="editor-actions editor-field-wide">
          <button class="button button-primary" type="submit">
            ${editingExperienceId ? "Save changes" : "Create experience"}
          </button>
          <button class="button button-secondary" id="cancel-experience" type="button">
            Cancel
          </button>
        </div>
      </form>`;

    const form = $("#experience-form");
    const endDateInput = form.elements.endDate;
    const currentCheckbox = form.elements.isCurrent;

    function syncEndDate() {
      endDateInput.disabled = currentCheckbox.checked;
      endDateInput.required = !currentCheckbox.checked && Boolean(endDateInput.value);
      if (currentCheckbox.checked) endDateInput.value = "";
    }

    currentCheckbox.addEventListener("change", syncEndDate);
    syncEndDate();

    form.addEventListener("submit", saveExperience);

    $("#cancel-experience").addEventListener("click", () => {
      editingExperienceId = null;
      editor.innerHTML = "";
    });

    editor.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function saveExperience(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    button.textContent = "Saving…";

    const formData = new FormData(form);
    const value = (key) => String(formData.get(key) || "").trim();
    const isCurrent = form.elements.isCurrent.checked;
    const startValue = value("startDate");
    const endValue = value("endDate");

    if (!startValue) {
      notify("Please enter a start date.");
      button.disabled = false;
      button.textContent = editingExperienceId ? "Save changes" : "Create experience";
      return;
    }

    if (!isCurrent && endValue && endValue < startValue) {
      notify("End date must not be earlier than start date.");
      button.disabled = false;
      button.textContent = editingExperienceId ? "Save changes" : "Create experience";
      return;
    }

    const payload = {
      position: value("position"),
      company: value("company"),
      location: value("location") || null,
      description: value("description") || null,
      startDate: new Date(`${startValue}-01T00:00:00.000Z`).toISOString(),
      endDate: !isCurrent && endValue
        ? new Date(`${endValue}-01T00:00:00.000Z`).toISOString()
        : null,
      isCurrent,
      status: value("status"),
      sortOrder: Number(value("sortOrder") || 0)
    };

    try {
      const isEditing = Boolean(editingExperienceId);
      const path = isEditing
        ? `/admin/experience/${encodeURIComponent(editingExperienceId)}`
        : "/admin/experience";

      await api(path, {
        method: isEditing ? "PUT" : "POST",
        body: JSON.stringify(payload)
      });

      editingExperienceId = null;
      notify(isEditing ? "Experience updated." : "Experience created.", "success");
      await loadExperience();
    } catch (error) {
      notify(`Experience was not saved: ${error.message}`);
      button.disabled = false;
      button.textContent = editingExperienceId ? "Save changes" : "Create experience";
    }
  }

  async function deleteExperience(id) {
    const item = experiences.find((entry) => entry.id === id);
    if (!item) return;

    if (!confirm(
      `Delete "${item.position}" at "${item.company}"? This action cannot be undone.`
    )) return;

    try {
      await api(`/admin/experience/${encodeURIComponent(id)}`, {
        method: "DELETE"
      });

      notify("Experience deleted.", "success");
      await loadExperience();
    } catch (error) {
      notify(`Experience was not deleted: ${error.message}`);
    }
  }


  // ---------------- EDUCATION ----------------

  async function loadEducation() {
    renderEditor(`
      <section class="panel">
        <p class="eyebrow">PORTFOLIO CONTENT</p>
        <h2>Education</h2>
        <p class="muted">Loading education records…</p>
      </section>`);

    try {
      const result = await api("/admin/education");
      educationRecords = result.educationRecords || [];
      renderEducation();
    } catch (error) {
      notify(`Could not load education: ${error.message}`);
      renderEditor(`
        <section class="panel">
          <h2>Education</h2>
          <p class="muted">Could not load records. Check the API and try again.</p>
          <button class="button button-secondary" id="retry-education" type="button">
            Retry
          </button>
        </section>`);
      $("#retry-education").addEventListener("click", loadEducation);
    }
  }

  function renderEducation() {
    renderEditor(`
      <section class="panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">PORTFOLIO CONTENT</p>
            <h2>Education</h2>
            <p class="muted">${educationRecords.length} record(s) loaded</p>
          </div>
          <button class="button button-primary" id="new-education" type="button">
            Add education +
          </button>
        </div>

        <div class="project-toolbar">
          <label class="editor-field">
            <span>Search education</span>
            <input id="education-search" type="search"
              placeholder="Institution, qualification or field of study">
          </label>
          <label class="editor-field">
            <span>Status</span>
            <select id="education-status-filter">
              <option value="">All statuses</option>
              <option value="DRAFT">DRAFT</option>
              <option value="PUBLISHED">PUBLISHED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </label>
        </div>

        <div class="table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Qualification</th>
                <th>Institution</th>
                <th>Period</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="education-body"></tbody>
          </table>
        </div>

        <div id="education-editor"></div>
      </section>`);

    $("#new-education").addEventListener("click", () => showEducationForm());
    $("#education-search").addEventListener("input", filterEducation);
    $("#education-status-filter").addEventListener("change", filterEducation);
    filterEducation();
  }

  function filterEducation() {
    const search = $("#education-search").value.trim().toLowerCase();
    const status = $("#education-status-filter").value;

    const filtered = educationRecords.filter((item) => {
      const text = [
        item.institution,
        item.qualification,
        item.fieldOfStudy
      ].join(" ").toLowerCase();

      return text.includes(search) && (!status || item.status === status);
    });

    $("#education-body").innerHTML = filtered.length
      ? filtered.map((item) => {
          const period = [
            experienceDateLabel(item.startDate) || "Start date not set",
            experienceDateLabel(item.endDate) || "End date not set"
          ].join(" – ");

          return `
            <tr>
              <td>
                <strong>${escapeHtml(item.qualification)}</strong>
                <small class="table-subtitle">${escapeHtml(item.fieldOfStudy || "")}</small>
              </td>
              <td>${escapeHtml(item.institution)}</td>
              <td>${escapeHtml(period)}</td>
              <td><span class="status-pill">${escapeHtml(item.status)}</span></td>
              <td>
                <div class="table-actions">
                  <button class="button button-secondary"
                    data-education-edit="${escapeHtml(item.id)}" type="button">
                    Edit
                  </button>
                  <button class="button button-danger"
                    data-education-delete="${escapeHtml(item.id)}" type="button">
                    Delete
                  </button>
                </div>
              </td>
            </tr>`;
        }).join("")
      : `<tr><td colspan="5" class="muted">No education records found.</td></tr>`;

    $("#education-body").querySelectorAll("[data-education-edit]").forEach((button) => {
      button.addEventListener("click", () => {
        const item = educationRecords.find((entry) => entry.id === button.dataset.educationEdit);
        if (item) showEducationForm(item);
      });
    });

    $("#education-body").querySelectorAll("[data-education-delete]").forEach((button) => {
      button.addEventListener("click", () => deleteEducation(button.dataset.educationDelete));
    });
  }

  function showEducationForm(item = {}) {
    editingEducationId = item.id || null;
    const editor = $("#education-editor");

    editor.innerHTML = `
      <div class="editor-divider"></div>
      <h3>${editingEducationId ? "Edit education" : "Add education"}</h3>

      <form id="education-form" class="editor-form">
        ${field("Institution", "institution", item.institution, "text", true)}
        ${field("Qualification", "qualification", item.qualification, "text", true)}
        ${field("Field of study", "fieldOfStudy", item.fieldOfStudy)}
        ${field("Degree level (badge, e.g. UNDERGRADUATE DEGREE)", "level", item.level)}
        ${field("Degree awarded (e.g. Bachelor of Science (Honours))", "degreeAward", item.degreeAward)}
        ${field("Result / classification", "result", item.result)}
        ${field("Start date", "startDate", experienceDate(item.startDate), "month")}
        ${field("End date", "endDate", experienceDate(item.endDate), "month")}
        ${area("Description", "description", item.description || "")}
        ${selectField(
          "Publication status",
          "status",
          item.status || "DRAFT",
          ["DRAFT", "PUBLISHED", "ARCHIVED"]
        )}
        ${field("Sort order (lower numbers appear first)", "sortOrder",
          String(item.sortOrder ?? 0), "number")}

        <div class="editor-actions editor-field-wide">
          <button class="button button-primary" type="submit">
            ${editingEducationId ? "Save changes" : "Create education"}
          </button>
          <button class="button button-secondary" id="cancel-education" type="button">
            Cancel
          </button>
        </div>
      </form>`;

    $("#education-form").addEventListener("submit", saveEducation);

    $("#cancel-education").addEventListener("click", () => {
      editingEducationId = null;
      editor.innerHTML = "";
    });

    editor.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function saveEducation(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    button.textContent = "Saving…";

    const formData = new FormData(form);
    const value = (key) => String(formData.get(key) || "").trim();
    const startValue = value("startDate");
    const endValue = value("endDate");

    if (startValue && endValue && endValue < startValue) {
      notify("End date must not be earlier than start date.");
      button.disabled = false;
      button.textContent = editingEducationId ? "Save changes" : "Create education";
      return;
    }

    const payload = {
      institution: value("institution"),
      qualification: value("qualification"),
      fieldOfStudy: value("fieldOfStudy") || null,
      level: value("level") || null,
      degreeAward: value("degreeAward") || null,
      result: value("result") || null,
      description: value("description") || null,
      startDate: startValue
        ? new Date(`${startValue}-01T00:00:00.000Z`).toISOString()
        : null,
      endDate: endValue
        ? new Date(`${endValue}-01T00:00:00.000Z`).toISOString()
        : null,
      status: value("status"),
      sortOrder: Number(value("sortOrder") || 0)
    };

    try {
      const isEditing = Boolean(editingEducationId);
      const path = isEditing
        ? `/admin/education/${encodeURIComponent(editingEducationId)}`
        : "/admin/education";

      await api(path, {
        method: isEditing ? "PUT" : "POST",
        body: JSON.stringify(payload)
      });

      editingEducationId = null;
      notify(isEditing ? "Education updated." : "Education created.", "success");
      await loadEducation();
    } catch (error) {
      notify(`Education was not saved: ${error.message}`);
      button.disabled = false;
      button.textContent = editingEducationId ? "Save changes" : "Create education";
    }
  }

  async function deleteEducation(id) {
    const item = educationRecords.find((entry) => entry.id === id);
    if (!item) return;

    if (!confirm(
      `Delete "${item.qualification}" at "${item.institution}"? This action cannot be undone.`
    )) return;

    try {
      await api(`/admin/education/${encodeURIComponent(id)}`, {
        method: "DELETE"
      });

      notify("Education deleted.", "success");
      await loadEducation();
    } catch (error) {
      notify(`Education was not deleted: ${error.message}`);
    }
  }


  // ---------------- CERTIFICATIONS ----------------

  function certificationDateLabel(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat("en", {
      year: "numeric",
      month: "short",
      timeZone: "UTC"
    }).format(date);
  }

  async function loadCertifications() {
    renderEditor(`
      <section class="panel">
        <p class="eyebrow">PORTFOLIO CONTENT</p>
        <h2>Certifications</h2>
        <p class="muted">Loading certifications…</p>
      </section>`);

    try {
      const result = await api("/admin/certifications");
      certifications = result.certifications || [];
      renderCertifications();
    } catch (error) {
      notify(`Could not load certifications: ${error.message}`);
      renderEditor(`
        <section class="panel">
          <h2>Certifications</h2>
          <p class="muted">Could not load records. Check the API and try again.</p>
          <button class="button button-secondary" id="retry-certifications" type="button">
            Retry
          </button>
        </section>`);
      $("#retry-certifications").addEventListener("click", loadCertifications);
    }
  }

  function renderCertifications() {
    renderEditor(`
      <section class="panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">PORTFOLIO CONTENT</p>
            <h2>Certifications</h2>
            <p class="muted">${certifications.length} record(s) loaded</p>
          </div>
          <button class="button button-primary" id="new-certification" type="button">
            Add certification +
          </button>
        </div>

        <div class="project-toolbar">
          <label class="editor-field">
            <span>Search certifications</span>
            <input id="certification-search" type="search"
              placeholder="Name, issuer or credential ID">
          </label>
          <label class="editor-field">
            <span>Status</span>
            <select id="certification-status-filter">
              <option value="">All statuses</option>
              <option value="DRAFT">DRAFT</option>
              <option value="PUBLISHED">PUBLISHED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </label>
        </div>

        <div class="table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Issuer</th>
                <th>Validity</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="certifications-body"></tbody>
          </table>
        </div>

        <div id="certification-editor"></div>
      </section>`);

    $("#new-certification").addEventListener("click", () => showCertificationForm());
    $("#certification-search").addEventListener("input", filterCertifications);
    $("#certification-status-filter").addEventListener("change", filterCertifications);
    filterCertifications();
  }

  function filterCertifications() {
    const search = $("#certification-search").value.trim().toLowerCase();
    const status = $("#certification-status-filter").value;

    const filtered = certifications.filter((item) => {
      const text = [
        item.name,
        item.issuer,
        item.credentialId
      ].join(" ").toLowerCase();

      return text.includes(search) && (!status || item.status === status);
    });

    $("#certifications-body").innerHTML = filtered.length
      ? filtered.map((item) => {
          const validity = [
            certificationDateLabel(item.issuedAt) || "Issue date not set",
            certificationDateLabel(item.expiresAt) || "No expiry"
          ].join(" – ");

          return `
            <tr>
              <td>
                <strong>${escapeHtml(item.name)}</strong>
                <small class="table-subtitle">${escapeHtml(item.credentialId || "")}</small>
              </td>
              <td>${escapeHtml(item.issuer)}</td>
              <td>${escapeHtml(validity)}</td>
              <td><span class="status-pill">${escapeHtml(item.status)}</span></td>
              <td>
                <div class="table-actions">
                  <button class="button button-secondary"
                    data-certification-edit="${escapeHtml(item.id)}" type="button">
                    Edit
                  </button>
                  <button class="button button-danger"
                    data-certification-delete="${escapeHtml(item.id)}" type="button">
                    Delete
                  </button>
                </div>
              </td>
            </tr>`;
        }).join("")
      : `<tr><td colspan="5" class="muted">No certification records found.</td></tr>`;

    $("#certifications-body").querySelectorAll("[data-certification-edit]").forEach((button) => {
      button.addEventListener("click", () => {
        const item = certifications.find(
          (entry) => entry.id === button.dataset.certificationEdit
        );
        if (item) showCertificationForm(item);
      });
    });

    $("#certifications-body").querySelectorAll("[data-certification-delete]").forEach((button) => {
      button.addEventListener("click", () => deleteCertification(button.dataset.certificationDelete));
    });
  }

  function showCertificationForm(item = {}) {
    editingCertificationId = item.id || null;
    const editor = $("#certification-editor");

    editor.innerHTML = `
      <div class="editor-divider"></div>
      <h3>${editingCertificationId ? "Edit certification" : "Add certification"}</h3>

      <form id="certification-form" class="editor-form">
        ${field("Certification name", "name", item.name, "text", true)}
        ${field("Issuing organisation", "issuer", item.issuer, "text", true)}
        ${field("Credential ID", "credentialId", item.credentialId)}
        ${field("Credential URL", "credentialUrl", item.credentialUrl, "url")}
        ${field("Issue date", "issuedAt", item.issuedAt ? new Date(item.issuedAt).toISOString().slice(0, 10) : "", "date")}
        ${field("Expiry date (leave blank if it does not expire)", "expiresAt",
          item.expiresAt ? new Date(item.expiresAt).toISOString().slice(0, 10) : "", "date")}
        ${area("Description", "description", item.description || "")}
        ${selectField(
          "Publication status",
          "status",
          item.status || "DRAFT",
          ["DRAFT", "PUBLISHED", "ARCHIVED"]
        )}
        ${field("Sort order (lower numbers appear first)", "sortOrder",
          String(item.sortOrder ?? 0), "number")}

        <div class="editor-actions editor-field-wide">
          <button class="button button-primary" type="submit">
            ${editingCertificationId ? "Save changes" : "Create certification"}
          </button>
          <button class="button button-secondary" id="cancel-certification" type="button">
            Cancel
          </button>
        </div>
      </form>`;

    $("#certification-form").addEventListener("submit", saveCertification);

    $("#cancel-certification").addEventListener("click", () => {
      editingCertificationId = null;
      editor.innerHTML = "";
    });

    editor.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function saveCertification(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    button.textContent = "Saving…";

    const formData = new FormData(form);
    const value = (key) => String(formData.get(key) || "").trim();
    const issuedValue = value("issuedAt");
    const expiresValue = value("expiresAt");

    if (issuedValue && expiresValue && expiresValue < issuedValue) {
      notify("Expiry date must not be earlier than the issue date.");
      button.disabled = false;
      button.textContent = editingCertificationId ? "Save changes" : "Create certification";
      return;
    }

    const payload = {
      name: value("name"),
      issuer: value("issuer"),
      credentialId: value("credentialId") || null,
      credentialUrl: value("credentialUrl") || null,
      description: value("description") || null,
      issuedAt: issuedValue
        ? new Date(`${issuedValue}T00:00:00.000Z`).toISOString()
        : null,
      expiresAt: expiresValue
        ? new Date(`${expiresValue}T00:00:00.000Z`).toISOString()
        : null,
      status: value("status"),
      sortOrder: Number(value("sortOrder") || 0)
    };

    try {
      const isEditing = Boolean(editingCertificationId);
      const path = isEditing
        ? `/admin/certifications/${encodeURIComponent(editingCertificationId)}`
        : "/admin/certifications";

      await api(path, {
        method: isEditing ? "PUT" : "POST",
        body: JSON.stringify(payload)
      });

      editingCertificationId = null;
      notify(isEditing ? "Certification updated." : "Certification created.", "success");
      await loadCertifications();
    } catch (error) {
      notify(`Certification was not saved: ${error.message}`);
      button.disabled = false;
      button.textContent = editingCertificationId ? "Save changes" : "Create certification";
    }
  }

  async function deleteCertification(id) {
    const item = certifications.find((entry) => entry.id === id);
    if (!item) return;

    if (!confirm(
      `Delete "${item.name}" (${item.issuer})? This action cannot be undone.`
    )) return;

    try {
      await api(`/admin/certifications/${encodeURIComponent(id)}`, {
        method: "DELETE"
      });

      notify("Certification deleted.", "success");
      await loadCertifications();
    } catch (error) {
      notify(`Certification was not deleted: ${error.message}`);
    }
  }

  // ---------------- SKILLS ----------------

  async function loadSkills() {
    renderEditor(`
      <section class="panel">
        <p class="eyebrow">PORTFOLIO CONTENT</p>
        <h2>Skills</h2>
        <p class="muted">Loading skill categories…</p>
      </section>`);

    try {
      const result = await api("/admin/skill-categories");
      skillCategories = result.skillCategories || [];
      renderSkills();
    } catch (error) {
      notify(`Could not load skills: ${error.message}`);
      renderEditor(`
        <section class="panel">
          <h2>Skills</h2>
          <p class="muted">Could not load records. Check the API and try again.</p>
          <button class="button button-secondary" id="retry-skills" type="button">
            Retry
          </button>
        </section>`);
      $("#retry-skills").addEventListener("click", loadSkills);
    }
  }

  function renderSkills() {
    renderEditor(`
      <section class="panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">PORTFOLIO CONTENT</p>
            <h2>Skills</h2>
            <p class="muted">${skillCategories.length} category(ies) loaded</p>
          </div>
          <button class="button button-primary" id="new-skill-category" type="button">
            Add category +
          </button>
        </div>

        <div id="skill-category-form-slot"></div>
        <div id="skill-categories-body"></div>
      </section>`);

    $("#new-skill-category").addEventListener("click", () => showCategoryForm());
    renderSkillCategories();
  }

  function renderSkillCategories() {
    const body = $("#skill-categories-body");

    body.innerHTML = skillCategories.length
      ? skillCategories.map((category) => {
          const skills = Array.isArray(category.skills) ? category.skills : [];

          const skillRows = skills.length
            ? skills.map((skill) => `
              <tr>
                <td>
                  <strong>${escapeHtml(skill.name)}</strong>
                  ${skill.proficiency !== null && skill.proficiency !== undefined
                    ? `<small class="table-subtitle">Proficiency ${escapeHtml(String(skill.proficiency))}/100</small>`
                    : ""}
                </td>
                <td>${skill.isVisible ? "Visible" : "Hidden"}</td>
                <td>
                  <div class="table-actions">
                    <button class="button button-secondary" data-skill-edit="${escapeHtml(skill.id)}" type="button">Edit</button>
                    <button class="button button-danger" data-skill-delete="${escapeHtml(skill.id)}" type="button">Delete</button>
                  </div>
                </td>
              </tr>`).join("")
            : `<tr><td colspan="3" class="muted">No skills in this category yet.</td></tr>`;

          return `
            <div class="panel skill-category-block" data-category-id="${escapeHtml(category.id)}">
              <div class="panel-heading">
                <div>
                  <p class="eyebrow">SORT ORDER ${escapeHtml(String(category.sortOrder ?? 0))}</p>
                  <h3>${escapeHtml(category.name)}</h3>
                  ${category.description
                    ? `<p class="muted">${escapeHtml(category.description)}</p>`
                    : `<p class="muted">No description set.</p>`}
                </div>
                <div class="table-actions">
                  <button class="button button-secondary" data-category-edit="${escapeHtml(category.id)}" type="button">Edit category</button>
                  <button class="button button-danger" data-category-delete="${escapeHtml(category.id)}" type="button">Delete</button>
                  <button class="button button-primary" data-skill-new="${escapeHtml(category.id)}" type="button">Add skill +</button>
                </div>
              </div>

              <div class="table-wrap">
                <table class="admin-table">
                  <thead>
                    <tr><th>Skill</th><th>Visibility</th><th>Actions</th></tr>
                  </thead>
                  <tbody>${skillRows}</tbody>
                </table>
              </div>

              <div class="skill-editor-slot" id="skill-editor-${escapeHtml(category.id)}"></div>
            </div>`;
        }).join("")
      : `<p class="muted">No skill categories yet. Add your first category above.</p>`;

    body.querySelectorAll("[data-category-edit]").forEach((button) => {
      button.addEventListener("click", () => {
        const category = skillCategories.find(
          (entry) => entry.id === button.dataset.categoryEdit
        );
        if (category) showCategoryForm(category);
      });
    });

    body.querySelectorAll("[data-category-delete]").forEach((button) => {
      button.addEventListener("click", () => deleteSkillCategory(button.dataset.categoryDelete));
    });

    body.querySelectorAll("[data-skill-new]").forEach((button) => {
      button.addEventListener("click", () => {
        const category = skillCategories.find(
          (entry) => entry.id === button.dataset.skillNew
        );
        if (category) showSkillForm(category, {});
      });
    });

    body.querySelectorAll("[data-skill-edit]").forEach((button) => {
      button.addEventListener("click", () => {
        const skillId = button.dataset.skillEdit;
        for (const category of skillCategories) {
          const skill = (category.skills || []).find((entry) => entry.id === skillId);
          if (skill) {
            showSkillForm(category, skill);
            return;
          }
        }
      });
    });

    body.querySelectorAll("[data-skill-delete]").forEach((button) => {
      button.addEventListener("click", () => deleteSkill(button.dataset.skillDelete));
    });
  }

  function showCategoryForm(category = {}) {
    const isEditing = Boolean(category.id);
    const slot = $("#skill-category-form-slot");

    slot.innerHTML = `
      <div class="editor-divider"></div>
      <h3>${isEditing ? `Edit category "${escapeHtml(category.name)}"` : "Add skill category"}</h3>
      <form id="skill-category-form" class="editor-form" data-category-id="${escapeHtml(category.id || "")}">
        ${field("Category name", "name", category.name, "text", true)}
        ${area("Description shown on the homepage card", "description", category.description || "")}
        ${field("Sort order (lower numbers appear first)", "sortOrder",
          String(category.sortOrder ?? 0), "number")}
        <div class="editor-actions editor-field-wide">
          <button class="button button-primary" type="submit">
            ${isEditing ? "Save changes" : "Create category"}
          </button>
          <button class="button button-secondary" id="cancel-skill-category" type="button">Cancel</button>
        </div>
      </form>`;

    $("#skill-category-form").addEventListener("submit", saveSkillCategory);
    $("#cancel-skill-category").addEventListener("click", () => {
      slot.innerHTML = "";
    });

    slot.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function saveSkillCategory(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    button.textContent = "Saving…";

    const formData = new FormData(form);
    const value = (key) => String(formData.get(key) || "").trim();
    const isEditing = Boolean(form.dataset.categoryId);

    const payload = {
      name: value("name"),
      description: value("description") || null,
      sortOrder: Number(value("sortOrder") || 0)
    };

    try {
      const path = isEditing
        ? `/admin/skill-categories/${encodeURIComponent(form.dataset.categoryId)}`
        : "/admin/skill-categories";

      await api(path, {
        method: isEditing ? "PUT" : "POST",
        body: JSON.stringify(payload)
      });

      notify(isEditing ? "Category updated." : "Category created.", "success");
      await loadSkills();
    } catch (error) {
      notify(`Category was not saved: ${error.message}`);
      button.disabled = false;
      button.textContent = isEditing ? "Save changes" : "Create category";
    }
  }

  function showSkillForm(category, skill = {}) {
    const isEditing = Boolean(skill.id);
    const slot = $(`#skill-editor-${CSS.escape(category.id)}`);
    if (!slot) return;

    slot.innerHTML = `
      <div class="editor-divider"></div>
      <h3>${isEditing ? `Edit skill in "${escapeHtml(category.name)}"` : `Add skill to "${escapeHtml(category.name)}"`}</h3>
      <form id="skill-form" class="editor-form" data-category-id="${escapeHtml(category.id)}" data-skill-id="${escapeHtml(skill.id || "")}">
        ${field("Skill name", "name", skill.name, "text", true)}
        ${field("Proficiency (0–100, optional)", "proficiency",
          skill.proficiency === null || skill.proficiency === undefined ? "" : String(skill.proficiency), "number")}
        ${field("Sort order (lower numbers appear first)", "sortOrder",
          String(skill.sortOrder ?? 0), "number")}
        ${checkboxField("Show on homepage", "isVisible", skill.isVisible !== false)}
        <div class="editor-actions editor-field-wide">
          <button class="button button-primary" type="submit">
            ${isEditing ? "Save changes" : "Create skill"}
          </button>
          <button class="button button-secondary" id="cancel-skill" type="button">Cancel</button>
        </div>
      </form>`;

    $("#skill-form").addEventListener("submit", saveSkill);
    $("#cancel-skill").addEventListener("click", () => {
      slot.innerHTML = "";
    });

    slot.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function saveSkill(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    button.textContent = "Saving…";

    const formData = new FormData(form);
    const value = (key) => String(formData.get(key) || "").trim();
    const categoryId = form.dataset.categoryId;
    const skillId = form.dataset.skillId;
    const isEditing = Boolean(skillId);

    const proficiencyRaw = value("proficiency");
    if (proficiencyRaw) {
      const proficiency = Number(proficiencyRaw);
      if (!Number.isInteger(proficiency) || proficiency < 0 || proficiency > 100) {
        notify("Proficiency must be an integer from 0 to 100.");
        button.disabled = false;
        button.textContent = isEditing ? "Save changes" : "Create skill";
        return;
      }
    }

    const payload = {
      categoryId,
      name: value("name"),
      proficiency: proficiencyRaw ? Number(proficiencyRaw) : null,
      sortOrder: Number(value("sortOrder") || 0),
      isVisible: form.elements.isVisible.checked
    };

    try {
      const path = isEditing
        ? `/admin/skills/${encodeURIComponent(skillId)}`
        : "/admin/skills";

      await api(path, {
        method: isEditing ? "PUT" : "POST",
        body: JSON.stringify(payload)
      });

      notify(isEditing ? "Skill updated." : "Skill created.", "success");
      await loadSkills();
    } catch (error) {
      notify(`Skill was not saved: ${error.message}`);
      button.disabled = false;
      button.textContent = isEditing ? "Save changes" : "Create skill";
    }
  }

  async function deleteSkillCategory(id) {
    const category = skillCategories.find((entry) => entry.id === id);
    if (!category) return;

    const skillCount = (category.skills || []).length;

    if (!confirm(
      `Delete category "${category.name}" and its ${skillCount} skill(s)? This action cannot be undone.`
    )) return;

    try {
      await api(`/admin/skill-categories/${encodeURIComponent(id)}`, {
        method: "DELETE"
      });

      notify("Category deleted.", "success");
      await loadSkills();
    } catch (error) {
      notify(`Category was not deleted: ${error.message}`);
    }
  }

  async function deleteSkill(id) {
    let skillName = "this skill";

    for (const category of skillCategories) {
      const skill = (category.skills || []).find((entry) => entry.id === id);
      if (skill) {
        skillName = skill.name;
        break;
      }
    }

    if (!confirm(
      `Delete skill "${skillName}"? This action cannot be undone.`
    )) return;

    try {
      await api(`/admin/skills/${encodeURIComponent(id)}`, {
        method: "DELETE"
      });

      notify("Skill deleted.", "success");
      await loadSkills();
    } catch (error) {
      notify(`Skill was not deleted: ${error.message}`);
    }
  }

  // ---------------- ABOUT SECTION (SITE SETTINGS) ----------------

  async function loadAboutSettings() {
    renderEditor(`
      <section class="panel">
        <p class="eyebrow">SITE SETTINGS</p>
        <h2>About section</h2>
        <p class="muted">Loading About content…</p>
      </section>`);

    try {
      const result = await api("/admin/settings/about");
      renderAboutSettings(result.about || {});
    } catch (error) {
      notify(`Could not load About content: ${error.message}`);
      renderEditor(`
        <section class="panel">
          <h2>About section</h2>
          <p class="muted">Could not load the About content. Check the API and try again.</p>
          <button class="button button-secondary" id="retry-about" type="button">
            Retry
          </button>
        </section>`);
      $("#retry-about").addEventListener("click", loadAboutSettings);
    }
  }

  function renderAboutSettings(about) {
    renderEditor(`
      <section class="panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">SITE SETTINGS</p>
            <h2>About section</h2>
            <p class="muted">Content shown in the homepage About section.</p>
          </div>
        </div>

        <form id="about-form" class="editor-form">
          ${field("Heading", "heading", about.heading, "text", true)}
          ${area("First paragraph", "paragraphOne", about.paragraphOne)}
          ${area("Second paragraph", "paragraphTwo", about.paragraphTwo)}
          ${field("Focus 01 title", "focusOneTitle", about.focusOneTitle)}
          ${field("Focus 01 description", "focusOneDescription", about.focusOneDescription)}
          ${field("Focus 02 title", "focusTwoTitle", about.focusTwoTitle)}
          ${field("Focus 02 description", "focusTwoDescription", about.focusTwoDescription)}
          ${field("Focus 03 title", "focusThreeTitle", about.focusThreeTitle)}
          ${field("Focus 03 description", "focusThreeDescription", about.focusThreeDescription)}
          ${field("Image caption (e.g. Learning by building)", "imageLabel", about.imageLabel)}

          <div class="editor-actions editor-field-wide">
            <button class="button button-primary" type="submit">Save About section</button>
            <button class="button button-secondary" type="reset">Reset form</button>
          </div>
        </form>
      </section>`);

    $("#about-form").addEventListener("submit", saveAboutSettings);
  }

  async function saveAboutSettings(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    button.textContent = "Saving…";

    const formData = new FormData(form);
    const value = (key) => String(formData.get(key) || "").trim();

    const payload = {
      heading: value("heading"),
      paragraphOne: value("paragraphOne") || null,
      paragraphTwo: value("paragraphTwo") || null,
      focusOneTitle: value("focusOneTitle"),
      focusOneDescription: value("focusOneDescription"),
      focusTwoTitle: value("focusTwoTitle"),
      focusTwoDescription: value("focusTwoDescription"),
      focusThreeTitle: value("focusThreeTitle"),
      focusThreeDescription: value("focusThreeDescription"),
      imageLabel: value("imageLabel")
    };

    try {
      const result = await api("/admin/settings/about", {
        method: "PUT",
        body: JSON.stringify(payload)
      });

      notify("About section saved.", "success");
      renderAboutSettings(result.about || payload);
    } catch (error) {
      notify(`About section was not saved: ${error.message}`);
      button.disabled = false;
      button.textContent = "Save About section";
    }
  }

  async function initializeLogin() {
    const form = $("#login-form");
    if (!form) return;

    $("#admin-year").textContent = String(new Date().getFullYear());

    // Opened by double-clicking the file: the API is unreachable from a file
    // origin, so explain how to serve the dashboard instead of failing with a
    // confusing CORS error.
    if (window.location.protocol === "file:") {
      notifyLogin(FILE_PROTOCOL_HINT);
      return;
    }

    try {
      await refreshCsrfToken();
      const session = await api("/auth/me");
      if (session.admin) {
        location.replace("./index.html");
        return;
      }
    } catch (error) {
      if (error.status !== 401) {
        notifyLogin(describeApiFailure(error));
      }
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = $("#login-button");
      button.disabled = true;
      button.querySelector("span").textContent = "Signing in…";

      try {
        await refreshCsrfToken();
        await api("/auth/login", {
          method: "POST",
          body: JSON.stringify({
            email: $("#email").value.trim(),
            password: $("#password").value
          })
        });
        await refreshCsrfToken();

        const session = await api("/auth/me");
        if (!session.admin) throw new Error("Session verification failed.");
        location.replace("./index.html");
      } catch (error) {
        notifyLogin(describeApiFailure(error));
      } finally {
        button.disabled = false;
        button.querySelector("span").textContent = "Sign in securely";
      }
    });
  }

  function notifyLogin(message) {
    const element = $("#login-message");
    if (!element) return;
    element.textContent = message;
    element.className = "notice error";
    element.hidden = false;
  }

  async function initializeDashboard() {
    if (!$("#view-overview")) return;

    $("#admin-year").textContent = String(new Date().getFullYear());

    if (window.location.protocol === "file:") {
      const nameElement = $("#admin-name");
      if (nameElement) nameElement.textContent = "Not signed in";
      notify(FILE_PROTOCOL_HINT);
      return;
    }

    try {
      await refreshCsrfToken();
      const result = await api("/admin/check");
      const admin = result.admin;

      $("#admin-name").textContent = admin.displayName || admin.email;
      $("#overview-role").textContent = admin.role || "Admin";
    } catch (error) {
      if (error.status === 401) {
        location.replace("./login.html");
        return;
      }
      notify(describeApiFailure(error));
      return;
    }

    document.querySelectorAll("[data-view]").forEach((element) => {
      element.addEventListener("click", (event) => {
        event.preventDefault();
        showView(element.dataset.view || "overview");
      });
    });

    $("#sidebar-toggle")?.addEventListener("click", () => {
      const sidebar = $("#admin-sidebar");
      const open = sidebar.classList.toggle("is-open");
      $("#sidebar-toggle").setAttribute("aria-expanded", String(open));
    });

    $("#logout-button")?.addEventListener("click", async () => {
      const button = $("#logout-button");
      button.disabled = true;
      try {
        await api("/auth/logout", { method: "POST" });
        csrfToken = "";
        location.replace("./login.html");
      } catch (error) {
        notify(`Logout failed: ${error.message}`);
        button.disabled = false;
      }
    });

    if (location.hash) {
      const view = location.hash.slice(1);
      if (document.querySelector(`[data-view="${CSS.escape(view)}"]`)) {
        showView(view);
      }
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    if ($("#login-form")) initializeLogin();
    if ($("#view-overview")) initializeDashboard();
  });
})();
