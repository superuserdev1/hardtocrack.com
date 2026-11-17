(function () {
  "use strict";

  // One code marks direct enquiries without identifying their source channel.
  // It never identifies a store or grants a partner commission.
  const references = Object.freeze({
    "HTC-WEB-001": { label: "Venta directa HardToCrack", source: "direct" }
  });
  const STORAGE_KEY = "hardtocrack_partner_attribution";
  const PACKS = Object.freeze(["Essential", "Privacy", "Elite"]);

  function normalize(value) {
    const code = String(value || "").trim().toUpperCase();
    return code === "HTC-DIR-001" ? "HTC-WEB-001" : code;
  }

  function isPartnerCode(code) {
    const normalized = normalize(code);
    return /^HTC-[A-Z]{3}-\d{3}$/.test(normalized) && !/^HTC-(?:DIR|WEB)-/.test(normalized);
  }

  function fromSearch(search) {
    const code = normalize(new URLSearchParams(search).get("ref"));
    return Object.hasOwn(references, code) ? code : "";
  }

  function storedPartner() {
    try {
      const record = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!record || !record.code || !record.expiresAt || Date.now() > record.expiresAt) return null;
      const code = normalize(record.code);
      if (!isPartnerCode(code)) return null;
      return { code, capturedAt: record.capturedAt, expiresAt: record.expiresAt, source: record.source };
    } catch (error) {
      return null;
    }
  }

  function preferred(search) {
    const inbound = normalize(new URLSearchParams(search || location.search).get("ref"));
    const stored = storedPartner();
    if (isPartnerCode(inbound)) return { code: inbound, channel: "partner", source: "query" };
    if (stored) return { code: stored.code, channel: "partner", source: "stored" };
    if (Object.hasOwn(references, inbound)) return { code: inbound, channel: "direct", source: "query" };
    return { code: "HTC-WEB-001", channel: "direct", source: "default" };
  }

  function partnerCheckout(code, pack) {
    const url = new URL("/guia/", location.origin);
    url.searchParams.set("ref", normalize(code));
    if (PACKS.includes(pack)) url.searchParams.set("pack", pack);
    url.hash = PACKS.includes(pack) ? "configuraciones" : "tienda";
    return url;
  }

  function routePedidosAnchors(code) {
    document.querySelectorAll("a[href]").forEach(link => {
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin) return;
      const path = url.pathname.replace(/\/+$/, "") || "/";
      if (path !== "/pedidos") return;
      const pack = url.searchParams.get("pack") || link.getAttribute("data-pack") || "";
      link.href = partnerCheckout(code, pack).href;
    });
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
    storageKey: STORAGE_KEY,
    packs: PACKS,
    normalize,
    isPartnerCode,
    fromSearch,
    storedPartner,
    preferred,
    partnerCheckout,
    routePedidosAnchors,
    propagate,
    get: code => references[normalize(code)] || null
  });
})();
