import type { MathObject, Point2D, PointObject, ViewportTransform } from '@/types/math';
import { getVisibleWorldBounds, screenToWorld } from '../coordinates';
import type { AppAction, CommandSuccess } from './types';

/**
 * Yazılı komutların görünüm eylemleri için SAF yardımcılar.
 * CommandPanel bunları setViewport(prev => …) içinde kullanır; Canvas'taki düğmelerle birebir aynı sonucu verir.
 */

/** Canvas zoomAt ile aynı sınırlar. */
export const MIN_ZOOM = 5;
export const MAX_ZOOM = 300;
/** WorkspaceContext DEFAULT_ZOOM ile aynı (görünümü sıfırla / boş sahneyi sığdır). */
export const RESET_ZOOM = 44;

export function clampZoom(zoom: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
}

/**
 * Yakınlaştırma: ekran noktasının (verilmezse görünüm merkezinin) altındaki dünya koordinatı sabit kalır.
 * Canvas zoomAt(screenPoint, factor) ile aynı formül. Sınırda ya da geçersiz çarpanda görünüm aynen döner.
 */
export function zoomViewport(vp: ViewportTransform, factor: number, at?: Point2D | null): ViewportTransform {
  if (!Number.isFinite(factor) || factor <= 0) return vp;
  const zoom = clampZoom(vp.zoom * factor);
  if (zoom === vp.zoom) return vp;
  const sp = at ?? { x: vp.width / 2, y: vp.height / 2 };
  const world = screenToWorld(sp, vp);
  return {
    ...vp,
    zoom,
    panX: sp.x - vp.width / 2 - world.x * zoom,
    panY: sp.y - vp.height / 2 + world.y * zoom,
  };
}

/** Görünümü sıfırlar (Canvas centerOrigin / WorkspaceContext resetViewport). */
export function resetViewportTransform(vp: ViewportTransform): ViewportTransform {
  return { ...vp, zoom: RESET_ZOOM, panX: 0, panY: 0 };
}

/**
 * Tüm görünür nesneleri ekrana sığdırır. Canvas fitToObjects ile aynı kurallar:
 * noktalar, yazılar, kesir (± yarıçap), görsel (± max(g, y)/2), kalem noktaları ve merkez noktası olan çemberler (± r).
 * 1,5 birim kenar boşluğu, en küçük kutu 2 birim; zoom [5, 300] aralığında. Nesne yoksa görünüm sıfırlanır.
 */
export function fitViewport(vp: ViewportTransform, objects: MathObject[]): ViewportTransform {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const include = (x: number, y: number, pad = 0) => {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(pad)) return;
    minX = Math.min(minX, x - pad);
    maxX = Math.max(maxX, x + pad);
    minY = Math.min(minY, y - pad);
    maxY = Math.max(maxY, y + pad);
  };
  const points = new Map<string, PointObject>();
  for (const o of objects) if (o.type === 'point') points.set(o.id, o);

  for (const obj of objects) {
    if (!obj.visible) continue;
    if (obj.type === 'point' || obj.type === 'text') include(obj.x, obj.y);
    else if (obj.type === 'fraction') include(obj.x, obj.y, obj.radius);
    else if (obj.type === 'image') include(obj.x, obj.y, Math.max(obj.width, obj.height) / 2);
    else if (obj.type === 'pen') obj.points.forEach(p => include(p.x, p.y));
    else if (obj.type === 'circle') {
      const c = points.get(obj.centerPointId);
      if (c) {
        const rPt = obj.radiusPointId ? points.get(obj.radiusPointId) : undefined;
        const r = rPt ? Math.hypot(rPt.x - c.x, rPt.y - c.y) : obj.fixedRadius ?? 0;
        include(c.x, c.y, r);
      }
    }
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return resetViewportTransform(vp);

  const padding = 1.5;
  const boxW = Math.max(maxX - minX + padding * 2, 2);
  const boxH = Math.max(maxY - minY + padding * 2, 2);
  const zoom = clampZoom(Math.min(vp.width / boxW, vp.height / boxH));
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return { ...vp, zoom, panX: -cx * zoom, panY: cy * zoom };
}

