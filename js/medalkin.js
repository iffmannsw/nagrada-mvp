/* ═══════════════════════════════════════════════════
   Медалькин — мозг ИИ-консультанта (MVP-логика)
   Модуль не зависит от DOM: та же логика переносится
   в бота мессенджера MAX на следующем этапе.
   ═══════════════════════════════════════════════════ */

class MedalkinBrain {

  constructor(products) {
    this.products = products;
    this.reset();
  }

  reset() {
    this.ctx = { cat: null, themes: new Set(), budget: null, qty: null, perUnit: null };
    this.lastSuggestions = [];
    this.shown = new Set();
    this.offset = 0;
    this.met = false;
  }

  /* формат денег — внутри модуля, чтобы логика жила без data.js */
  money(n) {
    return n.toLocaleString('ru-RU') + ' ₽';
  }

  /* ── разбор сообщения ── */
  parse(text) {
    const t = ' ' + text.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim() + ' ';
    const r = { raw: text.toLowerCase().trim() };

    r.hello     = /(^|\s)(привет|здравствуй|добрый день|добрый вечер|доброе утро|хай|hello)(\s|!|,|\.)/.test(t);
    r.thanks    = /спасибо|благодар/.test(t);
    r.bye       = /(^|\s)пока(\s|!|$)|до свидания/.test(t);
    r.help      = /помоги|помощь|не знаю|что посовету|подскажи|совет/.test(t);
    r.order     = /оформ|заказ|корзин|купи|покуп/.test(t);
    r.delivery  = /доставк|самовывоз|курьер|когда.*получ|сроки/.test(t);
    r.engrave   = /гравир|нанесен|печать|макет|надпис|логотип|имена/.test(t);
    r.payment   = /оплат|сбп|картой|ссылк.*оплат/.test(t);
    r.max       = /max|макс\b|мессендж/.test(t);
    r.who       = /кто ты|ты кто|как тебя зовут/.test(t);
    r.yes       = /(^|\s)(да|конечно|давай|хочу|подходит|согласен|ок|окей|отлично|супер)(\s|!|\.)/.test(t);
    r.more      = /еще|другие|другие варианты|покажи еще|не подходят|не то/.test(t);
    r.addAll    = /добав|в корзину|взял/.test(t);
    r.kit       = /комплект|набор/.test(t);

    // категория
    if (/медал/.test(t)) r.cat = 'medal';
    else if (/грамот|диплом|благодарн|сертификат/.test(t)) r.cat = 'gramota';
    else if (/куб|трофе|статуэт/.test(t)) r.cat = 'cup';

    // темы
    r.themes = [];
    if (/футбол/.test(t)) r.themes.push('football');
    if (/хокке/.test(t)) r.themes.push('hockey');
    if (/шахмат/.test(t)) r.themes.push('chess');
    if (/школ|учеб|учеб|олимпиад|урок|родител|садик|знани/.test(t)) r.themes.push('school');
    if (/детск|сад|малыш|юн[ыо]|детей|ребят/.test(t)) r.themes.push('kids');
    if (/сотрудн|коллектив|корпорат|офис|бизнес|компани|партнер/.test(t)) r.themes.push('office');
    if (/9 *мая|день побед|ветеран/.test(t)) r.themes.push('may9');
    if (/победител|1 *место|первое место|2 *место|второе место|3 *место|третье место|призер|чемпион|пьедестал/.test(t)) r.themes.push('victory');
    if (/спорт/.test(t)) r.themes.push('universal');

    // бюджет: «до 500 руб», «бюджет 10000 ₽», «не дороже 200р»
    const bm = t.match(/(?:бюджет|до|не дороже|максимум|в пределах)?\s*(\d[\d ]{1,9})\s*(руб|₽|р\.|р\b)/);
    if (bm) r.budget = parseInt(bm[1].replace(/ /g, ''), 10);

    // тираж: «30 штук», «нужно 50 медалей», «тираж 100»
    const qm = t.match(/(\d[\d ]{0,9})\s*(шт|тираж|позиц|комплект|медал|грамот|куб|диплом)/);
    if (qm && parseInt(qm[1].replace(/ /g, ''), 10) > 1) r.qty = parseInt(qm[1].replace(/ /g, ''), 10);

    return r;
  }

