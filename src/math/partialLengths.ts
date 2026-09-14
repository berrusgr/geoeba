import type {
  LineObject,
  MathObject,
  MeasurementObject,
  PointObject,
  RayObject,
  SegmentObject,
} from '@/types/math';

/**
 * PARÇALI UZUNLUK ÖLÇÜMÜ
 *
 * Doğru parçası / doğru / ışın üzerinde nokta varken (ya da parça o noktadan
 * bölündükten sonra) "baştan sona" ve "noktaya kadar" uzunluklarını ölçmek için
 * saf yardımcılar. Bir nokta çiftinin uzunluğunu ekranda TEK bir nesne taşır:
 * aynı uçlara sahip çizginin kendi `showLength` bayrağı ya da 'distance' ölçüm etiketi.
 */

const ESIK = 1e-3;

type Straight = SegmentObject | LineObject | RayObject;
export type LengthRole = 'whole' | 'piece' | 'toPoint' | 'fromPoint' | 'between';
export type LengthOption = { fromId: string; toId: string; role: LengthRole; viaId?: string };

const isPoint = (o: MathObject | undefined): o is PointObject => o?.type === 'point';
const isStraight = (o: MathObject | undefined): o is Straight =>
  o?.type === 'segment' || o?.type === 'line' || o?.type === 'ray';

export function straightEnds(o: Straight): [string, string] {
  if (o.type === 'segment') return [o.startPointId, o.endPointId];
  if (o.type === 'line') return [o.point1Id, o.point2Id];
  return [o.startPointId, o.throughPointId];
}

/** Sırası önemsiz iki kimlik çifti aynı mı? */
export function samePair(x: readonly string[], y: readonly string[]): boolean {
  return (
    x.length === 2 &&
    y.length === 2 &&
    ((x[0] === y[0] && x[1] === y[1]) || (x[0] === y[1] && x[1] === y[0]))
  );
}

const pointsOf = (scene: MathObject[]) =>
  new Map(scene.filter(isPoint).map((p) => [p.id, p] as const));

/**
 * Verilen parçayla UÇ UCA ve AYNI DOĞRU üzerinde duran parçalar zinciri.
 * "[AB]'yi E'den ikiye ayır" sonrası [AE] + [EB] tek bir [AB] gibi ele alınır.
 */
export function collinearSegmentChain(scene: MathObject[], segmentId: string): SegmentObject[] {
  const start = scene.find((o) => o.id === segmentId && o.type === 'segment') as SegmentObject | undefined;
  if (!start) return [];
  const pts = pointsOf(scene);
  const a = pts.get(start.startPointId);
  const b = pts.get(start.endPointId);
  if (!a || !b) return [start];
  const ux = b.x - a.x;
  const uy = b.y - a.y;
  const boy = Math.hypot(ux, uy);
  if (boy < 1e-9) return [start];
  const t = (p: PointObject) => ((p.x - a.x) * ux + (p.y - a.y) * uy) / (boy * boy);
  const uzaklik = (p: PointObject) => Math.abs((p.x - a.x) * uy - (p.y - a.y) * ux) / boy;

  const zincir: SegmentObject[] = [start];
  let [minId, maxId] = t(a) <= t(b) ? [a.id, b.id] : [b.id, a.id];
  let degisti = true;
  while (degisti) {
    degisti = false;
    for (const o of scene) {
      if (o.type !== 'segment' || o.visible === false || zincir.some((z) => z.id === o.id)) continue;
      for (const [uc, bitis] of [[minId, 'min'], [maxId, 'max']] as const) {
        const ucNokta = pts.get(uc);
        if (!ucNokta) continue;
        const digerId = o.startPointId === uc ? o.endPointId : o.endPointId === uc ? o.startPointId : null;
        const diger = digerId ? pts.get(digerId) : undefined;
        if (!diger || uzaklik(diger) > ESIK) continue;
        // Zinciri DIŞA doğru uzatmalı; geri dönen / üst üste binen parça zincir değildir
        if (bitis === 'min' ? t(diger) >= t(ucNokta) - 1e-9 : t(diger) <= t(ucNokta) + 1e-9) continue;
        zincir.push(o);
        if (bitis === 'min') minId = diger.id;
        else maxId = diger.id;
        degisti = true;
        break;
      }
    }
  }
  return zincir;
}

/**
 * Düz bir nesnenin (parça zinciri / doğru / ışın) üzerindeki noktalar, baştan sona SIRALI.
 * Parçada "baş" başlangıç noktasıdır; ışında başlangıç, doğruda point1 → point2 yönü.
 */
