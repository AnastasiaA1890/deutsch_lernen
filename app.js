/* ==========================================================================
   Тренажёр немецких слов — движок.
   Работает без сервера: просто открой index.html в браузере.
   ========================================================================== */
'use strict';

/* ---------- данные -------------------------------------------------------- */
const SETS = window.WORD_SETS || [];
const MODULES = [];
const WORDS = [];
/* Каждый набор из words.js — отдельный модуль со своим прогрессом.
   Прогресс привязан к ключу «id модуля :: слово|перевод», поэтому одно
   и то же слово в разных модулях учится независимо. */
SETS.forEach((set, i) => {
  const id = String(set.id || set.name || ('set' + (i + 1)));
  const words = (set.words || []).map(w =>
    Object.assign({}, w, { key: id + '::' + w.de + '|' + w.ru, module: id }));
  MODULES.push({ id: id, name: set.name || ('Модуль ' + (i + 1)), words: words });
  WORDS.push.apply(WORDS, words);
});
const BY_KEY = new Map(WORDS.map(w => [w.key, w]));
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
  v: 2, w: {}, match: {}, learns: {},
  module: MODULES.length ? MODULES[0].id : ALL,
  filter: 'all', theme: 'auto', rate: 0.85, autoSpeak: false, alwaysTr: true
};
function load() {
  try {
    const raw = localStorage.getItem(LS);
    if (raw) S = Object.assign(S, JSON.parse(raw));
  } catch (e) { /* приватное окно — работаем без сохранения */ }
  migrate();
  if (S.module !== ALL && !moduleById(S.module)) S.module = MODULES.length ? MODULES[0].id : ALL;
  if (!S.learns) S.learns = {};
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
function norm(s) {
  return String(s).toLowerCase()
    .replace(/[.,!?;:()]/g, ' ')
    .replace(/^\s*(der|die|das)\s+/, '')
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/\s+/g, ' ').trim();
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
function speak(text) {
  if (!('speechSynthesis' in window) || !text) return;
  if (!deVoice) pickVoice();
  if (!deVoice) {
    if (!voiceWarned) {
      voiceWarned = true;
      toast('Немецкий голос не установлен: Системные настройки → Универсальный доступ → Устный контент → Системный голос → Управление голосами → немецкий', 7000);
    }
    return;
  }
  const u = new SpeechSynthesisUtterance(String(text).replace(/\s*\|\s*/g, ', '));
  u.voice = deVoice; u.lang = deVoice.lang; u.rate = S.rate || 0.85;
  try { speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {}
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
  if (current === 'match') stopMatchTimer();
  if ('speechSynthesis' in window) { try { speechSynthesis.cancel(); } catch (e) {} }
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
function updateMini() {
  const c = counts();
  $('#miniProgress').textContent = `выучено ${c.known} / ${c.total}`;
}

/* ---------- главный экран -------------------------------------------------- */
function renderModules() {
  const many = MODULES.length > 1;
  $('#moduleField').style.display = MODULES.length ? '' : 'none';
  const card = (id, name, list) => {
    const c = counts(list);
    const pct = c.total ? Math.round(c.known / c.total * 100) : 0;
    return `<button class="mod ${S.module === id ? 'active' : ''}" data-module="${esc(id)}">
      <span class="mod-name">${esc(name)}</span>
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
    'Пиши немецкое слово по русскому переводу. Артикль писать не нужно, ue/oe/ae/ss тоже засчитываются.', p.length);
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
    const hitDe = q && (norm(w.de).includes(q) || norm(w.pl || '').includes(q));
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
    MODULES.map(m => `<button data-t="${esc(m.id)}" class="${addTarget === m.id ? 'active' : ''}">${esc(m.name)}</button>`).join('');
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
        '», перед его закрывающей скобкой <code>]</code>.';
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
        <div><div class="t">${esc(m.name)}</div>
        <div class="d">${mc.total} слов · выучено ${mc.known}, в работе ${mc.learning}, новых ${mc.fresh}</div></div>
        <button class="btn ghost danger" data-reset="${esc(m.id)}">Сбросить</button>
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
   КЛАВИАТУРА
   ========================================================================== */
document.addEventListener('keydown', e => {
  const typingInField = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
  if (e.altKey && (e.key === 'a' || e.key === 'ф') && document.activeElement.id === 'addInput') {
    e.preventDefault(); insertStress(); return;
  }
  if (e.key === 'Escape') {
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
