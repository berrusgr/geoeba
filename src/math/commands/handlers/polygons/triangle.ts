import { triangleCoordinates } from '../../../commandBindings';
import { fail, trNum } from '../../scene';
import { D, L, Reader, SEP, checkAngle, checkLength, toDeg, toRad } from './analyze';

/**
 * Üçgen ölçülerini okuma ve çözme.
 * Köşe modeli: kenarlar ab = |AB|, bc = |BC|, ca = |CA|; açılar A, B, C (derece).
 * Yerel çizim: A(0,0), B(ab,0), C üstte (saat yönünün tersi). Dik üçgenlerde dik açı B'dedir (eski davranışla aynı: 3 4 5 → B = 90°).
 */

export interface Known { ab?: number; bc?: number; ca?: number; A?: number; B?: number; C?: number }
type SideKey = 'ab' | 'bc' | 'ca';
type AngleKey = 'A' | 'B' | 'C';
const OPPOSITE: Record<AngleKey, SideKey> = { A: 'bc', B: 'ca', C: 'ab' };
/** Açıyı oluşturan iki kenar */
const INCLUDED: Record<AngleKey, [SideKey, SideKey]> = { A: ['ab', 'ca'], B: ['ab', 'bc'], C: ['bc', 'ca'] };
const SIDE_NAMES: Record<SideKey, [number, number]> = { ab: [0, 1], bc: [1, 2], ca: [2, 0] };

export interface TriangleFlags { equilateral: boolean; isosceles: boolean; right: boolean; scalene: boolean; obtuse: boolean; acute: boolean }

export interface TriangleResult {
  ab: number; bc: number; ca: number;
  notes: string[];
  /** Ölçüler cümlede açıkça verildi mi (varsayılan değil) */
  explicit: boolean;
  flags: TriangleFlags;
  /** Kısa tür adı: "eşkenar üçgen", "dik üçgen"… */
  noun: string;
  /** Etiketli ölçülerden ("AB = 3, BC = 4…") çıkarılan köşe adları */
  names?: string[];
}

export function triangleFlags(t: string): TriangleFlags {
  return {
    equilateral: /\beskenar\b|\besit kenarli ucgen|\bduzgun ucgen/.test(t),
    isosceles: /\bikizkenar/.test(t),
    right: /\bdik (?:acili )?(?:ikizkenar )?ucgen|\bikizkenar dik\b|\bdik kenar|\bhipotenus/.test(t),
    scalene: /\bcesitkenar/.test(t),
    obtuse: /\bgenis acili|\bgenis aci\b/.test(t),
    acute: /\bdar acili/.test(t),
  };
}

export function triangleNoun(f: TriangleFlags): string {
  if (f.equilateral) return 'eşkenar üçgen';
  if (f.right && f.isosceles) return 'ikizkenar dik üçgen';
  if (f.right) return 'dik üçgen';
  if (f.isosceles) return 'ikizkenar üçgen';
  if (f.scalene) return f.obtuse ? 'geniş açılı çeşitkenar üçgen' : f.acute ? 'dar açılı çeşitkenar üçgen' : 'çeşitkenar üçgen';
  if (f.obtuse) return 'geniş açılı üçgen';
  if (f.acute) return 'dar açılı üçgen';
  return 'üçgen';
}

const lawCos = (x: number, y: number, deg: number) => Math.sqrt(Math.max(0, x * x + y * y - 2 * x * y * Math.cos(toRad(deg))));
const angleFrom = (opp: number, x: number, y: number) => toDeg(Math.acos(Math.max(-1, Math.min(1, (x * x + y * y - opp * opp) / (2 * x * y)))));

