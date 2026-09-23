/* ==========================================================================
   Тренажёр немецких слов — движок.
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
    const words = (set.words || []).map(w =>
      Object.assign({}, w, { key: id + '::' + w.de + '|' + w.ru, module: id }));
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
const LS = 'de-ru-trainer/v1';
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
  rebuildModules();
  migrate();
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
  if (set.words.some(w => w.de === word.de && w.ru === word.ru)) return 'уже есть';
  set.words.push(word);
  save(); rebuildModules();
  return '';
}
function deleteOwnSet(id) {
  const set = ownSetById(id);
  if (!set) return;
  set.words.forEach(w => { delete S.w[id + '::' + w.de + '|' + w.ru]; });
  S.userSets = ownSets().filter(s => s.id !== id);
  delete S.learns[id];
  Object.keys(S.match).forEach(k => { if (k.indexOf(id + '/') === 0) delete S.match[k]; });
  if (S.module === id) S.module = MODULES[0] ? MODULES[0].id : ALL;
  save(); rebuildModules();
}

/* ---------- черновая транскрипция: те же правила, что в tools/pdf_to_words.py,
   но в стиле уже записанных слов: без оглушения на конце, ch → х ---------- */
const TR_VOWELS = 'aeiouäöüy';
const TR_J = { ja: 'я', je: 'е', jo: 'ё', ju: 'ю', ji: 'и', jä: 'е', jü: 'ю' };
const TR_SIMPLE = {
  a: 'а', e: 'э', i: 'и', o: 'о', u: 'у', ä: 'э', ö: 'ё', ü: 'ю', y: 'ю', ß: 'с',
  b: 'б', c: 'к', d: 'д', f: 'ф', g: 'г', h: 'х', j: 'й', k: 'к', l: 'л', m: 'м',
  n: 'н', p: 'п', q: 'к', r: 'р', t: 'т', v: 'ф', w: 'в', x: 'кс', z: 'ц',
  'é': 'е', 'è': 'е'
};
function autoTr(word) {
  const w = String(word || '').toLowerCase().trim();
  const out = [];
  let i = 0, start = true, seenVowel = false;
  while (i < w.length) {
    const three = w.slice(i, i + 3), two = w.slice(i, i + 2), ch = w[i];
    const next = w[i + 1] || '', prev = i ? w[i - 1] : '';
    if (three === 'sch') { out.push('ш'); i += 3; }
    else if (three === 'chs') { out.push('кс'); i += 3; }
    else if (two === 'ch') { out.push('х'); i += 2; }
    else if (two === 'ck') { out.push('к'); i += 2; }
    else if (two === 'tz') { out.push('ц'); i += 2; }
    else if (two === 'dt') { out.push('т'); i += 2; }
    else if (two === 'ei' || two === 'ai') { out.push('ай'); seenVowel = true; i += 2; }
    else if (two === 'ie') { out.push('и'); seenVowel = true; i += 2; }
    else if (two === 'eu' || two === 'äu') { out.push('ой'); seenVowel = true; i += 2; }
    else if (two === 'au') { out.push('ау'); seenVowel = true; i += 2; }
    else if (two === 'qu') { out.push('кв'); i += 2; }
    else if (two === 'ph') { out.push('ф'); i += 2; }
    else if (two === 'th') { out.push('т'); i += 2; }
    else if (two === 'ng') { out.push('нг'); i += 2; }
    else if (two === 'ss') { out.push('с'); i += 2; }
    else if (two[0] === two[1] && 'aeo'.indexOf(two[0]) >= 0) {
      out.push({ a: 'а', e: seenVowel ? 'э' : 'е', o: 'о' }[two[0]]); seenVowel = true; i += 2;
    }
    else if (two === 'st' && start) { out.push('шт'); i += 2; }
    else if (two === 'sp' && start) { out.push('шп'); i += 2; }
    else if (TR_J[two]) { out.push(TR_J[two]); seenVowel = true; i += 2; }
    else if (two === 'er' && i + 2 === w.length) { out.push('эр'); i += 2; }
    else if (two === 'en' && i + 2 === w.length) { out.push('эн'); i += 2; }
    else if (two === 'el' && i + 2 === w.length) { out.push('эль'); i += 2; }
    else if (ch === 'h' && prev && TR_VOWELS.indexOf(prev) >= 0) { i += 1; }
    else if (ch === next && TR_VOWELS.indexOf(ch) < 0) { i += 1; }
    else if (ch === 'e') {
      out.push(!seenVowel && 'лр'.indexOf(out[out.length - 1]) >= 0 ? 'е' : 'э');
      seenVowel = true; i += 1;
    }
    else if (ch === 's') { out.push(next && TR_VOWELS.indexOf(next) >= 0 ? 'з' : 'с'); i += 1; }
    else {
      out.push(TR_SIMPLE[ch] !== undefined ? TR_SIMPLE[ch] : ch);
      if (TR_VOWELS.indexOf(ch) >= 0) seenVowel = true;
      i += 1;
    }
    start = false;
  }
  return trStress(out.join(''), w);
}
const TR_PREFIX = ['be', 'ge', 'ver', 'er', 'ent', 'emp', 'zer'];
const TR_TAIL = ['ion', 'ität', 'ieren', 'ei', 'ie'];
function trStress(rus, orig) {
  const pos = [];
  for (let i = 0; i < rus.length; i++) if ('аеёиоуыэюя'.indexOf(rus[i]) >= 0) pos.push(i);
  if (pos.length < 2) return rus;
  let idx = 0;
  if (TR_PREFIX.some(p => orig.indexOf(p) === 0)) idx = 1;
  if (TR_TAIL.some(t => orig.slice(-t.length) === t)) idx = pos.length - 1;
  const at = pos[idx];
  if (rus[at] === 'ё') return rus;
  return rus.slice(0, at + 1) + '\u0301' + rus.slice(at + 1);
}