  /* ── подбор товаров ── */
  recommend() {
    const { cat, themes, perUnit, budget } = this.ctx;
    const limit = perUnit || budget;
    let pool = this.products.filter(p => !cat || p.cat === cat);
    if (themes.size) {
      const themed = pool.filter(p => p.themes.some(x => themes.has(x)));
      if (themed.length) pool = themed;
    }
    let fits = limit ? pool.filter(p => p.price <= limit) : pool;
    if (!fits.length && pool.length) fits = pool; // бюджет не бьётся — честно скажем ниже
    const scored = fits.map(p => ({
      p,
      score: p.themes.reduce((s, x) => s + (themes.has(x) ? (x === 'universal' ? 0.5 : 2) : 0), 0)
            + (p.badge === 'hit' ? 1 : 0) + (p.badge === 'new' ? .5 : 0),
    })).sort((a, b) => b.score - a.score || a.p.price - b.p.price);
    const slice = scored.slice(this.offset, this.offset + 3).map(x => x.p);
    this.offset += 3;
    return { items: slice, total: scored.length, overBudget: !!(limit && fits[0] && fits.every(p => p.price > limit)) };
  }

  /* ── ответ на сообщение: массив шагов ── */
  handle(rawText) {
    const r = this.parse(rawText);
    const ctx = this.ctx;
    const out = [];
    const text = html => out.push({ type: 'text', html });
    this.met = true;

    // запоминаем уточнения
    if (r.cat) ctx.cat = r.cat;
    r.themes.forEach(x => ctx.themes.add(x));
    if (r.budget) ctx.budget = r.budget;
    if (r.qty) ctx.qty = r.qty;
    if (r.budget && r.qty) ctx.perUnit = Math.max(3, Math.floor(r.budget / r.qty));
    // новый запрос — начинаем подбор с чистого листа
    if (r.cat || r.themes.length) { this.shown = new Set(); this.offset = 0; }

    /* специальные вопросы */
    if (r.who) {
      text('Я Медалькин — ИИ-консультант «Наградного магазина» 🏅 Знаю весь ассортимент: медали, грамоты и кубки. Расскажите, какое мероприятие готовите — соберу корзину за минуту.');
      out.push({ type: 'chips', items: ['Школьный турнир', 'Спортивные соревнования', 'Награждение сотрудников', 'Кубок на финал'] });
      return out;
    }
    if (r.max) {
      text('Скоро я появлюсь и в мессенджере MAX: там же подберу товар, покажу фото с сайта, оформлю заказ и пришлю ссылку на оплату. А пока — я здесь, на сайте.');
      out.push({ type: 'chips', items: ['Подобрать награды'] });
      return out;
    }
    if (r.delivery) {
      text('Доставка: самовывоз из магазина, курьер по городу — в день заказа, в регионы — 1–7 рабочих дней. Награды приедут уже с нанесением.');
      out.push({ type: 'chips', items: ['Подобрать награды', 'Оформить заказ'] });
      return out;
    }
    if (r.engrave) {
      text('Нанесение — наша специальность: гравировка на кубках, УФ-печать на грамотах, тиснение на медальных футлярах. Текст и макет менеджер согласует с вами после заказа — до оплаты.');
      out.push({ type: 'chips', items: ['Подобрать награды', 'Оформить заказ'] });
      return out;
    }
    if (r.payment) {
      text('Оплата — по ссылке: после подтверждения заказа пришлём ссылку на онлайн-оплату картой или по СБП. В этом демо кнопка появится на финальном экране заказа.');
      out.push({ type: 'chips', items: ['Оформить заказ', 'Подобрать награды'] });
      return out;
    }
    if (r.thanks) {
      this.met && text('Рад помочь! Если понадобится ещё — я рядом. Удачного награждения! 🏅');
      out.push({ type: 'chips', items: ['Оформить заказ', 'Подобрать награды'] });
      return out;
    }
    if (r.bye) {
      text('До встречи! Возвращайтесь, когда соберёте следующий турнир 👋');
      return out;
    }

    /* заказ */
    if (r.order) {
      return this.orderFlow(out, text);
    }

    /* приветствие */
    if (r.hello && !r.cat && !r.themes.length) {
      text('Здравствуйте! Я Медалькин, ИИ-консультант «Наградного магазина». Подберу награды под ваше мероприятие и бюджет, соберу корзину — останется только подтвердить заказ.');
      out.push({ type: 'chips', items: ['Школьный турнир', 'Спортивные соревнования', 'Награждение сотрудников', '9 Мая'] });
      return out;
    }

    /* готовые комплекты */
    if (r.kit && !r.order && !r.cat && !r.qty && !r.budget) {
      text('У нас есть три готовых комплекта — дизайнерские решения под сценарий, на <b>10% выгоднее</b> заказа по частям:<br>· <b>Большой турнир</b> — кубок + медали 1–3 места + грамоты всем участникам<br>· <b>Школьное торжество</b> — кубок + медали + грамоты на целый класс<br>· <b>Корпоративное признание</b> — статуэтки + дипломы + благодарности партнёрам');
      text('Посмотрите раздел «Комплекты» на странице — или соберём индивидуально прямо здесь:');
      out.push({ type: 'chips', items: ['Кубки на турнир', 'Медали для школы', 'Грамоты сотрудникам'] });
      return out;
    }

    /* «ещё / другие варианты» */
    if (r.more && this.lastSuggestions.length) {
      const rec = this.recommend();
      return this.pushRecommendation(out, text, rec);
    }

    /* «да / подходит / добавить» после подбора */
    if ((r.yes || r.addAll) && !r.cat && this.lastSuggestions.length) {
      out.push({ type: 'action', name: 'addAll', ids: this.lastSuggestions.map(p => p.id), qty: ctx.qty || 1 });
      text(`Отлично, добавил в корзину${ctx.qty ? ' — по ' + ctx.qty + ' шт.' : ''}. Проверьте состав и оформите заказ:`);
      out.push({ type: 'order' });
      this.lastSuggestions = [];
      return out;
    }

    /* назвали бюджет/тираж, но не сказали что именно */
    if ((r.budget || r.qty) && !r.cat && !r.themes.length && !(ctx.cat || ctx.themes.size)) {
      const bits = [];
      if (r.budget) bits.push('бюджет ' + this.money(r.budget));
      if (r.qty) bits.push('тираж ' + r.qty + ' шт.');
      text('Записал: ' + bits.join(', ') + '. Теперь главное — что награждаем?');
      out.push({ type: 'chips', items: ['Медали', 'Грамоты', 'Кубки'] });
      return out;
    }

    if (r.help && !r.cat && !r.themes.length) {
      text('С радостью! Скажите, какое мероприятие готовите — турнир, школьный конкурс, награждение сотрудников? И примерно бюджет. Дальше я сам.');
      out.push({ type: 'chips', items: ['Медали для школы', 'Кубки на турнир', 'Грамоты сотрудникам', 'Бюджет до 10 000 ₽'] });
      return out;
    }

    /* есть категория или тема — подбираем */
    if (r.cat || r.themes.length || (this.met && (ctx.cat || ctx.themes.size))) {
      const rec = this.recommend();
      return this.pushRecommendation(out, text, rec);
    }

    /* ничего не поняли */
    text('Я лучше всего разбираюсь в трёх вещах: <b>медали</b>, <b>грамоты</b> и <b>кубки</b> 🏅 Скажите, что нужно — или выберите вариант:');
    out.push({ type: 'chips', items: ['Медали на турнир', 'Грамоты для школы', 'Кубок чемпиону', 'Бюджет до 10 000 ₽'] });
    return out;
  }

