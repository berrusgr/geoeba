'use client';
import { resolveCommandBindings, constructionDependencies, commandCircleGeometry } from '@/math/commandBindings';
import type { PointAnimUpdate } from '@/math/pathAnimation';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  useReducer,
} from 'react';
import {
  MathObject,
  PointObject,
  SegmentObject,
  LineObject,
  RayObject,
  CircleObject,
  ArcObject,
  SectorObject,
  AngleObject,
  PolygonObject,
  FunctionObject,
  SliderObject,
  FractionObject,
  Point2D,
  MeasurementKind,
  CheckboxObject,
  ButtonObject,
  InputBoxObject,
  MeasurementObject,
  EllipseObject,
  ViewportTransform,
} from '@/types/math';
import { ToolMode, WorkspaceHistoryStep,
  StyleSettings,
  DEFAULT_STYLE_SETTINGS,
  STYLE_STORAGE_KEY,
  loadStyleSettings,
} from '@/types/workspace';
import {
  calculateDistance,
  calculateAngleDegrees,
  calculatePolygonArea,
  calculatePolygonPerimeter,
  calculateCircumcircle,
  generateNextPointLabel,
  generateNextPointLabels,
  midpoint,
  ratioToT,
  parallelThrough,
  perpendicularThrough,
  perpendicularBisector,
  angleBisectorPoint,
  calculateSlope,
  rightTriangleRatios,
  angleTrigRatios,
  distanceToSegment,
  closestPointOnCircle,
  closestPointOnEllipse,
  closestPointOnPolygonEdge,
  splitPolygonByChord,
  projectOntoHost,
  getArcGeometry,
} from '@/math/geometry';
import { snapToVisibleGrid, formatTurkishNumber, getVisibleWorldBounds } from '@/math/coordinates';
import { functionLabel, nextFunctionName, relabelFunction } from '@/math/functionNames';
import { extractVariableNames,
  validateMathExpression,
  evaluateNumericInput,
} from '@/math/parser';
import { useCurriculum } from './CurriculumContext';
import { createId } from './ids';
import { pointAngleAction } from '@/math/pointAngles';
import { withLengthMeasurement } from '@/math/partialLengths';
import { fitPolynomial, polynomialToExpression, coefficientOfDetermination } from '@/math/regression';
import type { HostShape } from '@/math/geometry';
import type { ValuePromptRequest } from '@/components/workspace/ValuePromptDialog';
import confetti from 'canvas-confetti';

export { createId } from './ids';

type ObjectsUpdater = MathObject[] | ((prev: MathObject[]) => MathObject[]);

interface WorkspaceContextType {
  constraintError: string | null;
  objects: MathObject[];
  selectedObjectId: string | null;
  selectedObjectIds: string[];
  activeTool: ToolMode;
  /** Çizim stili (çizgi kalınlığı, yazı boyutu, nokta boyutu) */
  styleSettings: StyleSettings;
  setStyleSettings: React.Dispatch<React.SetStateAction<StyleSettings>>;
  viewport: ViewportTransform;
  pendingPointIds: string[];
  history: WorkspaceHistoryStep[];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  activityCompleted: boolean;
  activeSuccessMessage: string | null;
  hintMessage: string | null;
  studioDimension: '2D' | '3D';
  isConfirmClearOpen: boolean;
  confirmClearTargetDim: '2D' | '3D';
  setIsConfirmClearOpen: (open: boolean) => void;
  requestClearAll: (dimension?: '2D' | '3D') => void;
  isRegularPolygonDialogOpen: boolean;
  regularPolygonPos: Point2D;
  setIsRegularPolygonDialogOpen: (open: boolean) => void;
  openRegularPolygonDialog: (pos?: Point2D) => void;
  /** Araçların sayı/oran sorması için ortak pencere isteği (null = kapalı) */
  valuePrompt: ValuePromptRequest | null;
  setValuePrompt: (r: ValuePromptRequest | null) => void;
  isCircleRadiusDialogOpen: boolean;
  circleRadiusPos: Point2D;
  setIsCircleRadiusDialogOpen: (open: boolean) => void;
  openCircleRadiusDialog: (pos?: Point2D) => void;

  // Eylemler
  setObjects: React.Dispatch<React.SetStateAction<MathObject[]>>;
  setStudioDimension: (dim: '2D' | '3D') => void;
  setActiveTool: (tool: ToolMode) => void;
  setSelectedObjectId: (id: string | null) => void;
  setSelectedObjectIds: React.Dispatch<React.SetStateAction<string[]>>;
  setViewport: React.Dispatch<React.SetStateAction<ViewportTransform>>;
  setHintMessage: (message: string | null) => void;
  commit: (next: ObjectsUpdater, description: string) => void;
  addObject: (obj: MathObject, historyLabel?: string) => void;
  addObjects: (objs: MathObject[], description?: string) => void;
  updateObject: (id: string, updates: Partial<MathObject>, recordHistory?: boolean) => void;
  deleteObject: (id: string) => void;
  deleteObjects: (ids: string[], description?: string) => void;
  moveObject: (objectId: string, delta: Point2D, recordHistory?: boolean) => void;
  /** `capa`: sürüklemenin tutulduğu nokta ve onun grubunun isteyeceği öteleme (kısıtlı çapanın eksik kalan kısmı dâhil). */
  moveObjects: (objectIds: string[], delta: Point2D, recordHistory?: boolean, capa?: { id: string; delta: Point2D }) => void;
  clearWorkspace: () => void;
  resetViewport: () => void;
  handlePointClick: (pointId: string, objectsOverride?: MathObject[]) => void;
  handleCanvasClick: (worldPos: Point2D) => void;
  handlePointDrag: (pointId: string, newWorldPos: Point2D) => void;
  handleSliderChange: (sliderId: string, value: number) => void;
  /** Oynatma döngüsü için: birden çok kaydırıcı veya noktanın değerini TEK adımda, geçmişe yazmadan günceller. */
  setSliderValues: (values: Record<string, number>, pointUpdates?: Record<string, PointAnimUpdate>) => void;
  addFunction: (expression: string, label?: string) => void;
  addSlider: (name: string, min: number, max: number, step: number, initialValue: number, sliderType?: 'number' | 'angle' | 'integer', animSpeed?: number, animMode?: 'oscillating' | 'increasing' | 'decreasing' | 'increasing_once') => void;
  /** "a = 2" gibi bir atamayı uygular: kaydırıcı varsa değerini yazar, yoksa oluşturur. */
  assignSliderValue: (name: string, value: number) => void;
  undo: () => void;
  redo: () => void;
  recordHistory: (description: string) => void;
  cancelPendingAction: () => void;
  restartCurrentActivity: () => void;

