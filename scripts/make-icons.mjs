// Gera os PNGs-fonte do ícone e do splash em resources/ (depois: npx capacitor-assets generate --android).
// Desenho original: "J" com raio, rosa sobre preto.
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';

mkdirSync('resources', { recursive: true });

const MARK = (scale = 1, dx = 0, dy = 0) => `
  <g transform="translate(${dx} ${dy}) scale(${scale})">
    <path d="M262 112v188a86 86 0 0 1-172 0" fill="none" stroke="#FF2E93" stroke-width="64" stroke-linecap="round"/>
    <path d="M386 88 318 236h52l-34 120 104-160h-56l40-108z" fill="#FF5CAA"/>
  </g>`;

const svg = (w, h, body, bg = '#0B0B0F') => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${body}</svg>`);

// Marca ocupa ~ (90..490, 88..386) no espaço 512 → centro (290, 237). Centralizamos.
const centered = (size, frac) => {
  const s = (size * frac) / 364; // marca: x 58–422, y 80–418
  return MARK(s, size / 2 - 240 * s, size / 2 - 249 * s);
};

const out = async (name, buf, size) => sharp(buf).resize(size, size).png().toFile(`resources/${name}`);

await out('icon-only.png', svg(1024, 1024, centered(1024, 0.7)), 1024);
// Adaptativo: conteúdo dentro da zona segura (66/108 ≈ 61%)
await out('icon-foreground.png', svg(1024, 1024, centered(1024, 0.5), null), 1024);
await out('icon-background.png', svg(1024, 1024, ''), 1024);

const splash = (dark) =>
  svg(
    2732,
    2732,
    centered(2732, 0.22) +
      `<text x="1366" y="1720" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="180" fill="${dark ? '#FFFFFF' : '#1A1A22'}">Go, <tspan fill="#FF2E93">Julls!</tspan></text>`,
    dark ? '#0B0B0F' : '#0B0B0F',
  );
await sharp(splash(true)).png().toFile('resources/splash.png');
await sharp(splash(true)).png().toFile('resources/splash-dark.png');

// Favicon/ícone PWA do build web
writeFileSync('public/icon.svg', svg(512, 512, MARK(1), null).toString().replace('<svg ', '<svg ').replace('viewBox="0 0 512 512">', 'viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#0B0B0F"/>'));
console.log('resources/ gerado');