  pushRecommendation(out, text, rec) {
    const ctx = this.ctx;
    // пропускаем уже показанные позиции; если страница исчерпана — берём следующую
    let fresh = rec.items.filter(p => !this.shown.has(p.id));
    while (rec.items.length && !fresh.length) {
      rec = this.recommend();
      fresh = rec.items.filter(p => !this.shown.has(p.id));
    }
    if (!fresh.length) {
      this.lastSuggestions = [];
      text('По этому запросу я показал всё, что есть в каталоге. Поищем в другом направлении?');
      out.push({ type: 'chips', items: ['Медали', 'Грамоты', 'Кубки', 'Оформить заказ'] });
      return out;
    }
    fresh.forEach(p => this.shown.add(p.id));
    this.lastSuggestions = fresh;

    const bits = [];
    if (ctx.qty) bits.push('тираж ' + ctx.qty + ' шт.');
    if (ctx.budget) bits.push('бюджет ' + this.money(ctx.budget) + (ctx.perUnit ? ' (~' + this.money(ctx.perUnit) + ' на награду)' : ''));
    const lead = this.shown.size > fresh.length
      ? 'Вот ещё варианты:'
      : 'Подобрал под ваш запрос' + (bits.length ? ' (' + bits.join(', ') + ')' : '') + ':';
    text(lead);
    out.push({ type: 'products', items: fresh });
    const tail = [];
    if (ctx.qty >= 100) tail.push('тираж от 100 шт. — скидка 12%');
    else if (ctx.qty >= 30) tail.push('тираж от 30 шт. — скидка 7%');
    if (tail.length) text('Кстати, на ваш объём действует ' + tail.join(', ') + ' — менеджер учтёт её при подтверждении.');
    out.push({ type: 'chips', items: ['Добавить всё в корзину', 'Показать ещё', 'Оформить заказ'] });
    return out;
  }

