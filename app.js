/* ==========================================================================
   Тренажёр английских слов — движок.
   Работает без сервера: просто открой index.html в браузере.
   ========================================================================== */
'use strict';

/* ---------- данные -------------------------------------------------------- */
const SETS = window.WORD_SETS || [];
let MODULES = [];
let WORDS = [];
let BY_KEY = new Map();
/* Модули бывают двух видов: из файла words.js и «свои» — собранные в самом
   приложении (например, из текстов для чтения) и хранящиеся в браузере.
   Прогресс привязан к ключу «id модуля :: слово|перевод», поэтому одно
   и то же слово в разных модулях учится независимо. */
function rebuildModules() {
  MODULES = [];
  WORDS = [];
  const add = (set, i, own) => {
    const id = String(set.id || set.name || ('set' + (i + 1)));
    const base = (set.words || []).slice();
    if (!own) {
      /* Слова, дописанные в приложении к модулю из words.js, лежат в браузере
         и подмешиваются сюда. Если такое слово потом впишут в файл руками,
         дубль не появится — сверяем по паре «слово + перевод». */
      const seen = new Set(base.map(w => w.en + '|' + w.ru));
      ((S.extra || {})[id] || []).forEach(w => {
        const k = w.en + '|' + w.ru;
        if (!seen.has(k)) { seen.add(k); base.push(w); }
      });
    }
    const words = base.map(w =>
      Object.assign({}, w, { key: id + '::' + w.en + '|' + w.ru, module: id }));
    /* Модуль из браузера мог остаться после выгрузки в words.js: тогда у двух
       модулей один id, а значит и общие ключи прогресса. Второй плиткой его
       не показываем — дописываем из него только то, чего нет в файле. */
    const same = MODULES.find(m => m.id === id);
    if (same) {
      same.ownCopy = true;
      const seen = new Set(same.words.map(w => w.key));
      words.forEach(w => {
        if (seen.has(w.key)) return;
        seen.add(w.key);
        same.words.push(w);
        WORDS.push(w);
        same.ownCopyOnly = (same.ownCopyOnly || 0) + 1;   // есть только в браузере
      });
      return;
    }
    MODULES.push({ id: id, name: set.name || ('Модуль ' + (i + 1)), words: words, own: !!own });
    WORDS.push.apply(WORDS, words);
  };
  SETS.forEach((set, i) => add(set, i, false));
  (S.userSets || []).forEach((set, i) => add(set, i, true));
  BY_KEY = new Map(WORDS.map(w => [w.key, w]));
}
const byKey = k => BY_KEY.get(k);
const moduleById = id => MODULES.find(m => m.id === id) || null;
const ALL = 'all';
function moduleWords(id) {
  const m = moduleById(id);
  return m ? m.words : WORDS;
}
function moduleName(id) {
  const m = moduleById(id);
  return m ? m.name : 'Все модули';
}

/* ---------- сохранение ---------------------------------------------------- */
const LS = 'en-ru-trainer/v1';
let S = {
  v: 2, w: {}, match: {}, learns: {}, userSets: [],
  module: null,
  filter: 'all', theme: 'auto', rate: 0.85, autoSpeak: false, alwaysTr: true
};
function load() {
  try {
    const raw = localStorage.getItem(LS);
    if (raw) S = Object.assign(S, JSON.parse(raw));
  } catch (e) { /* приватное окно — работаем без сохранения */ }
  if (!Array.isArray(S.userSets)) S.userSets = [];
  if (!S.extra || typeof S.extra !== 'object') S.extra = {};
  rebuildModules();
  if (S.module == null || (S.module !== ALL && !moduleById(S.module))) {
    S.module = MODULES.length ? MODULES[0].id : ALL;
  }
  if (!S.learns) S.learns = {};
}

/* ---------- свои модули: живут в localStorage, редактируются из приложения */
function ownSets() { return S.userSets || (S.userSets = []); }
function createOwnSet(name) {
  const set = { id: 'u' + Date.now().toString(36), name: String(name || '').trim() || 'Мои слова', words: [] };
  ownSets().push(set);
  save(); rebuildModules();
  return set;
}
function ownSetById(id) { return ownSets().find(s => s.id === id) || null; }
function addWordToOwnSet(setId, word) {
  const set = ownSetById(setId);
  if (!set) return 'нет такого модуля';
  if (set.words.some(w => w.en === word.en && w.ru === word.ru)) return 'уже есть';
  set.words.push(word);
  save(); rebuildModules();
  return '';
}
/* Слово, добавленное в приложении, можно убрать — например, если ошиблись
   в написании. Слова из words.js так не трогаем. */
function isAddedWord(w) {
  if (!w) return false;
  if (ownSetById(w.module)) return true;
  return extraOf(w.module).some(x => x.en === w.en && x.ru === w.ru);
}
function removeAddedWord(w) {
  const same = x => x.en === w.en && x.ru === w.ru;
  const own = ownSetById(w.module);
  if (own) own.words = own.words.filter(x => !same(x));
  else if ((S.extra || {})[w.module]) {
    S.extra[w.module] = S.extra[w.module].filter(x => !same(x));
    if (!S.extra[w.module].length) delete S.extra[w.module];
  } else return false;
  delete S.w[w.key];
  save(); rebuildModules();
  return true;
}

/* Добавление слова в любой модуль: и в «свой», и в тот, что задан в words.js. */
function addWordToModule(moduleId, word) {
  if (ownSetById(moduleId)) return addWordToOwnSet(moduleId, word);
  const m = moduleById(moduleId);
  if (!m) return 'нет такого модуля';
  if (m.words.some(w => w.en === word.en && w.ru === word.ru)) return 'уже есть';
  if (!S.extra) S.extra = {};
  if (!S.extra[moduleId]) S.extra[moduleId] = [];
  S.extra[moduleId].push(word);
  save(); rebuildModules();
  return '';
}
function extraOf(id) { return (S.extra || {})[id] || []; }
function dropExtras(id) {
  extraOf(id).forEach(w => { delete S.w[id + '::' + w.en + '|' + w.ru]; });
  if (S.extra) delete S.extra[id];
  save(); rebuildModules();
}
/* Копия модуля, оставшаяся в браузере после выгрузки в words.js. Удаляем
   только её: слова и прогресс остаются у модуля из файла, потому что id
   и ключи прогресса у них одни и те же. */
function dropOwnCopy(id) {
  S.userSets = ownSets().filter(s => s.id !== id);
  save(); rebuildModules();
}
function deleteOwnSet(id) {
  const set = ownSetById(id);
  if (!set) return;
  set.words.forEach(w => { delete S.w[id + '::' + w.en + '|' + w.ru]; });
  S.userSets = ownSets().filter(s => s.id !== id);
  delete S.learns[id];
  clearCards(id);
  Object.keys(S.match).forEach(k => { if (k.indexOf(id + '/') === 0) delete S.match[k]; });
  if (S.module === id) S.module = MODULES[0] ? MODULES[0].id : ALL;
  save(); rebuildModules();
}

/* ---------- черновая транскрипция -----------------------------------------
   Английское написание и чтение расходятся слишком сильно, чтобы считать
   транскрипцию наверняка: правила ниже дают только черновик в том же стиле,
   в каком записаны слова в words.js. Поэтому результат всегда показывается
   пользователю на правку и сам по себе в словарь не попадает — особенно
   ударение, которое здесь просто ставится на первый гласный.
   Частые слова, которые по правилам не читаются, лежат в TR_EXC. */
const TR_EXC = {
  one: 'уан', two: 'ту', who: 'ху', whose: 'хуз', whom: 'хум', some: 'сам', come: 'кам',
  done: 'дан', none: 'нан', love: 'лав', move: 'мув', prove: 'прув', lose: 'луз',
  said: 'сэд', says: 'сэз', again: 'эге́н', women: 'уи́мин', woman: 'уу́мэн',
  busy: 'би́зи', business: 'би́знэс', buy: 'бай', eye: 'ай', people: 'пи́пл',
  sure: 'шур', sugar: 'шу́гэр', work: 'уёрк', word: 'уёрд', world: 'уёрлд',
  war: 'уор', warm: 'уорм', were: 'уёр', where: 'уэ́р', there: 'зэр', their: 'зэр',
  through: 'сру', though: 'зоу', thought: 'сот', enough: 'ина́ф', tough: 'таф',
  laugh: 'лаф', cough: 'коф', could: 'куд', should: 'шуд', would: 'вуд',
  heart: 'харт', beautiful: 'бью́тифул', europe: 'ю́рэп', iron: 'а́йэрн',
  island: 'а́йлэнд', answer: 'э́нсэр', because: 'бико́з', friend: 'френд',
  great: 'грэйт', break: 'брэйк', steak: 'стэйк', many: 'ме́ни', any: 'э́ни',
  very: 'ве́ри', only: 'о́унли', money: 'ма́ни', honest: 'о́нэст', hour: 'а́уэр',
  to: 'ту', the: 'зэ', give: 'гив', have: 'хэв', live: 'лив', above: 'эба́в',
  our: 'а́уэр', sour: 'са́уэр', flour: 'фла́уэр'
};
/* Сначала самые длинные куски: порядок в списке и есть порядок проверки. */
const TR_PAIRS = [
  ['scien', 'са́йэн'], ['stion', 'счэн'], ['ation', 'эйшн'], ['ution', 'ушн'], ['otion', 'оушн'], ['ify', 'ифай'],
  ['ition', 'ишн'], ['ought', 'от'], ['aught', 'от'], ['cious', 'шэс'], ['tious', 'шэс'],
  ['tion', 'шн'], ['sion', 'жн'], ['cian', 'шн'], ['cial', 'шл'], ['tial', 'шл'],
  ['ture', 'чэр'], ['sure', 'жэр'], ['ight', 'айт'], ['ious', 'иэс'], ['eous', 'иэс'],
  ['ance', 'энс'], ['ence', 'энс'], ['able', 'эбл'], ['ible', 'ибл'], ['ical', 'икл'],
  ['sch', 'ск'], ['tch', 'ч'], ['nge', 'ндж'], ['dge', 'дж'], ['ous', 'эс'],
  ['oor', 'ур'], ['our', 'ор'], ['air', 'эр'], ['ear', 'иэр'], ['eer', 'иэр'],
  ['cce', 'ксэ'], ['cci', 'кси'],
  ['oy', 'ой'], ['oi', 'ой'], ['ee', 'и'], ['ea', 'и'], ['oo', 'у'], ['ou', 'ау'],
  ['ow', 'оу'], ['oa', 'оу'], ['au', 'о'], ['aw', 'о'], ['ai', 'эй'], ['ay', 'эй'],
  ['ei', 'эй'], ['ey', 'эй'], ['ie', 'и'], ['ue', 'у'], ['ui', 'у'], ['ew', 'ю'],
  ['eu', 'ю'], ['ar', 'ар'], ['or', 'ор'], ['ir', 'ёр'], ['ur', 'ёр'], ['er', 'эр'],
  ['ch', 'ч'], ['sh', 'ш'], ['th', 'с'], ['ph', 'ф'], ['wh', 'у'], ['ck', 'к'],
  ['ng', 'нг'], ['nk', 'нк'], ['qu', 'ку'], ['gh', '']
];
/* Немые буквы в начале слова: knowledge, write, psychology. */
const TR_START = [['kn', 'н'], ['wr', 'р'], ['gn', 'н'], ['ps', 'с'], ['mn', 'н']];
/* Перед этими концовками «немая e» не работает: culture ≠ кулчур. */
const TR_KEEP_E = /(ture|sure|dge|nge|ble|cle|dle|gle|kle|ple|tle|zle)$/;
const TR_ONE = {
  a: 'э', e: 'э', i: 'и', o: 'о', u: 'а', y: 'и',
  b: 'б', c: 'к', d: 'д', f: 'ф', g: 'г', h: 'х', j: 'дж', k: 'к', l: 'л', m: 'м',
  n: 'н', p: 'п', r: 'р', s: 'с', t: 'т', v: 'в', w: 'у', x: 'кс', z: 'з'
};
/* Долгий гласный из-за «немой e» на конце: time → тайм, note → ноут. */
const TR_LONG = { a: 'эй', e: 'и', i: 'ай', o: 'оу', u: 'ю' };
function autoTr(word) {
  let w = String(word || '').toLowerCase().trim();
  if (!w) return '';
  if (TR_EXC[w]) return TR_EXC[w];
  /* «to pursue», «give up» — каждое слово читается само по себе. */
  if (w.indexOf(' ') > 0) return w.split(/\s+/).map(autoTr).join(' ');
  let magic = '';
  const me = TR_KEEP_E.test(w) ? null : w.match(/^(.*?)([aeiou])([bcdfgklmnprstvz])e$/);
  if (me && me[1].length) {
    magic = TR_LONG[me[2]];
    /* page → пэйдж, place → плэйс: перед немой e согласная ещё и смягчается. */
    const tail = me[3] === 'g' ? '\u0002' : (me[3] === 'c' ? '\u0003' : me[3]);
    w = me[1] + '\u0001' + tail;
  }
  const out = [];
  let i = 0;
  const st = TR_START.find(pr => w.indexOf(pr[0]) === 0);
  if (st) { out.push(st[1]); i = 2; }
  while (i < w.length) {
    const ch = w[i], next = w[i + 1] || '';
    if (ch === '\u0001') { out.push(magic); i += 1; continue; }
    if (ch === '\u0002') { out.push('дж'); i += 1; continue; }
    if (ch === '\u0003') { out.push('с'); i += 1; continue; }
    if (ch === 'e' && i === w.length - 1 && i > 2) { i += 1; continue; }   // немая e
    /* Сочетания проверяем раньше одиночных букв: иначе «cc» в access
       свернётся в одну «с», а «cial» в special прочитается как «сиал». */
    const pair = TR_PAIRS.find(pr => w.slice(i, i + pr[0].length) === pr[0]);
    if (pair) { out.push(pair[1]); i += pair[0].length; continue; }
    if (ch === 'c' && next && 'eiy'.indexOf(next) >= 0) { out.push('с'); i += 1; continue; }
    if (ch === 'g' && next && 'eiy'.indexOf(next) >= 0) { out.push('дж'); i += 1; continue; }
    if (ch === 's' && i && next && 'aeiouy'.indexOf(w[i - 1]) >= 0
        && 'aeiouy'.indexOf(next) >= 0) { out.push('з'); i += 1; continue; }
    if (ch === 'y' && i === 0) { out.push('й'); i += 1; continue; }
    if (ch === next && 'aeiou'.indexOf(ch) < 0) { i += 1; continue; }      // двойная согласная
    out.push(TR_ONE[ch] !== undefined ? TR_ONE[ch] : ch);
    i += 1;
  }
  /* «ии», «ээ» на стыке правил ни о чём не говорят — сжимаем. */
  return trStress(out.join('').replace(/([аеёиоуыэюя])\1/g, '$1'));
}
/* Ударение ставим на первый гласный — в английском так далеко не всегда,
   поэтому в подсказке к полю прямо написано: проверь. */
