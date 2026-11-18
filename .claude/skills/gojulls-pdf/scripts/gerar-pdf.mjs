#!/usr/bin/env node
/**
 * Go, Julls! — Markdown de matéria → PDF na identidade visual do app.
 *
 * Uso:
 *   node gerar-pdf.mjs <arquivo.md> [--saida <arquivo.pdf>] [--tema claro|escuro] [--html]
 *
 * - O .md começa com um bloco de metadados (frontmatter YAML simples), ver SKILL.md.
 * - Caixas especiais: blocos de citação que começam com [!formula], [!dica], [!pegadinha],
 *   [!exemplo], [!atencao] ou [!resumo] (opcionalmente seguidos de um título).
 * - Tema "claro" (padrão) é bom para imprimir; "escuro" é bom para ler no tablet.
 * - Gera o PDF com o Edge/Chrome em modo headless (já vem no Windows). --html também salva o HTML.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { dirname, resolve, basename, join } from 'node:path';
import { tmpdir, homedir, platform } from 'node:os';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { mdToHtml, esc } from './md.mjs';

const here = dirname(fileURLToPath(import.meta.url));

// ---------- argumentos ----------
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const input = args.find((a, i) => !a.startsWith('--') && !['--saida', '--tema'].includes(args[i - 1]));
if (!input) {
  console.error('Uso: node gerar-pdf.mjs <arquivo.md> [--saida arquivo.pdf] [--tema claro|escuro] [--html]');
  process.exit(1);
}
const tema = opt('tema', 'claro') === 'escuro' ? 'escuro' : 'claro';
const src = resolve(input);
const out = resolve(opt('saida', src.replace(/\.md$/i, '') + (tema === 'escuro' ? '-escuro' : '') + '.pdf'));

// ---------- markdown ----------
const raw = readFileSync(src, 'utf8').replace(/\r/g, '');
const { meta, body } = parseFrontmatter(raw);

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { meta: {}, body: text };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^\s*([\w\u00C0-\u017F-]+)\s*:\s*(.*)$/);
    if (kv) meta[kv[1].toLowerCase()] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return { meta, body: text.slice(m[0].length) };
}

const html = mdToHtml(body);

// ---------- fonte Inter embutida (assets/, licença OFL) ----------
function fontFace() {
  const face = (p) => `@font-face{font-family:'Inter';font-weight:100 900;font-display:block;src:url(data:font/woff2;base64,${readFileSync(p).toString('base64')}) format('woff2');}`;
  return ['inter-latin.woff2', 'inter-latin-ext.woff2']
    .map((f) => join(here, '..', 'assets', f))
    .filter((f) => existsSync(f))
    .map(face)
    .join('');
}

// ---------- capa ----------
const SUBJECT_POINTS = {
  matematica: 15, fisica: 15, redacao: 37, portugues: 6, 'lingua portuguesa': 6, 'lingua portuguesa e literatura': 6,
  'portugues e literatura': 6, literatura: 6, biologia: 6, quimica: 6, geografia: 6, historia: 6,
  'lingua estrangeira': 3, ingles: 3, espanhol: 3, 'lingua inglesa': 3, 'lingua espanhola': 3,
};
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const disciplina = meta.disciplina || '';
const pontos = meta.pontos || SUBJECT_POINTS[norm(disciplina)] || '';
const freq = Math.max(0, Math.min(5, parseInt(meta.frequencia ?? meta['frequência'] ?? '0', 10) || 0));
const titulo = meta.titulo || meta['título'] || basename(src, '.md');
const subtitulo = meta.subtitulo || meta['subtítulo'] || '';
const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const LOGO = `<svg viewBox="0 0 512 512" width="64" height="64" aria-hidden="true">${tema === 'escuro' ? '<rect width="512" height="512" rx="112" fill="#0B0B0F"/>' : ''}<path d="M262 112v188a86 86 0 0 1-172 0" fill="none" stroke="#FF2E93" stroke-width="64" stroke-linecap="round"/><path d="M386 88 318 236h52l-34 120 104-160h-56l40-108z" fill="#FF5CAA"/></svg>`;

const capa = `
<section class="capa">
  <div class="capa-top">${LOGO}<div class="marca">Go, <span>Julls!</span></div></div>
  <div class="capa-mid">
    ${disciplina ? `<div class="chip">${esc(disciplina)}</div>` : ''}
    <h1 class="capa-titulo">${esc(titulo)}</h1>
    ${subtitulo ? `<p class="capa-sub">${esc(subtitulo)}</p>` : ''}
    <div class="capa-meta">
      ${pontos ? `<div><b>${esc(pontos)} pts</b><span>na nota final</span></div>` : ''}
      ${freq ? `<div><b class="dots">${'●'.repeat(freq)}<i>${'●'.repeat(5 - freq)}</i></b><span>frequência nas provas</span></div>` : ''}
      ${meta.tempo ? `<div><b>${esc(meta.tempo)}</b><span>tempo de estudo</span></div>` : ''}
    </div>
  </div>
  <div class="capa-bottom">
    <span>Vestibular CEDERJ 2027/1 · Engenharia de Produção · prova 06/12/2026</span>
    <span>${hoje}</span>
  </div>
</section>`;

const cabecalho = `<div class="cab"><span class="cab-marca">Go, <b>Julls!</b></span><span>${esc([disciplina, titulo].filter(Boolean).join(' · '))}</span></div>`;

// ---------- estilo ----------
const C = tema === 'escuro'
  ? { bg: '#0B0B0F', surface: '#16161D', elev: '#1F1F29', line: '#2A2A36', ink: '#FFFFFF', muted: '#C9C9D6', accent: '#FF5CAA', strong: '#FFB3D9', warn: '#FFB020' }
  : { bg: '#FFFFFF', surface: '#FFF5FA', elev: '#FFE8F3', line: '#F5C8DE', ink: '#1A1A22', muted: '#4A4A5A', accent: '#AD1457', strong: '#AD1457', warn: '#8A5400' };

const K = tema === 'escuro'
  ? { bg: '#0B0B0F', ink: '#FFFFFF', sub: '#FFE0F0', muted: '#C9C9D6', line: '#2A2A36', dotOff: '#2A2A36', num: '#FF5CAA' }
  : { bg: '#FFFFFF', ink: '#0B0B0F', sub: '#4A4A5A', muted: '#4A4A5A', line: '#F5C8DE', dotOff: '#F5C8DE', num: '#AD1457' };

const css = `
${fontFace()}
@page { size: A4; margin: 16mm 16mm 18mm; }
@page :first { margin: 0; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html, body { margin: 0; background: ${C.bg}; color: ${C.ink}; font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; font-size: 10.5pt; line-height: 1.55; }
.capa { position: relative; width: 210mm; height: 297mm; background: ${K.bg}; color: ${K.ink}; padding: 22mm 20mm; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always; overflow: hidden; border-top: 8mm solid #FF2E93; }
.capa::after { content: ''; position: absolute; right: 20mm; top: 40mm; width: 60mm; height: 60mm; border-radius: 50%; border: 3mm solid #FF2E93; opacity: .18; }
.capa-top { display: flex; align-items: center; gap: 12px; }
.marca { font-weight: 900; font-size: 22pt; letter-spacing: -.02em; }
.marca span { color: #FF2E93; }
.chip { display: inline-block; background: #FF2E93; color: #0B0B0F; font-weight: 800; border-radius: 999px; padding: 4px 14px; font-size: 11pt; margin-bottom: 14px; }
.capa-titulo { font-size: 34pt; line-height: 1.08; font-weight: 900; letter-spacing: -.02em; margin: 0 0 10px; color: ${K.ink}; border: 0; padding: 0; }
.capa-sub { font-size: 13pt; color: ${K.sub}; margin: 0 0 24px; }
.capa-meta { display: flex; gap: 28px; margin-top: 18px; }
.capa-meta div { display: flex; flex-direction: column; }
.capa-meta b { font-size: 16pt; color: ${K.num}; font-weight: 900; }
.capa-meta b.dots i { font-style: normal; color: ${K.dotOff}; }
.capa-meta span { font-size: 9pt; color: ${K.muted}; }
.capa-bottom { display: flex; justify-content: space-between; font-size: 9pt; color: ${K.muted}; border-top: 1px solid ${K.line}; padding-top: 10px; position: relative; z-index: 1; }
table.pagina { width: 100%; border-collapse: collapse; margin: 0; }
table.pagina > thead > tr > td, table.pagina > tbody > tr > td { padding: 0; border: 0; background: none; }
.cab { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; font-size: 8pt; color: ${C.muted}; border-bottom: 1.5px solid #FF2E93; padding-bottom: 3px; margin-bottom: 6mm; }
.cab-marca { font-weight: 900; color: ${C.ink}; white-space: nowrap; }
.cab-marca b { color: #FF2E93; }
.cab > span:last-child { text-align: right; }
h1 { font-size: 20pt; font-weight: 900; letter-spacing: -.01em; margin: 0 0 8px; }
h2 { font-size: 14.5pt; font-weight: 800; margin: 22px 0 8px; padding-left: 10px; border-left: 5px solid #FF2E93; page-break-after: avoid; }
h3 { font-size: 11.5pt; font-weight: 800; color: ${C.accent}; margin: 16px 0 6px; page-break-after: avoid; }
h2.quebra { page-break-before: always; }
main > h2:first-child { margin-top: 0; }
p { margin: 6px 0; }
strong { color: ${C.strong}; font-weight: 700; }
em { color: ${C.muted}; }
a { color: ${C.accent}; }
ul, ol { margin: 6px 0; padding-left: 20px; }
li { margin: 3px 0; }
li::marker { color: #FF2E93; font-weight: 700; }
code { font-family: 'Cascadia Mono', Consolas, monospace; background: ${C.elev}; border-radius: 4px; padding: 0 4px; font-size: 9.5pt; }
pre { background: ${C.surface}; border: 1px solid ${C.line}; border-radius: 10px; padding: 10px 12px; overflow: hidden; white-space: pre-wrap; }
pre code { background: none; padding: 0; }
hr { border: 0; border-top: 1px dashed ${C.line}; margin: 16px 0; }
main table { border-collapse: collapse; width: 100%; margin: 10px 0; font-size: 9.5pt; page-break-inside: avoid; }
main th { background: #FF2E93; color: #0B0B0F; text-align: left; font-weight: 800; }
main th, main td { padding: 6px 8px; border: 1px solid ${C.line}; }
main tr:nth-child(even) td { background: ${C.surface}; }
blockquote { margin: 10px 0; padding: 6px 12px; border-left: 4px solid ${C.line}; color: ${C.muted}; }
img { max-width: 100%; border-radius: 8px; }
.callout { border-radius: 12px; padding: 10px 14px 8px; margin: 12px 0; page-break-inside: avoid; background: ${C.surface}; border: 1px solid ${C.line}; }
.callout-title { font-weight: 800; display: flex; align-items: center; gap: 8px; margin-bottom: 4px; font-size: 10.5pt; }
.callout .ci { display: inline-grid; place-items: center; width: 20px; height: 20px; border-radius: 6px; background: #FF2E93; color: #0B0B0F; font-size: 10pt; font-weight: 900; }
.callout-body > p:first-child:empty { display: none; }
.callout.formula { border: 2px solid #FF2E93; background: ${C.elev}; }
.callout.formula .callout-body { font-size: 11.5pt; }
.callout.dica { border-left: 6px solid #FF2E93; }
.callout.pegadinha, .callout.atencao { border-left: 6px solid ${C.warn}; }
.callout.pegadinha .ci, .callout.atencao .ci { background: ${C.warn}; }
.callout.exemplo { border-left: 6px solid ${C.accent}; }
.callout.resumo { background: ${tema === 'escuro' ? '#0B0B0F' : '#FFF5FA'}; color: ${C.ink}; border: 2px dashed #FF2E93; }
.callout.resumo strong { color: ${C.strong}; }
.callout.resumo li::marker { color: #FF2E93; }
`;

const doc = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(titulo)} — Go, Julls!</title><style>${css}</style></head>
<body>${capa}<table class="pagina"><thead><tr><td>${cabecalho}</td></tr></thead><tbody><tr><td><main>${html}</main></td></tr></tbody></table></body></html>`;

// ---------- renderização ----------
mkdirSync(dirname(out), { recursive: true });
const work = mkdtempSync(join(tmpdir(), 'gojulls-pdf-'));
const htmlPath = join(work, 'materia.html');
writeFileSync(htmlPath, doc, 'utf8');
if (args.includes('--html')) writeFileSync(out.replace(/\.pdf$/i, '.html'), doc, 'utf8');

function findBrowser() {
  const fixed = [
    process.env.GOJULLS_BROWSER,
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
  ].filter(Boolean);
  const found = fixed.find((b) => existsSync(b));
  if (found) return found;
  // Chromium instalado pelo Playwright (comum em ambientes Linux de nuvem)
  for (const base of [process.env.PLAYWRIGHT_BROWSERS_PATH, join(homedir(), '.cache/ms-playwright')].filter(Boolean)) {
    if (!existsSync(base)) continue;
    for (const d of readdirSync(base).filter((x) => /^chromium/.test(x)).sort().reverse()) {
      for (const sub of ['chrome-linux/chrome', 'chrome-linux64/chrome', 'chrome-linux/headless_shell', 'chrome-headless-shell-linux64/chrome-headless-shell']) {
        const p = join(base, d, sub);
        if (existsSync(p)) return p;
      }
    }
  }
  return null;
}

const browser = findBrowser();
let ok = false;
if (browser) {
  const r = spawnSync(
    browser,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      ...(platform() === 'linux' ? ['--no-sandbox', '--disable-dev-shm-usage'] : []),
      `--user-data-dir=${join(work, 'perfil')}`,
      '--no-pdf-header-footer',
      '--print-to-pdf-no-header',
      '--virtual-time-budget=4000',
      `--print-to-pdf=${out}`,
      pathToFileURL(htmlPath).href,
    ],
    { encoding: 'utf8', timeout: 120000 },
  );
  ok = existsSync(out);
  if (!ok) console.error('O navegador não gerou o PDF:', (r.stderr || '').slice(0, 400));
}
if (!ok) {
  // Alternativa: WeasyPrint (Python), se existir
  const w = spawnSync('weasyprint', [htmlPath, out], { encoding: 'utf8', timeout: 120000 });
  ok = !w.error && existsSync(out);
}
try {
  rmSync(work, { recursive: true, force: true });
} catch {
  /* o navegador pode segurar arquivos por alguns segundos */
}
if (!ok) {
  const htmlOut = out.replace(/\.pdf$/i, '.html');
  writeFileSync(htmlOut, doc, 'utf8');
  console.error(`Sem navegador para gerar PDF aqui. Salvei o HTML: ${htmlOut}\nAbra no Chrome/Edge e use Imprimir → Salvar como PDF (marque "Gráficos de fundo").`);
  process.exit(2);
}
console.log(`PDF gerado: ${out}`);