  // Bağlam menüsü (sağ tık) eylemleri
  measureLength: (objectId: string) => void;
  /** İki nokta arasındaki CANLI uzunluğu gösterir/gizler (parça üzerindeki nokta: |AP|, bölünmüş zincir: |AB|). Aynı çift için ikinci etiket üretmez. */
  setLengthMeasurement: (fromPointId: string, toPointId: string, show: boolean) => void;
  measureArea: (objectId: string) => void;
  measurePerimeter: (objectId: string) => void;
  measureAngleAtPoint: (pointId: string) => void;
  measureArcAngle: (shapeId: string) => void;
  /** İşaret kutusunu açıp kapatır; bağlı nesnelerin görünürlüğü buna eşitlenir. */
  toggleCheckbox: (checkboxId: string) => void;
  /** Düğmenin bağlı eylemini çalıştırır. */
  runButton: (buttonId: string) => void;
  /** Girdi kutusuna yazılanı uygular; hata varsa metnini döndürür. */
  applyInputBox: (inputBoxId: string, raw: string) => string | null;
  /** Doğru parçasını, üzerindeki bir noktadan ikiye ayırır. */
  splitSegmentAtPoint: (segmentId: string, pointId: string) => void;
  /** Çemberi, üzerindeki iki noktadan iki yaya ayırır. */
  splitCircleAtPoints: (circleId: string, pointIds: string[]) => void;
  /** Yayı, üzerindeki bir noktadan iki yaya ayırır. */
  splitArcAtPoint: (arcId: string, pointId: string) => void;
  /** Çokgeni, kenarları üzerindeki iki noktayı birleştiren kirişle iki parçaya böler. */
  splitPolygon: (polygonId: string, pointIds: string[]) => void;
  /** Seçili noktaları ardışık doğru parçalarıyla birleştirir. */
  connectPoints: (pointIds: string[]) => void;
  /** Seçili noktalar arasındaki doğru parçalarını kaldırır. */
  disconnectPoints: (pointIds: string[]) => void;
  /** Seçili noktalara en küçük karelerle polinom uydurup fonksiyon olarak ekler. */
  fitPolynomialToPoints: (pointIds: string[], degree: number) => void;
  /** Çokgenin tek bir kenarının uzunluk etiketini açar/kapatır. */
  togglePolygonEdgeLabel: (polygonId: string, edgeIndex: number) => void;
  /** Çokgenin bütün kenar uzunluklarını gösterir veya gizler. */
  setAllPolygonEdgeLabels: (polygonId: string, show: boolean) => void;
  hideMeasurement: (objectId: string, kind: MeasurementKind | string) => void;
  setLabelOffset: (objectId: string, kind: MeasurementKind | string, offset: Point2D, recordHistory?: boolean) => void;
  measureArcLength: (arcId: string) => void;
  toggleAngleReflex: (angleId: string) => void;
  setSegmentLength: (segmentId: string, target: number) => void;
  setAngleDegrees: (angleId: string, targetDeg: number) => void;
  bindAngleToSlider: (angleId: string, sliderNameOrVar: string) => void;
  unbindAngleFromSlider: (angleId: string) => void;
  setCircleRadius: (circleId: string, target: number) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const WORKSPACE_STORAGE_KEY = 'matematik_calisma_alani_v1';
const WORKSPACE_STORAGE_VERSION = 1;
const MAX_HISTORY_LENGTH = 120;

export const DEFAULT_ZOOM = 44;

const DEFAULT_VIEWPORT: ViewportTransform = {
  zoom: DEFAULT_ZOOM,
  panX: 0,
  panY: 0,
  width: 1200,
  height: 700,
  showGrid: true,
  showAxes: true,
  showQuadrants: false,
  showCoordinates: false,
  showMeasurements: true,
  snapToGrid: false,
  gridStep: 1,
};

const KNOWN_OBJECT_TYPES = new Set<string>([
  'point',
  'segment',
  'line',
  'ray',
  'circle',
  'ellipse',
  'arc',
  'sector',
  'angle',
  'polygon',
  'function',
  'slider',
  'fraction',
  'pen',
  'text',
  'image',
  'checkbox',
  'button',
  'input_box',
  'measurement',
]);

const TYPE_NAMES: Record<MathObject['type'], string> = {
  point: 'Nokta',
  segment: 'Doğru Parçası',
  line: 'Doğru',
  ray: 'Işın',
  circle: 'Çember',
  ellipse: 'Elips',
  arc: 'Yay',
  sector: 'Daire Dilimi',
  angle: 'Açı',
  polygon: 'Çokgen',
  function: 'Fonksiyon',
  slider: 'Sürgü',
  fraction: 'Kesir Modeli',
  pen: 'Serbest Çizim',
  text: 'Metin Notu',
  image: 'Görsel',
  checkbox: 'İşaret Kutusu',
  button: 'Düğme',
  input_box: 'Girdi Kutusu',
  measurement: 'Ölçüm Etiketi',
};

/** Geçmiş açıklamalarında kullanılacak okunabilir nesne adı (kimlik değil, etiket). */
function describeObject(obj: MathObject | undefined): string {
  if (!obj) return 'Nesne';
  const typeName = TYPE_NAMES[obj.type] || 'Nesne';
  if (!obj.label) return typeName;
  if (obj.type === 'point') return `${obj.label} noktası`;
  return obj.label;
}

/** Silinecek kimliklere bağımlı tüm nesneleri (doğru, çember, açı, çokgen...) toplar. */
/**
 * Bölünen nesnenin ÜZERİNDE duran noktaların bağını çözer.
 *
 * Bölmeden sonra o noktalar yeni parçaların TANIM noktası olur; eski nesne de
 * artık yoktur. Bağ kalsaydı nokta silinmiş bir nesneye asılı kalır, ayrıca
 * "nesneyi sil -> üzerindeki noktaları da sil" kuralı yüzünden bir parçayı
 * silmek noktaları da götürürdü.
 */
function bagiCoz(objects: MathObject[], pointIds: string[]): MathObject[] {
  const kume = new Set(pointIds);
  return objects.map((o) => {
    if (o.type !== 'point' || !kume.has(o.id)) return o;
    const p = o as PointObject;
    if (!p.onObjectId) return o;
    const { onObjectId: _atilan, ...kalan } = p;
    return kalan as MathObject;
  });
}

/**
 * Bölünen taşıyıcıya KİLİTLİ kalan DİĞER noktaları, üzerinde durdukları yeni parçaya devreder.
 * Aksi hâlde silinmiş kimliğe asılı kalıyorlardı: gri çiziliyor, menü "Kilit çöz" diyordu
 * ama nokta artık hiçbir şeye bağlı değildi. Hiçbir parçanın üzerinde değilse bağ kaldırılır.
 */
export function bagiParcalaraDevret(objects: MathObject[], eskiHostId: string, parcalar: MathObject[]): MathObject[] {
  if (!objects.some((o) => o.type === 'point' && o.onObjectId === eskiHostId)) return objects;
  const hepsi = [...objects, ...parcalar];
  const nk = (id: string) => hepsi.find((x) => x.id === id && x.type === 'point') as PointObject | undefined;
  const uzerinde = (p: PointObject, parca: MathObject): boolean => {
    if (parca.type === 'segment') {
      const a = nk(parca.startPointId);
      const b = nk(parca.endPointId);
      return !!a && !!b && distanceToSegment(p, a, b).distance < 1e-3;
    }
    if (parca.type === 'arc') {
      const m = nk(parca.centerPointId);
      const s = nk(parca.startPointId);
      const e = nk(parca.directionPointId);
      const geo = m && s && e ? getArcGeometry(m, s, e) : null;
      if (!m || !geo) return false;
      if (Math.abs(calculateDistance(m, p) - geo.radius) > 1e-3) return false;
      const fark = (((Math.atan2(p.y - m.y, p.x - m.x) - geo.startAngle) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      return fark <= geo.sweep + 1e-6 || fark >= 2 * Math.PI - 1e-6;
    }
    if (parca.type === 'polygon') {
      const kose = parca.pointIds.map(nk).filter(Boolean) as PointObject[];
      const y = kose.length >= 3 ? closestPointOnPolygonEdge(kose, p) : null;
      return !!y && y.distance < 1e-3;
    }
    return false;
  };
  return objects.map((o) => {
    if (o.type !== 'point' || o.onObjectId !== eskiHostId) return o;
    const yeni = parcalar.find((parca) => uzerinde(o, parca));
    if (yeni) return { ...o, onObjectId: yeni.id } as MathObject;
    const { onObjectId: _atilan, ...kalan } = o;
    return kalan as MathObject;
  });
}

/**
 * Bir nesneyi, üzerine nokta iz düşürmek için gereken sade geometrik biçime çevirir.
 * Desteklenmeyen tür için null döner (o türe nokta bağlanamaz).
 */
export function hostBicimi(o: MathObject, objects: MathObject[]): HostShape | null {
  const nk = (id: string) => objects.find((x) => x.id === id && x.type === 'point') as PointObject | undefined;
  if (o.type === 'segment') {
    const a = nk(o.startPointId);
    const b = nk(o.endPointId);
    return a && b ? { kind: 'segment', a, b } : null;
  }
  if (o.type === 'line') {
    const a = nk(o.point1Id);
    const b = nk(o.point2Id);
    return a && b ? { kind: 'line', a, b } : null;
  }
  if (o.type === 'ray') {
    const a = nk(o.startPointId);
    const b = nk(o.throughPointId);
    return a && b ? { kind: 'ray', a, b } : null;
  }
  if (o.type === 'circle') {
    try {
      const geometry = commandCircleGeometry(o, id => {
        const point = nk(id);
        if (!point) throw new Error('Eksik çember noktası');
        return point;
      });
      return geometry.radius > 0 ? { kind: 'circle', ...geometry } : null;
    } catch { return null; }
  }
  if (o.type === 'ellipse') {
    const merkez = nk(o.centerPointId);
    return merkez
      ? { kind: 'ellipse', center: merkez, radiusX: o.radiusX, radiusY: o.radiusY }
      : null;
  }
  if (o.type === 'arc' || o.type === 'sector') {
    const merkez = nk(o.centerPointId);
    const bas = nk(o.startPointId);
    if (!merkez || !bas) return null;
    const r = calculateDistance(merkez, bas);
    return r > 0 ? { kind: 'circle', center: merkez, radius: r } : null;
  }
  if (o.type === 'polygon') {
    const kose = o.pointIds.map(nk).filter(Boolean) as PointObject[];
    return kose.length >= 3 ? { kind: 'polygon', vertices: kose } : null;
  }
  return null;
}

/**
 * Bir nesnenin ÜZERİNDE oluşturulmuş noktaları, taşındıktan sonra o nesnenin
 * üzerine geri oturtur.
 *
 * Bu olmadan kullanıcı çember üzerindeki bir noktayı sürüklediğinde nokta
 * çemberden kopuyordu; oysa "nesne üzerinde nokta" tanımı gereği nesneden
 * ayrılmamalı, yalnızca onun ÜZERİNDE kaymalıdır.
 *
 * Taşıyıcılar bağımlılık sırasıyla çözülür. Kilitli bir merkez istenen
 * konuma gidemediğinde çemberdeki noktalar gerçek merkez hareketini izler.
 */
/**
 * Taşıyıcısı artık sahnede olmayan noktaların bağını çözer. Bağlantı kaldırma ya da eski bir
 * kayıt bir noktayı silinmiş nesneye asılı bırakırsa nokta gri çizilir ve menü "Kilit çöz"
 * der, oysa hiçbir şeye bağlı değildir. Sarkık bağ yoksa AYNI dizi döner.
 */
export function sarkikBaglariCoz(objects: MathObject[]): MathObject[] {
  const ids = new Set(objects.map((o) => o.id));
  const sarkik = (o: MathObject) => o.type === 'point' && !!o.onObjectId && !ids.has(o.onObjectId);
  if (!objects.some(sarkik)) return objects;
  return objects.map((o) => {
    if (!sarkik(o)) return o;
    const { onObjectId: _sarkik, ...serbest } = o as PointObject;
    return serbest as MathObject;
  });
}

export function bagliNoktalariOturt(objects: MathObject[], previous: MathObject[] = objects): MathObject[] {
  if (!objects.some(o => o.type === 'point' && o.onObjectId)) return objects;
  objects = sarkikBaglariCoz(objects);
  const resolved = new Map(objects.map(o => [o.id, o]));
  const visited = new Set<string>(), visiting = new Set<string>();
  const oldById = new Map(previous.map(o => [o.id, o]));
  const visit = (id: string) => {
    if (visited.has(id)) return;
    if (visiting.has(id)) throw new Error('Nokta bağlantılarında döngü var. Son geçerli çizim korundu.');
    const object = resolved.get(id);
    if (!object) return;
    visiting.add(id);
    for (const dependency of objectDependencies(object)) visit(dependency);
    if (object.type === 'point' && object.onObjectId) {
      const host = resolved.get(object.onObjectId);
      const shape = host && hostBicimi(host, [...resolved.values()]);
      if (shape) {
        let position: Point2D = object;
        if (shape.kind === 'circle') {
          const old = oldById.get(id);
          const unchanged = old?.type === 'point' && old.onObjectId === object.onObjectId && old.x === object.x && old.y === object.y;
          const sourceScene = unchanged ? previous : objects;
          const sourceHost = sourceScene.find(o => o.id === object.onObjectId);
          const sourceShape = sourceHost && hostBicimi(sourceHost, sourceScene);
          if (sourceShape?.kind === 'circle') {
            position = { x: shape.center.x + object.x - sourceShape.center.x, y: shape.center.y + object.y - sourceShape.center.y };
          }
        }
        const projected = projectOntoHost(position, shape);
        if (projected && Number.isFinite(projected.x) && Number.isFinite(projected.y)) {
          resolved.set(id, { ...object, x: projected.x, y: projected.y });
        }
      }
    }
    visiting.delete(id);
    visited.add(id);
  };
  for (const object of objects) visit(object.id);
  return objects.map(o => resolved.get(o.id)!);
}

/**
 * Birlikte ötelenen noktalardan biri, bu ötelemeyle BÜTÜN olarak kaymayan bir taşıyıcıya
 * (ör. sabit bir doğru ya da çember) KİLİTLİYSE öteleme vektörünü o nokta taşıyıcısında kalacak
 * biçimde kısıtlar. Bütün noktalar bu ORTAK vektörle kaydırılır; böylece şekil bozulmaz
 * (çemberin yarıçapı, parçanın boyu değişmez). Kilitleri birlikte sağlayan bir öteleme yoksa
 * sıfır vektör döner: şekil yerinde kalır.
 */
export function kilitliOtelemeVektoru(objects: MathObject[], pointIdsToShift: ReadonlySet<string>, delta: Point2D): Point2D {
  const byId = new Map(objects.map((o) => [o.id, o]));
  // Taşıyıcı taşınan bir noktaya (dolaylı da olsa) dayanıyorsa SABİT değildir; üzerindeki noktayı eskisi
  // gibi bagliNoktalariOturt yeniden oturtur (ör. çemberdeki Q ile merkezi birleştiren [OQ] sürüklenirken).
  // Kısıt yalnızca sabit taşıyıcılardan gelir; aksi hâlde vektör hareketli bir hedefi kovalayıp donuyordu.
  const kayanaDayanir = (id: string, gorulen = new Set<string>()): boolean => {
    if (pointIdsToShift.has(id)) return true;
    if (gorulen.has(id)) return false;
    gorulen.add(id);
    const o = byId.get(id);
    return !!o && objectDependencies(o).some((dep) => kayanaDayanir(dep, gorulen));
  };
  const kisitli = objects.filter(
    (o): o is PointObject =>
      o.type === 'point' && !!o.onObjectId && pointIdsToShift.has(o.id) && byId.has(o.onObjectId) && !kayanaDayanir(o.onObjectId)
  );
  if (kisitli.length === 0) return delta;
  const bicimler = new Map(kisitli.map((p) => [p.id, hostBicimi(byId.get(p.onObjectId!)!, objects)] as const));
  let d = delta;
  for (let tur = 0; tur < 16; tur++) {
    let hata = 0;
    for (const p of kisitli) {
      const shape = bicimler.get(p.id);
      const hedef = { x: p.x + d.x, y: p.y + d.y };
      const iz = shape ? projectOntoHost(hedef, shape) : null;
      if (!iz || !Number.isFinite(iz.x) || !Number.isFinite(iz.y)) continue;
      hata = Math.max(hata, Math.hypot(iz.x - hedef.x, iz.y - hedef.y));
      d = { x: iz.x - p.x, y: iz.y - p.y };
    }
    if (hata < 1e-7) return d;
  }
  return { x: 0, y: 0 };
}

/**
 * Taşınan noktaları BAĞLI gruplara ayırır (aynı nesnenin tanım noktaları ya da taşınan bir nesnenin
 * üzerinde duran noktalar) ve her gruba kendi kısıtlı öteleme vektörünü verir. Böylece seçimdeki
 * kilitli bir nokta, seçimdeki bağımsız başka şekilleri dondurmaz. Nokta kimliği → vektör.
 * `capa` verilirse sürüklemenin tutulduğu noktanın grubu `delta` yerine `capa.delta`yı ister: kısıtlı çapa
 * farenin gerisinde kalınca eksik kısmı yeniden ister, diğer gruplar ise yalnızca farenin gerçek adımını alır
 * (yoksa kilitli noktadan tutulan karışık seçimde serbest şekiller her karede fazladan kayıyordu).
 */
export function kilitliOtelemeler(
  objects: MathObject[],
  pointIdsToShift: ReadonlySet<string>,
  delta: Point2D,
  capa?: { id: string; delta: Point2D },
  tutulanlar?: ReadonlySet<string>
): Map<string, Point2D> {
  const sonuc = new Map<string, Point2D>();
  const byId = new Map(objects.map((o) => [o.id, o]));
  const kilitli = (id: string) => {
    const p = byId.get(id);
    return p?.type === 'point' && !!p.onObjectId;
  };
  if (![...pointIdsToShift].some(kilitli)) {
    for (const id of pointIdsToShift) sonuc.set(id, delta);
    return sonuc;
  }
  const kok = new Map<string, string>();
  for (const id of pointIdsToShift) kok.set(id, id);
  const bul = (id: string): string => {
    let k = id;
    while (kok.get(k) !== k) k = kok.get(k)!;
    return k;
  };
  const birlestir = (ids: string[]) => {
    const kayanlar = ids.filter((id) => pointIdsToShift.has(id));
    for (const id of kayanlar.slice(1)) kok.set(bul(id), bul(kayanlar[0]));
  };
  // Ölçüm/açı etiketleri ve etkileşim bileşenleri şekil DEĞİLDİR: bir eğim etiketi serbest üçgeni kilitli noktaya
  // bağlayıp üçgeni dondurmasın. Grupları gerçek şekiller, üzerinde durulan taşıyıcılar ve KENDİSİ sürüklenen açı
  // nesnesi kurar (moveObjects yalnızca açının noktalarını taşır; kolları birlikte kaymazsa açı bozulur). Seçimdeki
  // ölçüm etiketi ya da onay kutusu noktalarını taşımadığından grup bağlamaz.
  const ETIKET_TURLERI = new Set<string>(['measurement', 'angle', 'checkbox', 'button', 'input_box']);
  for (const o of objects) {
    if (ETIKET_TURLERI.has(o.type) && !(o.type === 'angle' && tutulanlar?.has(o.id))) continue;
    if (o.type !== 'point') birlestir(objectDependencies(o));
    else if (o.onObjectId && byId.has(o.onObjectId)) birlestir([o.id, ...objectDependencies(byId.get(o.onObjectId)!)]);
  }
  const gruplar = new Map<string, Set<string>>();
  for (const id of pointIdsToShift) {
    const k = bul(id);
    if (!gruplar.has(k)) gruplar.set(k, new Set());
    gruplar.get(k)!.add(id);
  }
  for (const grup of gruplar.values()) {
    const istek = capa && grup.has(capa.id) ? capa.delta : delta;
    const v = [...grup].some(kilitli) ? kilitliOtelemeVektoru(objects, grup, istek) : istek;
    for (const id of grup) sonuc.set(id, v);
  }
  return sonuc;
}

/**
 * Bir nesnenin doğrudan BAĞLI OLDUĞU nesnelerin kimlikleri.
 *
 * Tek yerde toplanır ki yeni bir nesne türü eklendiğinde silme, bu listeye
 * eklenmediği için sessizce eksik kalmasın (elips, ölçüm etiketi ve etkileşim
 * bileşenleri tam olarak bu yüzden atlanıyordu: şekil silinince etiketleri
 * ekranda kalıyordu).
 */
export function objectDependencies(o: MathObject): string[] {
  switch (o.type) {
    case 'segment':
      return [o.startPointId, o.endPointId];
    case 'line':
      return [o.point1Id, o.point2Id];
    case 'ray':
      return [o.startPointId, o.throughPointId];
    case 'circle':
      return o.throughPointIds && o.throughPointIds.length > 0
        ? [...o.throughPointIds, ...(o.radiusPointId ? [o.radiusPointId] : [])]
        : [o.centerPointId, ...(o.radiusPointId ? [o.radiusPointId] : [])];
    case 'ellipse':
      return [o.centerPointId];
    case 'arc':
    case 'sector':
      return [o.centerPointId, o.startPointId, o.directionPointId];
    case 'angle':
      return [o.point1Id, o.vertexPointId, o.point3Id];
    case 'polygon':
      return o.pointIds;
    case 'measurement':
      return o.pointIds;
    case 'checkbox':
      return o.targetIds;
    case 'button': {
      const act = o.action;
      if (act.kind === 'toggle') return act.targetIds;
      if (act.kind === 'animate') return [...(act.sliderIds ?? []), ...(act.targetIds ?? [])];
      if (act.kind === 'setSlider') return [act.sliderId];
      if (act.kind === 'setValue') return [act.targetId];
      return [];
    }
    case 'input_box':
      return [o.targetId];
    case 'point':
      // Bir nesnenin ÜZERİNDE duran nokta, o nesneye bağlıdır
      return [...(o.onObjectId ? [o.onObjectId] : []), ...constructionDependencies(o)];
    default:
      return [];
  }
}

/**
 * Silinecek nesnelerle birlikte kaldırılması gerekenlerin tamamı.
 *
 * İki kural birlikte çalışır:
 *  1. BAĞIMLILIK: bir nesne, silinen bir nesneye dayanıyorsa o da silinir (geçişli).
 *     Böylece hiçbir nesne var olmayan bir noktaya işaret eder hâlde kalmaz.
 *  2. ŞEKLE AİT ETİKETLER: bir ŞEKİL silindiğinde, yalnızca o şeklin noktalarını
 *     kullanan açı ve ölçüm etiketleri de silinir. Üçgeni silen kullanıcı, üçgenin
 *     açısının ekranda kalmasını beklemez. Noktalar korunur: bağımsız nesnelerdir.
 */
export function collectDependentIds(objects: MathObject[], ids: string[]): Set<string> {
  const removal = new Set<string>(ids);

  // 1) Geçişli bağımlılık
  let changed = true;
  while (changed) {
    changed = false;
    for (const o of objects) {
      if (removal.has(o.id)) continue;
      if (objectDependencies(o).some((d) => removal.has(d))) {
        removal.add(o.id);
        changed = true;
      }
    }
  }

  // 2) Silinen ŞEKİLLERİN noktaları
  const sekilNoktalari = new Set<string>();
  for (const o of objects) {
    if (!removal.has(o.id)) continue;
    if (o.type === 'point' || o.type === 'angle' || o.type === 'measurement') continue;
    for (const d of objectDependencies(o)) {
      if (objects.some((x) => x.id === d && x.type === 'point')) sekilNoktalari.add(d);
    }
  }

  if (sekilNoktalari.size > 0) {
    let degisti = true;
    while (degisti) {
      degisti = false;
      for (const o of objects) {
        if (removal.has(o.id)) continue;
        if (o.type !== 'angle' && o.type !== 'measurement') continue;
        const kullandigi = objectDependencies(o);
        // Etiket YALNIZCA silinen şeklin noktalarını kullanıyorsa o şekle aittir
        if (kullandigi.length > 0 && kullandigi.every((d) => sekilNoktalari.has(d))) {
          removal.add(o.id);
          degisti = true;
        }
      }
    }
  }

  // Silinen çemberin artık hiçbir nesnede kullanılmayan merkezi sahnede kalmasın.
  // Ortak merkezler ve başka inşaların kullandığı noktalar korunur.
  const centers = new Set(objects.flatMap(o =>
    o.type === 'circle' && removal.has(o.id) && !o.throughPointIds?.length ? [o.centerPointId] : []));
  let centerRemoved = true;
  while (centerRemoved) {
    centerRemoved = false;
    for (const id of centers) {
      if (removal.has(id) || !objects.some(o => o.id === id && o.type === 'point')) continue;
      const inUse = objects.some(o => !removal.has(o.id) && o.id !== id && objectDependencies(o).includes(id));
      if (!inUse) { removal.add(id); centerRemoved = true; }
    }
  }
  return removal;
}

/**
 * Bir şekli vektör kadar ötelenmiş KOPYASINA çevirir.
 *
 * Öteleme bir izometridir: şeklin biçimi ve boyutu değişmez, yalnızca yeri kayar.
 * Bu yüzden şeklin tanım noktalarının kopyaları üretilip yeni şekil bunlara bağlanır;
 * özgün şekil olduğu gibi kalır (9. sınıf dönüşüm konusunda "görüntü" budur).
 *
 * Desteklenmeyen tür için null döner.
 */
function oteleSekil(
  hedef: MathObject,
  vektor: Point2D,
  objs: MathObject[],
  noktaUret: (x: number, y: number, renk?: string) => PointObject
): MathObject[] | null {
  const noktaBul = (id: string) =>
    objs.find((o) => o.id === id && o.type === 'point') as PointObject | undefined;

  /** Verilen nokta kimliklerinin ötelenmiş kopyalarını üretir; eşleme tablosuyla döner. */
  const kopyala = (ids: string[]): { yeniler: PointObject[]; esleme: Map<string, string> } | null => {
    const yeniler: PointObject[] = [];
    const esleme = new Map<string, string>();
    for (const id of ids) {
      const p = noktaBul(id);
      if (!p) return null;
      const yeni = noktaUret(p.x + vektor.x, p.y + vektor.y, '#9333ea');
      yeni.label = `${p.label}'`;
      yeniler.push(yeni);
      esleme.set(id, yeni.id);
    }
    return { yeniler, esleme };
  };

  const ortak = { visible: true, showLabel: true, createdAt: Date.now(), color: '#9333ea' };

  if (hedef.type === 'polygon') {
    const k = kopyala(hedef.pointIds);
    if (!k) return null;
    return [
      ...k.yeniler,
      {
        ...ortak,
        id: createId('poly'),
        type: 'polygon',
        label: `${hedef.label || 'Çokgen'} (öteleme)`,
        pointIds: hedef.pointIds.map((id) => k.esleme.get(id) as string),
        fillColor: '#9333ea',
        fillOpacity: 0.15,
      } as MathObject,
    ];
  }

  if (hedef.type === 'segment') {
    const k = kopyala([hedef.startPointId, hedef.endPointId]);
    if (!k) return null;
    return [
      ...k.yeniler,
      {
        ...ortak,
        id: createId('seg'),
        type: 'segment',
        label: `${hedef.label || 'Doğru Parçası'} (öteleme)`,
        startPointId: k.esleme.get(hedef.startPointId) as string,
        endPointId: k.esleme.get(hedef.endPointId) as string,
      } as MathObject,
    ];
  }

  if (hedef.type === 'circle') {
    const merkezId = hedef.centerPointId;
    const ids = [merkezId, hedef.radiusPointId].filter(Boolean) as string[];
    const k = kopyala(ids.length ? ids : []);
    if (!k) return null;
    return [
      ...k.yeniler,
      {
        ...ortak,
        id: createId('circ'),
        type: 'circle',
        label: `${hedef.label || 'Çember'} (öteleme)`,
        centerPointId: k.esleme.get(merkezId) as string,
        radiusPointId: hedef.radiusPointId ? (k.esleme.get(hedef.radiusPointId) as string) : undefined,
        fixedRadius: hedef.fixedRadius,
        fillOpacity: hedef.fillOpacity ?? 0.08,
      } as MathObject,
    ];
  }

  if (hedef.type === 'ellipse') {
    const k = kopyala([hedef.centerPointId]);
    if (!k) return null;
    return [
      ...k.yeniler,
      {
        ...ortak,
        id: createId('elp'),
        type: 'ellipse',
        label: `${hedef.label || 'Elips'} (öteleme)`,
        centerPointId: k.esleme.get(hedef.centerPointId) as string,
        radiusX: hedef.radiusX,
        radiusY: hedef.radiusY,
        rotation: hedef.rotation,
        fillColor: '#9333ea',
        fillOpacity: hedef.fillOpacity ?? 0.12,
      } as MathObject,
    ];
  }

  if (hedef.type === 'arc' || hedef.type === 'sector') {
    const k = kopyala([hedef.centerPointId, hedef.startPointId, hedef.directionPointId]);
    if (!k) return null;
    const taban = {
      ...ortak,
      centerPointId: k.esleme.get(hedef.centerPointId) as string,
      startPointId: k.esleme.get(hedef.startPointId) as string,
      directionPointId: k.esleme.get(hedef.directionPointId) as string,
    };
    return [
      ...k.yeniler,
      hedef.type === 'arc'
        ? ({ ...taban, id: createId('arc'), type: 'arc', label: `${hedef.label || 'Yay'} (öteleme)` } as MathObject)
        : ({
            ...taban,
            id: createId('sec'),
            type: 'sector',
            label: `${hedef.label || 'Daire Dilimi'} (öteleme)`,
            fillColor: '#9333ea',
            fillOpacity: 0.3,
          } as MathObject),
    ];
  }

  if (hedef.type === 'point') {
    const yeni = noktaUret(hedef.x + vektor.x, hedef.y + vektor.y, '#9333ea');
    yeni.label = `${hedef.label}'`;
    return [yeni];
  }

  return null;
}

/** LocalStorage'daki serbest çalışma kaydını doğrulayarak okur. */
function loadSavedSandboxObjects(): MathObject[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.version !== WORKSPACE_STORAGE_VERSION) return null;
    if (!Array.isArray(parsed.objects)) return null;
    const valid = (parsed.objects as unknown[]).filter(
      (o): o is MathObject =>
        !!o &&
        typeof o === 'object' &&
        typeof (o as MathObject).id === 'string' &&
        KNOWN_OBJECT_TYPES.has((o as MathObject).type)
    );
    return sarkikBaglariCoz(eskiMerkezAcilariniTasi(valid));
  } catch (e) {
    return null;
  }
}

/**
 * ESKİ KAYITLARI ONARIR.
 *
 * Eskiden "Açısını ölç (merkez açı)" yay/dilim için AYRI bir AngleObject üretiyordu.
 * Artık merkez açı şeklin kendi `showCentralAngle` bayrağıyla gösteriliyor. Eski
 * belgeler açıldığında ikisi birden çizilirse aynı açı için İKİ rozet oluşur:
 * kullanıcı birine tıklayıp gizliyor, öteki ekranda kalıyor ("tıklıyorum gizlenmiyor").
 *
 * Üstelik yarım çemberde eski rozet YANLIŞ TARAFTA duruyordu: merkez, başlangıç ve
 * bitiş noktaları doğrusal olduğu için açı 180° oluyor ve "en kısa dönüş" kuralı
 * yayın hangi tarafta olduğunu bilemiyor. Şeklin kendi taraması bunu bildiğinden
 * doğru gösterim yeni yoldur.
 *
 * Bu yüzden eski merkez açı nesneleri kaldırılır ve görünürlükleri şekle aktarılır.
 */
export function eskiMerkezAcilariniTasi(objects: MathObject[]): MathObject[] {
  const yaylar = objects.filter((o) => o.type === 'arc' || o.type === 'sector') as (
    | ArcObject
    | SectorObject
  )[];
  if (yaylar.length === 0) return objects;

  const kaldirilacak = new Map<string, boolean>(); // açı id -> showValue

  for (const y of yaylar) {
    for (const o of objects) {
      if (o.type !== 'angle') continue;
      const a = o as AngleObject;
      if (a.vertexPointId !== y.centerPointId) continue;
      const kollar = [a.point1Id, a.point3Id].sort().join('|');
      const yayKollari = [y.startPointId, y.directionPointId].sort().join('|');
      if (kollar !== yayKollari) continue;
      kaldirilacak.set(a.id, a.showValue !== false);
    }
  }
  if (kaldirilacak.size === 0) return objects;

  return objects
    .filter((o) => !kaldirilacak.has(o.id))
    .map((o) => {
      if (o.type !== 'arc' && o.type !== 'sector') return o;
      const y = o as ArcObject | SectorObject;
      const eslesen = objects.find(
        (x) =>
          x.type === 'angle' &&
          kaldirilacak.has(x.id) &&
          (x as AngleObject).vertexPointId === y.centerPointId
      ) as AngleObject | undefined;
      if (!eslesen) return o;
      return { ...y, showCentralAngle: kaldirilacak.get(eslesen.id) } as MathObject;
    });
}

// ---------------------------------------------------------------------------
// Nesne + Geçmiş Durum Makinesi (Tek atomik "commit" yolu)
// ---------------------------------------------------------------------------

interface DocState {
  constraintError?: string | null;
  objects: MathObject[];
  history: WorkspaceHistoryStep[];
  historyIndex: number;
  persist: boolean; // Serbest çalışma masasında LocalStorage'a kaydedilsin mi
}

type DocAction =
  | { type: 'commit'; next: ObjectsUpdater; description: string }
  | { type: 'set'; next: React.SetStateAction<MathObject[]> }
  | { type: 'record'; description: string }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'reset'; objects: MathObject[]; description: string; persist: boolean };

