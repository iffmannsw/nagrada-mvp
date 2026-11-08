/* ═══════════════════════════════════════════════════════════
   Медалькин в MAX — webhook-сервер (каркас).
   Зависимостей нет: node server.js. Мозг — тот же MedalkinBrain,
   что на сайте. Транспорт MAX Bot API вынесен в блок «MAX API» —
   при выпуске бота сверьте имена полей с актуальной документацией
   https://dev.max.ru и при необходимости поправьте только его.
   ═══════════════════════════════════════════════════════════ */

const http = require('http');
const { MedalkinBrain } = require('./brain.js');   // общий мозг с сайтом
const fs = require('fs');
const path = require('path');

/* ── загрузка данных (1С + поставщик) ─────────────── */
const ROOT = path.resolve(__dirname, '..', '..');

function normGoods() {
  const load = f => {
    try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8')); }
    catch { return { items: [] }; }
  };
  const shop = load('shop-stock.json').items.map(g => ({
    id: 'S:' + g.art, src: 'shop', name: g.name, art: g.art,
    cat: g.cat, theme: g.theme, price: g.price, stock: g.stock,
    cover: (g.variants || []).find(v => v.img) || (g.variants || [])[0],
    variants: (g.variants || []).map(v => ({
      kind: 'metal', metal: v.metal, size: '', price: v.price, avail: v.avail, img: v.img })),
    pop: g.stock || 0,
  }));
  const remote = load('remote-stock.json').items.map(g => ({
    id: 'R:' + g.art, src: 'remote', name: g.name, art: g.art,
    cat: g.cat, theme: g.theme, price: g.retail, stock: 0, badge: g.badge,
    cover: (g.variants || []).find(v => v.img) || (g.variants || [])[0],
    variants: (g.variants || []).map(v => ({
      kind: v.kind || 'single', metal: v.metal || '', size: v.size || '',
      price: v.supplierPrice, avail: 0, img: v.img })),
    pop: g.badge === 'hit' ? 3 : g.badge === 'new' ? 2 : 1,
  }));
  return [...shop, ...remote];
}

/* ── мозг (общий с сайтом) ─────────────────────────── */
const brain = new MedalkinBrain(normGoods());
setInterval(() => brain.setGoods(normGoods()), 60 * 60 * 1000);  // обновление раз в час

/* ── сессии диалогов (в памяти; TTL 2 часа) ───────── */
const sessions = new Map();
setInterval(() => {
  const now = Date.now();
  sessions.forEach((s, id) => now - s.ts > 2 * 3600e3 && sessions.delete(id));
}, 10 * 60 * 1000);
const sessionOf = chatId => {
  if (!sessions.has(chatId)) {
    sessions.set(chatId, { ts: Date.now(), cart: [] });   // [{id, vi, qty}]
  }
  const s = sessions.get(chatId);
  s.ts = Date.now();
  return s;
};

/* ── сценарий оформления в диалоге (гравировка → доставка → оплата → контакты) ── */
const CHECKOUT_STEPS = [
  { key: 'engrave', q: 'Нужна гравировка? Ответьте «да» (и текстом что гравировать) или «нет».', parse: t => /да|нужно|хочу/.test(t) ? { engrave: t } : /нет|не нужно/.test(t) ? { engrave: 'Нет' } : null },
  { key: 'delivery', q: 'Доставка: самовывоз / курьер по городу / транспортная компания?', parse: t => /самовывоз/.test(t) ? 'Самовывоз' : /курьер/.test(t) ? 'Курьер по городу' : /транспорт|тк|сдэк/.test(t) ? 'ТК (СДЭК и др.)' : null },
  { key: 'pay', q: 'Оплата: наличные / карта / счёт для организации?', parse: t => /налич/.test(t) ? 'Наличными' : /карт/.test(t) ? 'Картой' : /счёт|счет|юр/.test(t) ? 'Счёт' : null },
  { key: 'name', q: 'Ваше имя?', parse: t => t.trim().length >= 2 ? t.trim() : null },
  { key: 'phone', q: 'Телефон для подтверждения?', parse: t => t.replace(/\D/g, '').length >= 10 ? t.trim() : null },
];

