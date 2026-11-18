/**
 * Conversor Markdown → HTML mínimo, sem dependências (a skill precisa rodar em qualquer lugar).
 * Suporta: títulos (#–####), parágrafos (quebra de linha simples vira <br>), **negrito**, *itálico*,
 * `código`, [links](url), listas (- / 1.), tabelas GFM, citações, blocos ``` e linhas ---.
 * Citações que começam com [!tipo] Título viram caixas (callouts) da identidade Go, Julls!.
 */
export const CALLOUTS = {
  formula: { icon: 'Σ', label: 'Fórmula' },
  dica: { icon: '★', label: 'Dica Go, Julls!' },
  pegadinha: { icon: '!', label: 'Pegadinha' },
  exemplo: { icon: '✎', label: 'Exemplo resolvido' },
  atencao: { icon: '!', label: 'Atenção' },
  resumo: { icon: '✓', label: 'Resumo' },
};

export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function inline(text) {
  return String(text)
    .split(/(`[^`]+`)/g)
    .map((part) => {
      if (/^`[^`]+`$/.test(part)) return `<code>${esc(part.slice(1, -1))}</code>`;
      return esc(part)
        .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[^*\w])\*(?!\s)([^*]+?)\*(?!\*)/g, '$1<em>$2</em>');
    })
    .join('');
}

const isHr = (l) => /^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(l);
const isHeading = (l) => /^#{1,4}\s+/.test(l);
const isUl = (l) => /^\s*[-*+]\s+/.test(l);
const isOl = (l) => /^\s*\d+[.)]\s+/.test(l);
const isQuote = (l) => /^\s*>/.test(l);
const isFence = (l) => /^\s*```/.test(l);
const isTableSep = (l) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l);
const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

export function mdToHtml(src) {
  const lines = String(src).replace(/\r/g, '').split('\n');
  const out = [];
  let i = 0;
  const startsBlock = (l, next) => !l.trim() || isHeading(l) || isHr(l) || isUl(l) || isOl(l) || isQuote(l) || isFence(l) || (l.includes('|') && next !== undefined && isTableSep(next));

  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) {
      i++;
      continue;
    }
    if (isFence(l)) {
      const buf = [];
      i++;
      while (i < lines.length && !isFence(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`);
      continue;
    }
    const h = l.match(/^(#{1,4})\s+(.*?)\s*#*\s*$/);
    if (h) {
      const n = h[1].length;
      const cls = n === 2 && /^gabarito/i.test(h[2]) ? ' class="quebra"' : '';
      out.push(`<h${n}${cls}>${inline(h[2])}</h${n}>`);
      i++;
      continue;
    }
    if (isHr(l)) {
      out.push('<hr>');
      i++;
      continue;
    }
    if (isQuote(l)) {
      const buf = [];
      while (i < lines.length && isQuote(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ''));
      const m = buf[0].match(/^\[!(\w+)\]\s*(.*)$/);
      const c = m && CALLOUTS[m[1].toLowerCase()];
      if (c) {
        const title = m[2].trim() || c.label;
        out.push(`<div class="callout ${m[1].toLowerCase()}"><div class="callout-title"><span class="ci">${c.icon}</span>${inline(title)}</div><div class="callout-body">${mdToHtml(buf.slice(1).join('\n'))}</div></div>`);
      } else out.push(`<blockquote>${mdToHtml(buf.join('\n'))}</blockquote>`);
      continue;
    }
    if (l.includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const head = cells(l);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) rows.push(cells(lines[i++]));
      out.push(
        `<table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows
          .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
          .join('')}</tbody></table>`,
      );
      continue;
    }
    if (isUl(l) || isOl(l)) {
      const ordered = isOl(l);
      const test = ordered ? isOl : isUl;
      const items = [];
      while (i < lines.length && (test(lines[i]) || (/^\s{2,}\S/.test(lines[i]) && items.length))) {
        if (test(lines[i])) items.push(lines[i].replace(ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*+]\s+/, ''));
        else items[items.length - 1] += ' ' + lines[i].trim();
        i++;
      }
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>${items.map((it) => `<li>${inline(it)}</li>`).join('')}</${tag}>`);
      continue;
    }
    const buf = [l];
    i++;
    while (i < lines.length && !startsBlock(lines[i], lines[i + 1])) buf.push(lines[i++]);
    out.push(`<p>${buf.map((x) => inline(x.trim())).join('<br>')}</p>`);
  }
  return out.join('\n');
}
