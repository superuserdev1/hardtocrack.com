import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);

export async function renderPackSections(root) {
  const data = JSON.parse(await readFile(join(root, 'assets/packs.json'), 'utf8'));
  const pages = [
    ['guia/index.html', 'configuraciones', 'guide'],
    ['precios/index.html', 'packs', 'prices'],
    ['pedidos/index.html', 'packs', 'order']
  ];
  for (const [path, id, context] of pages) {
    const cards = data.packs.map(pack => {
      const label = `Elegir ${pack.id}`;
      const button = context === 'prices'
        ? `<a class="htc-pack-button" href="/pedidos/?pack=${escape(pack.id)}" data-htc-pack="${escape(pack.id)}">${label} →</a>`
        : `<button class="htc-pack-button" type="button" data-htc-pack="${escape(pack.id)}">${label} →</button>`;
      return `<article class="htc-pack-card" data-pack-card="${escape(pack.id)}" aria-labelledby="pack-${escape(pack.id)}"><p class="htc-pack-kicker">${escape(pack.tagline)}</p><h3 id="pack-${escape(pack.id)}">${escape(pack.id)}</h3><p class="htc-pack-price">${pack.price} € <span>IVA incluido · precio habitual</span></p><p class="htc-pack-audience">${escape(pack.audience)}</p><p class="htc-pack-inheritance">${escape(pack.inheritance)}</p><ul class="htc-pack-list">${pack.features.map(feature => `<li>${escape(feature)}</li>`).join('')}</ul><p class="htc-pack-clarification">${escape(pack.clarification)}</p>${button}</article>`;
    }).join('\n');
    const rows = data.comparison.map(row => `<tr><th scope="row">${escape(row.label)}</th>${row.values.map(value => `<td>${escape(value)}</td>`).join('')}</tr>`).join('\n');
    const markup = `<section id="${id}" class="htc-pack-section" data-pack-context="${context}" aria-labelledby="pack-comparison-title"><div class="wrap"><div class="htc-pack-heading"><p class="htc-pack-eyebrow">Elige con claridad</p><h2 id="pack-comparison-title">¿Qué incluye cada pack?</h2><p>Essential prepara la base. Privacy añade perfiles, apps, VPN y conectividad. Elite suma servicios de identidad digital durante un año.</p></div><p class="htc-pack-note">${escape(data.note)}</p><div class="htc-pack-grid">${cards}</div><details class="htc-pack-comparison"><summary>Comparar los servicios incluidos, uno por uno</summary><div class="htc-pack-table-scroll" role="region" aria-label="Comparativa de packs" tabindex="0"><table><caption>Servicios incluidos en Essential, Privacy y Elite</caption><thead><tr><th scope="col">Configuración o servicio</th>${data.packs.map(pack => `<th scope="col">${pack.id}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div></details><p class="htc-pack-note">¿No sabes cuál elegir? Puedes solicitar asesoramiento antes de decidir. Comprobaremos las apps que necesitas, la compatibilidad del dispositivo y la cobertura de la eSIM antes de confirmar el presupuesto.</p></div></section>`;
    const target = join(root, path);
    const html = await readFile(target, 'utf8');
    const region = /<!-- HTC_PACKS_START -->[\s\S]*?<!-- HTC_PACKS_END -->/;
    if (!region.test(html)) throw new Error(`Missing pack section markers in ${path}`);
    await writeFile(target, html.replace(region, `<!-- HTC_PACKS_START -->\n${markup}\n<!-- HTC_PACKS_END -->`));
  }
}
