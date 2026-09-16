// 3D Katı Cisimlerin 2D Düzlemine Aksonometrik/İzometrik İzdüşüm Modülü
import { Point2D, ScreenPoint, ViewportTransform } from '@/types/math';
import { Solid3DObject, Point3D } from '@/types/workspace3d';
import { worldToScreen } from '@/math/coordinates';
import { generateSolidMesh, calculate3DVolume, calculate3DSurfaceArea } from '@/math/geometry3d';
import { formatTurkishNumber } from '@/math/coordinates';

/** İzdüşüm açısı (55 derece, kavalier/aksonometrik bakış) */
export const PROJECTION_ANGLE_RAD = (55 * Math.PI) / 180;
/** Derinlik / Z ekseni ölçek çarpanı */
export const PROJECTION_DEPTH_SCALE = 0.55;

/**
 * 3D koordinatı (X, Y, Z) 2D matematiksel dünya koordinatına (x, y) projekte eder.
 * Z = 0 olduğunda (Zemin düzlemi) 2D koordinatlar birebir (X, Y) olarak kalır.
 * Z > 0 olduğunda derinlik ve yükseklik yönünde yukarı-sağa doğru uzanır.
 */
export function projectPoint3DTo2DWorld(
  p: Point3D,
  angleRad: number = PROJECTION_ANGLE_RAD,
  scale: number = PROJECTION_DEPTH_SCALE
): Point2D {
  return {
    x: p.x + p.z * Math.cos(angleRad) * scale,
    y: p.y + p.z * Math.sin(angleRad) * scale,
  };
}

export interface ProjectedFace2D {
  points: ScreenPoint[];
  pointsAttr: string;
  fill: string;
  fillOpacity: number;
  stroke: string;
  strokeWidth: number;
  label?: string;
  depth: number;
}

export interface ProjectedEdge2D {
  from: ScreenPoint;
  to: ScreenPoint;
  isHidden: boolean;
  stroke: string;
  strokeWidth: number;
}

export interface ProjectedFootprint2D {
  points: ScreenPoint[];
  pointsAttr: string;
  centerScreen: ScreenPoint;
  centerWorld: Point2D;
}

export interface ProjectedSolid2D {
  solid: Solid3DObject;
  type: Solid3DObject['type'];
  id: string;
  name: string;
  color: string;
  isSelected: boolean;
  footprint: ProjectedFootprint2D;
  faces: ProjectedFace2D[];
  edges: ProjectedEdge2D[];
  badge: {
    x: number;
    y: number;
    title: string;
    dimText: string;
    volume: number;
    surfaceArea: number;
  };
  curves?: {
    kind: 'cylinder' | 'cone' | 'sphere';
    bottomCenter: ScreenPoint;
    topCenter?: ScreenPoint;
    rx: number;
    ry: number;
    sphereR?: number;
    sideLines?: { from: ScreenPoint; to: ScreenPoint }[];
  };
}

/**
 * Verilen 3D katı cismi 2D SVG ekranı için hesaplar ve projeksiyon verisini üretir.
 */