function trStress(rus) {
  if (/\u0301/.test(rus)) return rus;
  const pos = [];
  for (let i = 0; i < rus.length; i++) if ('аеёиоуыэюя'.indexOf(rus[i]) >= 0) pos.push(i);
  if (pos.length < 2) return rus;
  const at = pos[0];
  if (rus[at] === 'ё') return rus;
  return rus.slice(0, at + 1) + '\u0301' + rus.slice(at + 1);
}

/* Из подсказки «получает доступ (access)» делаем заготовку карточки:
   слово в скобках — это начальная форма, всё до скобок — перевод. */
function cardDraft(form, gloss) {
  let en = form, ru = gloss || '';
  const m = (gloss || '').match(/\(([^)]+)\)/);
  if (m) {
    const inner = m[1].trim();
    if (/^[a-z][a-z' -]*$/i.test(inner)) en = inner;
    const head = (gloss || '').slice(0, m.index).trim().replace(/[;,]$/, '');
    if (head) ru = head;
  }
  return { en: en, ru: ru, pos: guessPos(en), tr: autoTr(en) };
}
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) {}
  }, 120);
}
/* Запись отложена на 120 мс — если вкладку закрывают раньше, дописываем сразу. */
function flush() {
  clearTimeout(saveTimer);
  try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) {}
}
window.addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });

function st(w) {
  const k = w.key || w;
  if (!S.w[k]) S.w[k] = { stage: 0, correct: 0, wrong: 0, star: false, seen: 0 };
  return S.w[k];
}
function bump(w, ok) {
  const s = st(w);
  s.seen++;
  if (ok) { s.correct++; s.stage = Math.min(3, s.stage + 1); }
  else { s.wrong++; s.stage = Math.max(0, s.stage - 1); }
  save(); updateMini();
}

/* ---------- мелкие помощники ---------------------------------------------- */
const $ = sel => document.querySelector(sel);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/* «1 слово, 2 слова, 5 слов» — выбор формы по числу. */
function plural(n, one, few, many) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}
function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
/* Приведение ответа к сравнимому виду: регистр, знаки препинания, артикль
   (a / an / the) и частица to перед глаголом не важны. А вот буквы важны:
   написание проверяется точно. Другое допустимое написание слова
   (analyze / analyse) задаётся полем accept, догадками оно не добирается. */
function norm(s) {
  return String(s).toLowerCase()
    .replace(/[\u2019\u02bc]/g, "'")
    .replace(/[.,!?;:()]/g, ' ')
    .replace(/^\s*(a|an|the|to)\s+/, '')
    .replace(/\s+/g, ' ').trim();
}
/* Для поиска по списку: дефис, регистр и знак ударения не мешают. */
function loose(s) {
  return norm(s).replace(/\u0301/g, '').replace(/-/g, ' ');
}
function lev(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m || !n) return m || n;
  let prev = Array.from({ length: n + 1 }, (_, i) => i), cur = new Array(n + 1);
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}
/* Все написания, которые принимаем: само слово и всё из accept. */
function variants(w) {
  const out = [];
  const add = x => {
    const n = norm(x);
    if (n && out.indexOf(n) < 0) out.push(n);
  };
  add(w.en);
  (w.accept || []).forEach(add);
  if (String(w.en).includes('|')) String(w.en).split('|').forEach(add);
  return out;
}
function checkTyped(input, w) {
  const t = norm(input);
  if (!t) return 'bad';
  const vs = variants(w);
  if (vs.indexOf(t) >= 0) return 'ok';
  /* Опечатка в один символ — не ошибка, но и не ответ: просим переписать. */
  if (vs.some(v => v.length > 3 && lev(v, t) <= 1)) return 'near';
  return 'bad';
}
let toastTimer = null;
function toast(msg, ms) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms || 2600);
}

/* ---------- озвучка -------------------------------------------------------- */
let enVoice = null, voiceWarned = false;
function pickVoice() {
  if (!('speechSynthesis' in window)) return;
  const all = speechSynthesis.getVoices() || [];
  /* Сначала американские голоса — экзамен и словарь ориентированы на них. */
  const us = all.filter(v => /^en[-_]?US/i.test(v.lang || ''));
  const any = all.filter(v => /^en(-|_|$)/i.test(v.lang || ''));
  const pick = list => list.find(v => /samantha|alex|allison|ava|evan|google|zira|aria/i.test(v.name)) || list[0];
  enVoice = pick(us) || pick(any) || null;
}
if ('speechSynthesis' in window) {
  pickVoice();
  speechSynthesis.onvoiceschanged = pickVoice;
}
let speaking = null, speakDone = null;
function stopSpeak() {
  try { speechSynthesis.cancel(); } catch (e) {}
  const cb = speakDone;
  speaking = null; speakDone = null;
  if (cb) cb();
}
/* Возвращает true, если начали читать, и false, если это было повторное
   нажатие по тому же тексту — тогда чтение останавливается. */
function speak(text, onEnd) {
  if (!('speechSynthesis' in window) || !text) return false;
  if (!enVoice) pickVoice();
  if (!enVoice) {
    if (!voiceWarned) {
      voiceWarned = true;
      toast('Английский голос не установлен: Системные настройки → Универсальный доступ → Устный контент → Системный голос → Управление голосами → английский', 7000);
    }
    return false;
  }
  const clean = String(text).replace(/\s*\|\s*/g, ', ');
  if (speaking === clean) { stopSpeak(); return false; }
  stopSpeak();
  const u = new SpeechSynthesisUtterance(clean);
  u.voice = enVoice; u.lang = enVoice.lang; u.rate = S.rate || 0.85;
  u.onend = u.onerror = () => {
    if (speaking !== clean) return;
    const cb = speakDone;
    speaking = null; speakDone = null;
    if (cb) cb();
  };
  speaking = clean;
  speakDone = onEnd || null;
  try { speechSynthesis.speak(u); } catch (e) { speaking = null; speakDone = null; return false; }
  return true;
}
const speakBtn = text => `<button class="speak" data-speak="${esc(text)}" title="Послушать">🔊</button>`;

/* ---------- выборка слов --------------------------------------------------- */
const FILTER_NAMES = {
  all: 'все слова', new: 'новые слова', learning: 'невыученные слова',
  hard: 'сложные слова', starred: 'отмеченные слова'
};
function pool() {
  const f = S.filter;
  return moduleWords(S.module).filter(w => {
    const s = st(w);
    if (f === 'new') return s.seen === 0;
    if (f === 'learning') return s.stage < 3;
    if (f === 'hard') return s.wrong > 0 && s.stage < 3;
    if (f === 'starred') return !!s.star;
    return true;
  });
}
function counts(list) {
  list = list || moduleWords(S.module);
  let fresh = 0, learning = 0, known = 0;
  list.forEach(w => {
    const s = st(w);
    if (s.stage >= 3) known++;
    else if (s.seen === 0) fresh++;
    else learning++;
  });
  return { fresh, learning, known, total: list.length };
}
function emptyPool(what) {
  return `<div class="empty"><span class="ico">🕊️</span>
    В модуле «${esc(moduleName(S.module))}» для набора «${esc(FILTER_NAMES[S.filter])}»
    ${what || 'нет слов'}.<br>
    <button class="link-btn" data-go="home">Выбрать другой модуль или набор</button></div>`;
}

/* ---------- роутер --------------------------------------------------------- */
let current = 'home';
let advanceTimer = null;
const inits = {};
function go(name) {
  clearTimeout(advanceTimer);
  hideTip();
  if (current === 'match') stopMatchTimer();
  stopSpeak();
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('screen-' + name);
  if (!el) return;
  el.classList.add('active');
  current = name;
  window.scrollTo(0, 0);
  if (inits[name]) inits[name]();
}
document.addEventListener('click', e => {
  const goEl = e.target.closest('[data-go]');
  if (goEl) { go(goEl.dataset.go); return; }
  const sp = e.target.closest('[data-speak]');
  if (sp) { e.stopPropagation(); speak(sp.dataset.speak); }
});

/* ---------- верхняя панель ------------------------------------------------- */
/* В шапке — общий итог по всем модулям сразу, а не по выбранному. */
function updateMini() {
  const c = counts(WORDS);
  $('#miniProgress').textContent = `выучено ${c.known} / ${c.total}`;
}