/** Bilinenlerden eksik kenar ve açıları tamamlar (SSS, SAS, ASA, AAS, SSA). */
export function complete(k: Known, notes: string[]): Known {
  const r: Known = { ...k };
  const given: Partial<Record<AngleKey, number>> = { A: k.A, B: k.B, C: k.C };
  for (let iteration = 0; iteration < 8; iteration++) {
    const angles = (['A', 'B', 'C'] as AngleKey[]).filter(a => r[a] !== undefined);
    if (angles.length === 2) {
      const missing = (['A', 'B', 'C'] as AngleKey[]).find(a => r[a] === undefined)!;
      const rest = 180 - angles.reduce((s, a) => s + r[a]!, 0);
      if (rest <= 1e-9) fail('Üçgenin iç açılarının toplamı 180° olmalı; verilen açılar çok büyük.');
      r[missing] = rest;
    }
    if (angles.length === 3 && Math.abs(r.A! + r.B! + r.C! - 180) > 1e-6) fail(`Üçgenin iç açılarının toplamı 180° olmalı (verilen: ${trNum(r.A! + r.B! + r.C!)}°).`);
    for (const a of ['A', 'B', 'C'] as AngleKey[]) {
      const [x, y] = INCLUDED[a], opp = OPPOSITE[a];
      if (r[a] !== undefined && r[x] !== undefined && r[y] !== undefined && r[opp] === undefined) r[opp] = lawCos(r[x]!, r[y]!, r[a]!);
    }
    if (r.ab !== undefined && r.bc !== undefined && r.ca !== undefined) break;
    if (r.A !== undefined && r.B !== undefined && r.C !== undefined) {
      const ref = (['A', 'B', 'C'] as AngleKey[]).find(a => r[OPPOSITE[a]] !== undefined);
      if (ref) {
        const unit = r[OPPOSITE[ref]]! / Math.sin(toRad(r[ref]!));
        for (const a of ['A', 'B', 'C'] as AngleKey[]) if (r[OPPOSITE[a]] === undefined) r[OPPOSITE[a]] = unit * Math.sin(toRad(r[a]!));
        break;
      }
    }
    // SSA: bilinen açı ve karşısındaki kenar, bir kenar daha
    let progressed = false;
    for (const a of ['A', 'B', 'C'] as AngleKey[]) {
      const x = r[OPPOSITE[a]];
      if (r[a] === undefined || x === undefined) continue;
      for (const b of ['A', 'B', 'C'] as AngleKey[]) {
        const y = r[OPPOSITE[b]];
        if (b === a || r[b] !== undefined || y === undefined) continue;
        const sin = y * Math.sin(toRad(r[a]!)) / x;
        if (sin > 1 + 1e-9) fail('Bu ölçülerle üçgen oluşmaz: verilen açının karşısındaki kenar çok kısa.');
        const acute = toDeg(Math.asin(Math.min(1, sin)));
        if (y > x + 1e-9 && r[a]! < 90 && Math.abs(acute - 90) > 1e-6) notes.push('Bu ölçülerle iki farklı üçgen çizilebilir; dar açılı olan çizildi.');
        r[b] = acute;
        progressed = true;
        break;
      }
      if (progressed) break;
    }
    if (!progressed && angles.length < 2) break;
  }
  if (r.ab !== undefined && r.bc !== undefined && r.ca !== undefined) {
    for (const a of ['A', 'B', 'C'] as AngleKey[]) {
      const [x, y] = INCLUDED[a];
      const computed = angleFrom(r[OPPOSITE[a]]!, r[x]!, r[y]!);
      if (given[a] !== undefined && Math.abs(computed - given[a]!) > 1e-4) fail(`Verilen ${a} açısı (${trNum(given[a]!)}°) kenar uzunluklarıyla uyuşmuyor (${trNum(computed)}° olmalı).`);
    }
  }
  return r;
}

export interface LabelSplitter { (text: string): string[] | null }

/**
 * Cümleden üçgen ölçülerini okur ve kenar uzunluklarına çevirir.
 * vertexNames: ana etiketten gelen köşe adları (ör. ["A","B","C"]); etiketli ölçüler ("AB = 3", "A açısı 90") bunlara göre yerleştirilir.
 */
