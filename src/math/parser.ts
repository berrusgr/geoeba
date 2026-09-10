// Güvenli ve Deterministik Matematik İfade Ayrıştırıcı (AST / Recursive Descent Parser)
// eval() veya new Function() KULLANILMAZ.
//
// Öncelik sırası (düşükten yükseğe):
//   1. Toplama / çıkarma        (+, -)
//   2. Çarpma / bölme           (*, /) ve örtük çarpım ("2x", "x sin(x)", "(x+1)(x-1)")
//   3. Birli işaret             (-x, +x)  -> "-x^2" = -(x^2)
//   4. Üs alma                  (^)       -> sağdan birleşmeli, sağ taraf birli işaret alabilir ("2^-1")
//   5. Sayı, değişken, fonksiyon çağrısı, parantez
//
// Sayı biçimleri: 12, 3.5, .5, "0,5" (Türkçe ondalık virgül) ve bilimsel gösterim (1e3, 2e-3, 6.02e23).

export type MathScope = Record<string, number>;

type TokenType = 'NUMBER' | 'IDENT' | 'OPERATOR' | 'LPAREN' | 'RPAREN' | 'COMMA' | 'PIPE';

interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

type ASTNode =
  | { type: 'Literal'; value: number }
  | { type: 'Identifier'; name: string }
  | { type: 'UnaryExpression'; operator: '-' | '+'; argument: ASTNode }
  | { type: 'BinaryExpression'; operator: '+' | '-' | '*' | '/' | '^'; left: ASTNode; right: ASTNode }
  | { type: 'CallExpression'; name: string; args: ASTNode[] };

interface MathFunctionDef {
  arity: number;
  fn: (...args: number[]) => number;
}

const DEG = Math.PI / 180;

/** Ayrıştırılabilecek en uzun ifade. Hem yapıştırılan devasa metinleri hem de derin özyinelemeyi engeller. */
const MAX_EXPRESSION_LENGTH = 512;

/**
 * Prototip zinciri olmayan (Object.create(null)) tablolar:
 * "__proto__", "constructor", "toString" gibi adlar asla bir fonksiyon/sabit olarak çözümlenmez.
 */
function nullTable<T>(entries: Record<string, T>): Record<string, T> {
  const table: Record<string, T> = Object.create(null);
  for (const key of Object.keys(entries)) {
    table[key] = entries[key];
  }
  return table;
}

const hasOwn = (obj: object, key: string): boolean => Object.prototype.hasOwnProperty.call(obj, key);

const MATH_FUNCTIONS: Record<string, MathFunctionDef> = nullTable({
  // Trigonometri (radyan)
  sin: { arity: 1, fn: (x) => Math.sin(x) },
  cos: { arity: 1, fn: (x) => Math.cos(x) },
  tan: { arity: 1, fn: (x) => Math.tan(x) },
  asin: { arity: 1, fn: (x) => Math.asin(x) },
  acos: { arity: 1, fn: (x) => Math.acos(x) },
  atan: { arity: 1, fn: (x) => Math.atan(x) },
  // Trigonometri (derece)
  sind: { arity: 1, fn: (x) => Math.sin(x * DEG) },
  cosd: { arity: 1, fn: (x) => Math.cos(x * DEG) },
  tand: { arity: 1, fn: (x) => Math.tan(x * DEG) },
  // Kök, mutlak değer, üstel, logaritma
  sqrt: { arity: 1, fn: (x) => (x < 0 ? NaN : Math.sqrt(x)) },
  kok: { arity: 1, fn: (x) => (x < 0 ? NaN : Math.sqrt(x)) }, // Türkçe takma ad
  cbrt: { arity: 1, fn: (x) => Math.cbrt(x) },
  kupkok: { arity: 1, fn: (x) => Math.cbrt(x) }, // Türkçe takma ad
  abs: { arity: 1, fn: (x) => Math.abs(x) },
  mutlak: { arity: 1, fn: (x) => Math.abs(x) }, // Türkçe takma ad
  exp: { arity: 1, fn: (x) => Math.exp(x) },
  ln: { arity: 1, fn: (x) => (x <= 0 ? NaN : Math.log(x)) },
  log: { arity: 1, fn: (x) => (x <= 0 ? NaN : Math.log10(x)) },
  // Yuvarlama
  floor: { arity: 1, fn: (x) => Math.floor(x) },
  ceil: { arity: 1, fn: (x) => Math.ceil(x) },
  round: { arity: 1, fn: (x) => Math.round(x) },
  // Çok argümanlı
  min: { arity: 2, fn: (a, b) => Math.min(a, b) },
  max: { arity: 2, fn: (a, b) => Math.max(a, b) },
  pow: { arity: 2, fn: (a, b) => Math.pow(a, b) },
});

