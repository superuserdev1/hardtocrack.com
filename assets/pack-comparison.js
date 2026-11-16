(function () {
  "use strict";
  const section = document.querySelector('[data-pack-context]');
  if (!section) return;
  const context = section.dataset.packContext;
  if (context === 'order' && document.getElementById('orderForm').hidden) { section.hidden = true; return; }
  const normalize = value => window.HTCDirect ? HTCDirect.normalize(value) : String(value || '').trim().toUpperCase();
  const params = new URLSearchParams(location.search);
  const reference = normalize(params.get('ref') || params.get('store') || params.get('partner'));
  const pref = window.HTCDirect && HTCDirect.preferred ? HTCDirect.preferred(location.search) : null;
  if (context === 'prices' && pref && pref.channel === 'partner') {
    HTCDirect.routePedidosAnchors(pref.code);
  }
  section.querySelectorAll('[data-htc-pack]').forEach(control => {
    const pack = control.dataset.htcPack;
    if (context === 'prices') {
      if (pref && pref.channel === 'partner') {
        control.href = HTCDirect.partnerCheckout(pref.code, pack).href;
        return;
      }
      const destination = new URL('/pedidos/', location.origin);
      destination.searchParams.set('pack', pack);
      destination.searchParams.set('ref', (pref && pref.code) || reference || (window.HTCDirect && HTCDirect.defaultCode) || 'HTC-WEB-001');
      control.href = destination.href;
      return;
    }
    control.addEventListener('click', () => {
      if (context === 'guide') {
        document.dispatchEvent(new CustomEvent('htc:choose-pack', { detail: { pack } }));
        return;
      }
      const select = document.getElementById('orderPack');
      if (!select || document.getElementById('orderForm').hidden) return;
      select.value = pack;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      select.scrollIntoView({ behavior: 'smooth', block: 'center' });
      select.focus({ preventScroll: true });
    });
  });
  if (context !== 'order') return;
  const select = document.getElementById('orderPack');
  const panel = document.getElementById('selectedPackInfo');
  function updateExtras() {
    const included = {
      'Mullvad VPN': ['Privacy','Elite'],
      'Proton Plus': ['Elite'],
      'SimpleLogin Premium': ['Elite'],
      'Dominio personal': ['Elite'],
      'eSIM (consultar zona, GB y duración)': ['Privacy','Elite']
    };
    document.querySelectorAll('input[name="extras"]').forEach(input => {
      if (!included[input.value]) return;
      const isIncluded = included[input.value].includes(select.value);
      input.disabled = isIncluded;
      if (isIncluded) input.checked = false;
      let badge = input.parentElement.querySelector('.htc-included-badge');
      if (!badge) { badge = document.createElement('span'); badge.className = 'htc-included-badge'; input.parentElement.append(badge); }
      badge.textContent = isIncluded ? `Incluido en ${select.value}` : '';
      badge.hidden = !isIncluded;
    });
  }
  function updateSelection() {
    const card = Array.from(section.querySelectorAll('[data-pack-card]')).find(item => item.dataset.packCard === select.value);
    panel.replaceChildren();
    updateExtras();
    if (!card) {
      const text = document.createElement('p');
      text.textContent = select.value === 'Consultar' ? 'Te propondremos el pack o los servicios que encajen con tus necesidades.' : 'Elige un pack para consultar aquí lo que incluye.';
      panel.append(text);
      return;
    }
    const title = document.createElement('h3');
    title.textContent = `Has elegido ${select.value}`;
    panel.append(title);
    const list = document.createElement('ul');
    const column = ['Essential','Privacy','Elite'].indexOf(select.value) + 1;
    section.querySelectorAll('tbody tr').forEach(row => {
      const value = row.children[column].textContent;
      if (value.startsWith('No ')) return;
      const item = document.createElement('li');
      item.textContent = `${row.children[0].textContent}: ${value}`;
      list.append(item);
    });
    panel.append(list);
    const note = document.createElement('p');
    note.textContent = card.querySelector('.htc-pack-clarification').textContent;
    panel.append(note);
    const compare = document.createElement('a');
    compare.href = '#packs';
    compare.textContent = 'Volver a comparar los tres packs';
    panel.append(compare);
  }
  select.addEventListener('change', updateSelection);
  updateSelection();
})();
