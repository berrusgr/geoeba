import type { SliderObject } from '@/types/math';
import { calledUserFunctions, evaluateNumericInput, extractVariableNames, getUserFunctions, validateMathExpression } from '@/math/parser';
import { calledNames, functionNameOwner } from '@/math/functionNames';
import type { CommandHandler } from '../../types';
import { type Clause, fold } from '../../text';
import { type CommandScene, fail, skip, trNum } from '../../scene';

// ---------------------------------------------------------------------------
// f(5) kaç, f(2) + g(1) hesapla, f'nin 3'teki değeri, x = 2 iken f kaç, 2^10 kaç
// ---------------------------------------------------------------------------

const HAS_QUOTE = /["“”«»„]/;
/** Soruyu ya da hesap isteğini bitiren sözcükler (katlanmış); ayrı yazılmış ekler ("f(5) in değeri") de atılır. */
const ASK_WORD = /^(?:kac|kactir|kacdir|nedir|ne|neye|hesapla\w*|bul\w*|soyle\w*|goster\w*|yaz\w*|ver\w*|deger\w*|sonuc\w*|esit\w*|mi|midir|mu|lutfen|acaba|olur|eder|tutar|[ny]?[iu]n?)$/;
const NUM = String.raw`-?\d+(?:[.,]\d+)?`;
/** "f'nin 3'teki değeri", "f fonksiyonunun x = 3 için değeri", "g(x)'in 2 noktasındaki değeri" → "f(3) değeri". */
const AT_VALUE = new RegExp(
  String.raw`^\s*(\p{L}[\p{L}\p{N}]?)(?:\s*\(\s*x\s*\))?(?:\s*['’]?\s*n?[ıiuü]n|\s+fonksiyonunun)\s+(?:x\s*=\s*)?(${NUM})\s*(?:['’]?\s*[dt][ae]ki|\s+için|\s+noktasındaki|\s+iken)\s+(.*)$`,
  'iu',
);
/** "x = 2 iken f kaç", "x 2 için g(x) nedir" → "f(2) kaç". */
const WHEN_X = new RegExp(
  String.raw`^\s*x\s*=?\s*(${NUM})\s*(?:için|iken|olduğunda|olunca|ise)\s*,?\s*(\p{L}[\p{L}\p{N}]?)(?:\s*\(\s*x\s*\))?(?:\s*['’]?\s*n?[ıiuü]n)?\s+(.*)$`,
  'iu',
);

interface Query {
  expression: string;
  asked: boolean;
  calls: string[];
  missing: string[];
  valid: boolean;
}

function sliderScope(scene: CommandScene): Record<string, number> {
  const scope: Record<string, number> = {};
  for (const s of scene.sliders()) scope[s.variableName] = s.value;
  return scope;
}

function readQuery(c: Clause, scene: CommandScene): Query | null {
  if (c.definition || c.assignment || HAS_QUOTE.test(c.raw)) return null;
  let text = c.raw.trim();
  let asked = /\?\s*$/.test(text);
  text = text.replace(/[?!.…]+\s*$/u, '').trim();
  const at = AT_VALUE.exec(text);
  const when = at ? null : WHEN_X.exec(text);
  if (at) { text = `${at[1]}(${at[2]}) ${at[3]}`; asked = true; }
  else if (when) { text = `${when[2]}(${when[1]}) ${when[3]}`; asked = true; }
  const tokens = text.split(/\s+/).filter(Boolean);
  while (tokens.length > 1 && /^[\p{L}'’]+$/u.test(tokens[tokens.length - 1]) && ASK_WORD.test(fold(tokens[tokens.length - 1].replace(/['’]/g, '')))) {
    tokens.pop();
    asked = true;
  }
  let expression = tokens.join(' ');
  if (/=\s*$/.test(expression)) { expression = expression.replace(/\s*=\s*$/, ''); asked = true; }
  // "f(5)'in", "f(5)'i" → f(5)
  expression = expression.replace(/\)\s*['’]\s*\p{L}+$/u, ')').trim();
  if (!expression || /(?<![\p{L}])x(?![\p{L}])/iu.test(expression)) return null;
  const valid = validateMathExpression(expression, Object.keys(sliderScope(scene))).ok;
  // Tanımsız çağrı: fonksiyonu da kaydırıcısı da olmayan ad ("k(5) kaç" ama k yok)
  const missing = calledNames(expression).filter(name => !functionNameOwner(scene.objects, name));
  return { expression, asked, calls: calledUserFunctions(expression), missing, valid };
}

