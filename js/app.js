/* ═══════════════════════════════════════════════════
   РАСПОРТ — интерфейс: витрина двух складов, корзина,
   оформление со спецификацией, чат с Медалькиным
   ═══════════════════════════════════════════════════ */
window.App = (() => {
  'use strict';

  const $ = s => document.querySelector(s);

  /* ── состояние ── */
  const cart = new Map();          // id → qty
  let orderNum = null;
  let chatOpened = false;
  let brain = null;

  const byId = id => Shop.byId(id);
  const allGoods = () => [...Shop.state.goods.shop, ...Shop.state.goods.remote];

  /* ══════════ КОРЗИНА ══════════ */
  function cartCount() { let n = 0; cart.forEach(q => n += q); return n; }
  function cartTotal() { let s = 0; cart.forEach((q, id) => { const p = byId(id); if (p) s += p.price * q; }); return s; }
  function cartHasRemote() { return [...cart.keys()].some(id => id[0] === 'R'); }
  function cartHasShop() { return [...cart.keys()].some(id => id[0] === 'S'); }

  function addToCart(id, qty = 1) {
    const p = byId(id);
    if (!p) return;
    if (p.src === 'shop' && qty > p.inStock) qty = p.inStock;
    cart.set(id, Math.max(1, qty));
    syncCartUI();
    openDrawer('cart');
  }

  function syncCartUI() {
    const n = cartCount();
    const el = $('#cartCount');
    el.textContent = n;
    el.hidden = n === 0;
    renderCartView();
  }

  function renderCartView() {
    const list = $('#cartList');
    const rows = [];
    cart.forEach((qty, id) => {
      const p = byId(id);
      if (!p) return;
      rows.push(`
        <div class="d-item" data-id="${id}">
          <div class="d-item__art">${productArt(p)}</div>
          <div>
            <div class="d-item__name">${p.name}</div>
            <div class="d-item__sub ${p.src === 'remote' ? 'd-item__sub--order' : ''}">
              ${p.src === 'shop' ? 'в наличии · ' + p.inStock + ' шт' : 'под заказ · 2–3 дня'} · ${fmt(p.price)}
            </div>
            <div class="d-item__ctrl">
              <span class="d-item__qty">
                <button data-dec aria-label="Меньше">−</button><b>${qty}</b><button data-inc aria-label="Больше">+</button>
              </span>
              <button class="d-item__del" data-del aria-label="Удалить">✕</button>
            </div>
          </div>
          <div class="d-item__sum">${fmt(p.price * qty)}</div>
        </div>`);
    });
    list.innerHTML = rows.length ? rows.join('') :
      `<p class="d-note" style="padding:24px 0">Корзина пуста. Загляните в каталог — товары двух складов попадают в один заказ.</p>`;

    const total = cartTotal();
    const parts = [];
    if (cartHasShop()) parts.push('позиции магазина — выдача сегодня');
    if (cartHasRemote()) parts.push('позиции под заказ — 2–3 дня');
    $('#cartSummary').innerHTML = `
      <div class="sum-row"><span>Товары (${cartCount()} шт)</span><b>${fmt(total)}</b></div>
      ${parts.length ? `<div class="sum-row"><span>Состав заказа:</span><b>${parts.join(' · ')}</b></div>` : ''}
      <div class="sum-row sum-row--total"><span>ИТОГО</span><b>${fmt(total)}</b></div>`;
    $('#formSummary').innerHTML = $('#cartSummary').innerHTML;
    $('#toFormBtn').disabled = cart.size === 0;
  }

  /* ══════════ СПЕЦИФИКАЦИЯ (документ заказа) ══════════ */
  function buildSpec(name, phone, comment, delivery, pay) {
    const lines = [];
    cart.forEach((qty, id) => {
      const p = byId(id);
      if (!p) return;
      lines.push({
        name: p.name, art: p.art, src: p.src === 'shop' ? 'Магазин' : 'Удалённый склад',
        qty, price: p.price, sum: p.price * qty,
      });
    });
    return {
      num: orderNum,
      date: new Date().toLocaleString('ru-RU'),
      buyer: { name, phone, comment: comment || '—' },
      delivery, pay,
      items: lines,
      total: cartTotal(),
    };
  }

  function specHTML(spec, compact = false) {
    const rows = spec.items.map(l => `
      <div class="sum-row"><span>${l.name} <small style="color:var(--muted)">${l.art} · ${l.src}</small> × ${l.qty}</span><b>${fmt(l.sum)}</b></div>`).join('');
    return `
      <div class="spec-title">СПЕЦИФИКАЦИЯ № ${spec.num}</div>
      ${rows}
      <div class="sum-row"><span>Доставка</span><b>${spec.delivery}</b></div>
      <div class="sum-row"><span>Оплата</span><b>${spec.pay}</b></div>
      ${compact ? '' : `
      <div class="sum-row"><span>Покупатель</span><b>${spec.buyer.name}</b></div>
      <div class="sum-row"><span>Телефон</span><b>${spec.buyer.phone}</b></div>
      <div class="sum-row"><span>Комментарий</span><b>${spec.buyer.comment}</b></div>`}
      <div class="sum-row sum-row--total"><span>ИТОГО</span><b>${fmt(spec.total)}</b></div>`;
  }

  /* ══════════ МОДАЛКА ТОВАРА ══════════ */
  let modalId = null;
  function openProduct(id) {
    const p = byId(id);
    if (!p) return;
    modalId = id;
    const src = SOURCES[p.src];
    $('#pmSrc').textContent = src.label + ' · ' + src.tag;
    $('#pmSrc').className = 'modal__src' + (p.src === 'remote' ? ' modal__src--remote' : '');
    $('#pmName').textContent = p.name;
    $('#pmArtCode').textContent = 'Артикул: ' + p.art + (p.char ? ' · характеристика: ' + p.char : '');
    $('#pmDesc').textContent = p.src === 'shop'
      ? `Позиция с собственного склада (${Shop.state.meta.shop.warehouse || 'магазин'}). Остаток синхронизирован с 1С — по этому количеству можно оформить выдачу сегодня.`
      : `Позиция с удалённого склада поставщика. Привозим под заказ 2–3 дня, опт поставщика ${p.wholesale ? fmt(p.wholesale) : 'по запросу'}. Наличие поставщика обновляется парсером каталога.`;
    $('#pmPrice').textContent = fmt(p.price);
    const st = $('#pmStock');
    if (p.src === 'shop') {
      st.className = 'modal__stock';
      st.innerHTML = `В наличии: <b>${p.inStock} шт</b> · выдача сегодня`;
      $('#pmQty').max = p.inStock;
    } else {
      st.className = 'modal__stock modal__stock--order';
      st.innerHTML = `<b>Под заказ</b> · 2–3 дня`;
      $('#pmQty').max = 999;
    }
    $('#pmQty').value = 1;
    $('#pmFacts').innerHTML = [
      p.src === 'shop' ? 'Остаток из 1С: «Остатки и доступность товаров»' : 'Номенклатура поставщика rossimvol.ru',
      p.src === 'shop' ? 'Самовывоз — сегодня после подтверждения' : 'Объединяется в одном заказе с товарами магазина',
      'Гравировка и заполнение грамот — по запросу',
    ].map(t => `<li>${t}</li>`).join('');
    $('#pmArt').innerHTML = productArt(p);
    $('#productModal').hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    $('#productModal').hidden = true;
    document.body.style.overflow = '';
  }

  /* ══════════ DRAWER ══════════ */
  function openDrawer(view = 'cart') {
    closeChat();
    const views = { cart: 'viewCart', form: 'viewForm', done: 'viewDone' };
    Object.values(views).forEach(id => $('#' + id).hidden = id !== views[view]);
    $('#drawerTitle').textContent = view === 'form' ? 'ОФОРМЛЕНИЕ' : view === 'done' ? 'ГОТОВО' : 'КОРЗИНА';
    $('#drawer').hidden = false;
    document.body.style.overflow = 'hidden';
    renderCartView();
  }
  function closeDrawer() {
    $('#drawer').hidden = true;
    document.body.style.overflow = '';
  }

  /* ══════════ ЧАТ ══════════ */
  function openChat() {
    closeDrawer();
    $('#chat').hidden = false;
    if (!chatOpened) {
      chatOpened = true;
      const g = brain.greet();
      botSay(g.text, null, null, g.chips);
    }
    $('#chatInput').focus();
  }
  function closeChat() { $('#chat').hidden = true; }

  function chatScroll() { const log = $('#chatLog'); log.scrollTop = log.scrollHeight; }
  function addMsg(html, who = 'bot') {
    const log = $('#chatLog');
    const div = document.createElement('div');
    div.className = `msg msg--${who}`;
    div.innerHTML = html;
    log.appendChild(div);
    chatScroll();
    return div;
  }
  async function botSay(text, cards, orderHTML, chips) {
    const t = addMsg('<i></i><i></i><i></i>', 'bot typing');
    await new Promise(r => setTimeout(r, 500 + Math.random() * 500));
    t.remove();
    if (text) addMsg(text);
    if (cards) for (const c of cards) {
      const p = byId(c.id);
      if (!p) continue;
      addMsg(`
        <div class="msg-product" data-id="${p.id}">
          <div class="msg-product__art">${productArt(p)}</div>
          <div><div class="msg-product__name">${p.name}</div>
          <div class="msg-product__sub ${p.src === 'remote' ? 'msg-product__sub--order' : ''}">${p.src === 'shop' ? 'в наличии ' + p.inStock + ' шт' : 'под заказ 2–3 дня'}</div></div>
          <div class="msg-product__price">${fmt(p.price)}</div>
        </div>`);
    }
    if (orderHTML) addMsg(orderHTML, 'bot msg-order-wrap');
    if (chips) setChips(chips);
    chatScroll();
  }
  function setChips(list) {
    $('#chatChips').innerHTML = (list || []).map(c => `<button class="chip" data-chip="${c}">${c}</button>`).join('');
  }

  async function send(text) {
    if (!text.trim()) return;
    addMsg(text.replace(/</g, '&lt;'), 'user');
    const r = brain.handle(text);
    /* черновик спецификации из чата кладём в корзину, чтобы покупатель
       продолжил оформление (доставка/оплата/контакты) в едином флоу */
    if (r.order && r.products) {
      cart.clear();
      r.products.forEach(p => cart.set(p.id, 1));
      syncCartUI();
    }
    if (text.includes('Открыть корзину')) { openDrawer('cart'); return; }
    await botSay(r.text, r.products, r.order ? msgOrderHTML(r.order) : null, r.chips);
  }
  function msgOrderHTML(order) {
    return `<div class="msg-order"><h5>СПЕЦИФИКАЦИЯ · ЧЕРНОВИК</h5>
      <ul>${order.items.map(l => `<li>${l.name} × ${l.qty} — ${fmt(l.sum)}</li>`).join('')}</ul>
      <div class="sum-row sum-row--total"><span>ИТОГО</span><b>${fmt(order.total)}</b></div>
      <p style="margin:8px 0 0;font-size:12px;color:var(--muted)">Продолжите оформление в корзине — выберите доставку, оплату и оставьте контакты. Заказ уйдёт сотруднику в оформленной форме.</p></div>`;
  }

  /* ══════════ СОБЫТИЯ ══════════ */
  function bind() {
    /* глобальные клики */
    document.addEventListener('click', e => {
      const open = e.target.closest('[data-open]');
      if (open) { open.dataset.open === 'cart' ? openDrawer('cart') : null; }
      if (e.target.closest('[data-open-chat]')) { openChat(); return; }
      if (e.target.closest('[data-close-chat]')) { closeChat(); return; }
      if (e.target.closest('[data-close]')) {
        if ($('#productModal').contains(e.target)) closeModal();
        else closeDrawer();
        return;
      }
      if (e.target.closest('#pmAdd')) {
        const qty = Math.max(1, +$('#pmQty').value || 1);
        addToCart(modalId, qty);
        closeModal();
        return;
      }
      const card = e.target.closest('.p-card');
      if (card && card.dataset.id) { openProduct(card.dataset.id); return; }
      const mp = e.target.closest('.msg-product');
      if (mp) { openProduct(mp.dataset.id); return; }
      const chip = e.target.closest('[data-chip]');
      if (chip) { send(chip.dataset.chip); return; }
      /* корзина: qty/del */
      const item = e.target.closest('.d-item');
      if (item) {
        const id = item.dataset.id;
        if (e.target.closest('[data-inc]')) { cart.set(id, cart.get(id) + 1); syncCartUI(); }
        if (e.target.closest('[data-dec]')) { const q = cart.get(id) - 1; q <= 0 ? cart.delete(id) : cart.set(id, q); syncCartUI(); }
        if (e.target.closest('[data-del]')) { cart.delete(id); syncCartUI(); }
      }
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (!$('#productModal').hidden) closeModal();
        else if (!$('#drawer').hidden) closeDrawer();
        else closeChat();
      }
    });

    $('#toFormBtn').addEventListener('click', () => openDrawer('form'));

    $('#orderForm').addEventListener('submit', e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      orderNum = 'Р-' + String(Math.floor(1000 + Math.random() * 9000));
      const spec = buildSpec(fd.get('name'), fd.get('phone'), fd.get('comment'),
        fd.get('delivery'), fd.get('pay'));
      /* демо: спецификация — готовый документ для сотрудника */
      console.log('=== СПЕЦИФИКАЦИЯ ДЛЯ СОТРУДНИКА (передать в 1С) ===');
      console.log(JSON.stringify(spec, null, 2));
      $('#doneSpec').innerHTML = specHTML(spec);
      openDrawer('done');
      cart.clear();
      syncCartUI();
    });

    $('#chatForm').addEventListener('submit', e => {
      e.preventDefault();
      const inp = $('#chatInput');
      send(inp.value);
      inp.value = '';
    });

    /* маскот в шапке агента и на кнопке */
    $('#fabMedal').innerHTML = mascotSVG({ size: 44 });
    $('#chatAvatar').innerHTML = mascotSVG({ size: 40 });
    const stripMascot = document.querySelector('.agent-strip__mascot');
    if (stripMascot) stripMascot.innerHTML = mascotSVG({ size: 72 });
  }

  /* ══════════ ЗАПУСК ══════════ */
  document.addEventListener('DOMContentLoaded', async () => {
    brain = new MedalkinBrain(allGoods);
    bind();
    Shop.bindEvents();
    await Shop.init();
    brain.setGoods(allGoods);   // после загрузки JSON — свежие данные в мозг
    syncCartUI();
    setChips(['Что есть в наличии?', 'Нужны кубки на хоккей', 'Бюджет 15000 на медали', 'Как заказать?']);
  });

  return { openProduct, addToCart, openDrawer, openChat, send };
})();
