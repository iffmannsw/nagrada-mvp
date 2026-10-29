/* ═══════════════════════════════════════════════════
   Медалькин — диалоговый движок агента-консультанта.
   Класс не зависит от DOM: тот же код переносится в
   бота MAX (вход parse/handle, выход — реплика + товары).
   Знает два склада: shop (магазин, остатки 1С) и
   remote (поставщик, под заказ).
   ═══════════════════════════════════════════════════ */

class MedalkinBrain {
  constructor(goods = []) {
    this.goods = goods;
    this.shown = new Set();
    this.pending = null;      // {cat, theme, budget, qty}
    this.order = null;        // черновик спецификации
  }

  setGoods(goods) { this.goods = goods; }

  money(n) { return n.toLocaleString('ru-RU') + ' ₽'; }

  /* ── разбор запроса ── */
  parse(text) {
    const t = text.toLowerCase();
    const r = { cat: null, theme: null, budget: null, qty: null, order: false,
      stock: false, photo: false, price: false, hello: false, bye: false,
      thanks: false, who: false, help: false, delivery: false, engrave: false, payment: false };

    if (/(^|\s)(привет|здравствуй|добрый\s*(день|вечер|утро)|хай|доброе\s*утро|ку\b)/.test(t)) r.hello = true;
    if (/(пока|до связи|всего доброго|до свидания)\b/.test(t)) r.bye = true;
    if (/(спасибо|благодар)/.test(t)) r.thanks = true;
    if (/(кто ты|ты кто|что ты умеешь|как тебя зовут|ты бот|ты человек)/.test(t)) r.who = true;
    if (/(помощь|help|что можно|как пользоваться|как заказать|как оформить|не знаю)/.test(t)) r.help = true;
    if (/(доставк|самовывоз|курьер|сдэк|почтой|транспорт)/.test(t)) r.delivery = true;
    if (/(гравир|надпис|текст на|фамили|имя на)/.test(t)) r.engrave = true;
    if (/(оплат|наличн|картой|счёт|счет|безнал|юр\.?\s*лиц)/.test(t)) r.payment = true;

    if (/(наличи|что есть|в наличии|склад|складе|остатк|есть ли)/.test(t)) r.stock = true;
    if (/(фото|фотк|картин|посмотреть|покажи|скинь|пришли|глянь|взгля)/.test(t)) r.photo = true;
    if (/(цена|цены|стоим|почём|почем|сколько стоит|прайс)/.test(t)) r.price = true;

    if (/(заказ|оформи|купить|хочу заказать|давай заказ|собери заказ|спецификац)/.test(t) && !/под заказ/.test(t)) r.order = true;

    if (/медал/.test(t)) r.cat = 'medal';
    else if (/(грамот|диплом|благодарн|сертификат)/.test(t)) r.cat = 'gramota';
    else if (/(куб|трофе|статуэт)/.test(t)) r.cat = 'cup';

    if (/(хокке)/.test(t)) r.theme = 'hockey';
    else if (/(футбол)/.test(t)) r.theme = 'football';
    else if (/(шахмат)/.test(t)) r.theme = 'chess';
    else if (/(волейбол)/.test(t)) r.theme = 'volleyball';
    else if (/(бег|марафон|лыж|спартак)/.test(t)) r.theme = 'run';
    else if (/(школ|учени|знани|олимпиад)/.test(t)) r.theme = 'school';
    else if (/(9\s*мая|день побед|ветеран)/.test(t)) r.theme = 'may9';
    else if (/(1\s*место|победител|чемпион|призёр|призер)/.test(t)) r.theme = 'victory';
    if (/(детск|сад|малыш|юн[ыо])/.test(t)) r.theme = 'kids';

    const bm = t.match(/(?:бюджет|до|не дороже|максимум|в пределах)\s*(\d[\d\s]{1,9})\s*(руб|₽|тыс|т\.?р|р\.|\b)/);
    if (bm) {
      let v = +bm[1].replace(/\s/g, '');
      if (/(тыс|т\.?р)/.test(bm[2])) v *= 1000;
      r.budget = v;
    } else {
      const m2 = t.match(/(\d[\d\s]{2,9})\s*(руб|₽)\b/);
      if (m2) r.budget = +m2[1].replace(/\s/g, '');
    }
    const qm = t.match(/(\d{1,5})\s*(шт|тираж|позиц|комплект|медал|грамот|куб|диплом)/);
    if (qm) r.qty = +qm[1];
    return r;
  }

