(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const form = $("orderForm");
  const rawRef = new URLSearchParams(location.search).get("ref") || "";
  const reference = HTCDirect.normalize(rawRef) || HTCDirect.defaultCode;
  const validReference = Boolean(HTCDirect.get(reference));
  if (!validReference) {
    form.hidden = true;
    $("referenceWarning").hidden = false;
    $("referenceLabel").textContent = reference.slice(0,80);
    $("referenceWarningCopy").textContent = "Esta página tramita solicitudes directas. Si llegaste desde una tienda, continúa en la guía para conservar su referencia. Si el enlace contiene un error, puedes iniciar una solicitud directa con el botón correspondiente.";
    const guide = new URL("/guia/", location.origin);
    guide.searchParams.set("ref", rawRef);
    $("partnerGuideLink").href = guide.href;
    return;
  }
  $("directRef").value = reference;
  $("referenceLabel").textContent = reference;
  HTCDirect.propagate(reference);
  const params = new URLSearchParams(location.search);
  if (["Essential", "Privacy", "Elite", "Consultar"].includes(params.get("pack"))) $("orderPack").value = params.get("pack");
  if (params.get("modelo")) $("orderModel").value = params.get("modelo").slice(0,100);
  if (Date.now() >= Date.parse("2026-11-01T00:00:00+01:00")) $("onlineOffer").hidden = true;
  let prepared = null;
  function readValue(data, key) { return String(data.get(key) || "").trim(); }
  function choices(data, key) { return data.getAll(key).join(", ") || "Sin preferencias indicadas"; }
  function invalidate() {
    prepared = null;
    $("orderSummary").hidden = true;
    $("summaryText").value = "";
    $("emailSubject").value = "";
    $("sendEmail").removeAttribute("href");
    $("formStatus").textContent = "";
  }
  form.querySelectorAll("input[required]").forEach(input => {
    input.addEventListener("input", () => input.setCustomValidity(""));
    input.addEventListener("blur", () => input.setCustomValidity(input.value.trim() ? "" : "Completa este campo."));
  });
  form.addEventListener("input", invalidate);
  form.addEventListener("change", invalidate);
  form.addEventListener("submit", event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    if (!["nombre", "email", "localidad", "modelo"].every(key => readValue(data,key))) {
      const input = form.querySelector(`input[name="${["nombre", "email", "localidad", "modelo"].find(key => !readValue(data,key))}"]`);
      input.setCustomValidity("Completa este campo.");
      input.reportValidity();
      input.focus();
      return;
    }
    const suffix = Array.from(crypto.getRandomValues(new Uint8Array(5)), byte => byte.toString(16).padStart(2,"0")).join("").toUpperCase();
    const id = "HTC-W-" + new Date().toISOString().slice(0,10).replaceAll("-", "") + "-" + suffix;
    const subject = `[${reference}][${id}] ${readValue(data,"tipo")} · ${readValue(data,"pack")}`;
    const body = [
      "SOLICITUD DIRECTA HARDTOCRACK", "", `ID de solicitud: ${id}`, `Referencia: ${reference}`,
      "Modalidad: Venta directa HardToCrack", `Preparada: ${new Date().toISOString()}`, "",
      `Tipo: ${readValue(data,"tipo")}`, `Modelo: ${readValue(data,"modelo")}`, `Pack: ${readValue(data,"pack")}`,
      `Estado: ${readValue(data,"estado")}`, `Capacidad / color: ${readValue(data,"capacidad_color") || "Consultar"}`,
      `Presupuesto orientativo: ${readValue(data,"presupuesto") || "No indicado"}`, "",
      `Perfiles: ${choices(data,"perfiles")}`, `Aplicaciones: ${choices(data,"apps")}`,
      `Otras apps: ${readValue(data,"otras_apps") || "No indicadas"}`, `Servicios / accesorios: ${choices(data,"extras")}`, "",
      `Nombre o alias: ${readValue(data,"nombre")}`, `Email: ${readValue(data,"email")}`,
      `Contacto alternativo: ${readValue(data,"contacto_alternativo") || "No indicado"}`,
      `País / localidad: ${readValue(data,"localidad")}`, `Entrega: ${readValue(data,"entrega")}`, "",
      "Comentarios:", readValue(data,"comentarios") || "Sin comentarios adicionales", "",
      "Información de privacidad leída: Sí · https://www.hardtocrack.com/privacidad",
      "Solicitud pendiente de revisión. Configuración, licencias, compatibilidad, disponibilidad, precio final, envío y pago se confirmarán por HardToCrack antes de aceptar el pedido."
    ].join("\n");
    prepared = { id, subject, body };
    $("emailSubject").value = subject;
    $("summaryText").value = body;
    $("sendEmail").href = `mailto:pedidos@hardtocrack.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    $("orderSummary").hidden = false;
    $("formStatus").textContent = "Resumen preparado. Falta enviar el correo.";
    $("orderSummary").scrollIntoView({ behavior: "smooth", block: "start" });
    $("summaryTitle").focus({ preventScroll: true });
  });
  $("sendEmail").addEventListener("click", () => {
    $("formStatus").textContent = "Se abrirá tu aplicación de correo. Revisa el mensaje y pulsa Enviar allí. Si no se abre, copia o descarga el resumen.";
  });
  $("copySummary").addEventListener("click", async () => {
    if (!prepared) return;
    try {
      await navigator.clipboard.writeText(`Para: pedidos@hardtocrack.com\nAsunto: ${prepared.subject}\n\n${prepared.body}`);
      $("formStatus").textContent = "Resumen copiado. Pégalo en un correo a pedidos@hardtocrack.com y envíalo.";
    } catch {
      $("summaryText").focus();
      $("summaryText").select();
      $("formStatus").textContent = "Selecciona y copia el resumen manualmente. Envíalo a pedidos@hardtocrack.com con el asunto indicado.";
    }
  });
  $("downloadSummary").addEventListener("click", () => {
    if (!prepared) return;
    const url = URL.createObjectURL(new Blob([`Para: pedidos@hardtocrack.com\nAsunto: ${prepared.subject}\n\n${prepared.body}`], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${prepared.id}.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    $("formStatus").textContent = "Resumen descargado. Adjunta el archivo a un correo a pedidos@hardtocrack.com y envíalo.";
  });
  $("editOrder").addEventListener("click", () => {
    invalidate();
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    $("requestType").focus({ preventScroll: true });
  });
})();
