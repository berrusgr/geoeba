import { describe, expect, it } from 'vitest';
import type { EllipseObject, MathObject, PointObject } from '@/types/math';
import { reflectAcross, rotateAround } from '@/math/commandBindings';
import { rankHandlers, runCommand } from '../engine';
import { CommandScene } from '../scene';
import { parseClause, splitClauses } from '../text';
import { normalizeSpokenCommand } from '../speechText';
import type { CommandSuccess } from '../types';
import { build } from './helpers';

/**
 * Dönüşümler ailesi (yansıma, döndürme, öteleme, homotete): öğretmenin yazdığı ya da söylediği gerçekçi cümleler
 * TÜM komut aileleriyle (varsayılan HANDLERS) sınanır. transforms.test.ts aileyi yalıtılmış sınar; burada aileler arası
 * çakışmalar, birleşik cümleler ve konuşma metinleri (normalizeSpokenCommand) de yakalanır.
 */

type Scene = () => MathObject[];
/** A(1,1), B(4,1), C(2,3) üçgeni */
const tri: Scene = () => build(s => {
  const A = s.addPoint({ x: 1, y: 1 }, { label: 'A' }), B = s.addPoint({ x: 4, y: 1 }, { label: 'B' }), C = s.addPoint({ x: 2, y: 3 }, { label: 'C' });
  s.addPolygon([A.id, B.id, C.id], { kind: 'triangle' });
});
/** ABC ve D(6,6), E(7,6), F(6,8) üçgenleri: adı yazılmayan hedef belirsizdir. */
const tri2: Scene = () => build(s => {
  const D = s.addPoint({ x: 6, y: 6 }, { label: 'D' }), E = s.addPoint({ x: 7, y: 6 }, { label: 'E' }), F = s.addPoint({ x: 6, y: 8 }, { label: 'F' });
  s.addPolygon([D.id, E.id, F.id], { kind: 'triangle' });
}, tri());
const triO: Scene = () => build(s => { s.addPoint({ x: 0, y: 0 }, { label: 'O' }); }, tri());
const triSeg: Scene = () => build(s => { s.addSegment(s.findPoint('A')!.id, s.findPoint('B')!.id); }, tri());
const triCircle: Scene = () => build(s => { const G = s.addPoint({ x: 8, y: 8 }, { label: 'G' }); s.addCircle({ centerId: G.id, radius: 2 }); }, tri());
const circle: Scene = () => build(s => { const G = s.addPoint({ x: 8, y: 8 }, { label: 'G' }); s.addCircle({ centerId: G.id, radius: 2 }); });
const ellipse: Scene = () => build(s => { const H = s.addPoint({ x: -6, y: 6 }, { label: 'H' }); s.addEllipse(H.id, 3, 1.5, { rotation: 30 }); });
const square: Scene = () => build(s => {
  const ids = [[1, 1], [4, 1], [4, 4], [1, 4]].map(([x, y], i) => s.addPoint({ x, y }, { label: 'ABCD'[i] }).id);
  s.addPolygon(ids, { kind: 'square' });
});
const after = (base: Scene, text: string): Scene => () => run(text, base()).objects;

function run(text: string, scene: MathObject[] = [], selection: string[] = []): CommandSuccess {
  const before = JSON.stringify(scene);
  const result = runCommand(text, scene, selection);
  if (!result.ok) throw new Error(`“${text}” başarısız: ${result.message}`);
  expect(new Set(result.objects.map(o => o.id)).size).toBe(result.objects.length);
  expect(JSON.stringify(scene)).toBe(before);
  expect(result.message).not.toMatch(/undefined|NaN/);
  return result;
}
function failWith(text: string, scene: MathObject[] = []): string {
  const result = runCommand(text, scene);
  if (result.ok) throw new Error(`“${text}” başarısız olmalıydı: ${result.message}`);
  expect(result.unrecognized).toBeFalsy();
  expect(result.message).not.toMatch(/Komut uygulanamadı/);
  return result.message;
}
const P = (objects: MathObject[], label: string) => {
  const p = objects.find((o): o is PointObject => o.type === 'point' && o.label === label);
  if (!p) throw new Error(`${label} noktası yok (var olanlar: ${objects.filter(o => o.type === 'point').map(o => o.label).join(' ')})`);
  return p;
};
const at = (objects: MathObject[], label: string, x: number, y: number) => {
  const p = P(objects, label);
  expect(p.x).toBeCloseTo(x, 6);
  expect(p.y).toBeCloseTo(y, 6);
};
const topHandler = (text: string, scene: MathObject[]) => {
  const state = new CommandScene(scene);
  return rankHandlers(parseClause(splitClauses(text)[0], state.known()), state)[0]?.handler.id;
};
const polySel = (objects: MathObject[]) => objects.filter(o => o.type === 'polygon').slice(0, 1).map(o => o.id);