const MULTI_ARG_FUNCTION_NAMES = Object.keys(MATH_FUNCTIONS).filter((k) => MATH_FUNCTIONS[k].arity > 1);

const MATH_CONSTANTS: Record<string, number> = nullTable({
  pi: Math.PI,
  e: Math.E,
});

/** Değişken adı olarak kabul edilen biçim: 1-2 karakter, harfle başlar (x, y, t, a, b, m, k1, a2 ...). */
const VARIABLE_NAME_RE = /^[a-zçğıöşü][a-zçğıöşü0-9]?$/;

/** Ön işleme aşamasında tanımlayıcı karakterleri (büyük harfler henüz küçültülmemiştir). */
const IDENT_CHAR = /[a-zA-Z0-9çğıöşüÇĞİÖŞÜ_]/;

export class MathParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MathParseError';
  }
}

/** Verilen "(" karakteri çok argümanlı bir fonksiyon çağrısına mı ait? (max(, min(, pow( ) */
function isMultiArgCallParen(s: string, parenIndex: number): boolean {
  let j = parenIndex - 1;
  while (j >= 0 && /\s/.test(s[j])) j--;
  const end = j + 1;
  while (j >= 0 && IDENT_CHAR.test(s[j])) j--;
  const name = s.slice(j + 1, end).toLowerCase();
  return name !== '' && MULTI_ARG_FUNCTION_NAMES.includes(name);
}

/**
 * Bu parantezin kendi argüman listesinde ";" ayırıcısı kullanılmış mı?
 * Kullanılmışsa aynı seviyedeki virgüller ondalık ayırıcıdır: "max(0,5; x)" -> max(0.5, x).
 */
function callUsesSemicolonSeparator(s: string, parenIndex: number): boolean {
  let depth = 0;
  for (let i = parenIndex + 1; i < s.length; i++) {
    const ch = s[i];
    if (ch === '(') depth++;
    else if (ch === ')') {
      if (depth === 0) return false;
      depth--;
    } else if (ch === ';' && depth === 0) return true;
  }
  return false;
}

/**
 * Türkçe ondalık virgülünü noktaya çevirir ("0,5" -> "0.5").
 * Çok argümanlı bir fonksiyonun ARGÜMAN LİSTESİ içindeki virgüller ayırıcı olarak korunur:
 *   "max(x, 1) + 0,5" -> "max(x, 1) + 0.5"   (çağrının dışındaki virgül ondalıktır)
 *   "sin(1,2)"        -> "sin(1.2)"          (tek argümanlı fonksiyon)
 *   "max(1, 2)"       -> değişmez            (argüman ayırıcı)
 * Çok argümanlı bir çağrının içinde ondalık gerekiyorsa argümanlar ";" ile ayrılır: "max(0,5; x)".
 */
