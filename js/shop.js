/* ═══════════════════════════════════════════════════
   РАСПОРТ — витрина двух складов
   Магазин:        data/shop-stock.json   (конвертер 1С: tools/convert_1c.py)
   Удалённый склад: data/remote-stock.json (парсер: tools/parse_rossimvol.py)
   Фоллбэк при file:// (fetch запрещён) — компактный встроенный срез ниже.
   ═══════════════════════════════════════════════════ */

const Shop = (() => {
  const state = {
    mode: 'shop',           // shop | remote
    cat: 'all',
    q: '',
    sort: 'pop',
    shown: 0,
    perPage: 24,
    goods: { shop: [], remote: [] },
    meta: { shop: null, remote: null },
  };

  /* ── встроенный срез на случай file:// без сервера ── */
  const SHOP_FALLBACK = { updated: '(локальный срез)', warehouse: 'Магазин центральный', count: 8, items: [
    { name: 'Медаль D-40 (микс)', art: 'D-40', metal: 'mix', cat: 'medal', theme: 'universal', inStock: 270, avail: 270, price: 140 },
    { name: 'Медаль D-50 (микс)', art: 'D-50', metal: 'mix', cat: 'medal', theme: 'universal', inStock: 81, avail: 81, price: 150 },
    { name: 'Медаль D-70 (микс)', art: 'D-70', metal: 'mix', cat: 'medal', theme: 'universal', inStock: 130, avail: 130, price: 200 },
    { name: 'Медаль MMC 5057 (золото)', art: 'MMC 5057', metal: 'gold', cat: 'medal', theme: 'universal', inStock: 81, avail: 81, price: 150 },
    { name: 'Медаль MMC 4150VOL (серебро)', art: 'MMC 4150VOL', metal: 'silver', cat: 'medal', theme: 'volleyball', inStock: 82, avail: 82, price: 150 },
    { name: 'Медаль MZ 110-50 (бронза)', art: 'MZ 110-50', metal: 'bronze', cat: 'medal', theme: 'universal', inStock: 10, avail: 10, price: 150 },
    { name: 'Медаль MMC 1270 (золото)', art: 'MMC 1270', metal: 'gold', cat: 'medal', theme: 'universal', inStock: 5, avail: 5, price: 150 },
    { name: 'Медаль MD RUS 454 (серебро)', art: 'MD RUS 454', metal: 'silver', cat: 'medal', theme: 'victory', inStock: 17, avail: 17, price: 150 },
  ]};
  const REMOTE_FALLBACK = { updated: '(локальный срез)', count: 6, items: [
    { url: '#', art: '8300', name: 'Кубок 8300', cat: 'cup', theme: 'universal', retail: 575, wholesale: 359, img: 'img/cup_8300.jpg' },
    { url: '#', art: '3018', name: 'Кубок 3018', cat: 'cup', theme: 'universal', retail: 2790, img: 'img/cup_3018.jpg' },
    { url: '#', art: '4024', name: 'Кубок 4024', cat: 'cup', theme: 'universal', retail: 2525, img: 'img/cup_4024.jpg' },
    { url: '#', art: '3535', name: 'Кубок 3535 Триколор', cat: 'cup', theme: 'universal', retail: 2200, img: 'img/cup_3535.jpg' },
    { url: '#', art: 'GR-18', name: 'Грамота ГР-18', cat: 'gramota', theme: 'universal', retail: 25, img: 'img/gramota_gr18.jpg' },
    { url: '#', art: 'GR-60', name: 'Грамота ГР-60', cat: 'gramota', theme: 'universal', retail: 25, img: 'img/gramota_gr60.jpg' },
  ]};

  async function loadJSON(url, fallback) {
    try {
      const r = await fetch(url, { cache: 'no-cache' });
      if (!r.ok) throw new Error(r.status);
      return await r.json();
    } catch (e) {
      console.warn(`[shop] ${url} недоступен (${e.message}) — работаем на встроенном срезе`);
      return fallback;
    }
  }

  /* фото магазина по артикулу, если скачано; иначе SVG по металлу */
  const SHOP_IMG = {
    'MMC 7071': 'img/medal_mmc7071.jpg', 'MD 1750': 'img/medal_md1750.jpg',
    'MD 2450': 'img/medal_md2450.jpg', 'MMC 6064': 'img/medal_mmc6064.jpg',
    'MMC 2350': 'img/medal_mmc2350.jpg', 'ME 005': 'img/medal_me005.jpg',
    'ME 008': 'img/medal_me008.jpg', 'MMA 4510': 'img/medal_mma4510.jpg',
    'MMC 3350': 'img/medal_mmc3350.jpg',
  };
  const RIBBON_BY_THEME = { football: 'green', hockey: 'blue', chess: 'black',
    volleyball: 'blue', run: 'blue', school: 'blue', victory: 'red', universal: 'red' };

  function normShop(it) {
    const metal = (it.metal === 'mix') ? 'gold' : it.metal;
    const name = it.name.replace(/\s+/g, ' ').trim();
    return {
      id: 'S:' + it.art + ':' + it.char,
      src: 'shop', url: null,
      name, art: it.art,
      cat: it.cat || 'medal', theme: it.theme || 'universal',
      price: it.price, wholesale: null,
      stock: it.avail ?? it.inStock, inStock: it.inStock,
      metal: it.metal, char: it.char,
      img: SHOP_IMG[it.art] || null,
      artc: { kind: 'medal', metal, icon: null, ribbon: RIBBON_BY_THEME[it.theme] || 'red' },
      pop: (it.avail ?? 0) * (KNOWN_HIT.has(it.art) ? 3 : 1),
    };
  }

  const KNOWN_HIT = new Set(['D-40', 'D-50', 'D-70', 'MMC 5057', 'MMC 4150VOL']);

  function normRemote(it) {
    return {
      id: 'R:' + it.art,
      src: 'remote', url: it.url,
      name: it.name, art: it.art,
      cat: it.cat, theme: it.theme || 'universal',
      price: it.retail, wholesale: it.wholesale,
      stock: 0, inStock: 0,             // остаток поставщика не публикуем — «под заказ»
      img: it.img || null,
      artc: it.cat === 'gramota' ? { kind: 'gramota', accent: 'red' } : { kind: 'cup', metal: 'gold', base: 'dark' },
      pop: it.retail < 700 ? 2 : 1,     // доступные кубки повыше
    };
  }

  /* ── инициализация ── */
  async function init() {
    const [shopRaw, remoteRaw] = await Promise.all([
      loadJSON('data/shop-stock.json', SHOP_FALLBACK),
      loadJSON('data/remote-stock.json', REMOTE_FALLBACK),
    ]);
    state.meta.shop = { updated: shopRaw.updated, warehouse: shopRaw.warehouse, count: shopRaw.count };
    state.meta.remote = { updated: remoteRaw.updated, count: remoteRaw.count };
    state.goods.shop = (shopRaw.items || []).map(normShop);
    state.goods.remote = (remoteRaw.items || []).map(normRemote);

    document.getElementById('statShop').textContent = state.goods.shop.length;
    document.getElementById('statRemote').textContent = state.goods.remote.length;
    document.getElementById('modeShopCount').textContent = state.goods.shop.length;
    document.getElementById('modeRemoteCount').textContent = state.goods.remote.length;
    renderCats();
    render();
  }

  /* ── фильтрация ── */
  function filtered() {
    let list = state.goods[state.mode].slice();
    if (state.cat !== 'all') list = list.filter(p => p.cat === state.cat);
    if (state.q.trim()) {
      const q = state.q.trim().toLowerCase();
      list = list.filter(p => (p.name + ' ' + p.art + ' ' + (p.char || '')).toLowerCase().includes(q));
    }
    const s = state.sort;
    if (s === 'priceAsc') list.sort((a, b) => a.price - b.price);
    else if (s === 'priceDesc') list.sort((a, b) => b.price - a.price);
    else if (s === 'stockDesc') list.sort((a, b) => (a.inStock || 0) - (b.inStock || 0));
    else list.sort((a, b) => b.pop - a.pop);
    return list;
  }

  /* ── категории под активный склад ── */
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

  /* ── витрина ── */
  function cardHTML(p) {
    const catLabel = CATS[p.cat] ? CATS[p.cat].label : '';
    const isShop = p.src === 'shop';
    let flag = '';
    if (isShop && p.inStock <= 10) flag = `<span class="p-card__flag p-card__flag--low">осталось ${p.inStock}</span>`;
    else if (!isShop) flag = `<span class="p-card__flag p-card__flag--order">под заказ</span>`;
    const stockHTML = isShop
      ? `<span class="p-card__stock"><b>${p.inStock} шт</b> · выдача сегодня</span>`
      : `<span class="p-card__stock p-card__stock--order">2–3 дня</span>`;
    const metalLabel = METAL_LABELS[p.metal] || p.metal || '';
    const charLabel = (p.char || '').toLowerCase();
    const sub = isShop
      ? (charLabel && charLabel !== metalLabel ? `${metalLabel} · ${p.char}` : metalLabel || p.char || '')
      : (p.wholesale ? `опт поставщика ${fmt(p.wholesale)}` : 'склад поставщика');
    return `<article class="p-card" data-id="${p.id}" tabindex="0" role="button" aria-label="${p.name}">
      <div class="p-card__art">
        <span class="p-card__cat">${catLabel}</span>
        ${flag}
        ${productArt(p)}
      </div>
      <div class="p-card__body">
        <div class="p-card__name">${p.name}</div>
        <div class="p-card__sub">${sub}</div>
        <div class="p-card__row">
          <div class="p-card__price">${fmt(p.price)}</div>
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
      <span>обновлено: ${state.meta[state.mode].updated || '—'}</span>`;
    document.getElementById('moreBtn').hidden = state.shown >= list.length;
  }

  /* ── события ── */
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
    document.getElementById('productGrid').addEventListener('click', e => {
      const card = e.target.closest('.p-card');
      if (card) App.openProduct(card.dataset.id);
    });
    document.getElementById('productGrid').addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const card = e.target.closest('.p-card');
        if (card) App.openProduct(card.dataset.id);
      }
    });
  }

  function byId(id) {
    const pool = id[0] === 'S' ? state.goods.shop : state.goods.remote;
    return pool.find(p => p.id === id);
  }

  return { init, bindEvents, filtered, byId, state };
})();