type Row = [text: string, scene: Scene, label: string, x: number, y: number];
const rotB45 = rotateAround({ x: 4, y: 1 }, { x: 1, y: 1 }, 45);

describe('yansıma cümleleri (tüm aileler)', () => {
  it.each<Row>([
    ['ABC üçgenini x eksenine göre yansıt', tri2, "B'", 4, -1],
    ['abc üçgenini x eksenine göre yansıt', tri2, "B'", 4, -1],
    ['ABCnin x eksenine göre simetriğini çiz', tri2, "B'", 4, -1],
    ['abcnin y eksenine göre simetriğini al', tri2, "B'", -4, 1],
    ['ABC yi y eksenine göre yansıt', tri2, "B'", -4, 1],
    ['ABC üçgenini y eksenine göre yansıtır mısın', tri2, "B'", -4, 1],
    ['ABC üçgenini x eksenine göre yansıtalım', tri2, "B'", 4, -1],
    ['ABC üçgeninin x eksenine göre yansımasını çizmek istiyorum', tri2, "B'", 4, -1],
    ['bana ABC nin x eksenine göre simetriği lazım', tri2, "B'", 4, -1],
    ['şekli yatay eksene göre yansıt', tri, "B'", 4, -1],
    ['ABC yi dikey eksene göre aynala', tri2, "B'", -4, 1],
    ['a noktasının orijine göre simetriği nedir', tri2, "A'", -1, -1],
    ['A nın orijine göre simetriği', tri2, "A'", -1, -1],
    ['ABC yi A noktasına göre yansıt', tri2, "B'", -2, 1],
    ['ABC üçgenini AB kenarına göre yansıt', tri2, "C'", 2, -1],
    ['ABC yi AB ye göre yansıt', tri2, "C'", 2, -1],
    ['ABC yi y eşittir x doğrusuna göre yansıt', tri2, "B'", 1, 4],
    ['ABC yi x eşittir 3 doğrusuna göre yansıt', tri2, "B'", 2, 1],
    ["ABC'yi y = 2 doğrusuna göre yansıt", tri2, "B'", 4, 3],
    ['ABC yi y eşittir eksi x doğrusuna göre yansıt', tri2, "B'", -1, -4],
    ["ABC'nin birinci açıortaya göre simetriği", tri2, "B'", 1, 4],
    ["A'yı B'ye göre yansıt", tri2, "A'", 7, 1],
    ['ABC üçgeninin Ox eksenine göre simetriği', tri2, "B'", 4, -1],
    ['ABC nin O noktasına göre simetriğini çiz', triO, "B'", -4, -1],
    ['ABC üçgeninin x ekseninde yansımasını oluştur', tri2, "B'", 4, -1],
    ['ABC yi x eksenine gore yansit', tri2, "B'", 4, -1],
    ['ABC nin simetriğini x eksenine göre al', tri2, "B'", 4, -1],
    ['x eksenine göre ABC nin simetriğini çizelim', tri2, "B'", 4, -1],
    ['ABC nin x eksenine göre simetriği ne olur', tri2, "B'", 4, -1],
    ['ABC üçgenini y ekseninden yansıt', tri2, "B'", -4, 1],
    ['ABC yi (2, 3) noktasına göre yansıt', tri2, "B'", 0, 5],
    ["ABC'yi x eksenine göre yansıtıp y eksenine göre yansıt", tri2, "A''", -1, -1],
    ['ABC yi y eksenine göre yansıtıp 2 birim yukarı ötele', tri2, "A''", -1, 3],
    ['ABC yi ve DEF yi x eksenine göre yansıt', tri2, "E'", 7, -6],
    ['ABC ve DEF üçgenlerini y eksenine göre yansıt', tri2, "E'", -7, 6],
    ['elipsi x eksenine göre yansıt', ellipse, "H'", -6, -6],
    ['çemberi x eksenine göre yansıt', circle, "G'", 8, -8],
    ['ABC yi kopya oluşturmadan x eksenine göre yansıt', tri2, 'C', 2, -3],
  ])('%s', (text, scene, label, x, y) => {
    at(run(text, scene()).objects, label, x, y);
  });

  it('dönüşüm cümlesi dönüşüm ailesine gider', () => {
    expect(topHandler('ABC üçgenini x eksenine göre yansıt', tri())).toBe('transforms.reflect');
    expect(topHandler('ABC nin x eksenine göre simetriğini al ve kırmızıya boya', tri())).toBe('transforms.reflect');
  });

  it('doğruya ve kenara göre yansıma koordinatları', () => {
    const bc = run("ABC'yi BC kenarına göre yansıt", tri2()).objects;
    const a = reflectAcross({ x: 1, y: 1 }, { x: 4, y: 1 }, { x: 2, y: 3 });
    at(bc, "A'", a.x, a.y);
    const ac = run('B noktasının AC doğrusuna göre simetriği', tri2()).objects;
    const b = reflectAcross({ x: 4, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 3 });
    at(ac, "B'", b.x, b.y);
  });

  it('birleşik cümleler: ölçüm ve boyama odaktaki görüntüye uygulanır', () => {
    const measured = run('ABC yi x eksenine göre yansıt ve alanını hesapla', tri2());
    at(measured.objects, "B'", 4, -1);
    const red = run('ABC nin x eksenine göre simetriğini al ve kırmızıya boya', tri2());
    expect(red.objects.find(o => o.label === "A'B'C'")?.color).toBe('#ef4444');
    const drawn = run('ABC üçgeni çiz ve x eksenine göre yansıt', []);
    expect(drawn.objects.filter(o => o.type === 'polygon')).toHaveLength(2);
  });

  it('seçim ve zamir', () => {
    const scene = tri2();
    at(run('seçili şekli x eksenine göre yansıt', scene, polySel(scene)).objects, "B'", 4, -1);
    at(run('onu y eksenine göre yansıt', scene, polySel(scene)).objects, "B'", -4, 1);
  });

  it('koordinatla verilen nokta oluşturulup yansıtılır', () => {
    at(run('P(2,3) noktasının y eksenine göre simetriğini bul', []).objects, "P'", -2, 3);
  });
});

