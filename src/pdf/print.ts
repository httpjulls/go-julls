/**
 * Abre o diálogo de impressão com o documento: no Android, pelo sistema (opção "Salvar como PDF");
 * no navegador, por um iframe oculto (Imprimir → Salvar como PDF).
 */
import { registerPlugin } from '@capacitor/core';
import { isNative, saveTextFile } from '../native/native';

interface GoPrintPlugin {
  print(opts: { html: string; name: string }): Promise<void>;
}
const GoPrint = registerPlugin<GoPrintPlugin>('GoPrint');

export async function printHtml(html: string, name: string): Promise<'impresso' | 'html'> {
  if (isNative()) {
    try {
      await GoPrint.print({ html, name });
      return 'impresso';
    } catch {
      // sem o plugin (APK antigo): salva o HTML para abrir no navegador
      await saveTextFile(`${name}.html`, html, 'text/html');
      return 'html';
    }
  }
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  doc.open();
  doc.write(html);
  doc.close();
  await new Promise((r) => setTimeout(r, 400));
  await (frame.contentDocument as Document & { fonts?: FontFaceSet }).fonts?.ready;
  const prev = document.title;
  document.title = name; // nome sugerido do arquivo no "Salvar como PDF"
  frame.contentWindow!.focus();
  frame.contentWindow!.print();
  document.title = prev;
  setTimeout(() => frame.remove(), 60_000);
  return 'impresso';
}
