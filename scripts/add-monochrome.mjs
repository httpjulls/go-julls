// Depois do capacitor-assets: adiciona o ícone monocromático (Android 13+) aos ícones adaptativos.
import { readFileSync, writeFileSync } from 'node:fs';
for (const f of ['ic_launcher', 'ic_launcher_round']) {
  const p = `android/app/src/main/res/mipmap-anydpi-v26/${f}.xml`;
  let x = readFileSync(p, 'utf8');
  if (!x.includes('<monochrome>'))
    x = x.replace('</adaptive-icon>', '    <monochrome>\n        <inset android:drawable="@drawable/ic_launcher_monochrome" android:inset="0%" />\n    </monochrome>\n</adaptive-icon>');
  writeFileSync(p, x);
}
console.log('monochrome ok');