describe('döndürme cümleleri (tüm aileler)', () => {
  it.each<Row>([
    ['ABC yi A etrafında doksan derece döndür', tri2, "B'", 1, 4],
    ['abc yi a etrafında 90 derece döndür', tri2, "B'", 1, 4],
    ['ABCyi A noktası etrafında 90° döndür', tri2, "B'", 1, 4],
    ['ABC üçgenini A merkezli 90 derece döndürür müsün', tri2, "B'", 1, 4],
    ['ABC üçgenini A etrafında saat yönünde 90 derece döndür', tri2, "B'", 1, -2],
    ['ABC yi A etrafında saat yönünün tersine 90 derece çevir', tri2, "B'", 1, 4],
    ['ABC yi A etrafında saatin tersi yönünde 90 derece döndür', tri2, "B'", 1, 4],
    ['ABC yi orijin etrafında yüz seksen derece döndür', tri2, "B'", -4, -1],
    ['ABC yi başlangıç noktası etrafında 180 derece döndür', tri2, "B'", -4, -1],
    ['A noktasını O etrafında 90 derece döndür', tri2, "A'", -1, 1],
    ['ABC yi B etrafında çeyrek tur döndür', tri2, "A'", 4, -2],
    ['ABC yi A etrafında yarım tur döndür', tri2, "B'", -2, 1],
    ['ABC yi A etrafında 45 derece döndürelim', tri2, "B'", rotB45.x, rotB45.y],
    ['bana ABC nin A etrafında 90 derece dönmüş hali lazım', tri2, "B'", 1, 4],
    ['ABC yi A etrafında eksi doksan derece döndür', tri2, "B'", 1, -2],
    ['ABC yi A çevresinde 90 derece döndür', tri2, "B'", 1, 4],
    ["ABC'yi A noktasına göre 90 derece döndür", tri2, "B'", 1, 4],
    ['ABC yi A etrafında 90 derece saat yönünde döndür', tri2, "B'", 1, -2],
    ["ABC'yi 90 derece saat yönünde A etrafında döndür", tri2, "B'", 1, -2],
    ['ABC üçgenini A köşesi etrafında 90 derece döndür', tri2, "B'", 1, 4],
    ['ABC yi A etrafında 90 derece sola döndür', tri2, "B'", 1, 4],
    ['ABC nin A merkezli 90 derecelik dönme altındaki görüntüsünü çiz', tri2, "B'", 1, 4],
    ['ABC nin A etrafında 90 derecelik dönme görüntüsü', tri2, "B'", 1, 4],
    ['ABC yi A merkez olmak üzere 90 derece döndür', tri2, "B'", 1, 4],
    ['dönme merkezi A, açı 90 derece olacak şekilde ABC yi döndür', tri2, "B'", 1, 4],
    ['ABC yi A etrafında 270 derece döndür', tri2, "B'", 1, -2],
    ['ABC üçgenini C noktası etrafında saat yönünde 90 derece döndür', tri2, "A'", 0, 4],
    ['ABC yi A etrafında 90 derece döndürüp x eksenine göre yansıt', tri2, "B''", 1, -4],
    ['ABCD karesini merkezi etrafında 90 derece döndür', square, "A'", 4, 1],
    ['AB doğrusunu A etrafında 90 derece döndür', triSeg, "B'", 1, 4],
    // "pi bölü 2" (konuşma yazımı)
    ['ABC yi A etrafında pi bölü 2 radyan döndür', tri2, "B'", 1, 4],
  ])('%s', (text, scene, label, x, y) => {
    at(run(text, scene()).objects, label, x, y);
  });

  it('küçük "o" harfi O noktası yokken de orijindir', () => {
    const r = run(normalizeSpokenCommand('a noktasını o etrafında doksan derece döndür'), tri2());
    at(r.objects, "A'", -1, 1);
    expect(r.message).toContain('orijin');
    at(run('ABC yi o merkezli 180 derece döndür', tri2()).objects, "B'", -4, -1);
  });

  it('elips döndürülünce dönme açısı eklenir; görüntü rengi seçilebilir', () => {
    const e = run('elipsi merkezi etrafında 45 derece döndür', ellipse());
    expect((e.objects.find(o => o.label === "H' Merkezli Elips") as EllipseObject).rotation).toBe(75);
    const red = run('ABC yi A etrafında 90 derece kırmızı renkte döndür', tri2());
    expect(red.objects.find(o => o.label === "A'B'C'")?.color).toBe('#ef4444');
  });
});

