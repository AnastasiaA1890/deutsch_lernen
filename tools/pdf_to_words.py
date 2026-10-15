#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Превращает список слов из PDF в готовый МОДУЛЬ для words.js.

    python3 tools/pdf_to_words.py words.pdf                     > новый_модуль.txt
    python3 tools/pdf_to_words.py words.pdf "TOEFL · Глаголы"   > новый_модуль.txt

Каждая партия слов становится отдельным модулем: он выбирается на главном
экране приложения и тренируется со своим собственным прогрессом.
Вставь напечатанный блок в words.js перед самой последней скобкой ].

Скрипт понимает две раскладки:
  • «word — перевод» в одной строке (разделитель — тире, =, |, : или два
    пробела подряд);
  • таблицу, где английское слово и перевод стоят в разных колонках.
Если перевода нет, в ru остаётся пустая строка — её нужно заполнить руками.
В вывод может попасть и мусор (заголовки колонок вроде noun или easy) —
это черновик, его всё равно просматривают глазами перед вставкой.

Транскрипция — ЧЕРНОВАЯ: английское написание и чтение расходятся слишком
сильно, чтобы считать её наверняка (ударение всегда ставится на первый
гласный). Строки с черновиком помечены tr_draft: true — просмотри их
глазами, поправь и убери пометку, прежде чем учить по ним.
Это тот же набор правил, что и в autoTr() в app.js; правишь здесь —
поправь и там.
"""

import re
import sys

try:
    import pypdf
except ImportError:
    sys.exit("Нужен модуль pypdf:  pip3 install pypdf")

CYR = 'а-яёА-ЯЁ'

# ---------------------------------------------------------------- транскрипция
EXC = {
    'one': 'уан', 'two': 'ту', 'who': 'ху', 'whose': 'хуз', 'some': 'сам', 'come': 'кам',
    'done': 'дан', 'none': 'нан', 'love': 'лав', 'move': 'мув', 'prove': 'прув',
    'lose': 'луз', 'said': 'сэд', 'says': 'сэз', 'again': 'эге́н', 'women': 'уи́мин',
    'woman': 'уу́мэн', 'busy': 'би́зи', 'business': 'би́знэс', 'buy': 'бай', 'eye': 'ай',
    'people': 'пи́пл', 'sure': 'шур', 'sugar': 'шу́гэр', 'work': 'уёрк', 'word': 'уёрд',
    'world': 'уёрлд', 'war': 'уор', 'warm': 'уорм', 'were': 'уёр', 'where': 'уэ́р',
    'there': 'зэр', 'their': 'зэр', 'through': 'сру', 'though': 'зоу', 'thought': 'сот',
    'enough': 'ина́ф', 'tough': 'таф', 'laugh': 'лаф', 'cough': 'коф', 'could': 'куд',
    'should': 'шуд', 'would': 'вуд', 'heart': 'харт', 'beautiful': 'бью́тифул',
    'europe': 'ю́рэп', 'iron': 'а́йэрн', 'island': 'а́йлэнд', 'answer': 'э́нсэр',
    'because': 'бико́з', 'friend': 'френд', 'great': 'грэйт', 'break': 'брэйк',
    'steak': 'стэйк', 'many': 'ме́ни', 'any': 'э́ни', 'very': 'ве́ри', 'only': 'о́унли',
    'money': 'ма́ни', 'honest': 'о́нэст', 'hour': 'а́уэр',
}
# Длинные куски идут первыми: порядок в списке и есть порядок проверки.
PAIRS = [
    ('scien', 'са́йэн'), ('stion', 'счэн'), ('ation', 'эйшн'), ('ution', 'ушн'),
    ('ition', 'ишн'), ('ought', 'от'), ('aught', 'от'), ('cious', 'шэс'), ('tious', 'шэс'),
    ('tion', 'шн'), ('sion', 'жн'), ('cian', 'шн'), ('cial', 'шл'), ('tial', 'шл'),
    ('ture', 'чэр'), ('sure', 'жэр'), ('ight', 'айт'), ('ious', 'иэс'), ('eous', 'иэс'),
    ('ance', 'энс'), ('ence', 'энс'), ('able', 'эбл'), ('ible', 'ибл'), ('ical', 'икл'),
    ('sch', 'ск'), ('tch', 'ч'), ('nge', 'ндж'), ('dge', 'дж'), ('ous', 'эс'),
    ('oor', 'ур'), ('our', 'а́уэр'), ('air', 'эр'), ('ear', 'иэр'), ('eer', 'иэр'),
    ('cce', 'ксэ'), ('cci', 'кси'),
    ('oy', 'ой'), ('oi', 'ой'), ('ee', 'и'), ('ea', 'и'), ('oo', 'у'), ('ou', 'ау'),
    ('ow', 'оу'), ('oa', 'оу'), ('au', 'о'), ('aw', 'о'), ('ai', 'эй'), ('ay', 'эй'),
    ('ei', 'эй'), ('ey', 'эй'), ('ie', 'и'), ('ue', 'у'), ('ui', 'у'), ('ew', 'ю'),
    ('eu', 'ю'), ('ar', 'ар'), ('or', 'ор'), ('ir', 'ёр'), ('ur', 'ёр'), ('er', 'эр'),
    ('ch', 'ч'), ('sh', 'ш'), ('th', 'с'), ('ph', 'ф'), ('wh', 'у'), ('ck', 'к'),
    ('ng', 'нг'), ('nk', 'нк'), ('qu', 'ку'), ('gh', ''),
]
ONE = {
    'a': 'э', 'e': 'э', 'i': 'и', 'o': 'о', 'u': 'а', 'y': 'и',
    'b': 'б', 'c': 'к', 'd': 'д', 'f': 'ф', 'g': 'г', 'h': 'х', 'j': 'дж', 'k': 'к',
    'l': 'л', 'm': 'м', 'n': 'н', 'p': 'п', 'r': 'р', 's': 'с', 't': 'т', 'v': 'в',
    'w': 'у', 'x': 'кс', 'z': 'з',
}
LONG = {'a': 'эй', 'e': 'и', 'i': 'ай', 'o': 'оу', 'u': 'ю'}
START = [('kn', 'н'), ('wr', 'р'), ('gn', 'н'), ('ps', 'с'), ('mn', 'н')]
KEEP_E = re.compile(r'(ture|sure|dge|nge|ble|cle|dle|gle|kle|ple|tle|zle)$')
MAGIC_E = re.compile(r'^(.*?)([aeiou])([bcdfgklmnprstvz])e$')


def translit(word):
    """Черновая транскрипция английского слова русскими буквами."""
    w = word.lower().strip()
    if not w:
        return ''
    if w in EXC:
        return EXC[w]
    magic = ''
    m = None if KEEP_E.search(w) else MAGIC_E.match(w)
    if m and m.group(1):
        magic = LONG[m.group(2)]
        tail = {'g': '\x02', 'c': '\x03'}.get(m.group(3), m.group(3))
        w = m.group(1) + '\x01' + tail
    out, i = [], 0
    for pre, rus in START:
        if w.startswith(pre):
            out.append(rus)
            i = 2
            break
    while i < len(w):
        ch = w[i]
        nxt = w[i + 1] if i + 1 < len(w) else ''
        if ch == '\x01':
            out.append(magic); i += 1; continue
        if ch == '\x02':
            out.append('дж'); i += 1; continue
        if ch == '\x03':
            out.append('с'); i += 1; continue
        if ch == 'e' and i == len(w) - 1 and i > 2:      # немая e
            i += 1; continue
        pair = next((p for p in PAIRS if w[i:i + len(p[0])] == p[0]), None)
        if pair:
            out.append(pair[1]); i += len(pair[0]); continue
        if ch == 'c' and nxt in 'eiy':
            out.append('с'); i += 1; continue
        if ch == 'g' and nxt in 'eiy':
            out.append('дж'); i += 1; continue
        if ch == 's' and i and nxt and w[i - 1] in 'aeiouy' and nxt in 'aeiouy':
            out.append('з'); i += 1; continue
        if ch == 'y' and i == 0:
            out.append('й'); i += 1; continue
        if ch == nxt and ch not in 'aeiou':              # двойная согласная
            i += 1; continue
        out.append(ONE.get(ch, ch))
        i += 1
    rus = re.sub(r'([аеёиоуыэюя])\1', r'\1', ''.join(out))
    return stress(rus)


def stress(rus):
    """Ударение ставим на первый гласный — в английском так далеко не всегда."""
    if '́' in rus:
        return rus
    pos = [i for i, c in enumerate(rus) if c in 'аеёиоуыэюя']
    if len(pos) < 2 or rus[pos[0]] == 'ё':
        return rus
    at = pos[0]
    return rus[:at + 1] + '́' + rus[at + 1:]


# ------------------------------------------------------------------ часть речи
def guess_pos(en):
    """Те же правила, что и в guessPos() в app.js."""
    d = en.strip().lower()
    if re.match(r'^to\s+\S+$', d):
        return 'глаг.'
    if re.search(r'[\s.!?]', d):
        return 'фраза'
    if d.endswith('ly') and len(d) > 4:
        return 'нареч.'
    if re.search(r'(tion|sion|ment|ness|ity|ship|ism|ance|ence|hood|dom|ure|age)$', d):
        return 'сущ.'
    if re.search(r'(ous|ful|less|able|ible|ive|ical|ish|ary)$', d) and len(d) > 5:
        return 'прил.'
    if re.search(r'(ize|ise|ify|ate|ect|ude)$', d):
        return 'глаг.'
    return 'сущ.'


# ----------------------------------------------------------------- разбор PDF
SEP = re.compile(r'\s*(?:[—–-]{1,2}|=|\||:|\t|\s{2,})\s*')
# Словарная статья — это строчное слово или короткое словосочетание,
# а не кусок предложения: предложения начинаются с большой буквы и длиннее.
EN_WORD = re.compile(r"^[a-z][a-z'\-]*(?: [a-z'\-]+){0,2}$")
RU_ONLY = re.compile(r'^[%s][%s ,;()\-]*$' % (CYR, CYR))
JUNK = re.compile(r'(https?://|www\.|^\s*page\s|^\s*\d+\s*$|copyright)', re.I)


def read_lines(path):
    reader = pypdf.PdfReader(path)
    out = []
    for page in reader.pages:
        try:
            text = page.extract_text(extraction_mode='layout')
        except Exception:
            text = page.extract_text() or ''
        for line in text.replace('\xa0', ' ').split('\n'):
            line = line.rstrip()
            if line.strip() and not JUNK.search(line):
                out.append(line.strip())
    return out


def parse(lines):
    """Возвращает пары (английское слово, перевод). Перевод может быть пустым."""
    pairs, i = [], 0
    while i < len(lines):
        line = lines[i]
        parts = [p.strip() for p in SEP.split(line) if p.strip()]
        head = parts[0] if parts else ''
        if EN_WORD.match(head):
            # перевод — рядом в строке, следующей строкой или его нет вовсе
            ru = ''
            for p in parts[1:]:
                if RU_ONLY.match(p):
                    ru = p
                    break
            if not ru and len(parts) == 1 and i + 1 < len(lines) and RU_ONLY.match(lines[i + 1]):
                ru = lines[i + 1]
                i += 1
            pairs.append((head, ru))
        i += 1
    # дубли по слову убираем, сохраняя порядок
    seen, uniq = set(), []
    for en, ru in pairs:
        key = en.lower()
        if key in seen:
            continue
        seen.add(key)
        uniq.append((en, ru))
    return uniq


def js(value):
    return '"%s"' % value.replace('\\', '\\\\').replace('"', '\\"')


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    path = sys.argv[1]
    name = sys.argv[2] if len(sys.argv) > 2 else 'Новый модуль'
    mod_id = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-') or 'new-module'

    pairs = parse(read_lines(path))
    if not pairs:
        sys.exit('В PDF не нашлось ни одного английского слова.')

    print('{')
    print('  id: %s,' % js(mod_id))
    print('  name: %s,' % js(name))
    print('  words: [')
    for en, ru in pairs:
        parts = ['en: %s' % js(en), 'tr: %s' % js(translit(en)), 'ru: %s' % js(ru),
                 'pos: %s' % js(guess_pos(en)), 'tr_draft: true']
        print('    { %s },' % ', '.join(parts))
    print('  ]')
    print('},')
    print('', file=sys.stderr)
    print('Слов: %d. Транскрипция черновая — проверь ударение и убери tr_draft.'
          % len(pairs), file=sys.stderr)
    print('id модуля: %s — он должен быть не такой, как у модулей в words.js: '
          'к id привязан прогресс в браузере.' % mod_id, file=sys.stderr)


if __name__ == '__main__':
    main()