/* Из подсказки «кофе (der Kaffee)» делаем заготовку карточки: Kaffee — кофе. */
function cardDraft(form, gloss) {
  let de = form, ru = gloss || '';
  const m = (gloss || '').match(/\(([^)]+)\)/);
  if (m) {
    const inner = m[1].trim();
    let cand = null, mm;
    if ((mm = inner.match(/^(?:der|die|das)\s+([A-ZÄÖÜ][^\s,;]*)$/))) cand = mm[1];
    else if ((mm = inner.match(/(?:мн\.\s*ч\.\s*от|от)\s+([A-Za-zÄÖÜäöüß][^\s,;]*)/))) cand = mm[1];
    else if (/^[a-zäöüß]+n$/.test(inner)) cand = inner;
    else if ((mm = inner.match(/^([a-zäöüß]+n)\b/))) cand = mm[1];
    if (cand) de = cand;
    const head = (gloss || '').slice(0, m.index).trim().replace(/[;,]$/, '');
    if (head) ru = head;
  }
  let pos = 'сущ.';
  if (/^[a-zäöüß]+(en|ern|eln)$/.test(de)) pos = 'глаг.';
  else if (/^[a-zäöüß]/.test(de)) pos = 'прил.';
  return { de: de, ru: ru, pos: pos, tr: autoTr(de) };
}
/* Прогресс первой версии хранился без модулей: ключи вида «Haus|дом».
   Переносим их в первый модуль. Смотрим на форму самих данных, а не на
   номер версии: в старых записях его просто нет. */
