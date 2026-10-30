/* ═══════════════════════════════════════════════════
   РАСПОРТ — интерфейс: витрина, корзина вариантов,
   заказ = товар + гравировка + доставка + оплата.
   Обязательные поля сигналят, незаполненные блокируют
   отправку; заказ уходит сотруднику спецификацией.
   ═══════════════════════════════════════════════════ */
window.App = (() => {
  'use strict';

  const $ = s => document.querySelector(s);

  const cart = new Map();          // key «id:vi» → {id, vi, qty}
  let orderNum = null;
  let chatOpened = false;
  let brain = null;
  let modalSel = { id: null, vi: 0 };

  const byId = id => Shop.byId(id);
  const allGoods = () => [...Shop.state.goods.shop, ...Shop.state.goods.remote];
  const cartCount = () => { let n = 0; cart.forEach(e => n += e.qty); return n; };

  function cartTotal() {
    let s = 0;
    cart.forEach(e => {
      const p = byId(e.id);
      if (p) s += p.variants[e.vi].price * e.qty;
    });
    return s;
  }
  const cartHasRemote = () => [...cart.keys()].some(k => k[0] === 'R');
  const cartHasShop = () => [...cart.keys()].some(k => k[0] === 'S');

  /* ══════════ КОРЗИНА ══════════ */
  function addToCart(id, vi, qty = 1, silent = false) {
    const p = byId(id);
    if (!p) return;
    const v = p.variants[vi] || p.variants[0];
    const key = id + ':' + (p.variants.indexOf(v));
    if (p.src === 'shop' && qty > v.avail) qty = v.avail;
    const prev = cart.get(key);
    const newQty = Math.max(1, prev ? prev.qty + qty : qty);
    if (p.src === 'shop' && newQty > v.avail) newQty = v.avail;
    cart.set(key, { id, vi: p.variants.indexOf(v), qty: newQty });
    syncCartUI();
    if (!silent) openDrawer('cart');
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
    cart.forEach((e, key) => {
      const p = byId(e.id);
      if (!p) return;
      const v = p.variants[e.vi];
      const varLabel = p.variants.length > 1
        ? (v.kind === 'size' ? v.size + ' см' : METAL_LABELS[v.metal] || v.label) : '';
      rows.push(`
        <div class="d-item" data-key="${key}">
          <div class="d-item__art">${Shop.varArtHTML(p, v)}</div>
          <div>
            <div class="d-item__name">${p.name}${varLabel ? ` <small style="color:var(--muted)">· ${varLabel}</small>` : ''}</div>
            <div class="d-item__sub ${p.src === 'remote' ? 'd-item__sub--order' : ''}">
              ${p.src === 'shop' ? 'в наличии · ' + v.avail + ' шт · отгрузка сразу' : 'под заказ · 5–7 дней'} · ${fmt(v.price)}
            </div>
            <div class="d-item__ctrl">
              <span class="d-item__qty">
                <button data-dec aria-label="Меньше">−</button><b>${e.qty}</b><button data-inc aria-label="Больше">+</button>
              </span>
              <button class="d-item__del" data-del aria-label="Удалить">✕</button>
            </div>
          </div>
          <div class="d-item__sum">${fmt(v.price * e.qty)}</div>
        </div>`);
    });
    list.innerHTML = rows.length ? rows.join('') :
      `<p class="d-note" style="padding:24px 0">Корзина пуста. Товары двух складов попадают в один заказ.</p>`;

    const total = cartTotal();
    const parts = [];
    if (cartHasShop()) parts.push('склад — отгрузка сразу');
    if (cartHasRemote()) parts.push('под заказ — 5–7 дней');
    $('#cartSummary').innerHTML = `
      <div class="sum-row"><span>Товары (${cartCount()} шт)</span><b>${fmt(total)}</b></div>
      ${parts.length ? `<div class="sum-row"><span>Отгрузка:</span><b>${parts.join(' + ')}</b></div>` : ''}
      <div class="sum-row sum-row--total"><span>ИТОГО</span><b>${fmt(total)}</b></div>`;
    $('#formSummary').innerHTML = $('#cartSummary').innerHTML;
    $('#toFormBtn').disabled = cart.size === 0;
  }

  /* ══════════ СПЕЦИФИКАЦИЯ ══════════ */
  function buildSpec(name, phone, comment, delivery, pay, engrave, engraveText) {
    const lines = [];
    cart.forEach(e => {
      const p = byId(e.id);
      if (!p) return;
      const v = p.variants[e.vi];
      const varLabel = p.variants.length > 1
        ? (v.kind === 'size' ? v.size + ' см' : METAL_LABELS[v.metal] || v.label) : '';
      lines.push({
        name: p.name + (varLabel ? ' (' + varLabel + ')' : ''), art: p.art,
        src: p.src === 'shop' ? 'Магазин' : 'Удалённый склад',
        qty: e.qty, price: v.price, sum: v.price * e.qty,
      });
    });
    return {
      num: orderNum,
      date: new Date().toLocaleString('ru-RU'),
      buyer: { name, phone, comment: comment || '—' },
      engrave: engrave === 'yes' ? ('Да' + (engraveText ? ` — «${engraveText}»` : '')) : 'Нет',
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
      <div class="sum-row"><span>Гравировка</span><b>${spec.engrave}</b></div>
      <div class="sum-row"><span>Доставка</span><b>${spec.delivery}</b></div>
      <div class="sum-row"><span>Оплата</span><b>${spec.pay}</b></div>
      ${compact ? '' : `
      <div class="sum-row"><span>Покупатель</span><b>${spec.buyer.name}</b></div>
      <div class="sum-row"><span>Телефон</span><b>${spec.buyer.phone}</b></div>
      <div class="sum-row"><span>Комментарий</span><b>${spec.buyer.comment}</b></div>`}
      <div class="sum-row sum-row--total"><span>ИТОГО</span><b>${fmt(spec.total)}</b></div>`;
  }

  /* ══════════ МОДАЛКА ТОВАРА (с вариантами) ══════════ */
  function openProduct(id, vi = 0) {
    const p = byId(id);
    if (!p) return;
    modalSel = { id, vi };
    const src = SOURCES[p.src];
    $('#pmSrc').textContent = src.label + ' · ' + src.tag;
    $('#pmSrc').className = 'modal__src' + (p.src === 'remote' ? ' modal__src--remote' : '');
    $('#pmName').textContent = p.name;
    $('#pmArtCode').textContent = 'Артикул: ' + p.art + (p.variants.length > 1 ? ` · вариантов в карточке: ${p.variants.length}` : '');
    $('#pmDesc').textContent = p.src === 'shop'
      ? `Артикул с собственного склада (${Shop.state.meta.shop.warehouse || 'магазин'}). Остатки синхронизированы с 1С — отгружаем сразу.`
      : `Артикул с удалённого склада поставщика. Привозим под заказ 5–7 дней. Полный модельный ряд проверен парсером каталога.`;
    $('#pmFacts').innerHTML = [
      p.src === 'shop' ? 'Остаток из 1С: «Остатки и доступность товаров»' : 'Номенклатура rossimvol.ru, полный модельный ряд',
      p.src === 'shop' ? 'Отгрузка: сразу после подтверждения' : 'Срок: 5–7 дней с момента заказа',
      'Гравировка и заполнение грамот — отметьте при оформлении',
    ].map(t => `<li>${t}</li>`).join('');
    /* свотчи вариантов */
    const swBox = document.getElementById('pmVariants');
    if (p.variants.length > 1) {
      const isSize = p.variants[0].kind === 'size';
      swBox.innerHTML = p.variants.map((v, i) => {
        const dot = !isSize && v.kind === 'metal';
        const style = dot ? ` style="--dot:${{gold:'#D4AF37',silver:'#C0C0C8',bronze:'#CD7F32',mix:'linear-gradient(135deg,#D4AF37 50%,#C0C0C8 50%)'}[v.metal] || '#ccc'}"` : '';
        const label = isSize ? v.size : (METAL_LABELS[v.metal] || v.label);
        const stock = p.src === 'shop' ? ` — ${v.avail} шт` : '';
        return `<button class="swatch${dot ? ' swatch--dot' : ''}${i === vi ? ' is-on' : ''}" data-pvi="${i}"${style} title="${label}">${dot ? '' : label}</button>`;
      }).join('');
      swBox.hidden = false;
    } else {
      swBox.innerHTML = '';
      swBox.hidden = true;
    }
    applyModalVariant(p, vi);
    $('#productModal').hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function applyModalVariant(p, vi) {
    const v = p.variants[vi] || p.variants[0];
    $('#pmArt').innerHTML = Shop.varArtHTML(p, v);
    $('#pmPrice').textContent = fmt(v.price);
    const st = $('#pmStock');
    if (p.src === 'shop') {
      st.className = 'modal__stock';
      st.innerHTML = `В наличии: <b>${v.avail} шт</b> · отгрузка сразу`;
      $('#pmQty').max = v.avail;
    } else {
      st.className = 'modal__stock modal__stock--order';
      st.innerHTML = `<b>Под заказ</b> · 5–7 дней${v.size ? ' · размер ' + v.size + ' см' : ''}`;
      $('#pmQty').max = 999;
    }
    $('#pmQty').value = 1;
    const label = $('#pmVarLabel');
    if (p.variants.length > 1) {
      const txt = v.kind === 'size' ? `размер <b>${v.size} см</b>` : `вариант: <b>${METAL_LABELS[v.metal] || v.label}</b>`;
      label.innerHTML = txt + (p.src === 'shop' ? ` · доступно ${v.avail} шт` : '');
      label.hidden = false;
    } else label.hidden = true;
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
    if (view === 'form') clearErrors();
  }
  function closeDrawer() {
    $('#drawer').hidden = true;
    document.body.style.overflow = '';
  }

  /* ══════════ ВАЛИДАЦИЯ ФОРМЫ ══════════ */
  function markErr(el, on) {
    if (!el) return;
    el.classList.toggle('is-err', on);
    const err = el.querySelector(':scope > .field-err') || (el.closest('.is-err') && el.closest('.is-err').querySelector('.field-err'));
    if (err) err.classList.toggle('is-on', on);
  }
  function clearErrors() {
    document.querySelectorAll('#orderForm .is-err').forEach(x => x.classList.remove('is-err'));
    document.querySelectorAll('#orderForm .field-err').forEach(x => x.classList.remove('is-on'));
  }

  function validateForm(form) {
    clearErrors();
    const fd = new FormData(form);
    const bad = [];
    const name = form.querySelector('[name=name]');
    const phone = form.querySelector('[name=phone]');
    const engrave = form.querySelector('input[name=engrave]:checked');
    const engraveWrap = $('#engraveWrap');
    const engraveText = form.querySelector('[name=engraveText]');
    const engraveTextWrap = $('#engraveText');

    if (!name.value.trim() || name.value.trim().length < 2) { markErr(name.closest('label'), true); bad.push(name); }
    if (!phone.value.trim() || phone.value.replace(/\D/g, '').length < 10) { markErr(phone.closest('label'), true); bad.push(phone); }
    if (!engrave) { markErr(engraveWrap, true); bad.push(engraveWrap); }
    if (engrave && engrave.value === 'yes' && !engraveText.value.trim()) {
      markErr(engraveTextWrap, true); bad.push(engraveText);
    }
    if (bad.length) {
      bad[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
      (bad[0].focus && bad[0].focus());
      return null;
    }
    return fd;
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
      const v = p.cover || p.variants[0];
      addMsg(`
        <div class="msg-product" data-id="${p.id}">
          <div class="msg-product__art">${Shop.varArtHTML(p, v)}</div>
          <div><div class="msg-product__name">${p.name}</div>
          <div class="msg-product__sub ${p.src === 'remote' ? 'msg-product__sub--order' : ''}">${p.src === 'shop' ? 'в наличии ' + v.avail + ' шт' : 'под заказ 5–7 дней'}</div></div>
          <div class="msg-product__price">${fmt(v.price)}</div>
        </div>`);
    }
    if (orderHTML) addMsg(orderHTML, 'bot');
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
    /* исполняем действия агента: добавить в корзину (тихо), открыть
       корзину/форму, очистить — бот ведёт покупку руками */
    let openCart = false;
    if (r.actions) {
      for (const a of r.actions) {
        if (a.t === 'add') addToCart(a.id, a.vi, a.qty, true);
        else if (a.t === 'openCart') openCart = true;
        else if (a.t === 'openForm') { openDrawer('form'); }
        else if (a.t === 'clearCart') { cart.clear(); syncCartUI(); }
      }
    }
    if (openCart) { openDrawer('cart'); }
    await botSay(r.text, r.products, r.order ? msgOrderHTML(r.order) : null, r.chips);
  }
  function msgOrderHTML(order) {
    return `<div class="msg-order"><h5>СПЕЦИФИКАЦИЯ · ЧЕРНОВИК</h5>
      <ul>${order.items.map(l => `<li>${l.name} × ${l.qty} — ${fmt(l.sum)}</li>`).join('')}</ul>
      <div class="sum-row sum-row--total"><span>ИТОГО</span><b>${fmt(order.total)}</b></div>
      <p style="margin:8px 0 0;font-size:12px;color:var(--muted)">Позиции уже в корзине. При оформлении отметьте гравировку, доставку и оплату — заказ уйдёт сотруднику спецификацией.</p></div>`;
  }

  /* ══════════ СОБЫТИЯ ══════════ */
  function bind() {
    document.addEventListener('click', e => {
      const open = e.target.closest('[data-open]');
      if (open && open.dataset.open === 'cart') { openDrawer('cart'); return; }
      if (e.target.closest('[data-open-chat]')) { openChat(); return; }
      if (e.target.closest('[data-close-chat]')) { closeChat(); return; }
      if (e.target.closest('[data-close]')) {
        if ($('#productModal').contains(e.target)) closeModal();
        else closeDrawer();
        return;
      }
      /* модалка: свотч варианта */
      const psw = e.target.closest('#pmVariants .swatch');
      if (psw) {
        const p = byId(modalSel.id);
        modalSel.vi = +psw.dataset.pvi;
        document.querySelectorAll('#pmVariants .swatch').forEach(b => b.classList.toggle('is-on', b === psw));
        applyModalVariant(p, modalSel.vi);
        return;
      }
      if (e.target.closest('#pmAdd')) {
        const qty = Math.max(1, +$('#pmQty').value || 1);
        addToCart(modalSel.id, modalSel.vi, qty);
        closeModal();
        return;
      }
      const card = e.target.closest('.p-card');
      if (card && card.dataset.id && !e.target.closest('.swatch')) { openProduct(card.dataset.id, 0); return; }
      const mp = e.target.closest('.msg-product');
      if (mp) { openProduct(mp.dataset.id, 0); return; }
      const chip = e.target.closest('[data-chip]');
      if (chip) { send(chip.dataset.chip); return; }
      const item = e.target.closest('.d-item');
      if (item) {
        const key = item.dataset.key;
        const e2 = cart.get(key);
        if (!e2) return;
        if (e.target.closest('[data-inc]')) { e2.qty += 1; const p = byId(e2.id); if (p.src === 'shop' && e2.qty > p.variants[e2.vi].avail) e2.qty = p.variants[e2.vi].avail; }
        if (e.target.closest('[data-dec]')) { e2.qty -= 1; if (e2.qty <= 0) cart.delete(key); }
        if (e.target.closest('[data-del]')) cart.delete(key);
        syncCartUI();
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

    /* гравировка: да → показать поле текста */
    document.querySelectorAll('input[name=engrave]').forEach(r => r.addEventListener('change', () => {
      $('#engraveText').classList.toggle('is-on', r.value === 'yes' && r.checked);
      markErr($('#engraveWrap'), false);
    }));
    ['[name=name]', '[name=phone]', '[name=engraveText]'].forEach(sel => {
      const el = document.querySelector('#orderForm ' + sel);
      if (el) el.addEventListener('input', () => markErr(el.closest('label'), false));
    });

    $('#orderForm').addEventListener('submit', e => {
      e.preventDefault();
      const form = e.target;
      const fd = validateForm(form);
      if (!fd) return;                     // незаполненные поля просигналили
      orderNum = 'Р-' + String(Math.floor(1000 + Math.random() * 9000));
      const spec = buildSpec(
        fd.get('name').trim(), fd.get('phone').trim(), (fd.get('comment') || '').trim(),
        fd.get('delivery'), fd.get('pay'),
        fd.get('engrave'), (fd.get('engraveText') || '').trim());
      /* демо: спецификация — готовый документ для сотрудника (передать в 1С) */
      console.log('=== СПЕЦИФИКАЦИЯ ДЛЯ СОТРУДНИКА ===');
      console.log(JSON.stringify(spec, null, 2));
      $('#doneSpec').innerHTML = specHTML(spec);
      openDrawer('done');
      cart.clear();
      syncCartUI();
      form.reset();
      $('#engraveText').classList.remove('is-on');
      /* бот комментирует завершение — увидит сообщение при возврате в чат */
      const fin = brain.orderConfirmed();
      addMsg(fin.text);
      setChips(['Нужны ещё награды?', 'Что есть в наличии?']);
    });

    $('#chatForm').addEventListener('submit', e => {
      e.preventDefault();
      const inp = $('#chatInput');
      send(inp.value);
      inp.value = '';
    });

    $('#fab').addEventListener('click', openChat);

    $('#fabMedal').innerHTML = mascotSVG({ size: 44 });
    $('#chatAvatar').innerHTML = mascotSVG({ size: 40 });
    const stripMascot = document.querySelector('.agent-strip__mascot');
    if (stripMascot) stripMascot.innerHTML = mascotSVG({ size: 72 });
  }

  /* ══════════ ЗАПУСК ══════════ */
  document.addEventListener('DOMContentLoaded', async () => {
    brain = new MedalkinBrain(allGoods());   // [] до загрузки JSON — setGoods ниже наполнит
    bind();
    Shop.bindEvents();
    try {
      await Shop.init();
    } catch (e) {
      console.error('[shop.init]', e);
    }
    brain.setGoods(allGoods());
    syncCartUI();
    setChips(['Что есть в наличии?', 'Нужны кубки на хоккей', 'Бюджет 15000 на медали', 'Как заказать?']);
  });

  return { openProduct, addToCart, openDrawer, openChat, send };
})();
