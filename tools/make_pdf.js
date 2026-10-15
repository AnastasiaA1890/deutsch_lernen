/* Собирает печатную версию словаря: слово · произношение · перевод.
   Запуск:  node tools/make_pdf.js  →  создаёт tools/dictionary.html
   Дальше HTML печатается в PDF из Chrome (см. README). */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
global.window = {};
require(path.join(ROOT, 'words.js'));
const SETS = window.WORD_SETS || [];

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const total = SETS.reduce((n, m) => n + m.words.length, 0);
const today = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

let body = '';
SETS.forEach(set => {
  body += `<section class="mod">
    <h2>${esc(set.name)} <span class="cnt">${set.words.length}</span></h2>
    <table>
      <thead><tr><th>Слово</th><th>Произношение</th><th>Перевод</th></tr></thead>
      <tbody>`;
  set.words.forEach(w => {
    const extra = [w.pl ? 'мн. ч.: ' + w.pl : '', w.forms || '', w.note || '']
      .filter(Boolean).join(' · ');
    body += `<tr>
      <td class="word">${esc(w.en)}${extra ? `<span class="extra">${esc(extra)}</span>` : ''}</td>
      <td class="tr">${esc(w.tr)}</td>
      <td class="ru">${esc(w.ru)}${w.def ? `<span class="def">${esc(w.def)}</span>` : ''}</td>
    </tr>`;
  });
  body += '</tbody></table></section>';
});

const html = `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><title>Английские слова — словарь</title>
<style>
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body { font: 10.5pt/1.35 "Helvetica Neue", Arial, sans-serif; color: #15171d; margin: 0; }
  h1 { font-size: 22pt; margin: 0 0 2mm; }
  .sub { color: #666; font-size: 10pt; margin: 0 0 8mm; }
  .toc { font-size: 10pt; color: #333; margin: 0 0 10mm; columns: 2; column-gap: 10mm; }
  .toc div { break-inside: avoid; padding: 0.6mm 0; }
  .toc b { font-weight: 600; }
  .mod { break-before: page; }
  .mod:first-of-type { break-before: auto; }
  h2 { font-size: 13pt; margin: 0 0 3mm; padding-bottom: 1.5mm;
       border-bottom: 1.2pt solid #15171d; break-after: avoid; }
  .cnt { font-weight: 400; color: #888; font-size: 10pt; }
  table { width: 100%; border-collapse: collapse; }
  thead th { font-size: 8pt; text-transform: uppercase; letter-spacing: .06em; color: #888;
             text-align: left; padding: 0 2mm 1.5mm 0; font-weight: 600; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; }
  td { padding: 1.1mm 2mm 1.1mm 0; border-bottom: .4pt solid #e2e4ea; vertical-align: top; }
  .word { width: 30%; font-weight: 600; }
  .tr { width: 22%; color: #4b45c6; }
  .ru { width: 48%; }
  .extra { display: block; font-weight: 400; font-size: 8.5pt; color: #777; }
  .def { display: block; font-size: 8.5pt; color: #777; font-style: italic; }
</style></head><body>
<h1>Английские слова</h1>
<p class="sub">${total} слов в ${SETS.length} модулях · ${today}</p>
<div class="toc">${SETS.map(s => `<div><b>${esc(s.name)}</b> — ${s.words.length}</div>`).join('')}</div>
${body}
</body></html>`;

const out = path.join(__dirname, 'dictionary.html');
fs.writeFileSync(out, html);
console.log('HTML собран:', out, '|', total, 'слов в', SETS.length, 'модулях');
