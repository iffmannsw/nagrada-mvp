#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Парсер v2 каталога rossimvol.ru → data/remote-stock.json (+ снимок всех
артикулов в data/rossimvol-full.json для подбора фото магазину).

Ключевые отличия v2 (по требованиям заказчика):
- ВАРИАЦИИ: у поставщика один артикул = карточка с моделями (золото/серебро/
  бронза, у кубков — исполнения). Таблица карточки даёт код модели
  («MD1750/G»), цену и числовой остаток.
- ГРУППИРОВКА: артикул не разбивается на отдельные товары — на витрину
  попадает карточка с вариантами, у каждого варианта своё фото/цена/остаток.
- ПОЛНЫЙ МОДЕЛЬНЫЙ РЯД: если хоть одна модель артикула отсутствует или её
  остаток < MIN_QTY — ВЕСЬ артикул отбрасывается.
- ХИТЫ/НОВИНКИ: бейджи категории (SALELEADER=Хит, NEWPRODUCT=Новинка)
  приоритизируют отбор витрины удалённого склада.
- Фото скачиваются только для отобранной витрины и для артикулов,
  присутствующих в 1С магазина (data/shop-stock.json), — экономим место.

Запуск:
  python3 tools/parse_rossimvol.py                       # medals+cups+diplomas
  python3 tools/parse_rossimvol.py --cats cups,diplomas  # без медалей
  python3 tools/parse_rossimvol.py --per-cat 8           # позиций на категорию
