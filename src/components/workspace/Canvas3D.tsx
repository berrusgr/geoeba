'use client';

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import {
  Solid3DObject,
  Solid3DType,
  Camera3D,
  Tool3DMode,
  Point3D,
  CAMERA_ZOOM_MIN,
  CAMERA_ZOOM_MAX,
  CAMERA_PITCH_LIMIT,
} from '@/types/workspace3d';
import {
  Point2D,
  MathObject,
  PointObject,
  SegmentObject,
  LineObject,
  RayObject,
  CircleObject,
  PolygonObject,
  FunctionObject,
  SliderObject,
} from '@/types/math';
import { compileMathExpression } from '@/math/parser';
import { useWorkspace } from '@/state/WorkspaceContext';
import {
  generateSolidMesh,
  computeFaceArea,
  getSolidExtent,
  getVertexMarkerRadius,
} from '@/math/geometry3d';
import { formatTurkishNumber } from '@/math/coordinates';
import { isAnyModalOpen } from '@/components/ui/modalState';
import { RotateCw, Focus, Plus, Minus, Grid, Trash2, Box, Sparkles, ScanSearch, Search } from 'lucide-react';
import { ViewCube3D } from './ViewCube3D';

/* -------------------------------------------------------------------------- */
/*  Sabitler                                                                   */
/* -------------------------------------------------------------------------- */

const FOV_DEG = 40;
const GRID_SIZE = 24;
const AXIS_LEN = 16;
const AXIS_Z_POS = 14;
const AXIS_Z_NEG = 6;
const ORBIT_SPEED = 0.45;
const DEFAULT_SOLID_COLOR = '#3b82f6';

const AXIS_COLORS = { x: '#ef4444', y: '#10b981', z: '#3b82f6' } as const;

type Axis = 'x' | 'y' | 'z';

/* -------------------------------------------------------------------------- */
/*  Kamera (Camera3D durumundan three.js kamerası)                             */
/* -------------------------------------------------------------------------- */

interface CameraBasis {
  camera: THREE.PerspectiveCamera;
  forward: THREE.Vector3;
  up: THREE.Vector3;
  right: THREE.Vector3;
  target: THREE.Vector3;
  distance: number;
}

/**
 * Mevcut Camera3D durumunu (yaw/pitch/zoom/pan) birebir three.js perspektif
 * kamerasına dönüştürür. Böylece ViewCube, bakış açısı ön ayarları ve
 * kaydırma/yakınlaştırma davranışları eskisiyle aynı kalır.
 */
function buildCameraBasis(cam: Camera3D, width: number, height: number): CameraBasis {
  const yaw = (cam.rotY * Math.PI) / 180;
  const pitch = (cam.rotX * Math.PI) / 180;
  const cp = Math.cos(pitch);
  // POZİTİF rotX kamerayı zeminin ÜSTÜNE çıkarmalıdır (ÜST ön ayarı rotX = +85).
  // camera.position = target - forward · distance olduğundan forward.z = -sin(pitch)
  // olmalı; up da aynı işaretle çevrilir, böylece taban ortonormal kalır.
  const sp = -Math.sin(pitch);
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);

  const forward = new THREE.Vector3(sy * cp, cy * cp, sp);
  const up = new THREE.Vector3(-sy * sp, -cy * sp, cp);
  const right = new THREE.Vector3(cy, -sy, 0);

  const zoom = Math.max(1, cam.zoom);
  const halfFov = ((FOV_DEG / 2) * Math.PI) / 180;
  const distance = (Math.max(1, height) / 2) / (zoom * Math.tan(halfFov));

  const target = new THREE.Vector3()
    .addScaledVector(right, -cam.panX / zoom)
    .addScaledVector(up, cam.panY / zoom);

  const camera = new THREE.PerspectiveCamera(FOV_DEG, Math.max(1, width) / Math.max(1, height), 0.1, 4000);
  camera.position.copy(target).addScaledVector(forward, -distance);
  camera.up.copy(up);
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);

  return { camera, forward, up, right, target, distance };
}

function projectToScreen(
  p: Point3D | THREE.Vector3,
  camera: THREE.Camera,
  width: number,
  height: number
): { x: number; y: number; behind: boolean } {
  const v = new THREE.Vector3(p.x, p.y, p.z).project(camera);
  return {
    x: ((v.x + 1) / 2) * width,
    y: ((1 - v.y) / 2) * height,
    behind: v.z > 1 || Number.isNaN(v.z),
  };
}

function clampZoom(z: number): number {
  return Math.max(CAMERA_ZOOM_MIN, Math.min(CAMERA_ZOOM_MAX, z));
}

/* -------------------------------------------------------------------------- */
/*  Yazı etiketleri (Sprite)                                                   */
/* -------------------------------------------------------------------------- */

const textureCache = new Map<string, THREE.CanvasTexture>();

function getTextTexture(text: string, color: string, bold: boolean): THREE.CanvasTexture {
  const key = `${text}|${color}|${bold ? 'b' : 'n'}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 128, 64);
    ctx.font = `${bold ? '900' : '700'} ${bold ? 34 : 30}px ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.strokeText(text, 64, 34);
    ctx.fillStyle = color;
    ctx.fillText(text, 64, 34);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  textureCache.set(key, tex);
  return tex;
}

function makeLabelSprite(text: string, color: string, size: number, bold = false): THREE.Sprite {
  const material = new THREE.SpriteMaterial({
    map: getTextTexture(text, color, bold),
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(size * 2, size, 1);
  sprite.renderOrder = 5;
  return sprite;
}

/* -------------------------------------------------------------------------- */
/*  Sahne yardımcıları                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Bir nesne ağacındaki tüm GPU kaynaklarını serbest bırakır.
 *
 * - InstancedMesh.dispose() ayrıca çağrılır; instanceMatrix tamponu yalnızca bu
 *   yolla serbest kalır (köşe işaretçileri her sürükleme karesinde yeniden kurulur).
 * - Aynı geometri/materyal birden çok çocukta paylaşılabildiği için (ör. köşe
 *   işaretçilerinin core ve halo örnekleri aynı küre geometrisini kullanır) her
 *   kaynak yalnızca bir kez dispose edilir.
 * - Sprite'lar three.js içinde MODÜL DÜZEYİNDE ortak bir geometri paylaşır; onu
 *   dispose etmek sonraki tüm etiketleri bozar, bu yüzden atlanır.
 * - Material.dispose() haritayı (texture) serbest bırakmaz; textureCache geçerli kalır.
 */
function disposeObject(obj: THREE.Object3D) {
  const seen = new Set<THREE.BufferGeometry | THREE.Material>();
  obj.traverse((child) => {
    const instanced = child as THREE.InstancedMesh;
    if (instanced.isInstancedMesh) instanced.dispose();

    const mesh = child as THREE.Mesh;
    const isSprite = (child as THREE.Sprite).isSprite === true;
    if (!isSprite && mesh.geometry && !seen.has(mesh.geometry)) {
      seen.add(mesh.geometry);
      mesh.geometry.dispose();
    }

    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
    const materials = Array.isArray(mat) ? mat : mat ? [mat] : [];
    materials.forEach((m) => {
      if (!seen.has(m)) {
        seen.add(m);
        m.dispose();
      }
    });
  });
}

function clearGroup(group: THREE.Group) {
  while (group.children.length) {
    const child = group.children[0];
    group.remove(child);
    disposeObject(child);
  }
}

function buildGrid(isDark: boolean): THREE.Group {
  const group = new THREE.Group();
  const minor: number[] = [];
  const major: number[] = [];
  for (let i = -GRID_SIZE; i <= GRID_SIZE; i++) {
    if (i === 0) continue;
    const target = i % 5 === 0 ? major : minor;
    target.push(i, -GRID_SIZE, 0, i, GRID_SIZE, 0);
    target.push(-GRID_SIZE, i, 0, GRID_SIZE, i, 0);
  }
  const makeLines = (arr: number[], color: string, opacity: number) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
    return new THREE.LineSegments(geo, mat);
  };
  group.add(makeLines(minor, isDark ? '#64748b' : '#94a3b8', isDark ? 0.35 : 0.45));
  group.add(makeLines(major, isDark ? '#94a3b8' : '#64748b', isDark ? 0.5 : 0.6));

  // Zemin düzlemi (hafif dolgu, cisimlerin zemine oturduğunu hissettirir)
  const planeGeo = new THREE.PlaneGeometry(GRID_SIZE * 2, GRID_SIZE * 2);
  const planeMat = new THREE.MeshBasicMaterial({
    color: isDark ? '#0f172a' : '#f8fafc',
    transparent: true,
    opacity: isDark ? 0.25 : 0.35,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const plane = new THREE.Mesh(planeGeo, planeMat);
  plane.position.z = -0.002;
  plane.renderOrder = -10;
  group.add(plane);
  return group;
}

function buildAxes(isDark: boolean): THREE.Group {
  const group = new THREE.Group();

  const makeAxis = (dir: Axis, posLen: number, negLen: number) => {
    const color = AXIS_COLORS[dir];
    const vec = (t: number): [number, number, number] =>
      dir === 'x' ? [t, 0, 0] : dir === 'y' ? [0, t, 0] : [0, 0, t];

    const solidGeo = new THREE.BufferGeometry();
    solidGeo.setAttribute('position', new THREE.Float32BufferAttribute([...vec(0), ...vec(posLen)], 3));
    group.add(new THREE.Line(solidGeo, new THREE.LineBasicMaterial({ color })));

    const dashGeo = new THREE.BufferGeometry();
    dashGeo.setAttribute('position', new THREE.Float32BufferAttribute([...vec(0), ...vec(-negLen)], 3));
    const dashLine = new THREE.Line(
      dashGeo,
      new THREE.LineDashedMaterial({ color, dashSize: 0.35, gapSize: 0.25, transparent: true, opacity: 0.6 })
    );
    dashLine.computeLineDistances();
    group.add(dashLine);

    // Ok ucu
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 0.5, 12),
      new THREE.MeshBasicMaterial({ color })
    );
    const dirVec = new THREE.Vector3(...vec(1));
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirVec);
    cone.position.set(...vec(posLen));
    group.add(cone);

    // Eksen adları
    const posLabel = makeLabelSprite(`+${dir}`, color, 0.55, true);
    posLabel.position.set(...vec(posLen + 0.9));
    group.add(posLabel);
    const negLabel = makeLabelSprite(`-${dir}`, color, 0.45);
    negLabel.position.set(...vec(-negLen - 0.8));
    group.add(negLabel);

    // Sayısal işaretler
    for (let i = -negLen + 1; i <= posLen - 1; i++) {
      if (i === 0) continue;
      const tick = makeLabelSprite(String(i), color, 0.3);
      const p = vec(i);
      tick.position.set(p[0] + (dir === 'y' ? -0.45 : 0), p[1] + (dir === 'x' ? -0.45 : 0), p[2] + (dir === 'z' ? 0 : 0));
      if (dir === 'z') tick.position.x -= 0.5;
      group.add(tick);
    }
  };

  makeAxis('x', AXIS_LEN, AXIS_LEN);
  makeAxis('y', AXIS_LEN, AXIS_LEN);
  makeAxis('z', AXIS_Z_POS, AXIS_Z_NEG);

  // Orijin
  const origin = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 16, 12),
    new THREE.MeshBasicMaterial({ color: '#2563eb' })
  );
  group.add(origin);
  const originLabel = makeLabelSprite('(0; 0; 0)', isDark ? '#e2e8f0' : '#1e293b', 0.42);
  originLabel.position.set(0.9, -0.9, -0.15);
  group.add(originLabel);

  return group;
}