export function projectSolidFor2D(
  solid: Solid3DObject,
  viewport: ViewportTransform,
  isSelected: boolean = false
): ProjectedSolid2D {
  const color = solid.color || '#3b82f6';
  const strokeColor = isSelected ? '#ec4899' : color;
  const strokeWidth = isSelected ? 2.4 : 1.6;

  // Kamera bakış vektörü (projeksiyon düzlemine dik)
  const camDir = {
    x: -Math.cos(PROJECTION_ANGLE_RAD) * PROJECTION_DEPTH_SCALE,
    y: -Math.sin(PROJECTION_ANGLE_RAD) * PROJECTION_DEPTH_SCALE,
    z: 1.0,
  };

  const { vertices, faces, edges } = generateSolidMesh(solid);

  // 3D noktaları 2D dünya ve ekran koordinatlarına dönüştür
  const world2D = vertices.map((v) => projectPoint3DTo2DWorld(v));
  const screenPts = world2D.map((w) => worldToScreen(w, viewport));

  // Zemin izdüşümü (Footprint: Z = 0 düzlemindeki taban alanı)
  const w = solid.dimensions.width || 3;
  const h = solid.dimensions.height || 3;
  const d = solid.dimensions.depth || 3;
  const r = solid.dimensions.radius || w / 2;

  const groundCenterWorld: Point2D = { x: solid.position.x, y: solid.position.y };
  const groundCenterScreen = worldToScreen(groundCenterWorld, viewport);

  // Taban izdüşümü çokgeni
  let footprintWorldPts: Point2D[] = [];
  if (solid.type === 'cube' || solid.type === 'prism') {
    const hw = w / 2;
    const hd = (solid.type === 'cube' ? w : d) / 2;
    footprintWorldPts = [
      { x: solid.position.x - hw, y: solid.position.y - hd },
      { x: solid.position.x + hw, y: solid.position.y - hd },
      { x: solid.position.x + hw, y: solid.position.y + hd },
      { x: solid.position.x - hw, y: solid.position.y + hd },
    ];
  } else if (solid.type === 'pyramid') {
    const hw = w / 2;
    const hd = d / 2;
    footprintWorldPts = [
      { x: solid.position.x - hw, y: solid.position.y - hd },
      { x: solid.position.x + hw, y: solid.position.y - hd },
      { x: solid.position.x + hw, y: solid.position.y + hd },
      { x: solid.position.x - hw, y: solid.position.y + hd },
    ];
  } else if (solid.type === 'triangular_prism') {
    const hw = w / 2;
    const hd = d / 2;
    footprintWorldPts = [
      { x: solid.position.x - hw, y: solid.position.y - hd },
      { x: solid.position.x + hw, y: solid.position.y - hd },
      { x: solid.position.x, y: solid.position.y + hd },
    ];
  } else {
    // Silindir, Koni, Küre: 16 noktalı zemin dairesi
    for (let i = 0; i < 16; i++) {
      const theta = (i * 2 * Math.PI) / 16;
      footprintWorldPts.push({
        x: solid.position.x + r * Math.cos(theta),
        y: solid.position.y + r * Math.sin(theta),
      });
    }
  }

  const footprintScreenPts = footprintWorldPts.map((p) => worldToScreen(p, viewport));
  const footprintAttr = footprintScreenPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // Yüzlerin görünürlüğünü ve derinliğini hesapla
  const faceVisibility: boolean[] = [];
  const projectedFaces: ProjectedFace2D[] = [];

  faces.forEach((f, fIdx) => {
    // Yüz normali ile kamera doğrultusunun iç çarpımı
    const dot = f.normal.x * camDir.x + f.normal.y * camDir.y + f.normal.z * camDir.z;
    const isVisible = dot > 0.001;
    faceVisibility[fIdx] = isVisible;

    // Yüzün ortalama derinliği (Painter algoritması için)
    let avgDepth = 0;
    const faceScreenPts: ScreenPoint[] = [];
    f.vertexIndices.forEach((vIdx) => {
      const v = vertices[vIdx];
      if (v) {
        avgDepth += v.x * camDir.x + v.y * camDir.y + v.z * camDir.z;
        faceScreenPts.push(screenPts[vIdx]);
      }
    });
    avgDepth /= Math.max(1, f.vertexIndices.length);

    // Gölgelendirme opasitesi
    let opacity = 0.35;
    if (f.normal.z > 0.5) opacity = 0.45; // Üst yüzey daha aydınlık
    else if (f.normal.y < -0.4) opacity = 0.30; // Ön yüz
    else if (f.normal.x > 0.4 || f.normal.x < -0.4) opacity = 0.50; // Yan yüzler gölgeli

    // Seçili ise veya cisim özel opasitesine göre
    if (solid.opacity !== undefined) {
      opacity = Math.max(0.15, Math.min(0.85, opacity * (solid.opacity / 0.85)));
    }

    const faceColor = solid.faceColors?.[fIdx] || color;

    projectedFaces.push({
      points: faceScreenPts,
      pointsAttr: faceScreenPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
      fill: faceColor,
      fillOpacity: isVisible ? opacity : 0.08,
      stroke: strokeColor,
      strokeWidth: isVisible ? strokeWidth : 1.0,
      label: f.label,
      depth: avgDepth,
    });
  });

  // Ayrıtların gizli / görünür durumunu belirle
  // Bir ayrıt, komşu yüzlerinden en az biri görünürse görünürdür; tüm komşu yüzleri arkaya bakıyorsa gizlidir (kesikli çizilir).
  const edgeMap = new Map<string, number[]>();
  faces.forEach((f, fIdx) => {
    const indices = f.vertexIndices;
    for (let i = 0; i < indices.length; i++) {
      const a = Math.min(indices[i], indices[(i + 1) % indices.length]);
      const b = Math.max(indices[i], indices[(i + 1) % indices.length]);
      const key = `${a}-${b}`;
      if (!edgeMap.has(key)) edgeMap.set(key, []);
      edgeMap.get(key)!.push(fIdx);
    }
  });

  const projectedEdges: ProjectedEdge2D[] = [];
  edges.forEach((e) => {
    const p1 = screenPts[e.startIdx];
    const p2 = screenPts[e.endIdx];
    if (!p1 || !p2) return;

    const key = `${Math.min(e.startIdx, e.endIdx)}-${Math.max(e.startIdx, e.endIdx)}`;
    const adjFaces = edgeMap.get(key) || [];
    const hasVisibleAdjacent = adjFaces.some((fIdx) => faceVisibility[fIdx]);
    const isHidden = adjFaces.length > 0 && !hasVisibleAdjacent;

    projectedEdges.push({
      from: p1,
      to: p2,
      isHidden,
      stroke: isHidden ? (isSelected ? '#ec4899' : '#94a3b8') : strokeColor,
      strokeWidth: isHidden ? 1.2 : strokeWidth,
    });
  });

  // Eğri yüzeyli şekiller için özel parametreler (Silindir, Koni, Küre)
  let curves: ProjectedSolid2D['curves'] = undefined;
  if (solid.type === 'cylinder') {
    const bCenter = worldToScreen({ x: solid.position.x, y: solid.position.y }, viewport);
    const tCenterWorld = projectPoint3DTo2DWorld({ x: solid.position.x, y: solid.position.y, z: h });
    const tCenter = worldToScreen(tCenterWorld, viewport);
    const rx = r * viewport.zoom;
    const ry = r * 0.45 * viewport.zoom;

    curves = {
      kind: 'cylinder',
      bottomCenter: bCenter,
      topCenter: tCenter,
      rx,
      ry,
      sideLines: [
        { from: { x: bCenter.x - rx, y: bCenter.y }, to: { x: tCenter.x - rx, y: tCenter.y } },
        { from: { x: bCenter.x + rx, y: bCenter.y }, to: { x: tCenter.x + rx, y: tCenter.y } },
      ],
    };
  } else if (solid.type === 'cone') {
    const bCenter = worldToScreen({ x: solid.position.x, y: solid.position.y }, viewport);
    const apexWorld = projectPoint3DTo2DWorld({ x: solid.position.x, y: solid.position.y, z: h });
    const apex = worldToScreen(apexWorld, viewport);
    const rx = r * viewport.zoom;
    const ry = r * 0.45 * viewport.zoom;

    curves = {
      kind: 'cone',
      bottomCenter: bCenter,
      topCenter: apex,
      rx,
      ry,
      sideLines: [
        { from: { x: bCenter.x - rx, y: bCenter.y }, to: apex },
        { from: { x: bCenter.x + rx, y: bCenter.y }, to: apex },
      ],
    };
  } else if (solid.type === 'sphere') {
    const cWorld = projectPoint3DTo2DWorld({ x: solid.position.x, y: solid.position.y, z: solid.position.z + r });
    const cScreen = worldToScreen(cWorld, viewport);
    const sphereR = r * viewport.zoom;

    curves = {
      kind: 'sphere',
      bottomCenter: cScreen,
      rx: sphereR,
      ry: sphereR * 0.35,
      sphereR,
    };
  }

  // Boyut etiketi metni
  let dimText = '';
  switch (solid.type) {
    case 'cube':
      dimText = `${formatTurkishNumber(w)}×${formatTurkishNumber(w)}×${formatTurkishNumber(w)}`;
      break;
    case 'prism':
      dimText = `${formatTurkishNumber(w)}×${formatTurkishNumber(d)}×${formatTurkishNumber(h)}`;
      break;
    case 'triangular_prism':
      dimText = `t:${formatTurkishNumber(w)} y:${formatTurkishNumber(h)} b:${formatTurkishNumber(d)}`;
      break;
    case 'pyramid':
      dimText = `taban:${formatTurkishNumber(w)}×${formatTurkishNumber(d)} y:${formatTurkishNumber(h)}`;
      break;
    case 'cone':
    case 'cylinder':
      dimText = `r:${formatTurkishNumber(r)} h:${formatTurkishNumber(h)}`;
      break;
    case 'sphere':
      dimText = `r:${formatTurkishNumber(r)}`;
      break;
  }

  // Rozet pozisyonu (En yüksek noktanın hemen üstü)
  let minY = groundCenterScreen.y;
  screenPts.forEach((p) => {
    if (p.y < minY) minY = p.y;
  });
  if (curves?.topCenter && curves.topCenter.y < minY) minY = curves.topCenter.y;
  if (curves?.sphereR && curves.bottomCenter.y - curves.sphereR < minY) {
    minY = curves.bottomCenter.y - curves.sphereR;
  }

  return {
    solid,
    type: solid.type,
    id: solid.id,
    name: solid.name || 'Katı Cisim',
    color,
    isSelected,
    footprint: {
      points: footprintScreenPts,
      pointsAttr: footprintAttr,
      centerScreen: groundCenterScreen,
      centerWorld: groundCenterWorld,
    },
    faces: projectedFaces.sort((a, b) => a.depth - b.depth), // Arkadan öne sırala
    edges: projectedEdges,
    badge: {
      x: groundCenterScreen.x,
      y: Math.min(minY - 18, groundCenterScreen.y - 30),
      title: solid.name || 'Katı Cisim',
      dimText,
      volume: calculate3DVolume(solid),
      surfaceArea: calculate3DSurfaceArea(solid),
    },
    curves,
  };
}
