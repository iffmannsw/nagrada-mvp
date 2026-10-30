/* ═══════════════════════════════════════════════════
   РАСПОРТ — справочники и генераторы SVG-иллюстраций
   Ассортимент приходит из data/*.json (1С и парсер
   rossimvol) — см. js/shop.js; тут только словари и арта
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
  volleyball:'Волейбол',
  run:       'Бег и лыжи',
  school:    'Школа и учёба',
  kids:      'Детские мероприятия',
  office:    'Для компаний',
  may9:      '9 Мая',
};

/* источники товара для витрины */
const SOURCES = {
  shop:   { label: 'Магазин',        tag: 'В НАЛИЧИИ', stock: 'Выдача сегодня — собственный склад' },
  remote: { label: 'Удалённый склад', tag: 'ПОД ЗАКАЗ', stock: 'Под заказ 2–3 дня — склад поставщика' },
};

/* карты металлов из характеристик 1С */
const METAL_LABELS = { gold: 'золото', silver: 'серебро', bronze: 'бронза', mix: 'микс' };

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
  red: { frame: '#E03810', seal: '#8E2130', deco: '#E03810' },
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
/* Медалькин-Солнце: в имени РАспорт «РА» — Солнце, поэтому маскот —
   солнечная медаль: диск в лучах-лепестках, тёплое золото, фирменная
   красная лента РАСПОРТ. Реальные солнечные медали появятся в архиве
   референсов — знак рисован под этот мотив. */
function mascotSVG(opts = {}) {
  const happy = !!opts.happy, g = uid();
  /* лучи солнца: 12 лепестков вокруг диска */
  let rays = '';
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 - 90) * Math.PI / 180;
    const x1 = 100 + Math.cos(a) * 64, y1 = 152 + Math.sin(a) * 64;
    const x2 = 100 + Math.cos(a) * 82, y2 = 152 + Math.sin(a) * 82;
    rays += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
  }
  return `<svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Медалькин — солнечная медаль">
  <defs>
    <linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#F6DE83"/><stop offset=".5" stop-color="#E8B93F"/><stop offset="1" stop-color="#C9930F"/>
    </linearGradient>
    <linearGradient id="r${g}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#E03810"/><stop offset="1" stop-color="#B92E0D"/>
    </linearGradient>
    <clipPath id="c${g}"><circle cx="100" cy="152" r="62"/></clipPath>
  </defs>

  <!-- лента РАСПОРТ -->
  <path d="M56 6h30l8 68-16 26-10-8z" fill="url(#r${g})"/>
  <path d="M114 6h30l-18 86-24 10-8-12z" fill="#9E250A"/>
  <path d="M100 6h12l6 46-12 10-12-10z" fill="#E8B93F"/>

  <!-- лучи -->
  <g class="m-rays" stroke="#E8B93F" stroke-width="9" stroke-linecap="round" opacity=".92">${rays}</g>

  <!-- солнечный диск -->
  <circle cx="100" cy="152" r="63" fill="url(#${g})"/>
  <circle cx="100" cy="152" r="63" fill="none" stroke="#B98A12" stroke-width="2.5"/>
  <circle cx="100" cy="152" r="50" fill="none" stroke="#FFF3C4" stroke-width="1.6" stroke-dasharray="1 6" stroke-linecap="round" opacity=".9"/>
  <g clip-path="url(#c${g})">
    <rect class="m-shine" x="-14" y="82" width="18" height="140" rx="9" fill="#FFFDF6" opacity="0"/>
    <circle cx="72" cy="128" r="26" fill="#FFF6D8" opacity=".28"/>
  </g>

  <!-- лицо -->
  <g class="m-face">
    <ellipse class="m-eye" cx="78" cy="144" rx="7.5" ry="10.5" fill="#5B3A08"/>
    <ellipse class="m-eye" cx="122" cy="144" rx="7.5" ry="10.5" fill="#5B3A08"/>
    <circle cx="80.5" cy="140.5" r="2.8" fill="#FFF"/>
    <circle cx="124.5" cy="140.5" r="2.8" fill="#FFF"/>
    <ellipse cx="60" cy="163" rx="10" ry="6" fill="#F2A65A" opacity=".6"/>
    <ellipse cx="140" cy="163" rx="10" ry="6" fill="#F2A65A" opacity=".6"/>
    ${happy
      ? `<path class="m-smile" d="M80 168c6 13 34 13 40 0" fill="#5B3A08" stroke="#5B3A08" stroke-width="7" stroke-linejoin="round"/>`
      : `<path class="m-smile" d="M82 170c5 8 31 8 36 0" fill="none" stroke="#5B3A08" stroke-width="6" stroke-linecap="round"/>`}
  </g>

  <path class="m-spark" d="M30 60l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#F2C94C"/>
  <path class="m-spark m-spark--2" d="M172 100l2.4 5.6 5.6 2.4-5.6 2.4-2.4 5.6-2.4-5.6-5.6-2.4 5.6-2.4z" fill="#F2C94C"/>
  <path class="m-spark m-spark--3" d="M158 36l2 4.6 4.6 2-4.6 2-2 4.6-2-4.6-4.6-2 4.6-2z" fill="#F2C94C"/>
</svg>`;
}

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