function migrate() {
  const keys = Object.keys(S.w || {});
  const legacy = keys.filter(k => k.indexOf('::') < 0);
  if (!legacy.length && !('learn' in S)) return;
  const first = MODULES[0];
  const moved = {};
  keys.forEach(k => {
    if (k.indexOf('::') >= 0) { moved[k] = S.w[k]; return; }
    if (first && BY_KEY.has(first.id + '::' + k)) moved[first.id + '::' + k] = S.w[k];
  });
  S.w = moved;
  S.learns = {};
  S.match = {};
  delete S.learn;
  S.v = 2;
  save();
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
function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
/* Приведение ответа к сравнимому виду: регистр, знаки препинания и артикль
   не важны. Умляуты и ß НЕ трогаем — они должны быть написаны точно. */
function norm(s) {
  return String(s).toLowerCase()
    .replace(/[.,!?;:()]/g, ' ')
    .replace(/^\s*(der|die|das)\s+/, '')
    .replace(/\s+/g, ' ').trim();
}
/* «Слепое» сравнение, где ö = oe = o, ü = ue = u, ä = ae = a, ß = ss = s.
   Нужно, чтобы отличить ошибку именно в умляутах от любой другой. */
function loose(s) {
  return norm(s)
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 's')
    .replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/ue/g, 'u').replace(/ss/g, 's');
}
/* Какие «особые» буквы есть в правильном ответе — для подсказки. */
function umlautsOf(word) {
  return [...new Set((String(word).match(/[äöüßÄÖÜ]/g) || []).map(c => c.toLowerCase()))];
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
function accepts(w) {
  const out = new Set();
  const add = x => { const n = norm(x); if (n) out.add(n); };
  add(w.de);
  (w.accept || []).forEach(add);
  if (w.de.includes('|')) w.de.split('|').forEach(p => add(p));
  return [...out];
}
function checkTyped(input, w) {
  const t = norm(input);
  if (!t) return 'bad';
  const a = accepts(w);
  if (a.includes(t)) return 'ok';
  const lt = loose(t);
  if (a.some(x => loose(x) === lt)) return 'umlaut';   // отличие только в умляутах / ß
  if (a.some(x => x.length > 3 && lev(x, t) <= 1)) return 'near';
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
let deVoice = null, voiceWarned = false;
function pickVoice() {
  if (!('speechSynthesis' in window)) return;
  const all = speechSynthesis.getVoices() || [];
  const de = all.filter(v => /^de(-|_|$)/i.test(v.lang || ''));
  deVoice = de.find(v => /anna|helena|petra|markus|yannick|google/i.test(v.name)) || de[0] || null;
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
  if (!deVoice) pickVoice();
  if (!deVoice) {
    if (!voiceWarned) {
      voiceWarned = true;
      toast('Немецкий голос не установлен: Системные настройки → Универсальный доступ → Устный контент → Системный голос → Управление голосами → немецкий', 7000);
    }
    return false;
  }
  const clean = String(text).replace(/\s*\|\s*/g, ', ');
  if (speaking === clean) { stopSpeak(); return false; }
  stopSpeak();
  const u = new SpeechSynthesisUtterance(clean);
  u.voice = deVoice; u.lang = deVoice.lang; u.rate = S.rate || 0.85;
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

  const nv = verbsOfModule().length;
  $('#conjTile').disabled = !nv;
  $('#conjTileDesc').textContent = nv
    ? `${nv} ${plural(nv, 'глагол', 'глагола', 'глаголов')} · окончания по лицам`
    : 'в этом модуле нет глаголов';

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
  const ok = x => x.key !== w.key && x.de !== w.de && x.ru !== w.ru && !used.has(x[field]);
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
  const field = mode === 'de2ru' ? 'ru' : 'de';
  const promptField = mode === 'de2ru' ? 'de' : 'ru';
  return { w, kind: 'choice', mode, field, promptField, opts: shuffle([w].concat(distractors(w, field, 3))) };
}
function wordDetails(w) {
  const bits = [];
  if (w.pl) bits.push(`<span>мн. ч.: <b>${esc(w.pl)}</b> <span class="muted">${esc(w.plTr || '')}</span></span>`);
  if (w.forms) bits.push(`<span>формы: <b>${esc(w.forms)}</b></span>`);
  if (w.note) bits.push(`<span class="muted">${esc(w.note)}</span>`);
  return bits.length ? `<div class="q-extra">${bits.join('')}</div>` : '';
}
const KIND_TEXT = { de2ru: 'Как переводится?', ru2de: 'Как будет по-немецки?', type: 'Напиши по-немецки' };

/* Рисует вопрос в контейнер. onDone(ok) вызывается после ответа. */
function renderQuestion(container, q, onDone, extraHTML, showStage) {
  const w = q.w;
  let answered = false;
  const isDePrompt = q.kind === 'choice' && q.promptField === 'de';
  const promptText = q.kind === 'type' ? w.ru : w[q.promptField];
  const head =
    `<div class="q-kind">${KIND_TEXT[q.mode] || ''}</div>
     <div class="q-word">${esc(promptText)}${isDePrompt ? ' ' + speakBtn(w.de) : ''}</div>
     ${isDePrompt && S.alwaysTr ? `<div class="q-tr">${esc(w.tr)}</div>` : ''}`;

  if (q.kind === 'choice') {
    container.innerHTML = `<div class="pane">${head}
      <div class="options">${q.opts.map((o, i) => `
        <button class="option" data-i="${i}">
          <span class="num">${i + 1}</span>
          <span>${esc(o[q.field])}${q.field === 'de' ? `<span class="tr" style="display:block;font-size:13px">${esc(o.tr)}</span>` : ''}</span>
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
               spellcheck="false" placeholder="слово по-немецки" lang="de">
        <button class="btn" id="typeGo">Проверить</button>
      </div>
      <div class="uml-row">
        ${['ä','ö','ü','ß','Ä','Ö','Ü'].map(c => `<button type="button" class="uml" data-ch="${c}">${c}</button>`).join('')}
        <span class="uml-hint">умляуты и ß нужно писать точно</span>
      </div>
      <div class="row"><button class="link-btn" id="typeSkip">Не знаю, показать ответ</button></div>
      <div class="feedback" id="fb"></div>
      ${extraHTML || ''}
    </div>`;
    const input = container.querySelector('#typeIn');
    const submit = () => {
      if (answered) return;
      const res = checkTyped(input.value, w);
      if (res === 'umlaut') {
        input.classList.add('near');
        const u = umlautsOf(w.de);
        showFb('near', u.length
          ? `Не засчитано: умляуты и ß пишутся точно — «o» не заменяет «ö».
             В этом слове есть ${u.map(c => `<b>${esc(c)}</b>`).join(', ')}. Попробуй ещё раз.`
          : 'Не засчитано: в этом слове умляутов нет — проверь буквы и попробуй ещё раз.');
        input.focus();
        return;
      }
      if (res === 'near') {
        input.classList.add('near');
        showFb('near', `Почти! Опечатка — проверь написание и попробуй ещё раз.`);
        input.focus(); input.select();
        return;
      }
      answered = true;
      input.classList.add(res === 'ok' ? 'correct' : 'wrong');
      input.disabled = true;
      finish(res === 'ok');
    };
    container.querySelectorAll('.uml').forEach(b => b.addEventListener('click', () => {
      if (input.disabled) return;
      const p = input.selectionStart, q = input.selectionEnd;
      input.value = input.value.slice(0, p) + b.dataset.ch + input.value.slice(q);
      input.selectionStart = input.selectionEnd = p + 1;
      input.focus();
    }));
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
    const full = `<b>${esc(w.de)}</b> <span class="muted">(${esc(w.tr)})</span> — ${esc(w.ru)} ${speakBtn(w.de)}`;
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
    if (S.autoSpeak) speak(w.de);
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
  const mode = stage === 0 ? 'de2ru' : (stage === 1 ? 'ru2de' : 'type');
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
let C = { list: [], i: 0, flipped: false, marks: {} };
inits.cards = function () {
  C = { list: shuffle(pool()), i: 0, flipped: false, marks: {} };
  renderCard();
};
$('#cardsShuffle').addEventListener('click', () => {
  if (current !== 'cards') return;
  C.list = shuffle(C.list); C.i = 0; C.flipped = false; renderCard();
  toast('Перемешано');
});
function renderCard() {
  const body = $('#cardsBody');
  if (!C.list.length) { body.innerHTML = emptyPool(); $('#cardsLabel').textContent = ''; return; }
  if (C.i >= C.list.length) return cardsDone();

  const w = C.list[C.i];
  const dir = S.cardsDir === 'ru2de';
  $('#cardsBar').style.width = (C.i / C.list.length * 100) + '%';
  $('#cardsLabel').textContent = `${C.i + 1} / ${C.list.length}`;

  const front = dir
    ? `<div class="card-ru">${esc(w.ru)}</div>`
    : `<div class="card-word">${esc(w.de)} ${speakBtn(w.de)}</div>
       <div class="card-tr">${esc(w.tr)}</div>`;
  const back = dir
    ? `<div class="card-word">${esc(w.de)} ${speakBtn(w.de)}</div>
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
      <button class="link-btn" id="cDir">${dir ? '🇷🇺 → 🇩🇪  русский спереди' : '🇩🇪 → 🇷🇺  немецкий спереди'}</button>
      <button class="link-btn" id="cStar">${st(w).star ? '⭐ отмечено' : '☆ отметить как сложное'}</button>
    </div>
    <div class="dots">${C.list.map((x, i) =>
      `<span class="dot ${i === C.i ? 'now' : (C.marks[x.key] === 1 ? 'known' : C.marks[x.key] === 0 ? 'unknown' : '')}"></span>`).join('')}</div>`;

  $('#flip').addEventListener('click', flipCard);
  $('#cPrev').addEventListener('click', () => move(-1));
  $('#cNext').addEventListener('click', () => move(1));
  $('#cKnow').addEventListener('click', () => mark(true));
  $('#cDunno').addEventListener('click', () => mark(false));
  $('#cDir').addEventListener('click', () => {
    S.cardsDir = dir ? 'de2ru' : 'ru2de'; save(); C.flipped = false; renderCard();
  });
  $('#cStar').addEventListener('click', () => {
    const s = st(w); s.star = !s.star; save(); renderCard();
  });
  if (S.autoSpeak && !dir) speak(w.de);
}
function flipCard() {
  C.flipped = !C.flipped;
  const f = $('#flip');
  if (f) f.classList.toggle('flipped', C.flipped);
  if (C.flipped && S.autoSpeak && S.cardsDir === 'ru2de') speak(C.list[C.i].de);
}
function move(d) {
  C.i = Math.max(0, Math.min(C.list.length, C.i + d));
  C.flipped = false;
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
    C = { list: shuffle(bad), i: 0, flipped: false, marks: {} };
    renderCard();
  });
  $('#cAll').addEventListener('click', () => inits.cards());
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
    'Вопросы в обе стороны: с немецкого и на немецкий.', p.length);
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
  const mode = Math.random() < 0.5 ? 'de2ru' : 'ru2de';
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
        <div class="mistake"><b>${esc(w.de)}</b> <span class="muted">(${esc(w.tr)})</span> — ${esc(w.ru)} ${speakBtn(w.de)}</div>`).join('')}</div>` : ''}
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
    'Пиши немецкое слово по русскому переводу. Артикль писать не нужно, регистр не важен. А вот умляуты и ß — обязательны: «o» вместо «ö» не засчитается.', p.length);
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
        <div class="mistake"><b>${esc(w.de)}</b> <span class="muted">(${esc(w.tr)})</span> — ${esc(w.ru)} ${speakBtn(w.de)}</div>`).join('')}</div>` : ''}
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
    { key: w.key, side: 'de', html: `${esc(w.de)}<span class="t">${esc(w.tr)}</span>` },
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
  if (!M.sel) { el.classList.add('sel'); M.sel = el; if (el.dataset.side === 'de') speakIfAuto(el); return; }

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
  if (w) speak(w.de);
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
    const hitDe = q && (loose(w.de).includes(loose(raw)) || loose(w.pl || '').includes(loose(raw)));
    const hitRu = qb && (bare(w.ru).includes(qb) || bare(w.tr).includes(qb) ||
      bare(w.plTr).includes(qb) || bare(w.note).includes(qb) || bare(w.forms).includes(qb));
    return !!(hitDe || hitRu);
  });
  $('#listBody').innerHTML = rows.length ? `<div class="wlist">${rows.map(w => {
    const s = st(w);
    return `<div class="wrow" data-key="${esc(w.key)}">
      <span class="stage-dot" data-s="${s.stage}" title="${s.stage >= 3 ? 'выучено' : s.seen ? 'учу' : 'новое'}"></span>
      <div>
        <div><span class="de">${esc(w.de)}</span> <span class="tr">${esc(w.tr)}</span></div>
        <div class="ru">${esc(w.ru)}${w.note ? ` · <span class="muted">${esc(w.note)}</span>` : ''}${
          S.module === ALL ? ` · <span class="muted">${esc(moduleName(w.module))}</span>` : ''}</div>
        ${w.pl ? `<div class="pl">мн. ч.: ${esc(w.pl)} · ${esc(w.plTr || '')}</div>` : ''}
        ${w.forms ? `<div class="pl">формы: ${esc(w.forms)}</div>` : ''}
      </div>
      <div class="acts">
        ${speakBtn(w.de)}
        <button class="star ${s.star ? 'on' : ''}" data-star="${esc(w.key)}" title="Отметить как сложное">${s.star ? '⭐' : '☆'}</button>
      </div>
    </div>`;
  }).join('')}</div>` : `<div class="empty"><span class="ico">🔍</span>Ничего не найдено</div>`;

  $('#listBody').querySelectorAll('[data-star]').forEach(b => b.addEventListener('click', () => {
    const s = st(byKey(b.dataset.star));
    s.star = !s.star; save(); renderList();
  }));
}

/* ==========================================================================
   ДОБАВИТЬ СЛОВА
   ========================================================================== */
let addTarget = 'new';
inits.add = function () {
  $('#addTarget').innerHTML =
    `<button data-t="new" class="${addTarget === 'new' ? 'active' : ''}">＋ Новый модуль</button>` +
    MODULES.map(m => `<button data-t="${esc(m.id)}" class="${addTarget === m.id ? 'active' : ''}">${esc(m.name)}${m.own ? ' ·&nbsp;в&nbsp;браузере' : ''}</button>`).join('');
  $('#addName').style.display = addTarget === 'new' ? '' : 'none';
  $('#addName').previousElementSibling.style.display = addTarget === 'new' ? '' : 'none';
  if (!$('#addName').value) $('#addName').value = 'Набор ' + (MODULES.length + 1);
  $('#addOut').innerHTML = '';
};
$('#addTarget').addEventListener('click', e => {
  const b = e.target.closest('button[data-t]');
  if (!b) return;
  addTarget = b.dataset.t;
  inits.add();
});

function parseAddLines(text) {
  const rows = [], bad = [];
  text.split('\n').map(l => l.trim()).filter(Boolean).forEach(line => {
    const eq = line.indexOf('=');
    if (eq < 0) { bad.push(line); return; }
    const ru = line.slice(0, eq).trim();
    const [de, tr, pl, plTr] = line.slice(eq + 1).split('|').map(x => x.trim());
    if (!ru || !de || !tr) { bad.push(line); return; }
    const o = [`de: ${JSON.stringify(de)}`, `tr: ${JSON.stringify(tr)}`,
               `ru: ${JSON.stringify(ru)}`, `pos: "сущ."`];
    if (pl) o.push(`pl: ${JSON.stringify(pl)}`);
    if (plTr) o.push(`plTr: ${JSON.stringify(plTr)}`);
    rows.push(o);
    return;
  });
  return { rows, bad };
}

$('#addBtn').addEventListener('click', () => {
  const { rows, bad } = parseAddLines($('#addInput').value);

  /* Модуль из браузера можно наполнить прямо здесь — без правки файла. */
  const own = ownSetById(addTarget);
  if (own && rows.length) {
    let added = 0, dup = 0;
    rows.forEach(parts => {
      const w = {};
      parts.forEach(p => {
        const i = p.indexOf(': ');
        w[p.slice(0, i)] = JSON.parse(p.slice(i + 2));
      });
      if (addWordToOwnSet(own.id, w)) dup++; else added++;
    });
    $('#addInput').value = '';
    inits.add();
    $('#addOut').innerHTML = `<p class="small">Добавлено в «${esc(own.name)}»: <b>${added}</b>${
      dup ? `, уже было: ${dup}` : ''}${bad.length ? `. Не разобрано: ${bad.map(esc).join('; ')}` : ''}</p>`;
    updateMini();
    toast(`Добавлено слов: ${added}`);
    return;
  }

  let code = '', hint = '';
  if (rows.length) {
    if (addTarget === 'new') {
      const name = ($('#addName').value || ('Набор ' + (MODULES.length + 1))).trim();
      const id = 'm' + Date.now().toString(36);
      code = '{\n  id: ' + JSON.stringify(id) + ',\n  name: ' + JSON.stringify(name) +
        ',\n  words: [\n' + rows.map(o => '    { ' + o.join(', ') + ' },').join('\n') +
        '\n  ]\n},';
      hint = 'Это готовый модуль. Вставь его в <code>words.js</code> перед самой последней скобкой <code>]</code> — у модуля будет свой собственный прогресс.';
    } else {
      code = rows.map(o => '  { ' + o.join(', ') + ' },').join('\n');
      hint = 'Вставь эти строки в <code>words.js</code> внутрь модуля «' + esc(moduleName(addTarget)) +
        '», перед его закрывающей скобкой <code>]</code>. Модуль из браузера пополняется сразу, без кода.';
    }
  }
  $('#addOut').innerHTML = `
    ${bad.length ? `<p class="small" style="color:var(--bad)">Не разобрано (нужен формат «перевод = Wort | транскри́пция»): ${bad.map(esc).join('; ')}</p>` : ''}
    ${rows.length ? `<p class="small muted">${hint} Проверь <code>pos</code> — по умолчанию стоит «сущ.». После сохранения файла обнови страницу.</p>
    <pre class="hint" id="addCode">${esc(code)}</pre>
    <div class="row"><button class="btn" id="addCopy">Скопировать</button></div>` : ''}`;
  const c = $('#addCopy');
  if (c) c.addEventListener('click', () => {
    navigator.clipboard.writeText(code).then(
      () => toast('Скопировано — вставь в words.js'),
      () => toast('Не удалось скопировать, выдели текст вручную'));
  });
});

function insertStress() {
  const ta = $('#addInput');
  const p = ta.selectionStart;
  ta.value = ta.value.slice(0, p) + '́' + ta.value.slice(ta.selectionEnd);
  ta.selectionStart = ta.selectionEnd = p + 1;
  ta.focus();
}
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
      <div><div class="t">Скорость озвучки</div><div class="d">${deVoice ? 'Голос: ' + esc(deVoice.name) : 'Немецкий голос не найден'}</div></div>
      <div class="acts"><input type="range" id="setRate" min="0.5" max="1.2" step="0.05" value="${S.rate}">
      <button class="icon-btn" id="setTest" title="Проверить">🔊</button></div>
    </div>
    <div class="set-row">
      <div><div class="t">Озвучивать автоматически</div><div class="d">Проговаривать слово после ответа и на карточке</div></div>
      <label class="switch"><input type="checkbox" id="setAuto" ${S.autoSpeak ? 'checked' : ''}><span></span></label>
    </div>
    <div class="set-row">
      <div><div class="t">Транскрипция в вопросе</div><div class="d">Показывать транскрипцию рядом с немецким словом</div></div>
      <label class="switch"><input type="checkbox" id="setTr" ${S.alwaysTr ? 'checked' : ''}><span></span></label>
    </div>
    ${MODULES.map(m => {
      const mc = counts(m.words);
      return `<div class="set-row">
        <div><div class="t">${esc(m.name)}${m.own ? ' <span class="badge">в браузере</span>' : ''}</div>
        <div class="d">${mc.total} слов · выучено ${mc.known}, в работе ${mc.learning}, новых ${mc.fresh}</div></div>
        <div class="acts wrap">
          ${m.own ? `<button class="btn ghost small" data-export="${esc(m.id)}">Выгрузить в words.js</button>
                     <button class="btn ghost small danger" data-drop="${esc(m.id)}">Удалить</button>` : ''}
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
  $('#settingsBody').querySelectorAll('[data-drop]').forEach(b => b.addEventListener('click', () => {
    const set = ownSetById(b.dataset.drop);
    if (!set) return;
    if (!confirm(`Удалить модуль «${set.name}» вместе с его ${set.words.length} словами и прогрессом? Отменить будет нельзя.`)) return;
    deleteOwnSet(set.id);
    inits.settings(); updateMini();
    toast('Модуль удалён');
  }));
  $('#settingsBody').querySelectorAll('[data-reset]').forEach(b => b.addEventListener('click', () => {
    const m = moduleById(b.dataset.reset);
    if (!m || !confirm(`Сбросить прогресс модуля «${m.name}»? Отменить будет нельзя.`)) return;
    m.words.forEach(w => { delete S.w[w.key]; });
    delete S.learns[m.id];
    Object.keys(S.match).forEach(k => { if (k.indexOf(m.id + '/') === 0) delete S.match[k]; });
    save(); updateMini(); inits.settings();
    toast('Прогресс модуля сброшен');
  }));

  $('#setTheme').value = S.theme;
  $('#setTheme').addEventListener('change', e => { S.theme = e.target.value; applyTheme(); save(); });
  $('#setRate').addEventListener('input', e => { S.rate = +e.target.value; save(); });
  $('#setTest').addEventListener('click', () => speak('Guten Tag, das ist die Straße'));
  $('#setAuto').addEventListener('change', e => { S.autoSpeak = e.target.checked; save(); });
  $('#setTr').addEventListener('change', e => { S.alwaysTr = e.target.checked; save(); });
  $('#setReset').addEventListener('click', () => {
    if (!confirm('Сбросить весь прогресс по всем словам? Отменить будет нельзя.')) return;
    S.w = {}; S.learns = {}; S.match = {};
    save(); updateMini(); inits.settings();
    toast('Прогресс сброшен');
  });
};