function normalizeDecimalCommas(s: string): string {
  const argListStack: boolean[] = [];
  let out = '';

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];

    if (ch === '(') {
      // ";" ile ayrılmış bir çağrıda virgüller yeniden ondalık ayırıcı olur.
      argListStack.push(isMultiArgCallParen(s, i) && !callUsesSemicolonSeparator(s, i));
      out += ch;
      continue;
    }
    if (ch === ')') {
      argListStack.pop();
      out += ch;
      continue;
    }
    if (ch === ',') {
      const inArgList = argListStack.length > 0 && argListStack[argListStack.length - 1];
      if (!inArgList) {
        const before = out.replace(/\s+$/, '');
        let j = i + 1;
        while (j < s.length && /\s/.test(s[j])) j++;
        // Yalnızca iki rakam arasındaki virgül ondalık ayırıcıdır.
        if (/[0-9]$/.test(before) && j < s.length && /[0-9]/.test(s[j])) {
          out = before + '.';
          i = j - 1;
          continue;
        }
      }
      out += ch;
      continue;
    }

    out += ch;
  }

  return out;
}

/**
 * Ön işleme: Unicode matematik sembollerini ve Türkçe ondalık virgülünü normalize eder.
 *  ² -> ^2, ³ -> ^3, π -> pi, × -> *, ÷ -> /, − -> -
 *  √(x) -> sqrt(x), √9 -> sqrt(9), √x -> sqrt(x), √sin(x) -> sqrt(sin(x))
 *  "0,5" -> "0.5" (çok argümanlı bir çağrının argüman listesi dışında)
 */
function preprocess(input: string): string {
  const s = input
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/π/gi, 'pi')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/[−–]/g, '-')
    // √: önce parantezli biçim, sonra sayı / fonksiyon çağrısı / değişken biçimleri
    .replace(/√\s*\(/g, 'sqrt(')
    .replace(
      /√\s*([0-9]+(?:[.,][0-9]+)?|[a-zA-ZçğıöşüÇĞİÖŞÜ_][a-zA-Z0-9çğıöşüÇĞİÖŞÜ_]*\s*\([^()]*\)|[a-zA-ZçğıöşüÇĞİÖŞÜ_][a-zA-Z0-9çğıöşüÇĞİÖŞÜ_]*)/g,
      'sqrt($1)'
    )
    // Eşleşmeyen √ (örn. "√-4"): bitişik tanımlayıcı ("sqrt-4") üretmemek için boşlukla ayrılır
    .replace(/√/g, 'sqrt ');

  return normalizeDecimalCommas(s);
}

/**
 * Kullanıcı girdisini token dizisine dönüştürür. Boşluklar ayırıcıdır ("x sin(x)" -> x, sin, (, x, )).
 * Bilinmeyen karakterler hata üretir.
 */
