(function () {
  "use strict";

  // One code marks direct enquiries without identifying their source channel.
  // It never identifies a store or grants a partner commission.
  const references = Object.freeze({
    "HTC-WEB-001": { label: "Venta directa HardToCrack", source: "direct" }
  });

  function normalize(value) {
    const code = String(value || "").trim().toUpperCase();
    return code === "HTC-DIR-001" ? "HTC-WEB-001" : code;
  }

  function fromSearch(search) {
    const code = normalize(new URLSearchParams(search).get("ref"));
    return Object.hasOwn(references, code) ? code : "";
  }

  function propagate(code) {
    code = normalize(code);
    if (!Object.hasOwn(references, code)) return;
    document.querySelectorAll("a[href]").forEach(link => {
      const url = new URL(link.href, location.href);
      if (
        url.protocol.startsWith("http") &&
        url.hostname.replace(/^www\./, "") === location.hostname.replace(/^www\./, "") &&
        ["/", "/guia", "/guia/", "/pedidos", "/pedidos/"].includes(url.pathname) &&
        (!url.searchParams.get("ref") || Object.hasOwn(references, normalize(url.searchParams.get("ref"))))
      ) {
        url.searchParams.set("ref", code);
        link.href = url.href;
      }
    });
  }

  window.HTCDirect = Object.freeze({
    references,
    defaultCode: "HTC-WEB-001",
    normalize,
    fromSearch,
    propagate,
    get: code => references[normalize(code)] || null
  });
})();