/* ---------- главный экран -------------------------------------------------- */
function renderModules() {
  const many = MODULES.length > 1;
  $('#moduleField').style.display = MODULES.length ? '' : 'none';
  const card = (id, name, list) => {
    const c = counts(list);
    const pct = c.total ? Math.round(c.known / c.total * 100) : 0;
    const own = (moduleById(id) || {}).own;
    return `<button class="mod ${S.module === id ? 'active' : ''}" data-module="${esc(id)}">
      <span class="mod-name">${esc(name)}${own ? ' <span class="mod-own">в браузере</span>' : ''}</span>
      <span class="mod-stat">${c.total} слов · выучено ${c.known}</span>
      <span class="mod-bar"><span style="width:${pct}%"></span></span>
    </button>`;
  };
  $('#moduleList').innerHTML =
    MODULES.map(m => card(m.id, m.name, m.words)).join('') +
    (many ? card(ALL, 'Все модули', WORDS) : '');
}
$('#moduleList').addEventListener('click', e => {
  const b = e.target.closest('button[data-module]');
  if (!b) return;
  S.module = b.dataset.module;
  save(); inits.home();
});

inits.home = function () {
  renderModules();
  const c = counts();
  const pct = c.total ? Math.round(c.known / c.total * 100) : 0;
  $('#homeRing').style.background =
    `conic-gradient(var(--accent) ${pct * 3.6}deg, var(--panel-2) 0deg)`;
  $('#homeRing').innerHTML = `<span>${pct}%</span>`;
  $('#homeTitle').textContent = c.known === c.total && c.total
    ? 'Все слова выучены 🎉'
    : (c.known === 0 ? 'Начнём учить слова' : 'Продолжаем');
  $('#homeSub').textContent = `${moduleName(S.module)} · ${c.total} слов · выучено ${c.known}`;
  $('#homeStats').innerHTML =
    `<span class="chip">🆕 новые <b>${c.fresh}</b></span>` +
    `<span class="chip warn">📚 учу <b>${c.learning}</b></span>` +
    `<span class="chip ok">✅ знаю <b>${c.known}</b></span>`;

  document.querySelectorAll('#poolFilter button').forEach(b => {
    b.classList.toggle('active', b.dataset.filter === S.filter);
  });
  $('#readTileDesc').textContent =
    `${READ.texts.length} текстов · прочитано ${READ.texts.filter(t => isRead(t.id)).length}`;

  const p = pool();
  const pc = counts(p);
  $('#poolInfo').textContent = p.length
    ? `В тренировке ${p.length} слов · выучено ${pc.known}`
    : 'В этом наборе пока нет слов — выбери другой.';
  updateMini();
};
$('#poolFilter').addEventListener('click', e => {
  const b = e.target.closest('button[data-filter]');
  if (!b) return;
  S.filter = b.dataset.filter;
  save(); inits.home();
});

/* ==========================================================================
   ОБЩИЙ РЕНДЕР ВОПРОСА (используют «Заучивание», «Тест», «Ввод»)
   ========================================================================== */
function distractors(w, field, n) {
  const used = new Set([w[field]]);
  const ok = x => x.key !== w.key && x.en !== w.en && x.ru !== w.ru && !used.has(x[field]);
  const take = list => {
    for (const x of list) {
      if (picks.length >= n) break;
      if (ok(x)) { picks.push(x); used.add(x[field]); }
    }
  };
  const picks = [];
  const near = moduleWords(w.module);          // сначала слова того же модуля
  take(shuffle(near.filter(x => x.pos === w.pos)));
  take(shuffle(near));
  take(shuffle(WORDS.filter(x => x.pos === w.pos)));
  take(shuffle(WORDS));
  return picks;
}
function makeQuestion(w, mode) {
  if (mode === 'type') return { w, kind: 'type', mode };
  const field = mode === 'en2ru' ? 'ru' : 'en';
  const promptField = mode === 'en2ru' ? 'en' : 'ru';
  return { w, kind: 'choice', mode, field, promptField, opts: shuffle([w].concat(distractors(w, field, 3))) };
}
function wordDetails(w) {
  const bits = [];
  if (w.pl) bits.push(`<span>мн. ч.: <b>${esc(w.pl)}</b> <span class="muted">${esc(w.plTr || '')}</span></span>`);
  if (w.forms) bits.push(`<span>формы: <b>${esc(w.forms)}</b></span>`);
  if (w.note) bits.push(`<span class="muted">${esc(w.note)}</span>`);
  return bits.length ? `<div class="q-extra">${bits.join('')}</div>` : '';
}
const KIND_TEXT = { en2ru: 'Как переводится?', ru2en: 'Как будет по-английски?', type: 'Напиши по-английски' };

/* Рисует вопрос в контейнер. onDone(ok) вызывается после ответа. */
function renderQuestion(container, q, onDone, extraHTML, showStage) {
  const w = q.w;
  let answered = false;
  const isEnPrompt = q.kind === 'choice' && q.promptField === 'en';
  const promptText = q.kind === 'type' ? w.ru : w[q.promptField];
  const head =
    `<div class="q-kind">${KIND_TEXT[q.mode] || ''}</div>
     <div class="q-word">${esc(promptText)}${isEnPrompt ? ' ' + speakBtn(w.en) : ''}</div>
     ${isEnPrompt && S.alwaysTr ? `<div class="q-tr">${esc(w.tr)}</div>` : ''}`;

  if (q.kind === 'choice') {
    container.innerHTML = `<div class="pane">${head}
      <div class="options">${q.opts.map((o, i) => `
        <button class="option" data-i="${i}">
          <span class="num">${i + 1}</span>
          <span>${esc(o[q.field])}${q.field === 'en' ? `<span class="tr" style="display:block;font-size:13px">${esc(o.tr)}</span>` : ''}</span>
        </button>`).join('')}
      </div>
      <div class="feedback" id="fb"></div>
      ${extraHTML || ''}
    </div>`;
    container.querySelectorAll('.option').forEach(btn => {
      btn.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        const i = +btn.dataset.i;
        const ok = q.opts[i].key === w.key || q.opts[i][q.field] === w[q.field];
        container.querySelectorAll('.option').forEach((b, j) => {
          b.disabled = true;
          if (q.opts[j].key === w.key) b.classList.add('correct');
          else if (j === i) b.classList.add('wrong');
        });
        finish(ok);
      });
    });
    container._answer = n => {
      const b = container.querySelector(`.option[data-i="${n}"]`);
      if (b && !answered) b.click();
    };
  } else {
    container.innerHTML = `<div class="pane">${head}
      ${w.note ? `<div class="q-note">${esc(w.note)}</div>` : ''}
      <div class="answer-row">
        <input type="text" id="typeIn" autocomplete="off" autocorrect="off" autocapitalize="off"
               spellcheck="false" placeholder="слово по-английски" lang="en">
        <button class="btn" id="typeGo">Проверить</button>
      </div>
      <div class="row"><button class="link-btn" id="typeSkip">Не знаю, показать ответ</button></div>
      <div class="feedback" id="fb"></div>
      ${extraHTML || ''}
    </div>`;
    const input = container.querySelector('#typeIn');
    const submit = () => {
      if (answered) return;
      const res = checkTyped(input.value, w);
      if (res === 'near') {
        input.classList.add('near');
        showFb('near', `Почти! Опечатка — проверь написание и попробуй ещё раз.`);
        input.focus(); input.select();
        return;
      }
      answered = true;
      input.classList.remove('near');          // снять жёлтую рамку прошлой попытки
      input.classList.add(res === 'ok' ? 'correct' : 'wrong');
      input.disabled = true;
      finish(res === 'ok');
    };
    container.querySelector('#typeGo').addEventListener('click', submit);
    container.querySelector('#typeSkip').addEventListener('click', () => {
      if (answered) return;
      answered = true;
      input.disabled = true;
      finish(false);
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); answered ? next() : submit(); }
    });
    setTimeout(() => input.focus(), 30);
    container._submit = submit;
  }

  function showFb(cls, html) {
    const fb = container.querySelector('#fb');
    fb.className = 'feedback show ' + cls;
    fb.innerHTML = html;
  }
  function finish(ok) {
    const full = `<b>${esc(w.en)}</b> <span class="muted">(${esc(w.tr)})</span> — ${esc(w.ru)} ${speakBtn(w.en)}`;
    /* Разбор ответа ждёт нажатия «Дальше» — и когда верно, и когда неверно:
       сам по себе он не исчезает, чтобы можно было спокойно прочитать слово. */
    let stageLine = '';
    if (showStage) {
      const cur = st(w).stage;
      const next = ok ? Math.min(3, cur + 1) : Math.max(0, cur - 1);
      stageLine = next >= 3
        ? '<div class="q-note">🎉 Слово выучено</div>'
        : `<div class="q-note">Ступень ${next + 1} из 3${ok ? '' : ' — повторим в этом же раунде'}</div>`;
    }
    showFb(ok ? 'ok' : 'bad',
      (ok ? '✓ Верно · ' : '✗ Правильный ответ: ') + full + wordDetails(w) + stageLine +
      `<div class="row end"><button class="btn" id="nextBtn">Дальше →</button></div>`);
    container.querySelector('#nextBtn').addEventListener('click', next);
    if (S.autoSpeak) speak(w.en);
    container._next = next;
    function next() {
      clearTimeout(advanceTimer);
      container._next = null;
      onDone(ok);
    }
  }
  function next() { if (container._next) container._next(); }
}

/* ==========================================================================
   РЕЖИМ «ЗАУЧИВАНИЕ»
   ========================================================================== */
const ROUND_SIZE = 7;
let L = { set: [], queue: [], size: 0, wrong: 0 };

/* Набор фиксируется на входе в режим: иначе при фильтре «новые» слово
   выпадало бы из тренировки сразу после первого ответа. */