describe('öteleme cümleleri (tüm aileler)', () => {
  it.each<Row>([
    // bilinen hata: "3 2 vektörüyle" koordinat olur, öteleme çalışmalı
    ['ABC üçgenini 3 2 vektörüyle ötele', tri2, "B'", 7, 3],
    ['ABC yi 3 2 vektörü kadar ötele', tri2, "A'", 4, 3],
    ['ABC yi 3 birim sağa 2 birim yukarı ötele', tri2, "A'", 4, 3],
    ['ABC yi üç birim sağa iki birim yukarı ötele', tri2, "A'", 4, 3],
    ['ABC yi sağa 3 yukarı 2 birim ötele', tri2, "A'", 4, 3],
    ['ABC üçgenini 3 birim sağa ve 2 birim yukarı ötelemek istiyorum', tri2, "A'", 4, 3],
    ['a noktasını dört birim sola ötele', tri2, "A'", -3, 1],
    ['ABC yi AB vektörüyle ötele', tri2, "C'", 5, 3],
    ['ABC yi A dan B ye ötele', tri2, "C'", 5, 3],
    ['A yı (5, 5) noktasına ötele', tri2, "A'", 5, 5],
    ['A noktasını (3, 4) konumuna ötele', tri2, "A'", 3, 4],
    ['A noktasını B noktasına ötele', tri2, "A'", 4, 1],
    ['ABC yi x ekseni boyunca 3 birim ötele', tri2, "A'", 4, 1],
    ['ABC yi y ekseni boyunca eksi 2 birim ötele', tri2, "A'", 1, -1],
    ['ABC nin (3, 2) vektörüyle ötelenmiş görüntüsünü çiz', tri2, "A'", 4, 3],
    ['ABC yi 3 birim sağa ötele sonra x eksenine göre yansıt', tri2, "A''", 4, -1],
    ['ABC yi yerinde 3 birim sağa ötele', tri2, 'A', 4, 1],
    ['ABC yi 3 cm sağa ötele', tri2, "A'", 4, 1],
    ['ABC yi sağa doğru 3 birim ötele', tri2, "A'", 4, 1],
    ['ABC üçgenini (3,2) ile ötele', tri2, "A'", 4, 3],
    ['ABC yi 3 birim doğuya ötele', tri2, "A'", 4, 1],
    ['ABC yi yukarı doğru iki birim ötele', tri2, "A'", 1, 3],
    ['ABC üçgenini x yönünde 3 y yönünde 2 birim ötele', tri2, "A'", 4, 3],
    ['ABC yi 3 sağa 2 yukarı ötele', tri2, "A'", 4, 3],
    ['ABC yi 2 birim sola ve 1 birim aşağıya ötele', tri2, "A'", -1, 0],
    ['ABC yi (-3, 2) vektörüyle ötele', tri2, "A'", -2, 3],
    // "ABC'yi" hedeftir; "vektör (3, 2)" vektördür (etiket vektör adı sanılmaz)
    ['ABC yi vektör (3, 2) ile ötele', tri2, "A'", 4, 3],
    // "A noktası B noktasına gelecek şekilde": AB vektörü
    ['ABC yi A noktası B noktasına gelecek şekilde ötele', tri2, "C'", 5, 3],
    ['çemberi (-2; 1) kadar ötele', circle, "G'", 6, 9],
  ])('%s', (text, scene, label, x, y) => {
    at(run(text, scene()).objects, label, x, y);
  });

  it('seçili üçgen ve birleşik ölçüm', () => {
    const scene = tri2();
    at(run('seçili üçgeni 1 birim sola ötele', scene, polySel(scene)).objects, "A'", 0, 1);
    at(run('ABC yi (3, 2) vektörü kadar ötele ve alanını hesapla', tri2()).objects, "A'", 4, 3);
  });

  it('"eksi (3, 2)" işareti tahmin edilmez, koordinat içinde istenir', () => {
    expect(failWith('ABC yi eksi (3, 2) vektörüyle ötele', tri2())).toMatch(/İşareti koordinatın içine yazın: “\(-3, 2\) vektörüyle ötele”/);
  });
});

