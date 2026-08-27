// 3D Geometri, Projeksiyon ve Katı Cisim Motoru
import { Point3D, Face3D, Edge3D, Solid3DObject, Solid3DType, Camera3D } from '@/types/workspace3d';

/**
 * 3D Noktayı X, Y, Z eksenlerinde derece cinsinden döndürür
 */
export function rotatePoint3D(p: Point3D, rotDeg: Point3D): Point3D {
  const radX = (rotDeg.x * Math.PI) / 180;
  const radY = (rotDeg.y * Math.PI) / 180;
  const radZ = (rotDeg.z * Math.PI) / 180;

  // X ekseni etrafında dönme
  const y1 = p.y * Math.cos(radX) - p.z * Math.sin(radX);
  const z1 = p.y * Math.sin(radX) + p.z * Math.cos(radX);
  const x1 = p.x;

  // Y ekseni etrafında dönme
  const x2 = x1 * Math.cos(radY) + z1 * Math.sin(radY);
  const z2 = -x1 * Math.sin(radY) + z1 * Math.cos(radY);
  const y2 = y1;

  // Z ekseni etrafında dönme
  const x3 = x2 * Math.cos(radZ) - y2 * Math.sin(radZ);
  const y3 = x2 * Math.sin(radZ) + y2 * Math.cos(radZ);
  const z3 = z2;

  return { x: x3, y: y3, z: z3 };
}

export function project3DToScreen(
  worldP: Point3D,
  camera: Camera3D,
  screenWidth: number,
  screenHeight: number
): { x: number; y: number; zDepth: number; visible: boolean } {
  // 1. Kamera Rotasyonu: Yaw (Z ekseni) ve Pitch (Kamera eğimi)
  const radPitch = (camera.rotX * Math.PI) / 180; // Dikey bakış açısı
  const radYaw = (camera.rotY * Math.PI) / 180; // Yatay bakış açısı

  // Z ekseni (Yaw) etrafında döndür
  const x1 = worldP.x * Math.cos(radYaw) - worldP.y * Math.sin(radYaw);
  const y1 = worldP.x * Math.sin(radYaw) + worldP.y * Math.cos(radYaw);
  const z1 = worldP.z;

  // Kamera eğimi (Pitch): Derinlik ve Dikey Yükseklik hesaplama
  const xCam = x1;
  const depthCam = y1 * Math.cos(radPitch) + z1 * Math.sin(radPitch);
  const upCam = z1 * Math.cos(radPitch) - y1 * Math.sin(radPitch);

  // 2. Perspektif Projeksiyon
  const fov = camera.perspective || 700;
  const dist = fov + depthCam * camera.zoom * 0.04;
  const scale = (fov / Math.max(20, dist)) * camera.zoom;

  const screenX = screenWidth / 2 + camera.panX + xCam * scale;
  const screenY = screenHeight / 2 + camera.panY - upCam * scale;

  return {
    x: screenX,
    y: screenY,
    zDepth: depthCam, // Çizim sıralaması (Z-sort) için kamera yönündeki derinlik
    visible: dist > 0,
  };
}

/**
 * Katı Cisim Mesh Üretimi (Köşeler, Ayrıtlar, Yüzler)
 */
