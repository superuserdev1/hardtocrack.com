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
  window.matchMedia("(min-width:1400px)").addEventListener("change", (event) => {
    if (event.matches) closeMobileMenu();
  });

  document.querySelectorAll(".faq-button").forEach((button) => {
    button.addEventListener("click", () => button.closest(".faq-item").classList.toggle("open"));
  });

  const inbound = HTCDirect.normalize(new URLSearchParams(location.search).get("ref"));
  const pref = HTCDirect.preferred(location.search);

  function applyRef(code, prefixes) {
    document.querySelectorAll("a[href]").forEach((link) => {
      if (link.dataset.noRef === "true" || link.hasAttribute("download")) return;
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin) return;
      const path = url.pathname;
      if (/\.pdf$/i.test(path) || path.startsWith("/assets/")) return;
      const match = prefixes.some((prefix) => path === prefix || path === prefix + "/" || path.startsWith(prefix.endsWith("/") ? prefix : prefix + "/"));
      if (!match) return;
      url.searchParams.set("ref", code);
      link.href = url.href;
    });
  }

  if (pref.channel === "partner") {
    HTCDirect.routePedidosAnchors(pref.code);
    applyRef(pref.code, ["/guia", "/precios", "/compatibilidades"]);
  } else if (HTCDirect.get(pref.code)) {
    HTCDirect.propagate(pref.code);
    applyRef(pref.code, ["/compatibilidades"]);
  } else if (inbound) {
    applyRef(inbound, ["/pedidos", "/guia", "/compatibilidades"]);
  } else {
    applyRef(HTCDirect.defaultCode, ["/pedidos", "/compatibilidades"]);
  }
})();
