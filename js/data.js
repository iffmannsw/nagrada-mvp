/* ═══════════════════════════════════════════════════
   Данные каталога и генераторы SVG-иллюстраций
   Ассортимент и цены — ознакомительные, по мотивам rossimvol.ru
   ═══════════════════════════════════════════════════ */

const CATS = {
  medal:   { label: 'Медали',  one: 'медаль'  },
  gramota: { label: 'Грамоты', one: 'грамота' },
  cup:     { label: 'Кубки',   one: 'кубок'   },
};

const THEMES = {
  universal: 'Универсальные',
  victory:   '1–3 место',
  football:  'Футбол',
  hockey:    'Хоккей',
  chess:     'Шахматы',
  school:    'Школа и учёба',
  kids:      'Детские мероприятия',
  office:    'Для компаний',
  may9:      '9 Мая',
};

const PRODUCTS = [
  /* ── МЕДАЛИ ── реальные товары rossimvol.ru, розничная цена ≈ закупка ×2 */
  { id: 'm1', cat: 'medal', art: 'MMC7071', name: 'Медаль «1 место» MMC7071, 70 мм', price: 300, oldPrice: 350, badge: 'hit',
    themes: ['victory', 'universal'], img: 'img/medal_mmc7071.jpg',
    artc: { kind: 'medal', metal: 'gold', icon: 'n1', ribbon: 'red' },
    desc: 'Крупная золотая медаль «1 место» диаметром 70 мм — солидно смотрится на церемонии любого уровня. Лента в комплекте.' },
  { id: 'm2', cat: 'medal', art: 'MD1750', name: 'Медаль «1 место» MD1750, 50 мм', price: 140, oldPrice: 175, badge: 'sale',
    themes: ['victory', 'universal'], img: 'img/medal_md1750.jpg',
    artc: { kind: 'medal', metal: 'gold', icon: 'n1', ribbon: 'bordeaux' },
    desc: 'Классическая золотая медаль «1 место» 50 мм — рабочий формат для турниров с большим числом награждений.' },
  { id: 'm3', cat: 'medal', art: 'MD2450', name: 'Медаль «Футбол» MD2450, 50 мм', price: 145, badge: 'hit',
    themes: ['football', 'universal'], img: 'img/medal_md2450.jpg',
    artc: { kind: 'medal', metal: 'gold', icon: 'ball', ribbon: 'green' },
    desc: 'Футбольная медаль с мячом — для лиг, дворовых турниров и чемпионатов школ.' },
  { id: 'm4', cat: 'medal', art: 'MMC6064', name: 'Медаль «1 место» MMC6064, 60 мм', price: 305, badge: 'new',
    themes: ['victory', 'universal'], img: 'img/medal_mmc6064.jpg',
    artc: { kind: 'medal', metal: 'gold', icon: 'n1', ribbon: 'blue' },
    desc: 'Увеличенная медаль «1 место» 60 мм с рельефным бортиком — вариант, когда награда должна быть «погромче».' },
  { id: 'm5', cat: 'medal', art: 'MMC2350', name: 'Медаль «Бег» MMC2350, 50 мм', price: 140,
    themes: ['universal', 'victory'], img: 'img/medal_mmc2350.jpg',
    artc: { kind: 'medal', metal: 'gold', icon: 'star', ribbon: 'red' },
    desc: 'Медаль для легкоатлетических забегов и кроссов — бегун в динамике, золото, лента в комплекте.' },
  { id: 'm6', cat: 'medal', art: 'ME005', name: 'Медаль «1 место» ME005, 50 мм', price: 140,
    themes: ['victory', 'universal'], img: 'img/medal_me005.jpg',
    artc: { kind: 'medal', metal: 'silver', icon: 'n1', ribbon: 'bordeaux' },
    desc: 'Медаль «1 место» серии ME — аккуратный рельеф, ровная позолота. Берут комплектами на 1–3 место.' },
  { id: 'm7', cat: 'medal', art: 'ME008', name: 'Медаль «Волейбол» ME008, 50 мм', price: 135,
    themes: ['universal', 'victory'], img: 'img/medal_me008.jpg',
    artc: { kind: 'medal', metal: 'gold', icon: 'ball', ribbon: 'blue' },
    desc: 'Волейбольная медаль с мячом — турниры школ, секций и любительских лиг.' },
  { id: 'm8', cat: 'medal', art: 'MMA4510', name: 'Медаль «1 место» MMA4510, 45 мм', price: 130,
    themes: ['victory', 'universal'], img: 'img/medal_mma4510.jpg',
    artc: { kind: 'medal', metal: 'bronze', icon: 'n1', ribbon: 'green' },
    desc: 'Компактная медаль «1 место» 45 мм — экономичный вариант для массовых награждений.' },
  { id: 'm9', cat: 'medal', art: 'MMC3350', name: 'Медаль «Лыжи» MMC3350, 50 мм', price: 140,
    themes: ['universal', 'victory'], img: 'img/medal_mmc3350.jpg',
    artc: { kind: 'medal', metal: 'silver', icon: 'star', ribbon: 'blue' },
    desc: 'Лыжная медаль для зимних гонок и «лыжни России» — рельеф с лыжником, серебро.' },

  /* ── ГРАМОТЫ ── */
  { id: 'g1', cat: 'gramota', art: 'ГР-18', name: 'Грамота ГР-18 «Российская геральдика»', price: 25, badge: 'hit',
    themes: ['universal', 'school'], img: 'img/gramota_gr_18.jpg',
    artc: { kind: 'gramota', accent: 'gold' },
    desc: 'Плотный дизайнерский бланк с золотой геральдической рамкой — универсальная награда для официальных мероприятий.' },
  { id: 'g2', cat: 'gramota', art: 'ГР-60', name: 'Грамота ГР-60', price: 25,
    themes: ['universal', 'school'], img: 'img/gramota_gr_60.jpg',
    artc: { kind: 'gramota', accent: 'bordeaux' },
    desc: 'Строгий бланк для массового награждения: турниры, олимпиады, конкурсы. Печать текста — от 10 штук.' },
  { id: 'g3', cat: 'gramota', art: 'ГР-66', name: 'Грамота ГР-66 «Российская геральдика»', price: 25, oldPrice: 30,
    themes: ['universal', 'school'], img: 'img/gramota_gr_66.jpg',
    artc: { kind: 'gramota', accent: 'gold' },
    desc: 'Грамота с государственным орнаментом и местом под печать — выглядит дороже своей цены.' },
  { id: 'g4', cat: 'gramota', art: 'ГР-53', name: 'Грамота ГР-53', price: 35,
    themes: ['universal', 'school'], img: 'img/gramota_gr_53.jpg',
    artc: { kind: 'gramota', accent: 'green' },
    desc: 'Бланк повышенной плотности с декоративной рамкой — для награждений, где грамота остаётся на память.' },
  { id: 'g5', cat: 'gramota', art: 'Д-6', name: 'Диплом Д-6 «Российская геральдика»', price: 35,
    themes: ['office', 'universal'], img: 'img/gramota_d_6.jpg',
    artc: { kind: 'gramota', accent: 'gold' },
    desc: 'Диплом в классической геральдической рамке — конкурсы профмастерства, корпоративные премии, конференции.' },
  { id: 'g6', cat: 'gramota', art: 'ГР-4', name: 'Грамота ГР-4 «Российская геральдика»', price: 35,
    themes: ['school', 'universal'], img: 'img/gramota_gr_4.jpg',
    artc: { kind: 'gramota', accent: 'bordeaux' },
    desc: 'Грамота с двуглавым орлом и триколором — для школьных и муниципальных мероприятий.' },
  { id: 'g7', cat: 'gramota', art: 'ГР-1', name: 'Грамота ГР-1 «Российская геральдика»', price: 25, badge: 'hit',
    themes: ['school', 'universal'], img: 'img/gramota_gr_1.jpg',
    artc: { kind: 'gramota', accent: 'gold' },
    desc: 'Самый ходовой бланк серии: строгая рамка, золото, уместен почти на любом награждении.' },
  { id: 'g8', cat: 'gramota', art: 'Д-7', name: 'Диплом Д-7 «Российская геральдика»', price: 35,
    themes: ['office', 'universal'], img: 'img/gramota_d_7.jpg',
    artc: { kind: 'gramota', accent: 'bordeaux' },
    desc: 'Диплом для партнёров и сотрудников — солидная рамка, место под подпись руководителя и печать.' },
  { id: 'g9', cat: 'gramota', art: 'ГР-32', name: 'Грамота «Шахматы» ГР-32', price: 25,
    themes: ['chess', 'school'], img: 'img/gramota_gr_32.jpg',
    artc: { kind: 'gramota', accent: 'blue' },
    desc: 'Бланк с шахматной тематикой — турниры школ, секций и клубных первенств.' },

  /* ── КУБКИ ── */
  { id: 'k1', cat: 'cup', art: '1523', name: 'Кубок 1523, 37 см', price: 7535, badge: 'hit',
    themes: ['universal', 'victory'], img: 'img/cup_1523.jpg',
    artc: { kind: 'cup', shape: 'prestige', metal: 'gold', base: 'marble' },
    desc: 'Статусный кубок на мраморной базе — главный трофей чемпионата или финала сезона. Гравировка на табличке в подарок.' },
  { id: 'k2', cat: 'cup', art: '2005', name: 'Кубок 2005, 49,5 см', price: 15120,
    themes: ['universal', 'victory'], img: 'img/cup_2005.jpg',
    artc: { kind: 'cup', shape: 'big', metal: 'gold', base: 'marble' },
    desc: 'Почти полуметровый кубок-доминанта церемонии: массивная чаша, устойчивая база, глубокая гравировка.' },
  { id: 'k3', cat: 'cup', art: '2007', name: 'Кубок 2007, 53 см', price: 17065, oldPrice: 18900,
    themes: ['universal', 'victory'], img: 'img/cup_2007.jpg',
    artc: { kind: 'cup', shape: 'big', metal: 'gold', base: 'black' },
    desc: 'Флагман серии: 53 см, выверенные пропорции, премиальная отделка. Для главных событий года.' },
  { id: 'k4', cat: 'cup', art: '1505', name: 'Кубок 1505, 53 см', price: 17975, badge: 'new',
    themes: ['universal', 'victory'], img: 'img/cup_1505.jpg',
    artc: { kind: 'cup', shape: 'prestige', metal: 'gold', base: 'black' },
    desc: 'Новинка поставщика: крупный кубок с изящным силуэтом — подойдёт и спорту, и корпоративной премии.' },
  { id: 'k5', cat: 'cup', art: '8300', name: 'Кубок 8300, 13,5 см', price: 575, badge: 'hit',
    themes: ['universal', 'victory'], img: 'img/cup_8300.jpg',
    artc: { kind: 'cup', shape: 'econ', metal: 'gold', base: 'black' },
    desc: 'Мини-кубок для массовых награждений: команды, места, номинации. Один — недорого, тираж — заметная экономия.' },
  { id: 'k6', cat: 'cup', art: '3018', name: 'Кубок 3018, 35 см', price: 2790,
    themes: ['universal', 'office'], img: 'img/cup_3018.jpg',
    artc: { kind: 'cup', shape: 'std', metal: 'gold', base: 'black' },
    desc: 'Классический кубок 35 см — золотая середина между солидностью и бюджетом. Хит корпоративных награждений.' },
  { id: 'k7', cat: 'cup', art: '3021', name: 'Кубок 3021, 39 см', price: 3810,
    themes: ['universal', 'victory'], img: 'img/cup_3021.jpg',
    artc: { kind: 'cup', shape: 'std', metal: 'gold', base: 'black' },
    desc: 'Кубок 39 см с широкой чашей — хорошо «читается» со сцены и на фотографиях победителей.' },
  { id: 'k8', cat: 'cup', art: '3535', name: 'Кубок 3535 «Триколор», 23 см', price: 2200, oldPrice: 2600, badge: 'sale',
    themes: ['universal', 'victory'], img: 'img/cup_3535.jpg',
    artc: { kind: 'cup', shape: 'std', metal: 'silver', base: 'black' },
    desc: 'Кубок с лентой-триколором — российские турниры, патриотические мероприятия, «лыжня России».' },
  { id: 'k9', cat: 'cup', art: '4024', name: 'Кубок 4024, 30,5 см', price: 2525,
    themes: ['universal', 'victory'], img: 'img/cup_4024.jpg',
    artc: { kind: 'cup', shape: 'std', metal: 'gold', base: 'wood' },
    desc: 'Кубок 30,5 см на деревянной базе — тёплый «классический» вид для турниров и конкурсов.' },
];