function tokenize(rawInput: string): Token[] {
  const input = preprocess(rawInput).toLowerCase();
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Sayı: 12, 3.5, .5 ve bilimsel gösterim: 1e3, 2e-3, 6.02e23
    if (/[0-9.]/.test(ch)) {
      const start = i;
      let numStr = '';
      let dotCount = 0;
      while (i < input.length && /[0-9.]/.test(input[i])) {
        if (input[i] === '.') dotCount++;
        numStr += input[i];
        i++;
      }
      if (dotCount > 1 || numStr === '.') {
        throw new MathParseError(`Geçersiz sayı: "${numStr}"`);
      }

      // Bilimsel gösterim eki: işaret isteğe bağlı, üstelde en az bir rakam zorunlu.
      // ("2e" ve "3e - 2" hâlâ e sabiti ile örtük çarpım olarak kalır.)
      if (input[i] === 'e') {
        let j = i + 1;
        if (input[j] === '+' || input[j] === '-') j++;
        const digitsStart = j;
        while (j < input.length && /[0-9]/.test(input[j])) j++;
        if (j > digitsStart) {
          numStr += input.slice(i, j);
          i = j;
          if (input[i] === '.') {
            throw new MathParseError(`Geçersiz sayı: "${numStr}."`);
          }
        }
      }

      tokens.push({ type: 'NUMBER', value: numStr, pos: start });
      continue;
    }

    // Tanımlayıcı (değişken, fonksiyon, sabit)
    if (/[a-zçğıöşü_]/.test(ch)) {
      const start = i;
      let ident = '';
      while (i < input.length && /[a-zçğıöşü0-9_]/.test(input[i])) {
        ident += input[i];
        i++;
      }
      tokens.push({ type: 'IDENT', value: ident, pos: start });
      continue;
    }

    if (ch === '(') {
      tokens.push({ type: 'LPAREN', value: ch, pos: i });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'RPAREN', value: ch, pos: i });
      i++;
      continue;
    }
    // ";" de argüman ayırıcıdır: "max(0,5; x)" gibi ondalıklı çağrılar yazılabilsin diye.
    if (ch === ',' || ch === ';') {
      tokens.push({ type: 'COMMA', value: ch, pos: i });
      i++;
      continue;
    }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '^') {
      tokens.push({ type: 'OPERATOR', value: ch, pos: i });
      i++;
      continue;
    }
    // Mutlak değer çubuğu: |x-2| -> abs(x-2). Aynı karakter hem açar hem kapatır;
    // hangisi olduğuna ayrıştırıcı bağlama göre karar verir (bkz. parsePrimary / startsFactor).
    if (ch === '|') {
      tokens.push({ type: 'PIPE', value: ch, pos: i });
      i++;
      continue;
    }

    // NOT: Ön işleme dizenin uzunluğunu değiştirdiği için ham girdi indekslenmez;
    // her zaman ön işlenmiş dizedeki karakter gösterilir.
    throw new MathParseError(`Geçersiz karakter: "${ch}"`);
  }

  return tokens;
}

/**
 * Token listesinden Abstract Syntax Tree (AST) oluşturur.
 * knownVariables verilirse, bu kümede olmayan değişken adları ayrıştırma hatası üretir.
 */
class ExpressionParser {
  private readonly tokens: Token[];
  private readonly knownVariables: ReadonlySet<string> | null;
  private pos = 0;
  /**
   * Açık olan mutlak değer çubuğu sayısı. "|" hem açma hem kapatma görevi gördüğü için,
   * bir çubuğun içindeyken karşılaşılan "|" kapatma sayılır (örtük çarpım başlatmaz).
   * Böylece "|x|+|x-1|" doğru, "2|x|" ise örtük çarpım olarak ayrıştırılır.
   */
  private absDepth = 0;

