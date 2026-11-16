/** Integrações nativas (Capacitor) com fallback para o navegador. Nenhum dado pessoal vai para logs. */
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { StatusBar, Style } from '@capacitor/status-bar';
import { addDays, dayKey, parseDay } from '../core/dates';

export const isNative = () => Capacitor.isNativePlatform();

export async function keepAwake(on: boolean) {
  try {
    if (isNative()) await (on ? KeepAwake.keepAwake() : KeepAwake.allowSleep());
    else if (on && 'wakeLock' in navigator) {
      wakeLock = await (navigator as Navigator & { wakeLock: { request(t: string): Promise<{ release(): Promise<void> }> } }).wakeLock.request('screen');
    } else if (!on && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch {
    /* sem suporte: ignora */
  }
}
let wakeLock: { release(): Promise<void> } | null = null;

export async function buzz(kind: 'tap' | 'done' = 'tap') {
  try {
    if (isNative()) {
      if (kind === 'done') {
        await Haptics.notification({ type: NotificationType.Success });
        await Haptics.vibrate({ duration: 600 });
      } else await Haptics.impact({ style: ImpactStyle.Light });
    } else if ('vibrate' in navigator) navigator.vibrate(kind === 'done' ? [300, 100, 300] : 20);
  } catch {
    /* ignora */
  }
}

export async function applyStatusBar(theme: 'dark' | 'light') {
  if (!isNative()) return;
  try {
    await StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light });
    await StatusBar.setBackgroundColor({ color: theme === 'dark' ? '#0B0B0F' : '#FFF5FA' });
  } catch {
    /* ignora */
  }
}

const REMINDER_BASE = 1000;
const TIMER_ID = 900;

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!isNative()) {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    return (await Notification.requestPermission()) === 'granted';
  }
  const p = await LocalNotifications.checkPermissions();
  if (p.display === 'granted') return true;
  return (await LocalNotifications.requestPermissions()).display === 'granted';
}

/**
 * Agenda os lembretes dos próximos 7 dias (funcionam offline: são notificações locais).
 * `todayText` = mensagem com o bloco do dia; os outros dias recebem texto genérico
 * (o app reagenda ao abrir, atualizando a mensagem do dia).
 */
export async function scheduleReminders(times: string[], todayText: string, enabled: boolean, examDate: string) {
  if (!isNative()) return;
  try {
    const pending = await LocalNotifications.getPending();
    const ours = pending.notifications.filter((n) => n.id >= REMINDER_BASE && n.id < REMINDER_BASE + 200);
    if (ours.length) await LocalNotifications.cancel({ notifications: ours.map((n) => ({ id: n.id })) });
    if (!enabled || !times.length) return;
    if (!(await ensureNotificationPermission())) return;
    const now = new Date();
    const today = dayKey();
    const list = [];
    for (let d = 0; d < 7; d++) {
      const day = addDays(today, d);
      if (day > examDate) break;
      for (let i = 0; i < times.length; i++) {
        const [h, m] = times[i].split(':').map(Number);
        const at = parseDay(day);
        at.setHours(h, m, 0, 0);
        if (at <= now) continue;
        list.push({
          id: REMINDER_BASE + d * 10 + i,
          title: 'Go, Julls!',
          body: d === 0 ? todayText : 'Seu plano de hoje está pronto. Abre o app e bora!',
          schedule: { at, allowWhileIdle: true },
          smallIcon: 'ic_stat_gojulls',
          iconColor: '#FF2E93',
        });
      }
    }
    if (list.length) await LocalNotifications.schedule({ notifications: list });
  } catch {
    /* sem permissão ou sem suporte */
  }
}

/** Notificação de fim de bloco (caso a tela esteja apagada ou o app em segundo plano). */
export async function scheduleTimerEnd(at: Date | null, body = 'Bloco concluído! Registre como foi.') {
  if (!isNative()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: TIMER_ID }] });
    if (at && (await ensureNotificationPermission())) {
      await LocalNotifications.schedule({
        notifications: [{ id: TIMER_ID, title: 'Go, Julls!', body, schedule: { at, allowWhileIdle: true }, smallIcon: 'ic_stat_gojulls', iconColor: '#FF2E93' }],
      });
    }
  } catch {
    /* ignora */
  }
}

/** Foto da câmera ou galeria, comprimida (máx. 1600 px, JPEG 0,7). */
export async function takePhoto(source: 'camera' | 'gallery'): Promise<string | null> {
  try {
    if (isNative()) {
      const p = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
        quality: 70,
        width: 1600,
        correctOrientation: true,
      });
      return p.dataUrl ?? null;
    }
    return await pickImageWeb();
  } catch {
    return null;
  }
}

function pickImageWeb(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      resolve(await compressImage(f));
    };
    input.click();
  });
}

async function compressImage(file: Blob, max = 1600): Promise<string> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  await new Promise((r) => {
    img.onload = r;
    img.src = url;
  });
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(url);
  return c.toDataURL('image/jpeg', 0.7);
}

/** Salva um arquivo de texto (Documentos no Android; download no navegador). Retorna onde salvou. */
export async function saveTextFile(name: string, content: string, mime = 'application/json'): Promise<string> {
  if (isNative()) {
    const r = await Filesystem.writeFile({ path: `GoJulls/${name}`, data: content, directory: Directory.Documents, encoding: Encoding.UTF8, recursive: true });
    return r.uri.replace('file://', '');
  }
  const blob = new Blob([content], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return `Downloads/${name}`;
}

export function pickTextFile(accept = '.json,application/json'): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = async () => {
      const f = input.files?.[0];
      resolve(f ? await f.text() : null);
    };
    input.click();
  });
}
