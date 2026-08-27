// Güvenli ve Deterministik Matematik İfade Ayrıştırıcı (AST / Recursive Descent Parser)
// eval() veya new Function() KULLANILMAZ.

export type MathScope = Record<string, number>;

type TokenType =
  | 'NUMBER'
  | 'VARIABLE'
  | 'OPERATOR'
  | 'LPAREN'
  | 'RPAREN'
  | 'FUNCTION'
  | 'COMMA';

interface Token {
  type: TokenType;
  value: string;
}

interface ASTNode {
  type: 'Literal' | 'Identifier' | 'BinaryExpression' | 'UnaryExpression' | 'CallExpression';
  value?: number;
  name?: string;
  operator?: string;
  left?: ASTNode;
  right?: ASTNode;
  argument?: ASTNode;
  args?: ASTNode[];
}

const MATH_FUNCTIONS: Record<string, (...args: number[]) => number> = {
  sin: (x) => Math.sin(x),
  cos: (x) => Math.cos(x),
  tan: (x) => Math.tan(x),
  sqrt: (x) => (x < 0 ? NaN : Math.sqrt(x)),
  abs: (x) => Math.abs(x),
  ln: (x) => (x <= 0 ? NaN : Math.log(x)),
  log: (x) => (x <= 0 ? NaN : Math.log10(x)),
  exp: (x) => Math.exp(x),
  kok: (x) => (x < 0 ? NaN : Math.sqrt(x)), // Türkçe takma ad
  mutlak: (x) => Math.abs(x), // Türkçe takma ad
};

const MATH_CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
};

/**
 * Kullanıcı girdisini token dizisine dönüştürür.
 * 2x -> 2*x, 3(x+1) -> 3*(x+1) gibi örtük çarpımları normalize eder.
 */
function tokenize(input: string): Token[] {
  let cleaned = input.toLowerCase().replace(/\s+/g, '');
  
  // Türkçe karakter desteği
  cleaned = cleaned.replace(/,/g, '.');

  const tokens: Token[] = [];
  let i = 0;

  while (i < cleaned.length) {
    const char = cleaned[i];

    // Sayı
    if (/[0-9.]/.test(char)) {
      let numStr = '';
      while (i < cleaned.length && /[0-9.]/.test(cleaned[i])) {
        numStr += cleaned[i];
        i++;
      }
      tokens.push({ type: 'NUMBER', value: numStr });
      continue;
    }

    // Harf (Değişken veya Fonksiyon)
    if (/[a-zçğıöşü_]/.test(char)) {
      let ident = '';
      while (i < cleaned.length && /[a-zçğıöşü0-9_]/.test(cleaned[i])) {
        ident += cleaned[i];
        i++;
      }

      if (MATH_FUNCTIONS[ident]) {
        tokens.push({ type: 'FUNCTION', value: ident });
      } else {
        tokens.push({ type: 'VARIABLE', value: ident });
      }
      continue;
    }

    // Parantezler
    if (char === '(') {
      tokens.push({ type: 'LPAREN', value: '(' });
      i++;
      continue;
    }
    if (char === ')') {
      tokens.push({ type: 'RPAREN', value: ')' });
      i++;
      continue;
    }

    // Operatörler: +, -, *, /, ^
    if (['+', '-', '*', '/', '^'].includes(char)) {
      tokens.push({ type: 'OPERATOR', value: char });
      i++;
      continue;
    }

    // Bilinmeyen karakter
    i++;
  }

  // Örtük Çarpımları (Implicit Multiplication) ekle:
  // Örn: [NUMBER(2), VARIABLE(x)] -> [NUMBER(2), OPERATOR(*), VARIABLE(x)]
  const expanded: Token[] = [];
  for (let k = 0; k < tokens.length; k++) {
    const current = tokens[k];
    const next = tokens[k + 1];
    expanded.push(current);

    if (next) {
      const needsMult =
        (current.type === 'NUMBER' && (next.type === 'VARIABLE' || next.type === 'FUNCTION' || next.type === 'LPAREN')) ||
        (current.type === 'VARIABLE' && (next.type === 'VARIABLE' || next.type === 'FUNCTION' || next.type === 'LPAREN')) ||
        (current.type === 'RPAREN' && (next.type === 'NUMBER' || next.type === 'VARIABLE' || next.type === 'FUNCTION' || next.type === 'LPAREN'));

      if (needsMult) {
        expanded.push({ type: 'OPERATOR', value: '*' });
      }
    }
  }

  return expanded;
}

/**
 * Token listesinden Abstract Syntax Tree (AST) oluşturur.
 */