/** Cismin dikey merkezi (gizmo ve etiket konumu için) */
function getSolidCenter(solid: Solid3DObject): THREE.Vector3 {
  const { width, height, radius } = solid.dimensions;
  let zHalf: number;
  if (solid.type === 'sphere') zHalf = radius || width / 2 || 1.5;
  else if (solid.type === 'cube') zHalf = (width || 3) / 2;
  else zHalf = (height || 3) / 2;
  return new THREE.Vector3(solid.position.x, solid.position.y, solid.position.z + zHalf);
}

function dedupeVertices(vertices: Point3D[]): Point3D[] {
  const seen = new Set<string>();
  const out: Point3D[] = [];
  vertices.forEach((v) => {
    const key = `${v.x.toFixed(4)}|${v.y.toFixed(4)}|${v.z.toFixed(4)}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(v);
    }
  });
  return out;
}

interface BuiltSolid {
  group: THREE.Group;
  faceMesh: THREE.Mesh;
  triToFace: number[];
}

/**
 * Bir katı cismi three.js nesnelerine dönüştürür (yüzler, ayrıtlar, köşe işaretçileri).
 * Geometri, mevcut generateSolidMesh motorundan üretilir; böylece açınım animasyonu
 * ve tüm cisim tipleri eskisiyle birebir aynı biçimde çalışır.
 */
function buildSolid(
  solid: Solid3DObject,
  opts: { selected: boolean; showFaces: boolean; showEdges: boolean; showVertices: boolean; isDark: boolean; zoom: number }
): BuiltSolid {
  const group = new THREE.Group();
  group.userData = { solidId: solid.id };
  const mesh = generateSolidMesh(solid);
  const smooth = solid.type === 'sphere';
  const baseColor = new THREE.Color(solid.color || DEFAULT_SOLID_COLOR);
  const highlight = new THREE.Color('#38bdf8');

  // --- Yüzler ---
  const geometry = new THREE.BufferGeometry();
  const triToFace: number[] = [];

  if (smooth) {
    const positions = new Float32Array(mesh.vertices.length * 3);
    const colors = new Float32Array(mesh.vertices.length * 3);
    mesh.vertices.forEach((v, i) => {
      positions[i * 3] = v.x;
      positions[i * 3 + 1] = v.y;
      positions[i * 3 + 2] = v.z;
      colors[i * 3] = baseColor.r;
      colors[i * 3 + 1] = baseColor.g;
      colors[i * 3 + 2] = baseColor.b;
    });
    const indices: number[] = [];
    mesh.faces.forEach((face, fIdx) => {
      const idx = face.vertexIndices;
      for (let i = 1; i < idx.length - 1; i++) {
        indices.push(idx[0], idx[i], idx[i + 1]);
        triToFace.push(fIdx);
      }
    });
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setIndex(indices);
  } else {
    const positions: number[] = [];
    const colors: number[] = [];
    mesh.faces.forEach((face, fIdx) => {
      const custom = solid.faceColors?.[fIdx];
      const col = custom ? new THREE.Color(custom) : baseColor.clone();
      if (solid.selectedFaceIndex === fIdx) col.lerp(highlight, 0.55);
      const idx = face.vertexIndices;
      for (let i = 1; i < idx.length - 1; i++) {
        const tri = [mesh.vertices[idx[0]], mesh.vertices[idx[i]], mesh.vertices[idx[i + 1]]];
        if (tri.some((v) => !v)) continue;
        tri.forEach((v) => {
          positions.push(v.x, v.y, v.z);
          colors.push(col.r, col.g, col.b);
        });
        triToFace.push(fIdx);
      }
    });
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  }
  geometry.computeVertexNormals();

  const opacity = typeof solid.opacity === 'number' ? solid.opacity : 0.85;
  const faceMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    transparent: opacity < 0.995,
    opacity,
    side: THREE.DoubleSide,
    flatShading: !smooth,
    roughness: 0.55,
    metalness: 0.05,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
    emissive: opts.selected ? highlight : new THREE.Color('#000000'),
    emissiveIntensity: opts.selected ? 0.16 : 0,
  });
  faceMaterial.visible = opts.showFaces;
  const faceMesh = new THREE.Mesh(geometry, faceMaterial);
  faceMesh.userData = { solidId: solid.id, kind: 'face' };
  group.add(faceMesh);

  // --- Ayrıtlar ---
  if (opts.showEdges && mesh.edges.length > 0) {
    const edgePositions: number[] = [];
    mesh.edges.forEach((e) => {
      const a = mesh.vertices[e.startIdx];
      const b = mesh.vertices[e.endIdx];
      if (a && b) edgePositions.push(a.x, a.y, a.z, b.x, b.y, b.z);
    });
    const edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3));
    const edgeColor = opts.selected ? '#ec4899' : opts.isDark ? '#e2e8f0' : '#1e293b';
    const edgeMat = new THREE.LineBasicMaterial({ color: edgeColor, transparent: true, opacity: 0.95 });
    const edges = new THREE.LineSegments(edgeGeo, edgeMat);
    edges.renderOrder = 2;
    group.add(edges);
  }

  // --- Köşe (pivot) işaretçileri: boyutu cismin ebadına göre ölçeklenir ---
  if (opts.showVertices) {
    let markerPoints: Point3D[] = [];
    if (solid.type === 'cone') {
      markerPoints = mesh.vertices.length ? [mesh.vertices[mesh.vertices.length - 1]] : [];
    } else if (solid.type !== 'sphere' && solid.type !== 'cylinder') {
      markerPoints = dedupeVertices(mesh.vertices);
    }

    if (markerPoints.length > 0) {
      // Yarıçap cismin boyutuyla orantılı; ayrıca ekranda çok küçülüp kaybolmasın,
      // çok büyüyüp cismi yutmasın diye kamera yakınlığına göre kıstırılır.
      const r = getVertexMarkerRadius(solid, opts.zoom);
      const sphereGeo = new THREE.SphereGeometry(1, 14, 10);
      const coreMat = new THREE.MeshStandardMaterial({
        color: opts.selected ? '#f472b6' : '#8b5cf6',
        emissive: opts.selected ? '#9d174d' : '#4c1d95',
        emissiveIntensity: 0.35,
        roughness: 0.4,
      });
      const haloMat = new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.BackSide });

      const core = new THREE.InstancedMesh(sphereGeo, coreMat, markerPoints.length);
      const halo = new THREE.InstancedMesh(sphereGeo, haloMat, markerPoints.length);
      const m = new THREE.Matrix4();
      markerPoints.forEach((p, i) => {
        m.makeScale(r, r, r).setPosition(p.x, p.y, p.z);
        core.setMatrixAt(i, m);
        m.makeScale(r * 1.3, r * 1.3, r * 1.3).setPosition(p.x, p.y, p.z);
        halo.setMatrixAt(i, m);
      });
      core.instanceMatrix.needsUpdate = true;
      halo.instanceMatrix.needsUpdate = true;
      core.renderOrder = 3;
      halo.renderOrder = 3;
      core.userData = { solidId: solid.id, kind: 'vertex' };
      halo.userData = { solidId: solid.id, kind: 'vertex' };
      group.add(halo);
      group.add(core);
    }
  }

  return { group, faceMesh, triToFace };
}

/** Taşıma gizmosu: oklar ve merkez tutamacı; uzunluk cismin ebadıyla orantılı */
function buildGizmo(center: THREE.Vector3, len: number): THREE.Group {
  const group = new THREE.Group();
  const r = Math.max(0.035, len * 0.03);

  (['x', 'y', 'z'] as Axis[]).forEach((axis) => {
    const dir = new THREE.Vector3(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0);
    const mat = new THREE.MeshBasicMaterial({ color: AXIS_COLORS[axis], depthTest: false, transparent: true, opacity: 0.95 });

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len * 0.72, 10), mat);
    shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    shaft.position.copy(center).addScaledVector(dir, len * 0.36);
    shaft.userData = { gizmoAxis: axis };
    shaft.renderOrder = 20;

    const head = new THREE.Mesh(new THREE.ConeGeometry(r * 3.2, len * 0.26, 14), mat);
    head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    head.position.copy(center).addScaledVector(dir, len * 0.85);
    head.userData = { gizmoAxis: axis };
    head.renderOrder = 20;

    // Görünmez ama tıklanabilir geniş tutamaç (küçük cisimlerde yakalamayı kolaylaştırır)
    const grab = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 3.5, r * 3.5, len, 8),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    grab.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    grab.position.copy(center).addScaledVector(dir, len * 0.5);
    grab.userData = { gizmoAxis: axis };

    group.add(shaft, head, grab);
  });

  const centerHalo = new THREE.Mesh(
    new THREE.SphereGeometry(r * 3.2, 16, 12),
    new THREE.MeshBasicMaterial({ color: '#0f172a', depthTest: false, side: THREE.BackSide })
  );
  centerHalo.position.copy(center);
  centerHalo.renderOrder = 21;
  centerHalo.userData = { gizmoAxis: 'free' };
  const centerBall = new THREE.Mesh(
    new THREE.SphereGeometry(r * 2.6, 16, 12),
    new THREE.MeshBasicMaterial({ color: '#ffffff', depthTest: false })
  );
  centerBall.position.copy(center);
  centerBall.renderOrder = 22;
  centerBall.userData = { gizmoAxis: 'free' };
  group.add(centerHalo, centerBall);

  return group;
}

/* -------------------------------------------------------------------------- */
/*  2D Matematik Nesnelerini 3D Uzayda Çizme (Ortak Matematiksel Model)       */
/* -------------------------------------------------------------------------- */

function buildMathObjects3D(
  objects: MathObject[],
  selectedObjectIds: string[],
  isDark: boolean
): THREE.Group {
  const group = new THREE.Group();
  const pointsById = new Map(
    objects.filter((o) => o.type === 'point').map((p) => [p.id, p as PointObject])
  );

  const sliderScope: Record<string, number> = {};
  objects.forEach((o) => {
    if (o.type === 'slider') {
      const s = o as SliderObject;
      sliderScope[s.variableName] = s.value;
    }
  });

  for (const obj of objects) {
    if (obj.visible === false) continue;
    const isSelected = selectedObjectIds.includes(obj.id);
    const colorHex = obj.color || (isDark ? '#60a5fa' : '#2563eb');

    switch (obj.type) {
      case 'point': {
        const pt = obj as PointObject;
        const ptGroup = new THREE.Group();
        const r = isSelected ? 0.35 : 0.25;
        const geo = new THREE.SphereGeometry(r, 16, 16);
        const mat = new THREE.MeshStandardMaterial({
          color: colorHex,
          roughness: 0.3,
          metalness: 0.2,
          emissive: isSelected ? colorHex : '#000000',
          emissiveIntensity: isSelected ? 0.5 : 0,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(pt.x, pt.y, 0);
        ptGroup.add(mesh);

        if (pt.label) {
          const sprite = makeLabelSprite(pt.label, isDark ? '#f8fafc' : '#0f172a', 0.9, true);
          sprite.position.set(pt.x + 0.35, pt.y + 0.35, 0.15);
          ptGroup.add(sprite);
        }
        group.add(ptGroup);
        break;
      }
      case 'segment': {
        const seg = obj as SegmentObject;
        const p1 = pointsById.get(seg.startPointId);
        const p2 = pointsById.get(seg.endPointId);
        if (!p1 || !p2) break;
        const points = [new THREE.Vector3(p1.x, p1.y, 0), new THREE.Vector3(p2.x, p2.y, 0)];
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const mat = new THREE.LineBasicMaterial({
          color: colorHex,
        });
        const line = new THREE.Line(geo, mat);
        group.add(line);
        break;
      }
      case 'line': {
        const l = obj as LineObject;
        const p1 = pointsById.get(l.point1Id);
        const p2 = pointsById.get(l.point2Id);
        if (!p1 || !p2) break;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.hypot(dx, dy);
        if (len < 1e-6) break;
        const extend = 30 / len;
        const points = [
          new THREE.Vector3(p1.x - dx * extend, p1.y - dy * extend, 0),
          new THREE.Vector3(p2.x + dx * extend, p2.y + dy * extend, 0),
        ];
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const mat = new THREE.LineBasicMaterial({
          color: colorHex,
        });
        const line = new THREE.Line(geo, mat);
        group.add(line);
        break;
      }
      case 'circle': {
        const circ = obj as CircleObject;
        const c = pointsById.get(circ.centerPointId);
        if (!c) break;
        const rp = circ.radiusPointId ? pointsById.get(circ.radiusPointId) : undefined;
        const r = c && rp ? Math.hypot(c.x - rp.x, c.y - rp.y) : circ.fixedRadius ?? 0;
        if (r <= 0) break;

        const curve = new THREE.EllipseCurve(c.x, c.y, r, r, 0, 2 * Math.PI, false, 0);
        const pts = curve.getPoints(64).map((p) => new THREE.Vector3(p.x, p.y, 0));
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = new THREE.LineBasicMaterial({
          color: colorHex,
        });
        const circleLine = new THREE.Line(geo, mat);
        group.add(circleLine);
        break;
      }
      case 'polygon': {
        const poly = obj as PolygonObject;
        const pts = poly.pointIds.map((id) => pointsById.get(id)).filter(Boolean) as PointObject[];
        if (pts.length < 3) break;

        // Kenarlar
        const edgePts = pts.map((p) => new THREE.Vector3(p.x, p.y, 0));
        edgePts.push(edgePts[0]);
        const edgeGeo = new THREE.BufferGeometry().setFromPoints(edgePts);
        const edgeMat = new THREE.LineBasicMaterial({
          color: colorHex,
        });
        group.add(new THREE.Line(edgeGeo, edgeMat));

        // Yüzey
        const shape = new THREE.Shape();
        shape.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i].x, pts[i].y);
        shape.closePath();

        const faceGeo = new THREE.ShapeGeometry(shape);
        const faceMat = new THREE.MeshStandardMaterial({
          color: poly.fillColor || colorHex,
          transparent: true,
          opacity: poly.fillOpacity ?? 0.3,
          side: THREE.DoubleSide,
          roughness: 0.5,
        });
        group.add(new THREE.Mesh(faceGeo, faceMat));
        break;
      }
      case 'function': {
        const fn = obj as FunctionObject;
        const compiled = compileMathExpression(fn.expression);
        if (!compiled) break;

        const curvePts: THREE.Vector3[] = [];
        const step = 0.15;
        for (let x = -15; x <= 15; x += step) {
          try {
            const y = compiled(x, sliderScope);
            if (Number.isFinite(y) && Math.abs(y) < 50) {
              curvePts.push(new THREE.Vector3(x, y, 0));
            }
          } catch {
            // Tanımsız noktaları atla
          }
        }
        if (curvePts.length > 1) {
          const geo = new THREE.BufferGeometry().setFromPoints(curvePts);
          const mat = new THREE.LineBasicMaterial({
            color: colorHex,
          });
          group.add(new THREE.Line(geo, mat));
        }
        break;
      }
    }
  }

  return group;
}

/* -------------------------------------------------------------------------- */
/*  Bileşen                                                                    */
/* -------------------------------------------------------------------------- */

interface Canvas3DProps {
  solids: Solid3DObject[];
  selectedSolidId: string | null;
  selectedSolidIds?: string[];
  activeTool: Tool3DMode;
  camera: Camera3D;
  showGlobalVertices: boolean;
  showGlobalEdges: boolean;
  showGlobalFaces: boolean;
  setCamera: React.Dispatch<React.SetStateAction<Camera3D>>;
  onSelectSolid: (id: string | null) => void;
  onSelectSolids?: (ids: string[]) => void;
  onAddSolid?: (
    type: Solid3DType,
    customDim?: { width: number; height: number; depth: number; radius?: number },
    customPos?: Point3D
  ) => void;
  onDeleteSolid?: (id?: string) => void;
  onDeleteSolids?: () => void;
  onClearAll?: () => void;
  setActive3DTool?: (tool: Tool3DMode) => void;
  onUpdateSolid?: (id: string, updates: Partial<Solid3DObject>) => void;
  onUpdateSolidPosition: (id: string, newPos: Point3D) => void;
  onUpdateSolidsPosition?: (ids: string[], delta: Point3D) => void;
  onSwitchTo2D: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onDragEnd?: () => void;
  /** Esc ile iptal: konumları sürükleme öncesine döndürür ve geçmişte iz bırakmaz */
  onDragCancel?: () => void;
}

type Interaction =
  | { type: 'orbit' | 'pan'; lastX: number; lastY: number }
  | { type: 'marquee'; start: Point2D; current: Point2D }
  | { type: 'create'; startScreen: Point2D; currentScreen: Point2D; groundPos: Point3D | null }
  | {
      type: 'move';
      axis: Axis | 'free';
      /** Gizmonun/tıklamanın ait olduğu cisim: ok izdüşümü bu cismin merkezinden alınır */
      anchorId: string;
      solidIds: string[];
      startPositions: Record<string, Point3D>;
      startClient: Point2D;
      startHit: THREE.Vector3 | null;
      plane: THREE.Plane | null;
      vertical: boolean;
      moved: boolean;
      /** Sürükleme boyunca cisimlere UYGULANMIŞ toplam öteleme (toplu güncelleme için) */
      applied: Point3D;
    };

const CREATE_TYPE_MAP: Partial<Record<Tool3DMode, Solid3DType>> = {
  create_cube: 'cube',
  create_sphere: 'sphere',
  create_cylinder: 'cylinder',
  create_prism: 'prism',
  create_triangular_prism: 'triangular_prism',
  create_cone: 'cone',
  create_pyramid: 'pyramid',
};

export function Canvas3D(props: Canvas3DProps) {
  const {
    solids,
    selectedSolidId,
    selectedSolidIds,
    activeTool,
    camera,
    showGlobalVertices,
    showGlobalEdges,
    showGlobalFaces,
    setCamera,
    onSelectSolid,
    onSelectSolids,
    onAddSolid,
    onDeleteSolid,
    onDeleteSolids,
    onClearAll,
    setActive3DTool,
    onUpdateSolid,
    onUpdateSolidPosition,
    onUpdateSolidsPosition,
    onSwitchTo2D,
    onUndo,
    onRedo,
    onDragEnd,
    onDragCancel,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const effectiveSelectedIds = useMemo(
    () => selectedSolidIds || (selectedSolidId ? [selectedSolidId] : []),
    [selectedSolidIds, selectedSolidId]
  );

  const workspace = useWorkspace();
  const objects = workspace?.objects ?? [];
  const selectedObjectIds = workspace?.selectedObjectIds ?? [];

  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 1200, height: 700 });
  const [isDark, setIsDark] = useState(false);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const interactionRef = useRef<Interaction | null>(null);

  const threeRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    solidsGroup: THREE.Group;
    mathObjectsGroup: THREE.Group;
    gizmoGroup: THREE.Group;
    gridGroup: THREE.Group | null;
    axesGroup: THREE.Group | null;
    raycaster: THREE.Raycaster;
    builtSolids: Map<string, BuiltSolid>;
    frame: number | null;
  } | null>(null);

  const basis = useMemo(() => buildCameraBasis(camera, dimensions.width, dimensions.height), [camera, dimensions]);

  // En güncel prop/durumları olay dinleyicilerine taşımak için
  const latest = useRef({
    solids,
    camera,
    dimensions,
    basis,
    activeTool,
    effectiveSelectedIds,
    onSelectSolid,
    onSelectSolids,
    onAddSolid,
    onDeleteSolid,
    onDeleteSolids,
    setActive3DTool,
    onUpdateSolid,
    onUpdateSolidPosition,
    onUpdateSolidsPosition,
    setCamera,
    onUndo,
    onRedo,
    onDragEnd,
    onDragCancel,
  });
  latest.current = {
    solids,
    camera,
    dimensions,
    basis,
    activeTool,
    effectiveSelectedIds,
    onSelectSolid,
    onSelectSolids,
    onAddSolid,
    onDeleteSolid,
    onDeleteSolids,
    setActive3DTool,
    onUpdateSolid,
    onUpdateSolidPosition,
    onUpdateSolidsPosition,
    setCamera,
    onUndo,
    onRedo,
    onDragEnd,
    onDragCancel,
  };

  const setInteractionBoth = useCallback((next: Interaction | null) => {
    interactionRef.current = next;
    setInteraction(next);
  }, []);

  /**
   * Sürüklemeyi iptal eder: cisimleri sürükleme başındaki konumlarına geri yazar.
   * Geri yazma, sürükleme sırasında kullanılan YOLUN aynısıyla yapılır; böylece
   * geçmiş anahtarı değişmez ve fazladan bir geri alma adımı oluşmaz.
   */
  const revertMove = useCallback((it: Interaction) => {
    if (it.type !== 'move' || !it.moved) return;
    const { x, y, z } = it.applied;
    if (x === 0 && y === 0 && z === 0) return;
    const l = latest.current;
    if (it.solidIds.length > 1 && l.onUpdateSolidsPosition) {
      l.onUpdateSolidsPosition(it.solidIds, { x: -x, y: -y, z: -z });
      return;
    }
    it.solidIds.forEach((id) => {
      const orig = it.startPositions[id];
      if (orig) l.onUpdateSolidPosition(id, { ...orig });
    });
  }, []);

  const requestRender = useCallback(() => {
    const t = threeRef.current;
    if (!t || t.frame !== null) return;
    t.frame = requestAnimationFrame(() => {
      t.frame = null;
      t.renderer.render(t.scene, latest.current.basis.camera);
    });
  }, []);

  /* ---------------------------- Tema takibi ---------------------------- */
  useEffect(() => {
    const root = document.documentElement;
    const update = () => setIsDark(root.classList.contains('dark'));
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  /* ---------------------------- Boyut takibi --------------------------- */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setDimensions((prev) =>
          Math.abs(prev.width - rect.width) < 0.5 && Math.abs(prev.height - rect.height) < 0.5
            ? prev
            : { width: rect.width, height: rect.height }
        );
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  /* ------------------------- Renderer kurulumu ------------------------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (err) {
      setWebglError('Tarayıcınız WebGL desteklemiyor; 3D görünüm için güncel bir tarayıcı gerekir.');
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const hemi = new THREE.HemisphereLight(0xffffff, 0x94a3b8, 0.45);
    hemi.position.set(0, 0, 1);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(6, 5, 9);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(-6, -4, 3);
    scene.add(fill);

    const solidsGroup = new THREE.Group();
    const mathObjectsGroup = new THREE.Group();
    const gizmoGroup = new THREE.Group();
    scene.add(solidsGroup, mathObjectsGroup, gizmoGroup);

    threeRef.current = {
      renderer,
      scene,
      solidsGroup,
      mathObjectsGroup,
      gizmoGroup,
      gridGroup: null,
      axesGroup: null,
      raycaster: new THREE.Raycaster(),
      builtSolids: new Map(),
      frame: null,
    };

    return () => {
      const t = threeRef.current;
      if (!t) return;
      if (t.frame !== null) cancelAnimationFrame(t.frame);
      clearGroup(t.solidsGroup);
      clearGroup(t.mathObjectsGroup);
      clearGroup(t.gizmoGroup);
      if (t.gridGroup) disposeObject(t.gridGroup);
      if (t.axesGroup) disposeObject(t.axesGroup);
      t.renderer.dispose();
      threeRef.current = null;
    };
  }, []);

  /* --------------------- Izgara ve eksenler (tema) --------------------- */
  useEffect(() => {
    const t = threeRef.current;
    if (!t) return;
    if (t.gridGroup) {
      t.scene.remove(t.gridGroup);
      disposeObject(t.gridGroup);
    }
    if (t.axesGroup) {
      t.scene.remove(t.axesGroup);
      disposeObject(t.axesGroup);
    }
    t.gridGroup = buildGrid(isDark);
    t.axesGroup = buildAxes(isDark);
    t.scene.add(t.gridGroup, t.axesGroup);
    requestRender();
  }, [isDark, requestRender]);

  useEffect(() => {
    const t = threeRef.current;
    if (!t) return;
    if (t.gridGroup) t.gridGroup.visible = camera.showGrid;
    if (t.axesGroup) t.axesGroup.visible = camera.showAxes;
    requestRender();
  }, [camera.showGrid, camera.showAxes, requestRender]);

  /* --------------------------- Boyut / kamera -------------------------- */
  useEffect(() => {
    const t = threeRef.current;
    if (!t) return;
    t.renderer.setSize(dimensions.width, dimensions.height, false);
    requestRender();
  }, [dimensions, requestRender]);

  useEffect(() => {
    requestRender();
  }, [basis, requestRender]);

  /* ---------------------------- Cisimler ------------------------------- */
  useEffect(() => {
    const t = threeRef.current;
    if (!t) return;
    clearGroup(t.solidsGroup);
    t.builtSolids.clear();
    solids.forEach((solid) => {
      const built = buildSolid(solid, {
        selected: effectiveSelectedIds.includes(solid.id),
        showFaces: showGlobalFaces,
        showEdges: showGlobalEdges,
        showVertices: showGlobalVertices,
        isDark,
        zoom: camera.zoom,
      });
      t.builtSolids.set(solid.id, built);
      t.solidsGroup.add(built.group);
    });
    requestRender();
  }, [solids, effectiveSelectedIds, showGlobalFaces, showGlobalEdges, showGlobalVertices, isDark, camera.zoom, requestRender]);

  /* ------------------- 2D/3D Ortak Matematik Nesneleri ----------------- */
  useEffect(() => {
    const t = threeRef.current;
    if (!t) return;
    clearGroup(t.mathObjectsGroup);
    const group = buildMathObjects3D(objects, selectedObjectIds, isDark);
    while (group.children.length > 0) {
      t.mathObjectsGroup.add(group.children[0]);
    }
    requestRender();
  }, [objects, selectedObjectIds, isDark, requestRender]);

  /* ------------------------------ Gizmo -------------------------------- */
  useEffect(() => {
    const t = threeRef.current;
    if (!t) return;
    clearGroup(t.gizmoGroup);
    if (activeTool === 'select_move') {
      solids.forEach((solid) => {
        if (!effectiveSelectedIds.includes(solid.id)) return;
        const extent = getSolidExtent(solid);
        const len = Math.min(6, Math.max(1.6, extent * 0.65 + 0.6));
        const gizmo = buildGizmo(getSolidCenter(solid), len);
        gizmo.userData = { solidId: solid.id };
        t.gizmoGroup.add(gizmo);
      });
    }
    requestRender();
  }, [solids, effectiveSelectedIds, activeTool, requestRender]);

  /* --------------------------- Yardımcılar ----------------------------- */
  const getPointerNdc = useCallback((clientX: number, clientY: number): THREE.Vector2 => {
    const rect = containerRef.current?.getBoundingClientRect();
    const x = clientX - (rect?.left || 0);
    const y = clientY - (rect?.top || 0);
    const { width, height } = latest.current.dimensions;
    return new THREE.Vector2((x / width) * 2 - 1, -(y / height) * 2 + 1);
  }, []);

  const pickGizmo = useCallback((ndc: THREE.Vector2): { solidId: string; axis: Axis | 'free' } | null => {
    const t = threeRef.current;
    if (!t) return null;
    t.raycaster.setFromCamera(ndc, latest.current.basis.camera);
    const hits = t.raycaster.intersectObjects(t.gizmoGroup.children, true);
    for (const hit of hits) {
      const axis = hit.object.userData?.gizmoAxis as Axis | 'free' | undefined;
      if (!axis) continue;
      let parent: THREE.Object3D | null = hit.object;
      while (parent && !parent.userData?.solidId) parent = parent.parent;
      if (parent?.userData?.solidId) return { solidId: parent.userData.solidId as string, axis };
    }
    return null;
  }, []);

  const pickSolid = useCallback(
    (ndc: THREE.Vector2): { solidId: string; faceIndex: number | null; point: THREE.Vector3 } | null => {
      const t = threeRef.current;
      if (!t) return null;
      t.raycaster.setFromCamera(ndc, latest.current.basis.camera);
      const meshes: THREE.Object3D[] = [];
      t.builtSolids.forEach((b) => meshes.push(b.faceMesh));
      const hits = t.raycaster.intersectObjects(meshes, false);
      if (hits.length === 0) return null;
      const hit = hits[0];
      const solidId = hit.object.userData?.solidId as string;
      const built = t.builtSolids.get(solidId);
      const faceIndex =
        built && typeof hit.faceIndex === 'number' && built.triToFace[hit.faceIndex] !== undefined
          ? built.triToFace[hit.faceIndex]
          : null;
      return { solidId, faceIndex, point: hit.point.clone() };
    },
    []
  );

  const intersectPlane = useCallback((ndc: THREE.Vector2, plane: THREE.Plane): THREE.Vector3 | null => {
    const t = threeRef.current;
    if (!t) return null;
    t.raycaster.setFromCamera(ndc, latest.current.basis.camera);
    const out = new THREE.Vector3();
    return t.raycaster.ray.intersectPlane(plane, out) ? out : null;
  }, []);

  const groundPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);

  const selectIds = useCallback((ids: string[]) => {
    const l = latest.current;
    if (l.onSelectSolids) l.onSelectSolids(ids);
    else l.onSelectSolid(ids[0] || null);
  }, []);

  /* -------------------------- Fare: basma ------------------------------ */
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 && e.button !== 1 && e.button !== 2) return;
    const rect = containerRef.current?.getBoundingClientRect();
    const screen = { x: e.clientX - (rect?.left || 0), y: e.clientY - (rect?.top || 0) };
    const ndc = getPointerNdc(e.clientX, e.clientY);
    const tool = activeTool;

    // Orta tuş / sağ tuş / Alt: her araçta kamera kaydırma
    if (e.button === 1 || e.button === 2 || e.altKey) {
      setInteractionBoth({ type: 'pan', lastX: e.clientX, lastY: e.clientY });
      return;
    }

    // 1. Gizmo (eksen okları / merkez tutamacı)
    if (tool === 'select_move') {
      const g = pickGizmo(ndc);
      if (g) {
        const ids = effectiveSelectedIds.includes(g.solidId) ? effectiveSelectedIds : [g.solidId];
        const startPositions: Record<string, Point3D> = {};
        solids.forEach((s) => {
          if (ids.includes(s.id)) startPositions[s.id] = { ...s.position };
        });
        const anchor = solids.find((s) => s.id === g.solidId);
        const plane = anchor ? new THREE.Plane(new THREE.Vector3(0, 0, 1), -anchor.position.z) : null;
        const startHit = plane ? intersectPlane(ndc, plane) : null;
        setInteractionBoth({
          type: 'move',
          axis: g.axis,
          anchorId: g.solidId,
          solidIds: ids,
          startPositions,
          startClient: { x: e.clientX, y: e.clientY },
          startHit,
          plane,
          // Gizmonun merkez tutamacında Shift seçimi değiştirmez; dikey taşıma anlamındadır
          vertical: e.shiftKey,
          moved: false,
          applied: { x: 0, y: 0, z: 0 },
        });
        return;
      }
    }

    // 2. Cisim
    const hit = pickSolid(ndc);
    if (hit) {
      if (tool === 'delete') {
        if (onDeleteSolid) onDeleteSolid(hit.solidId);
        return;
      }
      if (tool === 'inspect') {
        selectIds([hit.solidId]);
        if (onUpdateSolid) {
          // Önceki yüz seçimlerini temizle
          solids.forEach((s) => {
            if (s.id !== hit.solidId && s.selectedFaceIndex !== null) onUpdateSolid(s.id, { selectedFaceIndex: null });
          });
          onUpdateSolid(hit.solidId, { selectedFaceIndex: hit.faceIndex });
        }
        return;
      }
      if (tool === 'orbit' || tool === 'pan') {
        setInteractionBoth({ type: tool, lastX: e.clientX, lastY: e.clientY });
        return;
      }
      if (tool === 'select_move') {
        const already = effectiveSelectedIds.includes(hit.solidId);
        let ids: string[];
        if (e.shiftKey || e.ctrlKey) {
          ids = already ? effectiveSelectedIds.filter((id) => id !== hit.solidId) : [...effectiveSelectedIds, hit.solidId];
        } else {
          ids = already ? effectiveSelectedIds : [hit.solidId];
        }
        selectIds(ids);
        if (!ids.includes(hit.solidId)) return;

        const startPositions: Record<string, Point3D> = {};
        solids.forEach((s) => {
          if (ids.includes(s.id)) startPositions[s.id] = { ...s.position };
        });
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -hit.point.z);
        setInteractionBoth({
          type: 'move',
          axis: 'free',
          anchorId: hit.solidId,
          solidIds: ids,
          startPositions,
          startClient: { x: e.clientX, y: e.clientY },
          startHit: hit.point.clone(),
          plane,
          // Burada Shift "seçime ekle/çıkar" anlamındadır; dikey taşıma için
          // gizmonun mavi Z oku (veya merkez tutamacı + Shift) kullanılır.
          vertical: false,
          moved: false,
          applied: { x: 0, y: 0, z: 0 },
        });
        return;
      }
      // Oluşturma modunda cisme tıklamak da oluşturma başlatır (aşağıda)
    }

    // 3. Boşluk
    if (CREATE_TYPE_MAP[tool]) {
      const ground = intersectPlane(ndc, groundPlane);
      setInteractionBoth({
        type: 'create',
        startScreen: screen,
        currentScreen: screen,
        groundPos: ground ? { x: ground.x, y: ground.y, z: 0 } : null,
      });
      return;
    }

    if (tool === 'select_move' || tool === 'inspect') {
      if (!e.shiftKey && !e.ctrlKey) selectIds([]);
      if (tool === 'select_move') {
        setInteractionBoth({ type: 'marquee', start: screen, current: screen });
      } else {
        setInteractionBoth({ type: 'orbit', lastX: e.clientX, lastY: e.clientY });
      }
      return;
    }

    setInteractionBoth({ type: tool === 'pan' ? 'pan' : 'orbit', lastX: e.clientX, lastY: e.clientY });
  };

  /* ----------------- Fare: hareket / bırakma (window) ------------------ */
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const it = interactionRef.current;
      if (!it) return;
      const l = latest.current;
      const rect = containerRef.current?.getBoundingClientRect();
      const screen = { x: e.clientX - (rect?.left || 0), y: e.clientY - (rect?.top || 0) };
      const ndc = getPointerNdc(e.clientX, e.clientY);

      if (it.type === 'orbit' || it.type === 'pan') {
        const dx = e.clientX - it.lastX;
        const dy = e.clientY - it.lastY;
        interactionRef.current = { ...it, lastX: e.clientX, lastY: e.clientY };
        if (it.type === 'pan' || e.buttons === 2 || e.buttons === 4) {
          l.setCamera((prev) => ({ ...prev, panX: prev.panX + dx, panY: prev.panY + dy }));
        } else {
          // Aşağı sürüklemek kamerayı yükseltir (cismin üstünü görürsünüz);
          // pozitif rotX kamerayı zeminin üstüne aldığı için işaret artıdır.
          l.setCamera((prev) => ({
            ...prev,
            rotY: (prev.rotY - dx * ORBIT_SPEED) % 360,
            rotX: Math.max(-CAMERA_PITCH_LIMIT, Math.min(CAMERA_PITCH_LIMIT, prev.rotX + dy * ORBIT_SPEED)),
          }));
        }
        return;
      }

      if (it.type === 'marquee') {
        const next = { ...it, current: screen };
        interactionRef.current = next;
        setInteraction(next);
        const minX = Math.min(it.start.x, screen.x);
        const maxX = Math.max(it.start.x, screen.x);
        const minY = Math.min(it.start.y, screen.y);
        const maxY = Math.max(it.start.y, screen.y);
        if (Math.hypot(maxX - minX, maxY - minY) > 8) {
          const { width, height } = l.dimensions;
          const ids = l.solids
            .filter((s) => {
              const p = projectToScreen(getSolidCenter(s), l.basis.camera, width, height);
              return !p.behind && p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;
            })
            .map((s) => s.id);
          if (l.onSelectSolids) l.onSelectSolids(ids);
          else l.onSelectSolid(ids[0] || null);
        }
        return;
      }

      if (it.type === 'create') {
        const next = { ...it, currentScreen: screen };
        interactionRef.current = next;
        setInteraction(next);
        return;
      }

      if (it.type === 'move') {
        let delta: Point3D = { x: 0, y: 0, z: 0 };
        const { width, height } = l.dimensions;

        if (it.axis !== 'free') {
          // Eksen oku: fare hareketini okun ekran izdüşümüne yansıt.
          // İzdüşüm, okun ÇİZİLDİĞİ yerden (tutamacın sahibi cismin merkezi)
          // alınmalıdır; tabandan alınırsa perspektifte ölçek kayar.
          const anchor =
            l.solids.find((s) => s.id === it.anchorId) || l.solids.find((s) => s.id === it.solidIds[0]);
          if (!anchor) return;
          const startPos = it.startPositions[anchor.id];
          if (!startPos) return;
          const extent = getSolidExtent(anchor);
          const len = Math.min(6, Math.max(1.6, extent * 0.65 + 0.6));
          const originPt = getSolidCenter({ ...anchor, position: startPos });
          const c = projectToScreen(originPt, l.basis.camera, width, height);
          const tip3D = new THREE.Vector3(
            originPt.x + (it.axis === 'x' ? len : 0),
            originPt.y + (it.axis === 'y' ? len : 0),
            originPt.z + (it.axis === 'z' ? len : 0)
          );
          const tp = projectToScreen(tip3D, l.basis.camera, width, height);
          if (c.behind || tp.behind) return;
          const vx = tp.x - c.x;
          const vy = tp.y - c.y;
          const lenSq = vx * vx + vy * vy;
          // Eksen (neredeyse) kameraya doğru bakıyorsa izdüşüm dejenere olur ve
          // en ufak fare hareketi uçuk ötelemeye dönüşür; bu karede taşıma yapma.
          if (lenSq < 64) return;
          const dx = e.clientX - it.startClient.x;
          const dy = e.clientY - it.startClient.y;
          const tParam = (dx * vx + dy * vy) / lenSq;
          const d = tParam * len;
          delta = { x: it.axis === 'x' ? d : 0, y: it.axis === 'y' ? d : 0, z: it.axis === 'z' ? d : 0 };
        } else if (it.vertical) {
          // Dikey taşıma: kameraya bakan düşey düzlemde kesişim
          if (it.startHit) {
            const n = l.basis.forward.clone();
            n.z = 0;
            if (n.lengthSq() < 1e-6) n.set(0, 1, 0);
            n.normalize();
            const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n, it.startHit);
            const hit = intersectPlane(ndc, plane);
            if (hit) delta = { x: 0, y: 0, z: hit.z - it.startHit.z };
          }
        } else if (it.plane && it.startHit) {
          const hit = intersectPlane(ndc, it.plane);
          if (hit) delta = { x: hit.x - it.startHit.x, y: hit.y - it.startHit.y, z: 0 };
        }

        if (!it.moved && Math.hypot(e.clientX - it.startClient.x, e.clientY - it.startClient.y) < 3) return;

        const target: Point3D = {
          x: Number(delta.x.toFixed(2)),
          y: Number(delta.y.toFixed(2)),
          z: Number(delta.z.toFixed(2)),
        };
        interactionRef.current = { ...it, moved: true, applied: target };

        // Birden çok cisim seçiliyse TEK bir toplu güncelleme gönderilir: aksi hâlde
        // her karede cisim başına ayrı `move:<id>` anahtarıyla dispatch edilir,
        // anahtarlar dönüşümlü değiştiği için geçmiş birleştirmesi çalışmaz ve
        // saniyeler içinde tüm geri alma geçmişi taşar.
        if (it.solidIds.length > 1 && l.onUpdateSolidsPosition) {
          const step: Point3D = {
            x: target.x - it.applied.x,
            y: target.y - it.applied.y,
            z: target.z - it.applied.z,
          };
          if (step.x !== 0 || step.y !== 0 || step.z !== 0) l.onUpdateSolidsPosition(it.solidIds, step);
          return;
        }

        it.solidIds.forEach((id) => {
          const orig = it.startPositions[id];
          if (!orig) return;
          l.onUpdateSolidPosition(id, {
            x: Number((orig.x + target.x).toFixed(2)),
            y: Number((orig.y + target.y).toFixed(2)),
            z: Number((orig.z + target.z).toFixed(2)),
          });
        });
      }
    };

    const onUp = () => {
      const it = interactionRef.current;
      if (!it) return;
      const l = latest.current;

      if (it.type === 'create' && l.onAddSolid) {
        const distPx = Math.hypot(it.currentScreen.x - it.startScreen.x, it.currentScreen.y - it.startScreen.y);
        const size = Number(Math.max(2, Math.min(8, distPx / 20)).toFixed(1));
        const solidType = CREATE_TYPE_MAP[l.activeTool] || 'cube';
        l.onAddSolid(
          solidType,
          { width: size, height: size, depth: size, radius: size / 2 },
          it.groundPos ? { x: Number(it.groundPos.x.toFixed(1)), y: Number(it.groundPos.y.toFixed(1)), z: 0 } : undefined
        );
        if (l.setActive3DTool) l.setActive3DTool('select_move');
      }

      if (it.type === 'move' && it.moved && l.onDragEnd) l.onDragEnd();

      interactionRef.current = null;
      setInteraction(null);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [getPointerNdc, intersectPlane]);

  /* ------------------------------ Tekerlek ----------------------------- */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      latest.current.setCamera((prev) => ({ ...prev, zoom: clampZoom(prev.zoom * factor) }));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  /* ------------------------------ Klavye ------------------------------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Bir dialog/modal açıkken (ör. "Nesne Ekle") tuval kısayolları çalışmamalı:
      // aksi hâlde modaldaki bir düğme odaklıyken Delete/Backspace arkadaki seçili
      // cismi siler, Ctrl+Z ise 3D geçmişini geri alır.
      if (isAnyModalOpen()) return;
      const target = e.target as HTMLElement | null;
      if (target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)) return;
      const l = latest.current;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          if (l.onRedo) {
            e.preventDefault();
            l.onRedo();
          }
        } else if (l.onUndo) {
          e.preventDefault();
          l.onUndo();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        if (l.onRedo) {
          e.preventDefault();
          l.onRedo();
        }
        return;
      }
      if (e.key === 'Escape') {
        const active = interactionRef.current;
        if (active) {
          interactionRef.current = null;
          setInteraction(null);
          const wasMove = active.type === 'move' && active.moved;
          if (wasMove && l.onDragCancel) {
            // Üst bileşen sürükleme öncesi anlık görüntüyü birebir geri yükler:
            // konumlar tam olarak eski değerine döner ve geçmişte boş bir adım kalmaz.
            l.onDragCancel();
          } else {
            // Geri dönüş yolu: konumları yerel olarak eski haline getir
            revertMove(active);
            if (wasMove && l.onDragEnd) l.onDragEnd();
          }
        } else if (CREATE_TYPE_MAP[l.activeTool] && l.setActive3DTool) {
          l.setActive3DTool('select_move');
        } else if (l.onSelectSolids) {
          l.onSelectSolids([]);
        }
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && l.effectiveSelectedIds.length > 0) {
        e.preventDefault();
        if (l.onDeleteSolids) l.onDeleteSolids();
        else if (l.onDeleteSolid && l.effectiveSelectedIds[0]) l.onDeleteSolid(l.effectiveSelectedIds[0]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [revertMove]);

  /* ------------------------- Ekran üstü bindirmeler -------------------- */
  const overlays = useMemo(() => {
    const { width, height } = dimensions;
    const cam = basis.camera;
    const gizmoLabels: { id: string; axis: Axis; x: number; y: number }[] = [];
    const coordBadges: { id: string; x: number; y: number; text: string }[] = [];

    if (activeTool === 'select_move') {
      solids.forEach((solid) => {
        if (!effectiveSelectedIds.includes(solid.id)) return;
        const center = getSolidCenter(solid);
        const extent = getSolidExtent(solid);
        const len = Math.min(6, Math.max(1.6, extent * 0.65 + 0.6));
        (['x', 'y', 'z'] as Axis[]).forEach((axis) => {
          const tip = center.clone();
          tip[axis] += len * 1.12;
          const p = projectToScreen(tip, cam, width, height);
          if (!p.behind) gizmoLabels.push({ id: solid.id, axis, x: p.x, y: p.y });
        });
        const top = center.clone();
        const c = projectToScreen(top, cam, width, height);
        if (!c.behind) {
          coordBadges.push({
            id: solid.id,
            x: c.x,
            y: c.y - 34,
            text: `X: ${formatTurkishNumber(solid.position.x)}  Y: ${formatTurkishNumber(solid.position.y)}  Z: ${formatTurkishNumber(solid.position.z)}`,
          });
        }
      });
    }

    let faceBadge: { x: number; y: number; label: string; area: string } | null = null;
    const inspected = solids.find((s) => s.selectedFaceIndex !== null && s.selectedFaceIndex !== undefined);
    if (inspected && inspected.selectedFaceIndex !== null) {
      const mesh = generateSolidMesh(inspected);
      const face = mesh.faces[inspected.selectedFaceIndex];
      if (face) {
        const centroid = new THREE.Vector3();
        face.vertexIndices.forEach((i) => {
          const v = mesh.vertices[i];
          if (v) centroid.add(new THREE.Vector3(v.x, v.y, v.z));
        });
        centroid.divideScalar(Math.max(1, face.vertexIndices.length));
        const p = projectToScreen(centroid, cam, width, height);
        if (!p.behind) {
          faceBadge = {
            x: p.x,
            y: p.y,
            label: face.label || 'Yüz',
            area: `${formatTurkishNumber(computeFaceArea(mesh.vertices, face.vertexIndices))} br²`,
          };
        }
      }
    }

    return { gizmoLabels, coordBadges, faceBadge };
  }, [solids, effectiveSelectedIds, activeTool, basis, dimensions]);

  /**
   * Ekran üstü bindirmeler (ipucu şeritleri, kapsüller, araç çubukları) kök
   * kapsayıcının İÇİNDE olduğu için mousedown olayları tuvalin handleMouseDown'ına
   * sızar; bu da düğmeye basıldığı anda seçimin temizlenmesine, kutu-seçim
   * başlamasına veya oluşturma modunda istenmeyen bir cisim eklenmesine yol açar.
   * Etkileşimli her bindirme bu koruyucuyu kullanmalıdır.
   */
  const stopMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const isCreationMode = Boolean(CREATE_TYPE_MAP[activeTool]);
  const cursorClass =
    activeTool === 'pan'
      ? 'cursor-move'
      : activeTool === 'delete'
        ? 'cursor-not-allowed'
        : activeTool === 'inspect'
          ? 'cursor-crosshair'
          : isCreationMode
            ? 'cursor-crosshair'
            : 'cursor-grab active:cursor-grabbing';

  const unfoldTarget =
    solids.find((s) => s.id === selectedSolidId) || (solids.length === 1 ? solids[0] : null);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onContextMenu={(e) => e.preventDefault()}
      className={`flex-1 w-full h-full min-h-0 relative select-none overflow-hidden bg-background ${cursorClass}`}
    >
      {/* WebGL tuvali */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {webglError && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm font-bold text-muted-foreground">
          {webglError}
        </div>
      )}

      {/* 1. ÜST KONTROL ŞERİDİ & 2D / 3D GEÇİŞ BUTONLARI */}
      <div className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        {/* Salt bilgilendirici: tıklamayı yutmaz, üzerinden sürükleyerek sahne döndürülebilir */}
        <div className="flex items-center gap-2 pointer-events-none">
          <div className="px-3 py-1.5 rounded-2xl bg-card/90 backdrop-blur-md border border-border shadow-sm text-xs font-black text-foreground flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
            <span>3D Katı Cisim &amp; Uzay</span>
          </div>
          <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-card/90 backdrop-blur-md border border-border shadow-sm text-xs font-bold text-muted-foreground">
            <span>3D Koordinat Sistemi (x, y, z)</span>
          </div>
        </div>

        <div
          className="flex items-center p-1 rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-md pointer-events-auto mr-10 sm:mr-12"
          onMouseDown={stopMouseDown}
        >
          <button
            onClick={onSwitchTo2D}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
          >
            <span>📐</span>
            <span>2D</span>
          </button>
          <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm cursor-pointer">
            <span>🧊</span>
            <span>3D</span>
          </button>
        </div>
      </div>

      {/* Navigasyon Küpü (kendi sürükleme mantığı var; tuval etkileşimine karışmasın) */}
      <div onMouseDown={stopMouseDown} className="contents">
        <ViewCube3D camera={camera} setCamera={setCamera} />
      </div>

      {/* Gizmo eksen rozetleri ve koordinat etiketleri (HTML bindirme) */}
      {overlays.gizmoLabels.map((g) => (
        <div
          key={`gl-${g.id}-${g.axis}`}
          className="absolute z-10 w-5 h-5 -ml-2.5 -mt-2.5 rounded-full text-white text-[9px] font-black font-mono flex items-center justify-center border-2 border-white shadow-md pointer-events-none"
          style={{ left: g.x, top: g.y, backgroundColor: AXIS_COLORS[g.axis] }}
        >
          {g.axis.toUpperCase()}
        </div>
      ))}
      {overlays.coordBadges.map((b) => (
        <div
          key={`cb-${b.id}`}
          className="absolute z-10 -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 rounded-full bg-slate-900/90 text-white text-[10px] font-mono font-black border border-sky-400 shadow-md whitespace-nowrap pointer-events-none"
          style={{ left: b.x, top: b.y }}
        >
          {b.text}
        </div>
      ))}
      {overlays.faceBadge && (
        <div
          className="absolute z-10 -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 rounded-xl bg-sky-600/95 text-white text-[10px] font-black border border-white/60 shadow-md whitespace-nowrap pointer-events-none flex items-center gap-1.5"
          style={{ left: overlays.faceBadge.x, top: overlays.faceBadge.y }}
        >
          <ScanSearch className="w-3 h-3" />
          <span>{overlays.faceBadge.label}</span>
          <span className="font-mono opacity-90">• Alan = {overlays.faceBadge.area}</span>
        </div>
      )}

      {/* Kutuyla seçim */}
      {interaction?.type === 'marquee' && (
        <div
          className="absolute z-10 rounded border border-dashed border-blue-600 bg-blue-500/15 pointer-events-none"
          style={{
            left: Math.min(interaction.start.x, interaction.current.x),
            top: Math.min(interaction.start.y, interaction.current.y),
            width: Math.abs(interaction.start.x - interaction.current.x),
            height: Math.abs(interaction.start.y - interaction.current.y),
          }}
        >
          {effectiveSelectedIds.length > 0 && (
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-slate-800 text-white text-[10px] font-bold whitespace-nowrap">
              ✨ {effectiveSelectedIds.length} cisim seçildi
            </span>
          )}
        </div>
      )}

      {/* Sürükleyerek oluşturma önizlemesi */}
      {interaction?.type === 'create' && (() => {
        const distPx = Math.hypot(
          interaction.currentScreen.x - interaction.startScreen.x,
          interaction.currentScreen.y - interaction.startScreen.y
        );
        const size = Math.max(2, Math.min(8, distPx / 20));
        return (
          <div
            className="absolute z-10 rounded-full border-2 border-dashed border-indigo-500 bg-indigo-500/10 pointer-events-none flex items-center justify-center"
            style={{
              left: interaction.startScreen.x - distPx,
              top: interaction.startScreen.y - distPx,
              width: distPx * 2,
              height: distPx * 2,
            }}
          >
            <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-black whitespace-nowrap">
              ≈ {formatTurkishNumber(size, 1)} br
            </span>
          </div>
        );
      })()}

      {/* Açınım kontrol çubuğu */}
      {unfoldTarget && unfoldTarget.type !== 'sphere' && (() => {
        const progress = unfoldTarget.unfoldProgress || 0;
        const setProgress = (v: number) => {
          if (onUpdateSolid) onUpdateSolid(unfoldTarget.id, { unfoldProgress: v });
        };
        return (
          <div
            className="absolute top-16 left-1/2 -translate-x-1/2 bg-slate-900/95 dark:bg-card/95 backdrop-blur-md text-white border border-amber-500/40 shadow-2xl px-5 py-3 rounded-2xl flex flex-col md:flex-row items-center gap-4 z-30 select-none animate-in slide-in-from-top-3 duration-200"
            onMouseDown={stopMouseDown}
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-bold text-amber-200">📖 {unfoldTarget.name || 'Cismin'} Açınımı:</span>
              <span className="font-mono font-black text-amber-300 text-xs px-2 py-0.5 rounded-md bg-amber-500/20">
                %{Math.round(progress * 100)}
              </span>
            </div>
            <div className="flex items-center gap-3 w-48 sm:w-64">
              <button
                onClick={() => setProgress(Math.max(0, Number((progress - 0.1).toFixed(2))))}
                className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs font-black cursor-pointer transition-colors"
                title="%10 Kapat"
              >
                -
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={progress}
                onChange={(e) => setProgress(parseFloat(e.target.value))}
                onMouseDown={(e) => e.stopPropagation()}
                className="flex-1 h-2 bg-amber-950/80 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <button
                onClick={() => setProgress(Math.min(1, Number((progress + 0.1).toFixed(2))))}
                className="w-6 h-6 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 flex items-center justify-center text-xs font-black cursor-pointer transition-colors"
                title="%10 Aç"
              >
                +
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setProgress(0)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  progress === 0 ? 'bg-amber-500 text-slate-900 shadow-sm' : 'bg-white/10 hover:bg-white/20 text-white/90'
                }`}
              >
                🔒 Kapalı (%0)
              </button>
              <button
                onClick={() => setProgress(1)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  progress >= 0.99 ? 'bg-amber-500 text-slate-900 shadow-sm' : 'bg-white/10 hover:bg-white/20 text-white/90'
                }`}
              >
                📖 Tam Açık (%100)
              </button>
            </div>
          </div>
        );
      })()}

      {/* Çoklu seçim kapsülü */}
      {effectiveSelectedIds.length > 0 && activeTool === 'select_move' && (
        <div
          className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-slate-900/95 dark:bg-card/95 backdrop-blur-md text-white border border-border shadow-2xl px-4 py-2.5 rounded-2xl flex items-center gap-3 z-30 select-none animate-in slide-in-from-bottom-3 duration-200"
          onMouseDown={stopMouseDown}
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-black">
              ✨ {effectiveSelectedIds.length} cisim seçildi (Sürükleyerek taşıyın • Mavi Z oku ile yükseltin)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (onDeleteSolids) onDeleteSolids();
                else if (onDeleteSolid && selectedSolidId) onDeleteSolid(selectedSolidId);
              }}
              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Seçilenleri Sil</span>
            </button>
            <button
              onClick={() => selectIds([])}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 font-bold text-xs cursor-pointer transition-all active:scale-95"
            >
              ✕ Seçimi Kaldır
            </button>
          </div>
        </div>
      )}

      {/* İnceleme modu ipucu */}
      {activeTool === 'inspect' && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-sky-700/95 text-white shadow-xl px-4 py-2 rounded-2xl flex items-center gap-2 text-xs font-bold z-30 select-none pointer-events-none animate-in slide-in-from-bottom-3">
          <ScanSearch className="w-4 h-4" />
          <span>Yüz seçmek için cismin bir yüzüne tıklayın; alanı ve adı gösterilir. Boşlukta sürükleyerek döndürün.</span>
        </div>
      )}

      {/* Sağ dikey hızlı araç çubuğu */}
      <div
        className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-1.5 p-1.5 rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-xl"
        onMouseDown={stopMouseDown}
      >
        <button
          onClick={() => setCamera((prev) => ({ ...prev, rotX: 25, rotY: -40, panX: 0, panY: 30, zoom: 55 }))}
          className="p-2.5 rounded-xl hover:bg-muted text-foreground transition-all cursor-pointer"
          title="İzometrik Görünüm (Sıfırla)"
        >
          <Focus className="w-4 h-4" />
        </button>
        <button
          onClick={() => setCamera((prev) => ({ ...prev, zoom: clampZoom(prev.zoom * 1.2) }))}
          className="p-2.5 rounded-xl hover:bg-muted text-foreground transition-all cursor-pointer"
          title="Yakınlaştır (+)"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={() => setCamera((prev) => ({ ...prev, zoom: clampZoom(prev.zoom / 1.2) }))}
          className="p-2.5 rounded-xl hover:bg-muted text-foreground transition-all cursor-pointer"
          title="Uzaklaştır (-)"
        >
          <Minus className="w-4 h-4" />
        </button>
        <div className="w-6 h-px bg-border my-0.5" />
        <button
          onClick={() => setCamera((prev) => ({ ...prev, showGrid: !prev.showGrid }))}
          className={`p-2.5 rounded-xl transition-all cursor-pointer ${
            camera.showGrid ? 'bg-primary/15 text-primary' : 'hover:bg-muted text-muted-foreground'
          }`}
          title="Zemin Izgarasını Aç/Kapat"
        >
          <Grid className="w-4 h-4" />
        </button>
        <button
          onClick={() => setCamera((prev) => ({ ...prev, showAxes: !prev.showAxes }))}
          className={`p-2.5 rounded-xl transition-all cursor-pointer ${
            camera.showAxes ? 'bg-primary/15 text-primary' : 'hover:bg-muted text-muted-foreground'
          }`}
          title="3D Eksenleri (x, y, z) Aç/Kapat"
        >
          <Box className="w-4 h-4" />
        </button>
        <div className="w-6 h-px bg-border my-0.5" />
        <button
          onClick={onClearAll}
          className="p-2.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:text-rose-700 transition-all cursor-pointer group"
          title="Tüm 3D Cisimleri Sil (Sahneyi Temizle)"
        >
          <Trash2 className="w-4 h-4 transition-transform group-hover:scale-110" />
        </button>
      </div>

      {/* Oluşturma modu ipucu */}
      {isCreationMode && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-2xl bg-indigo-600/95 text-white shadow-xl flex items-center gap-2.5 text-xs font-black animate-in slide-in-from-top-3"
          onMouseDown={stopMouseDown}
        >
          <Sparkles className="w-4 h-4 text-yellow-300" />
          <span>Zemine basıp sürükleyerek cismi istediğiniz boyutta ve konumda oluşturun!</span>
          {setActive3DTool && (
            <button
              onClick={() => setActive3DTool('select_move')}
              className="ml-2 px-2 py-0.5 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold text-[11px] cursor-pointer"
            >
              ✕ İptal
            </button>
          )}
        </div>
      )}

      {/* Sol alt ipucu */}
      <div className="absolute bottom-4 left-4 z-20 px-3 py-1.5 rounded-2xl bg-card/85 backdrop-blur-md border border-border/80 text-[11px] text-muted-foreground font-semibold shadow-sm pointer-events-none select-none flex items-center gap-2">
        <RotateCw className="w-3.5 h-3.5 text-primary" />
        <span>Sürükleyerek 360° döndürün • Sağ tuş / Alt ile kaydırın • Tekerlek ile yakınlaştırın</span>
      </div>
    </div>
  );
}
