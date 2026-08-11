"use strict";

class BrandAnimator {
  constructor(root) {
    this.root = root;
    this.letters = Array.from(root.querySelectorAll(".brand-word > span"));
  }

  init() {
    if (!this.letters.length) {
      return;
    }

    this.letters.forEach((letter) => {
      letter.dataset.letter = letter.textContent ?? "";
      letter.classList.remove(
        "brand-style-newsprint",
        "brand-style-cutout-dark",
        "brand-style-highlight",
        "brand-style-glitch",
        "brand-style-marker",
        "brand-style-outline",
        "brand-style-sticker",
        "brand-style-mono",
        "brand-letter-shift"
      );
    });
  }

  destroy() {
    this.letters.forEach((letter) => {
      letter.classList.remove(
        "brand-style-newsprint",
        "brand-style-cutout-dark",
        "brand-style-highlight",
        "brand-style-glitch",
        "brand-style-marker",
        "brand-style-outline",
        "brand-style-sticker",
        "brand-style-mono",
        "brand-letter-shift"
      );
    });
  }
}

class RevealObserver {
  constructor(elements) {
    this.elements = elements;
    this.reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.observer = null;
  }

  init() {
    if (!this.elements.length) {
      return;
    }

    if (this.reducedMotionQuery.matches || typeof IntersectionObserver !== "function") {
      this.elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add("is-visible");
          this.observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.16,
        rootMargin: "0px 0px -40px 0px"
      }
    );

    this.elements.forEach((element) => this.observer.observe(element));
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

class ScrollProgressController {
  constructor(root = document.documentElement) {
    this.root = root;
    this.frameId = 0;

    this.handleScroll = this.handleScroll.bind(this);
    this.handleResize = this.handleResize.bind(this);
  }

  init() {
    this.sync();
    window.addEventListener("scroll", this.handleScroll, { passive: true });
    window.addEventListener("resize", this.handleResize);
  }

  handleScroll() {
    this.requestSync();
  }

  handleResize() {
    this.requestSync();
  }

  requestSync() {
    if (this.frameId) {
      return;
    }

    this.frameId = window.requestAnimationFrame(() => {
      this.frameId = 0;
      this.sync();
    });
  }

  sync() {
    const maxScroll = this.root.scrollHeight - window.innerHeight;
    const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
    this.root.style.setProperty("--scroll-progress", progress.toFixed(3));
  }

  destroy() {
    window.removeEventListener("scroll", this.handleScroll);
    window.removeEventListener("resize", this.handleResize);

    if (this.frameId) {
      window.cancelAnimationFrame(this.frameId);
      this.frameId = 0;
    }
  }
}

class ActiveNavigation {
  constructor(links) {
    this.links = links;
    this.sections = links
      .map((link) => document.querySelector(link.getAttribute("href")))
      .filter(Boolean);
    this.linkMap = new Map(links.map((link) => [link.getAttribute("href"), link]));
    this.observer = null;
  }

  init() {
    if (!this.links.length || !this.sections.length || typeof IntersectionObserver !== "function") {
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visibleEntry) {
          return;
        }

        const activeLink = this.linkMap.get(`#${visibleEntry.target.id}`);

        if (!activeLink) {
          return;
        }

        this.links.forEach((link) => link.classList.remove("is-active"));
        activeLink.classList.add("is-active");
      },
      {
        threshold: [0.2, 0.45, 0.7],
        rootMargin: "-20% 0px -55% 0px"
      }
    );

    this.sections.forEach((section) => this.observer.observe(section));
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

function syncCurrentYear() {
  const yearElement = document.querySelector("#year");

  if (yearElement) {
    yearElement.textContent = String(new Date().getFullYear());
  }
}

class PortfolioApp {
  constructor() {
    this.cleanups = [];
    this.dashboardState = this.loadDashboardState();
  }

  init() {
    document.documentElement.classList.add("js-animations");
    syncCurrentYear();

    this.initBrandAnimator();
    this.initRevealObserver();
    this.initActiveNavigation();
    this.initScrollProgress();
    this.initDashboard();
    this.applyDashboardState();

    window.addEventListener(
      "beforeunload",
      () => {
        this.destroy();
      },
      { once: true }
    );
  }

  initBrandAnimator() {
    const brandRoot = document.querySelector(".brand");

    if (!brandRoot) {
      return;
    }

    const animator = new BrandAnimator(brandRoot);
    animator.init();
    this.cleanups.push(() => animator.destroy());
  }

  initRevealObserver() {
    const revealElements = Array.from(document.querySelectorAll("[data-reveal]"));

    if (!revealElements.length) {
      return;
    }

    const revealObserver = new RevealObserver(revealElements);
    revealObserver.init();
    this.cleanups.push(() => revealObserver.destroy());
  }