/** Görünümdeki dünya merkezi (pencereyle açılan araçların şekli görünür alana koyması için). */
export function viewportCenter(vp: ViewportTransform): Point2D {
  const b = getVisibleWorldBounds(vp);
  const round = (n: number) => Math.round(n * 2) / 2;
  return { x: round((b.minX + b.maxX) / 2), y: round((b.minY + b.maxY) / 2) };
}

/** Komutla gelen görünüm yamasını temizler: sayısal alanlar sonlu olmalı, zoom sınırlanır. */
export function sanitizeViewportPatch(patch: Partial<ViewportTransform>): Partial<ViewportTransform> {
  const clean: Partial<ViewportTransform> = {};
  for (const [key, value] of Object.entries(patch) as [keyof ViewportTransform, unknown][]) {
    if (key === 'width' || key === 'height') continue; // ekran boyutunu ResizeObserver yönetir
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) continue;
      (clean as Record<string, unknown>)[key] = key === 'zoom' ? clampZoom(value) : key === 'gridStep' ? Math.max(0.01, value) : value;
    } else if (typeof value === 'boolean' || value === undefined) {
      (clean as Record<string, unknown>)[key] = value;
    }
  }
  return clean;
}

/**
 * Görünümü etkileyen tek bir eylemi uygular (viewport, zoom, fitView, resetView); diğer eylemlerde görünüm aynen döner.
 * `objects`: eylemden sonra geçerli olacak sahne (sığdırma için).
 */
export function viewportAfterAction(vp: ViewportTransform, action: AppAction, objects: MathObject[]): ViewportTransform {
  switch (action.kind) {
    case 'viewport': return { ...vp, ...sanitizeViewportPatch(action.patch) };
    case 'zoom': return zoomViewport(vp, action.factor);
    case 'fitView': return fitViewport(vp, objects);
    case 'resetView': return resetViewportTransform(vp);
    default: return vp;
  }
}

/**
 * Başarılı bir komuttan sonra ölçümler zorla gösterilsin mi?
 * Yalnızca sahne değiştiyse ve kullanıcı aynı komutta sade görünüm ya da ölçümleri gizlemeyi istemediyse.
 */
export function shouldForceMeasurements(result: Pick<CommandSuccess, 'sceneChanged' | 'actions'>): boolean {
  if (!result.sceneChanged) return false;
  return !result.actions.some(a => (a.kind === 'styleMode' && a.mode === 'Sade')
    || (a.kind === 'viewport' && a.patch.showMeasurements === false));
}

/**
 * Geri al / yinele, sahneyi değiştiren işlemlerle aynı komutta uygulanamaz: motor yeni sahneyi geri almadan önceki
 * çizimden hesapladığı için sonuç yanlış olurdu. Böyle bir karışımda açıklama döndürür, yoksa null.
 */
export function historyConflict(result: Pick<CommandSuccess, 'sceneChanged' | 'actions'>): string | null {
  if (!result.sceneChanged) return null;
  const history = result.actions.find(a => a.kind === 'undo' || a.kind === 'redo');
  if (!history) return null;
  return `“${history.kind === 'undo' ? 'Geri al' : 'Yinele'}” komutunu çizim işlemleriyle aynı cümlede kullanmayın; önce onu ayrı yazıp uygulayın.`;
}

/** Geri al/yinele için gerçekten atılabilecek adım sayısı. */
export function historySteps(kind: 'undo' | 'redo', requested: number | undefined, historyIndex: number, historyLength: number): number {
  const want = Number.isFinite(requested) && (requested as number) >= 1 ? Math.floor(requested as number) : 1;
  const available = kind === 'undo' ? Math.max(0, historyIndex) : Math.max(0, historyLength - 1 - historyIndex);
  return Math.min(want, available);
}
