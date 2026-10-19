(function () {
  "use strict";

  const menuButton = document.getElementById("menuButton");
  const navLinks = document.getElementById("navLinks");
  const closeMobileMenu = () => {
    navLinks?.classList.remove("open");
    menuButton?.setAttribute("aria-expanded", "false");
    menuButton?.setAttribute("aria-label", "Abrir menú");
  };

  menuButton?.addEventListener("click", () => {
    const opened = navLinks.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(opened));
    menuButton.setAttribute("aria-label", opened ? "Cerrar menú" : "Abrir menú");
  });
  navLinks?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMobileMenu));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && navLinks?.classList.contains("open")) {
      closeMobileMenu();
      menuButton?.focus();
    }
  });
  document.addEventListener("click", (event) => {
    if (navLinks?.classList.contains("open") && !navLinks.contains(event.target) && !menuButton?.contains(event.target)) {
      closeMobileMenu();
    }
  });
  window.matchMedia("(min-width:1081px)").addEventListener("change", (event) => {
    if (event.matches) closeMobileMenu();
  });

  document.querySelectorAll(".faq-button").forEach((button) => {
    button.addEventListener("click", () => button.closest(".faq-item").classList.toggle("open"));
  });

  const pageRef = HTCDirect.normalize(new URLSearchParams(location.search).get("ref")) || HTCDirect.defaultCode;
  if (HTCDirect.get(pageRef)) {
    HTCDirect.propagate(pageRef);
  } else {
    document.querySelectorAll('a[href^="/pedidos/"]').forEach((link) => {
      const url = new URL(link.href);
      url.searchParams.set("ref", pageRef);
      link.href = url.href;
    });
  }
  document.querySelectorAll('a[href^="/compatibilidades/"]').forEach((link) => {
    const url = new URL(link.href);
    url.searchParams.set("ref", pageRef);
    link.href = url.href;
  });
})();