export function generateSolidMesh(solid: Solid3DObject): {
  vertices: Point3D[];
  faces: Face3D[];
  edges: Edge3D[];
} {
  const { type, dimensions, position, rotation, unfoldProgress = 0 } = solid;
  const w = dimensions.width || 3;
  const h = dimensions.height || 3;
  const d = dimensions.depth || 3;
  const r = dimensions.radius || w / 2;

  let baseVertices: Point3D[] = [];
  let faces: Face3D[] = [];
  let edges: Edge3D[] = [];

  switch (type) {
    case 'cube':
    case 'prism': {
      const hw = (type === 'cube' ? w : w) / 2;
      const hd = (type === 'cube' ? w : d) / 2;
      const zh = type === 'cube' ? w : h;

      // 8 Köşe: 0-3 alt taban, 4-7 üst taban
      baseVertices = [
        { x: -hw, y: -hd, z: 0 }, // 0: Sol-Arka-Alt
        { x: hw, y: -hd, z: 0 }, // 1: Sağ-Arka-Alt
        { x: hw, y: hd, z: 0 }, // 2: Sağ-Ön-Alt
        { x: -hw, y: hd, z: 0 }, // 3: Sol-Ön-Alt
        { x: -hw, y: -hd, z: zh }, // 4: Sol-Arka-Üst
        { x: hw, y: -hd, z: zh }, // 5: Sağ-Arka-Üst
        { x: hw, y: hd, z: zh }, // 6: Sağ-Ön-Üst
        { x: -hw, y: hd, z: zh }, // 7: Sol-Ön-Üst
      ];

      // Açınım (Unfolding) Animasyon Pozisyonları
      if (unfoldProgress > 0) {
        const u = Math.min(1, Math.max(0, unfoldProgress));
        const unfoldAngle = (u * 90 * Math.PI) / 180;
        // Alt taban (0,1,2,3) sabit kalır, yan yüzler dışa açılır
        // Ön yüz (2,3,7,6): y = hd etrafında öne yatar
        baseVertices[6] = { x: hw, y: hd + zh * Math.sin(unfoldAngle), z: zh * Math.cos(unfoldAngle) };
        baseVertices[7] = { x: -hw, y: hd + zh * Math.sin(unfoldAngle), z: zh * Math.cos(unfoldAngle) };
        // Arka yüz (0,1,5,4): y = -hd etrafında arkaya yatar
        baseVertices[4] = { x: -hw, y: -hd - zh * Math.sin(unfoldAngle), z: zh * Math.cos(unfoldAngle) };
        baseVertices[5] = { x: hw, y: -hd - zh * Math.sin(unfoldAngle), z: zh * Math.cos(unfoldAngle) };
        // Sağ yüz (1,2,6,5): x = hw etrafında sağa yatar
        baseVertices[1] = { x: hw + hd * (1 - Math.cos(unfoldAngle)), y: -hd, z: 0 };
      }

      // 6 Yüz
      faces = [
        { vertexIndices: [3, 2, 1, 0], normal: { x: 0, y: 0, z: -1 }, label: 'Alt Taban' },
        { vertexIndices: [4, 5, 6, 7], normal: { x: 0, y: 0, z: 1 }, label: 'Üst Taban' },
        { vertexIndices: [3, 2, 6, 7], normal: { x: 0, y: 1, z: 0 }, label: 'Ön Yüz' },
        { vertexIndices: [0, 1, 5, 4], normal: { x: 0, y: -1, z: 0 }, label: 'Arka Yüz' },
        { vertexIndices: [0, 3, 7, 4], normal: { x: -1, y: 0, z: 0 }, label: 'Sol Yüz' },
        { vertexIndices: [1, 2, 6, 5], normal: { x: 1, y: 0, z: 0 }, label: 'Sağ Yüz' },
      ];

      // 12 Ayrıt
      edges = [
        { startIdx: 0, endIdx: 1 },
        { startIdx: 1, endIdx: 2 },
        { startIdx: 2, endIdx: 3 },
        { startIdx: 3, endIdx: 0 },
        { startIdx: 4, endIdx: 5 },
        { startIdx: 5, endIdx: 6 },
        { startIdx: 6, endIdx: 7 },
        { startIdx: 7, endIdx: 4 },
        { startIdx: 0, endIdx: 4 },
        { startIdx: 1, endIdx: 5 },
        { startIdx: 2, endIdx: 6 },
        { startIdx: 3, endIdx: 7 },
      ];
      break;
    }

    case 'pyramid': {
      const hw = w / 2;
      const hd = d / 2;
      // 5 Köşe: 0-3 taban, 4 tepe noktası
      baseVertices = [
        { x: -hw, y: -hd, z: 0 },
        { x: hw, y: -hd, z: 0 },
        { x: hw, y: hd, z: 0 },
        { x: -hw, y: hd, z: 0 },
        { x: 0, y: 0, z: h }, // Tepe
      ];

      faces = [
        { vertexIndices: [3, 2, 1, 0], normal: { x: 0, y: 0, z: -1 }, label: 'Kare Taban' },
        { vertexIndices: [3, 2, 4], normal: { x: 0, y: 1, z: 0.5 }, label: 'Ön Üçgen Yüz' },
        { vertexIndices: [0, 1, 4], normal: { x: 0, y: -1, z: 0.5 }, label: 'Arka Üçgen Yüz' },
        { vertexIndices: [0, 3, 4], normal: { x: -1, y: 0, z: 0.5 }, label: 'Sol Üçgen Yüz' },
        { vertexIndices: [1, 2, 4], normal: { x: 1, y: 0, z: 0.5 }, label: 'Sağ Üçgen Yüz' },
      ];

      edges = [
        { startIdx: 0, endIdx: 1 },
        { startIdx: 1, endIdx: 2 },
        { startIdx: 2, endIdx: 3 },
        { startIdx: 3, endIdx: 0 },
        { startIdx: 0, endIdx: 4 },
        { startIdx: 1, endIdx: 4 },
        { startIdx: 2, endIdx: 4 },
        { startIdx: 3, endIdx: 4 },
      ];
      break;
    }

    case 'cone': {
      const segments = 16;
      baseVertices = [];
      // Taban çemberi noktaları: 0 .. segments-1
      for (let i = 0; i < segments; i++) {
        const ang = (i * 2 * Math.PI) / segments;
        baseVertices.push({ x: r * Math.cos(ang), y: r * Math.sin(ang), z: 0 });
      }
      // Tepe noktası: index = segments
      baseVertices.push({ x: 0, y: 0, z: h });
      const apexIdx = segments;

      // Taban yüzü
      faces.push({
        vertexIndices: Array.from({ length: segments }, (_, i) => segments - 1 - i),
        normal: { x: 0, y: 0, z: -1 },
        label: 'Daire Taban',
      });

      // Yan üçgen yüzler
      for (let i = 0; i < segments; i++) {
        const next = (i + 1) % segments;
        faces.push({
          vertexIndices: [i, next, apexIdx],
          normal: { x: Math.cos(((i + 0.5) * 2 * Math.PI) / segments), y: Math.sin(((i + 0.5) * 2 * Math.PI) / segments), z: 0.3 },
        });
        edges.push({ startIdx: i, endIdx: next });
        if (i % 2 === 0) edges.push({ startIdx: i, endIdx: apexIdx });
      }
      break;
    }

    case 'cylinder': {
      const segments = 16;
      baseVertices = [];
      // Alt taban: 0 .. segments-1
      for (let i = 0; i < segments; i++) {
        const ang = (i * 2 * Math.PI) / segments;
        baseVertices.push({ x: r * Math.cos(ang), y: r * Math.sin(ang), z: 0 });
      }
      // Üst taban: segments .. 2*segments-1
      for (let i = 0; i < segments; i++) {
        const ang = (i * 2 * Math.PI) / segments;
        baseVertices.push({ x: r * Math.cos(ang), y: r * Math.sin(ang), z: h });
      }

      // Alt daire yüzü
      faces.push({
        vertexIndices: Array.from({ length: segments }, (_, i) => segments - 1 - i),
        normal: { x: 0, y: 0, z: -1 },
        label: 'Alt Daire',
      });
      // Üst daire yüzü
      faces.push({
        vertexIndices: Array.from({ length: segments }, (_, i) => segments + i),
        normal: { x: 0, y: 0, z: 1 },
        label: 'Üst Daire',
      });

      // Yan dikdörtgen yüzler
      for (let i = 0; i < segments; i++) {
        const next = (i + 1) % segments;
        faces.push({
          vertexIndices: [i, next, segments + next, segments + i],
          normal: { x: Math.cos(((i + 0.5) * 2 * Math.PI) / segments), y: Math.sin(((i + 0.5) * 2 * Math.PI) / segments), z: 0 },
        });
        edges.push({ startIdx: i, endIdx: next });
        edges.push({ startIdx: segments + i, endIdx: segments + next });
        if (i % 4 === 0) edges.push({ startIdx: i, endIdx: segments + i });
      }
      break;
    }

    case 'sphere': {
      const latCount = 8;
      const lonCount = 14;
      baseVertices = [];

      for (let i = 0; i <= latCount; i++) {
        const theta = (i * Math.PI) / latCount; // 0 to PI
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);

        for (let j = 0; j < lonCount; j++) {
          const phi = (j * 2 * Math.PI) / lonCount; // 0 to 2PI
          const x = r * sinTheta * Math.cos(phi);
          const y = r * sinTheta * Math.sin(phi);
          const z = r * cosTheta + r; // tabana oturt
          baseVertices.push({ x, y, z });
        }
      }

      for (let i = 0; i < latCount; i++) {
        for (let j = 0; j < lonCount; j++) {
          const first = i * lonCount + j;
          const second = first + lonCount;
          const nextJ = (j + 1) % lonCount;
          const firstNext = i * lonCount + nextJ;
          const secondNext = firstNext + lonCount;

          faces.push({
            vertexIndices: [first, firstNext, secondNext, second],
            normal: { x: baseVertices[first].x / r, y: baseVertices[first].y / r, z: (baseVertices[first].z - r) / r },
          });

          if (i % 2 === 0) {
            edges.push({ startIdx: first, endIdx: firstNext });
          }
          if (j % 2 === 0) {
            edges.push({ startIdx: first, endIdx: second });
          }
        }
      }
      break;
    }

    default:
      break;
  }

  // Pozisyon ve kendi etrafındaki rotasyonu uygula
  const transformedVertices = baseVertices.map((v) => {
    const rotated = rotatePoint3D(v, rotation);
    return {
      x: rotated.x + position.x,
      y: rotated.y + position.y,
      z: rotated.z + position.z,
    };
  });

  return {
    vertices: transformedVertices,
    faces,
    edges,
  };
}