export function readTriangle(r: Reader, split: LabelSplitter, vertexNames?: string[]): TriangleResult {
  const flags = triangleFlags(r.s);
  const notes: string[] = [];
  const k: Known = {};
  let explicit = false;
  const vnames = vertexNames ? [...vertexNames] : [];

  // --- Etiketli ölçüler: "AB = 3", "|BC| 4", "A açısı 90 derece"
  const nameIndex = (name: string): number => {
    let i = vnames.findIndex(v => v.toLocaleUpperCase('tr') === name.toLocaleUpperCase('tr'));
    if (i < 0) {
      if (vertexNames) fail(`${name} bu üçgenin köşesi değil. Köşeler: ${vertexNames.join(', ')}.`);
      if (vnames.length >= 3) fail('Ölçülerde üçten fazla köşe adı geçiyor; bir üçgenin üç köşesi olur.');
      vnames.push(name);
      i = vnames.length - 1;
    }
    return i;
  };
  r.s = r.s.replace(/\$(\d+)[a-z]* (?:kenari |kenarinin )?(#\d+)(?![\dd])/g, (whole, index: string, ref: string) => {
    const label = r.c.labels[Number(index)];
    const parts = label ? split(label.text) : null;
    if (!parts || parts.length !== 2) return whole;
    const [i, j] = [nameIndex(parts[0]), nameIndex(parts[1])];
    const key = (Object.keys(SIDE_NAMES) as SideKey[]).find(s => {
      const [p, q] = SIDE_NAMES[s];
      return (p === i && q === j) || (p === j && q === i);
    });
    if (!key) fail(`${label.text} bir kenar adı değil.`);
    k[key] = checkLength(r.value(ref), `${label.text} uzunluğu`);
    explicit = true;
    return ' _ ';
  });
  r.s = r.s.replace(/\$(\d+)[a-z]* (?:acisi|kosesindeki acisi|kosesindeki aci|kosesi) (#\d+d?)(?!\d)/g, (whole, index: string, ref: string) => {
    const label = r.c.labels[Number(index)];
    const parts = label ? split(label.text) : null;
    if (!parts || parts.length !== 1) return whole;
    const key = (['A', 'B', 'C'] as AngleKey[])[nameIndex(parts[0])];
    k[key] = checkAngle(r.value(ref), `${parts[0]} açısı`);
    explicit = true;
    return ' _ ';
  });

  // --- Adlandırılmış ölçüler
  let m: RegExpMatchArray | null;
  const num = (ref: string, what: string) => checkLength(r.value(ref), what);
  const deg = (ref: string, what: string) => checkAngle(r.value(ref), what);
  let hyp: number | undefined, legs: number[] = [], equal: number | undefined, apex: number | undefined, baseAngles: number[] = [];
  let base: number | undefined, height: number | undefined, sas: { x: number; y: number; angle: number } | undefined;
  let angleList: number[] = [], oneAngle: number | undefined, sideList: number[] = [], single: number | undefined, includedAngle: number | undefined;

  if ((m = r.take(new RegExp(`\\bhipotenus\\w* (${L})`)))) hyp = num(m[1], 'Hipotenüs');
  if ((m = r.take(new RegExp(`\\bdik kenar\\w* (${L})${SEP}(${L})`)))) legs = [num(m[1], 'Dik kenar'), num(m[2], 'Dik kenar')];
  else if ((m = r.take(new RegExp(`\\b(?:bir )?dik kenar\\w* (${L})`)))) legs = [num(m[1], 'Dik kenar')];
  if ((m = r.take(new RegExp(`\\b(?:yan|esit) kenar\\w* (${L})`)) ?? r.take(new RegExp(`\\bbacak\\w* (${L})`)))) equal = num(m[1], 'Eşit kenar');
  if ((m = r.take(new RegExp(`\\btepe acisi (${D})`)))) apex = deg(m[1], 'Tepe açısı');
  if ((m = r.take(new RegExp(`\\btaban acilari (${D})${SEP}(${D})`)))) baseAngles = [deg(m[1], 'Taban açısı'), deg(m[2], 'Taban açısı')];
  else if ((m = r.take(new RegExp(`\\btaban acilari? (${D})|\\btaban acisi (${D})`)))) { const v = deg(m[1] ?? m[2], 'Taban açısı'); baseAngles = [v, v]; }
  if ((m = r.take(new RegExp(`\\bkenar\\w* (${L})${SEP}(${L})\\b[^#]*?\\bara(?:s|d|lar)\\w* aci\\w* (${D})`)))) sas = { x: num(m[1], 'Kenar'), y: num(m[2], 'Kenar'), angle: deg(m[3], 'Aradaki açı') };
  else if ((m = r.take(new RegExp(`(${L})${SEP}(${L}) kenarlar\\w* ara(?:s|d|lar)\\w* aci\\w* (${D})`)))) sas = { x: num(m[1], 'Kenar'), y: num(m[2], 'Kenar'), angle: deg(m[3], 'Aradaki açı') };
  else if ((m = r.take(new RegExp(`\\bara(?:s|d|lar)\\w* aci\\w* (${D})`)))) includedAngle = deg(m[1], 'Aradaki açı');
  if ((m = r.take(new RegExp(`\\btaban\\w* (${L})`)))) base = num(m[1], 'Taban');
  if ((m = r.take(new RegExp(`\\byukseklig\\w* (${L})`)) ?? r.take(new RegExp(`(${L}) yukseklig\\w*`)))) height = num(m[1], 'Yükseklik');
  if ((m = r.take(new RegExp(`\\bacilari (${D})${SEP}(${D})(?:${SEP}(${D}))?`)))) angleList = [m[1], m[2], m[3]].filter(Boolean).map(x => deg(x!, 'Açı'));
  else if ((m = r.take(new RegExp(`\\b(?:bir |dar |bir dar )?acisi (${D})`)))) oneAngle = deg(m[1], 'Açı');
  if ((m = r.take(new RegExp(`\\bkenar\\w* (${L})${SEP}(${L})${SEP}(${L})`)))) sideList = [m[1], m[2], m[3]].map(x => num(x, 'Kenar'));
  else if ((m = r.take(new RegExp(`\\bkenar\\w* (${L})${SEP}(${L})`)))) sideList = [m[1], m[2]].map(x => num(x, 'Kenar'));
  else if ((m = r.take(new RegExp(`\\bkenar\\w* (${L})`)))) single = num(m[1], 'Kenar');
  const degrees = r.degrees();
  if (degrees.length) {
    if (angleList.length || oneAngle !== undefined) fail('Açıları tek bir listede yazın. Örneğin: “açıları 30, 60 ve 90 derece olan üçgen”.');
    if (degrees.length === 1) oneAngle = checkAngle(degrees[0], 'Açı');
    else angleList = degrees.map(x => checkAngle(x, 'Açı'));
  }
  const bare = r.lengths().map(x => checkLength(x, 'Kenar'));
  if (sideList.length + bare.length > 3 || (sideList.length && bare.length)) {
    fail('Üçgen için en fazla üç kenar yazın. Örneğin: “kenarları 3, 4 ve 5 olan üçgen çiz”.');
  }
  if (!sideList.length && bare.length) {
    // "30-60-90 üçgeni": toplamı 180 olan ve üçgen oluşturmayan üç sayı açıdır.
    const [p, q, s] = bare;
    if (bare.length === 3 && Math.abs(p + q + s - 180) < 1e-9 && Math.max(p, q, s) * 2 >= p + q + s - 1e-9) {
      angleList = bare;
      notes.push('Sayılar açı olarak alındı.');
    } else if (bare.length === 1) single = bare[0];
    else sideList = bare;
  }
  if (angleList.length === 1) { oneAngle = angleList[0]; angleList = []; }

  explicit = explicit || [hyp, equal, apex, base, height, sas, oneAngle, single, includedAngle].some(v => v !== undefined)
    || legs.length > 0 || baseAngles.length > 0 || angleList.length > 0 || sideList.length > 0;

  // --- Türe göre yerleştirme
  if (angleList.length) { k.A = angleList[0]; k.B = angleList[1]; if (angleList[2] !== undefined) k.C = angleList[2]; }
  if (sas) { k.ab = sas.x; k.ca = sas.y; k.A = sas.angle; }
  if (includedAngle !== undefined) {
    if (sideList.length !== 2) fail('Aradaki açıyı kullanmak için iki kenar yazın. Örneğin: “iki kenarı 5 ve 7, arasındaki açı 60 derece olan üçgen”.');
    k.ab = sideList[0]; k.ca = sideList[1]; k.A = includedAngle; sideList = [];
  }
  if (baseAngles.length) { k.A = baseAngles[0]; k.B = baseAngles[1]; }
  if (apex !== undefined) k.C = apex;
  if (base !== undefined) k.ab = base;
  if (sideList.length === 3) { [k.ab, k.bc, k.ca] = sideList; }

  if (flags.equilateral) {
    const values = [single, base, equal, k.ab, k.bc, k.ca, ...sideList].filter((v): v is number => v !== undefined);
    let s = values[0];
    if (s === undefined && height !== undefined) { s = 2 * height / Math.sqrt(3); }
    if (values.some(v => Math.abs(v - values[0]) > 1e-9) || sideList.length === 2) fail('Eşkenar üçgenin üç kenarı eşit olmalı. Örneğin: “kenarı 5 olan eşkenar üçgen çiz”.');
    for (const a of [k.A, k.B, k.C, oneAngle]) if (a !== undefined && Math.abs(a - 60) > 1e-9) fail('Eşkenar üçgenin her açısı 60° olur.');
    if (s === undefined) { s = 4; notes.push('Kenar uzunluğu 4 birim alındı.'); }
    k.ab = k.bc = k.ca = s;
  } else if (flags.right) {
    // Üç kenar ya da açı listesi verildiyse yalnızca doğrulanır (aşağıda).
    if (sideList.length !== 3 && !angleList.length) {
      if (sideList.length === 2) { legs = sideList; sideList = []; }
      if (single !== undefined && !legs.length) { legs = [single]; single = undefined; }
      if (base !== undefined && height !== undefined) legs = [base, height];
      if (flags.isosceles) {
        const leg = legs[0] ?? (hyp !== undefined ? hyp / Math.SQRT2 : undefined) ?? equal;
        if (legs.length === 2 && Math.abs(legs[0] - legs[1]) > 1e-9) fail('İkizkenar dik üçgenin dik kenarları eşit olmalı.');
        const value = leg ?? 4;
        if (leg === undefined) notes.push('Dik kenarlar 4 birim alındı.');
        k.ab = value; k.bc = value; k.ca = undefined; k.B = 90;
      } else {
        k.B = 90;
        const acute = oneAngle ?? (k.A !== 90 ? k.A : undefined);
        if (legs.length === 2) { k.ab = legs[0]; k.bc = legs[1]; }
        else if (legs.length === 1 && hyp !== undefined) {
          if (hyp <= legs[0]) fail('Hipotenüs dik kenardan uzun olmalı.');
          k.ab = legs[0]; k.ca = hyp;
        } else if (hyp !== undefined && acute !== undefined) {
          checkAngle(acute, 'Dar açı', 90);
          k.ab = hyp * Math.cos(toRad(acute)); k.bc = hyp * Math.sin(toRad(acute));
        } else if (legs.length === 1 && acute !== undefined) {
          checkAngle(acute, 'Dar açı', 90);
          k.ab = legs[0]; k.bc = legs[0] * Math.tan(toRad(acute));
          notes.push(`${trNum(legs[0])} birimlik dik kenar ${trNum(acute)}° açıya komşu alındı.`);
        } else if (hyp !== undefined) {
          k.ab = hyp * 0.6; k.bc = hyp * 0.8;
          notes.push('Dik kenarlar 3:4 oranında alındı.');
        } else if (acute !== undefined) {
          checkAngle(acute, 'Dar açı', 90);
          k.ab = 4; k.bc = 4 * Math.tan(toRad(acute));
          notes.push(`${trNum(acute)}° açıya komşu dik kenar 4 birim alındı.`);
        } else if (legs.length === 1) {
          fail('Dik üçgen için iki dik kenarı ya da hipotenüsü de yazın. Örneğin: “dik kenarları 3 ve 4 olan dik üçgen çiz”.');
        } else if (k.ab === undefined && k.bc === undefined && k.ca === undefined) {
          k.ab = 3; k.bc = 4;
          notes.push('Dik kenarlar 3 ve 4 birim alındı.');
        }
        if (k.A === 90) k.A = undefined;
        if (acute !== undefined && k.A === undefined && legs.length !== 2 && !(legs.length === 1 && hyp !== undefined)) k.A = acute;
        if (k.ab !== undefined && k.bc !== undefined) { k.A = undefined; k.C = undefined; }
      }
    }
  } else if (flags.isosceles) {
    if (sideList.length === 3) {
      const [p, q, s] = sideList;
      const eq = Math.abs(p - q) < 1e-9 ? [p, s] : Math.abs(q - s) < 1e-9 ? [q, p] : Math.abs(p - s) < 1e-9 ? [p, q] : null;
      if (!eq) fail('İkizkenar üçgenin iki kenarı eşit olmalı. Örneğin: “tabanı 6, yan kenarları 5 olan ikizkenar üçgen”.');
      k.ab = eq![1]; k.bc = k.ca = eq![0];
    } else {
      if (sideList.length === 2) { equal = sideList[0]; base = sideList[1]; k.ab = base; notes.push(`Eşit kenarlar ${trNum(equal)}, taban ${trNum(base)} alındı.`); }
      if (single !== undefined && equal === undefined) { equal = single; }
      if (oneAngle !== undefined && apex === undefined && !baseAngles.length) {
        if (oneAngle >= 90) { apex = oneAngle; } else { apex = oneAngle; notes.push(`${trNum(oneAngle)}° tepe açısı olarak alındı.`); }
        k.C = apex;
      }
      const baseAngle = baseAngles[0];
      if (baseAngles.length === 2 && Math.abs(baseAngles[0] - baseAngles[1]) > 1e-9) fail('İkizkenar üçgenin taban açıları eşit olmalı.');
      if (baseAngle !== undefined) { checkAngle(baseAngle, 'Taban açısı', 90); k.A = k.B = baseAngle; }
      if (apex !== undefined) { k.A = k.B = (180 - apex) / 2; k.C = apex; }
      if (base !== undefined && equal !== undefined) { k.bc = k.ca = equal; }
      else if (base !== undefined && height !== undefined) { k.bc = k.ca = Math.hypot(base / 2, height); }
      else if (equal !== undefined && height !== undefined) {
        if (height >= equal) fail('Yükseklik eşit kenarlardan kısa olmalı.');
        k.ab = 2 * Math.sqrt(equal * equal - height * height); k.bc = k.ca = equal;
      } else if (equal !== undefined && k.A !== undefined) {
        k.bc = k.ca = equal; k.ab = 2 * equal * Math.cos(toRad(k.A));
      } else if (base !== undefined && k.A !== undefined) {
        k.bc = k.ca = base / (2 * Math.cos(toRad(k.A)));
      } else if (height !== undefined && k.A !== undefined) {
        k.bc = k.ca = height / Math.sin(toRad(k.A)); k.ab = 2 * height / Math.tan(toRad(k.A));
      } else if (base !== undefined) {
        k.bc = k.ca = base * 1.25; notes.push(`Eşit kenarlar ${trNum(base * 1.25)} birim alındı.`);
      } else if (equal !== undefined) {
        k.bc = k.ca = equal; k.ab = equal * 0.8; notes.push(`Taban ${trNum(equal * 0.8)} birim alındı.`);
      } else if (height !== undefined) {
        k.ab = 4; k.bc = k.ca = Math.hypot(2, height); notes.push('Taban 4 birim alındı.');
      } else if (k.A !== undefined) {
        k.ab = 4; k.bc = k.ca = 2 / Math.cos(toRad(k.A)); notes.push('Taban 4 birim alındı.');
      } else {
        k.ab = 4; k.bc = k.ca = 5; notes.push('Taban 4, eşit kenarlar 5 birim alındı.');
      }
    }
  } else {
    if (sideList.length === 2 && !Object.keys(k).length) {
      fail('Üçgen için üç kenar yazın ya da iki kenarla aradaki açıyı verin. Örneğin: “kenarları 5, 7 ve 8 olan üçgen” veya “iki kenarı 5 ve 7, arasındaki açı 60 derece olan üçgen”.');
    }
    if (sideList.length === 2) { k.ab = sideList[0]; k.ca = sideList[1]; }
    if (base !== undefined && height !== undefined && k.A === undefined && k.B === undefined) {
      k.bc = k.ca = Math.hypot(base / 2, height);
      notes.push('Tepe noktası tabanın orta noktasının üstüne yerleştirildi.');
    }
    if (oneAngle !== undefined && k.A === undefined) k.A = oneAngle;
    if (single !== undefined) {
      if (!Object.keys(k).length && !flags.scalene && !flags.obtuse && !flags.acute) { k.ab = k.bc = k.ca = single; notes.push('Kenarları eşit (eşkenar) alındı.'); }
      else if (k.ab === undefined) k.ab = single;
    }
    const hasAny = (['ab', 'bc', 'ca', 'A', 'B', 'C'] as (keyof Known)[]).some(key => k[key] !== undefined);
    if (!hasAny) {
      if (flags.obtuse) { k.ab = 4; k.ca = 3; k.A = 120; notes.push('A açısı 120°, AB = 4 ve AC = 3 alındı.'); }
      else if (flags.scalene) { k.ab = 6; k.bc = 5; k.ca = 4; notes.push('Kenarlar 6, 5 ve 4 birim alındı.'); }
      else if (flags.acute) { k.ab = 5; k.bc = 4.5; k.ca = 4; notes.push('Kenarlar 5; 4,5 ve 4 birim alındı.'); }
      else if (height !== undefined) { k.ab = 4; k.bc = k.ca = Math.hypot(2, height); notes.push('Taban 4 birim alındı.'); }
      else { k.ab = k.bc = k.ca = 4; }
    }
  }

  let solved = complete(k, notes);
  if (solved.ab === undefined || solved.bc === undefined || solved.ca === undefined) {
    if (solved.A !== undefined && solved.B !== undefined && solved.C !== undefined) {
      const longest = 5 / Math.sin(toRad(Math.max(solved.A, solved.B, solved.C)));
      solved = { ...solved, bc: longest * Math.sin(toRad(solved.A)), ca: longest * Math.sin(toRad(solved.B)), ab: longest * Math.sin(toRad(solved.C)) };
      notes.push('En uzun kenar 5 birim alındı.');
    } else if (height !== undefined && solved.ab !== undefined && solved.A === undefined) {
      solved = complete({ ...solved, bc: Math.hypot(solved.ab / 2, height), ca: Math.hypot(solved.ab / 2, height) }, notes);
    } else {
      fail('Üçgenin ölçüleri eksik. Örneğin: “kenarları 3, 4 ve 5 olan üçgen”, “tabanı 6 yüksekliği 4 olan üçgen” ya da “açıları 30, 60 ve 90 derece olan üçgen” yazın.');
    }
  }
  const ab = solved.ab!, bc = solved.bc!, ca = solved.ca!;
  try { triangleCoordinates(ab, bc, ca); } catch (error) { fail(error instanceof Error ? error.message : 'Bu kenarlar üçgen oluşturmuyor.'); }
  validateType(ab, bc, ca, flags);
  return { ab, bc, ca, notes, explicit, flags, noun: triangleNoun(flags), ...(vertexNames === undefined && vnames.length ? { names: vnames } : {}) };
}