/* ==========================================================================
   СПРЯЖЕНИЕ ГЛАГОЛОВ (Präsens)
   ========================================================================== */
/* er/sie/es и wir/sie/Sie дают одну и ту же форму, поэтому идут одной строкой.
   ruIdx — какие элементы ruConj собрать в перевод этой строки. */
const PRONOUNS = [
  { key: 'ich', de: 'Ich',         ru: 'я',              ruIdx: [0] },
  { key: 'du',  de: 'Du',          ru: 'ты',             ruIdx: [1] },
  { key: 'er',  de: 'Er/sie/es',   ru: 'он, она, оно',   ruIdx: [2] },
  { key: 'wir', de: 'Wir/sie/Sie', ru: 'мы, они, Вы',    ruIdx: [3, 5] },
  { key: 'ihr', de: 'Ihr',         ru: 'вы',             ruIdx: [4] }
];

/* Полностью неправильные — таблицей целиком. */
const IRREGULAR = {
  'sein':   { ich: 'bin',   du: 'bist',   er: 'ist',   wir: 'sind',   ihr: 'seid',  sie: 'sind' },
  'haben':  { ich: 'habe',  du: 'hast',   er: 'hat',   wir: 'haben',  ihr: 'habt',  sie: 'haben' },
  'werden': { ich: 'werde', du: 'wirst',  er: 'wird',  wir: 'werden', ihr: 'werdet', sie: 'werden' },
  'wissen': { ich: 'weiß',  du: 'weißt',  er: 'weiß',  wir: 'wissen', ihr: 'wisst', sie: 'wissen' },
  'können': { ich: 'kann',  du: 'kannst', er: 'kann',  wir: 'können', ihr: 'könnt', sie: 'können' },
  'müssen': { ich: 'muss',  du: 'musst',  er: 'muss',  wir: 'müssen', ihr: 'müsst', sie: 'müssen' },
  'wollen': { ich: 'will',  du: 'willst', er: 'will',  wir: 'wollen', ihr: 'wollt', sie: 'wollen' },
  'sollen': { ich: 'soll',  du: 'sollst', er: 'soll',  wir: 'sollen', ihr: 'sollt', sie: 'sollen' },
  'dürfen': { ich: 'darf',  du: 'darfst', er: 'darf',  wir: 'dürfen', ihr: 'dürft', sie: 'dürfen' },
  'mögen':  { ich: 'mag',   du: 'magst',  er: 'mag',   wir: 'mögen',  ihr: 'mögt',  sie: 'mögen' },
  'tun':    { ich: 'tue',   du: 'tust',   er: 'tut',   wir: 'tun',    ihr: 'tut',   sie: 'tun' }
};

