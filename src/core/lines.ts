/**
 * Simulação da folha de redação: conta linhas como se o texto fosse manuscrito numa folha
 * de 25 linhas. Cada parágrafo começa numa nova linha e quebra quando passa da largura.
 * `charsPerLine` é configurável (folha real: ~75–85 caracteres manuscritos por linha).
 */
export function countLines(text: string, charsPerLine = 78): number {
  const paragraphs = text.replace(/\r/g, '').split('\n');
  let lines = 0;
  for (const p of paragraphs) {
    const t = p.trimEnd();
    if (!t.trim()) continue; // linhas em branco não contam (não se pula linha na folha)
    const indented = '     ' + t.trim(); // recuo de parágrafo
    lines += wrapCount(indented, charsPerLine);
  }
  return lines;
}

function wrapCount(s: string, width: number): number {
  const words = s.split(/(\s+)/);
  let lines = 1;
  let col = 0;
  for (const w of words) {
    if (!w) continue;
    const len = w.length;
    if (/^\s+$/.test(w)) {
      col += col === 0 ? 0 : len;
      continue;
    }
    if (col + len <= width) col += len;
    else if (len > width) {
      // palavra maior que a linha: quebra forçada
      let rest = len - (width - col);
      lines += 1;
      while (rest > width) {
        lines += 1;
        rest -= width;
      }
      col = rest;
    } else {
      lines += 1;
      col = len;
    }
  }
  return lines;
}

export type LineStatus = 'curta' | 'ok' | 'limite' | 'excedeu';

export function lineStatus(lines: number, min = 20, max = 25): LineStatus {
  if (lines < min) return 'curta';
  if (lines > max) return 'excedeu';
  if (lines === max) return 'limite';
  return 'ok';
}