  /* ── поиск по критериям ── */
  score(p) {
    let s = 0;
    if (this.pending) {
      const { cat, theme, budget } = this.pending;
      if (cat && p.cat === cat) s += 3;
      if (theme) s += p.theme === theme ? 2 : (p.theme === 'universal' ? 0.4 : -0.6);
      if (budget) {
        if (p.price <= budget) s += 1.5; else s -= (p.price - budget) / Math.max(budget, 1) * 2;
      }
    }
    if (p.src === 'shop') s += 0.6;              // наличие в магазине — приоритет
    if (p.inStock > 20) s += 0.6;
    if (p.img) s += 0.3;                          // с фото — привлекательнее
    return s + p.pop * 0.05;
  }

  recommend(k = 4) {
    const pool = this.goods.filter(p => !this.shown.has(p.id))
      .sort((a, b) => this.score(b) - this.score(a));
    const pick = pool.slice(0, k);
    pick.forEach(p => this.shown.add(p.id));
    return pick;
  }

  topStock(k = 4) {
    return this.goods.filter(p => p.src === 'shop')
      .sort((a, b) => b.inStock - a.inStock).slice(0, k);
  }

  withPhoto(k = 4) {
    const wantCat = this.pending?.cat || null;
    let list = this.goods.filter(p => p.img && (!wantCat || p.cat === wantCat))
      .sort((a, b) => (b.src === 'shop') - (a.src === 'shop') || b.inStock - a.inStock);
    /* у магазина реальные фото есть не у всех позиций — добираем ходовыми
       товарами с иллюстрациями, чтобы ответ был всегда содержательным */
    if (list.length < k) {
      const extra = this.goods.filter(p => !p.img && (!wantCat || p.cat === wantCat))
        .sort((a, b) => b.inStock - a.inStock);
      list = list.concat(extra.slice(0, k - list.length));
    }
    return list.slice(0, k);
  }

  /* ── сборка заказа-черновика ── */
  buildOrder(list) {
    const items = list.map(p => ({ name: p.name, art: p.art, qty: 1, price: p.price, sum: p.price, src: p.src }));
    return { items, total: items.reduce((s, i) => s + i.sum, 0) };
  }

