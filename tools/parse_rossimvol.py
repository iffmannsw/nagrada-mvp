#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Парсер каталога поставщика rossimvol.ru → data/remote-stock.json + фото в img/remote/
(блок «Удалённый склад — под заказ»).

Запуск:  python3 tools/parse_rossimvol.py                     # cups + diplomas (умолчание)
         python3 tools/parse_rossimvol.py --cats cups,diplomas,medals --max-pages 3
         python3 tools/parse_rossimvol.py --no-images         # только JSON, без фото

Как это решает задачу «товар не остаётся на сайте после продажи у поставщика»:
парсер перечитывает каталог целиком и перезаписывает remote-stock.json.
Товар, исчезнувший у поставщика (или потерявший «В наличии»), в новом файл не
попадает — то есть витрина живёт ровно один цикл обновления. Периодичность
запуска = периодичность обновления витрины (см. cron в README).

Данные берутся из schema.org-микроразметки карточек (name / price /
availability InStock) и ссылок ?PAGEN_1=N (Битрикс).
"""
import argparse
import json
import re
import ssl
import sys
import urllib.request
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "remote-stock.json"
IMG_DIR = ROOT / "img" / "remote"

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")
CTX = ssl.create_default_context()

CAT_MAP = {  # категория сайта ← раздел поставщика
    "medals": "medal", "cups": "cup", "diplomas": "gramota",
    "figuras": "figura", "awards": "award", "plates": "plate",
}
MARKUP = {"medal": 2.0, "gramota": 2.0, "cup": 1.6, "figura": 1.8,
          "award": 1.8, "plate": 1.8}

THEME_MAP = [
    (re.compile(r"футбол", re.I), "football"),
    (re.compile(r"хокк", re.I), "hockey"),
    (re.compile(r"шахмат", re.I), "chess"),
    (re.compile(r"волейбол", re.I), "volleyball"),
    (re.compile(r"бег|марафон|спартак", re.I), "run"),
    (re.compile(r"лыж", re.I), "ski"),
    (re.compile(r"1 место|победител|чемпион", re.I), "victory"),
    (re.compile(r"школ|участ|знание", re.I), "school"),
]


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={
        "User-Agent": UA, "Accept-Language": "ru-RU,ru;q=0.9"})
    with urllib.request.urlopen(req, timeout=30, context=CTX) as r:
        return r.read()


def art_from_url(url: str) -> str:
    m = re.search(r"/catalog/[^/]+/([^/?#]+)/?$", url)
    return m.group(1).upper() if m else url.rstrip("/").split("/")[-1].upper()


def parse_card(url: str, cat: str):
    html = fetch(url).decode("utf-8", "ignore")
    name = price = None
    m = re.search(r'itemprop="name"\s+content="([^"]+)"', html)
    if m:
        name = m.group(1).strip()
    pm = re.search(r'itemprop="price"[^>]*>\s*([\d\s]+)', html)
    if not pm:
        pm = re.search(r'content="([\d\s]+)"\s+itemprop="price"', html)
    if pm:
        price = int(re.sub(r"\D", "", pm.group(1)) or 0)
    in_stock = 'schema.org/InStock' in html
    im = (re.search(r'itemprop="image"\s+content="([^"]+)"', html)
          or re.search(r'"(https?:)?//[^"]*upload/[^"]+?\.(?:jpe?g|png)"', html))
    img = im.group(1) if im else None
    if img:
        img = img.replace("http://", "https://", 1)
        if img.startswith("//"):
            img = "https:" + img
        elif img.startswith("/"):
            img = "https://rossimvol.ru" + img
    theme = "universal"
    for rx, val in THEME_MAP:
        if name and rx.search(name):
            theme = val
            break
    return {"url": url, "art": art_from_url(url), "name": name or art_from_url(url),
            "cat": cat, "theme": theme, "wholesale": price or 0,
            "retail": int((price or 0) * MARKUP.get(cat, 2.0)) if price else 0,
            "inStock": in_stock, "img": img}


def list_cards(cat_url: str, max_pages: int):
    slug = cat_url.rstrip("/").split("/")[-1]
    cards = []
    for page in range(1, max_pages + 1):
        url = cat_url if page == 1 else f"{cat_url}?PAGEN_1={page}"
        try:
            html = fetch(url).decode("utf-8", "ignore")
        except Exception as e:  # сеть/защита — лог и стоп категории
            print(f"  ! {url}: {e}", file=sys.stderr)
            break
        links = set(re.findall(rf'href="(/catalog/{slug}/[^"/]+/)"', html))
        links = {f"https://rossimvol.ru{l}" for l in links if l != f"/catalog/{slug}/"}
        # вложенные разделы (например /cups/color/) не карточки — отфильтруем по parse_card
        if not links:
            break
        cards += sorted(l for l in links if not re.search(r"/(by_flag|filter|by_section|by_theme)/", l))
        print(f"  стр.{page}: {len(links)} карточек")
    return cards


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cats", default="cups,diplomas",
                    help="разделы rossimvol: medals,cups,diplomas,figuras,awards,plates")
    ap.add_argument("--max-pages", type=int, default=25)
    ap.add_argument("--no-images", action="store_true")
    args = ap.parse_args()

    IMG_DIR.mkdir(parents=True, exist_ok=True)
    items = []
    for slug in [c.strip() for c in args.cats.split(",") if c.strip()]:
        cat = CAT_MAP.get(slug)
        if not cat:
            print(f"! неизвестный раздел {slug}", file=sys.stderr)
            continue
        base = f"https://rossimvol.ru/catalog/{slug}/"
        print(f"== {slug}")
        for card_url in list_cards(base, args.max_pages):
            try:
                it = parse_card(card_url, cat)
            except Exception as e:
                print(f"  ! {card_url}: {e}", file=sys.stderr)
                continue
            if not it["inStock"] or not it["retail"]:
                continue  # нет в наличии у поставщика → не показываем
            if it["img"] and not args.no_images:
                fname = it["art"].lower().replace("/", "-") + Path(it["img"]).suffix
                dst = IMG_DIR / fname
                if not dst.exists():
                    try:
                        dst.write_bytes(fetch(it["img"]))
                    except Exception as e:
                        print(f"  ! img {it['art']}: {e}", file=sys.stderr)
                it["img"] = f"img/remote/{dst.name}" if dst.exists() else None
            items.append(it)

    # уникальность по url, сортировка по цене
    seen, uniq = set(), []
    for it in items:
        if it["url"] in seen:
            continue
        seen.add(it["url"])
        uniq.append(it)
    uniq.sort(key=lambda x: (x["cat"], -x["retail"]))

    data = {"source": "rossimvol.ru (парсинг каталога поставщика)",
            "updated": datetime.now().isoformat(timespec="seconds"),
            "count": len(uniq), "items": uniq}
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"OK: {len(uniq)} позиций → {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