/* Меняется гласная в основе — только du и er: [du, er, подсказка]. */
const STEM_CHANGE = {
  'sehen': ['siehst', 'sieht', 'e → ie'],       'lesen': ['liest', 'liest', 'e → ie'],
  'empfehlen': ['empfiehlst', 'empfiehlt', 'e → ie'],
  'sprechen': ['sprichst', 'spricht', 'e → i'], 'essen': ['isst', 'isst', 'e → i'],
  'geben': ['gibst', 'gibt', 'e → i'],          'helfen': ['hilfst', 'hilft', 'e → i'],
  'nehmen': ['nimmst', 'nimmt', 'e → i'],       'treffen': ['triffst', 'trifft', 'e → i'],
  'werfen': ['wirfst', 'wirft', 'e → i'],       'vergessen': ['vergisst', 'vergisst', 'e → i'],
  'brechen': ['brichst', 'bricht', 'e → i'],    'sterben': ['stirbst', 'stirbt', 'e → i'],
  'fahren': ['fährst', 'fährt', 'a → ä'],       'fallen': ['fällst', 'fällt', 'a → ä'],
  'halten': ['hältst', 'hält', 'a → ä'],        'lassen': ['lässt', 'lässt', 'a → ä'],
  'schlafen': ['schläfst', 'schläft', 'a → ä'], 'tragen': ['trägst', 'trägt', 'a → ä'],
  'waschen': ['wäschst', 'wäscht', 'a → ä'],    'wachsen': ['wächst', 'wächst', 'a → ä'],
  'schlagen': ['schlägst', 'schlägt', 'a → ä'], 'fangen': ['fängst', 'fängt', 'a → ä'],
  'raten': ['rätst', 'rät', 'a → ä'],           'braten': ['brätst', 'brät', 'a → ä'],
  'laufen': ['läufst', 'läuft', 'au → äu'],     'saufen': ['säufst', 'säuft', 'au → äu'],
  'stoßen': ['stößt', 'stößt', 'o → ö']
};