  initActiveNavigation() {
    const links = Array.from(document.querySelectorAll(".nav a"));

    if (!links.length) {
      return;
    }

    const activeNavigation = new ActiveNavigation(links);
    activeNavigation.init();
    this.cleanups.push(() => activeNavigation.destroy());
  }

  initScrollProgress() {
    const scrollProgress = new ScrollProgressController();
    scrollProgress.init();
    this.cleanups.push(() => scrollProgress.destroy());
  }

  initDashboard() {
    const trigger = document.querySelector("[data-open-dashboard]");
    const overlay = document.querySelector("#dashboardOverlay");
    const closeButton = document.querySelector("#dashboardClose");
    const unlockButton = document.querySelector("#dashboardUnlockButton");
    const saveButton = document.querySelector("#saveDashboardButton");
    const addProjectButton = document.querySelector("#addProjectButton");
    const passwordInput = document.querySelector("#dashboardPassword");
    const lockScreen = document.querySelector("#dashboardLockScreen");
    const content = document.querySelector("#dashboardContent");
    const attemptsText = document.querySelector("#dashboardAttemptsText");
    const message = document.querySelector("#dashboardMessage");
    const projectEditorList = document.querySelector("#projectEditorList");

    if (!trigger || !overlay || !closeButton || !unlockButton || !saveButton || !addProjectButton || !passwordInput || !lockScreen || !content || !attemptsText || !message || !projectEditorList) {
      return;
    }

    const state = this.dashboardState;
    const password = String((window.__PORTFOLIO_CONFIG__?.dashboardPassword || "123456")).trim();
    const attemptsKey = "dashboard-attempts";
    const lockUntilKey = "dashboard-lock-until";

    const getAttempts = () => Number(window.localStorage.getItem(attemptsKey) || "0");
    const setAttempts = (value) => window.localStorage.setItem(attemptsKey, String(value));
    const getLockUntil = () => Number(window.localStorage.getItem(lockUntilKey) || "0");
    const setLockUntil = (value) => window.localStorage.setItem(lockUntilKey, String(value));

    const updateAttemptsText = () => {
      const remaining = Math.max(0, 3 - getAttempts());
      attemptsText.textContent = `Tentativas: ${remaining}/3`;
    };

    const showMessage = (text, type = "") => {
      message.textContent = text;
      message.className = `dashboard-message${type ? ` is-${type}` : ""}`;
    };

    const openDashboard = () => {
      overlay.hidden = false;
      document.body.classList.add("is-locked");
      lockScreen.hidden = false;
      content.hidden = true;
      passwordInput.value = "";
      const lockUntil = getLockUntil();
      if (lockUntil && Date.now() < lockUntil) {
        showMessage(`Acesso bloqueado por ${Math.ceil((lockUntil - Date.now()) / 60000)} minuto(s).`, "error");
        return;
      }

      if (lockUntil && Date.now() >= lockUntil) {
        setLockUntil(0);
        setAttempts(0);
      }

      updateAttemptsText();
      showMessage("");
      passwordInput.value = "";
    };

    const closeDashboard = () => {
      overlay.hidden = true;
      document.body.classList.remove("is-locked");
      lockScreen.hidden = false;
      content.hidden = true;
      passwordInput.value = "";
      showMessage("");
    };

    const resetDashboardView = () => {
      lockScreen.hidden = false;
      content.hidden = true;
      passwordInput.value = "";
      showMessage("");
    };

    const populateForm = () => {
      document.querySelector("[data-field='heroTitle']").innerHTML = state.heroTitle.replace(/\n/g, "<br />");
      document.querySelector("[data-field='heroRole']").textContent = state.heroRole;
      document.querySelector("[data-field='heroStatusTitle']").textContent = state.heroStatusTitle;
      document.querySelector("[data-field='heroStatusText']").textContent = state.heroStatusText;
      document.querySelector("[data-field='aboutHeading']").textContent = state.aboutHeading;
      document.querySelector("[data-field='aboutParagraph1']").textContent = state.aboutParagraph1;
      document.querySelector("[data-field='aboutParagraph2']").textContent = state.aboutParagraph2;
      document.querySelector("[data-field='skillsHeading']").textContent = state.skillsHeading;
      document.querySelector("[data-field='projectsHeading']").textContent = state.projectsHeading;
      document.querySelector("[data-field='contactHeading']").textContent = state.contactHeading;
      this.renderProjects();
    };

    const applyFormValues = () => {
      document.querySelector("#heroTitleInput").value = state.heroTitle;
      document.querySelector("#heroRoleInput").value = state.heroRole;
      document.querySelector("#heroStatusTitleInput").value = state.heroStatusTitle;
      document.querySelector("#heroStatusTextInput").value = state.heroStatusText;
      document.querySelector("#aboutHeadingInput").value = state.aboutHeading;
      document.querySelector("#aboutParagraph1Input").value = state.aboutParagraph1;
      document.querySelector("#aboutParagraph2Input").value = state.aboutParagraph2;
      document.querySelector("#skillsHeadingInput").value = state.skillsHeading;
      document.querySelector("#projectsHeadingInput").value = state.projectsHeading;
      document.querySelector("#contactHeadingInput").value = state.contactHeading;
      this.renderProjects();
    };

    this.renderProjects = () => {
      projectEditorList.innerHTML = "";
      state.projects.forEach((project, index) => {
        const item = document.createElement("article");
        item.className = "project-editor-item";
        item.innerHTML = `
          <div class="project-editor-item-top">
            <strong>${project.title}</strong>
            <button type="button" data-remove-project="${index}">Remover</button>
          </div>
          <label class="dashboard-field">
            <span>Título</span>
            <input type="text" data-project-title="${index}" value="${project.title}" />
          </label>
          <label class="dashboard-field">
            <span>Descrição</span>
            <textarea rows="3" data-project-description="${index}">${project.description}</textarea>
          </label>
          <label class="dashboard-field">
            <span>Link</span>
            <input type="text" data-project-link="${index}" value="${project.link}" />
          </label>
        `;
        projectEditorList.appendChild(item);
      });
    };

    this.renderProjects();

    const handleUnlock = () => {
      if (passwordInput.value.trim() !== password) {
        const attempts = getAttempts() + 1;
        setAttempts(attempts);
        updateAttemptsText();
        if (attempts >= 3) {
          const lockUntil = Date.now() + 60 * 60 * 1000;
          setLockUntil(lockUntil);
          showMessage("Limite de tentativas atingido. Tente novamente em 1 hora.", "error");
          passwordInput.value = "";
          return;
        }
        showMessage("Senha incorreta. Tente novamente.", "error");
        return;
      }

      setAttempts(0);
      setLockUntil(0);
      lockScreen.hidden = true;
      content.hidden = false;
      showMessage("Acesso liberado.", "success");
      applyFormValues();
    };

    const handleSave = () => {
      state.heroTitle = document.querySelector("#heroTitleInput").value;
      state.heroRole = document.querySelector("#heroRoleInput").value;
      state.heroStatusTitle = document.querySelector("#heroStatusTitleInput").value;
      state.heroStatusText = document.querySelector("#heroStatusTextInput").value;
      state.aboutHeading = document.querySelector("#aboutHeadingInput").value;
      state.aboutParagraph1 = document.querySelector("#aboutParagraph1Input").value;
      state.aboutParagraph2 = document.querySelector("#aboutParagraph2Input").value;
      state.skillsHeading = document.querySelector("#skillsHeadingInput").value;
      state.projectsHeading = document.querySelector("#projectsHeadingInput").value;
      state.contactHeading = document.querySelector("#contactHeadingInput").value;

      this.saveDashboardState();
      populateForm();
      closeDashboard();
    };

    const addProject = () => {
      state.projects.push({ title: "Novo projeto", description: "Descreva seu projeto", link: "https://example.com" });
      this.renderProjects();
      this.saveDashboardState();
      this.applyDashboardState();
    };

    trigger.addEventListener("click", () => {
      openDashboard();
      resetDashboardView();
    });
    closeButton.addEventListener("click", closeDashboard);
    unlockButton.addEventListener("click", handleUnlock);
    saveButton.addEventListener("click", handleSave);
    addProjectButton.addEventListener("click", addProject);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        closeDashboard();
      }
    });

    passwordInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        handleUnlock();
      }
    });

    projectEditorList.addEventListener("input", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
        return;
      }

      const index = Number(target.dataset.projectTitle || target.dataset.projectDescription || target.dataset.projectLink);
      if (Number.isNaN(index)) {
        return;
      }

      const project = state.projects[index];
      if (!project) {
        return;
      }

      if (target.dataset.projectTitle !== undefined) {
        project.title = target.value;
      } else if (target.dataset.projectDescription !== undefined) {
        project.description = target.value;
      } else if (target.dataset.projectLink !== undefined) {
        project.link = target.value;
      }
      this.saveDashboardState();
      populateForm();
    });

    projectEditorList.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-remove-project]");
      if (!button) {
        return;
      }
      const index = Number(button.dataset.removeProject);
      state.projects.splice(index, 1);
      this.saveDashboardState();
      this.renderProjects();
      this.applyDashboardState();
    });

    updateAttemptsText();
    if (getLockUntil() && Date.now() < getLockUntil()) {
      showMessage(`Acesso bloqueado por ${Math.ceil((getLockUntil() - Date.now()) / 60000)} minuto(s).`, "error");
    }
  }

  applyDashboardState() {
    const heroTitle = document.querySelector("[data-field='heroTitle']");
    const heroRole = document.querySelector("[data-field='heroRole']");
    const heroStatusTitle = document.querySelector("[data-field='heroStatusTitle']");
    const heroStatusText = document.querySelector("[data-field='heroStatusText']");
    const aboutHeading = document.querySelector("[data-field='aboutHeading']");
    const aboutParagraph1 = document.querySelector("[data-field='aboutParagraph1']");
    const aboutParagraph2 = document.querySelector("[data-field='aboutParagraph2']");
    const skillsHeading = document.querySelector("[data-field='skillsHeading']");
    const projectsHeading = document.querySelector("[data-field='projectsHeading']");
    const contactHeading = document.querySelector("[data-field='contactHeading']");
    const projectsGrid = document.querySelector("#projectsGrid");

    if (!heroTitle || !heroRole || !heroStatusTitle || !heroStatusText || !aboutHeading || !aboutParagraph1 || !aboutParagraph2 || !skillsHeading || !projectsHeading || !contactHeading || !projectsGrid) {
      return;
    }

    heroTitle.innerHTML = this.dashboardState.heroTitle.replace(/\n/g, "<br />");
    heroRole.textContent = this.dashboardState.heroRole;
    heroStatusTitle.textContent = this.dashboardState.heroStatusTitle;
    heroStatusText.textContent = this.dashboardState.heroStatusText;
    aboutHeading.textContent = this.dashboardState.aboutHeading;
    aboutParagraph1.textContent = this.dashboardState.aboutParagraph1;
    aboutParagraph2.textContent = this.dashboardState.aboutParagraph2;
    skillsHeading.textContent = this.dashboardState.skillsHeading;
    projectsHeading.textContent = this.dashboardState.projectsHeading;
    contactHeading.textContent = this.dashboardState.contactHeading;

    projectsGrid.innerHTML = this.dashboardState.projects.map((project, index) => `
      <article class="project-card${index === 0 ? " project-card-featured" : ""}" data-reveal="up">
        <span class="project-index">0${index + 1}</span>
        <span class="project-label">${index === 0 ? "Projeto principal" : "Projeto tecnico"}</span>
        <h3>${project.title}</h3>
        <p>${project.description}</p>
        <p><a href="${project.link}" target="_blank" rel="noreferrer">${project.link}</a></p>
      </article>
    `).join("");
  }

  loadDashboardState() {
    const saved = window.localStorage.getItem("portfolio-dashboard-state");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.warn("Falha ao carregar o dashboard", error);
      }
    }

    return {
      heroTitle: "Pedro\nEmmanuel",
      heroRole: "Desenvolvedor back end",
      heroStatusTitle: "Estudante de Analise e Desenvolvimento de Sistemas",
      heroStatusText: "Atualmente me encontro no 1° periodo , focando por fora no desenvolvimento backend.",
      aboutHeading: "Venha me conhecer um pouco mais.",
      aboutParagraph1: "Me chamo Pedro Emmanuel, tenho 18 anos e seja bem-vindo ao meu portfolio. Há 1 ano tive meu primeiro contato com a programacao e desde entao vivo em constante pratica e estudo buscando a cada dia aprender mais.",
      aboutParagraph2: "Curso Analise e Desenvolvimento de Sistemas na Universidade Tiradentes e me encontro no 1° periodo, onde estou me aprofundando cada vez mais no universo do desenvolvimento de software.",
      skillsHeading: "Seja muito bem-vindo ao meu mundo na programação",
      projectsHeading: "Aqui você encontra um pouco do meu trabalho , espero que goste.",
      contactHeading: "Aqui podemos ter um contato direto , vamos realizar esse network.",
      projects: [
        {
          title: "Projeto Concessionaria",
          description: "https://github.com/pedroemn/Concessionaria.git",
          link: "https://github.com/pedroemn/Concessionaria.git"
        },
        {
          title: "Portfólio Web",
          description: "https://github.com/pedroemn/emmanuel_portfolio.git",
          link: "https://github.com/pedroemn/emmanuel_portfolio.git"
        }
      ]
    };
  }

  saveDashboardState() {
    window.localStorage.setItem("portfolio-dashboard-state", JSON.stringify(this.dashboardState));
  }

  destroy() {
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
  }
}

function initPortfolio() {
  const app = new PortfolioApp();
  app.init();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPortfolio, { once: true });
} else {
  initPortfolio();
}
