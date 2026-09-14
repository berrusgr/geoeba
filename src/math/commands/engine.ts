import type { MathObject } from '@/types/math';
import { CommandError, CommandScene, NotApplicable } from './scene';
import { type Clause, fold, parseClause, splitClauses } from './text';
import { HANDLERS } from './handlers';
import { calledUserFunctions, evaluateNumericInput, getUserFunctions, setUserFunctions } from '../parser';
import type { CommandHandler, CommandResult, EngineOptions } from './types';

export const MAX_COMMAND_LENGTH = 2000;
const MAX_CLAUSES = 40;

/** Cümleye uyan işleyiciler, puana göre (eşitlikte kayıt sırası). Hata ayıklama ve testler için dışa açık. */
export function rankHandlers(clause: Clause, scene: CommandScene, handlers: CommandHandler[] = HANDLERS): { handler: CommandHandler; score: number }[] {
  return handlers
    .map((handler, index) => {
      let score = 0;
      try { score = handler.match(clause, scene); } catch { score = 0; }
      return { handler, score: Number.isFinite(score) ? score : 0, index };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ handler, score }) => ({ handler, score }));
}

/** Tanınmayan cümle için, sözcük örtüşmesine göre en yakın örnek komutlar. */
export function suggestExamples(text: string, limit = 5, handlers: CommandHandler[] = HANDLERS): string[] {
  const words = new Set(fold(text).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length >= 3));
  const scored = handlers.flatMap(h => h.examples).map(example => {
    const exampleWords = fold(example).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length >= 3);
    const score = exampleWords.filter(w => [...words].some(q => q.startsWith(w.slice(0, 4)) || w.startsWith(q.slice(0, 4)))).length;
    return { example, score };
  }).filter(s => s.score > 0).sort((a, b) => b.score - a.score);
  return [...new Set(scored.map(s => s.example))].slice(0, limit);
}

/**
 * Türkçe metin komutunu çalıştırır. Saf fonksiyondur: verilen sahneyi değiştirmez, yeni sahneyi döndürür.
 * Birden fazla işlem ("üçgen çiz ve alanını göster") sırayla uygulanır; herhangi biri başarısız olursa hiçbiri uygulanmaz.
 */
export function runCommand(raw: string, scene: MathObject[], selection: string[] = [], options: EngineOptions = {}, handlers: CommandHandler[] = HANDLERS): CommandResult {
  // Sahne adlı fonksiyonları (f, g …) ayrıştırıcıya geçici olarak bildirir; deneme çalıştırmaları ekrandaki tabloyu değiştirmesin.
  const previousFunctions = getUserFunctions();
  try {
    return runOnScene(raw, scene, selection, options, handlers);
  } finally {
    setUserFunctions(previousFunctions);
  }
}

/** Koordinattaki fonksiyon değerleri o anki değerle hesaplanır: "(2, f(2)) noktası" → "(2, 4) noktası". */
function withFunctionValues(text: string, state: CommandScene): string {
  if (!/\([^()]*\p{L}\s*\(/u.test(text)) return text;
  const scope: Record<string, number> = {};
  for (const s of state.sliders()) scope[s.variableName] = s.value;
  const part = String.raw`(?:[^(),;]|\([^()]*\))+`;
  return text.replace(new RegExp(String.raw`\(\s*(${part})\s*[,;]\s*(${part})\s*\)`, 'g'), (whole, a: string, b: string) => {
    if (!calledUserFunctions(a).length && !calledUserFunctions(b).length) return whole;
    const x = evaluateNumericInput(a, scope), y = evaluateNumericInput(b, scope);
    return x.ok && y.ok ? `(${x.value}, ${y.value})` : whole;
  });
}

function runOnScene(raw: string, scene: MathObject[], selection: string[], options: EngineOptions, handlers: CommandHandler[]): CommandResult {
  const input = (raw ?? '').trim();
  if (!input || input.length > MAX_COMMAND_LENGTH) return { ok: false, message: `1–${MAX_COMMAND_LENGTH} karakterlik bir komut yazın.` };
  const clauses = splitClauses(input);
  if (!clauses.length) return { ok: false, message: 'Bir komut yazın.' };
  if (clauses.length > MAX_CLAUSES) return { ok: false, message: `Tek seferde en fazla ${MAX_CLAUSES} işlem yazın.` };

  const state = new CommandScene(scene, selection, options);
  for (let i = 0; i < clauses.length; i++) {
    const prefix = clauses.length > 1 ? `${i + 1}. işlem (“${clauses[i]}”): ` : '';
    const clause = parseClause(withFunctionValues(clauses[i], state), state.known());
    if (clause.negated) {
      return { ok: false, message: `${prefix}Olumsuz ifadeyi işlem olarak uygulamadım. Yapılmasını istediğiniz işlemi açıkça yazın.` };
    }
    const ranked = rankHandlers(clause, state, handlers);
    if (!ranked.length) {
      return {
        ok: false,
        message: `${prefix}Bu ifadeyi anlayamadım. Şekli, ölçüyü ve yapılacak işi yazın; örneğin “yarıçapı 3 olan çember çiz”.`,
        suggestions: suggestExamples(clauses[i], 5, handlers),
        unrecognized: true,
      };
    }
    state.beginClause();
    let applied = false;
    let lastSkip = '';
    for (const { handler } of ranked) {
      const snapshot = state.snapshot();
      try {
        handler.run(clause, state);
        state.resolve();
        state.endClause();
        applied = true;
        break;
      } catch (error) {
        state.restore(snapshot);
        if (error instanceof NotApplicable) { lastSkip = error.message; continue; }
        if (error instanceof CommandError) return { ok: false, message: prefix + error.message };
        return { ok: false, message: `${prefix}Komut uygulanamadı: ${error instanceof Error ? error.message : String(error)}` };
      }
    }
    if (!applied) {
      return { ok: false, message: prefix + (lastSkip || 'Bu ifadeyi uygulayabileceğim bir işlem bulamadım.'), suggestions: suggestExamples(clauses[i], 5, handlers) };
    }
  }

  const alive = (ids: string[]) => ids.filter(id => state.get(id));
  const focus = alive(state.focus);
  return {
    ok: true,
    objects: state.dirty ? state.objects : scene,
    selectedIds: focus.length ? focus : alive(state.selection),
    message: state.messages.join(' ') || 'Tamamlandı.',
    actions: state.actions,
    sceneChanged: state.dirty,
  };
}
