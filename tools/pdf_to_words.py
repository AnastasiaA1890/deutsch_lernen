#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Превращает экспорт словаря LEO (PDF) в готовый МОДУЛЬ для words.js.

    python3 tools/pdf_to_words.py 2.pdf                    > новый_модуль.txt
    python3 tools/pdf_to_words.py 2.pdf "Глаголы, урок 3"  > новый_модуль.txt

Каждая партия слов становится отдельным модулем: он выбирается на главном
экране приложения и тренируется со своим собственным прогрессом.
Вставь напечатанный блок в words.js перед самой последней скобкой ].

Скрипт достаёт русское и немецкое слово, множественное число и формы глагола,
СРЕЗАЕТ артикли и подставляет ЧЕРНОВУЮ транскрипцию по правилам из README.
Черновик помечен tr_draft: true — просмотри его глазами, поправь ударение
и убери пометку, прежде чем учить по нему.
"""

import os
import re
import sys
import time

try:
    import pypdf
except ImportError:
    sys.exit("Нужен модуль pypdf:  pip3 install pypdf")

CYR = 'а-яёА-ЯЁ'
FOOTER = re.compile(r'^\s*\d+\s*/\s*\d+\s+Copyright', re.I)

# ---------------------------------------------------------------- транскрипция
VOWELS = 'aeiouäöüy'

J_PAIRS = {'ja': 'я', 'je': 'е', 'jo': 'ё', 'ju': 'ю', 'ji': 'и', 'jä': 'е', 'jü': 'ю'}

def translit(word):
    """Грубая транскрипция немецкого слова русскими буквами."""
    w = word.lower().strip()
    out, i = [], 0
    start = True
    seen_vowel = False
    while i < len(w):
        three, two, ch = w[i:i + 3], w[i:i + 2], w[i]
        nxt = w[i + 1] if i + 1 < len(w) else ''
        prev = w[i - 1] if i else ''
        if three == 'sch':
            out.append('ш'); i += 3
        elif three == 'chs':
            out.append('кс'); i += 3
        elif two == 'ch':
            out.append('х' if prev in 'aou' or w[i - 2:i] == 'au' else 'хь'); i += 2
        elif two == 'ck':
            out.append('к'); i += 2
        elif two == 'tz':
            out.append('ц'); i += 2
        elif two in ('ei', 'ai'):
            out.append('ай'); i += 2
        elif two == 'ie':
            out.append('и'); i += 2
        elif two in ('eu', 'äu'):
            out.append('ой'); i += 2
        elif len(two) == 2 and two[0] == two[1] and two[0] in 'aeo':
            out.append({'a': 'а', 'e': 'е' if not seen_vowel else 'э', 'o': 'о'}[two[0]])
            seen_vowel = True; i += 2
        elif two == 'au':
            out.append('ау'); i += 2
        elif two == 'qu':
            out.append('кв'); i += 2
        elif two == 'ph':
            out.append('ф'); i += 2
        elif two == 'th':
            out.append('т'); i += 2
        elif two == 'ng':
            out.append('нг'); i += 2
        elif two == 'dt':
            out.append('т'); i += 2
        elif two in J_PAIRS:
            out.append(J_PAIRS[two]); seen_vowel = True; i += 2
        elif two == 'ss':
            out.append('с'); i += 2
        elif two == 'st' and start:
            out.append('шт'); i += 2
        elif two == 'sp' and start:
            out.append('шп'); i += 2
        elif two == 'er' and i + 2 == len(w):
            out.append('эр'); i += 2
        elif two == 'en' and i + 2 == len(w):
            out.append('эн'); i += 2
        elif two == 'el' and i + 2 == len(w):
            out.append('эль'); i += 2
        elif ch == 'h' and prev and prev in VOWELS:
            i += 1                                   # h после гласной не читается
        elif ch == 'e':
            # безударная «e» звучит как шва: Abende → а́бэндэ
            out.append('е' if not seen_vowel else 'э'); seen_vowel = True; i += 1
        elif ch == nxt and ch not in VOWELS:
            i += 1                                   # двойная согласная
        else:
            simple = {
                'a': 'а', 'e': 'е', 'i': 'и', 'o': 'о', 'u': 'у',
                'ä': 'э', 'ö': 'ё', 'ü': 'ю', 'y': 'ю', 'ß': 'с',
                'b': 'б', 'c': 'к', 'd': 'д', 'f': 'ф', 'g': 'г', 'h': 'х',
                'j': 'й', 'k': 'к', 'l': 'л', 'm': 'м', 'n': 'н', 'p': 'п',
                'q': 'к', 'r': 'р', 't': 'т', 'v': 'ф', 'w': 'в',
                'x': 'кс', 'z': 'ц', 'é': 'е', 'è': 'е', 'á': 'а', 'ó': 'о',
                's': 'з' if (nxt and nxt in VOWELS) else 'с',
            }
            out.append(simple.get(ch, ch))
            if ch in VOWELS:
                seen_vowel = True
            i += 1
        start = False
    res = ''.join(out)
    # оглушение в конце слова
    res = re.sub(r'б$', 'п', res)
    res = re.sub(r'д$', 'т', res)
    res = re.sub(r'г$', 'к', res)
    return stress(res, w)


UNSTRESSED_PREFIX = ('be', 'ge', 'ver', 'er', 'ent', 'emp', 'zer')
STRESSED_TAIL = ('ion', 'ität', 'ieren', 'ei', 'ie')

def stress(rus, orig):
    """Ставит ударение: по умолчанию на первый слог, с оговорками."""
    pos = [i for i, c in enumerate(rus) if c in 'аеёиоуыэюя']
    if len(pos) < 2:
        return rus                                   # односложное — знак не нужен
    idx = 0
    if orig.startswith(UNSTRESSED_PREFIX) and len(pos) > 1:
        idx = 1
    if orig.endswith(STRESSED_TAIL):
        idx = len(pos) - 1
    i = pos[idx]
    if rus[i] == 'ё':
        return rus                                   # ё и так ударная
    return rus[:i + 1] + '́' + rus[i + 1:]


# ------------------------------------------------------------------ разбор PDF
POS_MARKS = [
    (r'нсв|(?<=[а-яё́])св\b', 'глаг.'),
    (r'\bприл\.', 'прил.'),
    (r'\bнар\.', 'нареч.'),
    (r'\bмест\.', 'мест.'),
    (r'\bпред\.', 'предл.'),
    (r'\bчаст\.', 'част.'),
    (r'\bчисл\.', 'числ.'),
    (r'\bм\.|\bж\.|\bср\.|нет ед\.ч\.|нет мн\.ч\.', 'сущ.'),
]

def guess_pos(ru_raw):
    for pattern, name in POS_MARKS:
        if re.search(pattern, ru_raw):
            return name
    return 'сущ.'

def clean_ru(ru_raw):
    s = re.sub(r'(?<=[а-яё́])(нсв|св)\b', ' ', ru_raw)   # приклеенные пометки вида «бе́гатьнсв»
    s = re.sub(r'\[[^\]]*\]', ' ', s)                  # [перен.], [разг.]
    s = re.sub(r'\([^)]*\)', ' ', s)                    # (кого-л./что-л.)
    s = re.split(r'\s+-\s+', s)[0]                      # пояснение после тире
    s = re.sub(r'\b(м|ж|ср|нсв|св|прил|нар|мест|пред|част|числ|тж|также)\b\.?', ' ', s)
    s = re.sub(r'нет (ед|мн)\.ч\.|мн\.ч\. нет|притяжат\.|отно́сит\.|нескл\.', ' ', s)
    s = re.sub(r'\s*/\s*', ' / ', s).strip(' /')
    s = re.sub(r'\s+', ' ', s).strip(' .,;')
    return s

def clean_de(de_raw):
    s = de_raw
    forms = ''
    m = re.search(r'\|([^|]+)\|', s)                    # | lief, gelaufen |
    if m:
        forms = m.group(1).strip()
        s = s[:m.start()] + s[m.end():]
    plural = ''
    m = re.search(r'Pl\.\s*:\s*([^|]+?)(?:\s{2,}|$)', s)
    if m:
        plural = m.group(1).strip()
        s = s[:m.start()]
    s = re.sub(r'kein Pl\.|\bPl\.', ' ', s)
    s = re.sub(r'\[[^\]]*\]|auch \[fig\.\]|wiss\.:.*|Possessivpron\.|Relativpron\.|\+\s*Akk\.', ' ', s)
    s = re.sub(r'\((?:seltener|selten)[^)]*\)', ' ', s)
    s = re.sub(r'\(?\b(jmdn|jmdm|etw|mit|sich)\b[^)]*\)', ' ', s)  # (jmdn./etw.Akk.)
    s = re.sub(r'\s+-\s+.*$', '', s)
    s = strip_articles(s)
    plural = strip_articles(re.sub(r'\s*/\s*', ' / ', plural))
    return re.sub(r'\s+', ' ', s).strip(' ,;'), plural.strip(' ,;'), forms

def strip_articles(s):
    s = re.sub(r'\b(der|die|das)\s+', '', s)
    return re.sub(r'\s+', ' ', s).strip()

def split_line(line):
    """Делит строку LEO на русскую и немецкую части по первой латинице."""
    m = re.search(r'[A-Za-zÄÖÜäöüß]', line)
    if not m:
        return line, ''
    head = line[:m.start()]
    if not re.search(r'[а-яёА-ЯЁ]', head):
        return '', line                      # строка целиком немецкая
    return head, line[m.start():]

def parse(path):
    reader = pypdf.PdfReader(path)
    lines = []
    for page in reader.pages:
        for raw in (page.extract_text() or '').split('\n'):
            if raw.strip() and not FOOTER.match(raw):
                lines.append(raw.rstrip())

    entries, ru_buf, de_buf = [], '', ''
    def flush():
        if ru_buf.strip() and de_buf.strip():
            entries.append((ru_buf.strip(), de_buf.strip()))

    for line in lines:
        ru, de = split_line(line)
        if ru.strip() and de.strip():           # полная строка
            if ru_buf.strip() and not de_buf.strip():
                ru_buf += ' ' + ru              # продолжение многострочной статьи
                de_buf = de
            else:
                flush(); ru_buf, de_buf = ru, de
        elif ru.strip():                        # только русская часть
            if de_buf.strip():
                flush(); ru_buf, de_buf = ru, ''
            else:
                ru_buf += ' ' + ru
        else:                                   # только немецкая часть
            de_buf += ' ' + de
    flush()
    return entries

def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    path = sys.argv[1]
    name = sys.argv[2] if len(sys.argv) > 2 else os.path.splitext(os.path.basename(path))[0]
    module_id = 'm%x' % int(time.time())
    rows = []
    for ru_raw, de_raw in parse(path):
        ru = clean_ru(ru_raw)
        de, plural, forms = clean_de(de_raw)
        if not ru or not de:
            continue
        pos = guess_pos(ru_raw)
        parts = [
            'de: %s' % js(de),
            'tr: %s' % js(translit(de.split('|')[0].split('/')[0].strip())),
            'ru: %s' % js(ru),
            'pos: %s' % js(pos),
        ]
        if plural:
            parts.append('pl: %s' % js(plural))
            parts.append('plTr: %s' % js(translit(plural.split('/')[0].split('|')[0].strip())))
        if forms:
            parts.append('forms: %s' % js(forms))
        parts.append('tr_draft: true')
        rows.append('    { ' + ', '.join(parts) + ' },')

    sys.stderr.write('Разобрано статей: %d\n' % len(rows))
    sys.stderr.write('Модуль: %s (id %s)\n' % (name, module_id))
    sys.stderr.write('Вставь блок ниже в words.js перед самой последней скобкой ]\n')
    print('{')
    print('  id: %s,' % js(module_id))
    print('  name: %s,' % js(name))
    print('  words: [')
    print('\n'.join(rows))
    print('  ]')
    print('},')

def js(s):
    return '"%s"' % str(s).replace('\\', '\\\\').replace('"', '\\"')

if __name__ == '__main__':
    main()
