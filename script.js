"use strict";

const BRAND_STYLE_CLASSES = Object.freeze([
  "brand-style-newsprint",
  "brand-style-cutout-dark",
  "brand-style-highlight",
  "brand-style-glitch",
  "brand-style-marker",
  "brand-style-outline",
  "brand-style-sticker",
  "brand-style-mono"
]);

const BRAND_ANIMATION_CONFIG = Object.freeze({
  minDelayMs: 180,
  maxDelayMs: 640,
  initialDelayMinMs: 40,
  initialDelayMaxMs: 260,
  reducedMotionMinDelayMs: 1100,
  reducedMotionMaxDelayMs: 1800,
  emphasisClassName: "brand-letter-shift",
  emphasisDurationMs: 300
});

class BrandAnimator {
  constructor(root, options = {}) {
    this.root = root;
    this.letters = Array.from(root.querySelectorAll(".brand-word > span"));
    this.styleClasses = options.styleClasses ?? BRAND_STYLE_CLASSES;
    this.config = {
      ...BRAND_ANIMATION_CONFIG,
      ...options.config
    };
    this.reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.timers = new Map();

    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.handleMotionPreferenceChange = this.handleMotionPreferenceChange.bind(this);
  }

  init() {
    if (!this.letters.length) {
      return;
    }

    this.applyInitialState();
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    this.bindMotionPreferenceListener();
    this.start();
  }

  applyInitialState() {
    this.letters.forEach((letter) => {
      letter.dataset.letter = letter.textContent ?? "";
      this.randomizeLetterOffset(letter);
      const styleName = this.pickRandomStyle();
      this.applyStyle(letter, styleName);
    });
  }

  start() {
    this.stop();

    this.letters.forEach((letter) => {
      const initialDelay = this.randomBetween(
        this.config.initialDelayMinMs,
        this.config.initialDelayMaxMs
      );

      this.scheduleNextTick(letter, initialDelay);
    });
  }

  stop() {
    this.timers.forEach((timerId) => window.clearTimeout(timerId));
    this.timers.clear();
  }

  destroy() {
    this.stop();
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    this.unbindMotionPreferenceListener();
  }

  scheduleNextTick(letter, delayMs) {
    const timerId = window.setTimeout(() => {
      this.updateLetter(letter);

      if (!document.hidden) {
        const [minDelay, maxDelay] = this.getDelayWindow();
        const nextDelay = this.randomBetween(minDelay, maxDelay);

        this.scheduleNextTick(letter, nextDelay);
      }
    }, delayMs);

    this.timers.set(letter, timerId);
  }

  updateLetter(letter) {
    const currentStyle = letter.dataset.styleName ?? "";
    const nextStyle = this.pickRandomStyle(currentStyle);
    this.randomizeLetterOffset(letter);
    this.applyStyle(letter, nextStyle);
  }

  applyStyle(letter, styleName) {
    letter.classList.remove(...this.styleClasses);
    letter.classList.add(styleName);
    letter.dataset.styleName = styleName;
    this.flashLetter(letter);
  }

  flashLetter(letter) {
    const { emphasisClassName, emphasisDurationMs } = this.config;

    letter.classList.remove(emphasisClassName);
    void letter.offsetWidth;
    letter.classList.add(emphasisClassName);

    window.setTimeout(() => {
      letter.classList.remove(emphasisClassName);
    }, emphasisDurationMs);
  }

  pickRandomStyle(excludedStyle = "") {
    const availableStyles = this.styleClasses.filter((styleName) => styleName !== excludedStyle);

    if (!availableStyles.length) {
      return excludedStyle;
    }

    const randomIndex = Math.floor(Math.random() * availableStyles.length);
    return availableStyles[randomIndex];
  }

  randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  getDelayWindow() {
    if (this.reducedMotionQuery.matches) {
      return [
        this.config.reducedMotionMinDelayMs,
        this.config.reducedMotionMaxDelayMs
      ];
    }

    return [this.config.minDelayMs, this.config.maxDelayMs];
  }

  randomizeLetterOffset(letter) {
    const tilt = this.randomBetween(-8, 8);
    const shiftY = this.randomBetween(-2, 2);
    const shiftX = this.randomBetween(-1, 1);

    letter.style.setProperty("--brand-tilt", `${tilt}deg`);
    letter.style.setProperty("--brand-shift-y", `${shiftY}px`);
    letter.style.setProperty("--brand-shift-x", `${shiftX}px`);
  }

  handleVisibilityChange() {
    if (document.hidden) {
      this.stop();
      return;
    }

    this.start();
  }

  handleMotionPreferenceChange() {
    this.start();
  }

  bindMotionPreferenceListener() {
    if (typeof this.reducedMotionQuery.addEventListener === "function") {
      this.reducedMotionQuery.addEventListener("change", this.handleMotionPreferenceChange);
      return;
    }

    this.reducedMotionQuery.addListener(this.handleMotionPreferenceChange);
  }

  unbindMotionPreferenceListener() {
    if (typeof this.reducedMotionQuery.removeEventListener === "function") {
      this.reducedMotionQuery.removeEventListener("change", this.handleMotionPreferenceChange);
      return;
    }

    this.reducedMotionQuery.removeListener(this.handleMotionPreferenceChange);
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
  }

  init() {
    document.documentElement.classList.add("js-animations");
    syncCurrentYear();

    this.initBrandAnimator();
    this.initRevealObserver();
    this.initActiveNavigation();
    this.initScrollProgress();

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