export function orderedPointsOnStraight(scene: MathObject[], hostId: string): PointObject[] {
  const host = scene.find((o) => o.id === hostId);
  if (!isStraight(host)) return [];
  const pts = pointsOf(scene);
  const [aId, bId] = straightEnds(host);
  const a = pts.get(aId);
  const b = pts.get(bId);
  if (!a || !b) return [];
  const ux = b.x - a.x;
  const uy = b.y - a.y;
  const boy2 = ux * ux + uy * uy;
  if (boy2 < 1e-18) return [];
  const t = (p: PointObject) => ((p.x - a.x) * ux + (p.y - a.y) * uy) / boy2;

  const uyeler: Straight[] = host.type === 'segment' ? collinearSegmentChain(scene, host.id) : [host];
  const uyeKimlik = new Set(uyeler.map((u) => u.id));
  const secilen = new Map<string, PointObject>();
  for (const u of uyeler) for (const id of straightEnds(u)) {
    const p = pts.get(id);
    if (p) secilen.set(p.id, p);
  }
  for (const p of pts.values()) {
    if (secilen.has(p.id) || p.visible === false) continue;
    if (p.onObjectId && uyeKimlik.has(p.onObjectId)) { secilen.set(p.id, p); continue; }
    // Parçada, bağlı olmasa da GEOMETRİK olarak üzerinde duran nokta da sayılır
    // (Canvas'taki uzerindekiNoktalar ile aynı kural).
    if (host.type !== 'segment') continue;
    for (const u of uyeler as SegmentObject[]) {
      const s = pts.get(u.startPointId);
      const e = pts.get(u.endPointId);
      if (!s || !e) continue;
      const dx = e.x - s.x;
      const dy = e.y - s.y;
      const l2 = dx * dx + dy * dy;
      if (l2 < 1e-18) continue;
      const k = Math.max(0, Math.min(1, ((p.x - s.x) * dx + (p.y - s.y) * dy) / l2));
      if (Math.hypot(p.x - (s.x + k * dx), p.y - (s.y + k * dy)) < ESIK) { secilen.set(p.id, p); break; }
    }
  }
  const sirali = [...secilen.values()].sort((p, q) => t(p) - t(q));
  // Çakışık noktaları tekille (sıfır uzunluklu ölçüm sunulmasın)
  return sirali.filter((p, i) => i === 0 || Math.hypot(p.x - sirali[i - 1].x, p.y - sirali[i - 1].y) >= ESIK);
}

/**
 * Sağ tıklanan düz nesne için sunulacak uzunluk ölçümleri.
 * - whole: en baştaki noktadan en sondakine ("baştan sona")
 * - piece: bölünmüş zincirde tıklanan parçanın kendisi
 * - toPoint / fromPoint: aradaki her nokta için "noktaya kadar" / "noktadan sona kadar"
 * - between: iki ya da daha çok ara nokta varken ardışık ara noktaların arası
 * Aynı nokta çifti bir kez sunulur. `focusPointId` aradaysa yalnızca o nokta için madde üretilir;
 * değilse en fazla `maxPoints` ara nokta için madde üretilir (menü uzamasın diye).
 */
export function straightLengthOptions(
  scene: MathObject[],
  hostId: string,
  focusPointId?: string,
  maxPoints = 4
): { ordered: PointObject[]; options: LengthOption[] } {
  const host = scene.find((o) => o.id === hostId);
  const ordered = orderedPointsOnStraight(scene, hostId);
  if (!isStraight(host) || ordered.length < 2) return { ordered, options: [] };
  const ilk = ordered[0];
  const son = ordered[ordered.length - 1];
  const ham: LengthOption[] = [{ fromId: ilk.id, toId: son.id, role: 'whole' }];
  if (host.type === 'segment') {
    const [s, e] = straightEnds(host);
    const sira = new Map(ordered.map((p, i) => [p.id, i] as const));
    const [bas, bit] = (sira.get(s) ?? 0) <= (sira.get(e) ?? 0) ? [s, e] : [e, s];
    ham.push({ fromId: bas, toId: bit, role: 'piece' });
  }
  const ara = ordered.slice(1, -1);
  const odak = ara.find((p) => p.id === focusPointId);
  for (const p of odak ? [odak] : ara.slice(0, maxPoints)) {
    ham.push({ fromId: ilk.id, toId: p.id, role: 'toPoint', viaId: p.id });
    ham.push({ fromId: p.id, toId: son.id, role: 'fromPoint', viaId: p.id });
  }
  for (let i = 1; i + 2 < ordered.length; i++) {
    const [p, q] = [ordered[i], ordered[i + 1]];
    if (odak ? p.id === odak.id || q.id === odak.id : i + 1 <= maxPoints) {
      ham.push({ fromId: p.id, toId: q.id, role: 'between' });
    }
  }
  const options: LengthOption[] = [];
  for (const o of ham) {
    if (!options.some((x) => samePair([x.fromId, x.toId], [o.fromId, o.toId]))) options.push(o);
  }
  return { ordered, options };
}

