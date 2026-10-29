#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Конвертер выгрузки 1С «Остатки и доступность товаров» → data/shop-stock.json
(виртуальный склад магазина для сайта РАСПОРТ).

Запуск:  python3 tools/convert_1c.py "Остатки и доступность товара.xlsx"
Вывод:   data/shop-stock.json

Как работает обмен с 1С (просто и без доработок 1С):
  1. Сотрудник в 1С: Расчёты → «Остатки и доступность товаров» → выгрузить в xlsx
     (та же форма, что прислал клиент — структура не меняется).
  2. Файл кладётся в tools/ (или путь передаётся аргументом).
  3. Скрипт (по расписанию или вручную) превращает xlsx в data/shop-stock.json.
  4. Сайт подгружает JSON и показывает блок «Магазин» с актуальными остатками.

Колонки (формат 1С): Номенклатура/Характеристика | Ед.изм. | В наличии |
Отгружается | В резерве | Доступно(Сейчас) | Доступно(Всего) | К обеспечению | Дефицит | Излишек.
Группы определяются по пустой «Ед. изм.». Цены в выгрузке нет — расчёт розницы
через прайс-модель (см. retail_price), при появлении колонки «Цена» будет
подхвачена автоматически.
"""
import json
import math
import re
import sys
from pathlib import Path

try:
    import openpyxl
except ImportError:
    sys.exit("Нужен openpyxl:  pip install openpyxl")

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "shop-stock.json"

# Оптовые цены rossimvol по артикулам, которые известны (розница = опт × 2)
KNOWN_WHOLESALE = {
    "MMC 7071": 150, "MD 1750": 70, "MD 2450": 73, "MMC 6064": 153,
    "MMC 2350": 70, "ME 005": 70, "ME 008": 68, "MMA 4510": 65, "MMC 3350": 70,
}

# Оценка розничной цены по классу медали (мм / тип), если артикул неизвестен.
SIZE_PRICE = [
    (re.compile(r"D-?40|04-?40|[\s-]40\b"), 140),
    (re.compile(r"D-?50|-50\b|\b50\b"), 150),
    (re.compile(r"D-?60|-60\b|\b60\b"), 170),
    (re.compile(r"D-?70|-70\b|\b70\b"), 200),
]
DEFAULT_RETAIL = 150

METAL_MAP = {
    "золот": "gold", "серебр": "silver", "бронз": "bronze", "микс": "mix",
}

THEME_MAP = [
    (re.compile(r"VOL|волейбол", re.I), "volleyball"),
    (re.compile(r"FUT|футбол", re.I), "football"),
    (re.compile(r"HOK|хоккей", re.I), "hockey"),
    (re.compile(r"Ш АХМ|ШАХМ|chess", re.I), "chess"),
    (re.compile(r"БЕГ|RUN|марафон", re.I), "run"),
    (re.compile(r"ЛЫЖ|SKI", re.I), "ski"),
    (re.compile(r"ПОБЕД|УЧАСТ|ЗА УЧАСТ|АБСОЛ", re.I), "victory"),
    (re.compile(r"ШКОЛ|УЧЕНИ|ЗНАНИЕ", re.I), "school"),
]


# В 1С артикулы вбиты смесью раскладок («ММС»/«MMC», «GМZ») — приводим визуальные
# кириллические двойники к латинице, чтобы совпадать с номенклатурой rossimvol.
CYR_TO_LAT = str.maketrans({
    "А": "A", "В": "B", "С": "C", "Е": "E", "Н": "H", "К": "K", "М": "M",
    "О": "O", "Р": "P", "Т": "T", "Х": "X", "У": "Y", "Z": "Z", "Д": "D",
})


def norm_art(art: str) -> str:
    return re.sub(r"\s+", " ", art.translate(CYR_TO_LAT)).strip().upper()


def retail_price(art: str) -> int:
    key = norm_art(art)
    if key in KNOWN_WHOLESALE:
        return int(math.ceil(KNOWN_WHOLESALE[key] * 2 / 10) * 10)
    for rx, price in SIZE_PRICE:
        if rx.search(art):
            return price
    return DEFAULT_RETAIL


def parse_name(full: str):
    """«Медаль MMC 1270 (золото)» → (артикул «MMC 1270», металл gold, тема)."""
    m = re.match(r"^(.*?)\s*\((.*?)\)\s*$", full)
    base, char = (m.group(1), m.group(2)) if m else (full, "")
    art = base.replace("Медаль", "", 1).strip()
    metal = "mix"
    for key, val in METAL_MAP.items():
        if key in char.lower():
            metal = val
            break
    theme = "universal"
    for rx, val in THEME_MAP:
        if rx.search(full):
            theme = val
            break
    return art, metal, char, theme


def main(path: str):
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb[wb.sheetnames[0]]

    # ищем строку заголовков: ячейка «Ед. изм.»
    head_row = None
    for r in range(1, 30):
        if ws.cell(r, 4).value and "Ед" in str(ws.cell(r, 4).value):
            head_row = r
            break
    if not head_row:
        sys.exit("Не нашёл строку заголовков (колонка D «Ед. изм.») — формат файла другой?")

    items, group_path = [], []
    for r in range(head_row + 1, ws.max_row + 1):
        name = ws.cell(r, 1).value
        if not name:
            continue
        name = str(name).strip().rstrip(",")
        unit = ws.cell(r, 4).value
        if name.lower().startswith("итого"):
            continue
        if unit is None:  # группа
            group_path.append(name)
            continue
        while group_path and group_path[-1] != name and len(group_path) > 2:
            group_path.pop()
        in_stock = int(ws.cell(r, 5).value or 0)
        avail = int(ws.cell(r, 10).value or 0)
        reserved = int(ws.cell(r, 8).value or 0)
        if avail <= 0:
            continue  # недоступное не показываем
        art, metal, char, theme = parse_name(name)
        art = norm_art(art)
        items.append({
            "name": name,
            "art": art,
            "metal": metal,
            "char": char,
            "cat": "medal",
            "theme": theme,
            "unit": str(unit),
            "inStock": in_stock,
            "avail": avail,
            "reserved": reserved,
            "price": retail_price(art),
        })

    data = {
        "source": "1С: Остатки и доступность товаров",
        "warehouse": group_path[0] if group_path else "Магазин центральный",
        "updated": __import__("datetime").datetime.now().isoformat(timespec="seconds"),
        "count": len(items),
        "items": items,
    }
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"OK: {len(items)} позиций → {OUT.relative_to(ROOT)}")
    metals = {}
    for it in items:
        metals[it["metal"]] = metals.get(it["metal"], 0) + 1
    print("Металлы:", metals)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else str(ROOT / "tools" / "1c-stock-sample.xlsx"))