  /* ── главная точка входа ── */
  handle(text) {
    const r = this.parse(text);

    if (r.who) return this.say('Я Медалькин — агент-консультант магазина «РАСПОРТ». Подбираю награды под задачу и бюджет, показываю наличие магазина и удалённого склада поставщика, собираю заказ со спецификацией. Просто напишите: «нужны медали и кубки на турнир, бюджет 20000».');

    if (r.delivery) return this.say('Доставка: самовывоз со склада магазина — сегодня после подтверждения; курьер по городу — 1 день; СДЭК и другие ТК — 2–5 дней. Позиции под заказ приезжают от поставщика за 2–3 дня и уходят в тот же заказ.');
    if (r.engrave) return this.say('Гравировка — делаем: имена на медалях, надписи на кубках, заполнение грамот по вашему списку. Укажите текст при оформлении в комментарии к заказу, менеджер согласует макет.');
    if (r.payment) return this.say('Оплата: наличными или картой при получении, а для организаций — счёт. В комментарии к заказу укажите реквизиты — подготовим документы.');

    if (r.stock) {
      this.pending = { cat: r.cat, theme: r.theme, budget: r.budget };
      const list = (r.cat || r.theme || r.budget) ? this.recommend(4) : this.topStock(4);
      const n = this.goods.filter(p => p.src === 'shop').length;
      return this.say(`В магазине сейчас ${n} позиций (данные из 1С). Вот что есть в большом количестве:`, list, ['А что под заказ?', 'Нужны кубки', 'Бюджет 15000']);
    }

    if (r.photo) {
      this.pending = { cat: r.cat, theme: r.theme, budget: r.budget };
      const list = this.withPhoto(4);
      const what = r.cat === 'cup' ? 'кубков' : r.cat === 'gramota' ? 'грамот' : 'медалей';
      return this.say(`Вот фото ${what} — карточки кликабельны:`, list, ['Что есть в наличии?', 'Под заказ есть кубки?', 'Как заказать?']);
    }

    if (r.help) return this.say('Помогу так: 1) «что есть в наличии» — покажу остатки магазина из 1С; 2) «нужны кубки на хоккей, бюджет 15000» — подберу варианты; 3) «скинь фото медалей» — покажу фото; 4) «оформи заказ» — соберу спецификацию, вы выберите доставку и оплату, заказ уйдёт сотруднику магазина.');

    if (r.bye) return this.say('Удачных турниров! Медалькин на связи — здесь и в MAX.');
    if (r.thanks && !r.order) return this.say('Всегда пожалуйста! Обращайтесь — подберу, посчитаю, оформлю.');

    if (r.order) {
      if (!this.goods.length) return this.say('Каталог ещё загружается — секунду, и повторите заказ.');
      const list = this.pending ? this.recommend(3) : this.topStock(3);
      this.order = this.buildOrder(list);
      return {
        text: 'Собрал черновик спецификации — позиции уже в корзине. Выберите доставку и оплату, оставьте имя и телефон: заказ уйдёт сотруднику в оформленной форме для заведения в 1С.',
        products: list,
        order: this.order,
        chips: ['Открыть корзину', 'Добавить грамот', 'Сколько выйдет с доставкой?'],
      };
    }

    if (r.hello && !r.cat && !r.theme && !r.budget) return this.say('Приветствую! Я Медалькин, консультант «РАСПОРТ». Скажите, на какое мероприятие нужны награды — подберу медали, кубки и грамоты под бюджет.', null, ['Что есть в наличии?', 'Кубки на хоккей', 'Бюджет 15000 на медали']);

    /* содержательный запрос: категория/тема/бюджет/цена */
    if (r.cat || r.theme || r.budget || r.price || r.qty) {
      this.pending = { cat: r.cat, theme: r.theme, budget: r.budget, qty: r.qty };
      this.shown.clear();
      const list = this.recommend(4);
      let head = 'Подобрал варианты';
      if (r.cat) head += ` — ${({ medal: 'медали', gramota: 'грамоты', cup: 'кубки' })[r.cat] || 'каталог'}`;
      if (r.theme) head += `, тема «${THEMES[r.theme] || r.theme}»`;
      if (r.budget) head += `, до ${this.money(r.budget)}`;
      if (r.price && !r.budget) head = 'Вот цены на ходовые позиции';
      head += '. «В наличии» — выдача сегодня, «под заказ» — 2–3 дня:';
      return this.say(head, list, ['Скинь фото', 'Что есть в наличии?', 'Оформи заказ']);
    }

    if (/(под заказ|удалённ|удаленн|поставщик|rossimvol|ассортимент)/.test(text.toLowerCase())) {
      const remote = this.goods.filter(p => p.src === 'remote' && (!this.pending?.cat || p.cat === this.pending.cat))
        .sort((a, b) => a.price - b.price).slice(0, 4);
      return this.say('Удалённый склад поставщика — кубки и грамоты под заказ 2–3 дня. Вот доступное:', remote, ['Нужны кубки подешевле', 'Оформи заказ', 'А медали есть?']);
    }

    if (/(дешев|подешев|эконом|бюджетн)/.test(text.toLowerCase())) {
      this.pending = { ...this.pending, budget: 5000 };
      return this.say('Вот самые доступные позиции по запросу:', this.recommend(4), ['Оформи заказ', 'Скинь фото']);
    }

    if (/(^|\s)(да|давай|ещё|еще|продолж|покажи ещё)\b/.test(text.toLowerCase())) {
      const more = this.recommend(4);
      if (more.length) return this.say('Вот ещё варианты:', more);
      this.shown.clear();
      return this.say('Это была подборка целиком — уточните категорию, тему или бюджет, пройдусь заново.', this.recommend(4));
    }

    return this.say('Не понял задачу, но точно помогу. Скажите: какие награды нужны (медали, кубки, грамоты), на какое мероприятие и в каком бюджете. Например: «кубки на хоккейный турнир, 3 штуки, до 15000».', null, ['Что есть в наличии?', 'Кубки на хоккей', 'Как заказать?']);
  }

  say(text, products = null, chips = null, order = null) { return { text, products, chips, order }; }

  greet() {
    return {
      text: 'Здравствуйте! Я Медалькин — консультант «РАСПОРТ». Помогу подобрать медали, кубки и грамоты: скажите, на какое мероприятие нужны награды и в каком бюджете. Покажу наличие магазина (данные из 1С) или удалённый склад поставщика под заказ.',
      chips: ['Что есть в наличии?', 'Нужны кубки на хоккей', 'Бюджет 15000 на медали', 'Скинь фото медалей'],
    };
  }

  orderConfirmed() {
    return this.say('Заказ принят! Спецификация у сотрудника магазина: он заведёт заказ в 1С, сверит остатки и перезвонит для подтверждения. Если что — я рядом, здесь и в MAX.');
  }
}
