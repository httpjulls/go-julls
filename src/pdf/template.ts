/**
 * Documento imprimível na identidade Go, Julls! — o mesmo visual da skill gojulls-pdf
 * (capa branca com rosa, cabeçalho repetido, caixas). Tema claro = imprimir; escuro = tablet.
 */
import interLatin from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?inline';
import interLatinExt from '@fontsource-variable/inter/files/inter-latin-ext-wght-normal.woff2?inline';
import { esc } from './md';

export type Tema = 'claro' | 'escuro';

export interface DocMeta {
  titulo: string;
  subtitulo?: string;
  disciplina?: string;
  pontos?: string | number;
  frequencia?: number;
  tempo?: string;
}

const LOGO = (tema: Tema) =>
  `<svg viewBox="0 0 512 512" width="64" height="64" aria-hidden="true">${tema === 'escuro' ? '<rect width="512" height="512" rx="112" fill="#0B0B0F"/>' : ''}<path d="M262 112v188a86 86 0 0 1-172 0" fill="none" stroke="#FF2E93" stroke-width="64" stroke-linecap="round"/><path d="M386 88 318 236h52l-34 120 104-160h-56l40-108z" fill="#FF5CAA"/></svg>`;

function css(tema: Tema) {
  const C =
    tema === 'escuro'
      ? { bg: '#0B0B0F', surface: '#16161D', elev: '#1F1F29', line: '#2A2A36', ink: '#FFFFFF', muted: '#C9C9D6', accent: '#FF5CAA', strong: '#FFB3D9', warn: '#FFB020' }
      : { bg: '#FFFFFF', surface: '#FFF5FA', elev: '#FFE8F3', line: '#F5C8DE', ink: '#1A1A22', muted: '#4A4A5A', accent: '#AD1457', strong: '#AD1457', warn: '#8A5400' };
  const K =
    tema === 'escuro'
      ? { bg: '#0B0B0F', ink: '#FFFFFF', sub: '#FFE0F0', muted: '#C9C9D6', line: '#2A2A36', dotOff: '#2A2A36', num: '#FF5CAA' }
      : { bg: '#FFFFFF', ink: '#0B0B0F', sub: '#4A4A5A', muted: '#4A4A5A', line: '#F5C8DE', dotOff: '#F5C8DE', num: '#AD1457' };
  return `
@font-face{font-family:'Inter';font-weight:100 900;font-display:block;src:url(${interLatin}) format('woff2');}
@font-face{font-family:'Inter';font-weight:100 900;font-display:block;src:url(${interLatinExt}) format('woff2');}
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
.capa-titulo { font-size: 34pt; line-height: 1.08; font-weight: 900; letter-spacing: -.02em; margin: 0 0 10px; color: ${K.ink}; }
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
h1 { font-size: 20pt; font-weight: 900; margin: 0 0 8px; }
h2 { font-size: 14.5pt; font-weight: 800; margin: 22px 0 8px; padding-left: 10px; border-left: 5px solid #FF2E93; page-break-after: avoid; }
h3 { font-size: 11.5pt; font-weight: 800; color: ${C.accent}; margin: 16px 0 6px; page-break-after: avoid; }
h2.quebra { page-break-before: always; }
main > h2:first-child { margin-top: 0; }
p { margin: 6px 0; }
strong { color: ${C.strong}; font-weight: 700; }
em { color: ${C.muted}; }
ul, ol { margin: 6px 0; padding-left: 20px; }
li { margin: 3px 0; }
li::marker { color: #FF2E93; font-weight: 700; }
code { background: ${C.elev}; border-radius: 4px; padding: 0 4px; font-size: 9.5pt; }
pre { background: ${C.surface}; border: 1px solid ${C.line}; border-radius: 10px; padding: 10px 12px; white-space: pre-wrap; }
hr { border: 0; border-top: 1px dashed ${C.line}; margin: 16px 0; }
main table { border-collapse: collapse; width: 100%; margin: 10px 0; font-size: 9.5pt; page-break-inside: avoid; }
main th { background: #FF2E93; color: #0B0B0F; text-align: left; font-weight: 800; }
main th, main td { padding: 6px 8px; border: 1px solid ${C.line}; }
main tr:nth-child(even) td { background: ${C.surface}; }
blockquote { margin: 10px 0; padding: 6px 12px; border-left: 4px solid ${C.line}; color: ${C.muted}; }
img { max-width: 100%; border-radius: 6px; }
.callout { border-radius: 12px; padding: 10px 14px 8px; margin: 12px 0; page-break-inside: avoid; background: ${C.surface}; border: 1px solid ${C.line}; }
.callout-title { font-weight: 800; display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.callout .ci { display: inline-grid; place-items: center; width: 20px; height: 20px; border-radius: 6px; background: #FF2E93; color: #0B0B0F; font-size: 10pt; font-weight: 900; }
.callout.formula { border: 2px solid #FF2E93; background: ${C.elev}; }
.callout.dica { border-left: 6px solid #FF2E93; }
.callout.pegadinha, .callout.atencao { border-left: 6px solid ${C.warn}; }
.callout.pegadinha .ci, .callout.atencao .ci { background: ${C.warn}; }
.callout.exemplo { border-left: 6px solid ${C.accent}; }
.callout.resumo { background: ${tema === 'escuro' ? '#0B0B0F' : '#FFF5FA'}; border: 2px dashed #FF2E93; }
/* Questões */
.questao { page-break-inside: avoid; margin: 0 0 14px; padding-bottom: 10px; border-bottom: 1px dashed ${C.line}; }
.questao .num { display: inline-grid; place-items: center; min-width: 26px; height: 26px; padding: 0 6px; border-radius: 8px; background: #FF2E93; color: #0B0B0F; font-weight: 900; margin-right: 8px; }
.questao .fonte { font-size: 8pt; color: ${C.muted}; }
.questao .alts { list-style: none; padding-left: 0; margin: 6px 0 0; }
.questao .alts li { margin: 3px 0; display: flex; gap: 6px; }
.questao .alts b { flex: 0 0 26px; color: ${C.accent}; }
.questao .figura { display: block; max-height: 120mm; margin: 6px 0; border: 1px solid ${C.line}; }
.questao .recorte { display: block; width: 100%; max-width: 120mm; margin: 4px 0; border-radius: 4px; background: #fff; }
.cartao { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px 12px; font-size: 9.5pt; page-break-inside: avoid; }
.cartao div { display: flex; align-items: center; gap: 4px; }
.cartao .n { width: 22px; font-weight: 800; color: ${C.accent}; text-align: right; }
.cartao .b { width: 15px; height: 15px; border: 1.5px solid ${C.muted}; border-radius: 50%; font-size: 7pt; display: inline-grid; place-items: center; color: ${C.muted}; }
.gab { display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px 10px; font-size: 10pt; }
.gab span b { color: ${C.accent}; }
`;
}