/**
 * Bir NOKTAYA sağ tıklanınca: nokta bir düz nesnenin (ya da bölünmüş zincirin) ARASINDA
 * duruyorsa baştan sona + noktaya kadar + noktadan sona kadar ölçümleri.
 * Noktanın menüsünde "bu parça" anlamsız olduğundan parça seçeneği noktaya göre adlandırılır.
 */
export function lengthOptionsAtPoint(
  scene: MathObject[],
  pointId: string
): { hostId: string; options: LengthOption[] } | null {
  const p = scene.find((o) => o.id === pointId);
  if (!isPoint(p)) return null;
  const adaylar: string[] = [];
  if (p.onObjectId && isStraight(scene.find((o) => o.id === p.onObjectId))) adaylar.push(p.onObjectId);
  for (const o of scene) {
    if (o.type === 'segment' && o.visible !== false && (o.startPointId === pointId || o.endPointId === pointId)) adaylar.push(o.id);
  }
  for (const o of scene) if (o.type === 'segment' && o.visible !== false) adaylar.push(o.id);
  for (const hostId of adaylar) {
    const { ordered, options } = straightLengthOptions(scene, hostId, pointId);
    const i = ordered.findIndex((q) => q.id === pointId);
    if (i <= 0 || i >= ordered.length - 1) continue;
    return {
      hostId,
      options: options
        .filter((o) => o.role === 'whole' || o.fromId === pointId || o.toId === pointId)
        .map((o): LengthOption => {
          if (o.role !== 'piece') return o;
          // Parçanın öbür ucu zincirin başıysa "noktaya kadar", sonuysa "noktadan sona kadar"; ikisi de değilse
          // (iki kez bölünmüş zincirde) iki ara noktanın "arası"dır.
          const diger = o.fromId === pointId ? o.toId : o.fromId;
          if (diger === ordered[0].id) return { ...o, role: 'toPoint', viaId: pointId };
          if (diger === ordered[ordered.length - 1].id) return { ...o, role: 'fromPoint', viaId: pointId };
          return { fromId: o.fromId, toId: o.toId, role: 'between' };
        }),
    };
  }
  return null;
}

/**
 * Bu nokta çiftinin uzunluğunu taşıyabilecek nesneler: aynı uçlu bütün görünür parça/doğru/ışınlar
 * (önce parçalar; "[AB] uzunluğu" parçaya aittir) ve varsa 'distance' ölçümü.
 */
export function lengthCarrier(
  scene: MathObject[],
  aId: string,
  bId: string
): { flagObjs: Straight[]; measurement?: MeasurementObject } {
  const flagObjs = scene
    .filter((o): o is Straight => isStraight(o) && o.visible !== false && samePair(straightEnds(o), [aId, bId]))
    .sort((x, y) => (x.type === 'segment' ? 0 : 1) - (y.type === 'segment' ? 0 : 1));
  const measurement = scene.find(
    (o) => o.type === 'measurement' && o.kind === 'distance' && samePair(o.pointIds, [aId, bId])
  ) as MeasurementObject | undefined;
  return { flagObjs, measurement };
}

export function isLengthShown(scene: MathObject[], aId: string, bId: string): boolean {
  const { flagObjs, measurement } = lengthCarrier(scene, aId, bId);
  return (
    flagObjs.some((o) => !!o.showLength) ||
    (!!measurement && measurement.showValue !== false && measurement.visible !== false)
  );
}

/**
 * Çiftin uzunluğunu gösterir/gizler. İKİNCİ bir etiket üretmez:
 * - aynı uçlu parça/doğru/ışın varsa onun `showLength` bayrağı kullanılır,
 * - yoksa var olan 'distance' ölçümü açılır, o da yoksa yenisi eklenir.
 * Gizlerken çifti gösteren HER etiket kapanır. Değişiklik yoksa AYNI dizi döner.
 */
