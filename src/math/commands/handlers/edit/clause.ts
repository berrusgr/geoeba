import type { MathObject } from '@/types/math';
import { type Clause, type LabelRef, fold } from '../../text';
import type { CommandScene } from '../../scene';
import type { CommandHandler } from '../../types';
import { functionName } from './targets';

/**
 * Düzenleme ailesine özgü cümle düzeltmeleri (çözümleyici sahneden bağımsız çalıştığı için):
 *  - Fonksiyon adları etiket sayılır: "f fonksiyonunu sil", "g yi göster", "h nin rengini …", "f(x) fonksiyonunu …".
 *    (Etiketi "g(x) = sin(x)" olan fonksiyonun adı çözümleyiciye bilinen ad olarak gelmez.)
 *  - Koordinattan sonra ayrı yazılmış yönelme eki etiket değildir: "(0,0) a taşı" ("a" kaydırıcısı değil).
 */

const DETACHED = new Set(['nin', 'nun', 'in', 'un', 'yi', 'yu', 'i', 'u', 'ye', 'ya', 'e', 'a', 'den', 'dan', 'de', 'da', 'le', 'la', 'yle', 'yla']);
const FUNCTION_NOUN = /^(?:fonksiyon|grafi[gk]|egri)/;

const cache = new WeakMap<Clause, { objects: MathObject[]; clause: Clause }>();

export function editClause(c: Clause, s: CommandScene): Clause {
  const hit = cache.get(c);
  if (hit && hit.objects === s.objects) return hit.clause;
  const clause = augment(c, s);
  cache.set(c, { objects: s.objects, clause });
  return clause;
}

function augment(c: Clause, s: CommandScene): Clause {
  if (c.definition || c.assignment) return c;
  const names = new Set(s.ofType('function').map(f => functionName(f.label)).filter((n): n is string => !!n).map(fold));
  const w = c.words;
  const isName = (i: number) => names.has(w[i] ?? '');
  const call = (i: number) => w[i + 1] === '(' && w[i + 2] === 'x' && w[i + 3] === ')';
  const strong = (i: number): boolean => {
    const next = call(i) ? w[i + 4] ?? '' : w[i + 1] ?? '';
    return FUNCTION_NOUN.test(next) || DETACHED.has(next) || call(i);
  };
  // "f ve g yi sil", "f, g ve h fonksiyonlarını gizle"
  const listed = (i: number): boolean => isName(i) && (strong(i) || (/^(?:ve|ile|,)$/.test(w[i + 1] ?? '') && listed(i + 2)));

  const words: string[] = [];
  const labels: LabelRef[] = [];
  let changed = false;
  for (let i = 0; i < w.length; i++) {
    const word = w[i];
    const placeholder = word.match(/^\$(\d+)(.*)$/);
    if (placeholder) {
      const ref = c.labels[Number(placeholder[1])];
      if (ref && ref.lowercase && !ref.suffix && !placeholder[2] && /^[AE]$/.test(ref.text) && /^@\d+$/.test(w[i - 1] ?? '')) { changed = true; continue; }
      labels.push(ref);
      words.push(`$${labels.length - 1}${placeholder[2]}`);
      continue;
    }
    if (listed(i)) {
      let j = call(i) ? i + 3 : i;
      const suffix = DETACHED.has(w[j + 1] ?? '') ? w[j + 1] : '';
      if (suffix) j++;
      labels.push({ text: word, suffix, lowercase: true });
      words.push(`$${labels.length - 1}${suffix}`);
      i = j;
      changed = true;
      continue;
    }
    words.push(word);
  }
  // Kullanılmayan (köşeli parantezli vb.) etiketler sona eklenir; sıra korunur.
  for (const ref of c.labels) if (!labels.includes(ref) && !c.words.some(x => x.startsWith(`$${c.labels.indexOf(ref)}`))) { labels.push(ref); changed = true; }
  if (!changed) return c;
  const clause = Object.create(c) as Clause;
  Object.assign(clause, { text: words.join(' '), words, labels });
  return clause;
}

/** İşleyicinin match/run çağrılarına düzeltilmiş cümleyi verir. */
export function withEditClause(h: CommandHandler): CommandHandler {
  return { ...h, match: (c, s) => h.match(editClause(c, s), s), run: (c, s) => h.run(editClause(c, s), s) };
}