export function buildDocument(meta: DocMeta, bodyHtml: string, tema: Tema = 'claro'): string {
  const freq = Math.max(0, Math.min(5, meta.frequencia ?? 0));
  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const capa = `
<section class="capa">
  <div class="capa-top">${LOGO(tema)}<div class="marca">Go, <span>Julls!</span></div></div>
  <div class="capa-mid">
    ${meta.disciplina ? `<div class="chip">${esc(meta.disciplina)}</div>` : ''}
    <h1 class="capa-titulo">${esc(meta.titulo)}</h1>
    ${meta.subtitulo ? `<p class="capa-sub">${esc(meta.subtitulo)}</p>` : ''}
    <div class="capa-meta">
      ${meta.pontos ? `<div><b>${esc(meta.pontos)} pts</b><span>na nota final</span></div>` : ''}
      ${freq ? `<div><b class="dots">${'●'.repeat(freq)}<i>${'●'.repeat(5 - freq)}</i></b><span>frequência nas provas</span></div>` : ''}
      ${meta.tempo ? `<div><b>${esc(meta.tempo)}</b><span>tempo de estudo</span></div>` : ''}
    </div>
  </div>
  <div class="capa-bottom"><span>Vestibular CEDERJ 2027/1 · Engenharia de Produção · prova 06/12/2026</span><span>${hoje}</span></div>
</section>`;
  const cab = `<div class="cab"><span class="cab-marca">Go, <b>Julls!</b></span><span>${esc([meta.disciplina, meta.titulo].filter(Boolean).join(' · '))}</span></div>`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(meta.titulo)} — Go, Julls!</title><style>${css(tema)}</style></head>
<body>${capa}<table class="pagina"><thead><tr><td>${cab}</td></tr></thead><tbody><tr><td><main>${bodyHtml}</main></td></tr></tbody></table></body></html>`;
}