describe('homotete cümleleri (tüm aileler)', () => {
  it.each<Row>([
    ['ABC yi A merkezli iki kat büyüt', tri2, "B'", 7, 1],
    ['abc yi a merkezli 2 kat büyüt', tri2, "B'", 7, 1],
    ['ABC üçgenini A noktasına göre 2 kat büyüt', tri2, "B'", 7, 1],
    ['ABC yi A merkezli yarı yarıya küçült', tri2, "B'", 2.5, 1],
    ['ABC yi O merkezli 2 kat büyüt', tri2, "B'", 8, 2],
    ['ABC yi A merkezli yüzde 50 oranında küçült', tri2, "B'", 2.5, 1],
    ['ABC üçgenini A merkezli 2 kat büyütmek istiyorum', tri2, "B'", 7, 1],
    ['ABC nin A merkezli 2 kat büyütülmüş halini çiz', tri2, "B'", 7, 1],
    ['ABC yi A merkezli eksi 2 oranında homotetiyle dönüştür', tri2, "B'", -5, 1],
    ['ABC yi (1, 1) merkezli 2 kat büyüt', tri2, "B'", 7, 1],
    ['ABC yi A merkezli 2 kat büyütüp x eksenine göre yansıt', tri2, "B''", 7, -1],
    ['ABC yi A merkezli ölçek çarpanı 2 ile ölçekle', tri2, "B'", 7, 1],
    ['ABC yi A noktasından 2 kat büyüt', tri2, "B'", 7, 1],
    ['ABC yi A merkezli 3 te 1 oranında küçült', tri2, "B'", 2, 1],
    ['ABCD karesini merkezine göre 2 kat büyüt', square, "A'", -0.5, -0.5],
    // "dörtte bir": ekli sayı sözcüğü
    ['ABC yi A merkezli dörtte bir oranında küçült', tri2, "B'", 1.75, 1],
    ['ABC yi A merkezli üçte iki oranında küçült', tri2, "B'", 3, 1],
    // büyütme fiili yazılmamış homotete
    ['ABC nin A merkezli 2 katını çiz', tri2, "B'", 7, 1],
    ['ABC üçgenini A merkezli iki katına çıkar', tri2, "B'", 7, 1],
  ])('%s', (text, scene, label, x, y) => {
    at(run(text, scene()).objects, label, x, y);
  });

  it('"iki katına çıkar" çokgen oluşturmaya değil homoteteye gider', () => {
    expect(topHandler('ABC üçgenini A merkezli iki katına çıkar', tri())).toBe('transforms.dilate');
  });
});