/* Нужна ли соединительная «e»: arbeiten → du arbeitest, но wohnen → du wohnst. */
function needsLinkE(stem) {
  if (/[dt]$/.test(stem)) return true;
  const m = stem.match(/(.)[mn]$/);
  if (!m) return false;
  const c = m[1];
  if ('lrmn'.indexOf(c) >= 0) return false;
  if (/[aeiouäöüy]/.test(c)) return false;
  if (c === 'h') return !/[aeiouäöüy]/.test(stem.slice(-3, -2));  // wohnen ≠ rechnen
  return true;
}

/* Формы настоящего времени. w — слово из словаря либо строка-инфинитив. */
function conjugate(w) {
  const inf = String(typeof w === 'string' ? w : w.de).trim();
  const low = inf.toLowerCase();
  let forms, meta;
  if (/eln$/.test(low)) {
    const stem = inf.slice(0, -1);                                  // sammeln → sammel
    forms = { ich: stem.slice(0, -2) + 'le', du: stem + 'st', er: stem + 't',
              wir: inf, ihr: stem + 't', sie: inf };                // ich sammle
    meta = { kind: 'eln', stem: stem, linkE: false, sibilant: false };
  } else if (/ern$/.test(low)) {
    const stem = inf.slice(0, -1);                                  // wandern → wander
    forms = { ich: stem + 'e', du: stem + 'st', er: stem + 't',
              wir: inf, ihr: stem + 't', sie: inf };
    meta = { kind: 'ern', stem: stem, linkE: false, sibilant: false };
  } else {
    const stem = /en$/.test(low) ? inf.slice(0, -2) : inf.slice(0, -1);
    const e = needsLinkE(stem.toLowerCase());
    const sibilant = /[sßxz]$/.test(stem.toLowerCase());
    forms = {
      ich: stem + 'e',
      du:  stem + (e ? 'est' : sibilant ? 't' : 'st'),
      er:  stem + (e ? 'et' : 't'),
      wir: inf,
      ihr: stem + (e ? 'et' : 't'),
      sie: inf
    };
    meta = { kind: 'plain', stem: stem, linkE: e, sibilant: sibilant };
  }
  let hint = '';
  const sc = STEM_CHANGE[low];
  if (sc) { forms.du = sc[0]; forms.er = sc[1]; hint = sc[2]; }
  meta.change = hint;
  meta.irregular = !!IRREGULAR[low];
  if (IRREGULAR[low]) { forms = Object.assign(forms, IRREGULAR[low]); hint = 'особая форма'; }
  if (w && w.conj) forms = Object.assign(forms, w.conj);
  meta.inf = inf;
  return { forms: forms, hint: hint, meta: meta };
}

const PERSON_NAME = {
  ich: '1-е лицо, единственное число',
  du:  '2-е лицо, единственное число',
  er:  '3-е лицо, ед. ч. — er, sie, es',
  wir: '1-е и 3-е лицо мн. ч. и вежливое «Sie»',
  ihr: '2-е лицо, множественное число',
  sie: '3-е лицо мн. ч. и вежливое «Sie»'
};