export function validateType(ab: number, bc: number, ca: number, f: TriangleFlags) {
  const sides = [ab, bc, ca].sort((x, y) => x - y);
  const eq = (x: number, y: number) => Math.abs(x - y) <= 1e-9 * Math.max(1, x, y);
  const max2 = sides[2] ** 2, rest = sides[0] ** 2 + sides[1] ** 2;
  const tol = 1e-9 * Math.max(1, max2);
  if (f.equilateral && !(eq(ab, bc) && eq(bc, ca))) fail('Eşkenar üçgenin üç kenarı eşit olmalı. Örneğin: “kenarı 5 olan eşkenar üçgen çiz”.');
  if (f.isosceles && !(eq(sides[0], sides[1]) || eq(sides[1], sides[2]))) fail('İkizkenar üçgenin iki kenarı eşit olmalı. Örneğin: “tabanı 6, yan kenarları 5 olan ikizkenar üçgen”.');
  if (f.right && Math.abs(max2 - rest) > Math.max(tol, 1e-7 * max2)) fail('Bu ölçüler dik üçgen oluşturmuyor: en uzun kenarın karesi, diğer iki kenarın karelerinin toplamına eşit olmalı (ör. 3, 4, 5).');
  if (f.scalene && (eq(sides[0], sides[1]) || eq(sides[1], sides[2]))) fail('Çeşitkenar üçgenin bütün kenarları farklı olmalı.');
  if (f.obtuse && !(max2 > rest + tol)) fail('Bu ölçüler geniş açılı üçgen oluşturmuyor: en uzun kenarın karesi diğer ikisinin karelerinin toplamından büyük olmalı.');
  if (f.acute && !(max2 < rest - tol)) fail('Bu ölçüler dar açılı üçgen oluşturmuyor: en uzun kenarın karesi diğer ikisinin karelerinin toplamından küçük olmalı.');
}

/** A(0,0), B(ab,0), C üstte */
export function triangleLocal(ab: number, bc: number, ca: number) {
  const c = triangleCoordinates(ab, bc, ca);
  return [{ x: 0, y: 0 }, { x: ab, y: 0 }, c];
}