function learnPickRound() {
  const rest = L.set.map(byKey).filter(w => w && st(w).stage < 3);
  if (!rest.length) return [];
  const rnd = new Map(rest.map(w => [w.key, Math.random()]));
  /* Сначала добиваем начатые слова — те, что ближе к «выучено».
     Новые подмешиваем только если начатых меньше, чем нужно на раунд:
     так каждая семёрка доходит до конца, а не копится бесконечно. */
  const round = rest.filter(w => st(w).seen > 0).sort((a, b) =>
    (st(b).stage - st(a).stage) || (st(a).seen - st(b).seen) || (rnd.get(a.key) - rnd.get(b.key))
  ).slice(0, ROUND_SIZE);
  if (round.length < ROUND_SIZE) {
    const fresh = rest.filter(w => st(w).seen === 0)
      .sort((a, b) => rnd.get(a.key) - rnd.get(b.key));
    round.push(...fresh.slice(0, ROUND_SIZE - round.length));
  }
  return shuffle(round.map(w => w.key));
}
function saveLearn() {
  if (L.queue.length) {
    S.learns[S.module] = { filter: S.filter, set: L.set, queue: L.queue, size: L.size, wrong: L.wrong };
  } else {
    delete S.learns[S.module];
  }
  save();
}
function learnProgress() {
  const list = L.set.map(byKey).filter(Boolean);
  return { known: list.filter(w => st(w).stage >= 3).length, total: list.length };
}
inits.learn = function () {
  const saved = S.learns[S.module];
  if (saved && saved.filter === S.filter && saved.queue.length &&
      saved.queue.every(byKey) && (saved.set || []).length) {
    L = { set: saved.set.filter(byKey), queue: saved.queue.slice(), size: saved.size, wrong: saved.wrong || 0 };
  } else {
    L.set = pool().map(w => w.key);
    const q = learnPickRound();
    L = { set: L.set, queue: q, size: q.length, wrong: 0 };
    saveLearn();
  }
  learnStep();
};
function learnStep() {
  const body = $('#learnBody');
  const p = learnProgress();
  /* Наверху — движение по текущему раунду: оно меняется с каждым верным
     ответом. Общее «выучено» растёт медленнее: слово считается выученным
     только пройдя все три ступени, поэтому оно вынесено отдельной строкой. */
  const done = Math.max(0, L.size - L.queue.length);
  $('#learnBar').style.width = L.size ? (done / L.size * 100) + '%' : '0%';
  $('#learnLabel').textContent = `${done} / ${L.size}`;

  if (!p.total) { body.innerHTML = emptyPool(); return; }
  if (!L.queue.length) { learnDone(); return; }
  const w = byKey(L.queue[0]);
  if (!w) { L.queue.shift(); return learnStep(); }
  const stage = st(w).stage;
  const mode = stage === 0 ? 'en2ru' : (stage === 1 ? 'ru2en' : 'type');
  renderQuestion(body, makeQuestion(w, mode), ok => {
    bump(w, ok);
    L.queue.shift();
    if (!ok) { L.wrong++; L.queue.push(w.key); }
    saveLearn();
    learnStep();
  }, `<div class="q-note">В раунде осталось: ${L.queue.length} · выучено ${p.known} из ${p.total}</div>`,
     true);
}
function learnDone() {
  const p = learnProgress();
  const allDone = p.known >= p.total;
  delete S.learns[S.module]; save();
  const roundLine = L.size
    ? `${L.size} слов в раунде${L.wrong ? ` · ошибок: ${L.wrong}` : ' · без ошибок'}<br>`
    : '';
  $('#learnBody').innerHTML = `<div class="pane"><div class="result">
      <div class="big">${allDone ? '🎉' : '👏'}</div>
      <h2>${allDone ? `Модуль «${esc(moduleName(S.module))}» выучен!` : 'Раунд пройден'}</h2>
      <p class="sub">${roundLine}Выучено ${p.known} из ${p.total}</p>
      <div class="row" style="justify-content:center">
        ${allDone ? '' : '<button class="btn" id="againBtn">Следующий раунд</button>'}
        <button class="btn ghost" data-go="home">На главную</button>
      </div>
    </div></div>`;
  const again = $('#againBtn');
  if (again) again.addEventListener('click', () => {
    const q = learnPickRound();
    L.queue = q; L.size = q.length; L.wrong = 0;
    saveLearn();
    learnStep();
  });
}

/* ==========================================================================
   РЕЖИМ «КАРТОЧКИ»
   ========================================================================== */
let C = { list: [], i: 0, flipped: false, marks: {}, module: null, sig: '' };

/* Отметки «знаю / не знаю» и место в колоде сохраняются по модулю:
   вернувшись, видно, что уже разобрано, и колода продолжается с того же места. */
function saveCards() {
  if (!S.cards) S.cards = {};
  if (!C.module) return;
  const marks = C.marks || {};
  if (!Object.keys(marks).length && !C.i) delete S.cards[C.module];
  else S.cards[C.module] = { sig: C.sig, marks: marks, i: C.i, order: C.list.map(w => w.key) };
  save();
}
function clearCards(moduleId) {
  if (S.cards) delete S.cards[moduleId];
  if (C.module === moduleId) C = { list: [], i: 0, flipped: false, marks: {}, module: null, sig: '' };
}
inits.cards = function () {
  const list = pool();
  const sig = S.filter + '|' + list.length;
  const saved = (S.cards || {})[S.module];
  if (saved && saved.sig === sig && (saved.order || []).length) {
    const byK = new Map(list.map(w => [w.key, w]));
    const restored = saved.order.map(k => byK.get(k)).filter(Boolean);
    if (restored.length === list.length) {
      C = { list: restored, i: Math.min(saved.i || 0, restored.length),
            flipped: false, marks: saved.marks || {}, module: S.module, sig: sig };
      renderCard();
      return;
    }
  }
  C = { list: shuffle(list), i: 0, flipped: false, marks: (saved && saved.marks) || {},
        module: S.module, sig: sig };
  saveCards();
  renderCard();
};
$('#cardsShuffle').addEventListener('click', () => {
  if (current !== 'cards') return;
  C.list = shuffle(C.list); C.i = 0; C.flipped = false;
  saveCards(); renderCard();
  toast('Перемешано — отметки сохранены');
});
function renderCard() {
  const body = $('#cardsBody');
  if (!C.list.length) { body.innerHTML = emptyPool(); $('#cardsLabel').textContent = ''; return; }
  if (C.i >= C.list.length) return cardsDone();

  const w = C.list[C.i];
  const dir = S.cardsDir === 'ru2en';
  $('#cardsBar').style.width = (C.i / C.list.length * 100) + '%';
  $('#cardsLabel').textContent = `${C.i + 1} / ${C.list.length}`;

  const front = dir
    ? `<div class="card-ru">${esc(w.ru)}</div>`
    : `<div class="card-word">${esc(w.en)} ${speakBtn(w.en)}</div>
       <div class="card-tr">${esc(w.tr)}</div>`;
  const back = dir
    ? `<div class="card-word">${esc(w.en)} ${speakBtn(w.en)}</div>
       <div class="card-tr">${esc(w.tr)}</div>`
    : `<div class="card-ru">${esc(w.ru)}</div>`;
  const meta = [
    w.pl ? `мн. ч.: <b>${esc(w.pl)}</b> (${esc(w.plTr || '')})` : '',
    w.forms ? `формы: <b>${esc(w.forms)}</b>` : '',
    w.note ? esc(w.note) : ''
  ].filter(Boolean).join(' · ');

  body.innerHTML = `
    <div class="flip ${C.flipped ? 'flipped' : ''}" id="flip">
      <div class="flip-inner">
        <div class="flip-face">${front}
          <div class="flip-hint">нажми или пробел — перевернуть</div></div>
        <div class="flip-face back">${back}
          ${meta ? `<div class="card-meta">${meta}</div>` : ''}
          <div class="flip-hint">нажми или пробел — обратно</div></div>
      </div>
    </div>
    <div class="nav-row">
      <button class="icon-btn" id="cPrev" title="Назад (←)">←</button>
      <button class="btn ghost" id="cDunno">Не знаю</button>
      <button class="btn" id="cKnow">Знаю ✓</button>
      <button class="icon-btn" id="cNext" title="Вперёд (→)">→</button>
    </div>
    <div class="row" style="justify-content:center">
      <button class="link-btn" id="cDir">${dir ? '🇷🇺 → 🇬🇧  русский спереди' : '🇬🇧 → 🇷🇺  английский спереди'}</button>
      <button class="link-btn" id="cStar">${st(w).star ? '⭐ отмечено' : '☆ отметить как сложное'}</button>
    </div>
    <div class="dots">${C.list.map((x, i) =>
      `<span class="dot ${i === C.i ? 'now' : (C.marks[x.key] === 1 ? 'known' : C.marks[x.key] === 0 ? 'unknown' : '')}"></span>`).join('')}</div>
    ${cardsStats()}`;

  $('#flip').addEventListener('click', flipCard);
  $('#cPrev').addEventListener('click', () => move(-1));
  $('#cNext').addEventListener('click', () => move(1));
  $('#cKnow').addEventListener('click', () => mark(true));
  $('#cDunno').addEventListener('click', () => mark(false));
  $('#cDir').addEventListener('click', () => {
    S.cardsDir = dir ? 'en2ru' : 'ru2en'; save(); C.flipped = false; renderCard();
  });
  $('#cStar').addEventListener('click', () => {
    const s = st(w); s.star = !s.star; save(); renderCard();
  });
  const clr = $('#cClear');
  if (clr) clr.addEventListener('click', () => {
    if (!confirm('Убрать все отметки «знаю / не знаю» в этом модуле?')) return;
    C.marks = {}; saveCards(); renderCard();
    toast('Отметки убраны');
  });
  if (S.autoSpeak && !dir) speak(w.en);
}
function cardsStats() {
  /* Считаем по текущей колоде, а не по всем отметкам: после «повторить
     незнакомые» колода меньше, и общий счёт уходил бы в минус. */
  let known = 0, unknown = 0;
  C.list.forEach(w => {
    const m = C.marks[w.key];
    if (m === 1) known++; else if (m === 0) unknown++;
  });
  const left = C.list.length - known - unknown;
  if (!known && !unknown) {
    return '<p class="cards-stats muted">Отметки «знаю / не знаю» сохраняются: вернёшься — увидишь, что уже разобрано.</p>';
  }
  return `<p class="cards-stats">
      <span class="chip ok">знаю <b>${known}</b></span>
      <span class="chip warn">не знаю <b>${unknown}</b></span>
      <span class="chip">без отметки <b>${left}</b></span>
      <button class="link-btn" id="cClear">очистить отметки</button>
    </p>`;
}
function flipCard() {
  C.flipped = !C.flipped;
  const f = $('#flip');
  if (f) f.classList.toggle('flipped', C.flipped);
  if (C.flipped && S.autoSpeak && S.cardsDir === 'ru2en') speak(C.list[C.i].en);
}
function move(d) {
  C.i = Math.max(0, Math.min(C.list.length, C.i + d));
  C.flipped = false;
  saveCards();
  renderCard();
}
function mark(ok) {
  const w = C.list[C.i];
  C.marks[w.key] = ok ? 1 : 0;
  bump(w, ok);
  move(1);
}
function cardsDone() {
  const known = Object.values(C.marks).filter(x => x === 1).length;
  const unknown = Object.values(C.marks).filter(x => x === 0).length;
  $('#cardsBar').style.width = '100%';
  $('#cardsLabel').textContent = `${C.list.length} / ${C.list.length}`;
  $('#cardsBody').innerHTML = `<div class="pane"><div class="result">
      <div class="big">🃏</div><h2>Колода пройдена</h2>
      <p class="sub">Знаю: ${known} · не знаю: ${unknown}</p>
      <div class="row" style="justify-content:center">
        ${unknown ? '<button class="btn" id="cRetry">Повторить незнакомые</button>' : ''}
        <button class="btn ghost" id="cAll">Пройти заново</button>
        <button class="btn ghost" data-go="home">На главную</button>
      </div></div></div>`;
  const r = $('#cRetry');
  if (r) r.addEventListener('click', () => {
    const bad = C.list.filter(w => C.marks[w.key] === 0);
    C = { list: shuffle(bad), i: 0, flipped: false, marks: C.marks,
          module: C.module, sig: C.sig + '|повтор' };
    saveCards(); renderCard();
  });
  $('#cAll').addEventListener('click', () => {
    C.list = shuffle(C.list); C.i = 0; C.flipped = false;
    saveCards(); renderCard();
  });
}

/* ==========================================================================
   ОБЩИЙ ЭКРАН ВЫБОРА ДЛИНЫ (тест и ввод с клавиатуры)
   ========================================================================== */
function lengthPicker(title, note, total, onStart) {
  const opts = [10, 20, 50].filter(n => n < total).concat([total]);
  return `<div class="pane">
      <h2>${esc(title)}</h2>
      <p class="muted">${esc(note)} Доступно слов: ${total}.</p>
      <div class="segmented" id="lenPick">
        ${opts.map(n => `<button data-n="${n}">${n === total ? `Все ${total}` : n + ' слов'}</button>`).join('')}
      </div>
    </div>`;
}
function bindLengthPicker(root, onStart) {
  root.querySelector('#lenPick').addEventListener('click', e => {
    const b = e.target.closest('button[data-n]');
    if (b) onStart(+b.dataset.n);
  });
}

/* ==========================================================================
   РЕЖИМ «ТЕСТ»
   ========================================================================== */