/* Объяснение: почему у этого лица именно такая форма. */
function conjRule(w, key) {
  const c = conjugate(w);
  const m = c.meta, form = c.forms[key], stem = esc(m.stem), inf = esc(m.inf);
  const B = x => `<b>${esc(x)}</b>`;
  const out = [`${B(PERSON_NAME[key])}`];

  if (m.irregular) {
    out.push(`${B(m.inf)} — неправильный глагол: формы не выводятся по правилу,
      их запоминают целиком. Здесь — ${B(form)}.`);
    return out.join('<br>');
  }
  if (key === 'wir' || key === 'sie') {
    out.push(`У ${B('wir')}, ${B('sie')} и вежливого ${B('Sie')} форма одна и та же и
      совпадает с инфинитивом — окончание ${B('-en')} не меняется: ${B(form)}.`);
    if (m.change) out.push(`Чередование ${B(m.change)} бывает только у du и er.`);
    return out.join('<br>');
  }
  if (key === 'ich') {
    if (m.kind === 'eln') {
      out.push(`У глаголов на ${B('-eln')} в форме ich выпадает «e» перед l:
        ${inf} → ${B(form)}.`);
    } else {
      out.push(`К основе ${B(m.stem)} прибавляется окончание ${B('-e')} → ${B(form)}.`);
    }
    if (m.change) out.push(`Чередование ${B(m.change)} у ich не происходит — основа обычная.`);
    return out.join('<br>');
  }
  if (key === 'du') {
    if (m.sibilant) {
      out.push(`Основа ${B(m.stem)} оканчивается на ${B('-s / -ß / -z')}, поэтому
        у du окончание только ${B('-t')}, а не -st.`);
    } else if (m.linkE) {
      out.push(`Основа ${B(m.stem)} оканчивается на ${B('-t / -d')} (или согласную + m/n),
        поэтому перед окончанием вставляется соединительное ${B('-e-')}: ${B('-est')}.`);
    } else {
      out.push(`К основе ${B(m.stem)} прибавляется окончание ${B('-st')}.`);
    }
    if (m.change) out.push(`Плюс у du и er меняется корневая гласная: ${B(m.change)} → ${B(form)}.`);
    return out.join('<br>');
  }
  if (key === 'er') {
    out.push(m.linkE
      ? `Основа ${B(m.stem)} оканчивается на ${B('-t / -d')}, поэтому окончание ${B('-et')}.`
      : `К основе ${B(m.stem)} прибавляется окончание ${B('-t')}.`);
    if (m.change) out.push(`Плюс у du и er меняется корневая гласная: ${B(m.change)} → ${B(form)}.`);
    return out.join('<br>');
  }
  // ihr
  out.push(m.linkE
    ? `Основа ${B(m.stem)} оканчивается на ${B('-t / -d')}, поэтому окончание ${B('-et')}.`
    : `К основе ${B(m.stem)} прибавляется окончание ${B('-t')}.`);
  if (m.change) {
    out.push(`Важно: чередование ${B(m.change)} у ihr ${B('не происходит')} —
      ${B(form)}, а не как у du и er.`);
  }
  return out.join('<br>');
}

function verbsOfModule() {
  return moduleWords(S.module).filter(w => w.pos === 'глаг.');
}
function plural(n, one, few, many) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}

let CJ = { rows: [], module: null };
inits.conj = function () {
  const verbs = verbsOfModule();
  if (!verbs.length) {
    conjButtons(false);
    $('#conjScore').textContent = '0 / 0';
    $('#conjBody').innerHTML = `<div class="empty"><span class="ico">🔤</span>
      В модуле «${esc(moduleName(S.module))}» нет глаголов.<br>
      Добавь их с пометкой <code>pos: "глаг."</code> — и здесь появится спряжение.<br>
      <button class="link-btn" data-go="home">На главную</button></div>`;
    return;
  }
  conjButtons(true);
  /* Возвращаемся в режим — упражнение и ответы остаются как были. */
  if (CJ.module === S.module && CJ.rows.length) { conjRender(); return; }
  conjStart(verbs);
};
function conjButtons(on) {
  ['#conjCheck', '#conjShow', '#conjReset'].forEach(sel => { $(sel).style.display = on ? '' : 'none'; });
}
function conjStart(verbs) {
  CJ = { rows: [], module: S.module };
  verbs.forEach(w => {
    const c = conjugate(w);
    PRONOUNS.forEach(p => {
      const ru = (w.ruConj || []).length
        ? p.ruIdx.map(i => w.ruConj[i]).filter(Boolean).join(' · ')
        : '';
      CJ.rows.push({
        w: w, p: p, answer: c.forms[p.key], hint: c.hint, state: '',
        ru: ru || `${p.ru} — ${w.ru}`
      });
    });
    /* Страховка: если в словаре руками задали разные формы для wir и sie,
       объединять их нельзя — показываем sie/Sie отдельной строкой. */
    if (c.forms.wir !== c.forms.sie) {
      const p = { key: 'sie', de: 'Sie', ru: 'они, Вы', ruIdx: [5] };
      CJ.rows.push({
        w: w, p: p, answer: c.forms.sie, hint: c.hint, state: '',
        ru: (w.ruConj && w.ruConj[5]) || `${p.ru} — ${w.ru}`
      });
    }
  });
  conjRender();
}
function conjRender() {
  let n = 0, html = '', lastVerb = null;
  CJ.rows.forEach((r, i) => {
    if (r.w.key !== lastVerb) {
      if (lastVerb !== null) html += '</div>';
      lastVerb = r.w.key;
      const c = conjugate(r.w);
      html += `<div class="conj-block">
        <div class="conj-head">
          <b>${esc(r.w.de)}</b> <span class="muted">${esc(r.w.tr)} — ${esc(r.w.ru)}</span>
          ${speakBtn(r.w.de)}
          ${c.hint ? `<span class="conj-flag">основа: ${esc(c.hint)}</span>` : ''}
        </div>`;
    }
    n++;
    const done = r.state === 'ok' || r.state === 'shown';
    html += `<div class="crow ${r.state}" data-i="${i}">
      <span class="c-n">${n}.</span>
      <div class="c-main">
        <div class="c-sent">${esc(r.p.de)}
          <input class="c-in" data-i="${i}" type="text" autocomplete="off" autocorrect="off"
                 autocapitalize="off" spellcheck="false" lang="de"
                 value="${esc(r.typed || '')}" ${done ? 'disabled' : ''}>
          ${r.w.ex ? esc(r.w.ex) + '.' : '.'}
          <span class="c-inf">(${esc(r.w.de)})</span>
        </div>
        <div class="c-sub">
          <span class="c-ru">${esc(r.ru)}</span>
          <details class="c-rule">
            <summary>правило</summary>
            <div class="c-rule-body">${conjRule(r.w, r.p.key)}</div>
          </details>
        </div>
      </div>
      <span class="c-note">${conjNote(r)}</span>
    </div>`;
  });
  if (lastVerb !== null) html += '</div>';
  $('#conjBody').innerHTML = html;
  conjScore();

  $('#conjBody').querySelectorAll('.c-in').forEach(inp => {
    inp.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      conjCheckRow(+inp.dataset.i);
      const all = [...$('#conjBody').querySelectorAll('.c-in:not([disabled])')];
      const next = all.find(x => +x.dataset.i > +inp.dataset.i);
      if (next) next.focus();
    });
    inp.addEventListener('blur', () => {
      CJ.rows[+inp.dataset.i].typed = inp.value;
      if (inp.value.trim()) conjCheckRow(+inp.dataset.i);
    });
  });
}
function conjNote(r) {
  if (r.state === 'ok') return '✓';
  if (r.state === 'shown') return `<span class="muted">${esc(r.answer)}</span>`;
  if (r.state === 'bad') return `<span class="bad-text">✗ ${esc(r.answer)}</span>`;
  if (r.state === 'umlaut') return `<span class="bad-text">✗ ${esc(r.answer)}<br><small>умляут</small></span>`;
  return '';
}
function conjCheckRow(i, reveal) {
  const r = CJ.rows[i];
  if (!r || r.state === 'ok' || r.state === 'shown') return;
  const el = $(`.crow[data-i="${i}"]`);
  const inp = el ? el.querySelector('.c-in') : null;
  const typed = inp ? inp.value : (r.typed || '');
  r.typed = typed;
  if (reveal) { r.state = 'shown'; r.typed = r.answer; }
  else if (!typed.trim()) return;
  else if (norm(typed) === norm(r.answer)) r.state = 'ok';
  else if (loose(typed) === loose(r.answer)) r.state = 'umlaut';
  else r.state = 'bad';
  conjRefreshRow(i);
  conjScore();
}
function conjRefreshRow(i) {
  const r = CJ.rows[i];
  const el = $(`.crow[data-i="${i}"]`);
  if (!el) return;
  el.className = 'crow ' + r.state;
  el.querySelector('.c-note').innerHTML = conjNote(r);
  const inp = el.querySelector('.c-in');
  inp.value = r.typed || '';
  if (r.state === 'ok' || r.state === 'shown') inp.disabled = true;
}
function conjScore() {
  const ok = CJ.rows.filter(r => r.state === 'ok').length;
  $('#conjScore').textContent = `${ok} / ${CJ.rows.length}`;
}
$('#conjCheck').addEventListener('click', () => {
  CJ.rows.forEach((r, i) => conjCheckRow(i));
  const bad = CJ.rows.filter(r => r.state === 'bad' || r.state === 'umlaut').length;
  const empty = CJ.rows.filter(r => !r.state).length;
  toast(bad || empty
    ? `Ошибок: ${bad}${empty ? `, не заполнено: ${empty}` : ''}`
    : 'Всё верно! 🎉');
});
$('#conjShow').addEventListener('click', () => {
  CJ.rows.forEach((r, i) => conjCheckRow(i, true));
});
$('#conjReset').addEventListener('click', () => {
  CJ.rows.forEach(r => { r.state = ''; r.typed = ''; });
  conjRender();
});


