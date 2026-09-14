import type { ViewportTransform } from '@/types/math';
import { DEFAULT_STYLE_SETTINGS, type StyleSettings } from '@/types/workspace';
import type { CommandScene } from '../../scene';
import { type Clause, fold } from '../../text';
import type { AppAction } from '../../types';
import { plain } from './tools';

/** Tırnak içi yazılar atılmış, katlanmış, noktalamasız metin ("Trig. Oranlar" → "trig oranlar"). Sayılar rakam olarak kalır. */
export function plainOf(c: Clause): string {
  return plain(fold(c.raw.replace(/"[^"]*"|“[^”]*”|«[^»]*»|„[^“”]*[“”]/g, ' ')));
}

/** Açma / gösterme bildiren sözcükler */
export const ON = /\b(?:goster\w*|ac|acin|aciniz|acalim|acar misin|acabilir misin|acsana|aciver|acik|acilsin|etkinlestir\w*|aktif\w*|getir\w*|gorunur\w*|gorunsun|gozuksun|gozukur\w*|olsun|koy|ekle|devreye al\w*|geri getir\w*)\b/;
/** Kapatma / gizleme bildiren sözcükler */
export const OFF = /\b(?:gizle\w*|kapat\w*|kapansin|kaldir\w*|kalksin|sakla\w*|gorunmez\w*|gorunmesin|gozukmesin|gozukmez\w*|sil|silin|yok et\w*|iptal\w*|devre disi\w*|pasif\w*|kapali|olmasin|istemiyorum|istemem)\b/;
/** Aç-kapa (tersine çevir) */
export const TOGGLE = /\b(?:ac kapa\w*|ac kapat|degistir\w*|tersine cevir\w*|tersle\w*|toggle)\b/;

/** Uygulamanın başlangıç görünümü (WorkspaceContext DEFAULT_VIEWPORT ile aynı değerler). */
export const DEFAULT_VIEWPORT: ViewportTransform = {
  zoom: 44, panX: 0, panY: 0, width: 1200, height: 700, showGrid: true, showAxes: true, showQuadrants: false,
  showCoordinates: true, showMeasurements: true, blackWhite: false, snapToGrid: false, gridStep: 1,
};
export const MIN_ZOOM = 5;
export const MAX_ZOOM = 300;

export function viewportOf(scene: CommandScene): ViewportTransform {
  return { ...DEFAULT_VIEWPORT, ...(scene.options.viewport ?? {}) };
}

/** Panel ileride stil ayarlarını da seçeneklerle geçirirse onları kullanır; yoksa varsayılanlar. */
export function styleOf(scene: CommandScene): StyleSettings {
  const extra = scene.options as { styleSettings?: Partial<StyleSettings> };
  return { ...DEFAULT_STYLE_SETTINGS, ...(extra.styleSettings ?? {}) };
}

/** Aynı eylem arka arkaya iki kez eklenmesin ("Trig. Oranlar aracını seç" iki cümleye bölündüğünde olduğu gibi). */
export function actOnce(scene: CommandScene, action: AppAction): boolean {
  const last = scene.actions[scene.actions.length - 1];
  if (last && JSON.stringify(last) === JSON.stringify(action)) return false;
  scene.act(action);
  return true;
}

/** Cümle belirli bir nesneyi mi gösteriyor (etiket, seçim ya da zamir)? */
export function refersToObjects(c: Clause): boolean {
  return c.labels.length > 0 || c.refersToSelection || c.refersToLast;
}

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Türkçe liste: "a", "a ve b", "a, b ve c" */
export function joinTr(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} ve ${items[items.length - 1]}`;
}