class ExpressionParser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(expectedType?: TokenType): Token {
    const token = this.tokens[this.pos];
    if (!token) {
      throw new Error('Beklenmedik ifade sonu');
    }
    if (expectedType && token.type !== expectedType) {
      throw new Error(`Beklenen: ${expectedType}, bulunan: ${token.type}`);
    }
    this.pos++;
    return token;
  }

  public parse(): ASTNode {
    const node = this.parseAddition();
    if (this.pos < this.tokens.length) {
      throw new Error('İfadede geçersiz dizilim');
    }
    return node;
  }

  // + ve -
  private parseAddition(): ASTNode {
    let node = this.parseMultiplication();

    while (this.peek() && this.peek()!.type === 'OPERATOR' && ['+', '-'].includes(this.peek()!.value)) {
      const op = this.consume().value;
      const right = this.parseMultiplication();
      node = {
        type: 'BinaryExpression',
        operator: op,
        left: node,
        right,
      };
    }
    return node;
  }

  // * ve /
  private parseMultiplication(): ASTNode {
    let node = this.parseExponent();

    while (this.peek() && this.peek()!.type === 'OPERATOR' && ['*', '/'].includes(this.peek()!.value)) {
      const op = this.consume().value;
      const right = this.parseExponent();
      node = {
        type: 'BinaryExpression',
        operator: op,
        left: node,
        right,
      };
    }
    return node;
  }

  // ^ (Üs alma - sağdan birleşmeli)
  private parseExponent(): ASTNode {
    let node = this.parseUnary();

    if (this.peek() && this.peek()!.type === 'OPERATOR' && this.peek()!.value === '^') {
      const op = this.consume().value;
      const right = this.parseExponent(); // Sağdan birleşmeli (2^3^2 = 2^(3^2))
      node = {
        type: 'BinaryExpression',
        operator: op,
        left: node,
        right,
      };
    }
    return node;
  }

  // Birli (Unary) eksi veya artı: -x, +5
  private parseUnary(): ASTNode {
    if (this.peek() && this.peek()!.type === 'OPERATOR' && ['+', '-'].includes(this.peek()!.value)) {
      const op = this.consume().value;
      const arg = this.parseUnary();
      return {
        type: 'UnaryExpression',
        operator: op,
        argument: arg,
      };
    }
    return this.parsePrimary();
  }

  // Sayı, Değişken, Fonksiyon, Parantez
  private parsePrimary(): ASTNode {
    const token = this.peek();
    if (!token) {
      throw new Error('İfade eksik');
    }

    if (token.type === 'NUMBER') {
      this.consume();
      return { type: 'Literal', value: parseFloat(token.value) };
    }

    if (token.type === 'VARIABLE') {
      this.consume();
      return { type: 'Identifier', name: token.value };
    }

    if (token.type === 'FUNCTION') {
      const fnName = this.consume().value;
      this.consume('LPAREN');
      const arg = this.parseAddition();
      this.consume('RPAREN');
      return {
        type: 'CallExpression',
        name: fnName,
        args: [arg],
      };
    }

    if (token.type === 'LPAREN') {
      this.consume('LPAREN');
      const expr = this.parseAddition();
      this.consume('RPAREN');
      return expr;
    }

    throw new Error(`Geçersiz simge: ${token.value}`);
  }
}

/**
 * AST düğümünü verilen değişken değerleri (scope) ile deterministik olarak hesaplar.
 */
function evaluateAST(node: ASTNode, scope: MathScope): number {
  switch (node.type) {
    case 'Literal':
      return node.value ?? 0;

    case 'Identifier': {
      const name = node.name ?? '';
      if (MATH_CONSTANTS[name] !== undefined) {
        return MATH_CONSTANTS[name];
      }
      if (scope[name] !== undefined) {
        return scope[name];
      }
      return NaN;
    }

    case 'UnaryExpression': {
      const val = evaluateAST(node.argument!, scope);
      return node.operator === '-' ? -val : val;
    }

    case 'BinaryExpression': {
      const left = evaluateAST(node.left!, scope);
      const right = evaluateAST(node.right!, scope);

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
          return Math.pow(left, right);
        default:
          return NaN;
      }
    }

    case 'CallExpression': {
      const fn = MATH_FUNCTIONS[node.name ?? ''];
      if (!fn) return NaN;
      const evaluatedArgs = (node.args ?? []).map((arg) => evaluateAST(arg, scope));
      return fn(...evaluatedArgs);
    }

    default:
      return NaN;
  }
}

/**
 * Matematiksel ifadeyi güvenli bir fonksiyona derler.
 * f(x, { a: 2, b: 3 }) şeklinde çalıştırılabilir.
 */
export function compileMathExpression(
  expressionString: string
): ((x: number, scope?: MathScope) => number) | null {
  try {
    const tokens = tokenize(expressionString);
    if (tokens.length === 0) return null;

    const parser = new ExpressionParser(tokens);
    const ast = parser.parse();

    return (x: number, scope: MathScope = {}) => {
      return evaluateAST(ast, { ...scope, x });
    };
  } catch (err) {
    return null;
  }
}
