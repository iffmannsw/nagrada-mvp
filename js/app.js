/* ═══════════════════════════════════════════════════
   «Наградной магазин» MVP — интерфейс: каталог, корзина,
   оформление заказа, чат с Медалькиным
   ═══════════════════════════════════════════════════ */
(() => {
  'use strict';

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  /* ── состояние ── */
  const cart = new Map();          // id → qty
  const state = { cat: 'all', q: '', sort: 'default' };
  let orderNum = null;
  let chatOpened = false;

  const brain = new MedalkinBrain(PRODUCTS);
  const byId = id => PRODUCTS.find(p => p.id === id);

  /* ══════════ КОМПЛЕКТЫ ══════════ */
  function kitComposition(c) {
    const g2 = c.gramota2 && byId(c.gramota2), g = c.gramota && byId(c.gramota);
    const cup = c.cup && byId(c.cup), ml = c.medalL && byId(c.medalL), mr = c.medalR && byId(c.medalR);
    return `
      ${g2 ? `<div class="kit__comp-item kit__comp-item--gramota2">${svgArt(g2.artc)}</div>` : ''}
      ${g ? `<div class="kit__comp-item kit__comp-item--gramota">${svgArt(g.artc)}</div>` : ''}
      ${cup ? `<div class="kit__comp-item kit__comp-item--cup">${svgArt(cup.artc)}</div>` : ''}
      ${ml ? `<div class="kit__comp-item kit__comp-item--medal-l">${svgArt(ml.artc)}</div>` : ''}
      ${mr ? `<div class="kit__comp-item kit__comp-item--medal-r">${svgArt(mr.artc)}</div>` : ''}`;
  }
  function kitPrice(kit) {
    const sum = kit.items.reduce((s, [id, q]) => s + byId(id).price * q, 0);
    return { sum, total: Math.round(sum * (1 - KIT_DISCOUNT)) };
  }
  function renderKits() {
    $('#kitsGrid').innerHTML = KITS.map(k => {
      const { sum, total } = kitPrice(k);
      return `<article class="kit" data-kit="${k.id}">
        <div class="kit__scene">
          <span class="kit__scene-badge">Комплектом дешевле · <b>−10%</b></span>
          <div class="kit__composition">${kitComposition(k.composition)}</div>
        </div>
        <div class="kit__body">
          <span class="kit__num">${k.num} / ${KITS.length}</span>
          <h3 class="kit__name">${k.name}</h3>
          <p class="kit__scene-desc">${k.scene}</p>
          <ul class="kit__list">
            ${k.items.map(([id, q]) => `<li><span class="li-name">${byId(id).name}</span><span class="li-qty">× ${q}</span></li>`).join('')}
          </ul>
          <div class="kit__foot">
            <div class="kit__price">
              <span class="price">${fmt(total)}</span>
              <span class="price--old">${fmt(sum)}</span>
            </div>
            <button class="btn btn--coral" data-addkit="${k.id}" type="button">В корзину</button>
          </div>
        </div>
      </article>`;
    }).join('');
  }
  function addKitToCart(kitId) {
    const k = KITS.find(x => x.id === kitId);
    if (!k) return;
    k.items.forEach(([id, q]) => cart.set(id, (cart.get(id) || 0) + q));
    updateCartUI();
    toast(`Комплект «${k.name}» — в корзине`);
  }

  /* ══════════ МАСКОТЫ ══════════ */
  $('#heroMascot').innerHTML = mascotSVG();
  $('#fabMascot').innerHTML = mascotSVG();
  $('#chatMascot').innerHTML = mascotSVG();
  $('#doneMedal').innerHTML = `<div class="mascot">${mascotSVG({ happy: true })}</div>`;
  $('#factCount').textContent = PRODUCTS.length;

  /* ── пузырь на hero: смена фраз ── */
  const phrases = [
    'Привет! Я Медалькин — помогу подобрать награды и собрать заказ',
    'Скажите, какое мероприятие готовите — подберу под бюджет',
    'Медали от 49 ₽, грамоты от 29 ₽, кубки от 344 ₽ — всё с нанесением',
  ];
  let phI = 0;
  setInterval(() => {
    const b = $('#heroBubble');
    b.style.opacity = '0';
    setTimeout(() => { phI = (phI + 1) % phrases.length; b.textContent = phrases[phI]; b.style.opacity = '1'; }, 260);
  }, 7000);
  $('#heroBubble').style.transition = 'opacity .26s ease';

  /* ══════════ КАТАЛОГ ══════════ */
  const tabsBox = $('#catTabs');
  function renderTabs() {
    const counts = { all: PRODUCTS.length };
    Object.keys(CATS).forEach(c => counts[c] = PRODUCTS.filter(p => p.cat === c).length);
    const items = [{ k: 'all', label: 'Все' }, ...Object.keys(CATS).map(k => ({ k, label: CATS[k].label }))];
    tabsBox.innerHTML = items.map(({ k, label }) => `
      <button class="tab" role="tab" data-cat="${k}" aria-selected="${state.cat === k}">
        ${label} <span class="tab__count">${counts[k]}</span>
      </button>`).join('');
  }
  tabsBox.addEventListener('click', e => {
    const b = e.target.closest('.tab');
    if (!b) return;
    state.cat = b.dataset.cat;
    renderTabs(); renderGrid();
    $('#catalog').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  function filtered() {
    let list = PRODUCTS.slice();
    if (state.cat !== 'all') list = list.filter(p => p.cat === state.cat);
    const q = state.q.trim().toLowerCase().replace(/ё/g, 'е');
    if (q) {
      list = list.filter(p =>
        (p.name + ' ' + p.art + ' ' + p.desc + ' ' + p.themes.map(t => THEMES[t]).join(' ')).toLowerCase().replace(/ё/g, 'е').includes(q));
    }
    if (state.sort === 'cheap') list.sort((a, b) => a.price - b.price);
    if (state.sort === 'expensive') list.sort((a, b) => b.price - a.price);
    if (state.sort === 'benefit') list.sort((a, b) => (b.oldPrice ? (b.oldPrice - b.price) / b.oldPrice : 0) - (a.oldPrice ? (a.oldPrice - a.price) / a.oldPrice : 0));
    return list;
  }

  function badgeHtml(p) {
    if (p.badge === 'hit') return '<span class="badge badge--hit">Хит</span>';
    if (p.badge === 'new') return '<span class="badge badge--new">Новинка</span>';
    if (p.badge === 'sale' && p.oldPrice) return `<span class="badge badge--sale">−${Math.round((1 - p.price / p.oldPrice) * 100)}%</span>`;
    return '';
  }

  function cardHtml(p) {
    return `<article class="p-card" data-id="${p.id}">
      <div class="p-card__art" data-open="${p.id}" role="button" tabindex="0" aria-label="Открыть ${p.name}">
        <div class="p-card__badges">${badgeHtml(p)}</div>
        ${productArt(p)}
      </div>
      <div class="p-card__body">
        <span class="p-card__cat">${CATS[p.cat].label} · ${p.themes[0] === 'universal' && p.themes.length > 1 ? THEMES[p.themes[1]] : THEMES[p.themes[0]]}</span>
        <h3 class="p-card__name p-card__name--link" data-open="${p.id}">${p.name}</h3>
        <span class="p-card__art-num">арт. ${p.art}</span>
        <div class="p-card__foot">
          <div class="p-card__prices">
            <span class="price">${fmt(p.price)}</span>
            ${p.oldPrice ? `<span class="price--old">${fmt(p.oldPrice)}</span>` : ''}
          </div>
          <button class="add-btn" data-add="${p.id}" type="button" aria-label="Добавить ${p.name} в корзину">
            <svg viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        </div>
      </div>
    </article>`;
  }

  function renderGrid() {
    const list = filtered();
    $('#productGrid').innerHTML = list.map(cardHtml).join('');
    $('#gridEmpty').hidden = list.length > 0;
  }

  $('#searchInput').addEventListener('input', e => { state.q = e.target.value; renderGrid(); });
  $('#sortSelect').addEventListener('change', e => { state.sort = e.target.value; renderGrid(); });

  /* ── модалка товара ── */
  const modal = $('#productModal');
  function openModal(p) {
    $('#modalCard').innerHTML = `
      <div class="pm__hero">
        <div class="pm__badges">${badgeHtml(p)}</div>
        ${productArt(p)}
        <button class="icon-btn pm__close" data-close type="button" aria-label="Закрыть">
          <svg viewBox="0 0 20 20" fill="none"><path d="m5 5 10 10M15 5 5 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        </button>
      </div>
      <div class="pm__body">
        <div class="pm__cat">${CATS[p.cat].label}</div>
        <h3 class="pm__name">${p.name}</h3>
        <div class="pm__artnum">арт. ${p.art}</div>
        <p class="pm__desc">${p.desc}</p>
        <div class="pm__tags">${p.themes.map(t => `<span class="pm__tag">${THEMES[t]}</span>`).join('')}</div>
        <div class="pm__foot">
          <div class="pm__price">
            <span class="price">${fmt(p.price)} <small>/ шт.</small></span>
            ${p.oldPrice ? `<span class="price--old">${fmt(p.oldPrice)}</span>` : ''}
          </div>
          <button class="btn btn--gold" data-add="${p.id}" type="button">В корзину</button>
        </div>
      </div>`;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    modal.querySelector('[data-add]').focus();
  }
  function closeModal() { modal.hidden = true; document.body.style.overflow = ''; }
  modal.addEventListener('click', e => {
    if (e.target === modal || e.target.closest('[data-close]')) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!modal.hidden) return closeModal();
    if (chatEl.classList.contains('is-open')) return closeChat();
    if (drawer.classList.contains('is-open')) return closeDrawer();
  });

  /* общий обработчик кликов по каталогу */
  document.addEventListener('click', e => {
    const addkit = e.target.closest('[data-addkit]');
    if (addkit) { addKitToCart(addkit.dataset.addkit); return; }
    const open = e.target.closest('[data-open]');
    if (open) { const p = byId(open.dataset.open); if (p) openModal(p); return; }
    const add = e.target.closest('[data-add]');
    if (add) addToCart(add.dataset.add);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.matches('[data-open]')) e.target.click();
  });

  /* ══════════ КОРЗИНА ══════════ */
  const drawer = $('#cartDrawer'), overlay = $('#overlay');
  const cartCount = $('#cartCount');

  const cartQty = () => [...cart.values()].reduce((s, q) => s + q, 0);
  const cartSum = () => [...cart.entries()].reduce((s, [id, q]) => s + byId(id).price * q, 0);
  /* скидка применяется автоматически, если в корзине полный состав комплекта */
  function kitDiscount() {
    return KITS.reduce((d, k) => {
      const full = k.items.every(([id, q]) => (cart.get(id) || 0) >= q);
      if (!full) return d;
      return d + Math.round(k.items.reduce((s, [id, q]) => s + byId(id).price * q, 0) * KIT_DISCOUNT);
    }, 0);
  }
  const cartTotal = () => cartSum() - kitDiscount();

  function addToCart(id, qty = 1) {
    const p = byId(id); if (!p) return;
    cart.set(id, (cart.get(id) || 0) + qty);
    updateCartUI();
    toast(`«${p.name}» — в корзине`);
    const b = $(`.add-btn[data-add="${id}"]`);
    if (b) { b.classList.add('add-btn--added'); setTimeout(() => b.classList.remove('add-btn--added'), 1200); }
  }

  function updateCartUI() {
    const n = cartQty();
    cartCount.textContent = n;
    cartCount.hidden = n === 0;
    if (n) cartCount.animate([{ transform: 'scale(1.4)' }, { transform: 'scale(1)' }], { duration: 250 });
    if (drawer.classList.contains('is-open') && currentView === 'cart') renderCartView();
    syncChatProductButtons();
  }

  function renderCartView() {
    const box = $('#cartItems');
    if (!cart.size) {
      box.innerHTML = '';
      $('#cartEmpty').hidden = false;
      $('#cartFoot').hidden = true;
      return;
    }
    $('#cartEmpty').hidden = true;
    $('#cartFoot').hidden = false;
    $('#cartTotalQty').textContent = cartQty();
    $('#cartSum').textContent = fmt(cartTotal());
    const kd = kitDiscount();
    const oldRow = $('#cartKitRow');
    if (oldRow) oldRow.remove();
    if (kd > 0) {
      const row = document.createElement('div');
      row.className = 'sum-row sum-row--kit';
      row.id = 'cartKitRow';
      row.innerHTML = `<span>Скидка за комплект −10%</span><b class="kit-sale">−${fmt(kd)}</b>`;
      $('#cartSum').closest('.sum-row').after(row);
    }
    box.innerHTML = [...cart.entries()].map(([id, q]) => {
      const p = byId(id);
      return `<div class="cart-item" data-id="${id}">
        <div class="cart-item__art">${productArt(p)}</div>
        <div class="cart-item__info">
          <span class="cart-item__name">${p.name}</span>
          <span class="cart-item__artnum">арт. ${p.art}</span>
          <div class="cart-item__row">
            <span class="qty">
              <button data-dec="${id}" type="button" aria-label="Меньше">−</button>
              <span>${q}</span>
              <button data-inc="${id}" type="button" aria-label="Больше">+</button>
            </span>
            <span class="cart-item__price">${fmt(p.price * q)}</span>
          </div>
        </div>
        <button class="cart-item__del" data-del="${id}" type="button">удалить</button>
      </div>`;
    }).join('');
  }

  $('#cartItems').addEventListener('click', e => {
    const inc = e.target.closest('[data-inc]'), dec = e.target.closest('[data-dec]'), del = e.target.closest('[data-del]');
    if (inc) { const id = inc.dataset.inc; cart.set(id, cart.get(id) + 1); updateCartUI(); renderCartView(); }
    if (dec) { const id = dec.dataset.dec; const q = cart.get(id) - 1; q <= 0 ? cart.delete(id) : cart.set(id, q); updateCartUI(); renderCartView(); }
    if (del) { cart.delete(del.dataset.del); updateCartUI(); renderCartView(); }
  });

  /* ── полка: виды ── */
  let currentView = 'cart';
  const views = { cart: $('#viewCart'), form: $('#viewForm'), done: $('#viewDone') };
  const titles = { cart: 'Корзина', form: 'Оформление заказа', done: 'Заказ принят' };

  function setView(v) {
    currentView = v;
    Object.entries(views).forEach(([k, el]) => el.hidden = k !== v);
    $('#drawerTitle').textContent = titles[v];
    if (v === 'cart') renderCartView();
    if (v === 'form') renderMiniOrder();
  }
  function openDrawer(view = 'cart') {
    closeChat();
    drawer.setAttribute('aria-hidden', 'false');
    drawer.classList.add('is-open');
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add('is-open'));
    document.body.style.overflow = 'hidden';
    setView(view);
  }
  function closeDrawer() {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('is-open');
    setTimeout(() => overlay.hidden = true, 240);
    document.body.style.overflow = '';
  }
  $('#cartBtn').addEventListener('click', () => openDrawer('cart'));
  $('#drawerClose').addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);
  $('#toCheckoutBtn').addEventListener('click', () => setView('form'));
  $('#backToCartBtn').addEventListener('click', () => setView('cart'));

  function miniRows() {
    const kd = kitDiscount();
    return [...cart.entries()].map(([id, q]) => {
      const p = byId(id);
      return `<div class="mini-order__row"><span>${p.name} × ${q}</span><span>${fmt(p.price * q)}</span></div>`;
    }).join('') + (kd > 0 ? `<div class="mini-order__row"><span>Скидка за комплект −10%</span><span class="kit-sale">−${fmt(kd)}</span></div>` : '');
  }
  function renderMiniOrder() {
    $('#miniOrder').innerHTML = miniRows() +
      `<div class="mini-order__total"><span>Итого</span><span>${fmt(cartTotal())}</span></div>`;
  }

  /* ── отправка заказа ── */
  let lastOrderTotal = 0;
  $('#orderForm').addEventListener('submit', e => e.preventDefault());
  $('#submitOrderBtn').addEventListener('click', () => {
    const f = $('#orderForm');
    const name = f.name.value.trim(), phone = f.phone.value.trim();
    const ok = name.length >= 2 && phone.replace(/\D/g, '').length >= 10;
    $('#formError').hidden = ok;
    if (!ok) { (!name ? f.name : f.phone).focus(); return; }

    orderNum = 'НД-' + String(Math.floor(1000 + Math.random() * 9000));
    lastOrderTotal = cartTotal();
    $('#orderNumber').textContent = '№ ' + orderNum;
    $('#doneOrder').innerHTML = `<div class="done__order-head">Состав заказа — ${cartQty()} шт. на ${fmt(lastOrderTotal)}</div>` + miniRows();
    setView('done');
  });
  $('#payLinkBtn').addEventListener('click', () =>
    toast('Демо: здесь будет ссылка на онлайн-оплату (карта / СБП)'));
  $('#doneCloseBtn').addEventListener('click', () => {
    const steps = brain.orderConfirmed(orderNum, lastOrderTotal);
    cart.clear(); updateCartUI();
    closeDrawer();
    if (chatOpened) runSteps(steps);
  });

  /* ══════════ ТОСТ ══════════ */
  let toastTimer;
  function toast(msg) {
    let el = $('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
    el.textContent = msg;
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-on'), 2200);
  }

  /* ══════════ ЧАТ С МЕДАЛЬКИНЫМ ══════════ */
  const chatEl = $('#chatPanel'), chatLog = $('#chatLog'), chatChips = $('#chatChips');
  const chatInput = $('#chatInput');

  function openChat() {
    if (drawer.classList.contains('is-open')) closeDrawer();
    chatEl.classList.add('is-open');
    chatEl.setAttribute('aria-hidden', 'false');
    $('#fabDot').hidden = true;
    document.body.style.overflow = 'hidden';
    if (!chatOpened) {
      chatOpened = true;
      runSteps(brain.greet());
    }
    setTimeout(() => chatInput.focus(), 350);
  }
  function closeChat() {
    chatEl.classList.remove('is-open');
    chatEl.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  $('#mascotFab').addEventListener('click', () =>
    chatEl.classList.contains('is-open') ? closeChat() : openChat());
  $('#chatClose').addEventListener('click', closeChat);
  $('#heroAskBtn').addEventListener('click', openChat);

  setTimeout(() => { if (!chatOpened) $('#fabDot').hidden = false; }, 4000);

  function scrollLog() { chatLog.scrollTop = chatLog.scrollHeight; }

  function addUserMsg(text) {
    const d = document.createElement('div');
    d.className = 'msg msg--user';
    d.textContent = text;
    chatLog.appendChild(d); scrollLog();
  }

  function addBotHtml(html) {
    const d = document.createElement('div');
    d.className = 'msg msg--bot';
    d.innerHTML = html;
    chatLog.appendChild(d); scrollLog();
    return d;
  }

  function addProductCard(p) {
    const d = document.createElement('div');
    d.className = 'msg-product';
    d.innerHTML = `
      <div class="msg-product__art">${productArt(p)}</div>
      <div class="msg-product__info">
        <div class="msg-product__name">${p.name}</div>
        <div class="msg-product__meta">${CATS[p.cat].label} · арт. ${p.art}</div>
        <div class="msg-product__row">
          <span class="msg-product__price">${fmt(p.price)}</span>
          <button class="msg-product__add" data-chat-add="${p.id}" type="button">В корзину</button>
        </div>
      </div>`;
    chatLog.appendChild(d); scrollLog();
  }

  function addOrderCard() {
    const d = document.createElement('div');
    d.className = 'msg-order';
    if (!cart.size) {
      d.innerHTML = `<div class="msg-order__title">Корзина пока пуста</div>
        <div class="msg-order__row"><span>Добавьте позиции из моих подборок — и я соберу заказ.</span></div>`;
    } else {
      d.innerHTML = `<div class="msg-order__title">🏅 Ваш заказ</div>
        ${miniRows()}
        <div class="msg-order__total"><span>Итого</span><span>${fmt(cartTotal())}</span></div>
        <div class="msg-order__cta"><button class="btn btn--gold btn--wide" data-checkout type="button">Подтвердить и оформить</button></div>`;
    }
    chatLog.appendChild(d); scrollLog();
  }

  function setChips(items) {
    chatChips.innerHTML = (items || []).map(c => `<button class="chip" type="button">${c}</button>`).join('');
  }

  function typing(on) {
    let el = $('.typing');
    if (on) {
      if (el) return;
      el = document.createElement('div');
      el.className = 'msg msg--bot typing';
      el.innerHTML = '<i></i><i></i><i></i>';
      chatLog.appendChild(el); scrollLog();
      $$('.mascot--chat').forEach(m => m.classList.add('is-speaking'));
    } else {
      el && el.remove();
      $$('.mascot--chat').forEach(m => m.classList.remove('is-speaking'));
    }
  }

  function runSteps(steps) {
    setChips([]);
    let i = 0;
    const delay = () => 550 + Math.random() * 450;
    const next = () => {
      if (i >= steps.length) return;
      const s = steps[i++];
      if (s.type === 'text') {
        typing(true);
        setTimeout(() => { typing(false); addBotHtml(s.html); next(); }, s.html.length > 120 ? 1100 : delay());
      } else if (s.type === 'products') {
        typing(true);
        setTimeout(() => {
          typing(false);
          s.items.forEach(p => addProductCard(p));
          syncChatProductButtons();
          next();
        }, 900);
      } else if (s.type === 'order') {
        typing(true);
        setTimeout(() => { typing(false); addOrderCard(); next(); }, 800);
      } else if (s.type === 'chips') {
        setChips(s.items);
      } else if (s.type === 'action' && s.name === 'addAll') {
        s.ids.forEach(id => addToCartSilent(id, s.qty || 1));
        updateCartUI();
        next();
      } else if (s.type === 'mood' && s.happy) {
        const m = $('#chatMascot');
        m.classList.add('is-happy');
        setTimeout(() => m.classList.remove('is-happy'), 2500);
        next();
      } else next();
    };
    next();
  }

  function addToCartSilent(id, qty) { cart.set(id, (cart.get(id) || 0) + qty); }

  function syncChatProductButtons() {
    $$('.msg-product__add').forEach(b => {
      const id = b.dataset.chatAdd;
      const inCart = cart.has(id);
      b.textContent = inCart ? `В корзине${cart.get(id) > 1 ? ' · ' + cart.get(id) : ''}` : 'В корзину';
      b.classList.toggle('is-in', inCart);
    });
  }

  chatChips.addEventListener('click', e => {
    const c = e.target.closest('.chip');
    if (!c) return;
    send(c.textContent);
  });

  function send(text) {
    text = text.trim();
    if (!text) return;
    addUserMsg(text);
    setChips([]);
    typing(true);
    setTimeout(() => {
      typing(false);
      const steps = brain.handle(text);
      runSteps(steps);
    }, 700);
  }

  $('#chatForm').addEventListener('submit', e => {
    e.preventDefault();
    send(chatInput.value);
    chatInput.value = '';
  });

  /* клики внутри чата: добавить товар / оформить */
  chatLog.addEventListener('click', e => {
    const add = e.target.closest('[data-chat-add]');
    if (add) { addToCart(add.dataset.chatAdd); return; }
    if (e.target.closest('[data-checkout]')) openDrawer('form');
  });

  /* ══════════ старт ══════════ */
  renderTabs();
  renderGrid();
  renderKits();
  updateCartUI();
})();
