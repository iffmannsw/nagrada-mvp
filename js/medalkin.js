/* ═══════════════════════════════════════════════════════════
   Медалькин — рабочий агент-продавец (демо-полноценный).
   Класс не зависит от DOM — переносится в бота MAX как есть.

   Умеет (полный цикл консультации → продажи):
   • консультирует по товарам: подбор под категорию/тему/бюджет/тираж
     с пояснением цены, склада и сроков;
   • наличие: остатки магазина из 1С и «под заказ» у поставщика;
   • фото: карточки с фото по запросу;
   • продаёт: «беру подборку / добавь / оформи заказ» — наполняет
     корзину (actions), собирает спецификацию-черновик;
   • ведёт по оформлению: пошагово объясняет форму заказа и
     комментирует каждое обязательное поле (гравировка, доставка,
     оплата, покупатель) — как живой продавец у стойки.

   Контракт ответа handle():
   { text, products?, order?, chips?, actions? }
   actions исполняет сайт: add(id, vi, qty) / openCart / openForm / clearCart
   ═══════════════════════════════════════════════════════════ */

class MedalkinBrain {
  constructor(goods = []) {
    this.goods = goods;
    this.shown = new Set();
    this.pending = null;        // текущая задача подбора {cats, theme, budget, qty}
    this.lastPick = [];         // последняя подборка [{id, vi, qty}]
    this.order = null;
  }

  setGoods(goods) { this.goods = goods; }
  money(n) { return n.toLocaleString('ru-RU') + ' ₽'; }

