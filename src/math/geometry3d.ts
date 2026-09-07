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

      if (unfoldProgress > 0) {
        const u = Math.min(1, Math.max(0, unfoldProgress));
        const theta = (u * 90 * Math.PI) / 180;
        const s = Math.sin(theta);
        const c = Math.cos(theta);

        // 6 Bağımsız Yüz Üretimi (Açınım / T-Net):
        // 1. Alt Taban (Z=0 da sabit)
        const faceBottom: Point3D[] = [
          { x: -hw, y: -hd, z: 0 },
          { x: hw, y: -hd, z: 0 },
          { x: hw, y: hd, z: 0 },
          { x: -hw, y: hd, z: 0 },
        ];

        // 2. Ön Yüz (y = hd menteşesi etrafında öne doğru katlanır)
        const faceFront: Point3D[] = [
          { x: -hw, y: hd, z: 0 },
          { x: hw, y: hd, z: 0 },
          { x: hw, y: hd + zh * s, z: zh * c },
          { x: -hw, y: hd + zh * s, z: zh * c },
        ];

        // 3. Üst Taban (Ön Yüzün üst kenarına bağlı, 2*theta açısıyla düzleme yatar)
        const topD = type === 'cube' ? w : d;
        const s2 = Math.sin(2 * theta);
        const c2 = Math.cos(2 * theta);
        const faceTop: Point3D[] = [
          { x: -hw, y: hd + zh * s, z: zh * c },
          { x: hw, y: hd + zh * s, z: zh * c },
          { x: hw, y: hd + zh * s + topD * s2, z: zh * c + topD * c2 },
          { x: -hw, y: hd + zh * s + topD * s2, z: zh * c + topD * c2 },
        ];

        // 4. Arka Yüz (y = -hd menteşesi etrafında arkaya doğru katlanır)
        const faceBack: Point3D[] = [
          { x: hw, y: -hd, z: 0 },
          { x: -hw, y: -hd, z: 0 },
          { x: -hw, y: -hd - zh * s, z: zh * c },
          { x: hw, y: -hd - zh * s, z: zh * c },
        ];

        // 5. Sol Yüz (x = -hw menteşesi etrafında sola doğru katlanır)
        const faceLeft: Point3D[] = [
          { x: -hw, y: -hd, z: 0 },
          { x: -hw, y: hd, z: 0 },
          { x: -hw - zh * s, y: hd, z: zh * c },
          { x: -hw - zh * s, y: -hd, z: zh * c },
        ];

        // 6. Sağ Yüz (x = hw menteşesi etrafında sağa doğru katlanır)
        const faceRight: Point3D[] = [
          { x: hw, y: hd, z: 0 },
          { x: hw, y: -hd, z: 0 },
          { x: hw + zh * s, y: -hd, z: zh * c },
          { x: hw + zh * s, y: hd, z: zh * c },
        ];

        const allFaceList = [
          { name: 'Alt Taban', pts: faceBottom, normal: { x: 0, y: 0, z: -1 } },
          { name: 'Ön Yüz', pts: faceFront, normal: { x: 0, y: c, z: s } },
          { name: 'Üst Taban', pts: faceTop, normal: { x: 0, y: c2, z: s2 } },
          { name: 'Arka Yüz', pts: faceBack, normal: { x: 0, y: -c, z: s } },
          { name: 'Sol Yüz', pts: faceLeft, normal: { x: -c, y: 0, z: s } },
          { name: 'Sağ Yüz', pts: faceRight, normal: { x: c, y: 0, z: s } },
        ];

        baseVertices = [];
        faces = [];
        edges = [];

        allFaceList.forEach((f) => {
          const startIndex = baseVertices.length;
          baseVertices.push(...f.pts);
          faces.push({
            vertexIndices: [startIndex, startIndex + 1, startIndex + 2, startIndex + 3],
            normal: f.normal,
            label: f.name,
          });
          edges.push(
            { startIdx: startIndex, endIdx: startIndex + 1 },
            { startIdx: startIndex + 1, endIdx: startIndex + 2 },
            { startIdx: startIndex + 2, endIdx: startIndex + 3 },
            { startIdx: startIndex + 3, endIdx: startIndex }
          );
        });

        break;
      }

      // Kapalı (u === 0) küp:
      baseVertices = [
        { x: -hw, y: -hd, z: 0 },
        { x: hw, y: -hd, z: 0 },
        { x: hw, y: hd, z: 0 },
        { x: -hw, y: hd, z: 0 },
        { x: -hw, y: -hd, z: zh },
        { x: hw, y: -hd, z: zh },
        { x: hw, y: hd, z: zh },
        { x: -hw, y: hd, z: zh },
      ];

      faces = [
        { vertexIndices: [3, 2, 1, 0], normal: { x: 0, y: 0, z: -1 }, label: 'Alt Taban' },
        { vertexIndices: [4, 5, 6, 7], normal: { x: 0, y: 0, z: 1 }, label: 'Üst Taban' },
        { vertexIndices: [3, 2, 6, 7], normal: { x: 0, y: 1, z: 0 }, label: 'Ön Yüz' },
        { vertexIndices: [0, 1, 5, 4], normal: { x: 0, y: -1, z: 0 }, label: 'Arka Yüz' },
        { vertexIndices: [0, 3, 7, 4], normal: { x: -1, y: 0, z: 0 }, label: 'Sol Yüz' },
        { vertexIndices: [1, 2, 6, 5], normal: { x: 1, y: 0, z: 0 }, label: 'Sağ Yüz' },
      ];

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
      const slantH = Math.hypot(h, Math.max(hw, hd));

      if (unfoldProgress > 0) {
        const u = Math.min(1, Math.max(0, unfoldProgress));
        const theta = (u * 90 * Math.PI) / 180;
        const s = Math.sin(theta);
        const c = Math.cos(theta);

        // 1. Taban
        const ptsBase: Point3D[] = [
          { x: -hw, y: -hd, z: 0 },
          { x: hw, y: -hd, z: 0 },
          { x: hw, y: hd, z: 0 },
          { x: -hw, y: hd, z: 0 },
        ];

        // 2. Ön Üçgen Yüz
        const ptsFront: Point3D[] = [
          { x: -hw, y: hd, z: 0 },
          { x: hw, y: hd, z: 0 },
          { x: 0, y: hd + slantH * s, z: slantH * c },
        ];

        // 3. Arka Üçgen Yüz
        const ptsBack: Point3D[] = [
          { x: hw, y: -hd, z: 0 },
          { x: -hw, y: -hd, z: 0 },
          { x: 0, y: -hd - slantH * s, z: slantH * c },
        ];

        // 4. Sol Üçgen Yüz
        const ptsLeft: Point3D[] = [
          { x: -hw, y: -hd, z: 0 },
          { x: -hw, y: hd, z: 0 },
          { x: -hw - slantH * s, y: 0, z: slantH * c },
        ];

        // 5. Sağ Üçgen Yüz
        const ptsRight: Point3D[] = [
          { x: hw, y: hd, z: 0 },
          { x: hw, y: -hd, z: 0 },
          { x: hw + slantH * s, y: 0, z: slantH * c },
        ];

        baseVertices = [];
        faces = [];
        edges = [];

        baseVertices.push(...ptsBase);
        faces.push({ vertexIndices: [3, 2, 1, 0], normal: { x: 0, y: 0, z: -1 }, label: 'Kare Taban' });
        edges.push(
          { startIdx: 0, endIdx: 1 },
          { startIdx: 1, endIdx: 2 },
          { startIdx: 2, endIdx: 3 },
          { startIdx: 3, endIdx: 0 }
        );

        const sideTris = [
          { name: 'Ön Üçgen Yüz', pts: ptsFront, normal: { x: 0, y: c, z: s } },
          { name: 'Arka Üçgen Yüz', pts: ptsBack, normal: { x: 0, y: -c, z: s } },
          { name: 'Sol Üçgen Yüz', pts: ptsLeft, normal: { x: -c, y: 0, z: s } },
          { name: 'Sağ Üçgen Yüz', pts: ptsRight, normal: { x: c, y: 0, z: s } },
        ];

        sideTris.forEach((t) => {
          const sIdx = baseVertices.length;
          baseVertices.push(...t.pts);
          faces.push({ vertexIndices: [sIdx, sIdx + 1, sIdx + 2], normal: t.normal, label: t.name });
          edges.push(
            { startIdx: sIdx, endIdx: sIdx + 1 },
            { startIdx: sIdx + 1, endIdx: sIdx + 2 },
            { startIdx: sIdx + 2, endIdx: sIdx }
          );
        });

        break;
      }

      // Kapalı piramit:
      baseVertices = [
        { x: -hw, y: -hd, z: 0 },
        { x: hw, y: -hd, z: 0 },
        { x: hw, y: hd, z: 0 },
        { x: -hw, y: hd, z: 0 },
        { x: 0, y: 0, z: h },
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

    case 'triangular_prism': {
      const hw = w / 2;
      const hd = d / 2;

      if (unfoldProgress > 0) {
        const u = Math.min(1, Math.max(0, unfoldProgress));
        const theta = (u * 90 * Math.PI) / 180;
        const s = Math.sin(theta);
        const c = Math.cos(theta);

        // Orta Dikdörtgen Taban
        const ptsMid: Point3D[] = [
          { x: -hw, y: -hd, z: 0 },
          { x: hw, y: -hd, z: 0 },
          { x: hw, y: hd, z: 0 },
          { x: -hw, y: hd, z: 0 },
        ];

        // Sol Dikdörtgen Yüz
        const ptsLeft: Point3D[] = [
          { x: -hw, y: -hd, z: 0 },
          { x: -hw, y: hd, z: 0 },
          { x: -hw - h * s, y: hd, z: h * c },
          { x: -hw - h * s, y: -hd, z: h * c },
        ];

        // Sağ Dikdörtgen Yüz
        const ptsRight: Point3D[] = [
          { x: hw, y: hd, z: 0 },
          { x: hw, y: -hd, z: 0 },
          { x: hw + h * s, y: -hd, z: h * c },
          { x: hw + h * s, y: hd, z: h * c },
        ];

        // Ön Üçgen Kapak
        const ptsFront: Point3D[] = [
          { x: -hw, y: hd, z: 0 },
          { x: hw, y: hd, z: 0 },
          { x: 0, y: hd + h * s, z: h * c },
        ];

        // Arka Üçgen Kapak
        const ptsBack: Point3D[] = [
          { x: hw, y: -hd, z: 0 },
          { x: -hw, y: -hd, z: 0 },
          { x: 0, y: -hd - h * s, z: h * c },
        ];

        baseVertices = [];
        faces = [];
        edges = [];

        const allTriList = [
          { name: 'Alt Dikdörtgen', pts: ptsMid, normal: { x: 0, y: 0, z: -1 }, isQuad: true },
          { name: 'Sol Dikdörtgen', pts: ptsLeft, normal: { x: -c, y: 0, z: s }, isQuad: true },
          { name: 'Sağ Dikdörtgen', pts: ptsRight, normal: { x: c, y: 0, z: s }, isQuad: true },
          { name: 'Ön Üçgen Kapak', pts: ptsFront, normal: { x: 0, y: c, z: s }, isQuad: false },
          { name: 'Arka Üçgen Kapak', pts: ptsBack, normal: { x: 0, y: -c, z: s }, isQuad: false },
        ];

        allTriList.forEach((f) => {
          const sIdx = baseVertices.length;
          baseVertices.push(...f.pts);
          if (f.isQuad) {
            faces.push({ vertexIndices: [sIdx, sIdx + 1, sIdx + 2, sIdx + 3], normal: f.normal, label: f.name });
            edges.push(
              { startIdx: sIdx, endIdx: sIdx + 1 },
              { startIdx: sIdx + 1, endIdx: sIdx + 2 },
              { startIdx: sIdx + 2, endIdx: sIdx + 3 },
              { startIdx: sIdx + 3, endIdx: sIdx }
            );
          } else {
            faces.push({ vertexIndices: [sIdx, sIdx + 1, sIdx + 2], normal: f.normal, label: f.name });
            edges.push(
              { startIdx: sIdx, endIdx: sIdx + 1 },
              { startIdx: sIdx + 1, endIdx: sIdx + 2 },
              { startIdx: sIdx + 2, endIdx: sIdx }
            );
          }
        });

        break;
      }

      // Kapalı üçgen prizma:
      baseVertices = [
        { x: -hw, y: -hd, z: 0 },
        { x: hw, y: -hd, z: 0 },
        { x: 0, y: -hd, z: h },
        { x: -hw, y: hd, z: 0 },
        { x: hw, y: hd, z: 0 },
        { x: 0, y: hd, z: h },
      ];
      faces = [
        { vertexIndices: [0, 1, 4, 3], normal: { x: 0, y: 0, z: -1 }, label: 'Alt Dikdörtgen' },
        { vertexIndices: [1, 2, 5, 4], normal: { x: 0.7, y: 0, z: 0.7 }, label: 'Sağ Dikdörtgen' },
        { vertexIndices: [2, 0, 3, 5], normal: { x: -0.7, y: 0, z: 0.7 }, label: 'Sol Dikdörtgen' },
        { vertexIndices: [0, 1, 2], normal: { x: 0, y: -1, z: 0 }, label: 'Arka Üçgen' },
        { vertexIndices: [3, 4, 5], normal: { x: 0, y: 1, z: 0 }, label: 'Ön Üçgen' },
      ];
      edges = [
        { startIdx: 0, endIdx: 1 },
        { startIdx: 1, endIdx: 2 },
        { startIdx: 2, endIdx: 0 },
        { startIdx: 3, endIdx: 4 },
        { startIdx: 4, endIdx: 5 },
        { startIdx: 5, endIdx: 3 },
        { startIdx: 0, endIdx: 3 },
        { startIdx: 1, endIdx: 4 },
        { startIdx: 2, endIdx: 5 },
      ];
      break;
    }

    case 'cone': {
      const segments = 48;
      baseVertices = [];
      const u = Math.min(1, Math.max(0, unfoldProgress));
      const theta = (u * 90 * Math.PI) / 180;
      const s = Math.sin(theta);
      const c = Math.cos(theta);

      for (let i = 0; i < segments; i++) {
        const ang = (i * 2 * Math.PI) / segments;
        baseVertices.push({ x: r * Math.cos(ang), y: r * Math.sin(ang), z: 0 });
      }
      baseVertices.push({ x: 0, y: (h + r) * s, z: h * c });
      const apexIdx = segments;

      faces.push({
        vertexIndices: Array.from({ length: segments }, (_, i) => segments - 1 - i),
        normal: { x: 0, y: 0, z: -1 },
        label: 'Daire Taban',
      });

      for (let i = 0; i < segments; i++) {
        const next = (i + 1) % segments;
        faces.push({
          vertexIndices: [i, next, apexIdx],
          normal: { x: Math.cos(((i + 0.5) * 2 * Math.PI) / segments), y: Math.sin(((i + 0.5) * 2 * Math.PI) / segments), z: 0.3 },
          label: 'Yan Yüzey',
        });
        edges.push({ startIdx: i, endIdx: next });
      }
      break;
    }

    case 'cylinder': {
      const segments = 48;
      baseVertices = [];
      const u = Math.min(1, Math.max(0, unfoldProgress));

      if (u > 0) {
        const theta = (u * 90 * Math.PI) / 180;
        const s = Math.sin(theta);
        const c = Math.cos(theta);

        // 1. Yan Yüzey (Açılmış Dikdörtgen Levha):
        // 2*pi*r genişliğinde ve h yüksekliğinde
        const sheetWidth = 2 * Math.PI * r;
        const hwSheet = sheetWidth / 2;

        for (let i = 0; i < segments; i++) {
          const t = i / (segments - 1);
          // silindirik yaydan düz çizgiye interpolasyon
          const ang = (i * 2 * Math.PI) / segments - Math.PI / 2;
          const curX = (1 - u) * (r * Math.cos(ang)) + u * (-hwSheet + t * sheetWidth);
          const curY = (1 - u) * (r * Math.sin(ang)) + u * 0;
          const curZ_bottom = 0;
          const curZ_top = h * c;

          baseVertices.push({ x: curX, y: curY, z: curZ_bottom });
          baseVertices.push({ x: curX, y: curY + h * s, z: curZ_top });
        }

        // Alt Daire (Aşağıya doğru katlanır)
        const botCenterIdx = baseVertices.length;
        const botOffsetY = -r * s * 2;
        for (let i = 0; i < segments; i++) {
          const ang = (i * 2 * Math.PI) / segments;
          baseVertices.push({
            x: r * Math.cos(ang),
            y: botOffsetY + r * Math.sin(ang) * (1 - u * 0.2),
            z: 0,
          });
        }

        // Üst Daire (Yukarıya doğru katlanır)
        const topCenterIdx = baseVertices.length;
        const topOffsetY = (h + r * 2) * s;
        for (let i = 0; i < segments; i++) {
          const ang = (i * 2 * Math.PI) / segments;
          baseVertices.push({
            x: r * Math.cos(ang),
            y: topOffsetY + r * Math.sin(ang) * (1 - u * 0.2),
            z: h * c,
          });
        }

        faces = [];
        edges = [];

        // Yan yüzey şeritleri
        for (let i = 0; i < segments - 1; i++) {
          const p1 = i * 2;
          const p2 = i * 2 + 1;
          const p3 = (i + 1) * 2 + 1;
          const p4 = (i + 1) * 2;
          faces.push({
            vertexIndices: [p1, p4, p3, p2],
            normal: { x: 0, y: c, z: s },
            label: 'Yan Yüzey',
          });
          edges.push({ startIdx: p1, endIdx: p4 });
          edges.push({ startIdx: p2, endIdx: p3 });
        }
        edges.push({ startIdx: 0, endIdx: 1 });
        edges.push({ startIdx: (segments - 1) * 2, endIdx: (segments - 1) * 2 + 1 });

        // Alt Daire Yüzü
        faces.push({
          vertexIndices: Array.from({ length: segments }, (_, i) => botCenterIdx + i),
          normal: { x: 0, y: 0, z: -1 },
          label: 'Alt Daire',
        });
        for (let i = 0; i < segments; i++) {
          edges.push({ startIdx: botCenterIdx + i, endIdx: botCenterIdx + ((i + 1) % segments) });
        }

        // Üst Daire Yüzü
        faces.push({
          vertexIndices: Array.from({ length: segments }, (_, i) => topCenterIdx + i),
          normal: { x: 0, y: 0, z: 1 },
          label: 'Üst Daire',
        });
        for (let i = 0; i < segments; i++) {
          edges.push({ startIdx: topCenterIdx + i, endIdx: topCenterIdx + ((i + 1) % segments) });
        }

        break;
      }

      // Kapalı silindir:
      for (let i = 0; i < segments; i++) {
        const ang = (i * 2 * Math.PI) / segments;
        baseVertices.push({ x: r * Math.cos(ang), y: r * Math.sin(ang), z: 0 });
      }
      for (let i = 0; i < segments; i++) {
        const ang = (i * 2 * Math.PI) / segments;
        baseVertices.push({ x: r * Math.cos(ang), y: r * Math.sin(ang), z: h });
      }

      faces.push({
        vertexIndices: Array.from({ length: segments }, (_, i) => segments - 1 - i),
        normal: { x: 0, y: 0, z: -1 },
        label: 'Alt Daire',
      });
      faces.push({
        vertexIndices: Array.from({ length: segments }, (_, i) => segments + i),
        normal: { x: 0, y: 0, z: 1 },
        label: 'Üst Daire',
      });

      for (let i = 0; i < segments; i++) {
        const next = (i + 1) % segments;
        faces.push({
          vertexIndices: [i, next, segments + next, segments + i],
          normal: { x: Math.cos(((i + 0.5) * 2 * Math.PI) / segments), y: Math.sin(((i + 0.5) * 2 * Math.PI) / segments), z: 0 },
          label: 'Yan Yüzey',
        });
        edges.push({ startIdx: i, endIdx: next });
        edges.push({ startIdx: segments + i, endIdx: segments + next });
      }
      break;
    }

    case 'sphere': {
      const latCount = 18;
      const lonCount = 32;
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
            label: 'Küre Yüzeyi',
          });
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
