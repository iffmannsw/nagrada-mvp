/* ═══════════════════════════════════════════════════════════
   РАСПОРТ — витрина двух складов (v2: варианты внутри карточки)
   Магазин:         data/shop-stock.json   (1С + фото поставщика)
   Удалённый склад: data/remote-stock.json (парсер rossimvol v2)
   Один артикул = одна карточка; цвет/размер — варианты с фото
   и остатком, как у поставщика. В корзину уходит вариант.
   ═══════════════════════════════════════════════════════════ */

const Shop = (() => {
  const state = {
    mode: 'shop', cat: 'all', q: '', sort: 'pop',
    shown: 0, perPage: 24,
    goods: { shop: [], remote: [] },
    meta: { shop: null, remote: null },
  };

  const SHOP_FALLBACK = { updated: '(локальный срез)', warehouse: 'Магазин центральный', count: 2, items: [
    { art: 'D-40', name: 'Медаль D-40', cat: 'medal', theme: 'universal', price: 140, stock: 270,
      variants: [{ metal: 'mix', char: 'микс', inStock: 270, avail: 270, price: 140, img: null }] },
    { art: 'MMC 4150VOL', name: 'Медаль MMC 4150VOL', cat: 'medal', theme: 'volleyball', price: 150, stock: 242,
      variants: [
        { metal: 'gold', char: 'золото', inStock: 84, avail: 84, price: 150, img: null },
        { metal: 'silver', char: 'серебро', inStock: 82, avail: 82, price: 150, img: null },
        { metal: 'bronze', char: 'бронза', inStock: 76, avail: 76, price: 150, img: null }] },
  ]};
  const REMOTE_FALLBACK = { updated: '(локальный срез)', count: 2, items: [
    { url: '#', art: '8300', name: 'Кубок 8300', cat: 'cup', theme: 'universal', retail: 575, badge: 'new',
      variants: [{ kind: 'metal', metal: 'gold', size: '', suffix: 'G', label: 'Кубок 8300/G', supplierPrice: 575, qty: 100, inStock: true, img: 'img/cup_8300.jpg' }] },
    { url: '#', art: 'GR-18', name: 'Грамота ГР-18', cat: 'gramota', theme: 'universal', retail: 25, badge: null,
      variants: [{ kind: 'single', metal: '', size: '', suffix: '', label: 'Грамота ГР-18', supplierPrice: 25, qty: 2904, inStock: true, img: 'img/gramota_gr18.jpg' }] },
  ]};

  async function loadJSON(url, fallback) {
    try {
      const r = await fetch(url, { cache: 'no-cache' });
      if (!r.ok) throw new Error(r.status);
      return await r.json();
    } catch (e) {
      console.warn(`[shop] ${url} недоступен (${e.message}) — встроенный срез`);
      return fallback;
    }
  }

  const METAL_DOT = { gold: '#D4AF37', silver: '#C0C0C8', bronze: '#CD7F32', mix: 'linear-gradient(135deg,#D4AF37 50%,#C0C0C8 50%)' };
  /* очерёдность вариантов: 1 место — золото, 2 — серебро, 3 — бронза;
     размеры — по возрастанию */
  const PLACE_ORDER = { gold: 0, silver: 1, bronze: 2, antique: 3, mix: 4 };
  const sortVariants = vs => vs.slice().sort((a, b) => {
    const ka = PLACE_ORDER[a.metal] ?? 9, kb = PLACE_ORDER[b.metal] ?? 9;
    if (ka !== kb) return ka - kb;
    const sa = parseFloat(a.size) || 0, sb = parseFloat(b.size) || 0;
    return sa - sb;
  });
  const RIBBON_BY_THEME = { football: 'green', hockey: 'blue', chess: 'black',
    volleyball: 'blue', run: 'blue', school: 'blue', victory: 'red', universal: 'red' };

  /* первый вариант с фото — обложка карточки */
  const coverVariant = vs => vs.find(v => v.img) || vs[0] || null;
  const varArtHTML = (p, v) => {
    if (v && v.img) return `<img class="psvg" src="${v.img}" alt="${p.name}" loading="lazy">`;
    const metal = (v && v.metal === 'mix') ? 'gold' : (v && v.metal) || 'gold';
    if (p.cat === 'gramota') return svgArt({ kind: 'gramota', accent: 'red' });
    if (p.cat === 'cup') return svgArt({ kind: 'cup', metal, base: 'dark' });
    return svgArt({ kind: 'medal', metal, icon: null, ribbon: RIBBON_BY_THEME[p.theme] || 'red' });
  };

  function normShop(g) {
    const vs = sortVariants((g.variants || []).map((v, i) => ({
      idx: i, kind: 'metal', metal: v.metal || 'mix', size: '',
      label: v.char || METAL_LABELS[v.metal] || '',
      img: v.img || null, price: v.price,
      avail: v.avail ?? v.inStock ?? 0, inStock: v.inStock ?? v.avail ?? 0,
    })));
    const cover = coverVariant(vs);
    return {
      id: 'S:' + g.art, src: 'shop', url: null,
      name: (g.name || '').replace(/\s+/g, ' ').trim(), art: g.art,
      cat: g.cat || 'medal', theme: g.theme || 'universal',
      price: g.price ?? Math.min(...vs.map(v => v.price)),
      stock: g.stock ?? vs.reduce((s, v) => s + v.avail, 0),
      variants: vs, cover,
      pop: (g.stock || 0),
    };
  }

  function normRemote(g) {
    const vs = sortVariants((g.variants || []).map((v, i) => ({
      idx: i, kind: v.kind || 'single', metal: v.metal || '', size: v.size || '',
      label: v.kind === 'size' ? (v.size + ' см') : (v.label || v.code || ''),
      img: v.img ? (String(v.img).startsWith('img/') ? v.img : null) : null,
      price: v.supplierPrice || g.retail,
      avail: 0, inStock: !!v.inStock, qty: v.qty || 0,
    })));
    return {
      id: 'R:' + g.art, src: 'remote', url: g.url,
      name: g.name, art: g.art, cat: g.cat, theme: g.theme || 'universal',
      badge: g.badge || null,
      price: g.retail ?? Math.min(...vs.map(v => v.price)),
      stock: 0, variants: vs, cover: coverVariant(vs),
      pop: g.badge === 'hit' ? 3 : g.badge === 'new' ? 2 : 1,
    };
  }

  async function init() {
    const [shopRaw, remoteRaw] = await Promise.all([
      loadJSON('data/shop-stock.json', SHOP_FALLBACK),
      loadJSON('data/remote-stock.json', REMOTE_FALLBACK),
    ]);
    state.meta.shop = { updated: shopRaw.updated, warehouse: shopRaw.warehouse };
    state.meta.remote = { updated: remoteRaw.updated };
    state.goods.shop = (shopRaw.items || []).map(normShop);
    state.goods.remote = (remoteRaw.items || []).map(normRemote);
    state.perPage = 24;

    document.getElementById('statShop').textContent = shopRaw.totalArts || state.goods.shop.length;
    document.getElementById('statRemote').textContent = state.goods.remote.length;
    document.getElementById('modeShopCount').textContent = state.goods.shop.length;
    document.getElementById('modeRemoteCount').textContent = state.goods.remote.length;
    renderCats();
    render();
  }

  function filtered() {
    let list = state.goods[state.mode].slice();
    if (state.cat !== 'all') list = list.filter(p => p.cat === state.cat);
    if (state.q.trim()) {
      const q = state.q.trim().toLowerCase();
      list = list.filter(p => (p.name + ' ' + p.art + ' ' + p.variants.map(v => v.label).join(' ')).toLowerCase().includes(q));
    }
    const s = state.sort;
    if (s === 'priceAsc') list.sort((a, b) => a.price - b.price);
    else if (s === 'priceDesc') list.sort((a, b) => b.price - a.price);
    else if (s === 'stockDesc') list.sort((a, b) => (a.stock || 0) - (b.stock || 0));
    else list.sort((a, b) => b.pop - a.pop);
    return list;
  }

  function renderCats() {
    const wrap = document.getElementById('catTabs');
    const counts = {};
    for (const p of state.goods[state.mode]) counts[p.cat] = (counts[p.cat] || 0) + 1;
    const cats = Object.keys(CATS).filter(c => counts[c]);
    wrap.innerHTML = ['all', ...cats].map(c => {
      const on = state.cat === c ? ' is-on' : '';
      const label = c === 'all' ? 'Все' : CATS[c].label;
      const n = c === 'all' ? state.goods[state.mode].length : counts[c];
      return `<button data-cat="${c}" class="${on}">${label} · ${n}</button>`;
    }).join('');
  }

  /* свотчи вариантов: цветовые точки у медалей, размеры у кубков */
  function swatchesHTML(p) {
    if (p.variants.length <= 1) return '';
    if (p.variants[0].kind === 'size') {
      return `<div class="swatches swatches--size" data-swatches>` +
        p.variants.map((v, i) =>
          `<button class="swatch${i === 0 ? ' is-on' : ''}" data-vi="${i}" title="${v.label}">${v.size}</button>`).join('') +
        `</div>`;
    }
    return `<div class="swatches" data-swatches>` +
      p.variants.map((v, i) =>
        `<button class="swatch swatch--dot${i === 0 ? ' is-on' : ''}" data-vi="${i}" title="${METAL_LABELS[v.metal] || v.label}" style="--dot:${METAL_DOT[v.metal] || '#ccc'}"></button>`).join('') +
      `</div>`;
  }

  function cardHTML(p) {
    const catLabel = CATS[p.cat] ? CATS[p.cat].label : '';
    const isShop = p.src === 'shop';
    const v0 = p.cover || p.variants[0];
    let flag = '';
    if (p.badge === 'hit') flag = `<span class="p-card__flag">хит поставщика</span>`;
    else if (p.badge === 'new') flag = `<span class="p-card__flag p-card__flag--order">новинка</span>`;
    else if (isShop && p.stock <= 10) flag = `<span class="p-card__flag p-card__flag--low">осталось ${p.stock}</span>`;
    const stockHTML = isShop
      ? `<span class="p-card__stock"><b data-stock>${v0 ? v0.avail : p.stock} шт</b> · отгрузка сразу</span>`
      : `<span class="p-card__stock p-card__stock--order">под заказ · 5–7 дней</span>`;
    return `<article class="p-card" data-id="${p.id}" tabindex="0" role="button" aria-label="${p.name}">
      <div class="p-card__art">
        <span class="p-card__cat">${catLabel}</span>
        ${flag}
        <span data-art>${varArtHTML(p, v0)}</span>
      </div>
      <div class="p-card__body">
        <div class="p-card__name">${p.name}</div>
        ${swatchesHTML(p)}
        <div class="p-card__row">
          <div class="p-card__price" data-price>${fmt(p.price)}</div>
          ${stockHTML}
        </div>
      </div>
    </article>`;
  }

  function render(reset = true) {
    if (reset) state.shown = state.perPage;
    const list = filtered();
    const slice = list.slice(0, state.shown);
    document.getElementById('productGrid').innerHTML = slice.map(cardHTML).join('');
    const meta = document.getElementById('gridMeta');
    const src = SOURCES[state.mode];
    meta.innerHTML = `<span>${src.label} · показано <b>${slice.length}</b> из ${list.length}</span>
      <span>обновлено: ${(state.meta[state.mode].updated || '—').replace('T', ' ').slice(0, 16)}</span>`;
    document.getElementById('moreBtn').hidden = state.shown >= list.length;
  }

  /* клик по свотчу внутри карточки: меняет фото/цену/остаток */
  function onSwatchClick(card, p, vi) {
    const v = p.variants[vi];
    if (!v) return;
    card.querySelector('[data-art]').innerHTML = varArtHTML(p, v);
    card.querySelector('[data-price]').textContent = fmt(v.price);
    const stockEl = card.querySelector('[data-stock]');
    if (stockEl) stockEl.textContent = v.avail + ' шт';
    card.querySelectorAll('.swatch').forEach(b => b.classList.toggle('is-on', +b.dataset.vi === vi));
  }

  function bindEvents() {
    document.querySelectorAll('.mode__btn').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('.mode__btn').forEach(x => { x.classList.remove('is-active'); x.setAttribute('aria-selected', 'false'); });
      b.classList.add('is-active'); b.setAttribute('aria-selected', 'true');
      state.mode = b.dataset.mode;
      state.cat = 'all';
      renderCats();
      render();
    }));
    document.getElementById('catTabs').addEventListener('click', e => {
      const b = e.target.closest('[data-cat]');
      if (!b) return;
      state.cat = b.dataset.cat;
      renderCats();
      render();
    });
    const searchEl = document.getElementById('searchInput');
    searchEl.addEventListener('input', () => { state.q = searchEl.value; render(); });
    document.getElementById('sortSelect').addEventListener('change', e => { state.sort = e.target.value; render(); });
    document.getElementById('moreBtn').addEventListener('click', () => render(false));

    const grid = document.getElementById('productGrid');
    grid.addEventListener('click', e => {
      const sw = e.target.closest('.swatch');
      const card = e.target.closest('.p-card');
      if (!card) return;
      const p = byId(card.dataset.id);
      if (!p) return;
      if (sw) { onSwatchClick(card, p, +sw.dataset.vi); e.stopPropagation(); return; }
      App.openProduct(p.id, 0);
    });
    grid.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const card = e.target.closest('.p-card');
        if (card) App.openProduct(card.dataset.id, 0);
      }
    });
  }

  function byId(id) {
    const pool = id[0] === 'S' ? state.goods.shop : state.goods.remote;
    return pool.find(p => p.id === id);
  }

  return { init, bindEvents, filtered, byId, state, varArtHTML };
})();