  /* ── разбор запроса ── */
  parse(text) {
    const t = text.toLowerCase();
    const r = { cats: new Set(), theme: null, budget: null, qty: null,
      stock: false, photo: false, price: false, order: false, hello: false,
      bye: false, thanks: false, who: false, help: false, delivery: false,
      engrave: false, payment: false, procedure: false, buy: false,
      cart: false, clear: false, more: false, cheaper: false, yes: false,
      remote: false };

    if (/(^|\s)(привет|здравствуй|добрый\s*(день|вечер|утро)|хай|доброе\s*утро|ку\b)/.test(t)) r.hello = true;
    if (/(пока|до связи|всего доброго|до свидания)\b/.test(t)) r.bye = true;
    if (/(спасибо|благодар)/.test(t)) r.thanks = true;
    if (/(кто ты|ты кто|что ты умеешь|как тебя зовут|ты бот|ты человек|что умеешь)/.test(t)) r.who = true;
    if (/(помощь|help|что можно|как пользоваться|не знаю что)/.test(t)) r.help = true;
    if (/(доставк|самовывоз|курьер|сдэк|почтой|транспорт)/.test(t)) r.delivery = true;
    if (/(гравир|надпис|текст на|фамили|имя на)/.test(t)) r.engrave = true;
    if (/(оплат|наличн|картой|счёт|счет|безнал|юр\.?\s*лиц)/.test(t)) r.payment = true;
    if (/(наличи|что есть|в наличии|склад|складе|остатк|есть ли)/.test(t)) r.stock = true;
    if (/(фото|фотк|картин|покажи|скинь|пришли|глянь)/.test(t)) r.photo = true;
    if (/(цена|цены|стоим|почём|почем|сколько стоит|прайс)/.test(t)) r.price = true;
    if (/(как оформить|как заказать|процедур|шаги|форма заказа|что заполнять|как заполнить|как делать заказ)/.test(t)) r.procedure = true;
    if (/(под заказ|удалённ|удаленн|поставщик|rossimvol|ассортимент)/.test(t)) r.remote = true;

    /* покупка и корзина — самые сильные намерения */
    if (/(беру|добавь|добавить в корзину|в корзину|заказывай|оформи|оформить заказ|давай заказ|собери заказ|собери корзину|куплю|покупаю|согласен на подборку)/.test(t)) r.buy = true;
    if (/(что в корзине|мо[яё] корзина|корзина)/.test(t) && !r.buy) r.cart = true;
    if (/(очист|убер|удал|отмен).{0,12}(корзин|заказ|всё|все)/.test(t)) r.clear = true;
    if (/(^|\s)(да|давай|согласен|ок|окей|хорошо)\b/.test(t)) r.yes = true;
    if (/(ещё|еще|продолж|другие)/.test(t)) r.more = true;
    if (/(дешев|подешев|эконом|бюджетн|попроще)/.test(t)) r.cheaper = true;
    if (/(заказ|спецификац)/.test(t) && !r.buy && !r.procedure && !r.cart) r.order = true;

    if (/медал/.test(t)) r.cats.add('medal');
    if (/(грамот|диплом|благодарн|сертификат)/.test(t)) r.cats.add('gramota');
    if (/(куб|трофе|статуэт)/.test(t)) r.cats.add('cup');

    if (/(хокке)/.test(t)) r.theme = 'hockey';
    else if (/(футбол)/.test(t)) r.theme = 'football';
    else if (/(шахмат)/.test(t)) r.theme = 'chess';
    else if (/(волейбол)/.test(t)) r.theme = 'volleyball';
    else if (/(бег|марафон|лыж|спартак)/.test(t)) r.theme = 'run';
    else if (/(школ|учени|знани|олимпиад)/.test(t)) r.theme = 'school';
    else if (/(1\s*место|победител|чемпион|призёр|призер)/.test(t)) r.theme = 'victory';
    else if (/(детск|сад|малыш|юн[ыо])/.test(t)) r.theme = 'kids';

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

  /* ── поиск и подбор ── */
  score(p) {
    let s = 0;
    if (this.pending) {
      const { cats, theme, budget } = this.pending;
      if (cats && cats.size && cats.has(p.cat)) s += 3;
      if (theme) s += p.theme === theme ? 2 : (p.theme === 'universal' ? 0.4 : -0.6);
      if (budget) {
        if (p.price <= budget) s += 1.5; else s -= (p.price - budget) / Math.max(budget, 1) * 2;
      }
    }
    if (p.src === 'shop') s += 0.6;
    const bestAvail = p.variants ? Math.max(...p.variants.map(v => v.avail || 0), p.stock || 0) : (p.stock || 0);
    if (bestAvail > 20) s += 0.6;
    if (p.cover && p.cover.img) s += 0.3;
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
      .sort((a, b) => (b.stock || 0) - (a.stock || 0)).slice(0, k);
  }

  withPhoto(k = 4) {
    const wantCat = this.pending?.cats?.size === 1 ? [...this.pending.cats][0] : null;
    let list = this.goods.filter(p => p.cover && p.cover.img && (!wantCat || p.cat === wantCat))
      .sort((a, b) => (b.src === 'shop') - (a.src === 'shop') || (b.stock || 0) - (a.stock || 0));
    if (list.length < k) {
      const extra = this.goods.filter(p => !(p.cover && p.cover.img) && (!wantCat || p.cat === wantCat))
        .sort((a, b) => (b.stock || 0) - (a.stock || 0));
      list = list.concat(extra.slice(0, k - list.length));
    }
    return list.slice(0, k);
  }

  shopStats() {
    const shop = this.goods.filter(p => p.src === 'shop');
    return { items: shop.length, units: shop.reduce((s, p) => s + (p.stock || 0), 0) };
  }

  /* корзина из последней подборки */
  pickToCart() {
    if (!this.lastPick.length) this.lastPick = this.topStock(3).map(p => ({ id: p.id, vi: 0, qty: 1 }));
    return this.lastPick.map(x => ({ t: 'add', id: x.id, vi: x.vi, qty: x.qty || 1 }));
  }

  buildOrderFromPick() {
    const items = this.lastPick.map(x => {
      const p = this.goods.find(g => g.id === x.id);
      if (!p) return null;
      const v = p.variants[x.vi] || p.variants[0];
      const qty = x.qty || 1;
      return { name: p.name, qty, price: v.price, sum: v.price * qty };
    }).filter(Boolean);
    return { items, total: items.reduce((s, i) => s + i.sum, 0) };
  }

  /* ── главная точка входа ── */
  handle(text) {
    const r = this.parse(text);
    const say = (t, o = {}) => ({ text: t, ...o });

    if (r.who) return say('Я Медалькин — агент-продавец магазина «РАСПОРТ». Работаю так: подбираю награды под задачу и бюджет → показываю наличие и фото → собираю корзину → провожу по оформлению до спецификации. Просто напишите задачу: «нужны медали и кубки на хоккейный турнир, 30 медалей, бюджет 20000».');

    if (r.delivery) return say('Доставка: самовывоз со склада магазина — сразу после подтверждения (товары магазина отгружаем сразу); курьер по городу — 1 день; СДЭК и другие ТК — 2–5 дней. Позиции под заказ приезжают от поставщика за 5–7 дней и уходят в общий заказ.', { chips: ['Оформи заказ', 'Что есть в наличии?'] });
    if (r.payment) return say('Оплата: наличными или картой при получении, для организаций — счёт. Реквизиты можно оставить в комментарии к заказу — подготовим документы.', { chips: ['Оформи заказ', 'Как заполнить форму?'] });
    if (r.engrave && !r.procedure) return say('Гравировка — делаем: имена на медалях, надписи на кубках, заполнение грамот по списку, таблички. В заказе есть обязательное поле «Гравировка: ДА/НЕТ» — при «ДА» впишите текст, сотрудник согласует макет и стоимость. Цены услуг — в блоке «Гравировка» на странице.', { chips: ['Оформи заказ', 'Что есть в наличии?'] });

    /* процедура оформления: комментарий по каждому полю формы */
    if (r.procedure) return say(
      'Оформление — 4 шага, сопровождаю каждый:\n' +
      '1) Корзина: проверьте позиции и количество (могу собрать её за вас).\n' +
      '2) Гравировка — обязательное поле: отметьте ДА (и впишите текст: турнир, места, ФИО) или НЕТ. Без отметки форма не отправится — поле подсветится красным.\n' +
      '3) Доставка и оплата: самовывоз / курьер / транспортная компания и наличные / карта / счёт.\n' +
      '4) Покупатель: имя и телефон — сотрудник сверит наличие по 1С и перезвонит.\n' +
      'Итог уходит сотруднику спецификацией для заведения в 1С.',
      { chips: ['Собери корзину', 'Что есть в наличии?', 'Нужны кубки на хоккей'] });

    if (r.clear) return say('Очищаю корзину.', { actions: [{ t: 'clearCart' }], chips: ['Что есть в наличии?', 'Нужны медали'] });
    if (r.cart) return say('Открываю корзину — проверьте позиции и жмите «Оформить заказ». По каждому полю формы подскажу.', { actions: [{ t: 'openCart' }], chips: ['Как заполнить форму?', 'Оформи заказ'] });

    /* покупка: беру/добавь/оформи — наполняем корзину и ведём к оформлению */
    if (r.buy) {
      if (!this.goods.length) return say('Каталог ещё грузится — секунду, повторите.');
      const hadPick = this.lastPick.length > 0;
      const actions = this.pickToCart();
      this.order = this.buildOrderFromPick();
      const qtyNote = this.lastPick.some(x => x.qty > 1) ? ` (тираж по ${this.lastPick[0].qty} шт.)` : '';
      return {
        text: hadPick
          ? `Собрал корзину из подборки${qtyNote}: ${this.lastPick.length} позиции на ${this.money(this.order.total)}. Дальше — форма: гравировка (ДА/НЕТ — обязательно), доставка, оплата, имя и телефон. Если поле заполнить неверно — оно подсветится, и я подскажу.`
          : `Добавил ходовые позиции магазина на ${this.money(this.order.total)}. Проверьте корзину и оформляйте — либо сначала опишите задачу («медали на хоккей 30 шт.»), подберу точнее.`,
        products: this.lastPick.map(x => this.goods.find(g => g.id === x.id)).filter(Boolean),
        order: this.order,
        actions: [...actions, { t: 'openCart' }],
        chips: ['Как заполнить форму?', 'Сколько выйдет с доставкой?', 'Очисти корзину'],
      };
    }

    if (r.stock) {
      this.pending = { cats: r.cats, theme: r.theme, budget: r.budget, qty: r.qty };
      const list = (r.cats.size || r.theme || r.budget) ? this.recommend(4) : this.topStock(4);
      const st = this.shopStats();
      this.lastPick = list.map(p => ({ id: p.id, vi: 0, qty: r.qty || 1 }));
      return say(`В магазине ${st.items} артикулов медалей — ${st.units} шт. на балансе (данные из 1С, отгрузка сразу). Вот ходовые позиции${r.qty ? `, считаю по ${r.qty} шт.` : ''}:`, { products: list, chips: ['Беру подборку', 'А что под заказ?', 'Скинь фото'] });
    }

    if (r.photo) {
      this.pending = { cats: r.cats, theme: r.theme, budget: r.budget };
      const list = this.withPhoto(4);
      this.lastPick = list.map(p => ({ id: p.id, vi: 0, qty: 1 }));
      return say('Вот фото — карточки кликабельны, внутри крупнее и все цвета/размеры:', { products: list, chips: ['Беру подборку', 'Что есть в наличии?', 'Оформи заказ'] });
    }

    if (r.help) return say('Помогу так: 1) «что есть в наличии» — остатки магазина из 1С; 2) «нужны кубки на хоккей, бюджет 15000» — подбор; 3) «скинь фото» — карточки; 4) «беру подборку» — соберу корзину; 5) «как оформить» — проведу по шагам формы.', { chips: ['Что есть в наличии?', 'Нужны кубки на хоккей', 'Как оформить?'] });
    if (r.bye) return say('Удачных турниров! Медалькин на связи — здесь и в MAX.');
    if (r.thanks) return say('Всегда пожалуйста! Соберу заказ, посчитаю, оформлю — обращайтесь.', { chips: ['Что есть в наличии?', 'Нужны медали'] });

    /* содержательный подбор */
    if (r.cats.size || r.theme || r.budget || r.price || r.qty) {
      this.pending = { cats: r.cats, theme: r.theme, budget: r.budget, qty: r.qty };
      this.shown.clear();
      const list = this.recommend(4);
      this.lastPick = list.map(p => ({ id: p.id, vi: 0, qty: r.qty || 1 }));
      const total = this.lastPick.reduce((s, x) => {
        const p = this.goods.find(g => g.id === x.id);
        return s + (p ? p.price * (x.qty || 1) : 0);
      }, 0);
      let head = 'Подобрал';
      if (r.cats.size) head += ': ' + [...r.cats].map(c => ({ medal: 'медали', gramota: 'грамоты', cup: 'кубки' })[c]).join(' и ');
      if (r.theme) head += `, тема «${THEMES[r.theme] || r.theme}»`;
      if (r.budget) head += `, до ${this.money(r.budget)}`;
      if (r.price && !r.budget) head = 'Вот цены на ходовые позиции';
      head += '. «Отгрузка сразу» — склад магазина, «под заказ» — 5–7 дней.';
      if (r.qty) head += `\nТираж ${r.qty} шт. по этой подборке ≈ ${this.money(total)}.`;
      return say(head, { products: list, chips: ['Беру подборку', 'Покажи ещё', 'Скинь фото', 'Как оформить?'] });
    }

    if (r.remote) {
      const remote = this.goods.filter(p => p.src === 'remote')
        .sort((a, b) => a.price - b.price).slice(0, 4);
      this.lastPick = remote.map(p => ({ id: p.id, vi: 0, qty: 1 }));
      return say('Удалённый склад поставщика — кубки и грамоты под заказ 5–7 дней, полный модельный ряд проверен парсером. Вот доступное:', { products: remote, chips: ['Беру подборку', 'Нужны кубки подешевле', 'Как оформить?'] });
    }

    if (r.cheaper) {
      this.pending = { ...(this.pending || {}), budget: 5000 };
      const list = this.recommend(4);
      this.lastPick = list.map(p => ({ id: p.id, vi: 0, qty: this.pending?.qty || 1 }));
      return say('Вот самые доступные по запросу:', { products: list, chips: ['Беру подборку', 'Покажи ещё'] });
    }
    if (r.more) {
      const list = this.recommend(4);
      if (list.length) {
        this.lastPick = list.map(p => ({ id: p.id, vi: 0, qty: this.pending?.qty || 1 }));
        return say('Вот ещё варианты:', { products: list, chips: ['Беру подборку', 'Покажи ещё'] });
      }
      this.shown.clear();
      return say('Подборка закончилась — уточните категорию, тему или бюджет, пройдусь заново.', { products: this.recommend(4), chips: ['Медали', 'Кубки', 'Что есть в наличии?'] });
    }
    if (r.yes && this.lastPick.length) {
      const actions = this.pickToCart();
      this.order = this.buildOrderFromPick();
      return {
        text: `Отлично, собрал корзину: ${this.lastPick.length} позиции на ${this.money(this.order.total)}. Открываю — оформляйте, я подскажу по каждому полю.`,
        actions: [...actions, { t: 'openCart' }],
        order: this.order,
        chips: ['Как заполнить форму?', 'Очисти корзину'],
      };
    }

    if (r.hello) return say('Здравствуйте! Я Медалькин, агент-продавец «РАСПОРТ». Скажите задачу — подберу награды, покажу наличие и фото, соберу корзину и проведу по оформлению. Например: «нужны медали и кубки на хоккейный турнир, 30 медалей, бюджет 20000».', { chips: ['Что есть в наличии?', 'Нужны кубки на хоккей', 'Как оформить?'] });

    return say('Не понял задачу, но помогу. Скажите: какие награды нужны (медали, кубки, грамоты), на какое мероприятие и в каком бюджете. Например: «кубки на хоккейный турнир, 3 штуки, до 15000».', { chips: ['Что есть в наличии?', 'Нужны кубки на хоккей', 'Как оформить?'] });
  }

  greet() {
    return {
      text: 'Здравствуйте! Я Медалькин — агент-продавец «РАСПОРТ». Подберу награды под задачу и бюджет, покажу наличие магазина (1С) и удалённого склада, соберу корзину и проведу по оформлению заказа. Какая у вас задача?',
      chips: ['Что есть в наличии?', 'Нужны медали и кубки на хоккей, 30 шт', 'Бюджет 15000 на медали', 'Как оформить?'],
    };
  }

  orderConfirmed() {
    return { text: 'Заказ принят! Спецификация у сотрудника: он заведёт заказ в 1С, сверит остатки и перезвонит. Если что — я рядом, здесь и в MAX.' };
  }
}