/* ── утилиты ── */
let __uid = 0;
const uid = () => 'sv' + (++__uid);
const fmt = n => n.toLocaleString('ru-RU') + ' ₽';

/* мягкая контактная тень «студийной съёмки» под предметом */
function groundShadow(g, cx, cy, rx, ry, op = .18) {
  return `<defs><filter id="sh${g}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4.5"/></filter></defs>
  <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="rgba(62,49,40,${op})" filter="url(#sh${g})"/>`;
}

/* ── металлы ── */
const METALS = {
  gold:   { hi: '#F0D46A', mid: '#C9A227', lo: '#A4831B', line: '#8a6d15' },
  silver: { hi: '#F5F6F7', mid: '#C6CBD2', lo: '#9EA3AB', line: '#7d8288' },
  bronze: { hi: '#EDC08A', mid: '#C08A4E', lo: '#96632F', line: '#7a4f26' },
};
const RIBBONS = {
  red:      ['#B32332', '#8E2130'],
  bordeaux: ['#8E2130', '#6B1A25'],
  green:    ['#2E7D4F', '#1F5C3A'],
  blue:     ['#33619E', '#24487A'],
  georgian: ['#3C3C3C', '#F0A93B'],
};

/* ══════════ МЕДАЛЬ ══════════ */
function svgMedal(c) {
  const m = METALS[c.metal], [r1, r2] = RIBBONS[c.ribbon];
  const g = uid();
  let icon = '';
  const L = m.line;
  switch (c.icon) {
    case 'star':
      icon = `<path d="M100 118l9.5 20.5 22 2.6-16.2 15.3 4.4 21.9-19.7-11-19.7 11 4.4-21.9-16.2-15.3 22-2.6z" fill="${L}"/>`;
      break;
    case 'n1': icon = numberIcon('1', L, m); break;
    case 'n2': icon = numberIcon('2', L, m); break;
    case 'n3': icon = numberIcon('3', L, m); break;
    case 'ball':
      icon = `<circle cx="100" cy="152" r="26" fill="${L}"/>
        <path d="M100 126a26 26 0 0 1 0 52z" fill="${m.mid}" opacity=".55"/>
        <polygon points="100,138 112,147 107,161 93,161 88,147" fill="${m.hi}"/>
        <path d="M100 126l12 21M126 152l-14-5M124 168l-17-7M76 168l17-7M74 152l14 5M88 147l-12-21" stroke="${L}" stroke-width="4" fill="none"/>`;
      break;
    case 'hockey':
      icon = `<path d="M74 132c-4 26 2 44 14 52l6-8c-9-7-13-21-10-41zM126 132c4 26-2 44-14 52l-6-8c9-7 13-21 10-41z" fill="${L}"/>
        <circle cx="100" cy="164" r="11" fill="${L}"/><circle cx="100" cy="164" r="5" fill="${m.hi}"/>`;
      break;
    case 'chess':
      icon = `<path d="M92 176c-2-8 1-13 6-17-4-3-7-8-6-14 1-8 7-13 8-19-3 0-6 2-9 5-2-12 8-21 18-21s20 9 18 21c-3-3-6-5-9-5 1 6 7 11 8 19 1 6-2 11-6 14 5 4 8 9 6 17z" fill="${L}"/>`;
      break;
    case 'book':
      icon = `<path d="M74 132c14-6 22-6 26-2 4-4 12-4 26 2v38c-14-6-22-6-26-2-4-4-12-4-26 2z" fill="${L}"/>
        <path d="M100 130v38" stroke="${m.mid}" stroke-width="3"/>
        <path d="M82 142c8-3 12-3 15-1M82 152c8-3 12-3 15-1M103 141c3-2 7-2 15 1M103 151c3-2 7-2 15 1" stroke="${m.mid}" stroke-width="2.4" fill="none"/>`;
      break;
    case 'georg':
      icon = `<path d="M100 114l7 16 17 2.5-12.5 12 3 17-14.5-8-14.5 8 3-17-12.5-12 17-2.5z" fill="${L}"/>
        <path d="M70 184l8-16h10l-8 16zM112 184l8-16h10l-8 16zM86 184l8-16h10l-8 16z" fill="#F0A93B"/>`;
      break;
  }
  return `<svg class="psvg" viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Медаль">
  <defs>
    <linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${m.hi}"/><stop offset=".55" stop-color="${m.mid}"/><stop offset="1" stop-color="${m.lo}"/>
    </linearGradient>
  </defs>
  <path d="M64 0h32l6 58-20 34-6-4L70 58z" fill="${r1}"/>
  <path d="M104 0h32l-6 58-22 88-16-88 6-58z" fill="${r2}" opacity=".92"/>
  <path d="M96 0h8l4 46-8 10-8-10z" fill="${r2}"/>
  ${groundShadow(g, 100, 224, 50, 8, .2)}
  <circle cx="100" cy="158" r="64" fill="url(#${g})"/>
  <circle cx="100" cy="158" r="64" fill="none" stroke="${m.line}" stroke-width="2"/>
  <circle cx="100" cy="158" r="52" fill="none" stroke="${m.line}" stroke-width="1.6" stroke-dasharray="1 5" stroke-linecap="round" opacity=".8"/>
  <path d="M52 158a48 48 0 0 1 96 0" fill="none" stroke="#FFFDF6" stroke-width="5" stroke-linecap="round" opacity=".35"/>
  ${icon}
  <ellipse cx="76" cy="128" rx="16" ry="9" fill="#FFFDF6" opacity=".4" transform="rotate(-32 76 128)"/>
</svg>`;
}
function numberIcon(n, L, m) {
  const laurel = `<path d="M66 158c-6-14-6-27 2-40M134 158c6-14 6-27-2-40" stroke="${L}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M67 146l-9 3 5 8M133 146l9 3-5 8M68 134l-9-1 2 9M132 134l9-1-2 9" stroke="${L}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  return laurel + `<text x="100" y="176" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="52" fill="${L}">${n}</text>`;
}

/* ══════════ ГРАМОТА ══════════ */
const GR_ACCENTS = {
  gold: { frame: '#C9A227', seal: '#8E2130', deco: '#C9A227' },
  bordeaux: { frame: '#8E2130', seal: '#C9A227', deco: '#8E2130' },
  green: { frame: '#2E7D4F', seal: '#C9A227', deco: '#2E7D4F' },
  blue: { frame: '#33619E', seal: '#C9A227', deco: '#33619E' },
  georgian: { frame: '#8E2130', seal: '#3C3C3C', deco: '#F0A93B' },
};
function svgGramota(c) {
  const a = GR_ACCENTS[c.accent], g = uid(), georg = c.accent === 'georgian';
  const band = georg
    ? `<path d="M84 118l10 26-8 4-10-26zM116 118l-10 26 8 4 10-26z" fill="#3C3C3C"/><path d="M92 132h6l4 10-6 3zM102 132h6l-4 13-6-3z" fill="#F0A93B"/>`
    : '';
  return `<svg class="psvg" viewBox="0 0 240 190" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Грамота">
  <defs>
    <linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFFEF9"/><stop offset="1" stop-color="#F6EFDC"/>
    </linearGradient>
    <filter id="sh${g}" x="-8%" y="-8%" width="116%" height="116%"><feGaussianBlur stdDeviation="3"/></filter>
  </defs>
  <rect x="14" y="13" width="222" height="172" rx="7" fill="rgba(62,49,40,.16)" filter="url(#sh${g})"/>
  <rect x="8" y="8" width="224" height="174" rx="6" fill="url(#${g})" stroke="${a.frame}" stroke-width="3"/>
  <rect x="17" y="17" width="206" height="156" rx="3" fill="none" stroke="${a.frame}" stroke-width="1.1" opacity=".65"/>
  <path d="M17 40c14 0 23-9 23-23M223 40c-14 0-23-9-23-23M17 150c14 0 23 9 23 23M223 150c-14 0-23 9-23 23" fill="none" stroke="${a.deco}" stroke-width="1.6"/>
  <path d="M120 24l4.5 9.5 10.5 1.4-7.7 7.2 1.9 10.4-9.2-5-9.2 5 1.9-10.4-7.7-7.2 10.5-1.4z" fill="${a.deco}"/>
  ${band}
  <rect x="52" y="70" width="136" height="7" rx="3.5" fill="${a.deco}" opacity=".8"/>
  <rect x="64" y="88" width="112" height="5" rx="2.5" fill="#D8CBAA"/>
  <rect x="58" y="101" width="124" height="5" rx="2.5" fill="#D8CBAA"/>
  <rect x="72" y="114" width="96" height="5" rx="2.5" fill="#D8CBAA"/>
  <circle cx="186" cy="150" r="17" fill="${a.seal}"/>
  <circle cx="186" cy="150" r="12.5" fill="none" stroke="${a.seal === '#C9A227' ? '#8a6d15' : '#5C1A24'}" stroke-width="1.4" opacity=".7"/>
  <path d="M186 141l3.2 6.6 7.2.9-5.2 4.9 1.3 7.1-6.5-3.5-6.5 3.5 1.3-7.1-5.2-4.9 7.2-.9z" fill="#F5EAD2" opacity=".9"/>
</svg>`;
}

/* ══════════ КУБОК ══════════ */
const BASES = {
  black:  ['#3A322A', '#241E18'],
  marble: ['#5A5248', '#3E3830'],
  wood:   ['#7A5A38', '#5C4227'],
};
function svgCup(c) {
  const m = METALS[c.metal], [b1, b2] = BASES[c.base], g = uid(), s = uid();
  const hand = (dx, flip) => `<path d="M${dx} 96c${flip ? '-' : ''}22 2 ${flip ? '-' : ''}30 16 ${flip ? '-' : ''}26 4 ${flip ? '-' : ''}22 26 ${flip ? '-' : ''}2 12 ${flip ? '-' : ''}10 18" fill="none" stroke="url(#${g})" stroke-width="9" stroke-linecap="round"/>`;
  let top = '', body = '', base = '';
  switch (c.shape) {
    case 'econ':
      body = `<path d="M62 62h76l-7 52c-3 20-15 31-31 31s-28-11-31-31z" fill="url(#${g})" stroke="${m.line}" stroke-width="2"/>
        ${hand(62, false)}${hand(138, true)}`;
      base = baseBlock(78, 200, 44, b1, b2, m);
      stem(`<path d="M96 145h8l4 36h-16z" fill="url(#${g})" stroke="${m.line}" stroke-width="1.6"/>`);
      break;
    case 'std':
      body = `<path d="M56 52h88l-8 58c-4 23-17 35-36 35s-32-12-36-35z" fill="url(#${g})" stroke="${m.line}" stroke-width="2"/>
        <path d="M64 66h72l-2 12H66z" fill="${m.hi}" opacity=".55"/>
        ${hand(56, false)}${hand(144, true)}`;
      base = baseBlock(72, 206, 50, b1, b2, m) + baseLine(80, 206);
      stem(`<path d="M95 145h10l6 36h-22z" fill="url(#${g})" stroke="${m.line}" stroke-width="1.6"/><circle cx="100" cy="150" r="9" fill="url(#${g})" stroke="${m.line}"/>`);
      break;
    case 'prestige':
      body = `<path d="M58 46h84l-9 56c-4 21-16 32-33 32s-29-11-33-32z" fill="url(#${g})" stroke="${m.line}" stroke-width="2"/>
        ${hand(58, false)}${hand(142, true)}
        <path d="M100 134l8 14h-16z" fill="${m.lo}"/>`;
      base = baseBlock(76, 204, 48, b1, b2, m) + baseBlock(66, 212, 30, b1, b2, m);
      stem(`<rect x="93" y="148" width="14" height="40" rx="3" fill="url(#${g})" stroke="${m.line}" stroke-width="1.4"/>`);
      break;
    case 'ball':
      top = `<circle cx="100" cy="34" r="17" fill="url(#${g})" stroke="${m.line}" stroke-width="1.6"/>
        <polygon points="100,24 109,31 106,41 94,41 91,31" fill="${m.line}"/>
        <path d="M100 17l9 14M117 34l-11 3M115 46l-9-5M85 46l9-5M83 34l11 3M91 31l-9-17" stroke="${m.line}" stroke-width="2.2" fill="none"/>`;
      body = `<path d="M64 58h72l-7 50c-3 19-14 30-29 30s-26-11-29-30z" fill="url(#${g})" stroke="${m.line}" stroke-width="2"/>
        ${hand(64, false)}${hand(136, true)}`;
      base = baseBlock(78, 200, 44, b1, b2, m);
      stem(`<path d="M96 138h8l4 44h-16z" fill="url(#${g})" stroke="${m.line}" stroke-width="1.4"/>`);
      break;
    case 'hockeyp':
      top = `<path d="M84 40l24-16 4 6-22 16zM112 34l6 14 6-3-6-14zM86 46l8 6-4 6-8-6z" fill="${m.line}"/>
        <circle cx="106" cy="44" r="8" fill="url(#${g})" stroke="${m.line}" stroke-width="1.6"/><circle cx="106" cy="44" r="3" fill="${m.line}"/>`;
      body = `<path d="M64 58h72l-7 50c-3 19-14 30-29 30s-26-11-29-30z" fill="url(#${g})" stroke="${m.line}" stroke-width="2"/>
        ${hand(64, false)}${hand(136, true)}`;
      base = baseBlock(78, 200, 44, b1, b2, m);
      stem(`<path d="M96 138h8l4 44h-16z" fill="url(#${g})" stroke="${m.line}" stroke-width="1.4"/>`);
      break;
    case 'chessp':
      top = `<path d="M94 16c-7 4-9 12-7 20-4 3-7 8-6 14 1 5 4 8 8 10h22c4-2 7-5 8-10 1-6-2-11-6-14 2-8 0-16-7-20-3-2-9-2-12 0z" fill="url(#${g})" stroke="${m.line}" stroke-width="1.6"/>
        <path d="M88 62h24l-2 8H90z" fill="${m.lo}"/>`;
      body = `<path d="M70 74h60l-6 36c-3 16-12 26-24 26s-21-10-24-26z" fill="url(#${g})" stroke="${m.line}" stroke-width="2"/>`;
      base = baseBlock(78, 200, 46, b1, b2, m);
      stem(`<path d="M95 136h10l3 50h-16z" fill="url(#${g})" stroke="${m.line}" stroke-width="1.4"/>`);
      break;
    case 'crystal':
      body = `<path d="M62 50l14 84 24 18 24-18 14-84z" fill="url(#${s})" stroke="#9BB7C9" stroke-width="2"/>
        <path d="M76 62l10 78M124 62l-10 78M62 50l38 22 38-22M86 132l14 20 14-20" stroke="#C7DBE8" stroke-width="1.4" fill="none" opacity=".8"/>
        <path d="M70 54l26 16-24 4z" fill="#FFF" opacity=".5"/>
        <path d="M92 150h16l5 36h-26z" fill="url(#${g})" stroke="#9BB7C9" stroke-width="1.6"/>`;
      base = baseBlock(74, 206, 44, b1, b2, METALS.gold);
      break;
    case 'oscar':
      body = `<path d="M100 26c8 0 13 6 13 13 0 6-3 9-3 14l14 45c2 8-2 14-10 14H86c-8 0-12-6-10-14l14-45c0-5-3-8-3-14 0-7 5-13 13-13z" fill="url(#${g})" stroke="${m.line}" stroke-width="2"/>
        <path d="M96 16a8 8 0 0 1 8 0l6 4-4 8h-12l-4-8z" fill="url(#${g})" stroke="${m.line}" stroke-width="1.6"/>
        <path d="M88 112l-6 18h36l-6-18" fill="${m.lo}"/>
        <path d="M92 126h16l6 58h-28z" fill="url(#${g})" stroke="${m.line}" stroke-width="1.8"/>`;
      base = baseBlock(76, 204, 46, b1, b2, m);
      break;
    case 'big':
      body = `<path d="M52 42h96l-10 62c-5 26-20 39-38 39s-33-13-38-39z" fill="url(#${g})" stroke="${m.line}" stroke-width="2.2"/>
        <path d="M62 56h76l-3 12H65z" fill="${m.hi}" opacity=".5"/>
        ${hand(52, false)}${hand(148, true)}`;
      base = baseBlock(64, 216, 40, b1, b2, m) + baseLine(72, 216) + `<rect x="84" y="172" width="32" height="10" rx="2" fill="url(#${g})" stroke="${m.line}"/>`;
      stem(`<path d="M94 143h12l6 52h-24z" fill="url(#${g})" stroke="${m.line}" stroke-width="1.8"/>`);
      break;
  }
  function stem(inner) { body += inner; }
  function baseBlock(x, yBottom, w, bb1, bb2, mm) {
    const h = 22, y = yBottom - h;
    return `${groundShadow(g, x + w / 2, yBottom + 4, Math.round(w * .56), 7, .2)}
      <path d="M${x} ${yBottom} h${w} l-9 -${h} h-${w - 18} z" fill="${bb1}"/>
      <path d="M${x + 9} ${y} h${w - 18} l-4 -6 h-${w - 26} z" fill="${bb2}"/>
      <rect x="${x + 14}" y="${y + 4}" width="${w - 28}" height="10" rx="2" fill="url(#${g})" stroke="${mm.line}" stroke-width="1"/>`;
  }
  function baseLine(x, yBottom) { return ''; }
  return `<svg class="psvg" viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Кубок">
  <defs>
    <linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${m.hi}"/><stop offset=".5" stop-color="${m.mid}"/><stop offset="1" stop-color="${m.lo}"/>
    </linearGradient>
    <linearGradient id="${s}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#EAF4FA"/><stop offset=".5" stop-color="#BCD5E4"/><stop offset="1" stop-color="#8FB3C6"/>
    </linearGradient>
  </defs>
  ${top}${body}${base}
  <ellipse cx="82" cy="60" rx="10" ry="18" fill="#FFFDF6" opacity=".35" transform="rotate(-14 82 60)"/>
</svg>`;
}

/* ══════════ Медалькин ══════════ */
function mascotSVG(opts = {}) {
  const happy = !!opts.happy, g = uid();
  return `<svg viewBox="0 0 200 230" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Медалькин">
  <defs>
    <linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#F0D46A"/><stop offset=".55" stop-color="#C9A227"/><stop offset="1" stop-color="#A4831B"/>
    </linearGradient>
    <clipPath id="c${g}"><circle cx="100" cy="150" r="70"/></clipPath>
  </defs>
  <path d="M62 0h34l6 62-22 40-4-6-14-96z" fill="#8E2130"/>
  <path d="M104 0h34l-14 96-24 88-16-88 6-58z" fill="#6B1A25"/>
  <path d="M94 0h10l4 50-9 12-9-12z" fill="#C9A227" opacity=".9"/>
  <circle cx="100" cy="150" r="70" fill="url(#${g})"/>
  <circle cx="100" cy="150" r="70" fill="none" stroke="#8a6d15" stroke-width="2.5"/>
  <circle cx="100" cy="150" r="57" fill="none" stroke="#8a6d15" stroke-width="1.6" stroke-dasharray="1 5" stroke-linecap="round"/>
  <g clip-path="url(#c${g})"><rect class="m-shine" x="-14" y="80" width="18" height="140" rx="9" fill="#FFFDF6" opacity="0"/></g>
  <g class="m-face">
    <ellipse class="m-eye" cx="76" cy="140" rx="7.5" ry="10" fill="#4A3410"/>
    <ellipse class="m-eye" cx="124" cy="140" rx="7.5" ry="10" fill="#4A3410"/>
    <circle cx="78.5" cy="136.5" r="2.6" fill="#FFF"/>
    <circle cx="126.5" cy="136.5" r="2.6" fill="#FFF"/>
    <ellipse cx="60" cy="160" rx="10" ry="6" fill="#E89B5A" opacity=".55"/>
    <ellipse cx="140" cy="160" rx="10" ry="6" fill="#E89B5A" opacity=".55"/>
    ${happy
      ? `<path class="m-smile" d="M80 164c6 12 34 12 40 0" fill="#4A3410" stroke="#4A3410" stroke-width="7" stroke-linejoin="round"/>`
      : `<path class="m-smile" d="M82 166c5 8 31 8 36 0" fill="none" stroke="#4A3410" stroke-width="6" stroke-linecap="round"/>`}
  </g>
  <path class="m-spark" d="M34 66l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#E9C759"/>
  <path class="m-spark m-spark--2" d="M170 96l2.4 5.6 5.6 2.4-5.6 2.4-2.4 5.6-2.4-5.6-5.6-2.4 5.6-2.4z" fill="#E9C759"/>
  <path class="m-spark m-spark--3" d="M160 40l2 4.6 4.6 2-4.6 2-2 4.6-2-4.6-4.6-2 4.6-2z" fill="#E9C759"/>
</svg>`;
}

/* ═══════════════════════════════════════════════════
   ГОТОВЫЕ КОМПЛЕКТЫ — дизайнерские решения под сценарий
   discount — выгода комплекта против заказа по частям
   ═══════════════════════════════════════════════════ */
const KITS = [
  {
    id: 'kit-sport', num: '01', name: 'Большой турнир',
    scene: 'Соревнование или спартакиада — кубок чемпиону, 15 медалей призёрам и грамота каждому участнику.',
    items: [['k5', 1], ['m2', 5], ['m6', 5], ['m7', 5], ['g2', 15]],
    composition: { cup: 'k5', gramota: 'g2', gramota2: 'g2', medalL: 'm2', medalR: 'm6' },
    badge: 'выгода 10%',
    note: 'Медали — комплектом на 15 призёров, гравировка кубка в подарок',
  },
  {
    id: 'kit-school', num: '02', name: 'Школьное торжество',
    scene: 'Линейка или предметная неделя — кубок лучшему классу, медали и грамоты «Российская геральдика».',
    items: [['k7', 1], ['m8', 10], ['g1', 20]],
    composition: { cup: 'k7', gramota: 'g1', gramota2: 'g1', medalL: 'm8', medalR: 'm8' },
    badge: 'выгода 10%',
    note: 'Заполним грамоты по списку класса — пришлите имена, печати уже стоят',
  },
  {
    id: 'kit-office', num: '03', name: 'Корпоративное признание',
    scene: 'Итоги года или конкурс профмастерства — кубок команде-победителю, дипломы лучшим, благодарности партнёрам.',
    items: [['k6', 1], ['g5', 10], ['g8', 5]],
    composition: { cup: 'k6', gramota: 'g5', gramota2: 'g8', medalL: null, medalR: null },
    badge: 'выгода 10%',
    note: 'Гравировка имён и логотипа компании на кубке — в цене комплекта',
  },
];

const KIT_DISCOUNT = 0.10;

/* арта товара: фото, если задано p.img, иначе студийный SVG */
function productArt(p) {
  if (p.img) return `<img class="psvg" src="${p.img}" alt="${p.name}" loading="lazy">`;
  return svgArt(p.artc);
}

/* арта товара по его конфигу */
function svgArt(artc) {
  if (artc.kind === 'medal') return svgMedal(artc);
  if (artc.kind === 'gramota') return svgGramota(artc);
  return svgCup(artc);
}