"""
import argparse
import json
import re
import ssl
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "remote-stock.json"
FULL = ROOT / "data" / "rossimvol-full.json"
IMG_DIR = ROOT / "img" / "remote"

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")
CTX = ssl.create_default_context()

CAT_MAP = {"medals": "medal", "cups": "cup", "diplomas": "gramota",
           "figuras": "figura", "awards": "award", "plates": "plate"}
MARKUP = {"medal": 2.0, "gramota": 2.0, "cup": 1.6, "figura": 1.8,
          "award": 1.8, "plate": 1.8}
MIN_QTY = 3                 # остаток модели, ниже которого артикул не берём
PER_CAT = 8                 # позиций удалённого склада на категорию

THEME_MAP = [
    (re.compile(r"футбол", re.I), "football"),
    (re.compile(r"хокк", re.I), "hockey"),
    (re.compile(r"шахмат", re.I), "chess"),
    (re.compile(r"волейбол", re.I), "volleyball"),
    (re.compile(r"бег|марафон|спартак|лыж", re.I), "run"),
    (re.compile(r"1 место|победител|чемпион", re.I), "victory"),
    (re.compile(r"школ|участ|знание", re.I), "school"),
]
METAL_BY_CODE = {"G": "gold", "S": "silver", "B": "bronze", "A": "antique",
                 "R": "red", "W": "white"}


CYR_TO_LAT_URL = str.maketrans({"А": "A", "В": "B", "С": "C", "Е": "E", "Н": "H",
                                "К": "K", "М": "M", "О": "O", "Р": "P", "Т": "T",
                                "Х": "X", "У": "Y", "Д": "D"})


def norm_slug_art(art: str) -> str:
    """Артикул 1С → слаг карточки поставщика: кириллица→латиница, без пробелов."""
    return re.sub(r"\s+", "", art.translate(CYR_TO_LAT_URL)).lower()


def slug_underscore(art: str) -> str:
    """Второй вариант слага: пробелы → подчёркивания (часть карточек так и лежит)."""
    return re.sub(r"\s+", "_", art.translate(CYR_TO_LAT_URL)).lower()


def norm_key(art: str) -> str:
    """Канонический ключ артикула: без пробелов/подчёркиваний, верхний регистр.
    Сюда приводятся и слаги поставщика, и артикулы 1С — единое пространство ключей."""
    return re.sub(r"[\s_]+", "", art.upper())


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={
        "User-Agent": UA, "Accept-Language": "ru-RU,ru;q=0.9"})
    with urllib.request.urlopen(req, timeout=35, context=CTX) as r:
        return r.read()


def art_from_url(url: str) -> str:
    m = re.search(r"/catalog/[^/]+/([^/?#]+)/?$", url)
    return m.group(1).upper() if m else ""


def norm_url(u: str) -> str:
    u = u.replace("http://", "https://", 1)
    if u.startswith("//"):
        return "https:" + u
    if u.startswith("/"):
        return "https://rossimvol.ru" + u
    return u


def category_cards(slug: str, max_pages: int):
    """Карточки категории: [(url, badge)] — badge: hit|new|None."""
    base = f"https://rossimvol.ru/catalog/{slug}/"
    cards = {}
    for page in range(1, max_pages + 1):
        url = base if page == 1 else f"{base}?PAGEN_1={page}"
        try:
            html = fetch(url).decode("utf-8", "ignore")
        except Exception as e:
            print(f"  ! {url}: {e}", file=sys.stderr)
            break
        # карточка = блок от <div class="item ..."> до следующей; бейдж внутри
        blocks = re.split(r'(?=<div[^>]+class="[^"]*\bitem\b)', html)
        found = 0
        for b in blocks:
            links = set(re.findall(rf'href="(/catalog/{slug}/[^"/]+/)"', b))
            links = {l for l in links if not re.search(r"/(by_flag|filter|by_section|by_theme)/", l)}
            if not links:
                continue
            badge = ('SALELEADER' in b and 'Хит' in b and "hit") or \
                    ('NEWPRODUCT' in b and 'Новинка' in b and "new") or None
            for l in links:
                cards.setdefault(f"https://rossimvol.ru{l}", badge)
                if badge and cards[f"https://rossimvol.ru{l}"] is None:
                    cards[f"https://rossimvol.ru{l}"] = badge
            found += 1
        if not found:
            break
        print(f"  стр.{page}: карточек {found}")
    return cards


def variant_photo(photos, art, suffix):
    """Фото варианта: ищем файл, где после базы артикула идёт _X_ (X=G/S/B…).
    Покрывает карточки, где микроразметка не связывает offer с фото."""
    if not photos:
        return None
    if not suffix:
        return photos[0]
    base = re.split(r"[_\-]", art.upper())[0]
    for p in photos:
        fn = p.split("/")[-1].upper()
        pos = fn.find(base)
        if pos >= 0 and re.match(rf"[_\-]{suffix}([_\-\.]|$)", fn[pos + len(base):]):
            return p
    # серия «1/2/3 место»: фото вариантов лежат под соседними артикулами,
    # но суффикс модели в имени файла присутствует
    for p in photos:
        fn = p.split("/")[-1].upper()
        if re.search(rf"[_\-]{suffix}([_\-\.]|$)", fn):
            return p
    return photos[0]


def parse_card(url: str, cat: str):
    """Карточка → артикул с вариантами.

    Основа вариантов — offer-блоки микроразметки: имя (с суффиксом модели
    «/G», «/S», «/B»), цена, наличие и СВОЁ фото на каждый вариант.
    Таблица sku-table добавляет точный остаток. У грамот offers нет —
    берём единственную строку таблицы и первое фото.
    Цена поставщика публичная = «рекомендованная розничная» — на витрину
    уходит как есть (закупочные оптовые поставщик публикует только в ЛК).
    """
    html = fetch(url).decode("utf-8", "ignore")
    name_m = re.search(r'itemprop="name"\s+content="([^"]+)"', html)
    name = name_m.group(1).strip() if name_m else art_from_url(url)
    art = art_from_url(url)
    if not re.search(r"[А-Яа-яЁё]", name):
        return None                      # служебная страница раздела (COLOR…)

    # большие фото карточки (порядок появления = порядок галереи)
    photos = []
    for m in re.finditer(r'(?:href|src)="(/upload/iblock/[^"]+?\.resize1\.(?:jpe?g|png))"', html):
        u = norm_url(m.group(1))
        if u not in photos:
            photos.append(u)

    # таблица моделей: имя | цена | кол-во; связка с offer по LABEL модели
    # (у кубков варианты — размеры «2005C/B/A», у медалей — цвет «/G/S/B»)
    by_label, by_suffix = {}, {}
    table_rows = []
    for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", html, re.S):
        cells = [re.sub(r"<[^>]+>", "", c).strip()
                 for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", tr, re.S)]
        cells = [re.sub(r"\s+", " ", c) for c in cells if c.strip()]
        if len(cells) < 3 or not cells[0]:
            continue
        pm = re.search(r"\d", cells[1] or "")
        qm = re.search(r"(\d[\d\s]*)", cells[2])
        if not pm:
            continue
        code_m = re.search(r"/([A-Z])\b", cells[0])
        row = {"label": cells[0], "suffix": code_m.group(1) if code_m else "",
               "price": int(re.sub(r"\D", "", re.search(r"(\d[\d\s]*)", cells[1]).group(1)) or 0),
               "qty": int(qm.group(1).replace(" ", "")) if qm else 0}
        table_rows.append(row)
        by_label[row["label"]] = row
        if row["suffix"]:
            by_suffix[row["suffix"]] = row

    variants = []
    # 1) offer-блоки — карточки с моделями (цвет у медалей, размер у кубков).
    #    Порядок тегов микроразметки у карточек разный, поэтому режем поток
    #    itemprop-тегов на сегменты «от name до следующего name» и берём из
    #    сегмента первый price/availability/image
    offers = []
    cur = None
    for tk in re.finditer(
            r'itemprop="(name|price|availability|image)"([^>]*)>([^<]*)<', html):
        kind, attrs, inline = tk.group(1), tk.group(2), tk.group(3).strip()
        c_m = re.search(r'(?:content|href)="([^"]*)"', attrs)
        val = (c_m.group(1) if c_m else "") or inline
        if kind == "name":
            cur = {"name": val}
            offers.append(cur)
        elif cur is not None:
            if kind == "price" and "price" not in cur:
                cur["price"] = re.sub(r"\D", "", val)
            elif kind == "availability" and "avail" not in cur:
                cur["avail"] = val
            elif kind == "image" and "img" not in cur:
                cur["img"] = val
    for off in offers[1:]:                      # [0] — имя самой карточки
        label = off.get("name", "")
        price = int(off.get("price") or 0)
        if not label or not price:
            continue
        avail = str(off.get("avail", ""))
        row = by_label.get(label) or {}
        if not row:
            code_m = re.search(r"/([A-Z])\b", label)
            row = by_suffix.get(code_m.group(1), {}) if code_m else {}
        suffix = row.get("suffix", "") or (re.search(r"/([A-Z])\b", label) or [None, ""])[1]
        size_m = re.search(r"\((\d+(?:[.,]\d+)?)\s*см", label)
        kind = ("metal" if suffix in ("G", "S", "B")
                else "size" if size_m else "single")
        img = norm_url(off["img"]) if off.get("img") else variant_photo(photos, art, suffix)
        variants.append({
            "code": label,
            "label": label, "suffix": suffix, "kind": kind,
            "metal": METAL_BY_CODE.get(suffix, "") if kind == "metal" else "",
            "size": size_m.group(1).replace(",", ".") if size_m else "",
            "supplierPrice": price,
            "inStock": "InStock" in avail,
            "qty": row.get("qty", 0),
            "img": img,
        })

    # 2) нет offers (грамоты и пр.) — единственная модель из таблицы
    if not variants:
        for row in table_rows:
            if row["price"] > 0 and row["qty"] >= 1 and not row["suffix"]:
                variants.append({
                    "code": row["label"], "label": row["label"], "suffix": "",
                    "kind": "single", "metal": "", "size": "",
                    "supplierPrice": row["price"], "inStock": True,
                    "qty": row["qty"], "img": photos[0] if photos else None,
                })
                break

    theme = "universal"
    for rx, val in THEME_MAP:
        if rx.search(name):
            theme = val
            break
    return {"url": url, "art": art, "name": name, "cat": cat, "theme": theme,
            "variants": variants, "photos": photos}


def full_row(item) -> bool:
    """Артикул проходит фильтры: есть варианты, все модели в наличии и с
    остатком ≥ MIN_QTY (неполный модельный ряд бракует весь артикул)."""
    vs = item["variants"]
    if not vs:
        return False
    return all(v["inStock"] and v["qty"] >= MIN_QTY for v in vs)


def download_imgs(items, needed_arts=None):
    IMG_DIR.mkdir(parents=True, exist_ok=True)
    def grab(url, art, suffix):
        if not url:
            return None
        ext = Path(url.split("?")[0]).suffix or ".jpg"
        stem = re.sub(r"[^a-z0-9\-]+", "_", art.lower()).strip("_")
        fname = f"{stem}{'_' + suffix.lower() if suffix else ''}{ext}"
        dst = IMG_DIR / fname
        if dst.exists():
            return f"img/remote/{fname}"
        try:
            dst.write_bytes(fetch(url))
            return f"img/remote/{fname}"
        except Exception as e:
            print(f"  ! img {art}: {e}", file=sys.stderr)
            return None
    jobs = []
    for it in items:
        for v in it["variants"]:
            jobs.append((v["img"], it["art"], v["suffix"]))
    with ThreadPoolExecutor(max_workers=8) as ex:
        res = list(ex.map(lambda a: grab(*a), jobs))
    for it, urls in zip(items, [res[i:i + len(it["variants"])] for i in
                                range(0, len(res), 1)]):
        pass
    # перепривязка по порядку + fallback: у поставщика встречаются битые
    # ссылки на фото отдельных моделей — такому варианту даём фото артикула
    i = 0
    for it in items:
        first_ok = None
        for v in it["variants"]:
            v["img"] = res[i]
            i += 1
            if v["img"] and first_ok is None:
                first_ok = v["img"]
        if first_ok:
            for v in it["variants"]:
                if not v["img"]:
                    v["img"] = first_ok


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cats", default="medals,cups,diplomas")
    ap.add_argument("--max-pages", type=int, default=30)
    ap.add_argument("--per-cat", type=int, default=PER_CAT)
    ap.add_argument("--no-images", action="store_true")
    ap.add_argument("--arts-from-1c", action="store_true",
                    help="парсить карточки напрямую по артикулам 1С "
                         "(tools/1c-stock-sample.xlsx): снимок и фото, витрину не менять")
    args = ap.parse_args()

    # артикулы магазина из 1С — их фото тоже нужны
    shop_arts = set()
    shop_path = ROOT / "data" / "shop-stock.json"
    xlsx_path = ROOT / "tools" / "1c-stock-sample.xlsx"
    if args.arts_from_1c and xlsx_path.exists():
        import openpyxl
        wb = openpyxl.load_workbook(xlsx_path, data_only=True)
        ws = wb[wb.sheetnames[0]]
        for r in range(1, ws.max_row + 1):
            name = ws.cell(r, 1).value
            unit = ws.cell(r, 4).value
            if not name or unit is None:
                continue
            name = str(name).strip().rstrip(",")
            base = re.match(r"^(.*?)\s*\(", name)
            art = (base.group(1) if base else name).replace("Медаль", "", 1).strip()
            shop_arts.add(art.translate(CYR_TO_LAT_URL).upper())
        shop_arts = {norm_slug_art(a) for a in shop_arts}
        print(f"артикулов из 1С: {len(shop_arts)}")

    full = []
    if args.arts_from_1c:
        def work(art):
            for slug in (norm_slug_art(art), slug_underscore(art)):
                try:
                    r = parse_card(f"https://rossimvol.ru/catalog/medals/{slug}/", "medal")
                except Exception:
                    r = None
                if r and r["variants"]:
                    r["art"] = norm_key(r["art"])     # канонический ключ
                    return r
            return None
        with ThreadPoolExecutor(max_workers=6) as ex:
            for r in ex.map(work, sorted(shop_arts)):
                if r:
                    r["badge"] = None
                    full.append(r)
        print(f"спарсено карточек по артикулам 1С: {len(full)}")
        if not args.no_images:
            download_imgs(full)
        # мержим в общий снимок (канонические ключи), витрину не трогаем
        snap = {}
        if FULL.exists():
            try:
                snap = {norm_key(k): v for k, v in json.loads(FULL.read_text()).items()}
            except Exception:
                pass
        for x in full:
            snap[x["art"]] = {"name": x["name"], "cat": x["cat"], "theme": x["theme"],
                              "badge": None,
                              "variants": [{k: v[k] for k in ("code", "label", "suffix", "kind", "metal", "size", "supplierPrice", "qty", "img")}
                                           for v in x["variants"]]}
        FULL.write_text(json.dumps(snap, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"снимок обновлён → {FULL.relative_to(ROOT)} ({len(snap)})")
        return

    full = []
    for slug in [c.strip() for c in args.cats.split(",") if c.strip()]:
        cat = CAT_MAP.get(slug)
        if not cat:
            print(f"! неизвестный раздел {slug}", file=sys.stderr)
            continue
        print(f"== {slug}")
        cards = category_cards(slug, args.max_pages)
        print(f"  карточек: {len(cards)}")
        def work(u):
            try:
                return parse_card(u, cat)
            except Exception as e:
                print(f"  ! {u}: {e}", file=sys.stderr)
                return None
        with ThreadPoolExecutor(max_workers=6) as ex:
            for r in ex.map(work, list(cards)[:400]):
                if r:
                    r["badge"] = cards[r["url"]]
                    full.append(r)
        ok = [x for x in full if x["cat"] == cat and full_row(x)]
        print(f"  прошли фильтр (полный ряд, остаток ≥ {MIN_QTY}): {len(ok)} из {len([x for x in full if x['cat']==cat])}")

    # полный снимок — источник фото и цен для магазина; категории, которые в
    # этом прогоне не парсились, сохраняем из предыдущего снимка (merge)
    FULL.parent.mkdir(exist_ok=True)
    snap = {x["art"]: {"name": x["name"], "cat": x["cat"], "theme": x["theme"],
                       "badge": x.get("badge"),
                       "variants": [{k: v[k] for k in ("code", "label", "suffix", "kind", "metal", "size", "supplierPrice", "qty", "img")}
                                    for v in x["variants"]]}
            for x in full}
    parsed_cats = {CAT_MAP[c.strip()] for c in args.cats.split(",") if c.strip() in CAT_MAP}
    if FULL.exists():
        try:
            old = json.loads(FULL.read_text())
            kept = {a: e for a, e in old.items() if e.get("cat") not in parsed_cats}
            snap.update(kept)
            print(f"merge снимка: +{len(kept)} позиций из прежнего прогона")
        except Exception:
            pass
    FULL.write_text(json.dumps(snap, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"снимок всех артикулов → {FULL.relative_to(ROOT)} ({len(snap)})")

    # витрина удалённого склада: per-cat позиций, приоритет хиты → новинки
    badge_rank = {"hit": 0, "new": 1, None: 2}
    showcase = []
    for cat in {x["cat"] for x in full}:
        pool = [x for x in full if x["cat"] == cat and full_row(x)]
        if cat == "medal":            # медали у клиента свои — удалённый склад
            continue                  # формируется из кубков/грамот
        pool.sort(key=lambda x: (badge_rank.get(x.get("badge"), 2),
                                 -sum(v["qty"] for v in x["variants"])))
        showcase += pool[:args.per_cat]
        print(f"  витрина {cat}: +{min(args.per_cat, len(pool))} "
              f"(хитов {sum(1 for x in pool[:args.per_cat] if x.get('badge')=='hit')}, "
              f"новинок {sum(1 for x in pool[:args.per_cat] if x.get('badge')=='new')})")

    # фото: витрина + артикулы магазина
    for it in showcase:
        it["in_shop"] = it["art"] in shop_arts
    download_list = showcase + [x for x in full if x["art"] in shop_arts]
    if not args.no_images:
        download_imgs(download_list, shop_arts)

    items = []
    for it in showcase:
        # публичная цена поставщика = рекомендованная розничная: на витрине
        # удалённого склада показываем её без накрутки
        price = min(v["supplierPrice"] for v in it["variants"])
        items.append({
            "url": it["url"], "art": it["art"], "name": it["name"],
            "cat": it["cat"], "theme": it["theme"], "badge": it.get("badge"),
            "supplierPrice": price, "retail": price,
            "variants": it["variants"],
        })
    data = {"source": "rossimvol.ru (парсинг v2: вариации, полный ряд, остатки)",
            "updated": datetime.now().isoformat(timespec="seconds"),
            "minQty": MIN_QTY, "count": len(items), "items": items}
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"OK: витрина удалённого склада {len(items)} позиций → {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