let T = { list: [], i: 0, wrong: [], right: 0 };
inits.test = function () {
  const p = pool();
  $('#testBar').style.width = '0%';
  $('#testLabel').textContent = '';
  if (!p.length) { $('#testBody').innerHTML = emptyPool(); return; }
  $('#testBody').innerHTML = lengthPicker('Тест: выбор из четырёх',
    'Вопросы в обе стороны: с английского и на английский.', p.length);
  bindLengthPicker($('#testBody'), n => testStart(shuffle(p).slice(0, n)));
};
function testStart(list) {
  T = { list, i: 0, wrong: [], right: 0 };
  testStep();
}
function testStep() {
  const body = $('#testBody');
  if (T.i >= T.list.length) return testDone();
  $('#testBar').style.width = (T.i / T.list.length * 100) + '%';
  $('#testLabel').textContent = `${T.i + 1} / ${T.list.length}`;
  const w = T.list[T.i];
  const mode = Math.random() < 0.5 ? 'en2ru' : 'ru2en';
  renderQuestion(body, makeQuestion(w, mode), ok => {
    bump(w, ok);
    if (ok) T.right++; else T.wrong.push(w);
    T.i++;
    testStep();
  });
}
function testDone() {
  const n = T.list.length;
  const pct = n ? Math.round(T.right / n * 100) : 0;
  $('#testBar').style.width = '100%';
  $('#testLabel').textContent = `${n} / ${n}`;
  $('#testBody').innerHTML = `<div class="pane"><div class="result">
      <div class="big">${pct}%</div>
      <p class="sub">${T.right} из ${n} верно</p>
      <div class="row" style="justify-content:center">
        ${T.wrong.length ? '<button class="btn" id="tRetry">Повторить ошибки</button>' : ''}
        <button class="btn ghost" id="tAgain">Новый тест</button>
        <button class="btn ghost" data-go="home">На главную</button>
      </div>
      ${T.wrong.length ? `<div class="mistakes">${T.wrong.map(w => `
        <div class="mistake"><b>${esc(w.en)}</b> <span class="muted">(${esc(w.tr)})</span> — ${esc(w.ru)} ${speakBtn(w.en)}</div>`).join('')}</div>` : ''}
    </div></div>`;
  const r = $('#tRetry');
  if (r) r.addEventListener('click', () => testStart(shuffle(T.wrong)));
  $('#tAgain').addEventListener('click', () => inits.test());
}

/* ==========================================================================
   РЕЖИМ «ВВОД С КЛАВИАТУРЫ»
   ========================================================================== */
let P = { list: [], i: 0, wrong: [], right: 0 };
inits.typing = function () {
  const p = pool();
  $('#typingBar').style.width = '0%';
  $('#typingLabel').textContent = '';
  if (!p.length) { $('#typingBody').innerHTML = emptyPool(); return; }
  $('#typingBody').innerHTML = lengthPicker('Ввод с клавиатуры',
    'Пиши английское слово по русскому переводу. Регистр и артикль не важны, а буквы — важны: опечатка не засчитывается.', p.length);
  bindLengthPicker($('#typingBody'), n => { P = { list: shuffle(p).slice(0, n), i: 0, wrong: [], right: 0 }; typingStep(); });
};
function typingStep() {
  const body = $('#typingBody');
  if (P.i >= P.list.length) return typingDone();
  $('#typingBar').style.width = (P.i / P.list.length * 100) + '%';
  $('#typingLabel').textContent = `${P.i + 1} / ${P.list.length}`;
  const w = P.list[P.i];
  renderQuestion(body, makeQuestion(w, 'type'), ok => {
    bump(w, ok);
    if (ok) P.right++; else P.wrong.push(w);
    P.i++;
    typingStep();
  });
}
function typingDone() {
  const n = P.list.length;
  const pct = n ? Math.round(P.right / n * 100) : 0;
  $('#typingBar').style.width = '100%';
  $('#typingBody').innerHTML = `<div class="pane"><div class="result">
      <div class="big">${pct}%</div>
      <p class="sub">${P.right} из ${n} написано верно</p>
      <div class="row" style="justify-content:center">
        ${P.wrong.length ? '<button class="btn" id="pRetry">Повторить ошибки</button>' : ''}
        <button class="btn ghost" id="pAgain">Ещё раз</button>
        <button class="btn ghost" data-go="home">На главную</button>
      </div>
      ${P.wrong.length ? `<div class="mistakes">${P.wrong.map(w => `
        <div class="mistake"><b>${esc(w.en)}</b> <span class="muted">(${esc(w.tr)})</span> — ${esc(w.ru)} ${speakBtn(w.en)}</div>`).join('')}</div>` : ''}
    </div></div>`;
  const r = $('#pRetry');
  if (r) r.addEventListener('click', () => { P = { list: shuffle(P.wrong), i: 0, wrong: [], right: 0 }; typingStep(); });
  $('#pAgain').addEventListener('click', () => inits.typing());
}

/* ==========================================================================
   РЕЖИМ «ПОДБОР ПАР»
   ========================================================================== */
const PAIRS = 6;
let M = { sel: null, left: 0, t0: 0, timer: null, busy: false };
function stopMatchTimer() { clearInterval(M.timer); M.timer = null; }
inits.match = function () {
  const p = pool();
  stopMatchTimer();
  M = { sel: null, left: 0, t0: 0, timer: null, busy: false };
  $('#matchTimer').textContent = '0.0 с';
  const bestKey = S.module + '/m' + PAIRS + '/' + S.filter;
  const best = S.match[bestKey];
  $('#matchBest').textContent = best ? `рекорд ${best.toFixed(1)} с` : '';
  if (p.length < 2) { $('#matchBody').innerHTML = emptyPool('слишком мало слов'); return; }

  const picked = shuffle(p).slice(0, Math.min(PAIRS, p.length));
  M.left = picked.length;
  const tiles = shuffle(picked.flatMap(w => ([
    { key: w.key, side: 'en', html: `${esc(w.en)}<span class="t">${esc(w.tr)}</span>` },
    { key: w.key, side: 'ru', html: esc(w.ru) }
  ])));
  $('#matchBody').innerHTML = `<div class="match-grid">${tiles.map((t, i) =>
    `<button class="match-tile" data-i="${i}" data-key="${esc(t.key)}" data-side="${t.side}">${t.html}</button>`).join('')}</div>`;

  $('#matchBody').querySelectorAll('.match-tile').forEach(el => el.addEventListener('click', () => matchClick(el)));
};
$('#matchRestart').addEventListener('click', () => { if (current === 'match') inits.match(); });
function matchClick(el) {
  if (M.busy || el.classList.contains('done')) return;
  if (!M.t0) {
    M.t0 = performance.now();
    M.timer = setInterval(() => {
      $('#matchTimer').textContent = ((performance.now() - M.t0) / 1000).toFixed(1) + ' с';
    }, 100);
  }
  if (M.sel === el) { el.classList.remove('sel'); M.sel = null; return; }
  if (!M.sel) { el.classList.add('sel'); M.sel = el; if (el.dataset.side === 'en') speakIfAuto(el); return; }

  const a = M.sel, b = el;
  if (a.dataset.key === b.dataset.key && a.dataset.side !== b.dataset.side) {
    a.classList.add('hit'); b.classList.add('hit');
    a.classList.remove('sel');
    M.sel = null;
    M.left--;
    const w = byKey(a.dataset.key);
    setTimeout(() => { a.classList.add('done'); b.classList.add('done'); }, 260);
    if (w) { const s = st(w); s.seen++; s.correct++; save(); }
    if (M.left === 0) matchDone();
  } else {
    M.busy = true;
    a.classList.remove('sel'); a.classList.add('miss'); b.classList.add('miss');
    setTimeout(() => { a.classList.remove('miss'); b.classList.remove('miss'); M.busy = false; }, 340);
    M.sel = null;
  }
}
function speakIfAuto(el) {
  if (!S.autoSpeak) return;
  const w = byKey(el.dataset.key);
  if (w) speak(w.en);
}
function matchDone() {
  stopMatchTimer();
  const secs = (performance.now() - M.t0) / 1000;
  $('#matchTimer').textContent = secs.toFixed(1) + ' с';
  const bestKey = S.module + '/m' + PAIRS + '/' + S.filter;
  const prev = S.match[bestKey];
  const record = !prev || secs < prev;
  if (record) { S.match[bestKey] = secs; save(); $('#matchBest').textContent = `рекорд ${secs.toFixed(1)} с`; }
  setTimeout(() => {
    $('#matchBody').innerHTML = `<div class="pane"><div class="result">
      <div class="big">${secs.toFixed(1)} с</div>
      <p class="sub">${record ? '🏆 Новый рекорд!' : `рекорд: ${prev.toFixed(1)} с`}</p>
      <div class="row" style="justify-content:center">
        <button class="btn" id="mAgain">Ещё раз</button>
        <button class="btn ghost" data-go="home">На главную</button>
      </div></div></div>`;
    $('#mAgain').addEventListener('click', () => inits.match());
  }, 420);
}

/* ==========================================================================
   СПИСОК СЛОВ
   ========================================================================== */
let listPos = 'все';
inits.list = function () {
  const kinds = ['все'].concat([...new Set(moduleWords(S.module).map(w => w.pos))]);
  if (kinds.indexOf(listPos) < 0) listPos = 'все';
  $('#listPos').innerHTML = kinds.map(k =>
    `<button data-pos="${esc(k)}" class="${k === listPos ? 'active' : ''}">${esc(k)}</button>`).join('');
  renderList();
};
$('#listPos').addEventListener('click', e => {
  const b = e.target.closest('button[data-pos]');
  if (!b) return;
  listPos = b.dataset.pos;
  inits.list();
});
$('#listSearch').addEventListener('input', renderList);
/* Без знака ударения: чтобы «хойзэр» находилось так же, как «хо́йзэр». */
const bare = s => String(s || '').toLowerCase().replace(/\u0301/g, '');
function renderList() {
  const raw = $('#listSearch').value.trim();
  const q = norm(raw);
  const qb = bare(raw);
  const rows = moduleWords(S.module).filter(w => {
    if (listPos !== 'все' && w.pos !== listPos) return false;
    if (!raw) return true;
    const hitEn = q && (loose(w.en).includes(loose(raw)) || loose(w.pl || '').includes(loose(raw)));
    const hitRu = qb && (bare(w.ru).includes(qb) || bare(w.tr).includes(qb) ||
      bare(w.plTr).includes(qb) || bare(w.note).includes(qb) || bare(w.forms).includes(qb));
    return !!(hitEn || hitRu);
  });
  $('#listBody').innerHTML = rows.length ? `<div class="wlist">${rows.map(w => {
    const s = st(w);
    return `<div class="wrow" data-key="${esc(w.key)}">
      <span class="stage-dot" data-s="${s.stage}" title="${s.stage >= 3 ? 'выучено' : s.seen ? 'учу' : 'новое'}"></span>
      <div>
        <div><span class="word">${esc(w.en)}</span> <span class="tr">${esc(w.tr)}</span></div>
        <div class="ru">${esc(w.ru)}${w.note ? ` · <span class="muted">${esc(w.note)}</span>` : ''}${
          S.module === ALL ? ` · <span class="muted">${esc(moduleName(w.module))}</span>` : ''}</div>
        ${isAddedWord(w) ? '<div class="pl">добавлено в приложении · ' + esc(w.pos) + '</div>' : ''}
        ${w.pl ? `<div class="pl">мн. ч.: ${esc(w.pl)} · ${esc(w.plTr || '')}</div>` : ''}
        ${w.forms ? `<div class="pl">формы: ${esc(w.forms)}</div>` : ''}
      </div>
      <div class="acts">
        ${speakBtn(w.en)}
        <button class="star ${s.star ? 'on' : ''}" data-star="${esc(w.key)}" title="Отметить как сложное">${s.star ? '⭐' : '☆'}</button>
        ${isAddedWord(w) ? `<button class="star del" data-del="${esc(w.key)}" title="Убрать слово, добавленное в приложении">✕</button>` : ''}
      </div>
    </div>`;
  }).join('')}</div>` : `<div class="empty"><span class="ico">🔍</span>Ничего не найдено</div>`;

  $('#listBody').querySelectorAll('[data-star]').forEach(b => b.addEventListener('click', () => {
    const s = st(byKey(b.dataset.star));
    s.star = !s.star; save(); renderList();
  }));
  $('#listBody').querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
    const w = byKey(b.dataset.del);
    if (!w || !confirm(`Убрать слово «${w.en}» из модуля «${moduleName(w.module)}»? Его прогресс тоже пропадёт.`)) return;
    removeAddedWord(w);
    renderList(); updateMini();
    toast('Слово убрано');
  }));
}

