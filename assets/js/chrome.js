(function () {
  "use strict";

  const DESKTOP_MQ = "(min-width:1400px)";

  function bindChrome(root) {
    if (!(root instanceof Element) || root.dataset.htcChromeBound === "true") return;

    const header = root.querySelector(".site-header");
    if (!header) return;

    const menuButton = header.querySelector(".menu-button");
    const navLinks = header.querySelector(".nav-links");
    if (!menuButton || !navLinks) return;

    root.dataset.htcChromeBound = "true";

    const closeMenu = () => {
      navLinks.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.setAttribute("aria-label", "Abrir menú");
    };

    const toggleMenu = (event) => {
      event.preventDefault();
      event.stopPropagation();
      const opened = navLinks.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", String(opened));
      menuButton.setAttribute("aria-label", opened ? "Cerrar menú" : "Abrir menú");
    };

    menuButton.addEventListener("click", toggleMenu);

    navLinks.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && navLinks.classList.contains("open")) {
        closeMenu();
        menuButton.focus();
      }
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!navLinks.classList.contains("open")) return;
      if (navLinks.contains(target) || menuButton.contains(target)) return;
      closeMenu();
    });

    const media = window.matchMedia(DESKTOP_MQ);
    const onBreakpoint = (event) => {
      if (event.matches) closeMenu();
    };
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", onBreakpoint);
    } else {
      media.addListener(onBreakpoint);
    }
  }

  function init() {
    document.querySelectorAll(".htc-chrome").forEach(bindChrome);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