/* ==========================================================================
   ЧТЕНИЕ. Раздел ни от каких модулей со словами не зависит: свои тексты,
   свой словарь подсказок, своя отметка «прочитано».
   ========================================================================== */
const READ = window.READING || { gloss: {}, texts: [] };
const WORD_RE = /[A-Za-zÄÖÜäöüßéÉ]+(?:-[A-Za-zÄÖÜäöüßéÉ]+)*/g;
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
      const known = WORDS.some(w => w.de.toLowerCase() === d.de.toLowerCase());
      return `<b>${esc(form)}</b>${g ? ' — ' + esc(g) : ' <span class="muted">— перевода нет</span>'}
        <span class="tip-actions">
          <button class="tip-btn" data-speak="${esc(form)}">🔊 послушать</button>
          <button class="tip-btn add" data-add="${esc(form)}">＋ в словарь</button>
        </span>
        <span class="tip-hint">${known ? `«${esc(d.de)}» уже есть в словаре`
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
  const sets = ownSets();
  const last = sets.some(x => x.id === S.lastOwnSet) ? S.lastOwnSet : (sets[0] ? sets[0].id : 'new');
  const POS = ['сущ.', 'глаг.', 'прил.', 'нареч.', 'мест.', 'предл.', 'част.', 'числ.', 'фраза'];

  $('#modalCard').innerHTML = `
    <h3 class="modal-title">Добавить слово в модуль</h3>
    <p class="muted small">Из текста: <b>${esc(form)}</b>. Проверь заготовку — транскрипция
       подставлена автоматически, ударение стоит по общему правилу.</p>
    <label class="field-label">Немецкое слово</label>
    <input class="text-input" id="awDe" value="${esc(d.de)}" autocomplete="off" spellcheck="false">
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
    <p class="muted small" style="margin-top:12px">Такой модуль хранится в браузере и сразу
       доступен во всех тренировках. Чтобы сохранить его насовсем, выгрузи его
       в <code>words.js</code> в ⚙ Настройках.</p>
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
      de: $('#awDe').value.trim(),
      tr: $('#awTr').value.trim(),
      ru: $('#awRu').value.trim(),
      pos: $('#awPos').value
    };
    if (!word.de || !word.tr || !word.ru) { toast('Заполни слово, транскрипцию и перевод'); return; }
    let setId = setSel.value;
    if (setId === 'new') setId = createOwnSet($('#awName').value).id;
    const err = addWordToOwnSet(setId, word);
    S.lastOwnSet = setId;
    save();
    closeModal();
    hideTip();
    const name = (ownSetById(setId) || {}).name || '';
    toast(err === 'уже есть' ? `«${word.de}» уже есть в модуле «${name}»`
                             : `«${word.de}» добавлено в «${name}»`);
  });
  setTimeout(() => $('#awDe').focus(), 40);
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-add]');
  if (b) { e.stopPropagation(); openAddWordModal(b.dataset.add); }
});


/* Свой модуль живёт в браузере. Эта кнопка превращает его в кусок кода,
   который можно вставить в words.js и хранить уже насовсем. */
function exportOwnSet(id) {
  const set = ownSetById(id);
  if (!set) return;
  const rows = set.words.map(w => {
    const parts = [`de: ${JSON.stringify(w.de)}`, `tr: ${JSON.stringify(w.tr)}`,
                   `ru: ${JSON.stringify(w.ru)}`, `pos: ${JSON.stringify(w.pos || 'сущ.')}`];
    if (w.pl) parts.push(`pl: ${JSON.stringify(w.pl)}`);
    if (w.plTr) parts.push(`plTr: ${JSON.stringify(w.plTr)}`);
    if (w.note) parts.push(`note: ${JSON.stringify(w.note)}`);
    return '    { ' + parts.join(', ') + ' },';
  });
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
    else if (e.key === 's' || e.key === 'ы') { const w = C.list[C.i]; if (w) speak(w.de); }
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