/* ==========================================================================
   ДОБАВИТЬ СЛОВА
   ========================================================================== */
let addTarget = 'new';
inits.add = function () {
  $('#addTarget').innerHTML =
    `<button data-t="new" class="${addTarget === 'new' ? 'active' : ''}">＋ Новый модуль</button>` +
    MODULES.map(m => `<button data-t="${esc(m.id)}" class="${addTarget === m.id ? 'active' : ''}">${esc(m.name)}</button>`).join('');
  $('#addName').style.display = addTarget === 'new' ? '' : 'none';
  $('#addName').previousElementSibling.style.display = addTarget === 'new' ? '' : 'none';
  if (!$('#addPos').options.length) {
    $('#addPos').innerHTML = '<option value="auto">определить автоматически</option>' +
      POS_ALL.map(p => `<option>${p}</option>`).join('');
  }
  if (!$('#addName').value) $('#addName').value = 'Мои слова ' + (MODULES.length + 1);
  $('#addOut').innerHTML = '';
  renderAddPreview();
  $('#addHint').innerHTML = addTarget === 'new'
    ? 'Слова попадут в новый модуль и сразу будут доступны во всех тренировках; глаголы — и в «Формы глагола».'
    : `Слова сразу попадут в «${esc(moduleName(addTarget))}» и будут доступны во всех
       тренировках. Хранятся они в браузере; чтобы вписать их в <code>words.js</code>
       насовсем, загляни в ⚙ Настройки.`;
};
$('#addTarget').addEventListener('click', e => {
  const b = e.target.closest('button[data-t]');
  if (!b) return;
  addTarget = b.dataset.t;
  inits.add();
});

const POS_ALL = ['сущ.', 'глаг.', 'прил.', 'нареч.', 'мест.', 'предл.', 'союз', 'част.', 'числ.', 'фраза'];
/* Часть речи важна не для красоты: по ней глаголы попадают в «Формы глагола»,
   а слова — в фильтры списка. По виду английского слова её можно угадать лишь
   примерно, поэтому на экране добавления есть и выбор руками. */
function guessPos(en) {
  const d = String(en || '').trim().toLowerCase();
  if (/^to\s+\S+$/.test(d)) return 'глаг.';
  if (/[\s.!?]/.test(d)) return 'фраза';
  if (/(ly)$/.test(d) && d.length > 4) return 'нареч.';
  if (/(tion|sion|ment|ness|ity|ship|ism|ance|ence|hood|dom|ure|age)$/.test(d)) return 'сущ.';
  if (/(ous|ful|less|able|ible|ive|ical|ish|ary)$/.test(d) && d.length > 5) return 'прил.';
  if (/(ize|ise|ify|ate|ect|ate|ude)$/.test(d)) return 'глаг.';
  return 'сущ.';
}
/* Строка: «source = источник». Слово слева, перевод справа; всё, что после
   вертикальной черты, — необязательное: транскрипция, множественное число
   и его транскрипция. Транскрипции нет — считаем черновик autoTr() и
   показываем его в предпросмотре, чтобы было что поправить до добавления. */
function parseAddLines(text) {
  const rows = [], bad = [];
  text.split('\n').map(l => l.trim()).filter(Boolean).forEach(line => {
    const eq = line.indexOf('=');
    if (eq < 0) { bad.push(line); return; }
    const en = line.slice(0, eq).trim();
    const [ru, tr, pl, plTr] = line.slice(eq + 1).split('|').map(x => x.trim());
    if (!en || !ru) { bad.push(line); return; }
    const chosen = $('#addPos') && $('#addPos').value;
    const edited = addTrEdits[en + '|' + ru];
    rows.push({
      en: en, ru: ru,
      tr: tr || edited || autoTr(en),
      trDraft: !tr && !edited,
      pos: chosen && chosen !== 'auto' ? chosen : guessPos(en),
      pl: pl || '', plTr: plTr || (pl ? autoTr(pl) : '')
    });
  });
  return { rows, bad };
}

/* Поправленные руками транскрипции переживают перерисовку предпросмотра:
   ключ — сама строка «слово|перевод», а не её номер. */
let addTrEdits = {};
let addPreviewTimer = null;
function renderAddPreview() {
  const box = $('#addPreview');
  const { rows, bad } = parseAddLines($('#addInput').value);
  if (!rows.length && !bad.length) { box.innerHTML = ''; return; }
  const draft = rows.some(r => r.trDraft);
  box.innerHTML =
    (rows.length ? `<div class="ap-head">Будет добавлено: <b>${rows.length}</b></div>` : '') +
    rows.map((r, i) => `<div class="ap-row">
        <span class="ap-en">${esc(r.en)}${r.pl
          ? `<span class="ap-pl">мн. ч.: ${esc(r.pl)}${r.plTr ? ' · ' + esc(r.plTr) : ''}</span>` : ''}</span>
        <input class="ap-tr${r.trDraft ? ' draft' : ''}" data-key="${esc(r.en + '|' + r.ru)}"
               value="${esc(r.tr)}" autocomplete="off" spellcheck="false"
               title="транскрипция — её можно поправить прямо здесь">
        <span class="ap-ru">${esc(r.ru)}</span>
        <span class="ap-pos">${esc(r.pos)}</span>
      </div>`).join('') +
    (draft ? `<p class="muted small ap-note">Подсвеченная транскрипция посчитана
       автоматически: ударение в ней стоит на первом гласном, так что её стоит
       проверить и поправить прямо здесь.</p>` : '') +
    (bad.length ? `<p class="small ap-bad">Не разобрано (нужен формат
       «source = источник»): ${bad.map(esc).join('; ')}</p>` : '');
  box.querySelectorAll('.ap-tr').forEach(inp => {
    inp.addEventListener('focus', () => { lastAddField = inp; });
    inp.addEventListener('input', () => {
      addTrEdits[inp.dataset.key] = inp.value;
      inp.classList.remove('draft');
    });
  });
}

$('#addBtn').addEventListener('click', () => {
  const { rows, bad } = parseAddLines($('#addInput').value);
  if (!rows.length) {
    $('#addOut').innerHTML = `<p class="small" style="color:var(--bad)">
      Не разобрано (нужен формат «source = источник»):
      ${bad.map(esc).join('; ') || 'пусто'}</p>`;
    return;
  }
  let targetId = addTarget;
  if (targetId === 'new') targetId = createOwnSet($('#addName').value).id;

  let added = 0, dup = 0;
  rows.forEach(r => {
    if (!r.tr) { bad.push(r.en + ' = ' + r.ru + ' (нет транскрипции)'); return; }
    const w = { en: r.en, tr: r.tr, ru: r.ru, pos: r.pos };
    if (r.pl) w.pl = r.pl;
    if (r.plTr) w.plTr = r.plTr;
    if (addWordToModule(targetId, w)) dup++; else added++;
  });

  const name = moduleName(targetId);
  addTarget = targetId;
  S.lastOwnSet = targetId;
  $('#addInput').value = '';
  addTrEdits = {};
  renderAddPreview();
  save();
  inits.add();
  $('#addOut').innerHTML = `<p class="small">
    Добавлено в «${esc(name)}»: <b>${added}</b>${dup ? `, уже было: ${dup}` : ''}${
      bad.length ? `. Не разобрано: ${bad.map(esc).join('; ')}` : ''}.
    ${added ? 'Слова уже доступны во всех тренировках.' : ''}</p>`;
  updateMini();
  toast(added ? `Добавлено слов: ${added}` : 'Новых слов нет');
});

$('#addInput').addEventListener('input', () => {
  clearTimeout(addPreviewTimer);
  addPreviewTimer = setTimeout(renderAddPreview, 150);
});
$('#addInput').addEventListener('focus', () => { lastAddField = $('#addInput'); });
$('#addPos').addEventListener('change', renderAddPreview);

/* Ударение ставится в то поле, где стояла каретка: это может быть и строка
   со словами, и поле транскрипции в предпросмотре. */
let lastAddField = null;
function insertStress() {
  const ta = lastAddField && document.contains(lastAddField) ? lastAddField : $('#addInput');
  const p = ta.selectionStart;
  ta.value = ta.value.slice(0, p) + '́' + ta.value.slice(ta.selectionEnd);
  ta.selectionStart = ta.selectionEnd = p + 1;
  ta.focus();
  if (ta.classList.contains('ap-tr')) {
    addTrEdits[ta.dataset.key] = ta.value;
    ta.classList.remove('draft');
  }
}
$('#addStressBtn').addEventListener('mousedown', e => e.preventDefault());
$('#addStressBtn').addEventListener('click', insertStress);

/* ==========================================================================
   НАСТРОЙКИ
   ========================================================================== */