/** Sonucu etkileyen kaydırıcılar: ifadede ve çağrılan fonksiyonların gövdelerinde geçenler. */
function slidersUsed(expression: string, scene: CommandScene): SliderObject[] {
  const bodies = new Map(getUserFunctions());
  const names = new Set<string>();
  const seen = new Set<string>();
  const visit = (text: string) => {
    for (const name of extractVariableNames(text)) names.add(name);
    for (const called of calledUserFunctions(text)) {
      if (seen.has(called)) continue;
      seen.add(called);
      visit(bodies.get(called) ?? '');
    }
  };
  visit(expression);
  return scene.sliders().filter(s => names.has(s.variableName));
}

const TRIG_CALL = /(?<![\p{L}])(sin|cos|tan)\s*\(/gu;

export const evaluateHandler: CommandHandler = {
  id: 'algebra.function.evaluate',
  examples: ['f(5) kaç', 'f(2) + g(1) hesapla', 'f(3) değerini bul', "f'nin 4'teki değeri nedir", 'x = 2 iken f kaç', '2^10 kaç'],
  match(c, scene) {
    const q = readQuery(c, scene);
    if (!q) return 0;
    if (q.valid && q.calls.length) return q.asked ? 63 : 52;
    // "h(5) kaç" ama h yok: açıklamayla reddet
    if (!q.valid && q.asked && q.missing.length && /^\s*\p{L}[\p{L}\p{N}]?\s*\(/u.test(q.expression)) return 56;
    // Hesap makinesi: "2^10 kaç", "3 + 4 * 2 hesapla", "sqrt(2) nedir"
    if (q.valid && q.asked && /\d/.test(q.expression) && /[-+*/^√]|\p{L}{2,}\s*\(/u.test(q.expression)) return 57;
    return 0;
  },
  run(c, scene) {
    const q = readQuery(c, scene) ?? skip();
    if (!q.valid && q.missing.length) {
      const name = q.missing[0];
      fail(`${name}(x) tanımlı değil. Önce fonksiyonu tanımlayın (ör. “${name}(x) = x^2”), sonra “${name}(5) kaç” diye sorun.`);
    }
    if (!q.valid) skip();
    let expression = q.expression;
    let note = '';
    // Sınıfta "sin(30) kaç" derece demektir; kullanıcı fonksiyonlarının gövdesi olduğu gibi kalır.
    if (!q.calls.length && TRIG_CALL.test(expression) && !/pi|π/i.test(expression)) {
      expression = expression.replace(TRIG_CALL, '$1d(');
      note = ' (açılar derece)';
    }
    TRIG_CALL.lastIndex = 0;
    const result = evaluateNumericInput(expression, sliderScope(scene));
    if (!result.ok) {
      fail(`${q.expression} hesaplanamadı: ${result.error === 'Bu ifade bir sayıya eşit değil.' ? 'sonuç tanımsız (sıfıra bölme ya da tanım kümesi dışında bir değer).' : result.error}`);
    }
    const sliders = slidersUsed(q.expression, scene);
    const when = sliders.length ? ` (${sliders.map(s => `${s.variableName} = ${trNum(s.value)}`).join(', ')} iken)` : '';
    scene.say(`${q.expression} = ${trNum(result.value)}${note}${when}.`);
  },
};

export const evaluateHandlers: CommandHandler[] = [evaluateHandler];