describe('konuşma metinleri (normalizeSpokenCommand + tüm aileler)', () => {
  it.each<Row>([
    ['a be ce üçgenini x eksenine göre yansıtır mısın', tri2, "B'", 4, -1],
    ['şimdi a be ce üçgenini orijine göre yansıt lütfen', tri2, "B'", -4, -1],
    ['a be ce yi a be doğrusuna göre yansıt', tri2, "C'", 2, -1],
    ['be noktasının orijine göre simetriği nedir', tri2, "B'", -4, -1],
    ['a be ce üçgeninin o noktasına göre simetriğini çiz', tri2, "B'", -4, -1],
    ['a be ce üçgeninin o noktasına göre simetriğini çiz', triO, "B'", -4, -1],
    ['tamam şimdi a be ce üçgenini a etrafında doksan derece döndür', tri2, "B'", 1, 4],
    ['a be ce üçgenini be noktası etrafında doksan derece döndür', tri2, "A'", 4, -2],
    ['a be ce üçgenini saat yönünde doksan derece a etrafında döndür', tri2, "B'", 1, -2],
    ['a be ce üçgenini orijin etrafında yüz seksen derece döndür', tri2, "B'", -4, -1],
    ['evet a be ce üçgenini üç birim sağa ötele', tri2, "A'", 4, 1],
    ['a be ce üçgenini eksi iki üç vektörüyle ötele', tri2, "A'", -1, 4],
    ['a be ce üçgenini a be vektörü kadar ötele', tri2, "C'", 5, 3],
    ['a be ce üçgenini a dan be ye ötele', tri2, "C'", 5, 3],
    ['a be ce üçgenini iki birim aşağı ötele', tri2, "A'", 1, -1],
    ['a be ce üçgenini a merkezli iki kat büyüt', tri2, "B'", 7, 1],
    ['a be ce üçgenini a noktasına göre iki kat büyüt', tri2, "B'", 7, 1],
    ['a be ce üçgenini a merkezli üç kat küçült', tri2, "B'", 2, 1],
    ['ABC ye A merkezli k eşittir 2 homotetisi uygula', tri2, "B'", 7, 1],
    ['ABC yi A merkezli sıfır virgül beş kat küçült', tri2, "B'", 2.5, 1],
    ['şey ABC yi A merkezli 2 kat büyüt', tri2, "B'", 7, 1],
  ])('%s', (spoken, scene, label, x, y) => {
    at(run(normalizeSpokenCommand(spoken), scene()).objects, label, x, y);
  });
});