function applyTheme() {
  const r = document.documentElement;
  if (S.theme === 'auto') r.removeAttribute('data-theme');
  else r.setAttribute('data-theme', S.theme);
}
$('#themeBtn').addEventListener('click', () => {
  S.theme = S.theme === 'auto' ? 'light' : (S.theme === 'light' ? 'dark' : 'auto');
  applyTheme(); save();
  toast('Тема: ' + ({ auto: 'как в системе', light: 'светлая', dark: 'тёмная' })[S.theme]);
  if (current === 'settings') inits.settings();
});
inits.settings = function () {
  const c = counts(WORDS);
  $('#settingsBody').innerHTML = `
    <div class="set-row">
      <div><div class="t">Тема</div><div class="d">Оформление приложения</div></div>
      <select id="setTheme">
        <option value="auto">как в системе</option>
        <option value="light">светлая</option>
        <option value="dark">тёмная</option>
      </select>
    </div>
    <div class="set-row">
      <div><div class="t">Скорость озвучки</div><div class="d">${enVoice ? 'Голос: ' + esc(enVoice.name) : 'Английский голос не найден'}</div></div>
      <div class="acts"><input type="range" id="setRate" min="0.5" max="1.2" step="0.05" value="${S.rate}">
      <button class="icon-btn" id="setTest" title="Проверить">🔊</button></div>
    </div>
    <div class="set-row">
      <div><div class="t">Озвучивать автоматически</div><div class="d">Проговаривать слово после ответа и на карточке</div></div>
      <label class="switch"><input type="checkbox" id="setAuto" ${S.autoSpeak ? 'checked' : ''}><span></span></label>
    </div>
    <div class="set-row">
      <div><div class="t">Транскрипция в вопросе</div><div class="d">Показывать транскрипцию рядом с английским словом</div></div>
      <label class="switch"><input type="checkbox" id="setTr" ${S.alwaysTr ? 'checked' : ''}><span></span></label>
    </div>
    ${MODULES.map(m => {
      const mc = counts(m.words);
      return `<div class="set-row">
        <div><div class="t">${esc(m.name)}${m.own ? ' <span class="badge">в браузере</span>' : ''}${
          m.ownCopy ? ' <span class="badge">копия в браузере</span>' : ''}${
          !m.own && extraOf(m.id).length ? ` <span class="badge">+${extraOf(m.id).length} в браузере</span>` : ''}</div>
        <div class="d">${mc.total} слов · выучено ${mc.known}, в работе ${mc.learning}, новых ${mc.fresh}</div></div>
        <div class="acts wrap">
          ${m.own ? `<button class="btn ghost small" data-export="${esc(m.id)}">Выгрузить в words.js</button>
                     <button class="btn ghost small danger" data-drop="${esc(m.id)}">Удалить</button>` : ''}
          ${m.ownCopy ? `<button class="btn ghost small danger"
            data-dropcopy="${esc(m.id)}">Убрать копию из браузера</button>` : ''}
          ${!m.own && extraOf(m.id).length ? `
            <button class="btn ghost small" data-extra="${esc(m.id)}">Выгрузить дописанные (${extraOf(m.id).length})</button>
            <button class="btn ghost small danger" data-dropextra="${esc(m.id)}">Убрать дописанные</button>` : ''}
          <button class="btn ghost small danger" data-reset="${esc(m.id)}">Сбросить прогресс</button>
        </div>
      </div>`;
    }).join('')}
    <div class="set-row">
      <div><div class="t">Новый модуль</div><div class="d">Загрузить очередную партию слов отдельным модулем</div></div>
      <button class="btn ghost" data-go="add">Добавить</button>
    </div>
    <div class="set-row">
      <div><div class="t">Весь прогресс</div><div class="d">По всем модулям: выучено ${c.known}, в работе ${c.learning}, новых ${c.fresh}</div></div>
      <button class="btn ghost danger" id="setReset">Сбросить всё</button>
    </div>
    <p class="muted small" style="margin-top:14px">Прогресс хранится только в этом браузере, на этом компьютере. У каждого модуля он свой.</p>`;

  $('#settingsBody').querySelectorAll('[data-export]').forEach(b =>
    b.addEventListener('click', () => exportOwnSet(b.dataset.export)));
  $('#settingsBody').querySelectorAll('[data-extra]').forEach(b =>
    b.addEventListener('click', () => exportExtras(b.dataset.extra)));
  $('#settingsBody').querySelectorAll('[data-dropextra]').forEach(b => b.addEventListener('click', () => {
    const m = moduleById(b.dataset.dropextra);
    const n = extraOf(b.dataset.dropextra).length;
    if (!m || !confirm(`Убрать ${n} слов, дописанных к модулю «${m.name}» в браузере? Их прогресс тоже пропадёт.`)) return;
    dropExtras(m.id);
    inits.settings(); updateMini();
    toast('Дописанные слова убраны');
  }));
  $('#settingsBody').querySelectorAll('[data-drop]').forEach(b => b.addEventListener('click', () => {
    const set = ownSetById(b.dataset.drop);
    if (!set) return;
    if (!confirm(`Удалить модуль «${set.name}» вместе с его ${set.words.length} словами и прогрессом? Отменить будет нельзя.`)) return;
    deleteOwnSet(set.id);
    inits.settings(); updateMini();
    toast('Модуль удалён');
  }));
  $('#settingsBody').querySelectorAll('[data-dropcopy]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.dropcopy;
    const set = ownSetById(id);
    const m = moduleById(id);
    if (!set || !m) return;
    const only = m.ownCopyOnly || 0;
    const tail = only
      ? `\nНо ${only} ${plural(only, 'слово есть', 'слова есть', 'слов есть')} только в этой копии` +
        ` — ${plural(only, 'оно пропадёт', 'они пропадут', 'они пропадут')}.`
      : '';
    if (!confirm(`Убрать копию модуля «${set.name}», оставшуюся в браузере?\n` +
      `Слова и прогресс останутся: они уже записаны в words.js.` + tail)) return;
    dropOwnCopy(id);
    inits.settings(); updateMini();
    toast('Копия из браузера убрана');
  }));
  $('#settingsBody').querySelectorAll('[data-reset]').forEach(b => b.addEventListener('click', () => {
    const m = moduleById(b.dataset.reset);
    if (!m || !confirm(`Сбросить прогресс модуля «${m.name}»? Отменить будет нельзя.`)) return;
    m.words.forEach(w => { delete S.w[w.key]; });
    delete S.learns[m.id];
    clearCards(m.id);
    Object.keys(S.match).forEach(k => { if (k.indexOf(m.id + '/') === 0) delete S.match[k]; });
    save(); updateMini(); inits.settings();
    toast('Прогресс модуля сброшен');
  }));

  $('#setTheme').value = S.theme;
  $('#setTheme').addEventListener('change', e => { S.theme = e.target.value; applyTheme(); save(); });
  $('#setRate').addEventListener('input', e => { S.rate = +e.target.value; save(); });
  $('#setTest').addEventListener('click', () => speak('Good morning. This is how the words will sound.'));
  $('#setAuto').addEventListener('change', e => { S.autoSpeak = e.target.checked; save(); });
  $('#setTr').addEventListener('change', e => { S.alwaysTr = e.target.checked; save(); });
  $('#setReset').addEventListener('click', () => {
    if (!confirm('Сбросить весь прогресс по всем словам? Отменить будет нельзя.')) return;
    S.w = {}; S.learns = {}; S.match = {}; S.cards = {};
    save(); updateMini(); inits.settings();
    toast('Прогресс сброшен');
  });
};


/* ==========================================================================
   ЧТЕНИЕ. Раздел ни от каких модулей со словами не зависит: свои тексты,
   свой словарь подсказок, своя отметка «прочитано».
   ========================================================================== */
const READ = window.READING || { gloss: {}, texts: [] };
const WORD_RE = /[A-Za-z]+(?:[-'\u2019][A-Za-z]+)*/g;
let readLevel = 'все', readTopic = 'все', openTextId = null;

function isRead(id) { return !!(S.read && S.read[id]); }
function setRead(id, on) {
  if (!S.read) S.read = {};
  if (on) S.read[id] = 1; else delete S.read[id];
  save();
}
function glossOf(word) { return READ.gloss[String(word).toLowerCase()] || ''; }

/* Оборачиваем каждое слово в span, а точку в конце — в отдельный span:
   по ним и работают подсказки. */
function markupWords(escaped) {
  return escaped.replace(WORD_RE, m => `<span class="w" data-w="${m.toLowerCase()}">${m}</span>`);
}
function sentenceHTML(t, i) {
  const de = t.s[i][0];
  const m = de.match(/[.!?…]+$/);
  const body = m ? de.slice(0, -m[0].length) : de;
  return `<span class="sent">${markupWords(esc(body))}` +
    (m ? `<span class="se" data-i="${i}" title="перевод предложения">${esc(m[0])}</span>` : '') +
    '</span> ';
}

/* ---------- всплывающая подсказка ---------- */
let tipTimer = null;
function showTip(target, html) {
  clearTimeout(tipTimer);
  const tip = $('#tip');
  tip.innerHTML = html;
  tip.hidden = false;
  const r = target.getBoundingClientRect();
  const w = tip.offsetWidth, h = tip.offsetHeight;
  let left = r.left + r.width / 2 - w / 2;
  left = Math.max(10, Math.min(left, window.innerWidth - w - 10));
  let top = r.bottom + window.scrollY + 8;
  if (r.bottom + h + 20 > window.innerHeight) top = r.top + window.scrollY - h - 8;
  tip.style.left = left + 'px';
  tip.style.top = top + 'px';
}
function hideTip() { clearTimeout(tipTimer); const t = $('#tip'); if (t) t.hidden = true; }
/* Прячем не сразу: иначе не успеть довести курсор до кнопок в подсказке. */
function hideTipSoon() { clearTimeout(tipTimer); tipTimer = setTimeout(hideTip, 260); }
$('#tip').addEventListener('mouseenter', () => clearTimeout(tipTimer));
$('#tip').addEventListener('mouseleave', hideTip);
window.addEventListener('scroll', hideTip, { passive: true });

/* ---------- список текстов ---------- */
inits.read = function () {
  hideTip();
  const levels = ['все'].concat([...new Set(READ.texts.map(t => t.level))]);
  const topics = ['все'].concat([...new Set(READ.texts.map(t => t.topic))]);
  if (levels.indexOf(readLevel) < 0) readLevel = 'все';
  if (topics.indexOf(readTopic) < 0) readTopic = 'все';
  $('#readLevel').innerHTML = levels.map(l =>
    `<button data-level="${esc(l)}" class="${l === readLevel ? 'active' : ''}">${esc(l)}</button>`).join('');
  $('#readTopic').innerHTML = topics.map(l =>
    `<button data-topic="${esc(l)}" class="${l === readTopic ? 'active' : ''}">${esc(l)}</button>`).join('');

  const list = READ.texts.filter(t =>
    (readLevel === 'все' || t.level === readLevel) &&
    (readTopic === 'все' || t.topic === readTopic));
  const done = READ.texts.filter(t => isRead(t.id)).length;
  $('#readCount').textContent = `прочитано ${done} из ${READ.texts.length}`;

  $('#readList').innerHTML = list.length ? `<div class="txt-list">${list.map(t => `
    <button class="txt-card ${isRead(t.id) ? 'done' : ''}" data-text="${esc(t.id)}">
      <span class="txt-head">
        <span class="txt-title">${esc(t.title)}</span>
        <span class="txt-level">${esc(t.level)}</span>
      </span>
      <span class="txt-ru">${esc(t.titleRu)}</span>
      <span class="txt-meta">${esc(t.topic)} · ${t.s.length} предложений${isRead(t.id) ? ' · ✓ прочитано' : ''}</span>
    </button>`).join('')}</div>`
    : '<div class="empty"><span class="ico">📚</span>Текстов с такими фильтрами нет</div>';

  $('#readList').querySelectorAll('[data-text]').forEach(b =>
    b.addEventListener('click', () => openText(b.dataset.text)));
};
$('#readLevel').addEventListener('click', e => {
  const b = e.target.closest('button[data-level]');
  if (b) { readLevel = b.dataset.level; inits.read(); }
});
$('#readTopic').addEventListener('click', e => {
  const b = e.target.closest('button[data-topic]');
  if (b) { readTopic = b.dataset.topic; inits.read(); }
});

/* ---------- сам текст ---------- */
function openText(id) {
  openTextId = id;
  go('text');
}
inits.text = function () {
  hideTip();
  const t = READ.texts.find(x => x.id === openTextId);
  if (!t) { go('read'); return; }
  $('#textTitle').textContent = t.title;
  $('#textTopic').textContent = `${t.level} · ${t.topic}`;
  $('#textBody').innerHTML = `<article class="reader">
      <h2 class="reader-title">${esc(t.title)}</h2>
      <p class="reader-ru">${esc(t.titleRu)}</p>
      <p class="reader-text" id="readerText">${t.s.map((_, i) => sentenceHTML(t, i)).join('')}</p>
      <p class="reader-hint">Наведи на слово — перевод, нажми — послушать.
         В подсказке есть кнопка <b>＋ в словарь</b>: слово попадёт в модуль и его
         можно будет учить во всех тренировках.
         Наведи на точку в конце предложения — перевод всего предложения и кнопка
         озвучки. Повторное нажатие останавливает чтение.</p>
      <div class="row">
        <button class="btn ghost" id="readSpeak">🔊 Слушать текст</button>
        <button class="btn ${isRead(t.id) ? 'ghost' : ''}" id="readDone">
          ${isRead(t.id) ? '✓ Прочитано' : 'Отметить прочитанным'}</button>
      </div>
      <div class="row">
        <button class="link-btn" id="readPrev">← предыдущий</button>
        <button class="link-btn" id="readNext">следующий →</button>
      </div>
    </article>`;

  const body = $('#textBody');
  const tipFor = el => {
    if (el.classList.contains('w')) {
      const form = el.textContent;
      const g = glossOf(el.dataset.w);
      const d = cardDraft(form, g);
      const known = WORDS.some(w => w.en.toLowerCase() === d.en.toLowerCase());
      return `<b>${esc(form)}</b>${g ? ' — ' + esc(g) : ' <span class="muted">— перевода нет</span>'}
        <span class="tip-actions">
          <button class="tip-btn" data-speak="${esc(form)}">🔊 послушать</button>
          <button class="tip-btn add" data-add="${esc(form)}">＋ в словарь</button>
        </span>
        <span class="tip-hint">${known ? `«${esc(d.en)}» уже есть в словаре`
          : 'нажми на слово — послушать, ещё раз — остановить'}</span>`;
    }
    const i = +el.dataset.i;
    return `<b>Перевод предложения</b><span class="tip-sent">${esc(t.s[i][1])}</span>
      <span class="tip-actions">
        <button class="tip-btn" data-speak="${esc(t.s[i][0])}">🔊 послушать</button>
      </span>
      <span class="tip-hint">нажми ещё раз — чтение остановится</span>`;
  };
  body.addEventListener('mouseover', e => {
    const el = e.target.closest('.w, .se');
    if (el) showTip(el, tipFor(el));
  });
  body.addEventListener('mouseout', e => {
    if (e.target.closest('.w, .se')) hideTipSoon();
  });
  body.addEventListener('click', e => {
    const el = e.target.closest('.w, .se');
    if (!el) return;
    showTip(el, tipFor(el));
    speak(el.classList.contains('w') ? el.textContent : t.s[+el.dataset.i][0]);
  });

  $('#readSpeak').addEventListener('click', () => {
    const btn = $('#readSpeak');
    const back = () => { btn.textContent = '🔊 Слушать текст'; };
    btn.textContent = speak(t.s.map(x => x[0]).join(' '), back) ? '⏹ Остановить' : '🔊 Слушать текст';
  });
  $('#readDone').addEventListener('click', () => {
    setRead(t.id, !isRead(t.id));
    inits.text();
    toast(isRead(t.id) ? 'Текст отмечен прочитанным' : 'Отметка снята');
  });
  const idx = READ.texts.indexOf(t);
  const jump = d => {
    const n = READ.texts[idx + d];
    if (n) openText(n.id); else toast(d > 0 ? 'Это последний текст' : 'Это первый текст');
  };
  $('#readPrev').addEventListener('click', () => jump(-1));
  $('#readNext').addEventListener('click', () => jump(1));
};


/* ---------- диалог «добавить слово в модуль» ---------- */
function closeModal() {
  $('#modal').hidden = true;
  $('#modalCard').innerHTML = '';
}
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });

function openAddWordModal(form) {
  const d = cardDraft(form, glossOf(form));
  const sets = MODULES;
  const last = sets.some(x => x.id === S.lastOwnSet) ? S.lastOwnSet : (sets[0] ? sets[0].id : 'new');
  const POS = ['сущ.', 'глаг.', 'прил.', 'нареч.', 'мест.', 'предл.', 'союз', 'част.', 'числ.', 'фраза'];

  $('#modalCard').innerHTML = `
    <h3 class="modal-title">Добавить слово в модуль</h3>
    <p class="muted small">Из текста: <b>${esc(form)}</b>. Проверь заготовку — транскрипция
       подставлена автоматически, ударение стоит по общему правилу.</p>
    <label class="field-label">Английское слово</label>
    <input class="text-input" id="awEn" value="${esc(d.en)}" autocomplete="off" spellcheck="false">
    <label class="field-label" style="margin-top:12px">Транскрипция</label>
    <input class="text-input" id="awTr" value="${esc(d.tr)}" autocomplete="off" spellcheck="false">
    <div class="uml-row">
      ${['а́','е́','и́','о́','у́','ы́','э́','ю́','я́'].map(c => `<button type="button" class="uml" data-ins="${c}">${c}</button>`).join('')}
      <span class="uml-hint">гласная с ударением</span>
    </div>
    <label class="field-label" style="margin-top:12px">Перевод</label>
    <input class="text-input" id="awRu" value="${esc(d.ru)}" autocomplete="off">
    <div class="modal-row">
      <div>
        <label class="field-label">Часть речи</label>
        <select id="awPos">${POS.map(p => `<option ${p === d.pos ? 'selected' : ''}>${p}</option>`).join('')}</select>
      </div>
      <div>
        <label class="field-label">Модуль</label>
        <select id="awSet">
          ${sets.map(x => `<option value="${esc(x.id)}" ${x.id === last ? 'selected' : ''}>${esc(x.name)} (${x.words.length})</option>`).join('')}
          <option value="new" ${last === 'new' ? 'selected' : ''}>＋ новый модуль…</option>
        </select>
      </div>
    </div>
    <div id="awNameBox" ${last === 'new' ? '' : 'hidden'}>
      <label class="field-label" style="margin-top:12px">Название нового модуля</label>
      <input class="text-input" id="awName" value="Слова из текстов" autocomplete="off">
    </div>
    <p class="muted small" style="margin-top:12px">Слово сразу появится во всех тренировках.
       Добавленное в приложении хранится в браузере — чтобы вписать его
       в <code>words.js</code> насовсем, загляни в ⚙ Настройки.</p>
    <div class="row end">
      <button class="btn ghost" id="awCancel">Отмена</button>
      <button class="btn" id="awOk">Добавить</button>
    </div>`;
  $('#modal').hidden = false;

  const setSel = $('#awSet');
  setSel.addEventListener('change', () => {
    $('#awNameBox').hidden = setSel.value !== 'new';
  });
  $('#modalCard').querySelectorAll('[data-ins]').forEach(b => b.addEventListener('click', () => {
    const inp = $('#awTr');
    const p = inp.selectionStart;
    inp.value = inp.value.slice(0, p) + b.dataset.ins + inp.value.slice(inp.selectionEnd);
    inp.selectionStart = inp.selectionEnd = p + b.dataset.ins.length;
    inp.focus();
  }));
  $('#awCancel').addEventListener('click', closeModal);
  $('#awOk').addEventListener('click', () => {
    const word = {
      de: $('#awEn').value.trim(),
      tr: $('#awTr').value.trim(),
      ru: $('#awRu').value.trim(),
      pos: $('#awPos').value
    };
    if (!word.en || !word.tr || !word.ru) { toast('Заполни слово, транскрипцию и перевод'); return; }
    let setId = setSel.value;
    if (setId === 'new') setId = createOwnSet($('#awName').value).id;
    const err = addWordToModule(setId, word);
    S.lastOwnSet = setId;
    save();
    closeModal();
    hideTip();
    const name = moduleName(setId);
    toast(err === 'уже есть' ? `«${word.en}» уже есть в модуле «${name}»`
                             : `«${word.en}» добавлено в «${name}»`);
  });
  setTimeout(() => $('#awEn').focus(), 40);
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-add]');
  if (b) { e.stopPropagation(); openAddWordModal(b.dataset.add); }
});


/* Свой модуль живёт в браузере. Эта кнопка превращает его в кусок кода,
   который можно вставить в words.js и хранить уже насовсем. */
function wordCode(w, pad) {
  const parts = [`en: ${JSON.stringify(w.en)}`, `tr: ${JSON.stringify(w.tr)}`,
                 `ru: ${JSON.stringify(w.ru)}`, `pos: ${JSON.stringify(w.pos || 'сущ.')}`];
  if (w.pl) parts.push(`pl: ${JSON.stringify(w.pl)}`);
  if (w.plTr) parts.push(`plTr: ${JSON.stringify(w.plTr)}`);
  if (w.note) parts.push(`note: ${JSON.stringify(w.note)}`);
  return pad + '{ ' + parts.join(', ') + ' },';
}
/* Слова, дописанные к модулю из файла: код для переноса в words.js. */
function exportExtras(id) {
  const m = moduleById(id);
  const list = extraOf(id);
  if (!m || !list.length) return;
  const code = list.map(w => wordCode(w, '  ')).join('\n');
  $('#modalCard').innerHTML = `
    <h3 class="modal-title">Дописанные слова модуля «${esc(m.name)}»</h3>
    <p class="muted small">Эти ${list.length} слов пока лежат в браузере. Чтобы они жили
       в файле, вставь строки в <code>words.js</code> внутрь модуля «${esc(m.name)}»,
       перед его закрывающей скобкой <code>]</code>. После этого их можно убрать
       из браузера кнопкой «Убрать дописанные» — дубля не будет.</p>
    <pre class="hint">${esc(code)}</pre>
    <div class="row end">
      <button class="btn ghost" id="exClose">Закрыть</button>
      <button class="btn" id="exCopy">Скопировать</button>
    </div>`;
  $('#modal').hidden = false;
  $('#exClose').addEventListener('click', closeModal);
  $('#exCopy').addEventListener('click', () => {
    navigator.clipboard.writeText(code).then(
      () => toast('Скопировано — вставь в words.js'),
      () => toast('Не удалось скопировать, выдели текст вручную'));
  });
}
function exportOwnSet(id) {
  const set = ownSetById(id);
  if (!set) return;
  const rows = set.words.map(w => wordCode(w, '    '));
  const code = '{\n  id: ' + JSON.stringify(set.id) + ',\n  name: ' + JSON.stringify(set.name) +
    ',\n  words: [\n' + rows.join('\n') + '\n  ]\n},';
  $('#modalCard').innerHTML = `
    <h3 class="modal-title">Модуль «${esc(set.name)}» — код для words.js</h3>
    <p class="muted small">Вставь этот блок в <code>words.js</code> перед самой последней
       скобкой <code>]</code> и обнови страницу. Прогресс сохранится: <code>id</code> тот же.
       После этого модуль из браузера можно удалить.</p>
    <pre class="hint">${esc(code)}</pre>
    <div class="row end">
      <button class="btn ghost" id="exClose">Закрыть</button>
      <button class="btn" id="exCopy">Скопировать</button>
    </div>`;
  $('#modal').hidden = false;
  $('#exClose').addEventListener('click', closeModal);
  $('#exCopy').addEventListener('click', () => {
    navigator.clipboard.writeText(code).then(
      () => toast('Скопировано — вставь в words.js'),
      () => toast('Не удалось скопировать, выдели текст вручную'));
  });
}

/* ==========================================================================
   КЛАВИАТУРА
   ========================================================================== */
document.addEventListener('keydown', e => {
  const typingInField = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
  if (e.altKey && (e.key === 'a' || e.key === 'ф') && document.activeElement.id === 'addInput') {
    e.preventDefault(); insertStress(); return;
  }
  if (e.key === 'Escape') {
    if (!$('#modal').hidden) { closeModal(); return; }
    if (typingInField) { document.activeElement.blur(); return; }
    if (current !== 'home') { go('home'); }
    return;
  }
  const body = { learn: '#learnBody', test: '#testBody', typing: '#typingBody' }[current];
  if (body) {
    const el = $(body);
    if (!el) return;
    if (/^[1-4]$/.test(e.key) && !typingInField && el._answer) { e.preventDefault(); el._answer(+e.key - 1); return; }
    if (e.key === 'Enter' && el._next) { e.preventDefault(); el._next(); return; }
    return;
  }
  if (current === 'cards' && !typingInField) {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flipCard(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); mark(true); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); mark(false); }
    else if (e.key === 's' || e.key === 'ы') { const w = C.list[C.i]; if (w) speak(w.en); }
  }
});

/* ==========================================================================
   СТАРТ
   ========================================================================== */
load();
applyTheme();
updateMini();
if (!WORDS.length) {
  document.querySelector('main').innerHTML =
    '<div class="empty"><span class="ico">📄</span>Файл words.js не загрузился или пуст.</div>';
} else {
  go('home');
}