export function withLengthMeasurement(
  scene: MathObject[],
  aId: string,
  bId: string,
  show: boolean,
  newId: string,
  now = Date.now()
): MathObject[] {
  if (aId === bId) return scene;
  const { flagObjs, measurement } = lengthCarrier(scene, aId, bId);
  const acikBayraklar = new Set(flagObjs.filter((o) => o.showLength).map((o) => o.id));
  const olcumAcik = !!measurement && measurement.showValue !== false && measurement.visible !== false;
  if (show) {
    if (acikBayraklar.size > 0 || olcumAcik) return scene;
    const bayrak = flagObjs[0];
    if (bayrak) return scene.map((o) => (o.id === bayrak.id ? ({ ...o, showLength: true } as MathObject) : o));
    if (measurement) {
      return scene.map((o) => (o.id === measurement.id ? ({ ...o, showValue: true, visible: true } as MathObject) : o));
    }
    const pts = pointsOf(scene);
    const a = pts.get(aId);
    const b = pts.get(bId);
    if (!a || !b) return scene;
    const etiket: MeasurementObject = {
      id: newId,
      type: 'measurement',
      kind: 'distance',
      label: `|${a.label}${b.label}|`,
      showLabel: true,
      pointIds: [aId, bId],
      showValue: true,
      color: '#0f766e',
      visible: true,
      createdAt: now,
    };
    return [...scene, etiket];
  }
  if (acikBayraklar.size === 0 && !olcumAcik) return scene;
  return scene.map((o) => {
    if (acikBayraklar.has(o.id)) return { ...o, showLength: false } as MathObject;
    if (olcumAcik && o.id === measurement!.id) return { ...o, showValue: false } as MathObject;
    return o;
  });
}

/**
 * Aynı doğru üzerindeki 'distance' etiketlerinin üst üste binmemesi için kat numarası.
 * Aralıkları ÖRTÜŞEN ölçümler (biri ötekini kapsamasa da) farklı katlara konur: kısa ölçüm önce
 * yerleşir ve örtüştüğü ölçümlerin kullanmadığı en alçak katı alır. Sıra uzunluk ve kimlikle
 * belirlendiğinden aynı doğrudaki her etiket için sonuç tutarlıdır.
 */
export function distanceLabelLevel(scene: MathObject[], measurementId: string): number {
  const pts = pointsOf(scene);
  const olcumler = scene.filter(
    (o): o is MeasurementObject =>
      o.type === 'measurement' && o.kind === 'distance' && o.showValue !== false && o.visible !== false
  );
  const m = olcumler.find((o) => o.id === measurementId);
  const a = m && pts.get(m.pointIds[0]);
  const b = m && pts.get(m.pointIds[1]);
  if (!m || !a || !b) return 0;
  const ux = b.x - a.x;
  const uy = b.y - a.y;
  const boy = Math.hypot(ux, uy);
  if (boy < 1e-9) return 0;
  const t = (p: PointObject) => ((p.x - a.x) * ux + (p.y - a.y) * uy) / boy;
  const hat = (p: PointObject) => Math.abs((p.x - a.x) * uy - (p.y - a.y) * ux) / boy;

  const araliklar = olcumler.flatMap((d) => {
    const p = pts.get(d.pointIds[0]);
    const q = pts.get(d.pointIds[1]);
    if (!p || !q || hat(p) > ESIK || hat(q) > ESIK) return [];
    return [{ id: d.id, lo: Math.min(t(p), t(q)), hi: Math.max(t(p), t(q)) }];
  });
  // Eşit uzunluklar ölçüldükleri yöne göre kayan noktada 1e-15 kadar farklı çıkabilir: toleransla karşılaştır
  araliklar.sort((x, y) => {
    const fark = x.hi - x.lo - (y.hi - y.lo);
    return Math.abs(fark) > 1e-9 ? fark : x.id < y.id ? -1 : x.id > y.id ? 1 : 0;
  });
  const katlar = new Map<string, number>();
  for (const x of araliklar) {
    const dolu = new Set(
      araliklar
        .filter((y) => katlar.has(y.id) && x.lo < y.hi - 1e-9 && y.lo < x.hi - 1e-9)
        .map((y) => katlar.get(y.id)!)
    );
    let kat = 0;
    while (dolu.has(kat)) kat++;
    katlar.set(x.id, kat);
  }
  return katlar.get(m.id) ?? 0;
}
