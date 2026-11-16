function filterArticles(articles, query = {}) {
  const spec = normalizeQuery(query);
  return articles.filter((article) => {
    if (spec.publishedOnly && article.status !== 'published') return false;
    const secondary = article.secondary_categories || [];
    if (spec.serie && article.series !== spec.serie) return false;
    if (spec.categoria && article.primary_category !== spec.categoria && !secondary.includes(spec.categoria)) return false;
    if (spec.tags.length && !spec.tags.every((tag) => (article.tags || []).includes(tag))) return false;
    if (spec.q) {
      const headings = (article.headings || []).map((heading) => heading.text || heading);
      const hay = article.search_text || [
        article.title,
        article.seo_title,
        article.description,
        article.primary_category,
        ...secondary,
        ...(article.tags || []),
        ...headings,
      ].join('\n');
      if (!hay.toLowerCase().includes(spec.q.toLowerCase())) return false;
    }
    return true;
  });
}
function normalizeQuery(query = {}) {
  const categoria = String(query.categoria || query.category || '').trim();
  const q = String(query.q || '').trim();
  const raw = Array.isArray(query.tags) ? query.tags : String(query.tags || '').split(',');
  const tags = [...new Set(raw.map((tag) => String(tag).trim()).filter(Boolean))].sort();
  const serie = String(query.serie || query.series || '').trim();
  return { categoria, tags, q, serie, publishedOnly: Boolean(query.publishedOnly) };
}
const menu = document.querySelector('.menu-button');
const nav = document.querySelector('.nav-links');
if (menu && nav) {
  menu.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menu.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.classList.contains('open')) {
      nav.classList.remove('open');
      menu.setAttribute('aria-expanded', 'false');
      menu.focus();
    }
  });
}

const catalogNode = document.getElementById('academia-catalog');
const form = document.querySelector('[data-filters]');
if (!catalogNode || !form) {
  /* Las fichas solo usan el menú. */
} else {
  const articles = JSON.parse(catalogNode.textContent).articles;
  const list = document.querySelector('[data-results]');
  const count = document.querySelector('[data-count]');
  const empty = document.querySelector('[data-empty]');
  const activeWrap = document.querySelector('[data-active-filters]');
  const activeList = document.querySelector('[data-active-list]');
  const advanced = document.querySelector('[data-advanced]');
  const clearFallback = document.querySelector('[data-clear-fallback]');
  let initial = true;

  function readForm() {
    return {
      categoria: form.querySelector('[name="categoria"]').value,
      serie: form.querySelector('[name="serie"]').value,
      q: form.querySelector('[name="q"]').value,
      tags: [...form.querySelectorAll('[name="tags"]:checked')].map((box) => box.value),
    };
  }

  function labelFor(name, value) {
    if (name === 'q') return `Buscar: ${value}`;
    if (name === 'serie') {
      const opt = form.querySelector(`[name="serie"] option[value="${CSS.escape(value)}"]`);
      return `Serie: ${opt ? opt.textContent : value}`;
    }
    if (name === 'categoria') {
      const opt = form.querySelector(`[name="categoria"] option[value="${CSS.escape(value)}"]`);
      return `Categoría: ${opt ? opt.textContent : value}`;
    }
    const box = form.querySelector(`[name="tags"][value="${CSS.escape(value)}"]`);
    const text = box?.closest('label')?.textContent?.trim() || value;
    return `Tag: ${text}`;
  }

  function renderActive(query) {
    if (!activeWrap || !activeList) return;
    activeList.replaceChildren();
    const chips = [];
    if (query.q) chips.push({ name: 'q', value: query.q });
    if (query.serie) chips.push({ name: 'serie', value: query.serie });
    if (query.categoria) chips.push({ name: 'categoria', value: query.categoria });
    for (const tag of query.tags) chips.push({ name: 'tags', value: tag });
    const has = chips.length > 0;
    activeWrap.hidden = !has;
    if (clearFallback) clearFallback.hidden = has;
    if (advanced && query.tags.length) advanced.open = true;
    for (const chip of chips) {
      const li = document.createElement('li');
      li.textContent = labelFor(chip.name, chip.value);
      activeList.append(li);
    }
  }

  function render(items) {
    list.replaceChildren();
    for (const article of items) {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = article.href;
      link.textContent = article.title;
      const copy = document.createElement('p');
      copy.textContent = article.description;
      const meta = document.createElement('p');
      meta.className = 'result-meta';
      meta.textContent = `${article.series_label} · ${article.category_label} · ${article.tags.join(', ')}`;
      item.append(link, copy, meta);
      list.append(item);
    }
    count.textContent = `${items.length} ${items.length === 1 ? 'resultado' : 'resultados'}`;
    empty.hidden = items.length !== 0;
  }

  function writeUrl(query, push) {
    const params = new URLSearchParams();
    if (query.categoria) params.set('categoria', query.categoria);
    if (query.serie) params.set('serie', query.serie);
    if (query.tags.length) params.set('tags', query.tags.join(','));
    if (query.q) params.set('q', query.q);
    const next = `${location.pathname}${params.toString() ? `?${params}` : ''}`;
    try {
      if (initial) history.replaceState(null, '', next);
      else if (push) history.pushState(null, '', next);
    } catch {
      /* file:// puede rechazar history. */
    }
  }

  function apply(push) {
    const query = normalizeQuery(readForm());
    render(filterArticles(articles, query));
    renderActive(query);
    writeUrl(query, push);
    initial = false;
  }

  function fillFromLocation() {
    const params = new URLSearchParams(location.search);
    form.querySelector('[name="categoria"]').value = params.get('categoria') || '';
    form.querySelector('[name="serie"]').value = params.get('serie') || '';
    form.querySelector('[name="q"]').value = params.get('q') || '';
    const selected = new Set((params.get('tags') || '').split(',').filter(Boolean));
    for (const box of form.querySelectorAll('[name="tags"]')) box.checked = selected.has(box.value);
  }

  form.addEventListener('submit', (event) => event.preventDefault());
  form.querySelector('[name="q"]').addEventListener('input', () => apply(true));
  form.addEventListener('change', (event) => {
    if (event.target.name === 'q') return;
    apply(true);
  });
  function clearFilters() {
    form.reset();
    if (advanced) advanced.open = false;
    apply(true);
  }
  document.querySelectorAll('[data-clear], [data-clear-fallback]').forEach((btn) => {
    btn.addEventListener('click', clearFilters);
  });
  document.querySelector('[data-clear-inline]')?.addEventListener('click', clearFilters);
  window.addEventListener('popstate', () => {
    fillFromLocation();
    apply(false);
  });
  fillFromLocation();
  apply(false);
}