const initialDocState: DocState = {
  objects: [],
  history: [],
  historyIndex: -1,
  persist: false,
};

function resolveUpdater(next: ObjectsUpdater, prev: MathObject[]): MathObject[] {
  return bagliNoktalariOturt(resolveCommandBindings(typeof next === 'function' ? next(prev) : next), prev);
}

function appendHistory(state: DocState, objects: MathObject[], description: string): DocState {
  const base = state.history.slice(0, state.historyIndex + 1);
  base.push({ objects, description, timestamp: Date.now() });
  const trimmed = base.length > MAX_HISTORY_LENGTH ? base.slice(base.length - MAX_HISTORY_LENGTH) : base;
  return {
    ...state,
    objects,
    history: trimmed,
    historyIndex: trimmed.length - 1,
    constraintError: null,
  };
}

function docReducer(state: DocState, action: DocAction): DocState {
  try {
  switch (action.type) {
    case 'commit': {
      const nextObjects = resolveUpdater(action.next, state.objects);
      // Hiçbir şey değişmediyse geçmişe boş bir adım yazma (ör. aynı ölçümü ikinci kez istemek):
      // aksi hâlde Ctrl+Z hiçbir şey yapmıyormuş gibi görünür.
      if (nextObjects === state.objects) return state;
      return appendHistory(state, nextObjects, action.description);
    }
    case 'set': {
      const nextObjects = resolveUpdater(action.next, state.objects);
      if (nextObjects === state.objects) return state;
      return { ...state, objects: nextObjects, constraintError: null };
    }
    case 'record': {
      const current = state.history[state.historyIndex];
      if (current && current.objects === state.objects) return state;
      return appendHistory(state, state.objects, action.description);
    }
    case 'undo': {
      if (state.historyIndex <= 0) return state;
      const idx = state.historyIndex - 1;
      return { ...state, historyIndex: idx, objects: state.history[idx].objects, constraintError: null };
    }
    case 'redo': {
      if (state.historyIndex >= state.history.length - 1) return state;
      const idx = state.historyIndex + 1;
      return { ...state, historyIndex: idx, objects: state.history[idx].objects, constraintError: null };
    }
    case 'reset': {
      return {
        objects: action.objects,
        history: [{ objects: action.objects, description: action.description, timestamp: Date.now() }],
        historyIndex: 0,
        persist: action.persist,
      };
    }
    default:
      return state;
  }
  } catch (error) {
    return { ...state, constraintError: error instanceof Error ? error.message : 'Geometrik ilişki geçersiz.' };
  }
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { selectedActivity } = useCurriculum();

  const [doc, dispatch] = useReducer(docReducer, initialDocState);
  const { objects, history, historyIndex } = doc;

  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
  const selectedObjectId = selectedObjectIds[0] || null;

  const [activeTool, setActiveToolState] = useState<ToolMode>('select');
  const [viewport, setViewport] = useState<ViewportTransform>(DEFAULT_VIEWPORT);
  // Stil ayarları tarayıcıda saklanır: sayfa yenilendiğinde kullanıcının seçimi korunur.
  // Sunucuda localStorage yok, bu yüzden varsayılanla başlanır ve okuma bağlanma anında yapılır.
  const [styleSettings, setStyleSettings] = useState<StyleSettings>(DEFAULT_STYLE_SETTINGS);
  const okunanStilRef = useRef<StyleSettings | null>(null);

  useEffect(() => {
    const kayitli = loadStyleSettings();
    okunanStilRef.current = kayitli;
    setStyleSettings(kayitli);
  }, []);

  useEffect(() => {
    const okunan = okunanStilRef.current;
    // Henüz okumadıysak yazma.
    if (!okunan) return;
    // Okuma yapıldı ama state'e HENÜZ yansımadıysa yazma: aksi hâlde bu efekt,
    // aynı commit'te hâlâ varsayılan olan durumu kaydın üzerine yazıp ayarları siliyordu.
    if (styleSettings === DEFAULT_STYLE_SETTINGS && okunan !== DEFAULT_STYLE_SETTINGS) return;
    try {
      localStorage.setItem(STYLE_STORAGE_KEY, JSON.stringify(styleSettings));
    } catch {}
  }, [styleSettings]);
  const [pendingPointIds, setPendingPointIds] = useState<string[]>([]);
  const [activityCompleted, setActivityCompleted] = useState<boolean>(false);
  const [activeSuccessMessage, setActiveSuccessMessage] = useState<string | null>(null);
  const [hintMessage, setHintMessageState] = useState<string | null>(null);
  const [studioDimension, setStudioDimension] = useState<'2D' | '3D'>('2D');
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState<boolean>(false);
  const [confirmClearTargetDim, setConfirmClearTargetDim] = useState<'2D' | '3D'>('2D');
  const [isRegularPolygonDialogOpen, setIsRegularPolygonDialogOpen] = useState<boolean>(false);
  const [regularPolygonPos, setRegularPolygonPos] = useState<Point2D>({ x: 0, y: 0 });
  const [valuePrompt, setValuePrompt] = useState<ValuePromptRequest | null>(null);
  const [isCircleRadiusDialogOpen, setIsCircleRadiusDialogOpen] = useState<boolean>(false);
  const [circleRadiusPos, setCircleRadiusPos] = useState<Point2D>({ x: 0, y: 0 });

  // Olay işleyicilerinin her zaman güncel durumu görmesi için "en son değer" referansı
  const latest = useRef({
    objects,
    activeTool,
    pendingPointIds,
    selectedObjectIds,
    viewport,
    studioDimension,
  });
  latest.current = { objects, activeTool, pendingPointIds, selectedObjectIds, viewport, studioDimension };

  const setSelectedObjectId = useCallback((id: string | null) => {
    setSelectedObjectIds(id ? [id] : []);
  }, []);

  const setHintMessage = useCallback((message: string | null) => {
    setHintMessageState(message);
  }, []);

  // İpucu mesajını birkaç saniye sonra otomatik gizle
  useEffect(() => {
    if (!hintMessage) return;
    const timer = window.setTimeout(() => setHintMessageState(null), 3500);
    return () => window.clearTimeout(timer);
  }, [hintMessage]);

  const openRegularPolygonDialog = useCallback((pos?: Point2D) => {
    setRegularPolygonPos(pos ?? { x: 0, y: 0 });
    setIsRegularPolygonDialogOpen(true);
  }, []);

  const openCircleRadiusDialog = useCallback((pos?: Point2D) => {
    setCircleRadiusPos(pos ?? { x: 0, y: 0 });
    setIsCircleRadiusDialogOpen(true);
  }, []);

  // Çalışma alanını onay ile temizleme isteği başlatma
  const requestClearAll = useCallback((dim?: '2D' | '3D') => {
    setConfirmClearTargetDim(dim || latest.current.studioDimension);
    setIsConfirmClearOpen(true);
  }, []);

  // Etkinlik değiştiğinde nesneleri yükle / serbest masada kayıtlı çalışmayı geri getir
  useEffect(() => {
    setSelectedObjectIds([]);
    setPendingPointIds([]);
    setActivityCompleted(false);
    setActiveSuccessMessage(null);
    setHintMessageState(null);
    setActiveToolState('select');

    if (selectedActivity) {
      const initial = JSON.parse(JSON.stringify(selectedActivity.initialObjects)) as MathObject[];
      dispatch({
        type: 'reset',
        objects: initial,
        description: `${selectedActivity.title} etkinliği yüklendi`,
        persist: false,
      });

      setViewport((prev) => ({
        ...prev,
        panX: 0,
        panY: 0,
        zoom: DEFAULT_ZOOM,
        ...(selectedActivity.initialViewport || {}),
      }));
    } else {
      // Serbest Çalışma Masası: her zaman temiz/boş çalışma alanı ile başla
      dispatch({
        type: 'reset',
        objects: [],
        description: 'Boş çalışma alanı',
        persist: true,
      });
    }
  }, [selectedActivity]);

  // Serbest çalışma masasında her değişikliği LocalStorage'a kaydet
  useEffect(() => {
    if (!doc.persist) return;
    try {
      localStorage.setItem(
        WORKSPACE_STORAGE_KEY,
        JSON.stringify({ objects, version: WORKSPACE_STORAGE_VERSION })
      );
    } catch (e) {}
  }, [objects, doc.persist]);

  // Etkinlik doğrulaması (Deterministik Kural Motoru)
  useEffect(() => {
    if (!selectedActivity || selectedActivity.validationRules.length === 0) return;
    if (activityCompleted) return;

    const byId = new Map(objects.map((o) => [o.id, o]));
    const pointOf = (id: string) => {
      const p = byId.get(id);
      return p && p.type === 'point' ? (p as PointObject) : undefined;
    };

    const succeed = (message: string) => {
      setActivityCompleted(true);
      setActiveSuccessMessage(message);
      try {
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      } catch (e) {}
    };

    for (const rule of selectedActivity.validationRules) {
      if (rule.type === 'segment_length_equals') {
        const targetSeg = objects.find(
          (o) => o.type === 'segment' && (!rule.targetIds || rule.targetIds.includes(o.id))
        ) as SegmentObject | undefined;

        if (targetSeg) {
          const p1 = pointOf(targetSeg.startPointId);
          const p2 = pointOf(targetSeg.endPointId);
          if (p1 && p2) {
            const dist = calculateDistance(p1, p2);
            if (rule.expectedValue !== undefined && Math.abs(dist - rule.expectedValue) <= (rule.tolerance ?? 0.15)) {
              succeed(rule.successMessage);
              return;
            }
          }
        }
      } else if (rule.type === 'angle_sum_equals') {
        const angles = objects.filter((o) => o.type === 'angle') as AngleObject[];
        if (angles.length >= 3) {
          let sum = 0;
          let valid = true;
          for (const ang of angles) {
            const p1 = pointOf(ang.point1Id);
            const vertex = pointOf(ang.vertexPointId);
            const p3 = pointOf(ang.point3Id);
            if (p1 && vertex && p3) {
              sum += calculateAngleDegrees(p1, vertex, p3);
            } else {
              valid = false;
            }
          }
          if (valid && rule.expectedValue !== undefined && Math.abs(sum - rule.expectedValue) <= (rule.tolerance ?? 2)) {
            succeed(rule.successMessage);
            return;
          }
        }
      } else if (rule.type === 'circle_radius_equals') {
        const circ = objects.find(
          (o) => o.type === 'circle' && (!rule.targetIds || rule.targetIds.includes(o.id))
        ) as CircleObject | undefined;
        if (circ) {
          const center = pointOf(circ.centerPointId);
          let radius = circ.fixedRadius ?? 0;
          if (circ.radiusPointId) {
            const rPoint = pointOf(circ.radiusPointId);
            if (center && rPoint) {
              radius = calculateDistance(center, rPoint);
            }
          }
          if (rule.expectedValue !== undefined && Math.abs(radius - rule.expectedValue) <= (rule.tolerance ?? 0.15)) {
            succeed(rule.successMessage);
            return;
          }
        }
      } else if (rule.type === 'custom') {
        // Kaydırıcı veya genel kural kontrolü
        const sliders = objects.filter((o) => o.type === 'slider') as SliderObject[];
        const targetSlider = sliders.find((s) => s.variableName === 'a');
        if (targetSlider && rule.expectedValue !== undefined) {
          if (Math.abs(targetSlider.value - rule.expectedValue) <= (rule.tolerance ?? 0.1)) {
            succeed(rule.successMessage);
            return;
          }
        }
      }
    }
  }, [objects, selectedActivity, activityCompleted]);

  // -------------------------------------------------------------------------
  // Temel nesne eylemleri (hepsi tek "commit" yolundan geçer)
  // -------------------------------------------------------------------------

  const commit = useCallback((next: ObjectsUpdater, description: string) => {
    dispatch({ type: 'commit', next, description });
  }, []);

  // Geçmişe kaydetmeden nesneleri değiştirme (sürükleme, kaydırıcı gibi geçici işlemler)
  const setObjects = useCallback<React.Dispatch<React.SetStateAction<MathObject[]>>>((next) => {
    dispatch({ type: 'set', next });
  }, []);

  const addObject = useCallback(
    (obj: MathObject, historyLabel?: string) => {
      commit((prev) => [...prev, obj], historyLabel ?? `${describeObject(obj)} eklendi`);
    },
    [commit]
  );

  const addObjects = useCallback(
    (objs: MathObject[], description?: string) => {
      if (objs.length === 0) return;
      const desc =
        description ??
        (objs.length === 1 ? `${describeObject(objs[0])} eklendi` : `${objs.length} nesne eklendi`);
      commit((prev) => [...prev, ...objs], desc);
    },
    [commit]
  );

  const updateObject = useCallback(
    (id: string, updates: Partial<MathObject>, recordHistory = true) => {
      const updater = (prev: MathObject[]) =>
        prev.map((o) => (o.id === id ? ({ ...o, ...updates } as MathObject) : o));
      if (recordHistory) {
        const target = latest.current.objects.find((o) => o.id === id);
        commit(updater, `${describeObject(target)} güncellendi`);
      } else {
        dispatch({ type: 'set', next: updater });
      }
    },
    [commit]
  );

  const deleteObjects = useCallback(
    (ids: string[], description?: string) => {
      if (ids.length === 0) return;
      const currentObjects = latest.current.objects;
      const removal = collectDependentIds(currentObjects, ids);
      if (removal.size === 0) return;

      const targets = ids.map((id) => currentObjects.find((o) => o.id === id)).filter(Boolean) as MathObject[];
      const desc =
        description ??
        (targets.length === 1
          ? `${describeObject(targets[0])} silindi`
          : `${targets.length || ids.length} nesne silindi`);

      commit((prev) => {
        const set = collectDependentIds(prev, ids);
        return prev.filter((o) => !set.has(o.id));
      }, desc);

      setSelectedObjectIds((prev) => (prev.some((id) => removal.has(id)) ? prev.filter((id) => !removal.has(id)) : prev));
      setPendingPointIds((prev) => (prev.some((id) => removal.has(id)) ? prev.filter((id) => !removal.has(id)) : prev));
    },
    [commit]
  );

  const deleteObject = useCallback(
    (id: string) => {
      deleteObjects([id]);
    },
    [deleteObjects]
  );

  const clearWorkspace = useCallback(() => {
    commit([], 'Çalışma alanı temizlendi');
    setSelectedObjectIds([]);
    setPendingPointIds([]);
  }, [commit]);

  const resetViewport = useCallback(() => {
    setViewport((prev) => ({
      ...prev,
      zoom: DEFAULT_ZOOM,
      panX: 0,
      panY: 0,
    }));
  }, []);

  // Nokta sürükleme (geçmişe yazmaz; sürükleme bitince recordHistory çağrılmalı)
  const handlePointDrag = useCallback((pointId: string, newWorldPos: Point2D) => {
    const pos = snapToVisibleGrid(newWorldPos, latest.current.viewport);
    dispatch({
      type: 'set',
      next: (prev) =>
        prev.map((o) => (o.id === pointId && o.type === 'point' ? { ...o, x: pos.x, y: pos.y } : o)),
    });
  }, []);

  // Çoklu Nesne Taşıma (Seçim alanındaki tüm nesneleri birlikte kaydırma)
  const moveObjects = useCallback(
    (objectIds: string[], delta: Point2D, recordHistory = false, capa?: { id: string; delta: Point2D }) => {
      if ((delta.x === 0 && delta.y === 0) || objectIds.length === 0) return;

      const updater = (prev: MathObject[]) => {
        const objectIdSet = new Set(objectIds);
        const pointIdsToShift = new Set<string>();

        // Taşınacak tüm köşe ve nokta ID'lerini topla (çift kaydırmayı önler)
        prev.forEach((o) => {
          if (!objectIdSet.has(o.id)) return;

          if (o.type === 'point') {
            pointIdsToShift.add(o.id);
          } else if (o.type === 'polygon') {
            o.pointIds.forEach((pid) => pointIdsToShift.add(pid));
          } else if (o.type === 'segment') {
            pointIdsToShift.add(o.startPointId);
            pointIdsToShift.add(o.endPointId);
          } else if (o.type === 'line') {
            pointIdsToShift.add(o.point1Id);
            pointIdsToShift.add(o.point2Id);
          } else if (o.type === 'ray') {
            pointIdsToShift.add(o.startPointId);
            pointIdsToShift.add(o.throughPointId);
          } else if (o.type === 'circle') {
            pointIdsToShift.add(o.centerPointId);
            if (o.radiusPointId) pointIdsToShift.add(o.radiusPointId);
            // Üç noktadan geçen çemberde merkez/yarıçap bu noktalardan hesaplanır;
            // onları kaydırmazsak çember sürüklendiğinde yerinde kalıyordu.
            o.throughPointIds?.forEach((pid) => pointIdsToShift.add(pid));
          } else if (o.type === 'ellipse') {
            pointIdsToShift.add(o.centerPointId);
          } else if (o.type === 'arc' || o.type === 'sector') {
            // Yay ve daire dilimi üç noktayla tanımlıdır; üçü birlikte kaymazsa şekil bozulur.
            pointIdsToShift.add(o.centerPointId);
            pointIdsToShift.add(o.startPointId);
            pointIdsToShift.add(o.directionPointId);
          } else if (o.type === 'angle') {
            pointIdsToShift.add(o.point1Id);
            pointIdsToShift.add(o.vertexPointId);
            pointIdsToShift.add(o.point3Id);
          }
        });

        // Bir nesne BÜTÜN olarak ötelendiğinde (tüm tanım noktaları kayıyorsa)
        // üzerindeki noktalar da aynı miktarda kaymalıdır. Aksi hâlde çember
        // sürüklenince üzerindeki C ve D yerinde kalıp şekilden düşüyordu.
        for (let tur = 0; tur < prev.length; tur++) {
          const butunKayanlar = new Set<string>();
          prev.forEach((o) => {
            if (o.type === 'point') return;
            const tanim = objectDependencies(o).filter((id) =>
              prev.some((x) => x.id === id && x.type === 'point')
            );
            if (tanim.length > 0 && tanim.every((id) => pointIdsToShift.has(id))) {
              butunKayanlar.add(o.id);
            }
          });
          let eklendi = false;
          prev.forEach((o) => {
            if (o.type !== 'point') return;
            const p = o as PointObject;
            if (!p.onObjectId || pointIdsToShift.has(p.id)) return;
            if (!butunKayanlar.has(p.onObjectId)) return;
            pointIdsToShift.add(p.id);
            eklendi = true;
          });
          if (!eklendi) break;
        }

        // Kilitli bir tanım noktası (ör. doğruya kilitli merkez) sabit taşıyıcısından çıkamaz: her bağlı
        // şekil grubunun öteleme vektörü kısıtlanır ve grubun TÜM noktaları aynı vektörle kayar. Aksi hâlde
        // yalnız kilitli nokta geri oturtuluyor, yarıçap noktası tam kaydığı için çember her karede büyüyordu.
        // Gruplar ayrı tutulur ki seçimdeki kilitli bir nokta, seçimdeki bağımsız şekilleri dondurmasın.
        const vektorler = kilitliOtelemeler(prev, pointIdsToShift, delta, capa, objectIdSet);
        let kaydi = false;
        const kaydirilmis = prev.map((o) => {
          if (o.type === 'point' && pointIdsToShift.has(o.id)) {
            const v = vektorler.get(o.id) ?? delta;
            if (v.x === 0 && v.y === 0) return o;
            kaydi = true;
            return { ...o, x: o.x + v.x, y: o.y + v.y };
          }
          if (objectIdSet.has(o.id)) {
            if (o.type === 'text' || o.type === 'fraction' || o.type === 'image') {
              kaydi = true;
              return { ...o, x: o.x + delta.x, y: o.y + delta.y } as MathObject;
            }
            if (o.type === 'pen') {
              kaydi = true;
              return {
                ...o,
                points: o.points.map((p) => ({ x: p.x + delta.x, y: p.y + delta.y })),
              };
            }
          }
          return o;
        });
        if (!kaydi) return prev;

        // Kalan bağlı noktalar (taşıyıcısı biçim değiştirmiş olanlar) nesnenin
        // üzerine geri oturtulur: nesneden kopmaz, yalnızca üzerinde kayarlar.
        return kaydirilmis;
      };

      if (recordHistory) {
        const labels = objectIds
          .map((id) => latest.current.objects.find((o) => o.id === id))
          .filter(Boolean)
          .map((o) => describeObject(o));
        const desc =
          labels.length === 1 ? `${labels[0]} taşındı` : `${objectIds.length} nesne taşındı`;
        commit(updater, desc);
      } else {
        dispatch({ type: 'set', next: updater });
      }
    },
    [commit]
  );

  const moveObject = useCallback(
    (objectId: string, delta: Point2D, recordHistory = false) => {
      moveObjects([objectId], delta, recordHistory);
    },
    [moveObjects]
  );

  // Mevcut (güncel) nesne durumunu geçmişe kaydet
  const recordHistory = useCallback((description: string) => {
    dispatch({ type: 'record', description });
  }, []);

  // Kaydırıcı değişimi (geçmişe yazmaz)
  const handleSliderChange = useCallback((sliderId: string, value: number) => {
    dispatch({
      type: 'set',
      next: (prev) => prev.map((o) => (o.id === sliderId && o.type === 'slider' ? { ...o, value } : o)),
    });
  }, []);

  // Oynatma: her karede tek dispatch. 'set' geçmişe yazmaz, böylece animasyon
  // geri alma yığınını yüzlerce adımla doldurmaz.
  const setSliderValues = useCallback((values: Record<string, number>, pointUpdates?: Record<string, PointAnimUpdate>) => {
    dispatch({
      type: 'set',
      next: (prev) =>
        prev.map((o) => {
          if (o.type === 'slider' && values[o.id] !== undefined) {
            return { ...o, value: values[o.id] };
          }
          if (o.type === 'point' && pointUpdates && pointUpdates[o.id] !== undefined) {
            const u = pointUpdates[o.id];
            return { ...o, x: u.x, y: u.y, animProgress: u.progress };
          }
          return o;
        }),
    });
  }, []);

  // Fonksiyon ekleme
  const addFunction = useCallback(
    (expression: string, label?: string) => {
      const { objects: mevcut, viewport: vp } = latest.current;

      // PARAMETRELİ FONKSİYON: "a*x^2 + b" gibi ifadelerde a ve b için kaydırıcı yoksa
      // ifade sessizce NaN üretir ve eğri hiç çizilmez. Bu yüzden eksik parametreler için
      // kaydırıcıları KENDİLİĞİNDEN oluşturuyoruz (GeoGebra'nın davranışı).
      const varolanAdlar = new Set(
        mevcut.filter((o) => o.type === 'slider').map((o) => (o as SliderObject).variableName)
      );
      const eksikler = extractVariableNames(expression).filter((ad) => !varolanAdlar.has(ad));

      const bounds = getVisibleWorldBounds(vp);
      const genislik = bounds.maxX - bounds.minX;
      const yukseklik = bounds.maxY - bounds.minY;
      const uzunluk = Math.max(2, Math.min(6, genislik * 0.22));
      let sayac = mevcut.filter((o) => o.type === 'slider').length;

      const yeniKaydiricilar: SliderObject[] = eksikler.map((ad) => {
        const k: SliderObject = {
          id: createId('slider'),
          type: 'slider',
          label: `${ad} Parametresi`,
          showLabel: true,
          variableName: ad,
          min: -5,
          max: 5,
          step: 0.1,
          value: 1,
          x: Number((bounds.minX + genislik * 0.06).toFixed(2)),
          y: Number((bounds.maxY - yukseklik * (0.1 + sayac * 0.07)).toFixed(2)),
          length: Number(uzunluk.toFixed(2)),
          color: '#8b5cf6',
          visible: true,
          createdAt: Date.now(),
        };
        sayac += 1;
        return k;
      });

      const newFn: FunctionObject = {
        id: createId('fn'),
        type: 'function',
        label: label ?? functionLabel(nextFunctionName(mevcut), expression),
        showLabel: true,
        expression,
        color: '#2563eb',
        thickness: 2.5,
        visible: true,
        createdAt: Date.now(),
      };

      commit(
        (prev) => [...prev, ...yeniKaydiricilar, newFn],
        yeniKaydiricilar.length > 0
          ? `${newFn.label} eklendi (${eksikler.join(', ')} kaydırıcısı oluşturuldu)`
          : `${newFn.label} fonksiyon grafiği eklendi`
      );

      if (yeniKaydiricilar.length > 0) {
        setHintMessage(
          eksikler.length === 1
            ? `"${eksikler[0]}" parametresi için kaydırıcı oluşturuldu; tuvalden sürükleyerek grafiği değiştirin.`
            : `"${eksikler.join('", "')}" parametreleri için kaydırıcılar oluşturuldu.`
        );
      }
    },
    [commit]
  );

  // Kaydırıcı ekleme
  const addSlider = useCallback(
    (
      name: string,
      min: number,
      max: number,
      step: number,
      initialValue: number,
      sliderType?: 'number' | 'angle' | 'integer',
      animSpeed?: number,
      animMode?: 'oscillating' | 'increasing' | 'decreasing' | 'increasing_once'
    ) => {
      // Tuval üzerinde sol üstten başlayarak, var olan kaydırıcı sayısınca aşağı kayan yerleşim
      const { viewport: vp, objects: mevcut } = latest.current;
      const bounds = getVisibleWorldBounds(vp);
      const sayac = mevcut.filter((o) => o.type === 'slider').length;
      const genislik = bounds.maxX - bounds.minX;
      const yukseklik = bounds.maxY - bounds.minY;
      const uzunluk = Math.max(2, Math.min(6, genislik * 0.22));

      const newSlider: SliderObject = {
        id: createId('slider'),
        type: 'slider',
        label: `${name} Parametresi`,
        showLabel: true,
        variableName: name,
        min,
        max,
        step,
        value: initialValue,
        sliderType,
        animSpeed: animSpeed ?? 1,
        animMode: animMode ?? 'oscillating',
        x: Number((bounds.minX + genislik * 0.06).toFixed(2)),
        y: Number((bounds.maxY - yukseklik * (0.1 + sayac * 0.07)).toFixed(2)),
        length: Number(uzunluk.toFixed(2)),
        color: '#8b5cf6',
        visible: true,
        createdAt: Date.now(),
      };
      addObject(newSlider, `${name} kaydırıcısı eklendi`);
    },
    [addObject]
  );

  /**
   * Cebir girişine yazılan "a = 2" biçimindeki atamayı uygular.
   *
   * Kaydırıcı zaten varsa değeri yazılır; değer aralığın dışındaysa aralık
   * genişletilir (kullanıcı 10 yazdıysa kaydırıcı 5'te takılı kalmamalı).
   * Kaydırıcı yoksa değerin çevresinde makul bir aralıkla yenisi oluşturulur.
   */
  const assignSliderValue = useCallback(
    (name: string, value: number) => {
      const mevcut = latest.current.objects.find(
        (o) => o.type === 'slider' && (o as SliderObject).variableName === name
      ) as SliderObject | undefined;

      if (mevcut) {
        const min = Math.min(mevcut.min, value);
        const max = Math.max(mevcut.max, value);
        const genisledi = min !== mevcut.min || max !== mevcut.max;
        commit(
          (prev) =>
            prev.map((o) =>
              o.id === mevcut.id ? ({ ...o, value, min, max } as MathObject) : o
            ),
          `${name} = ${formatTurkishNumber(value)}`
        );
        setHintMessage(
          genisledi
            ? `${name} = ${formatTurkishNumber(value)} (kaydırıcı aralığı ${formatTurkishNumber(min)} – ${formatTurkishNumber(max)} olarak genişletildi)`
            : `${name} = ${formatTurkishNumber(value)}`
        );
        return;
      }

      // Yeni kaydırıcı: değerin çevresinde simetrik ve okunaklı bir aralık seç
      const genislik = Math.max(5, Math.ceil(Math.abs(value) * 2) || 5);
      addSlider(name, -genislik, genislik, 0.1, value);
      setHintMessage(
        `${name} kaydırıcısı oluşturuldu ve ${formatTurkishNumber(value)} değeri atandı.`
      );
    },
    [commit, addSlider]
  );


  // -------------------------------------------------------------------------
  // BAĞLAM MENÜSÜ (sağ tık) EYLEMLERİ
  // Ölçüm işlemleri yeni nesne üretmez; nesnenin kendi canlı ölçüm bayrağını açar.
  // Böylece etiket nokta sürüklendikçe kendiliğinden güncellenir.
  // -------------------------------------------------------------------------

  /** Doğru parçası / doğru / ışın uzunluğunu canlı olarak gösterir. */
  const measureLength = useCallback(
    (objectId: string) => {
      commit((prev) => {
        const target = prev.find((o) => o.id === objectId);
        if (!target || !['segment', 'line', 'ray'].includes(target.type)) return prev;
        return prev.map((o) => (o.id === objectId ? ({ ...o, showLength: true } as MathObject) : o));
      }, 'Uzunluk ölçüldü');
    },
    [commit]
  );

  /**
   * İki nokta arasındaki uzunluk etiketini gösterir/gizler. Aynı uçlu parça/doğru/ışın varsa onun
   * showLength bayrağı, yoksa 'distance' ölçüm nesnesi kullanılır; aynı çift için ikinci etiket açılmaz.
   * Kimlik commit'ten ÖNCE üretilir: güncelleyici StrictMode'da iki kez çalışabilir.
   */
  const setLengthMeasurement = useCallback(
    (fromPointId: string, toPointId: string, show: boolean) => {
      const yeniId = createId('olc');
      commit(
        (prev) => withLengthMeasurement(prev, fromPointId, toPointId, show, yeniId),
        show ? 'Uzunluk ölçüldü' : 'Uzunluk etiketi gizlendi'
      );
    },
    [commit]
  );

  /** Çokgen veya çemberin alanını canlı olarak gösterir. */
  const measureArea = useCallback(
    (objectId: string) => {
      commit((prev) => {
        const target = prev.find((o) => o.id === objectId);
        if (
          !target ||
          (target.type !== 'polygon' &&
            target.type !== 'circle' &&
            target.type !== 'ellipse' &&
            target.type !== 'sector')
        )
          return prev;
        return prev.map((o) => (o.id === objectId ? ({ ...o, showArea: true } as MathObject) : o));
      }, 'Alan ölçüldü');
    },
    [commit]
  );

  /** Çokgen veya çemberin çevresini canlı olarak gösterir. */
  const measurePerimeter = useCallback(
    (objectId: string) => {
      commit((prev) => {
        const target = prev.find((o) => o.id === objectId);
        if (
          !target ||
          (target.type !== 'polygon' && target.type !== 'circle' && target.type !== 'ellipse' && target.type !== 'sector')
        )
          return prev;
        return prev.map((o) => (o.id === objectId ? ({ ...o, showPerimeter: true } as MathObject) : o));
      }, 'Çevre ölçüldü');
    },
    [commit]
  );

  /**
   * Bir NOKTADAKİ açıyı ölçer: o noktayı paylaşan iki kenarı kendisi bulur ve
   * aralarında bir açı nesnesi oluşturur. Kullanıcıdan üç nokta seçmesi istenmez.
   */
  const measureAngleAtPoint = useCallback(
    (pointId: string) => {
      // Karar ve doğrulama commit'ten ÖNCE, mevcut nesneler üzerinden verilir.
      // (Güncelleyicinin içinde yan etki üretmek StrictMode'da iki kez çalışır ve yanlış sonuç verir.)
      const vertex = objects.find((o) => o.id === pointId && o.type === 'point') as PointObject | undefined;
      if (!vertex) return;

      // Karar sağ tık menüsüyle AYNI yardımcıdan gelir (src/math/pointAngles.ts): komşu kenarlar
      // parça/doğru/ışın uçları ve çokgen komşu köşeleridir; çember merkezi kenar sayılmaz.
      // Yay / daire diliminin MERKEZİNE tıklandıysa merkez açıyı ŞEKLİN KENDİSİ gösterir;
      // burada ayrı bir AngleObject üretmek aynı açı için ikinci bir rozet doğuruyordu.
      const aciEylemi = pointAngleAction(pointId, objects);
      if (aciEylemi?.kind === 'central') {
        // Bölünmüş çemberin merkezinde iki yay olabilir: merkez açıları birlikte açılıp kapanır
        const kimlikler = new Set(aciEylemi.shapes.map((s) => s.id));
        const acik = aciEylemi.shapes.some((s) => s.visible !== false && s.showCentralAngle !== false);
        commit(
          (prev) => prev.map((o) => (kimlikler.has(o.id) ? ({ ...o, showCentralAngle: !acik } as MathObject) : o)),
          acik ? 'Merkez açı gizlendi' : 'Merkez açı ölçüldü'
        );
        setHintMessage(acik ? 'Merkez açı gizlendi.' : 'Merkez açı gösteriliyor.');
        return;
      }
      if (!aciEylemi) {
        setHintMessage(`${vertex.label || 'Bu'} noktasında açı yok: en az iki kenar gerekiyor.`);
        return;
      }

      const [p1Id, p3Id] = aciEylemi.neighbourIds;
      const p1 = objects.find((o) => o.id === p1Id && o.type === 'point') as PointObject | undefined;
      const p3 = objects.find((o) => o.id === p3Id && o.type === 'point') as PointObject | undefined;
      if (!p1 || !p3) {
        setHintMessage('Açı kurulamadı: komşu noktalar bulunamadı.');
        return;
      }

      const zatenVar = objects.some(
        (o) =>
          o.type === 'angle' &&
          o.vertexPointId === pointId &&
          ((o.point1Id === p1.id && o.point3Id === p3.id) || (o.point1Id === p3.id && o.point3Id === p1.id))
      );
      if (zatenVar) {
        // Etiketi tıklayarak gizlemiş olabilir; yeniden ölçmek onu GERİ GETİRİR.
        const mevcut = objects.find(
          (o) =>
            o.type === 'angle' &&
            o.vertexPointId === pointId &&
            ((o.point1Id === p1.id && o.point3Id === p3.id) ||
              (o.point1Id === p3.id && o.point3Id === p1.id))
        ) as AngleObject | undefined;
        if (mevcut && mevcut.showValue === false) {
          commit(
            (prev) => prev.map((o) => (o.id === mevcut.id ? ({ ...o, showValue: true } as MathObject) : o)),
            `${mevcut.label} yeniden gösterildi`
          );
          setHintMessage('Açı etiketi yeniden gösteriliyor.');
        } else {
          setHintMessage('Bu açı zaten ölçülmüş.');
        }
        return;
      }

      const label = `∠${p1.label}${vertex.label}${p3.label}`;
      const newAngle: AngleObject = {
        id: createId('ang'),
        type: 'angle',
        label,
        showLabel: true,
        point1Id: p1.id,
        vertexPointId: pointId,
        point3Id: p3.id,
        color: '#f59e0b',
        visible: true,
        showValue: true,
        createdAt: Date.now(),
      };
      commit((prev) => [...prev, newAngle], `${label} ölçüldü`);
    },
    [objects, commit]
  );

  /**
   * Yay veya daire diliminin MERKEZ AÇISINI ölçer.
   * Şeklin kendisine sağ tıklandığında kullanılır; merkez, başlangıç ve bitiş noktalarından
   * bir açı nesnesi kurar. Yarım çemberde 180°, çeyrekte 90° verir.
   */
  /**
   * Yay / daire diliminin MERKEZ AÇISINI gösterir veya gizler.
   *
   * Önceden burada ayrı bir AngleObject üretiliyordu. Sonuç: aynı yayda İKİ derece
   * rozeti oluyordu — biri şeklin kendi 'centralAngle' etiketi, diğeri bu açı nesnesinin
   * rozeti. Kullanıcı birine tıkladığında öteki ekranda kalıyor ve "açıya tıklıyorum,
   * gizlenmiyor" oluyordu. Üstelik 180°'den geniş yaylarda ikisi FARKLI sayı gösteriyordu:
   * getArcGeometry taramayı [0, 2π) verirken açı nesnesi [0, 180] iç açıyı çiziyordu
   * (270°'lik yayda 270° ve 90°). Artık tek kaynak var: şeklin kendi showCentralAngle bayrağı.
   */
  const measureArcAngle = useCallback(
    (shapeId: string) => {
      const shape = objects.find(
        (o) => o.id === shapeId && (o.type === 'arc' || o.type === 'sector')
      ) as ArcObject | SectorObject | undefined;
      if (!shape) return;

      const acik = shape.showCentralAngle !== false;
      commit(
        (prev) =>
          prev.map((o) => (o.id === shapeId ? ({ ...o, showCentralAngle: !acik } as MathObject) : o)),
        acik ? 'Merkez açı gizlendi' : 'Merkez açı ölçüldü'
      );
      setHintMessage(acik ? 'Merkez açı gizlendi.' : 'Merkez açı gösteriliyor.');
    },
    [objects, commit]
  );

  /** Yay uzunluğunu canlı olarak gösterir. */
  const measureArcLength = useCallback(
    (arcId: string) => {
      commit((prev) => {
        const t = prev.find((o) => o.id === arcId);
        if (!t || (t.type !== 'arc' && t.type !== 'sector')) return prev;
        return prev.map((o) => (o.id === arcId ? ({ ...o, showArcLength: true } as MathObject) : o));
      }, 'Yay uzunluğu ölçüldü');
    },
    [commit]
  );

  /** Bir ölçüm etiketini gizler (etikete tıklayınca). Sağ tık menüsünden yeniden açılabilir. */
  /**
   * Çokgenin `edgeIndex` numaralı kenarının uzunluk etiketini açar veya kapatır.
   * i. kenar, pointIds[i] ile pointIds[(i+1) % n] arasındaki kenardır.
   */
  const togglePolygonEdgeLabel = useCallback(
    (polygonId: string, edgeIndex: number) => {
      const poly = objects.find((o) => o.id === polygonId && o.type === 'polygon') as PolygonObject | undefined;
      if (!poly) return;
      const n = poly.pointIds.length;
      if (edgeIndex < 0 || edgeIndex >= n) return;
      const mevcut = poly.edgeLabels || [];
      const acik = mevcut.includes(edgeIndex);
      const sonraki = acik ? mevcut.filter((i) => i !== edgeIndex) : [...mevcut, edgeIndex].sort((a, b) => a - b);
      commit(
        (prev) => prev.map((o) => (o.id === polygonId ? ({ ...o, edgeLabels: sonraki } as MathObject) : o)),
        acik ? 'Kenar uzunluğu gizlendi' : 'Kenar uzunluğu ölçüldü'
      );
      setHintMessage(acik ? 'Kenar uzunluğu gizlendi.' : 'Kenar uzunluğu gösteriliyor.');
    },
    [commit, objects]
  );

  /** Çokgenin bütün kenar uzunluklarını tek adımda gösterir veya gizler. */
  const setAllPolygonEdgeLabels = useCallback(
    (polygonId: string, show: boolean) => {
      const poly = objects.find((o) => o.id === polygonId && o.type === 'polygon') as PolygonObject | undefined;
      if (!poly) return;
      const hepsi = show ? poly.pointIds.map((_, i) => i) : [];
      commit(
        (prev) => prev.map((o) => (o.id === polygonId ? ({ ...o, edgeLabels: hepsi } as MathObject) : o)),
        show ? 'Tüm kenarlar ölçüldü' : 'Kenar ölçümleri gizlendi'
      );
      setHintMessage(show ? 'Tüm kenar uzunlukları gösteriliyor.' : 'Kenar uzunlukları gizlendi.');
    },
    [commit, objects]
  );

  /**
   * Seçili noktaları ARDIŞIK doğru parçalarıyla birleştirir (kırık çizgi).
   * Tıklanma sırası korunur; böylece kullanıcı istediği yolu kendisi belirler.
   * Zaten var olan bir bağlantı ikinci kez kurulmaz.
   */
  const connectPoints = useCallback(
    (pointIds: string[]) => {
      const noktalar = pointIds
        .map((id) => objects.find((o) => o.id === id && o.type === 'point'))
        .filter(Boolean) as PointObject[];
      if (noktalar.length < 2) {
        setHintMessage('Birleştirmek için en az İKİ nokta seçin (Shift ile çoklu seçim).');
        return;
      }

      const varOlan = new Set(
        objects
          .filter((o) => o.type === 'segment')
          .map((o) => {
            const seg = o as SegmentObject;
            return [seg.startPointId, seg.endPointId].sort().join('|');
          })
      );

      const yeniler: SegmentObject[] = [];
      for (let i = 0; i < noktalar.length - 1; i++) {
        const a = noktalar[i];
        const b = noktalar[i + 1];
        const anahtar = [a.id, b.id].sort().join('|');
        if (varOlan.has(anahtar)) continue;
        varOlan.add(anahtar);
        yeniler.push({
          id: createId('seg'),
          type: 'segment',
          label: `[${a.label}${b.label}]`,
          showLabel: true,
          startPointId: a.id,
          endPointId: b.id,
          color: '#0284c7',
          visible: true,
          createdAt: Date.now(),
        });
      }

      if (yeniler.length === 0) {
        setHintMessage('Bu noktalar zaten birbirine bağlı.');
        return;
      }
      commit(
        (prev) => [...prev, ...yeniler],
        yeniler.length === 1 ? `${yeniler[0].label} oluşturuldu` : `${yeniler.length} bağlantı kuruldu`
      );
      setHintMessage(`${yeniler.length} doğru parçası ile noktalar birleştirildi.`);
    },
    [objects, commit]
  );

  /** Seçili noktalar arasındaki doğru parçalarını siler (yalnızca İKİ UCU DA seçili olanlar). */
  const disconnectPoints = useCallback(
    (pointIds: string[]) => {
      const kume = new Set(pointIds);
      const silinecek = objects.filter((o) => {
        if (o.type !== 'segment') return false;
        const seg = o as SegmentObject;
        return kume.has(seg.startPointId) && kume.has(seg.endPointId);
      });
      if (silinecek.length === 0) {
        setHintMessage('Seçili noktalar arasında kaldırılacak bir bağlantı yok.');
        return;
      }
      const idler = new Set(silinecek.map((o) => o.id));
      commit(
        (prev) => prev.filter((o) => !idler.has(o.id)),
        silinecek.length === 1 ? 'Bağlantı kaldırıldı' : `${silinecek.length} bağlantı kaldırıldı`
      );
      setHintMessage(`${silinecek.length} doğru parçası kaldırıldı. Noktalar yerinde kaldı.`);
    },
    [objects, commit]
  );

  /**
   * Seçili noktalara EN KÜÇÜK KARELER ile polinom uydurur ve sonucu fonksiyon olarak ekler.
   * (GeoGebra'daki "uydurpolinom" komutunun karşılığı.)
   */
  const fitPolynomialToPoints = useCallback(
    (pointIds: string[], degree: number) => {
      const noktalar = pointIds
        .map((id) => objects.find((o) => o.id === id && o.type === 'point'))
        .filter(Boolean) as PointObject[];
      if (noktalar.length < degree + 1) {
        setHintMessage(
          `${degree}. derece için en az ${degree + 1} nokta gerekir; ${noktalar.length} nokta seçili.`
        );
        return;
      }
      const katsayilar = fitPolynomial(
        noktalar.map((p) => ({ x: p.x, y: p.y })),
        degree
      );
      if (!katsayilar) {
        setHintMessage(
          'Bu noktalara polinom uydurulamadı. Aynı x değerinde birden çok nokta varsa derece düşürülmeli.'
        );
        return;
      }
      const ifade = polynomialToExpression(katsayilar);
      const r2 = coefficientOfDetermination(
        noktalar.map((p) => ({ x: p.x, y: p.y })),
        katsayilar
      );
      const fn: FunctionObject = {
        id: createId('fn'),
        type: 'function',
        label: functionLabel(nextFunctionName(objects), ifade),
        showLabel: true,
        expression: ifade,
        color: '#db2777',
        thickness: 2.5,
        visible: true,
        createdAt: Date.now(),
      };
      commit((prev) => [...prev, fn], `${degree}. derece polinom uyduruldu`);
      setHintMessage(
        `Uydurulan fonksiyon: ${fn.label}  ·  R² = ${formatTurkishNumber(Number(r2.toFixed(4)))}` +
          (r2 > 0.999 ? ' (noktalardan tam geçiyor)' : '')
      );
    },
    [objects, commit]
  );

  /**
   * İşaret kutusunu açar/kapatır ve bağlı nesnelerin görünürlüğünü buna eşitler.
   * Nesneler SİLİNMEZ, yalnızca `visible` alanı değişir; kutu tekrar açılınca geri gelirler.
   */
  const toggleCheckbox = useCallback(
    (checkboxId: string) => {
      const kutu = objects.find((o) => o.id === checkboxId && o.type === 'checkbox') as
        | CheckboxObject
        | undefined;
      if (!kutu) return;
      const yeni = !kutu.checked;
      const hedef = new Set(kutu.targetIds);
      commit(
        (prev) =>
          prev.map((o) => {
            if (o.id === checkboxId) return { ...o, checked: yeni } as MathObject;
            if (hedef.has(o.id)) return { ...o, visible: yeni } as MathObject;
            return o;
          }),
        yeni ? `${kutu.label} açıldı` : `${kutu.label} kapatıldı`
      );
    },
    [objects, commit]
  );

  /** Düğmeye basıldığında bağlı eylemi çalıştırır. */
  const runButton = useCallback(
    (buttonId: string) => {
      const dugme = objects.find((o) => o.id === buttonId && o.type === 'button') as
        | ButtonObject
        | undefined;
      if (!dugme) return;
      const eylem = dugme.action;

      if (eylem.kind === 'toggle') {
        const hedef = new Set(eylem.targetIds);
        // Hedeflerden biri bile görünüyorsa hepsini gizle; hiçbiri görünmüyorsa hepsini göster
        const gorunenVar = objects.some((o) => hedef.has(o.id) && o.visible !== false);
        commit(
          (prev) => prev.map((o) => (hedef.has(o.id) ? ({ ...o, visible: !gorunenVar } as MathObject) : o)),
          gorunenVar ? 'Nesneler gizlendi' : 'Nesneler gösterildi'
        );
        return;
      }

      if (eylem.kind === 'animate') {
        // Oynatma döngüsü Canvas'ta (useSliderPlayback) yaşıyor; düğme oraya bağlanır.
        // Bu dal yalnızca eylem türü tanınmadığında sessiz kalmamak için var.
        return;
      }

      if (eylem.kind === 'setValue') {
        commit(
          (prev) =>
            prev.map((o) =>
              o.id === eylem.targetId && o.type === 'slider'
                ? ({ ...o, value: eylem.value } as MathObject)
                : o
            ),
          `Değer ${formatTurkishNumber(eylem.value)} olarak atandı`
        );
        return;
      }

      if (eylem.kind === 'setSlider') {
        commit(
          (prev) =>
            prev.map((o) =>
              o.id === eylem.sliderId && o.type === 'slider'
                ? ({ ...o, value: eylem.value } as MathObject)
                : o
            ),
          `Kaydırıcıya ${formatTurkishNumber(eylem.value)} atandı`
        );
        return;
      }
    },
    [objects, commit]
  );

  /**
   * Girdi kutusuna yazılan değeri bağlı nesneye uygular.
   * Hata varsa HATA METNİ döner (kutu kırmızıya döner), başarılıysa null.
   */
  const applyInputBox = useCallback(
    (inputBoxId: string, raw: string): string | null => {
      const kutu = objects.find((o) => o.id === inputBoxId && o.type === 'input_box') as
        | InputBoxObject
        | undefined;
      if (!kutu) return 'Girdi kutusu bulunamadı.';
      const hedef = objects.find((o) => o.id === kutu.targetId);
      if (!hedef) return 'Bağlı nesne silinmiş.';

      if (kutu.field === 'value') {
        const sayi = Number(raw.trim().replace(',', '.'));
        if (!Number.isFinite(sayi)) return 'Geçerli bir sayı girin.';
        const s = hedef as SliderObject;
        if (sayi < s.min || sayi > s.max) {
          return `Değer ${formatTurkishNumber(s.min)} ile ${formatTurkishNumber(s.max)} arasında olmalı.`;
        }
        commit(
          (prev) => prev.map((o) => (o.id === hedef.id ? ({ ...o, value: sayi } as MathObject) : o)),
          `${s.variableName} = ${formatTurkishNumber(sayi)}`
        );
        return null;
      }

      const ifade = raw.trim();
      if (!ifade) return 'İfade boş olamaz.';
      const dogrulama = validateMathExpression(ifade);
      if (!dogrulama.ok) return dogrulama.error;
      commit(
        (prev) =>
          prev.map((o) =>
            o.id === hedef.id ? ({ ...o, expression: ifade, label: relabelFunction(o as FunctionObject, ifade, prev) } as MathObject) : o
          ),
        `Fonksiyon güncellendi: ${ifade}`
      );
      return null;
    },
    [objects, commit]
  );

  /**
   * Bir çokgeni, KENARLARI ÜZERİNDEKİ iki noktadan geçen kirişle iki parçaya böler.
   *
   * Özgün çokgen kaldırılır, yerine iki yeni çokgen ve aradaki kiriş konur.
   * Böylece "alanı parçalara ayır" işlemi gerçek nesnelere dönüşür: her parçanın
   * alanı ayrı ayrı ölçülebilir ve parçalar bağımsız taşınabilir.
   */
  const splitPolygon = useCallback(
    (polygonId: string, pointIds: string[]) => {
      const objs = latest.current.objects;
      const poly = objs.find((o) => o.id === polygonId && o.type === 'polygon') as
        | PolygonObject
        | undefined;
      if (!poly) return;

      const kose = poly.pointIds
        .map((id) => objs.find((o) => o.id === id && o.type === 'point'))
        .filter(Boolean) as PointObject[];
      if (kose.length !== poly.pointIds.length || kose.length < 3) return;

      const kesenler = pointIds
        .map((id) => objs.find((o) => o.id === id && o.type === 'point'))
        .filter(Boolean) as PointObject[];
      if (kesenler.length !== 2) {
        setHintMessage('Alanı bölmek için kenarlar üzerinde İKİ nokta seçin.');
        return;
      }

      // Her kesme noktasının hangi kenarda olduğunu bul (kenara yeterince yakın olmalı)
      const ESIK = 1e-3;
      const yerler = kesenler.map((p) => closestPointOnPolygonEdge(kose, p));
      if (yerler.some((y) => !y || y.distance > ESIK)) {
        setHintMessage('Her iki nokta da çokgenin KENARI üzerinde olmalı.');
        return;
      }
      const [a, b] = yerler as { point: Point2D; edgeIndex: number; distance: number }[];
      if (a.edgeIndex === b.edgeIndex) {
        setHintMessage('İki nokta AYNI kenarda; alan bölünemez. Farklı kenarlarda seçin.');
        return;
      }

      const parcalar = splitPolygonByChord(
        kose,
        a.edgeIndex,
        { x: kesenler[0].x, y: kesenler[0].y },
        b.edgeIndex,
        { x: kesenler[1].x, y: kesenler[1].y }
      );
      if (!parcalar) {
        setHintMessage('Alan bölünemedi.');
        return;
      }

      // Köşe koordinatını nokta kimliğine çevir (kesme noktaları da dâhil)
      const kimlikBul = (p: Point2D): string | null => {
        const hepsi = [...kose, ...kesenler];
        const bulunan = hepsi.find(
          (q) => Math.abs(q.x - p.x) < 1e-6 && Math.abs(q.y - p.y) < 1e-6
        );
        return bulunan ? bulunan.id : null;
      };

      const yeniCokgenler: PolygonObject[] = [];
      const renkler = ['#0ea5e9', '#f59e0b'];
      for (let i = 0; i < parcalar.length; i++) {
        const ids = parcalar[i].map(kimlikBul);
        if (ids.some((x) => !x)) {
          setHintMessage('Alan bölünemedi: kesme noktaları eşleştirilemedi.');
          return;
        }
        yeniCokgenler.push({
          id: createId('poly'),
          type: 'polygon',
          label: `${poly.label || 'Çokgen'} — ${i + 1}. parça`,
          showLabel: true,
          pointIds: ids as string[],
          color: renkler[i],
          fillColor: renkler[i],
          fillOpacity: 0.22,
          visible: true,
          showArea: true,
          createdAt: Date.now(),
        });
      }

      const kiris: SegmentObject = {
        id: createId('seg'),
        type: 'segment',
        label: `[${kesenler[0].label}${kesenler[1].label}]`,
        showLabel: true,
        startPointId: kesenler[0].id,
        endPointId: kesenler[1].id,
        color: '#334155',
        visible: true,
        createdAt: Date.now(),
      };

      commit(
        (prev) => [
          ...bagiParcalaraDevret(bagiCoz(prev, kesenler.map((k) => k.id)), polygonId, yeniCokgenler).filter((o) => o.id !== polygonId),
          ...yeniCokgenler,
          kiris,
        ],
        `${poly.label || 'Çokgen'} iki parçaya bölündü`
      );
      setHintMessage(
        `Alan ikiye bölündü. Her parçanın alanı ayrı ayrı gösteriliyor; parçalar bağımsız taşınabilir.`
      );
    },
    [commit]
  );

  /**
   * Doğru parçasını ÜZERİNDEKİ bir noktadan iki parçaya ayırır.
   *
   * Özgün parça kaldırılır, yerine [A–P] ve [P–B] konur. Böylece kullanıcı
   * istediği parçayı ayrıca seçip silebilir; tek nesneyken bu mümkün değildi.
   */
  const splitSegmentAtPoint = useCallback(
    (segmentId: string, pointId: string) => {
      const objs = latest.current.objects;
      const seg = objs.find((o) => o.id === segmentId && o.type === 'segment') as
        | SegmentObject
        | undefined;
      const p = objs.find((o) => o.id === pointId && o.type === 'point') as PointObject | undefined;
      if (!seg || !p) return;
      const a = objs.find((o) => o.id === seg.startPointId) as PointObject | undefined;
      const b = objs.find((o) => o.id === seg.endPointId) as PointObject | undefined;
      if (!a || !b) return;
      if (p.id === a.id || p.id === b.id) {
        setHintMessage('Bölme noktası, parçanın UÇLARINDAN biri olamaz.');
        return;
      }
      if (distanceToSegment(p, a, b).distance > 1e-3) {
        setHintMessage('Nokta doğru parçasının ÜZERİNDE değil.');
        return;
      }

      const parca = (bas: PointObject, son: PointObject, renk: string): SegmentObject => ({
        id: createId('seg'),
        type: 'segment',
        label: `[${bas.label}${son.label}]`,
        showLabel: true,
        startPointId: bas.id,
        endPointId: son.id,
        color: renk,
        thickness: seg.thickness,
        style: seg.style,
        visible: true,
        createdAt: Date.now(),
      });

      const sol = parca(a, p, '#0ea5e9');
      const sag = parca(p, b, '#f59e0b');
      commit(
        (prev) => [
          // P dışında eski parçaya KİLİTLİ noktalar, üzerinde durdukları yeni parçaya kilitli kalır
          ...bagiParcalaraDevret(bagiCoz(prev, [p.id]), segmentId, [sol, sag]).filter((o) => o.id !== segmentId),
          sol,
          sag,
        ],
        `${seg.label || 'Doğru parçası'} ikiye ayrıldı`
      );
      setHintMessage(`İki parça oluştu: [${a.label}${p.label}] ve [${p.label}${b.label}]. İstediğinizi ayrıca silebilirsiniz.`);
    },
    [commit]
  );

  /**
   * Çemberi, ÜZERİNDEKİ iki noktadan iki yaya ayırır.
   * İki yay birlikte tam çemberi verir; biri silinince diğeri kalır.
   */
  const splitCircleAtPoints = useCallback(
    (circleId: string, pointIds: string[]) => {
      const objs = latest.current.objects;
      const circ = objs.find((o) => o.id === circleId && o.type === 'circle') as
        | CircleObject
        | undefined;
      if (!circ) return;
      const merkez = objs.find((o) => o.id === circ.centerPointId && o.type === 'point') as
        | PointObject
        | undefined;
      if (!merkez) {
        setHintMessage('Bu çemberin merkez noktası yok; üç noktadan geçen çemberler bölünemiyor.');
        return;
      }
      const noktalar = pointIds
        .map((id) => objs.find((o) => o.id === id && o.type === 'point'))
        .filter(Boolean) as PointObject[];
      if (noktalar.length !== 2) {
        setHintMessage('Çemberi bölmek için üzerinde İKİ nokta gerekir.');
        return;
      }
      const yari = circ.radiusPointId
        ? (objs.find((o) => o.id === circ.radiusPointId) as PointObject | undefined)
        : undefined;
      const r = circ.fixedRadius ?? (yari ? calculateDistance(merkez, yari) : 0);
      if (r <= 0) return;
      if (noktalar.some((p) => Math.abs(calculateDistance(merkez, p) - r) > 1e-3)) {
        setHintMessage('Her iki nokta da çemberin ÜZERİNDE olmalı.');
        return;
      }

      const yay = (bas: PointObject, son: PointObject, renk: string): ArcObject => ({
        id: createId('arc'),
        type: 'arc',
        label: `${bas.label}${son.label} Yayı`,
        showLabel: true,
        centerPointId: merkez.id,
        startPointId: bas.id,
        directionPointId: son.id,
        thickness: 3,
        color: renk,
        showArcLength: true,
        visible: true,
        createdAt: Date.now(),
      });

      const y1 = yay(noktalar[0], noktalar[1], '#0ea5e9');
      const y2 = yay(noktalar[1], noktalar[0], '#f59e0b');
      commit(
        (prev) => [
          ...bagiParcalaraDevret(bagiCoz(prev, noktalar.map((n) => n.id)), circleId, [y1, y2]).filter((o) => o.id !== circleId),
          y1,
          y2,
        ],
        `${circ.label || 'Çember'} iki yaya ayrıldı`
      );
      // Kullanıcı bölmeyi hangi parça için istediyse onu hemen seçili bırakalım:
      // "seçip silebilmeliyim" dediği adım böylece tek tıklamaya iner.
      setSelectedObjectIds([y1.id]);
      setHintMessage(
        `${y1.label} ve ${y2.label} oluştu. ${y1.label} seçili: sağ tıkla uzunluğunu ölçebilir, Delete ile silebilirsiniz.`
      );
    },
    [commit]
  );

  /** Yayı, ÜZERİNDEKİ bir noktadan iki yaya ayırır. */
  const splitArcAtPoint = useCallback(
    (arcId: string, pointId: string) => {
      const objs = latest.current.objects;
      const arc = objs.find((o) => o.id === arcId && o.type === 'arc') as ArcObject | undefined;
      const p = objs.find((o) => o.id === pointId && o.type === 'point') as PointObject | undefined;
      if (!arc || !p) return;
      const merkez = objs.find((o) => o.id === arc.centerPointId) as PointObject | undefined;
      const bas = objs.find((o) => o.id === arc.startPointId) as PointObject | undefined;
      const bit = objs.find((o) => o.id === arc.directionPointId) as PointObject | undefined;
      if (!merkez || !bas || !bit) return;
      const r = calculateDistance(merkez, bas);
      if (Math.abs(calculateDistance(merkez, p) - r) > 1e-3) {
        setHintMessage('Nokta yayın ÜZERİNDE değil.');
        return;
      }

      const yay = (b1: PointObject, b2: PointObject, renk: string): ArcObject => ({
        ...arc,
        id: createId('arc'),
        label: `${b1.label}${b2.label} Yayı`,
        startPointId: b1.id,
        directionPointId: b2.id,
        color: renk,
        createdAt: Date.now(),
      });

      const ilkYay = yay(bas, p, '#0ea5e9');
      const ikinciYay = yay(p, bit, '#f59e0b');
      commit(
        (prev) => [
          ...bagiParcalaraDevret(bagiCoz(prev, [p.id]), arcId, [ilkYay, ikinciYay]).filter((o) => o.id !== arcId),
          ilkYay,
          ikinciYay,
        ],
        `${arc.label || 'Yay'} ikiye ayrıldı`
      );
      setHintMessage('Yay ikiye ayrıldı. İstediğiniz parçayı ayrıca silebilirsiniz.');
    },
    [commit]
  );

  const hideMeasurement = useCallback(
    (objectId: string, kind: MeasurementKind | string) => {
      // Çokgen kenarı etiketleri ayrı bir listede tutulur ('edge3' -> 3. kenar)
      const kenar = /^edge(\d+)$/.exec(kind);
      if (kenar) {
        togglePolygonEdgeLabel(objectId, Number(kenar[1]));
        return;
      }
      const alanAdi: Record<MeasurementKind, string> = {
        length: 'showLength',
        area: 'showArea',
        perimeter: 'showPerimeter',
        angle: 'showValue',
        measure: 'showValue',
        // Nokta adı gizlenemez; tıklanınca yalnızca taşınır
        pointLabel: 'showLabel',
        arcLength: 'showArcLength',
        radius: 'showRadius',
        chordLength: 'showChordLength',
        centralAngle: 'showCentralAngle',
      };
      const alan = alanAdi[kind as MeasurementKind];
      if (!alan) {
        // Sessizce dönmek, kullanıcının gördüğü "tıklıyorum ama gizlenmiyor" hatasını
        // teşhis edilemez hâle getiriyordu; yeni bir ölçüm türü eklenirse burada patlasın.
        if (process.env.NODE_ENV !== 'production') {
          console.warn('hideMeasurement: bilinmeyen ölçüm türü', kind);
        }
        setHintMessage('Bu etiket gizlenemiyor.');
        return;
      }
      commit(
        (prev) => prev.map((o) => (o.id === objectId ? ({ ...o, [alan]: false } as MathObject) : o)),
        'Ölçüm etiketi gizlendi'
      );
      setHintMessage('Etiket gizlendi. Geri getirmek için nesneye sağ tıklayıp yeniden ölçün.');
    },
    [commit, togglePolygonEdgeLabel]
  );

  /**
   * Bir ölçüm etiketinin şekle GÖRE kayıklığını yazar.
   * `recordHistory=false` sürükleme sırasında kullanılır; bırakılınca tek adım kaydedilir.
   */
  const setLabelOffset = useCallback(
    (objectId: string, kind: MeasurementKind | string, offset: Point2D, recordHistory = true) => {
      const guncelle = (prev: MathObject[]) =>
        prev.map((o) =>
          o.id === objectId
            ? ({ ...o, labelOffsets: { ...(o.labelOffsets || {}), [kind]: offset } } as MathObject)
            : o
        );
      if (recordHistory) commit(guncelle, 'Ölçüm etiketi taşındı');
      else dispatch({ type: 'set', next: guncelle });
    },
    [commit]
  );

  /** Ölçülmüş bir açıyı iç açı <-> dış açı (360° tümleyeni) arasında çevirir. */
  const toggleAngleReflex = useCallback(
    (angleId: string) => {
      const ang = objects.find((o) => o.id === angleId && o.type === 'angle') as AngleObject | undefined;
      if (!ang) return;
      const disMi = !ang.reflex;
      commit(
        (prev) => prev.map((o) => (o.id === angleId ? ({ ...o, reflex: disMi } as MathObject) : o)),
        disMi ? 'Dış açı gösterildi' : 'İç açı gösterildi'
      );
      setHintMessage(disMi ? 'Dış açı gösteriliyor.' : 'İç açı gösteriliyor.');
    },
    [objects, commit]
  );

  /**
   * Bir kenara kesin uzunluk verir: ilk uç sabit kalır, ikinci uç AYNI YÖNDE
   * hedef uzaklığa taşınır. Uç başka bir şekle bağlıysa (çokgen köşesi) yine taşınır,
   * bu durumda çokgen de birlikte değişir - bu istenen davranıştır.
   */
  const setSegmentLength = useCallback(
    (segmentId: string, target: number) => {
      if (!(target > 0)) {
        setHintMessage('Uzunluk sıfırdan büyük olmalı.');
        return;
      }
      const seg = objects.find((o) => o.id === segmentId && o.type === 'segment') as SegmentObject | undefined;
      if (!seg) return;
      const sabit = objects.find((o) => o.id === seg.startPointId && o.type === 'point') as PointObject | undefined;
      const oynak = objects.find((o) => o.id === seg.endPointId && o.type === 'point') as PointObject | undefined;
      if (!sabit || !oynak) return;

      const dx = oynak.x - sabit.x;
      const dy = oynak.y - sabit.y;
      const uzunluk = Math.hypot(dx, dy);
      if (uzunluk < 1e-9) {
        setHintMessage('İki uç üst üste; yön belirsiz.');
        return;
      }
      const k = target / uzunluk;
      const yeniX = Number((sabit.x + dx * k).toFixed(4));
      const yeniY = Number((sabit.y + dy * k).toFixed(4));
      commit(
        (prev) => prev.map((o) => (o.id === oynak.id ? ({ ...o, x: yeniX, y: yeniY } as MathObject) : o)),
        `${seg.label || 'Kenar'} uzunluğu ${formatTurkishNumber(target)} yapıldı`
      );
    },
    [objects, commit]
  );

  /**
   * Bir açıya kesin derece verir: köşe sabit kalır, ikinci kol (point3) köşe etrafında
   * eksik açı kadar döndürülür.
   */
  const setAngleDegrees = useCallback(
    (angleId: string, targetDeg: number) => {
      if (!Number.isFinite(targetDeg) || targetDeg <= 0 || targetDeg >= 360) {
        setHintMessage('Açı 0 ile 360 derece arasında olmalı.');
        return;
      }
      commit((prev) => {
        const ang = prev.find((o) => o.id === angleId && o.type === 'angle') as AngleObject | undefined;
        if (!ang) return prev;
        const vertex = prev.find((o) => o.id === ang.vertexPointId && o.type === 'point') as PointObject | undefined;
        const p1 = prev.find((o) => o.id === ang.point1Id && o.type === 'point') as PointObject | undefined;
        const kol = prev.find((o) => o.id === ang.point3Id && o.type === 'point') as PointObject | undefined;
        if (!vertex || !p1 || !kol) return prev;

        const mevcut = calculateAngleDegrees(p1, vertex, kol);
        // Kolun köşeye göre yönünü, eksik açı kadar döndür
        const rx = kol.x - vertex.x;
        const ry = kol.y - vertex.y;
        const yaricap = Math.hypot(rx, ry);
        if (yaricap < 1e-9) return prev;

        // Dönüş yönü: p1'e göre kolun hangi tarafta olduğunu çapraz çarpımla bul
        const capraz = (p1.x - vertex.x) * ry - (p1.y - vertex.y) * rx;
        const yon = capraz >= 0 ? 1 : -1;
        const farkRad = ((targetDeg - mevcut) * Math.PI) / 180 * yon;
        const cos = Math.cos(farkRad);
        const sin = Math.sin(farkRad);
        const yeniX = Number((vertex.x + rx * cos - ry * sin).toFixed(4));
        const yeniY = Number((vertex.y + rx * sin + ry * cos).toFixed(4));
        return prev.map((o) => (o.id === kol.id ? ({ ...o, x: yeniX, y: yeniY } as MathObject) : o));
      }, `Açı ${formatTurkishNumber(targetDeg)}° yapıldı`);
    },
    [commit]
  );

  /**
   * Bir açıyı sürgüye bağlar: Açının dönen kolu (point3), köşe etrafında p1'den başlayarak
   * sürgünün değeri kadar döndürülür. Sürgü henüz yoksa otomatik oluşturulur.
   */
  const bindAngleToSlider = useCallback(
    (angleId: string, sliderNameOrVar: string) => {
      const cleanName = sliderNameOrVar.trim() || 'α';
      commit((prev) => {
        const ang = prev.find((o) => o.id === angleId && o.type === 'angle') as AngleObject | undefined;
        if (!ang) return prev;
        const p1 = prev.find((o) => o.id === ang.point1Id && o.type === 'point') as PointObject | undefined;
        const v = prev.find((o) => o.id === ang.vertexPointId && o.type === 'point') as PointObject | undefined;
        const p3 = prev.find((o) => o.id === ang.point3Id && o.type === 'point') as PointObject | undefined;
        if (!p1 || !v || !p3) return prev;

        let slider = prev.find(
          (o) =>
            o.type === 'slider' &&
            ((o as SliderObject).variableName.toLowerCase() === cleanName.toLowerCase() ||
              o.label.toLowerCase() === cleanName.toLowerCase() ||
              o.id === cleanName)
        ) as SliderObject | undefined;

        let next = [...prev];
        const currentDeg = calculateAngleDegrees(p1, v, p3);

        if (!slider) {
          const sliderId = createId('slider');
          slider = {
            id: sliderId,
            type: 'slider',
            variableName: cleanName,
            label: cleanName,
            min: 0,
            max: 360,
            step: 1,
            value: Math.round(currentDeg) || 45,
            sliderType: 'angle',
            animSpeed: 1,
            animMode: 'oscillating',
            x: -8,
            y: 6 - prev.filter((o) => o.type === 'slider').length * 1.5,
            color: '#0284c7',
            visible: true,
            createdAt: Date.now(),
          } as SliderObject;
          next.push(slider);
        }

        const updatedP3: PointObject = {
          ...p3,
          construction: {
            kind: 'rotate',
            sourceId: p1.id,
            centerId: v.id,
            sliderId: slider.id,
            sliderVariableName: slider.variableName,
            degrees: slider.value,
          },
        };

        next = next.map((o) => (o.id === p3.id ? updatedP3 : o));
        return next;
      }, `Açı ${sliderNameOrVar} sürgüsüne bağlandı`);
      setHintMessage(`Açı “${cleanName}” sürgüsüne bağlandı. Sürgüyü hareket ettirerek veya oynatarak canlandırabilirsiniz.`);
    },
    [commit]
  );

  /** Açının sürgü bağlantısını çözer. */
  const unbindAngleFromSlider = useCallback(
    (angleId: string) => {
      commit((prev) => {
        const ang = prev.find((o) => o.id === angleId && o.type === 'angle') as AngleObject | undefined;
        if (!ang) return prev;
        const p3 = prev.find((o) => o.id === ang.point3Id && o.type === 'point') as PointObject | undefined;
        if (!p3 || !p3.construction) return prev;
        return prev.map((o) => (o.id === p3.id ? ({ ...o, construction: undefined } as MathObject) : o));
      }, 'Açının sürgü bağlantısı kaldırıldı');
      setHintMessage('Açının sürgü bağlantısı kaldırıldı.');
    },
    [commit]
  );

  /** Çemberin yarıçapını kesin değere ayarlar (yarıçap noktasını merkeze göre taşır). */
  const setCircleRadius = useCallback(
    (circleId: string, target: number) => {
      if (!(target > 0)) {
        setHintMessage('Yarıçap sıfırdan büyük olmalı.');
        return;
      }
      commit((prev) => {
        const circ = prev.find((o) => o.id === circleId && o.type === 'circle') as CircleObject | undefined;
        if (!circ) return prev;
        const merkez = prev.find((o) => o.id === circ.centerPointId && o.type === 'point') as PointObject | undefined;
        if (!merkez) return prev;
        const yariNokta = circ.radiusPointId
          ? (prev.find((o) => o.id === circ.radiusPointId && o.type === 'point') as PointObject | undefined)
          : undefined;

        if (!yariNokta) {
          // Yarıçap noktası yoksa sabit yarıçap alanını güncelle
          return prev.map((o) => (o.id === circleId ? ({ ...o, fixedRadius: target } as MathObject) : o));
        }
        const dx = yariNokta.x - merkez.x;
        const dy = yariNokta.y - merkez.y;
        const uz = Math.hypot(dx, dy);
        // Merkezle çakışıksa varsayılan olarak sağa doğru aç
        const ux = uz < 1e-9 ? 1 : dx / uz;
        const uy = uz < 1e-9 ? 0 : dy / uz;
        const yeniX = Number((merkez.x + ux * target).toFixed(4));
        const yeniY = Number((merkez.y + uy * target).toFixed(4));
        return prev.map((o) => (o.id === yariNokta.id ? ({ ...o, x: yeniX, y: yeniY } as MathObject) : o));
      }, `Yarıçap ${formatTurkishNumber(target)} yapıldı`);
    },
    [commit]
  );

  const cancelPendingAction = useCallback(() => {
    setPendingPointIds([]);
  }, []);

  const setActiveTool = useCallback((tool: ToolMode) => {
    setActiveToolState(tool);
    setPendingPointIds([]);
  }, []);

  // -------------------------------------------------------------------------
  // Noktaya tıklanması durumu (Araç oluşturma adımları)
  // objectsOverride: Aynı olay içinde yeni oluşturulmuş noktaları da içeren
  // nesne listesi ([...objects, ...yeniNoktalar] biçiminde olmalı).
  // -------------------------------------------------------------------------
  const handlePointClick = useCallback(
    (pointId: string, objectsOverride?: MathObject[]) => {
      const { activeTool: tool, pendingPointIds: pending, objects: currentObjects } = latest.current;
      const objs = objectsOverride ?? currentObjects;
      // Henüz duruma yazılmamış (bu olayda yaratılan) nesneler
      const newlyCreated = objectsOverride ? objectsOverride.slice(currentObjects.length) : [];
      const pointOf = (id: string) => objs.find((o) => o.id === id && o.type === 'point') as PointObject | undefined;
      const commitWith = (extra: MathObject[], description: string) => {
        commit((prev) => [...prev, ...newlyCreated, ...extra], description);
      };
      const commitPendingOnly = () => {
        if (newlyCreated.length > 0) {
          const desc =
            newlyCreated.length === 1
              ? `${describeObject(newlyCreated[0])} oluşturuldu`
              : `${newlyCreated.length} nokta oluşturuldu`;
          commitWith([], desc);
        }
      };

      if (tool === 'select') {
        setSelectedObjectId(pointId);
        return;
      }

      if (tool === 'delete') {
        deleteObject(pointId);
        return;
      }

      if (tool === 'segment' || tool === 'line' || tool === 'ray' || tool === 'circle') {
        const nextPending = [...pending, pointId];
        if (nextPending.length === 1) {
          commitPendingOnly();
          setPendingPointIds(nextPending);
          return;
        }

        if (nextPending[0] !== nextPending[1]) {
          const p1 = pointOf(nextPending[0]);
          const p2 = pointOf(nextPending[1]);
          const names = p1 && p2 ? `${p1.label}${p2.label}` : '';

          if (tool === 'segment') {
            const label = names ? `[${names}]` : 'Doğru Parçası';
            const newSegment: SegmentObject = {
              id: createId('seg'),
              type: 'segment',
              label,
              showLabel: true,
              startPointId: nextPending[0],
              endPointId: nextPending[1],
              color: '#0284c7',
              visible: true,
              showLength: true,
              thickness: 2.5,
              createdAt: Date.now(),
            };
            commitWith([newSegment], `${label} doğru parçası oluşturuldu`);
          } else if (tool === 'line') {
            const label = names ? `${names} Doğrusu` : 'Doğru';
            const newLine: LineObject = {
              id: createId('line'),
              type: 'line',
              label,
              showLabel: true,
              point1Id: nextPending[0],
              point2Id: nextPending[1],
              color: '#0284c7',
              visible: true,
              showEquation: true,
              thickness: 2,
              createdAt: Date.now(),
            };
            commitWith([newLine], `${label} oluşturuldu`);
          } else if (tool === 'ray') {
            const label = names ? `${names} Işını` : 'Işın';
            const newRay: RayObject = {
              id: createId('ray'),
              type: 'ray',
              label,
              showLabel: true,
              startPointId: nextPending[0],
              throughPointId: nextPending[1],
              color: '#0284c7',
              visible: true,
              thickness: 2,
              createdAt: Date.now(),
            };
            commitWith([newRay], `${label} oluşturuldu`);
          } else {
            const label = p1 ? `${p1.label} Merkezli Çember` : 'Çember';
            const newCircle: CircleObject = {
              id: createId('circ'),
              type: 'circle',
              label,
              showLabel: true,
              centerPointId: nextPending[0],
              radiusPointId: nextPending[1],
              color: '#8b5cf6',
              visible: true,
              showArea: true,
              showPerimeter: true,
              fillOpacity: 0.1,
              createdAt: Date.now(),
            };
            commitWith([newCircle], `${label} oluşturuldu`);
          }
        } else {
          commitPendingOnly();
        }
        setPendingPointIds([]);
        return;
      }

      // AÇIÖLÇER: salt ölçüm yapar, tuvale kalıcı nesne eklemez
      if (tool === 'measure_angle') {
        const nextPending = [...pending, pointId];
        commitPendingOnly();

        if (nextPending.length < 3) {
          setPendingPointIds(nextPending);
          setHintMessageState(
            nextPending.length === 1
              ? '📐 Açı ölçümü: şimdi köşe (tepe) noktasına tıklayın'
              : '📐 Açı ölçümü: son olarak üçüncü noktaya tıklayın'
          );
          return;
        }

        setPendingPointIds([]);
        const mp1 = pointOf(nextPending[0]);
        const mVertex = pointOf(nextPending[1]);
        const mp3 = pointOf(nextPending[2]);
        if (!mp1 || !mVertex || !mp3 || new Set(nextPending).size < 3) {
          setHintMessageState('Farklı üç nokta seçin');
          return;
        }

        const measured = formatTurkishNumber(calculateAngleDegrees(mp1, mVertex, mp3), 1);
        setHintMessageState(
          `📐 Açı Ölçümü: ∠${mp1.label}${mVertex.label}${mp3.label} = ${measured}°`
        );
        return;
      }

      // Üç tıklamalı çember araçları: üç noktadan geçen çember, yay ve daire dilimi
      // ---------------------------------------------------------------------
      // KLASİK İNŞALAR — hepsi tıklanan noktalardan yeni nokta/doğru üretir.
      // ---------------------------------------------------------------------

      /** Yeni bir yardımcı nokta üretir; etiketi sıradaki boş harftir. */
      const yardimciNokta = (x: number, y: number, renk = '#7c3aed'): PointObject => {
        const mevcut = [...objs, ...newlyCreated]
          .filter((o): o is PointObject => o.type === 'point')
          .map((o) => o.label || '');
        const [ad] = generateNextPointLabels(mevcut, 1);
        return {
          id: createId('pt'),
          type: 'point',
          label: ad,
          showLabel: true,
          x: Number(x.toFixed(4)),
          y: Number(y.toFixed(4)),
          color: renk,
          visible: true,
          isIndependent: true,
          createdAt: Date.now(),
        };
      };

      /** İki nokta isteyen inşa araçları */
      const IKI_NOKTALI = ['midpoint', 'divide_ratio', 'perp_bisector', 'measure_slope'];
      if (IKI_NOKTALI.includes(tool)) {
        const nextPending = [...pending, pointId];
        if (nextPending.length < 2) {
          commitPendingOnly();
          setPendingPointIds(nextPending);
          return;
        }
        setPendingPointIds([]);
        const a = pointOf(nextPending[0]);
        const b = pointOf(nextPending[1]);
        if (!a || !b || nextPending[0] === nextPending[1]) {
          setHintMessage('İki FARKLI nokta seçmelisiniz.');
          commitPendingOnly();
          return;
        }

        if (tool === 'midpoint') {
          const m = midpoint(a, b);
          const nokta = yardimciNokta(m.x, m.y);
          commitWith([nokta], nokta.label + ' orta noktası oluşturuldu');
          setHintMessage(nokta.label + ', [' + a.label + b.label + '] parçasının orta noktasıdır.');
          return;
        }

        if (tool === 'perp_bisector') {
          const pb = perpendicularBisector(a, b);
          if (!pb) {
            setHintMessage('Orta dikme kurulamadı: noktalar çakışık.');
            commitPendingOnly();
            return;
          }
          const n1 = yardimciNokta(pb[0].x, pb[0].y, '#0f766e');
          const n2 = yardimciNokta(pb[1].x, pb[1].y, '#0f766e');
          const dogru: LineObject = {
            id: createId('line'),
            type: 'line',
            label: '[' + a.label + b.label + '] Orta Dikmesi',
            showLabel: true,
            point1Id: n1.id,
            point2Id: n2.id,
            color: '#0f766e',
            visible: true,
            createdAt: Date.now(),
          };
          commitWith([n1, n2, dogru], dogru.label + ' oluşturuldu');
          return;
        }

        if (tool === 'measure_slope') {
          // Sonuç geçici ipucu satırında kaybolmasın: tuvale kalıcı, CANLI bir etiket konur.
          const zatenVar = objs.some(
            (o) =>
              o.type === 'measurement' &&
              (o as MeasurementObject).kind === 'slope' &&
              (o as MeasurementObject).pointIds.join('|') === [a.id, b.id].join('|')
          );
          if (zatenVar) {
            setHintMessage(a.label + b.label + ' eğimi zaten ölçülmüş.');
            commitPendingOnly();
            return;
          }
          const etiket: MeasurementObject = {
            id: createId('olc'),
            type: 'measurement',
            kind: 'slope',
            label: a.label + b.label + ' eğimi',
            showLabel: true,
            pointIds: [a.id, b.id],
            showValue: true,
            color: '#059669',
            visible: true,
            createdAt: Date.now(),
          };
          const egim = calculateSlope(a, b);
          commitWith([etiket], etiket.label + ' ölçüldü');
          setHintMessage(
            egim === null
              ? a.label + b.label + ' dikey bir doğru: eğimi tanımsızdır.'
              : a.label + b.label + ' eğimi = ' + formatTurkishNumber(Number(egim.toFixed(4)))
          );
          return;
        }

        if (tool === 'divide_ratio') {
          // Oran kullanıcıdan sorulur; tıklanan noktalar kaybolmasın diye önce kaydedilir.
          commitPendingOnly();
          setValuePrompt({
            title: 'Oranda Böl',
            label: '[' + a.label + b.label + '] parçasını böl',
            initial: '1:1',
            placeholder: 'örn. 2:1',
            hint:
              a.label +
              ' tarafındaki pay önce yazılır. 2:1 oranı, parçayı ' +
              a.label +
              ' ucuna 2 birim, ' +
              b.label +
              ' ucuna 1 birim uzaklıkta böler.',
            onSubmit: (raw: string) => {
              const parcalar = raw.split(/[:;/]/).map((x) => x.trim().replace(',', '.'));
              if (parcalar.length !== 2) return 'Oranı m:n biçiminde yazın (örn. 2:1).';
              const m = Number(parcalar[0]);
              const n = Number(parcalar[1]);
              if (!Number.isFinite(m) || !Number.isFinite(n) || m < 0 || n < 0) {
                return 'İki tarafta da negatif olmayan birer sayı olmalı.';
              }
              const t = ratioToT(m, n);
              if (t === null) return 'Oran toplamı sıfır olamaz.';
              const nokta = yardimciNokta(
                a.x + (b.x - a.x) * t,
                a.y + (b.y - a.y) * t
              );
              commit((prev) => [...prev, nokta], nokta.label + ' noktası ' + raw + ' oranında oluşturuldu');
              setHintMessage(
                nokta.label + ', [' + a.label + b.label + '] parçasını ' + raw + ' oranında böler.'
              );
              return null;
            },
          });
          return;
        }
      }

      /** Tek nokta + uzunluk isteyen araç: verilen uzunlukta doğru parçası */
      if (tool === 'segment_length') {
        setPendingPointIds([]);
        const bas = pointOf(pointId);
        if (!bas) return;
        commitPendingOnly();
        setValuePrompt({
          title: 'Uzunluğu Verilen Doğru Parçası',
          label: `${bas.label} noktasından başlayan parçanın uzunluğu`,
          unit: 'br',
          initial: '5',
          hint: 'Parça yatay olarak sağa doğru çizilir; sonra uç noktasını sürükleyerek döndürebilirsiniz.',
          onSubmit: (raw: string) => {
            // Düz sayı da olabilir, kaydırıcı/ifade de: "5", "a", "2*a", "sqrt(8)"
            const kapsam: Record<string, number> = {};
            for (const o of latest.current.objects) {
              if (o.type === 'slider') kapsam[(o as SliderObject).variableName] = (o as SliderObject).value;
            }
            const okundu = evaluateNumericInput(raw, kapsam);
            if (!okundu.ok) return okundu.error;
            const uzunluk = okundu.value;
            if (uzunluk <= 0) return 'Uzunluk sıfırdan büyük olmalı.';
            const uc = yardimciNokta(bas.x + uzunluk, bas.y, '#0284c7');
            const seg: SegmentObject = {
              id: createId('seg'),
              type: 'segment',
              label: `[${bas.label}${uc.label}]`,
              showLabel: true,
              startPointId: bas.id,
              endPointId: uc.id,
              color: '#0284c7',
              showLength: true,
              unit: 'br',
              visible: true,
              createdAt: Date.now(),
            };
            commit(
              (prev) => [...prev, uc, seg],
              `${seg.label} oluşturuldu (${formatTurkishNumber(uzunluk)} br)`
            );
            return null;
          },
        });
        return;
      }

      /** Öteleme: seçili şekil, tıklanan iki noktanın belirlediği vektör kadar kopyalanır */
      if (tool === 'translate') {
        const nextPending = [...pending, pointId];
        if (nextPending.length < 2) {
          commitPendingOnly();
          setPendingPointIds(nextPending);
          setHintMessage('Şimdi vektörün BİTİŞ noktasına tıklayın.');
          return;
        }
        setPendingPointIds([]);
        const a = pointOf(nextPending[0]);
        const b = pointOf(nextPending[1]);
        if (!a || !b || nextPending[0] === nextPending[1]) {
          setHintMessage('Vektör için iki FARKLI nokta seçmelisiniz.');
          commitPendingOnly();
          return;
        }
        // Ötelenecek şekil: "Seç ve Taşı" ile seçili olan (nokta değil, bir ŞEKİL)
        const secili = latest.current.selectedObjectIds;
        const hedef = objs.find((o) => secili.includes(o.id) && o.type !== 'point');
        if (!hedef) {
          setHintMessage('Önce ötelenecek şekli "Seç ve Taşı" ile seçin, sonra vektörün iki noktasına tıklayın.');
          commitPendingOnly();
          return;
        }
        const vektor = { x: b.x - a.x, y: b.y - a.y };
        const kopya = oteleSekil(hedef, vektor, [...objs, ...newlyCreated], yardimciNokta);
        if (!kopya) {
          setHintMessage('Bu şekil ötelenemiyor.');
          commitPendingOnly();
          return;
        }
        commitWith(
          kopya,
          `${describeObject(hedef)} ötelendi (${formatTurkishNumber(vektor.x)}; ${formatTurkishNumber(vektor.y)})`
        );
        setHintMessage(
          `Öteleme tamamlandı: görüntü mor renkle çizildi. Vektör = (${formatTurkishNumber(vektor.x)}; ${formatTurkishNumber(vektor.y)})`
        );
        return;
      }

      /** Üç nokta isteyen inşa araçları */
      const UC_NOKTALI = ['angle_bisector', 'perpendicular', 'parallel', 'trig_ratios'];
      if (UC_NOKTALI.includes(tool)) {
        const nextPending = [...pending, pointId];
        if (nextPending.length < 3) {
          commitPendingOnly();
          setPendingPointIds(nextPending);
          return;
        }
        setPendingPointIds([]);
        const a = pointOf(nextPending[0]);
        const b = pointOf(nextPending[1]);
        const c = pointOf(nextPending[2]);
        if (!a || !b || !c || new Set(nextPending).size < 3) {
          setHintMessage('Üç FARKLI nokta seçmelisiniz.');
          commitPendingOnly();
          return;
        }

        if (tool === 'angle_bisector') {
          // a = bir kol, b = KÖŞE, c = diğer kol
          const uc = angleBisectorPoint(a, b, c);
          if (!uc) {
            setHintMessage('Açıortay kurulamadı: kollar aynı doğru üzerinde ve ters yönlü.');
            commitPendingOnly();
            return;
          }
          const n2 = yardimciNokta(uc.x, uc.y, '#c2410c');
          const isin: RayObject = {
            id: createId('ray'),
            type: 'ray',
            label: a.label + b.label + c.label + ' Açıortayı',
            showLabel: true,
            startPointId: b.id,
            throughPointId: n2.id,
            color: '#c2410c',
            visible: true,
            createdAt: Date.now(),
          };
          commitWith([n2, isin], isin.label + ' oluşturuldu');
          return;
        }

        if (tool === 'perpendicular' || tool === 'parallel') {
          // a,b doğrultuyu verir; c doğrunun geçtiği noktadır
          const ikinci =
            tool === 'perpendicular' ? perpendicularThrough(a, b, c) : parallelThrough(a, b, c);
          if (!ikinci) {
            setHintMessage('Doğrultu kurulamadı: ilk iki nokta çakışık.');
            commitPendingOnly();
            return;
          }
          const n2 = yardimciNokta(ikinci.x, ikinci.y, '#1d4ed8');
          const dogru: LineObject = {
            id: createId('line'),
            type: 'line',
            label:
              (tool === 'perpendicular' ? 'Dik doğru: ' : 'Paralel doğru: ') +
              c.label +
              ' / ' +
              a.label +
              b.label,
            showLabel: true,
            point1Id: c.id,
            point2Id: n2.id,
            color: '#1d4ed8',
            visible: true,
            createdAt: Date.now(),
          };
          commitWith([n2, dogru], dogru.label + ' oluşturuldu');
          return;
        }


        if (tool === 'trig_ratios') {
          // Sıra: bir kol, AÇININ KÖŞESİ, diğer kol — açı aracıyla aynı mantık.
          // Dik üçgen şartı YOK: oranlar açıdan hesaplanır, üçgen dikse kenar
          // oranları da ayrıca gösterilir.
          const o = angleTrigRatios(a, b, c);
          if (!o) {
            setHintMessage('Oranlar hesaplanamadı: noktalar çakışık.');
            commitPendingOnly();
            return;
          }
          const etiket: MeasurementObject = {
            id: createId('olc'),
            type: 'measurement',
            kind: 'trig',
            label: a.label + b.label + c.label + ' açısının oranları',
            showLabel: true,
            pointIds: [a.id, b.id, c.id],
            showValue: true,
            color: '#7c3aed',
            visible: true,
            createdAt: Date.now(),
          };
          commitWith([etiket], etiket.label + ' ölçüldü');
          const y = (v: number) => formatTurkishNumber(Number(v.toFixed(4)));
          setHintMessage(
            b.label +
              ' açısı = ' +
              y(o.derece) +
              '°  ·  sin = ' +
              y(o.sin) +
              '  ·  cos = ' +
              y(o.cos) +
              '  ·  tan = ' +
              (o.tan === null ? 'tanımsız' : y(o.tan)) +
              (o.kenarlar ? '  ·  dik üçgen: kenar oranları da gösteriliyor' : '')
          );
          return;
        }
      }

      if (tool === 'circle_3points' || tool === 'arc' || tool === 'sector') {
        const nextPending = [...pending, pointId];
        if (nextPending.length < 3) {
          commitPendingOnly();
          setPendingPointIds(nextPending);
          return;
        }
        const [a, b, c] = nextPending.map(pointOf);
        if (!a || !b || !c) {
          setPendingPointIds([]);
          return;
        }
        // Aynı noktaya iki kez tıklanmışsa şekil kurulamaz
        if (new Set(nextPending).size < 3) {
          setHintMessage('Üç FARKLI nokta seçmelisiniz.');
          setPendingPointIds([]);
          return;
        }

        if (tool === 'circle_3points') {
          const cc = calculateCircumcircle(a, b, c);
          if (!cc) {
            setHintMessage('Üç nokta aynı doğru üzerinde; çember çizilemez.');
            setPendingPointIds([]);
            return;
          }
          const newCircle: CircleObject = {
            id: createId('circ'),
            type: 'circle',
            label: `${a.label}${b.label}${c.label} Çemberi`,
            showLabel: true,
            centerPointId: '',
            throughPointIds: [a.id, b.id, c.id],
            color: '#8b5cf6',
            fillOpacity: 0,
            visible: true,
            createdAt: Date.now(),
          };
          commitWith([newCircle], `${newCircle.label} oluşturuldu`);
        } else if (tool === 'arc' || tool === 'sector') {
          // Üçüncü nokta yalnızca AÇIYI belirler; yarıçapı |merkez-başlangıç| verir.
          // Bu yüzden nokta yayın üzerinde durmaz ve kaymış görünür. Nokta BU TIKLAMAYLA
          // yeni oluşturulduysa onu yayın üzerine (aynı açıda, doğru yarıçapta) oturturuz.
          // Var olan bir noktaya tıklandıysa dokunmayız: başka nesneler ona bağlı olabilir.
          const yeniMi = newlyCreated.some((o) => o.id === c.id);
          const yaricap = calculateDistance(a, b);
          const dx = c.x - a.x;
          const dy = c.y - a.y;
          const uz = Math.hypot(dx, dy);
          const yayUstunde =
            yeniMi && uz > 1e-9 && yaricap > 1e-9
              ? {
                  x: Number((a.x + (dx / uz) * yaricap).toFixed(4)),
                  y: Number((a.y + (dy / uz) * yaricap).toFixed(4)),
                }
              : null;
          const kaydirilmisNoktalar = yayUstunde
            ? newlyCreated.map((o) => (o.id === c.id ? ({ ...o, ...yayUstunde } as MathObject) : o))
            : newlyCreated;

          const ortak = {
            centerPointId: a.id,
            startPointId: b.id,
            directionPointId: c.id,
            visible: true,
            showLabel: true,
            createdAt: Date.now(),
          };
          const yeniSekil: MathObject =
            tool === 'arc'
              ? ({
                  ...ortak,
                  id: createId('arc'),
                  type: 'arc',
                  label: `${b.label}${c.label} Yayı`,
                  color: '#0284c7',
                  thickness: 3,
                  showArcLength: true,
                } as ArcObject)
              : ({
                  ...ortak,
                  id: createId('sect'),
                  type: 'sector',
                  label: `${a.label} Daire Dilimi`,
                  color: '#10b981',
                  fillColor: '#10b981',
                  fillOpacity: 0.4,
                  showArea: true,
                } as SectorObject);

          commit(
            (prev) => [...prev, ...kaydirilmisNoktalar, yeniSekil],
            `${yeniSekil.label} oluşturuldu`
          );
          setPendingPointIds([]);
          return;
        }

        setPendingPointIds([]);
        return;
      }

      if (tool === 'angle') {
        const nextPending = [...pending, pointId];
        if (nextPending.length < 3) {
          commitPendingOnly();
          setPendingPointIds(nextPending);
          return;
        }

        // Aynı noktaya tekrar tıklandıysa dejenere açı oluşturma
        if (new Set(nextPending).size < 3) {
          commitPendingOnly();
          setPendingPointIds([]);
          setHintMessageState('Farklı üç nokta seçin');
          return;
        }

        const p1 = pointOf(nextPending[0]);
        const vertex = pointOf(nextPending[1]);
        const p3 = pointOf(nextPending[2]);
        const deg = p1 && vertex && p3 ? Math.round(calculateAngleDegrees(p1, vertex, p3)) : 0;
        const label = p1 && vertex && p3 ? `∠${p1.label}${vertex.label}${p3.label}` : 'Açı';

        // Açının kollarını birleştiren doğru parçaları
        const seg1: SegmentObject = {
          id: createId('seg'),
          type: 'segment',
          label: vertex && p1 ? `[${vertex.label}${p1.label}]` : 'Açı Kolu',
          showLabel: false,
          startPointId: nextPending[1],
          endPointId: nextPending[0],
          color: '#f59e0b',
          visible: true,
          thickness: 2,
          createdAt: Date.now(),
        };

        const seg2: SegmentObject = {
          id: createId('seg'),
          type: 'segment',
          label: vertex && p3 ? `[${vertex.label}${p3.label}]` : 'Açı Kolu',
          showLabel: false,
          startPointId: nextPending[1],
          endPointId: nextPending[2],
          color: '#f59e0b',
          visible: true,
          thickness: 2,
          createdAt: Date.now(),
        };

        const newAngle: AngleObject = {
          id: createId('ang'),
          type: 'angle',
          label,
          showLabel: true,
          point1Id: nextPending[0],
          vertexPointId: nextPending[1],
          point3Id: nextPending[2],
          color: '#f59e0b',
          visible: true,
          showValue: true,
          createdAt: Date.now(),
        };

        commitWith([seg1, seg2, newAngle], `${label} = ${deg}° açısı oluşturuldu`);
        setPendingPointIds([]);
        return;
      }

      if (tool === 'measure_distance' || tool === 'unit_measure') {
        const nextPending = [...pending, pointId];
        const isCm = tool === 'measure_distance';
        const unit = isCm ? 'cm' : 'br';

        if (nextPending.length === 1) {
          commitPendingOnly();
          setPendingPointIds(nextPending);
          return;
        }

        if (nextPending[0] !== nextPending[1]) {
          const p1 = pointOf(nextPending[0]);
          const p2 = pointOf(nextPending[1]);
          if (p1 && p2) {
            const rawDist = calculateDistance(p1, p2);
            const distStr = formatTurkishNumber(rawDist);
            const segLabel = `|${p1.label}${p2.label}|`;

            const newSegment: SegmentObject = {
              id: createId('seg'),
              type: 'segment',
              label: segLabel,
              showLabel: true,
              unit,
              startPointId: nextPending[0],
              endPointId: nextPending[1],
              color: isCm ? '#0284c7' : '#059669',
              visible: true,
              showLength: true,
              thickness: 3,
              createdAt: Date.now(),
            };
            commitWith([newSegment], `${segLabel} = ${distStr} ${unit} ölçüldü`);
            // İpucu kapsülü hem etkinlikte hem serbest masada görünür ve kendiliğinden
            // temizlenir; activeSuccessMessage yalnızca etkinlik başarı kutusuna aittir.
            setHintMessageState(`📏 ${isCm ? 'Uzunluk' : 'Birim'} Ölçümü: ${distStr} ${unit} (${segLabel})`);
          } else {
            commitPendingOnly();
          }
        } else {
          commitPendingOnly();
        }
        setPendingPointIds([]);
        return;
      }

      if (tool === 'measure_area' || tool === 'measure_perimeter') {
        // Çokgen köşe noktalarını topla; ilk noktaya tekrar tıklanınca kapat
        if (pending.length >= 3 && pending[0] === pointId) {
          const polyPoints = pending.map((id) => pointOf(id)).filter(Boolean) as PointObject[];
          const areaVal = formatTurkishNumber(calculatePolygonArea(polyPoints));
          const perimVal = formatTurkishNumber(calculatePolygonPerimeter(polyPoints));
          const isArea = tool === 'measure_area';

          const newPolygon: PolygonObject = {
            id: createId('poly'),
            type: 'polygon',
            label: 'Çokgen',
            showLabel: true,
            pointIds: [...pending],
            color: '#10b981',
            fillColor: '#10b981',
            fillOpacity: 0.2,
            visible: true,
            showArea: isArea,
            showPerimeter: !isArea,
            createdAt: Date.now(),
          };
          commitWith(
            [newPolygon],
            isArea ? `Çokgen alanı hesaplandı (${areaVal} br²)` : `Çokgen çevresi hesaplandı (${perimVal} br)`
          );
          setPendingPointIds([]);
        } else if (!pending.includes(pointId)) {
          commitPendingOnly();
          setPendingPointIds([...pending, pointId]);
        }
        return;
      }

      if (tool === 'polygon') {
        // İlk noktaya tekrar tıklandıysa çokgeni kapat
        if (pending.length >= 3 && pending[0] === pointId) {
          const names = pending
            .map((id) => pointOf(id)?.label)
            .filter(Boolean)
            .join('');
          const newPolygon: PolygonObject = {
            id: createId('poly'),
            type: 'polygon',
            label: names ? `${names} Çokgeni` : 'Çokgen',
            showLabel: true,
            pointIds: [...pending],
            color: '#10b981',
            fillColor: '#10b981',
            fillOpacity: 0.15,
            visible: true,
            showArea: true,
            showPerimeter: true,
            createdAt: Date.now(),
          };
          commitWith([newPolygon], `${newPolygon.label} oluşturuldu`);
          setPendingPointIds([]);
        } else if (!pending.includes(pointId)) {
          commitPendingOnly();
          setPendingPointIds([...pending, pointId]);
        }
        return;
      }

      // Diğer araçlarda yeni nokta oluşturulduysa yine de kaydet
      commitPendingOnly();
    },
    [commit, deleteObject, setSelectedObjectId]
  );

  // -------------------------------------------------------------------------
  // Tuval boşluğuna tıklandığında
  // -------------------------------------------------------------------------
  /**
   * Yeni bir nokta konulurken, imleç bir nesnenin KENARINA yeterince yakınsa
   * noktayı tam o kenarın üzerine oturtur ("nesne üzerinde nokta").
   *
   * Kenarı bölmek, alanı parçalamak ya da kesişimi işaretlemek için nokta tam
   * çizginin üzerinde olmalıdır; göz kararı konan nokta birkaç piksel kayar ve
   * sonraki hesaplar (alan bölme, açı) yanlış çıkar.
   *
   * Eşik EKRAN pikseli cinsindendir; yakınlaştırmadan bağımsız davranır.
   */
  const kenaraYapistir = (world: Point2D): { nokta: Point2D; hostId: string | null } => {
    const { objects: objs, viewport: vp } = latest.current;
    const esikDunya = 12 / (vp.zoom || 1);
    const nk = (id: string) => objs.find((o) => o.id === id && o.type === 'point') as PointObject | undefined;

    let enIyi: { nokta: Point2D; uzaklik: number; hostId: string } | null = null;
    let suAnkiHost = '';
    const dene = (nokta: Point2D | null | undefined) => {
      if (!nokta) return;
      const u = calculateDistance(world, nokta);
      if (u <= esikDunya && (!enIyi || u < enIyi.uzaklik)) {
        enIyi = { nokta, uzaklik: u, hostId: suAnkiHost };
      }
    };

    for (const o of objs) {
      if (o.visible === false) continue;
      suAnkiHost = o.id;
      if (o.type === 'segment') {
        const a = nk(o.startPointId);
        const b = nk(o.endPointId);
        if (a && b) dene(distanceToSegment(world, a, b).projection);
      } else if (o.type === 'line' || o.type === 'ray') {
        const a = o.type === 'line' ? nk(o.point1Id) : nk(o.startPointId);
        const b = o.type === 'line' ? nk(o.point2Id) : nk(o.throughPointId);
        if (a && b) {
          // Sonsuz doğruda uçlarla sınırlamamak için yönü uzatarak izdüşüm alırız
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const uz2 = dx * dx + dy * dy;
          if (uz2 > 1e-18) {
            const t = ((world.x - a.x) * dx + (world.y - a.y) * dy) / uz2;
            dene({ x: a.x + dx * t, y: a.y + dy * t });
          }
        }
      } else if (o.type === 'circle') {
        const c = o as CircleObject;
        const merkez = nk(c.centerPointId);
        if (merkez) {
          const yari = c.radiusPointId ? nk(c.radiusPointId) : undefined;
          const r = c.fixedRadius ?? (yari ? calculateDistance(merkez, yari) : 0);
          if (r > 0) dene(closestPointOnCircle(merkez, r, world));
        }
      } else if (o.type === 'ellipse') {
        const e = o as EllipseObject;
        const merkez = nk(e.centerPointId);
        if (merkez) dene(closestPointOnEllipse(merkez, e.radiusX, e.radiusY, world));
      } else if (o.type === 'arc' || o.type === 'sector') {
        const merkez = nk(o.centerPointId);
        const bas = nk(o.startPointId);
        if (merkez && bas) {
          const r = calculateDistance(merkez, bas);
          if (r > 0) dene(closestPointOnCircle(merkez, r, world));
        }
      } else if (o.type === 'polygon') {
        const kose = o.pointIds.map(nk).filter(Boolean) as PointObject[];
        if (kose.length >= 3) {
          const r = closestPointOnPolygonEdge(kose, world);
          if (r) dene(r.point);
        }
      }
    }

    if (!enIyi) return { nokta: world, hostId: null };
    const y = enIyi as { nokta: Point2D; uzaklik: number; hostId: string };
    return {
      nokta: { x: Number(y.nokta.x.toFixed(4)), y: Number(y.nokta.y.toFixed(4)) },
      hostId: y.hostId,
    };
  };

  const handleCanvasClick = useCallback(
    (rawWorldPos: Point2D) => {
      const {
        activeTool: tool,
        objects: currentObjects,
        viewport: vp,
        selectedObjectIds: selIds,
      } = latest.current;
      const currentSelectedId = selIds[0] || null;

      // -------------------------------------------------------------------
      // ETKİLEŞİM BİLEŞENLERİ: işaret kutusu, düğme, girdi kutusu
      // Hepsi tıklanan yere yerleşir ve O AN SEÇİLİ nesnelere bağlanır.
      // -------------------------------------------------------------------
      if (tool === 'checkbox' || tool === 'button' || tool === 'input_box') {
        const hedefler = selIds.filter((id) => currentObjects.some((o) => o.id === id));
        const konum = { x: Number(rawWorldPos.x.toFixed(2)), y: Number(rawWorldPos.y.toFixed(2)) };

        if (tool === 'input_box') {
          // Girdi kutusu TEK bir kaydırıcıya veya fonksiyona bağlanır
          const hedef = currentObjects.find(
            (o) => hedefler.includes(o.id) && (o.type === 'slider' || o.type === 'function')
          );
          if (!hedef) {
            setHintMessage(
              'Önce bir KAYDIRICI veya FONKSİYON seçin ("Seç ve Taşı" ile), sonra girdi kutusunun yerine tıklayın.'
            );
            return;
          }
          const kutu: InputBoxObject = {
            id: createId('inp'),
            type: 'input_box',
            label: hedef.type === 'slider' ? `${(hedef as SliderObject).variableName} =` : 'f(x) =',
            showLabel: true,
            x: konum.x,
            y: konum.y,
            targetId: hedef.id,
            field: hedef.type === 'slider' ? 'value' : 'expression',
            width: hedef.type === 'slider' ? 90 : 170,
            color: '#0d9488',
            visible: true,
            createdAt: Date.now(),
          };
          commit((prev) => [...prev, kutu], 'Girdi kutusu eklendi');
          setHintMessage(
            `Girdi kutusu ${describeObject(hedef)} nesnesine bağlandı. Değeri yazıp Enter'a basın.`
          );
          return;
        }

        if (hedefler.length === 0) {
          setHintMessage(
            tool === 'checkbox'
              ? 'Önce gösterip gizlemek istediğiniz nesneleri seçin ("Seç ve Taşı" + Shift), sonra kutunun yerine tıklayın.'
              : 'Önce düğmenin etkileyeceği nesneleri veya kaydırıcıları seçin, sonra düğmenin yerine tıklayın.'
          );
          return;
        }

        if (tool === 'checkbox') {
          const kutu: CheckboxObject = {
            id: createId('chk'),
            type: 'checkbox',
            label: `${hedefler.length} nesneyi göster`,
            showLabel: true,
            x: konum.x,
            y: konum.y,
            targetIds: hedefler,
            checked: true,
            color: '#2563eb',
            visible: true,
            createdAt: Date.now(),
          };
          commit((prev) => [...prev, kutu], 'İşaret kutusu eklendi');
          setHintMessage(
            `İşaret kutusu ${hedefler.length} nesneye bağlandı. Kutuyu kapatınca nesneler gizlenir, silinmez.`
          );
          return;
        }

        // Düğme: seçimde kaydırıcı varsa canlandırma, yoksa göster/gizle
        const kaydiricilar = hedefler.filter((id) =>
          currentObjects.some((o) => o.id === id && o.type === 'slider')
        );
        const dugme: ButtonObject = {
          id: createId('btn'),
          type: 'button',
          label: kaydiricilar.length > 0 ? 'Oynat / Durdur' : 'Göster / Gizle',
          showLabel: true,
          x: konum.x,
          y: konum.y,
          action:
            kaydiricilar.length > 0
              ? { kind: 'animate', sliderIds: kaydiricilar }
              : { kind: 'toggle', targetIds: hedefler },
          color: '#4f46e5',
          visible: true,
          createdAt: Date.now(),
        };
        commit((prev) => [...prev, dugme], 'Düğme eklendi');
        setHintMessage(
          kaydiricilar.length > 0
            ? `Düğme ${kaydiricilar.length} kaydırıcının canlandırmasını başlatıp durduracak.`
            : `Düğme ${hedefler.length} nesneyi gösterip gizleyecek.`
        );
        return;
      }

      // Ölçme aletleri, alan modeli, kalem, görsel, metin ve kaydırma:
      // tuval tıklaması burada nesne üretmez (metin notu Canvas'taki diyalogla eklenir).
      if (
        tool === 'ruler' ||
        tool === 'setsquare' ||
        tool === 'measure_angle' ||
        tool === 'area_model' ||
        tool === 'pan' ||
        tool === 'pen' ||
        tool === 'image' ||
        tool === 'text'
      ) {
        return;
      }

      // Önce NESNE KENARINA yapıştırmayı dene: kenarın üzerine nokta koymak,
      // ızgaraya oturtmaktan daha belirleyicidir (kesişim, alan bölme, açı hep buna dayanır).
      const yapisma = kenaraYapistir(rawWorldPos);
      const kenaraYapisti = yapisma.hostId !== null;
      const worldPos = kenaraYapisti ? yapisma.nokta : snapToVisibleGrid(rawWorldPos, vp);
      const existingLabels = (currentObjects.filter((o) => o.type === 'point') as PointObject[]).map((p) => p.label);

      const makePoint = (label: string, x: number, y: number, color = '#2563eb'): PointObject => ({
        id: createId('pt'),
        type: 'point',
        label,
        showLabel: true,
        x,
        y,
        color,
        visible: true,
        isIndependent: true,
        createdAt: Date.now(),
      });

      // 1. NOKTA ARACI
      if (tool === 'point') {
        const label = generateNextPointLabel(existingLabels);
        const newPoint = makePoint(label, worldPos.x, worldPos.y);
        if (yapisma.hostId) {
          // Nokta bir nesnenin ÜZERİNDE doğdu: oraya BAĞLI kalır. Sürüklendiğinde
          // nesneden kopmaz, yalnızca üzerinde kayar; nesne silinince o da silinir.
          newPoint.onObjectId = yapisma.hostId;
        }
        const hedef = yapisma.hostId
          ? currentObjects.find((o) => o.id === yapisma.hostId)
          : undefined;
        addObject(
          newPoint,
          hedef
            ? `${label} noktası ${hedef.label} üzerine eklendi`
            : `${label} noktası oluşturuldu`
        );
        return;
      }

      // 2-3. KARE / DİKDÖRTGEN ARACI (tıklama ile standart boyut)
      if (tool === 'square' || tool === 'rectangle') {
        const w = tool === 'square' ? 4 : 6;
        const h = 4;
        const x1 = worldPos.x - w / 2;
        const y1 = worldPos.y - h / 2;
        const x2 = x1 + w;
        const y2 = y1 + h;
        const labels = generateNextPointLabels(existingLabels, 4);
        const color = '#3b82f6';

        const pts = [
          makePoint(labels[0], x1, y1, color),
          makePoint(labels[1], x2, y1, color),
          makePoint(labels[2], x2, y2, color),
          makePoint(labels[3], x1, y2, color),
        ];

        const poly: PolygonObject = {
          id: createId('poly'),
          type: 'polygon',
          label: tool === 'square' ? 'Kare' : 'Dikdörtgen',
          showLabel: true,
          pointIds: pts.map((p) => p.id),
          color: tool === 'square' ? '#f43f5e' : '#f59e0b',
          fillColor: tool === 'square' ? '#f43f5e' : '#f59e0b',
          fillOpacity: 0.18,
          visible: true,
          showArea: true,
          showPerimeter: true,
          createdAt: Date.now(),
        };

        addObjects(
          [...pts, poly],
          tool === 'square'
            ? `Kare oluşturuldu (a = ${formatTurkishNumber(w)} br)`
            : `Dikdörtgen oluşturuldu (${formatTurkishNumber(w)} x ${formatTurkishNumber(h)} br)`
        );
        return;
      }

      // 4. DÜZGÜN ÇOKGEN (KULLANICI KENAR SAYISI GİRİŞİ DİYALOĞU)
      if (tool === 'regular_polygon') {
        openRegularPolygonDialog(worldPos);
        return;
      }

      // Merkez + sayısal yarıçap: tıklanan yer merkez olur, yarıçap pencereden alınır
      if (tool === 'circle_radius') {
        openCircleRadiusDialog(worldPos);
        return;
      }

      // 5. KESİR MODELİ
      if (tool === 'fraction') {
        const fractionObj: FractionObject = {
          id: createId('frac'),
          type: 'fraction',
          label: '1/1 Kesir Modeli',
          showLabel: true,
          numerator: 1,
          denominator: 1,
          x: worldPos.x,
          y: worldPos.y,
          radius: 2.5,
          modelType: 'pie',
          color: '#8b5cf6',
          visible: true,
          createdAt: Date.now(),
        };
        addObject(fractionObj, '1/1 kesir modeli eklendi');
        setSelectedObjectId(fractionObj.id);
        return;
      }

      // 6. UZUNLUK VE BİRİM ÖLÇÜMÜ (boş tuvale tıklayınca nokta oluşturarak ölç)
      if (tool === 'measure_distance' || tool === 'unit_measure') {
        const isCm = tool === 'measure_distance';
        const label = generateNextPointLabel(existingLabels);
        const newPt = makePoint(label, worldPos.x, worldPos.y, isCm ? '#0284c7' : '#059669');
        handlePointClick(newPt.id, [...currentObjects, newPt]);
        return;
      }

      // 7. DÖNDÜRME (ROTATE): Dönüş, şekil üzerindeki tutamaç ve hazır derece
      // düğmeleriyle yapılır; boş tuval tıklaması yalnızca yönlendirme verir.
      if (tool === 'rotate') {
        const hasShape = currentObjects.some((o) => o.id === currentSelectedId && o.type === 'polygon');
        setHintMessageState(
          hasShape
            ? 'Döndürmek için şeklin üzerindeki 🔄 tutamacını sürükleyin veya hazır derece düğmelerine tıklayın'
            : 'Önce bir şekil seçin'
        );
        return;
      }

      // 8. YANSITMA / SİMETRİ: Simetri ekseni eksen düğmeleriyle veya tuvaldeki bir
      // doğruya tıklanarak seçilir; boş tuval tıklaması yansıma üretmez.
      if (tool === 'reflect' || tool === 'symmetry') {
        const hasShape = currentObjects.some((o) => o.id === currentSelectedId && o.type === 'polygon');
        setHintMessageState(
          hasShape
            ? 'Simetri ekseni için yukarıdaki eksen düğmelerine veya tuvaldeki bir doğruya tıklayın'
            : 'Önce bir şekil seçin'
        );
        return;
      }

      // 9. DOĞRU PARÇASI, DOĞRU, IŞIN, ÇEMBER, AÇI, ÇOKGEN: yeni nokta oluştur ve adıma ekle
      if (
        [
          'segment',
          'line',
          'ray',
          'circle',
          'circle_3points',
          'arc',
          'sector',
          'angle',
          'polygon',
          // Klasik inşa araçları da boş tuvale tıklanınca önce nokta oluşturur
          'midpoint',
          'divide_ratio',
          'perp_bisector',
          'angle_bisector',
          'perpendicular',
          'parallel',
          'segment_length',
          'translate',
          'measure_slope',
          'trig_ratios',
        ].includes(tool)
      ) {
        const label = generateNextPointLabel(existingLabels);
        const newPoint = makePoint(label, worldPos.x, worldPos.y);
        handlePointClick(newPoint.id, [...currentObjects, newPoint]);
        return;
      }

      if (tool === 'select') {
        setSelectedObjectIds([]);
      }
    },
    [addObject, addObjects, handlePointClick, openRegularPolygonDialog, openCircleRadiusDialog, setSelectedObjectId]
  );

  // Geri Al
  const undo = useCallback(() => {
    dispatch({ type: 'undo' });
    setSelectedObjectIds([]);
    setPendingPointIds([]);
  }, []);

  // Yinele
  const redo = useCallback(() => {
    dispatch({ type: 'redo' });
    setSelectedObjectIds([]);
    setPendingPointIds([]);
  }, []);

  // Etkinliği Yeniden Başlat
  const restartCurrentActivity = useCallback(() => {
    if (!selectedActivity) return;
    const initial = JSON.parse(JSON.stringify(selectedActivity.initialObjects)) as MathObject[];
    commit(initial, 'Etkinlik sıfırlandı');
    setSelectedObjectIds([]);
    setPendingPointIds([]);
    setActivityCompleted(false);
    setActiveSuccessMessage(null);
  }, [commit, selectedActivity]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const value = useMemo<WorkspaceContextType>(
    () => ({
      constraintError: doc.constraintError ?? null,
      objects,
      selectedObjectId,
      selectedObjectIds,
      activeTool,
      viewport,
      styleSettings,
      setStyleSettings,
      pendingPointIds,
      history,
      historyIndex,
      canUndo,
      canRedo,
      activityCompleted,
      activeSuccessMessage,
      hintMessage,
      setObjects,
      studioDimension,
      setStudioDimension,
      isConfirmClearOpen,
      confirmClearTargetDim,
      setIsConfirmClearOpen,
      requestClearAll,
      isRegularPolygonDialogOpen,
      regularPolygonPos,
      setIsRegularPolygonDialogOpen,
      openRegularPolygonDialog,
      valuePrompt,
      setValuePrompt,
      isCircleRadiusDialogOpen,
      circleRadiusPos,
      setIsCircleRadiusDialogOpen,
      openCircleRadiusDialog,
      setActiveTool,
      setSelectedObjectId,
      setSelectedObjectIds,
      setViewport,
      setHintMessage,
      commit,
      addObject,
      addObjects,
      updateObject,
      deleteObject,
      deleteObjects,
      moveObject,
      moveObjects,
      clearWorkspace,
      resetViewport,
      handlePointClick,
      handleCanvasClick,
      handlePointDrag,
      handleSliderChange,
      setSliderValues,
      addFunction,
      addSlider,
      assignSliderValue,
      undo,
      redo,
      recordHistory,
      cancelPendingAction,
      restartCurrentActivity,
      measureLength,
      setLengthMeasurement,
      measureArea,
      measurePerimeter,
      measureAngleAtPoint,
      measureArcAngle,
      toggleCheckbox,
      runButton,
      applyInputBox,
      splitSegmentAtPoint,
      splitCircleAtPoints,
      splitArcAtPoint,
      splitPolygon,
      connectPoints,
      disconnectPoints,
      fitPolynomialToPoints,
      togglePolygonEdgeLabel,
      setAllPolygonEdgeLabels,
      hideMeasurement,
      setLabelOffset,
      measureArcLength,
      toggleAngleReflex,
      setSegmentLength,
      setAngleDegrees,
      bindAngleToSlider,
      unbindAngleFromSlider,
      setCircleRadius,
    }),
    [
      doc.constraintError,
      objects,
      selectedObjectId,
      selectedObjectIds,
      activeTool,
      viewport,
      styleSettings,
      setStyleSettings,
      pendingPointIds,
      history,
      historyIndex,
      canUndo,
      canRedo,
      activityCompleted,
      activeSuccessMessage,
      hintMessage,
      setObjects,
      studioDimension,
      isConfirmClearOpen,
      confirmClearTargetDim,
      requestClearAll,
      isRegularPolygonDialogOpen,
      regularPolygonPos,
      openRegularPolygonDialog,
      valuePrompt,
      setValuePrompt,
      isCircleRadiusDialogOpen,
      circleRadiusPos,
      setIsCircleRadiusDialogOpen,
      openCircleRadiusDialog,
      setActiveTool,
      setSelectedObjectId,
      setHintMessage,
      commit,
      addObject,
      addObjects,
      updateObject,
      deleteObject,
      deleteObjects,
      moveObject,
      moveObjects,
      clearWorkspace,
      resetViewport,
      handlePointClick,
      handleCanvasClick,
      handlePointDrag,
      handleSliderChange,
      setSliderValues,
      addFunction,
      addSlider,
      undo,
      redo,
      recordHistory,
      cancelPendingAction,
      restartCurrentActivity,
      measureLength,
      setLengthMeasurement,
      measureArea,
      measurePerimeter,
      measureAngleAtPoint,
      measureArcAngle,
      toggleCheckbox,
      runButton,
      applyInputBox,
      splitSegmentAtPoint,
      splitCircleAtPoints,
      splitArcAtPoint,
      splitPolygon,
      connectPoints,
      disconnectPoints,
      fitPolynomialToPoints,
      togglePolygonEdgeLabel,
      setAllPolygonEdgeLabels,
      hideMeasurement,
      setLabelOffset,
      measureArcLength,
      toggleAngleReflex,
      setSegmentLength,
      setAngleDegrees,
      bindAngleToSlider,
      unbindAngleFromSlider,
      setCircleRadius,
    ]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace, WorkspaceProvider içinde kullanılmalıdır.');
  }
  return context;
}