/**
 * 3D Katı Cisim Hacim Hesabı
 */
export function calculate3DVolume(solid: Solid3DObject): number {
  const { type, dimensions } = solid;
  const w = dimensions.width || 3;
  const h = dimensions.height || 3;
  const d = dimensions.depth || 3;
  const r = dimensions.radius || w / 2;

  switch (type) {
    case 'cube':
      return Math.pow(w, 3);
    case 'prism':
      return w * h * d;
    case 'pyramid':
      return (w * d * h) / 3;
    case 'cone':
      return (Math.PI * Math.pow(r, 2) * h) / 3;
    case 'cylinder':
      return Math.PI * Math.pow(r, 2) * h;
    case 'sphere':
      return (4 / 3) * Math.PI * Math.pow(r, 3);
    default:
      return w * h * d;
  }
}

/**
 * 3D Katı Cisim Yüzey Alanı Hesabı
 */
export function calculate3DSurfaceArea(solid: Solid3DObject): number {
  const { type, dimensions } = solid;
  const w = dimensions.width || 3;
  const h = dimensions.height || 3;
  const d = dimensions.depth || 3;
  const r = dimensions.radius || w / 2;

  switch (type) {
    case 'cube':
      return 6 * Math.pow(w, 2);
    case 'prism':
      return 2 * (w * d + w * h + d * h);
    case 'pyramid': {
      const slantHeight = Math.sqrt(Math.pow(h, 2) + Math.pow(w / 2, 2));
      return w * d + 2 * (w * slantHeight * 0.5) + 2 * (d * slantHeight * 0.5);
    }
    case 'cone': {
      const s = Math.sqrt(Math.pow(r, 2) + Math.pow(h, 2));
      return Math.PI * Math.pow(r, 2) + Math.PI * r * s;
    }
    case 'cylinder':
      return 2 * Math.PI * Math.pow(r, 2) + 2 * Math.PI * r * h;
    case 'sphere':
      return 4 * Math.PI * Math.pow(r, 2);
    default:
      return 6 * Math.pow(w, 2);
  }
}

/**
 * Katı Cismin Köşe (K), Ayrıt (E), Yüz (Y) sayıları
 */
export function getSolidPropertyCounts(type: Solid3DType): { vertices: number; edges: number; faces: number; eulerValid: boolean } {
  switch (type) {
    case 'cube':
      return { vertices: 8, edges: 12, faces: 6, eulerValid: 8 - 12 + 6 === 2 };
    case 'prism':
      return { vertices: 8, edges: 12, faces: 6, eulerValid: 8 - 12 + 6 === 2 };
    case 'triangular_prism':
      return { vertices: 6, edges: 9, faces: 5, eulerValid: 6 - 9 + 5 === 2 };
    case 'pyramid':
      return { vertices: 5, edges: 8, faces: 5, eulerValid: 5 - 8 + 5 === 2 };
    case 'cone':
      return { vertices: 1, edges: 1, faces: 2, eulerValid: false };
    case 'cylinder':
      return { vertices: 0, edges: 2, faces: 3, eulerValid: false };
    case 'sphere':
      return { vertices: 0, edges: 0, faces: 1, eulerValid: false };
    default:
      return { vertices: 8, edges: 12, faces: 6, eulerValid: true };
  }
}