  constructor(tokens: Token[], knownVariables?: ReadonlySet<string> | null) {
    this.tokens = tokens;
    this.knownVariables = knownVariables ?? null;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private isOperator(values: string[]): boolean {
    const t = this.peek();
    return !!t && t.type === 'OPERATOR' && values.includes(t.value);
  }

  private consume(): Token {
    const token = this.tokens[this.pos];
    if (!token) {
      throw new MathParseError('İfade eksik: beklenmedik şekilde sona erdi.');
    }
    this.pos++;
    return token;
  }

  private expect(type: TokenType, description: string): Token {
    const token = this.peek();
    if (!token) {
      throw new MathParseError(`İfade eksik: ${description} bekleniyordu.`);
    }
    if (token.type !== type) {
      throw new MathParseError(`${description} bekleniyordu, "${token.value}" bulundu.`);
    }
    this.pos++;
    return token;
  }

  public parse(): ASTNode {
    if (this.tokens.length === 0) {
      throw new MathParseError('İfade boş olamaz.');
    }
    const node = this.parseAdditive();
    const rest = this.peek();
    if (rest) {
      if (rest.type === 'RPAREN') {
        throw new MathParseError('Fazladan kapatma parantezi ")" var.');
      }
      throw new MathParseError(`Beklenmeyen simge: "${rest.value}"`);
    }
    return node;
  }

  // + ve -
  private parseAdditive(): ASTNode {
    let node = this.parseMultiplicative();
    while (this.isOperator(['+', '-'])) {
      const op = this.consume().value as '+' | '-';
      const right = this.parseMultiplicative();
      node = { type: 'BinaryExpression', operator: op, left: node, right };
    }
    return node;
  }

  // Bir çarpanın başlangıcı olabilecek token (örtük çarpım için)
  private startsFactor(): boolean {
    const t = this.peek();
    if (!t) return false;
    if (t.type === 'NUMBER' || t.type === 'IDENT' || t.type === 'LPAREN') return true;
    // "|" yalnızca açık bir mutlak değer yokken yeni bir çarpan başlatabilir ("2|x|").
    // Açık çubuk varsa bu "|" kapatma çubuğudur ("|x|" içindeki ikinci çubuk gibi).
    return t.type === 'PIPE' && this.absDepth === 0;
  }

  // *, / ve örtük çarpım
  private parseMultiplicative(): ASTNode {
    let node = this.parseUnary();
    for (;;) {
      if (this.isOperator(['*', '/'])) {
        const op = this.consume().value as '*' | '/';
        const right = this.parseUnary();
        node = { type: 'BinaryExpression', operator: op, left: node, right };
      } else if (this.startsFactor()) {
        const next = this.peek()!;
        // "2 3" gibi yan yana iki sayı örtük çarpım sayılmaz: kullanıcı büyük olasılıkla
        // "23" ya da "2*3" yazmak istemiştir. Sessizce 6 üretmek yerine açık hata verilir.
        if (next.type === 'NUMBER') {
          const prev = this.tokens[this.pos - 1]?.value ?? '';
          throw new MathParseError(
            `İşlem işareti eksik: "${prev} ${next.value}". Çarpma için "*" yazın (örn. "2*3").`
          );
        }
        // Örtük çarpım: 2x, 2 pi, x sin(x), x(x+1), (x+1)(x-1)
        const right = this.parseUnary();
        node = { type: 'BinaryExpression', operator: '*', left: node, right };
      } else {
        return node;
      }
    }
  }

  // Birli işaret: -x^2 = -(x^2)
  private parseUnary(): ASTNode {
    if (this.isOperator(['+', '-'])) {
      const op = this.consume().value as '+' | '-';
      const argument = this.parseUnary();
      return { type: 'UnaryExpression', operator: op, argument };
    }
    return this.parsePower();
  }

  // ^ (sağdan birleşmeli; sağ taraf birli işaret alabilir: 2^-1, 2^3^2 = 2^(3^2))
  private parsePower(): ASTNode {
    const base = this.parsePrimary();
    if (this.isOperator(['^'])) {
      this.consume();
      const exponent = this.parseUnary();
      return { type: 'BinaryExpression', operator: '^', left: base, right: exponent };
    }
    return base;
  }

  // Sayı, değişken/sabit, fonksiyon çağrısı, parantez
  private parsePrimary(): ASTNode {
    const token = this.peek();
    if (!token) {
      throw new MathParseError('İfade eksik: sayı, değişken veya parantez bekleniyordu.');
    }

    if (token.type === 'NUMBER') {
      this.consume();
      const value = parseFloat(token.value);
      if (!Number.isFinite(value)) {
        throw new MathParseError(`Geçersiz sayı: "${token.value}"`);
      }
      return { type: 'Literal', value };
    }

    if (token.type === 'IDENT') {
      this.consume();
      const name = token.value;

      if (hasOwn(MATH_FUNCTIONS, name)) {
        const def = MATH_FUNCTIONS[name];
        const next = this.peek();
        if (!next || next.type !== 'LPAREN') {
          throw new MathParseError(`"${name}" bir fonksiyondur; parantez ile kullanın: ${name}(x)`);
        }
        this.consume(); // (
        const args: ASTNode[] = [];
        if (this.peek()?.type === 'RPAREN') {
          throw new MathParseError(`"${name}" fonksiyonu için argüman girilmedi.`);
        }
        args.push(this.parseAdditive());
        while (this.peek()?.type === 'COMMA') {
          this.consume();
          args.push(this.parseAdditive());
        }
        this.expect('RPAREN', 'Kapatma parantezi ")"');
        if (args.length !== def.arity) {
          const hint =
            args.length > def.arity
              ? ` Ondalık sayı yazdıysanız argümanları ";" ile ayırın (örn. ${name}(0,5; x)).`
              : '';
          throw new MathParseError(
            `"${name}" fonksiyonu ${def.arity} argüman alır, ${args.length} argüman verildi.${hint}`
          );
        }
        return { type: 'CallExpression', name, args };
      }

      if (hasOwn(MATH_CONSTANTS, name)) {
        return { type: 'Identifier', name };
      }

      if (VARIABLE_NAME_RE.test(name)) {
        // Bilinen adlar verilmişse tanımsız değişken sessizce NaN üretmez, açık hata verir.
        if (this.knownVariables && !this.knownVariables.has(name)) {
          throw new MathParseError(
            `Tanımsız değişken: "${name}". Kullanılabilir: ${[...this.knownVariables].join(', ')}`
          );
        }
        return { type: 'Identifier', name };
      }

      throw new MathParseError(
        `Bilinmeyen ifade: "${name}". Değişkenler tek harf (x, a, b ...) olmalı; fonksiyonlar: sin, cos, tan, sqrt, abs, ln, log ... Mutlak değer için |x-2| de yazabilirsiniz.`
      );
    }

    if (token.type === 'LPAREN') {
      this.consume();
      const expr = this.parseAdditive();
      this.expect('RPAREN', 'Kapatma parantezi ")"');
      return expr;
    }

    // Mutlak değer: |x-2| -> abs(x-2), iç içe de yazılabilir: ||x|-1|
    if (token.type === 'PIPE') {
      this.consume();
      this.absDepth++;
      try {
        // Buradaki ikinci bir "|" boş bir mutlak değer DEĞİL, iç içe bir mutlak değerin
        // açılışıdır ("||x|-1|"). Gerçekten boş olan "||" durumunu parseAdditive yakalar.
        const expr = this.parseAdditive();
        const closing = this.peek();
        if (!closing || closing.type !== 'PIPE') {
          throw new MathParseError('Mutlak değer kapatılmamış: "|" çubuğunu kapatın (örn. |x-2|).');
        }
        this.consume();
        return { type: 'CallExpression', name: 'abs', args: [expr] };
      } finally {
        this.absDepth--;
      }
    }

    if (token.type === 'RPAREN') {
      throw new MathParseError('Açılmamış bir kapatma parantezi ")" var.');
    }

    if (token.type === 'COMMA') {
      throw new MathParseError('Beklenmeyen virgül. Ondalık için "0,5" veya "0.5" kullanın.');
    }

    throw new MathParseError(`Beklenmeyen simge: "${token.value}"`);
  }
}

/**
 * Üs alma. Negatif tabanlı, tek paydalı rasyonel üsler gerçek kökü döndürür:
 *   (-8)^(1/3) = -2, (-8)^(2/3) = 4, (-8)^(-1/3) = -0,5
 * Çift paydalı üsler (ör. (-8)^(1/2), (-16)^(1/4)) gerçek sayılarda tanımsızdır: NaN.
 */
function power(base: number, exponent: number): number {
  if (base < 0 && Number.isFinite(exponent) && !Number.isInteger(exponent)) {
    for (let q = 3; q <= 99; q += 2) {
      const p = exponent * q;
      if (Math.abs(p - Math.round(p)) < 1e-9) {
        const sign = Math.abs(Math.round(p)) % 2 === 1 ? -1 : 1;
        return sign * Math.pow(-base, exponent);
      }
    }
  }
  return Math.pow(base, exponent);
}

/**
 * AST düğümünü verilen değişken değerleri (scope) ile deterministik olarak hesaplar.
 */
function evaluateAST(node: ASTNode, scope: MathScope): number {
  switch (node.type) {
    case 'Literal':
      return node.value;

    case 'Identifier': {
      const name = node.name;
      if (hasOwn(scope, name)) {
        const v = scope[name];
        return typeof v === 'number' ? v : NaN;
      }
      if (hasOwn(MATH_CONSTANTS, name)) {
        return MATH_CONSTANTS[name];
      }
      return NaN;
    }

    case 'UnaryExpression': {
      const val = evaluateAST(node.argument, scope);
      return node.operator === '-' ? -val : val;
    }

    case 'BinaryExpression': {
      const left = evaluateAST(node.left, scope);
      const right = evaluateAST(node.right, scope);
      switch (node.operator) {
        case '+':
          return left + right;
        case '-':
          return left - right;
        case '*':
          return left * right;
        case '/':
          return right === 0 ? NaN : left / right;
        case '^':
          return power(left, right);
        default:
          return NaN;
      }
    }

    case 'CallExpression': {
      if (!hasOwn(MATH_FUNCTIONS, node.name)) return NaN;
      const def = MATH_FUNCTIONS[node.name];
      const evaluatedArgs = node.args.map((arg) => evaluateAST(arg, scope));
      return def.fn(...evaluatedArgs);
    }

    default:
      return NaN;
  }
}

/**
 * "x", "pi" ve "e" her zaman tanımlıdır; ek olarak verilen adlar (ör. kaydırıcı değişkenleri) eklenir.
 * Ad listesi verilmemişse null döner ve ayrıştırıcı geriye dönük uyumlu (izin veren) modda çalışır.
 */
function buildKnownVariableSet(names?: readonly string[] | null): ReadonlySet<string> | null {
  if (!names) return null;
  const set = new Set<string>(['x', 'pi', 'e']);
  for (const name of names) {
    if (typeof name === 'string' && name.trim() !== '') {
      set.add(name.trim().toLowerCase());
    }
  }
  return set;
}

/**
 * İfadeyi ayrıştırır; hatalıysa Türkçe mesajlı MathParseError fırlatır.
 */
function parseMathExpression(
  expressionString: string,
  knownVariables?: readonly string[] | null
): ASTNode {
  if (typeof expressionString !== 'string' || expressionString.trim() === '') {
    throw new MathParseError('İfade boş olamaz.');
  }
  if (expressionString.length > MAX_EXPRESSION_LENGTH) {
    throw new MathParseError(`İfade çok uzun (en fazla ${MAX_EXPRESSION_LENGTH} karakter).`);
  }
  const tokens = tokenize(expressionString);
  return new ExpressionParser(tokens, buildKnownVariableSet(knownVariables)).parse();
}

/**
 * İfadenin geçerliliğini denetler. Kullanıcı arayüzünde satır içi hata göstermek için kullanılır.
 *
 * knownVariables (isteğe bağlı): kullanılabilir değişken adları, ör. mevcut kaydırıcı adları.
 * Verilirse "x2", "y" gibi tanımsız adlar sessizce geçerli sayılmaz, Türkçe hata döner.
 * Verilmezse davranış geriye dönük uyumludur (1-2 karakterlik her ad kabul edilir).
 */
export function validateMathExpression(
  expr: string,
  knownVariables?: readonly string[] | null
): { ok: true } | { ok: false; error: string } {
  try {
    parseMathExpression(expr, knownVariables);
    return { ok: true };
  } catch (err) {
    // Yalnızca Türkçe ayrıştırma hataları gösterilir; iç hatalar (RangeError vb.) kullanıcıya sızmaz.
    return {
      ok: false,
      error: err instanceof MathParseError ? err.message : 'İfade çok karmaşık veya geçersiz.',
    };
  }
}

/**
 * Matematiksel ifadeyi güvenli bir fonksiyona derler.
 * f(x, { a: 2, b: 3 }) şeklinde çalıştırılabilir.
 * Derleme hatasında null döner; döndürülen fonksiyon hiçbir zaman fırlatmaz (hata -> NaN).
 *
 * knownVariables (isteğe bağlı): bkz. validateMathExpression.
 */
export function compileMathExpression(
  expressionString: string,
  knownVariables?: readonly string[] | null
): ((x: number, scope?: MathScope) => number) | null {
  let ast: ASTNode;
  try {
    ast = parseMathExpression(expressionString, knownVariables);
  } catch {
    return null;
  }

  return (x: number, scope?: MathScope) => {
    try {
      const fullScope: MathScope = Object.create(null);
      if (scope) {
        for (const key of Object.keys(scope)) {
          fullScope[key] = scope[key];
        }
      }
      fullScope.x = x;
      const result = evaluateAST(ast, fullScope);
      return typeof result === 'number' ? result : NaN;
    } catch {
      return NaN;
    }
  };
}

/**
 * İfadedeki DEĞİŞKEN adlarını (fonksiyon ve sabit olmayan tanımlayıcılar) çıkarır.
 * Parametreli fonksiyonlarda ("a*x^2 + b") hangi kaydırıcıların gerektiğini bulmak için kullanılır.
 * 'x' ve tanımlı sabitler (pi, e) sonuca DAHİL EDİLMEZ.
 * İfade ayrıştırılamazsa boş dizi döner.
 */
export function extractVariableNames(expressionString: string): string[] {
  let tokens: Token[];
  try {
    tokens = tokenize(expressionString);
  } catch {
    return [];
  }
  const bulunan = new Set<string>();
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type !== 'IDENT') continue;
    const ad = t.value;
    // Fonksiyon çağrısı ( ad + '(' ) değişken değildir
    if (hasOwn(MATH_FUNCTIONS, ad)) continue;
    if (hasOwn(MATH_CONSTANTS, ad)) continue;
    if (ad === 'x') continue;
    if (!VARIABLE_NAME_RE.test(ad)) continue;
    bulunan.add(ad);
  }
  return [...bulunan];
}

