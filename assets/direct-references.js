(function () {
  "use strict";

  // Public campaign identifiers. A code identifies the source of a direct
  // enquiry; it never identifies a store or grants a partner commission.
  const references = Object.freeze({
    "HTC-DIR-001": { label: "Venta directa HardToCrack", source: "direct" }
  });

  function normalize(value) {
    return String(value || "").toUpperCase().replace(/[^A-Z0-9-]/g, "").trim();
  }

  function fromSearch(search) {
    const code = normalize(new URLSearchParams(search).get("ref"));
    return Object.hasOwn(references, code) ? code : "";
  }

  function propagate(code) {
    if (!Object.hasOwn(references, code)) return;
    document.querySelectorAll("a[href]").forEach(link => {
      const url = new URL(link.href, location.href);
      if (
        url.protocol.startsWith("http") &&
        url.hostname.replace(/^www\./, "") === location.hostname.replace(/^www\./, "") &&
        (url.pathname === "/" || url.pathname === "/guia" || url.pathname === "/guia/")
      ) {
        url.searchParams.set("ref", code);
        link.href = url.href;
      }
    });
  }

  window.HTCDirect = Object.freeze({
    references,
    defaultCode: "HTC-DIR-001",
    normalize,
    fromSearch,
    propagate,
    get: code => references[normalize(code)] || null
  });
})();
