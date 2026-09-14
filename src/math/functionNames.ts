// Fonksiyon adları (f, g, h …) ve birbirini çağıran fonksiyonlar.
//
// Etiket biçimi "g(x) = x^2" olduğu sürece fonksiyonun adı etiketten okunur; böylece eski projeler de
// ek alan gerektirmeden çalışır. Adlı fonksiyonlar ayrıştırıcıya kaydedilir ve başka ifadelerde
// "f(5)", "g(x) = f(x) + 1", "a = f(2)" gibi kullanılabilir.

import type { FunctionObject, MathObject } from '@/types/math';
import { getUserFunctions, isUserFunctionNameAllowed, setUserFunctions } from './parser';

/** Yeni fonksiyonlara sırayla verilen adlar; hepsi doluysa f1, g1 … */
export const FUNCTION_NAME_SEQUENCE = ['f', 'g', 'h', 'p', 'q', 'r', 's', 'u', 'v', 'w'] as const;
const SEQUENCE_SET = new Set<string>(FUNCTION_NAME_SEQUENCE);

const LABEL_NAME_RE = /^\s*([A-Za-zÇĞİÖŞÜçğıöşü][A-Za-zÇĞİÖŞÜçğıöşü0-9]?)\s*\(\s*[xX]\s*\)\s*=/;
/** "f(", "g (" … : bir harf (ve isteğe bağlı rakam/harf) ardından parantez; "sin(" içindeki "in(" sayılmaz. */
const CALL_RE = /(?<![\p{L}\p{N}_])(\p{L}[\p{L}\p{N}]?)\s*\(/gu;

/** Etiketteki çağrılabilir ad: "g(x) = x^2" → "g"; "y = 2x + 1" ya da "Parabol" → undefined. */
export function functionNameOf(fn: Pick<FunctionObject, 'label'>): string | undefined {
  const m = LABEL_NAME_RE.exec(fn.label ?? '');
  if (!m) return undefined;
  const name = m[1].toLowerCase();
  return isUserFunctionNameAllowed(name) ? name : undefined;
}

export const functionLabel = (name: string, expression: string) => `${name}(x) = ${expression}`;

/** Fonksiyon ve kaydırıcıların kullandığı adlar (küçük harf). */
function usedNames(objects: readonly MathObject[], exceptId?: string): Set<string> {
  const used = new Set<string>();
  for (const o of objects) {
    if (o.id === exceptId) continue;
    if (o.type === 'function') {
      const name = functionNameOf(o);
      if (name) used.add(name);
    } else if (o.type === 'slider') {
      used.add(o.variableName.toLowerCase());
    }
  }
  return used;
}

/** Sıradaki boş fonksiyon adı: f, g, h, p … (kaydırıcı adlarıyla da çakışmaz). */
export function nextFunctionName(objects: readonly MathObject[], reserved: Iterable<string> = []): string {
  const used = usedNames(objects);
  for (const name of reserved) used.add(name.toLowerCase());
  for (const name of FUNCTION_NAME_SEQUENCE) if (!used.has(name)) return name;
  for (let i = 1; i <= 9; i++) {
    for (const name of FUNCTION_NAME_SEQUENCE) if (!used.has(`${name}${i}`)) return `${name}${i}`;
  }
  return 'f';
}

/** Bu adı kullanan başka bir fonksiyon ya da kaydırıcı. */
export function functionNameOwner(objects: readonly MathObject[], name: string, exceptId?: string): MathObject | undefined {
  const key = name.toLowerCase();
  return objects.find(o => o.id !== exceptId && (
    (o.type === 'function' && functionNameOf(o) === key) || (o.type === 'slider' && o.variableName.toLowerCase() === key)
  ));
}

/** İfadesi değişen fonksiyonun etiketi: adı korunur ("g(x) = …", "y = …"); adsızsa sıradaki boş ad verilir. */
export function relabelFunction(fn: FunctionObject, expression: string, objects: readonly MathObject[]): string {
  const name = functionNameOf(fn);
  if (name) return functionLabel(name, expression);
  if (/^\s*y\s*=/.test(fn.label)) return `y = ${expression}`;
  return functionLabel(nextFunctionName(objects.filter(o => o.id !== fn.id)), expression);
}

/**
 * Çağrılabilir fonksiyonlar: [ad, ifade]. Aynı ad iki kez varsa ilki geçerlidir.
 * Kaydırıcıyla aynı adı taşıyan fonksiyon çağrılamaz; eski projelerde "f(x) = f*x" gibi ifadeler bozulmasın.
 */
export function userFunctionDefinitions(objects: readonly MathObject[]): [string, string][] {
  const sliders = new Set(objects.flatMap(o => (o.type === 'slider' ? [o.variableName.toLowerCase()] : [])));
  const seen = new Set<string>();
  const definitions: [string, string][] = [];
  for (const o of objects) {
    if (o.type !== 'function') continue;
    const name = functionNameOf(o);
    if (!name || sliders.has(name) || seen.has(name)) continue;
    seen.add(name);
    definitions.push([name, o.expression]);
  }
  return definitions;
}

/** Ayrıştırıcıdaki fonksiyon tablosunu bu nesnelere eşitler (değişiklik yoksa iş yapmaz). */
export function syncUserFunctions(objects: readonly MathObject[]): void {
  setUserFunctions(userFunctionDefinitions(objects));
}

/** Geçici olarak bu nesnelerin fonksiyonlarıyla çalışır, sonra önceki tabloyu geri yükler. */
export function withUserFunctions<T>(objects: readonly MathObject[], run: () => T): T {
  const previous = getUserFunctions();
  syncUserFunctions(objects);
  try {
    return run();
  } finally {
    setUserFunctions(previous);
  }
}

/** İfadede parantezle çağrılan adlar (küçük harf): "f(x) + 2g(1) + sin(x)" → ["f", "g"]. */
export function calledNames(expression: string): string[] {
  const names = new Set<string>();
  for (const m of expression.matchAll(CALL_RE)) {
    const name = m[1].toLowerCase();
    if (isUserFunctionNameAllowed(name)) names.add(name);
  }
  return [...names];
}

/**
 * name(x) = expression tanımı döngü kurar mı? ("f(x) = f(x) + 1", f → g → f)
 * Kurarsa zinciri döndürür: ["f", "g", "f"]; kurmazsa null.
 */
export function functionDefinitionCycle(objects: readonly MathObject[], name: string, expression: string): string[] | null {
  const start = name.toLowerCase();
  const definitions = new Map(userFunctionDefinitions(objects));
  definitions.set(start, expression);
  const visited = new Set<string>();
  const visit = (current: string, path: string[]): string[] | null => {
    for (const called of calledNames(definitions.get(current) ?? '')) {
      if (called === start) return [...path, called];
      if (!definitions.has(called) || visited.has(called)) continue;
      visited.add(called);
      const found = visit(called, [...path, called]);
      if (found) return found;
    }
    return null;
  };
  return visit(start, [start]);
}

/**
 * Tanımsız fonksiyon çağrıları: "g(x) = h(x) + 1" yazıldı ama h fonksiyonu da h kaydırıcısı da yok.
 * Yalnızca fonksiyon adı dizisindeki adlar (f, g, h, p …) denetlenir; "a(x + 1)" kaydırıcı çarpımı olarak kalır.
 */
export function undefinedFunctionCalls(objects: readonly MathObject[], expression: string, selfName?: string): string[] {
  const used = usedNames(objects);
  const self = selfName?.toLowerCase();
  return calledNames(expression).filter(name =>
    name !== self && !used.has(name) && SEQUENCE_SET.has(name.replace(/[0-9]$/, ''))
  );
}
