// Matematik Motoru Doğrulama ve Test Scripti

import {
  calculateDistance,
  calculateMidpoint,
  calculateAngleDegrees,
  calculatePolygonArea,
  calculatePolygonPerimeter,
  calculateCircleArea,
  calculateCircleCircumference,
  calculateLineEquation,
  distanceToSegment,
} from '../geometry';
import { worldToScreen, screenToWorld, snapToGridPoint } from '../coordinates';
import { compileMathExpression } from '../parser';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`TEST BAŞARISIZ: ${msg}`);
  }
  console.log(`✓ ${msg}`);
}

console.log('--- 1. GEOMETRİ HESAPLAMA TESTLERİ ---');

// Mesafe
const dist = calculateDistance({ x: 0, y: 0 }, { x: 3, y: 4 });
assert(Math.abs(dist - 5) < 1e-6, 'Öklid mesafesi (3-4-5 üçgeni) 5 birim olmalı');

// Orta Nokta
const mid = calculateMidpoint({ x: 2, y: 4 }, { x: 6, y: 8 });
assert(mid.x === 4 && mid.y === 6, 'Orta nokta (4, 6) olmalı');

// Açı
const angle = calculateAngleDegrees({ x: 0, y: 3 }, { x: 0, y: 0 }, { x: 4, y: 0 });
assert(Math.abs(angle - 90) < 1e-6, 'Dik açı 90 derece olmalı');

// Çokgen Alanı (3-4-5 Dik Üçgeni)
const triangleArea = calculatePolygonArea([
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 0, y: 3 },
]);
assert(Math.abs(triangleArea - 6) < 1e-6, 'Dik üçgen alanı (4*3/2 = 6) olmalı');

// Çevre
const trianglePerimeter = calculatePolygonPerimeter([
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 0, y: 3 },
]);
assert(Math.abs(trianglePerimeter - 12) < 1e-6, 'Üçgen çevresi (3+4+5 = 12) olmalı');

// Çember
const circArea = calculateCircleArea(3);
assert(Math.abs(circArea - Math.PI * 9) < 1e-6, 'Yarıçapı 3 olan çember alanı 9pi olmalı');

// Doğru Denklemi
const lineEq = calculateLineEquation({ x: 0, y: 1 }, { x: 1, y: 3 });
assert(lineEq.slope === 2, 'Eğim 2 olmalı (y = 2x + 1)');

console.log('\n--- 2. KOORDİNAT DÖNÜŞÜM TESTLERİ ---');

const transform = {
  zoom: 40,
  panX: 0,
  panY: 0,
  width: 800,
  height: 600,
  showGrid: true,
  showAxes: true,
  showCoordinates: true,
  snapToGrid: true,
  gridStep: 1,
};

const screenPt = worldToScreen({ x: 2, y: 3 }, transform);
const worldPt = screenToWorld(screenPt, transform);
assert(Math.abs(worldPt.x - 2) < 1e-6 && Math.abs(worldPt.y - 3) < 1e-6, 'Dünya <-> Ekran çift yönlü dönüşüm tutarlı olmalı');

console.log('\n--- 3. GÜVENLİ MATEMATİK PARSER TESTLERİ ---');

const fn1 = compileMathExpression('2*x + 1');
assert(fn1 !== null && fn1(3) === 7, 'f(3) = 2*3 + 1 = 7 olmalı');

const fn2 = compileMathExpression('x^2 - 4');
assert(fn2 !== null && fn2(3) === 5, 'f(3) = 3^2 - 4 = 5 olmalı');

const fn3 = compileMathExpression('a*x^2 + b');
assert(fn3 !== null && fn3(2, { a: 3, b: 5 }) === 17, 'f(2, {a:3, b:5}) = 3*(4) + 5 = 17 olmalı');

const fn4 = compileMathExpression('sin(x)');
assert(fn4 !== null && Math.abs(fn4(0)) < 1e-6, 'sin(0) = 0 olmalı');

console.log('\nTÜM MATEMATİK TESTLERİ BAŞARIYLA GEÇTİ! ✓');