function checkoutReply(s, text) {
  if (!s.step) s.step = 0;
  while (s.step < CHECKOUT_STEPS.length) {
    const st = CHECKOUT_STEPS[s.step];
    if (s[st.key] === undefined) {
      if (s.asked) {
        const val = st.parse(text);
        if (val === null) return 'Не понял ответ. ' + st.q;
        s[st.key] = val;
        s.asked = false;
        s.step++;
        continue;
      }
      s.asked = true;
      return st.q;
    }
    s.step++;
  }
  /* всё собрано — спецификация в чат */
  const items = s.cart.map(x => {
    const p = brain.goods.find(g => g.id === x.id);
    if (!p) return null;
    const v = p.variants[x.vi] || p.variants[0];
    return `${p.name} × ${x.qty} — ${(v.price * x.qty).toLocaleString('ru-RU')} ₽`;
  }).filter(Boolean);
  const total = s.cart.reduce((sum, x) => {
    const p = brain.goods.find(g => g.id === x.id);
    return sum + (p ? p.variants[x.vi || 0].price * x.qty : 0);
  }, 0);
  const spec = [
    '═══ СПЕЦИФИКАЦИЯ · РАСПОРТ ═══',
    ...items,
    `Гравировка: ${typeof s.engrave === 'string' ? s.engrave : 'Да — ' + s.engrave.engrave}`,
    `Доставка: ${s.delivery}`, `Оплата: ${s.pay}`,
    `Покупатель: ${s.name}, ${s.phone}`,
    `ИТОГО: ${total.toLocaleString('ru-RU')} ₽`,
    'Заказ передан сотруднику: заведём в 1С и перезвоним.',
  ].join('\n');
  s.cart = []; s.step = 0;   // сессия завершена
  return spec;
}

/* ── ответ мозга: products → текст карточек, actions → сессия-корзина ── */
function replyFor(chatId, text) {
  const s = sessionOf(chatId);
  if (s.checkoutMode) return checkoutReply(s, text);
  const r = brain.handle(text);
  let out = r.text || '';
  if (r.products && r.products.length) {
    out += '\n\n' + r.products.map(p =>
      `• ${p.name} — ${p.price.toLocaleString('ru-RU')} ₽ ` +
      (p.src === 'shop' ? `(в наличии, отгрузка сразу)` : `(под заказ, 5–7 дней)`)).join('\n');
  }
  if (r.actions) {
    for (const a of r.actions) {
      if (a.t === 'add') s.cart.push({ id: a.id, vi: a.vi, qty: a.qty || 1 });
      if (a.t === 'clearCart') s.cart = [];
    }
  }
  if (/оформи|заполни|собери заказ/.test(text.toLowerCase()) && s.cart.length) {
    s.checkoutMode = true;
    return out + '\n\n' + checkoutReply(s, '');
  }
  if (r.chips && r.chips.length) out += '\n\n(' + r.chips.join(' · ') + ')';
  return out;
}

/* ── MAX API: webhook ────────────────────────────────
   Сверьте структуру с https://dev.max.ru (Bot API): имена полей
   сообщения/ответа могут отличаться — поправьте только этот блок. */
const MAX_TOKEN = process.env.MAX_TOKEN || '';
const MAX_API = 'https://botapi.max.ru';          // базовый URL по документации

async function maxSend(chatId, text) {
  await fetch(`${MAX_API}/messages?access_token=${MAX_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Медалькин (РАСПОРТ) · MAX webhook — жив');
  }
  if (req.method !== 'POST') { res.writeHead(405); return res.end(); }
  let body = '';
  req.on('data', c => body += c);
  req.on('end', async () => {
    res.writeHead(200);
    res.end('ok');
    try {
      const upd = JSON.parse(body || '{}');
      /* типовая структура update: message { chat { chat_id }, text } */
      const msg = upd.message || upd;
      const chatId = msg.chat && (msg.chat.chat_id || msg.chat.id);
      const text = msg.text || msg.body && msg.body.text;
      if (chatId && text) {
        const answer = replyFor(chatId, text);
        await maxSend(chatId, answer);
      }
    } catch (e) {
      console.error('[webhook]', e.message);
    }
  });
});

/* экспорт для тестов и интеграций; сервер стартует только при прямом запуске */
module.exports = { brain, replyFor, sessions, checkoutReply, normGoods };

if (require.main === module) {
  const PORT = process.env.PORT || 8443;
  server.listen(PORT, () => console.log(`Медалькин-MAX слушает :${PORT} (токен ${MAX_TOKEN ? 'задан' : 'НЕ задан — только webhook-лог'})`));
}