  orderFlow(out, text) {
    if (!this.lastSuggestions.length) {
      text('Соберу заказ! Вот что сейчас в корзине:');
      out.push({ type: 'order' });
      out.push({ type: 'chips', items: ['Подобрать награды'] });
      return out;
    }
    out.push({ type: 'action', name: 'addAll', ids: this.lastSuggestions.map(p => p.id), qty: this.ctx.qty || 1 });
    this.lastSuggestions = [];
    text('Добавил подобранные позиции. Проверьте состав — и оформим:');
    out.push({ type: 'order' });
    return out;
  }

  /* приветствие при открытии чата */
  greet() {
    this.met = true;
    return [
      { type: 'text', html: 'Здравствуйте! Я <b>Медалькин</b> — ИИ-консультант «Наградного магазина» 🏅<br>Помогу подобрать медали, грамоты и кубки под ваше мероприятие и бюджет, соберу корзину и оформлю заказ.' },
      { type: 'text', html: 'Какое событие готовите?' },
      { type: 'chips', items: ['Школьный турнир', 'Спортивные соревнования', 'Награждение сотрудников', '9 Мая'] },
    ];
  }

  /* подтверждение заказа (вызывает интерфейс) */
  orderConfirmed(orderNum, total) {
    this.reset();
    this.met = true;
    return [
      { type: 'mood', happy: true },
      { type: 'text', html: `Заказ <b>${orderNum}</b> на ${this.money(total)} принят! 🎉 Менеджер согласует с вами макет нанесения и пришлёт ссылку на оплату.` },
      { type: 'text', html: 'А в скором будущем я буду присылать такие же подтверждения и ссылки на оплату прямо в мессенджер MAX.' },
    ];
  }
}