describe('görüntünün adı ve üs işaretleri', () => {
  it.each<[string, string, number, number]>([
    ["ABC'yi x eksenine göre yansıtarak DEF üçgenini oluştur", 'E', 4, -1],
    ["ABC'nin x eksenine göre yansıması olan DEF üçgenini çiz", 'E', 4, -1],
    ['ABC yi A etrafında 90 derece döndürerek DEF üçgenini oluştur', 'E', 1, 4],
    ['ABC yi (3, 2) vektörüyle öteleyerek KLM üçgenini elde et', 'K', 4, 3],
    ['ABC yi A merkezli 2 kat büyüterek DEF üçgenini çiz', 'E', 7, 1],
    ['A noktasının x eksenine göre simetriği olan K noktasını çiz', 'K', 1, -1],
  ])('istenen ad verilir: %s', (text, label, x, y) => {
    const r = run(text, tri());
    at(r.objects, label, x, y);
    expect(r.message).not.toContain('kullanıldığı için');
  });

  it('istenen ad kullanımdaysa varsayılan adlar kalır ve söylenir', () => {
    const r = run('ABC yi x eksenine göre yansıtarak DEF üçgenini oluştur', tri2());
    at(r.objects, "B'", 4, -1);
    at(r.objects, 'E', 7, 6);
    expect(r.message).toContain('“DEF” adı verilemedi');
  });

  it.each<[string, Scene, string, number, number]>([
    ['ABC yi y eksenine göre yansıt', after(tri, "ABC'yi x eksenine göre yansıt"), "A''", -1, 1],
    ['ABC yi A etrafında 90 derece döndür', after(tri, 'ABC yi A etrafında 45 derece döndür'), "B''", 1, 4],
    ['ABC yi (3, 2) vektörüyle ötele', after(tri, 'ABC yi (1, 1) vektörüyle ötele'), "A''", 4, 3],
    ['ABC yi A merkezli 3 kat büyüt', after(tri, 'ABC yi A merkezli 2 kat büyüt'), "B''", 10, 1],
  ])('önceki görüntü tek üslü adları aldıysa nedeni söylenir: %s', (text, scene, label, x, y) => {
    const r = run(text, scene());
    at(r.objects, label, x, y);
    expect(r.message).toContain("A', B' ve C' adları önceki bir görüntüde zaten kullanıldığı için yeni noktalara A'', B'' ve C'' adları verildi.");
  });

  it('elle adlandırılmış A\' noktası varsa "sahnede" denir', () => {
    const scene = build(s => { s.addPoint({ x: 9, y: 9 }, { label: "A'" }); }, tri());
    const r = run('A noktasını x eksenine göre yansıt', scene);
    at(r.objects, "A''", 1, -1);
    expect(r.message).toContain("A' adı sahnede zaten kullanıldığı için yeni noktaya A'' adı verildi.");
  });

  it('aynı görüntü tekrar istenince çoğaltılmaz ve üs notu yazılmaz', () => {
    const r = run("ABC'nin x eksenine göre simetriğini al", after(tri, "ABC'yi x eksenine göre yansıt")());
    expect(r.sceneChanged).toBe(false);
    expect(r.message).toContain('zaten vardı');
    expect(r.message).not.toContain('kullanıldığı için');
  });
});

describe('açıklayıcı hatalar (tüm aileler)', () => {
  it.each<[string, Scene, RegExp]>([
    ['x eksenine göre yansıt', tri2, /adıyla/],
    ["ABC'yi yansıt", tri, /eksen/],
    ["ABC'yi KL doğrusuna göre yansıt", tri, /KL doğrusu bulunamadı/],
    ['ABC yi G çemberine göre yansıt', triCircle, /doğruya ya da noktaya/],
    ['ABC yi AA doğrusuna göre yansıt', tri, /AA doğrusu bulunamadı/],
    ['A noktasını 90 derece döndür', tri, /merkezini/],
    ["ABC'yi K etrafında 90 derece döndür", tri, /K noktası bulunamadı/],
    ['ABC yi A etrafında 0 derece döndür', tri, /0’dan farklı/],
    ['90 derece döndür', tri2, /adıyla/],
    ["ABC'yi ötele", tri, /vektörünü/],
    ['ABC yi (0, 0) vektörüyle ötele', tri, /sıfır/],
    ['ABC yi (5, 5) noktasına ötele', tri, /tek bir nokta/],
    ['ABC yi KL vektörü kadar ötele', tri, /KL vektörü bulunamadı/],
    ['ABC yi 3 birim sağa ötele', () => [], /bulunamadı/],
    ['ABC ye A merkezli k = 0 homotetisi uygula', tri, /0 olamaz/],
    ['A noktasını 2 kat büyüt', tri, /merkezini/],
    ['ABC yi A merkezli 1 kat büyüt', tri, /değişmez/],
  ])('%s', (text, scene, fragment) => {
    expect(failWith(text, scene())).toMatch(fragment);
  });
});