/**
 * Bir giriş kutusuna yazılanı SAYIYA çevirir: düz sayı da olabilir, ifade de.
 *
 * Kullanıcı yarıçap alanına "3" yazabildiği gibi "a" (bir kaydırıcı), "2*a", "pi/2"
 * veya "sqrt(2)" de yazabilmelidir. Önce düz sayı denenir (Türkçe virgül kabul edilir),
 * olmazsa ifade olarak derlenip `scope` içindeki kaydırıcı değerleriyle hesaplanır.
 *
 * NOT: Sonuç o ANDAKİ değerle hesaplanır (anlık görüntü). Kaydırıcı sonradan
 * değişince bu değer kendiliğinden güncellenmez.
 */
export function evaluateNumericInput(
  raw: string,
  scope: Record<string, number> = {}
): { ok: true; value: number } | { ok: false; error: string } {
  const metin = raw.trim();
  if (metin === '') return { ok: false, error: 'Bir değer girin.' };

  // 1) Düz sayı mı? ("7,5" ve "7.5" kabul edilir)
  if (/^[+-]?\d+([.,]\d+)?$/.test(metin)) {
    const n = Number(metin.replace(',', '.'));
    if (Number.isFinite(n)) return { ok: true, value: n };
  }

  // 2) İfade olarak dene (a, 2*a, pi/2, sqrt(2), 3/4 ...)
  const bilinen = Object.keys(scope);
  const dogrulama = validateMathExpression(metin, bilinen);
  if (!dogrulama.ok) return { ok: false, error: dogrulama.error };

  const fn = compileMathExpression(metin, bilinen);
  const deger = fn ? fn(0, scope) : NaN;
  if (!Number.isFinite(deger)) {
    return { ok: false, error: 'Bu ifade bir sayıya eşit değil.' };
  }
  // Kayan nokta artıklarını temizle: 0.30000000000000004 -> 0.3
  return { ok: true, value: Number(deger.toFixed(9)) };
}
