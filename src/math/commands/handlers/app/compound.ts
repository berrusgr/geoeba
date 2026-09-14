import { type CommandScene, NotApplicable } from '../../scene';
import { type Clause, parseClause } from '../../text';
import type { CommandHandler } from '../../types';

/**
 * "sade görünüme geç ve ızgarayı gizle", "elips aracına geç ve eksenleri kapat": "geç" artık fiil sayıldığı için bu cümleler
 * bölücüde ayrılır. Bu işleyici, parçalardan biri fiilsiz kaldığında ("sade görünüm ve ızgara kapalı") ilk işleyicinin
 * ikinci işi sessizce yutmaması için yedektir. Her parça kendi başına AÇIKÇA uygulama ailesine aitse (puan ≥ 88) parçalar sırayla uygulanır.
 * Parçalardan biri başka bir aileye aitse ya da belirsizse ("ızgarayı ve eksenleri gizle" → "ızgarayı") hiç eşleşmez.
 */
const SEPARATOR = /\s*,\s+|(?<!\d),\s*|\s+(?:ve|sonra|ardından|ardindan)\s+/iu;
const MIN_PART_SCORE = 88;

interface Step { handler: CommandHandler; clause: Clause }

export function compoundOf(parts: CommandHandler[]) {
  function plan(c: Clause, scene: CommandScene): Step[] | null {
    if (c.quotes.length || c.coords.length || /se[cç] ve ta[sş]/iu.test(c.raw)) return null;
    const pieces = c.raw.split(SEPARATOR).map(p => p.trim()).filter(Boolean);
    if (pieces.length < 2 || pieces.length > 6) return null;
    const known = scene.known();
    const steps: Step[] = [];
    for (const piece of pieces) {
      const clause = parseClause(piece, known);
      if (clause.negated) return null;
      let best: { handler: CommandHandler; score: number } | undefined;
      for (const handler of parts) {
        let score = 0;
        try { score = handler.match(clause, scene); } catch { score = 0; }
        if (score > (best?.score ?? 0)) best = { handler, score };
      }
      if (!best || best.score < MIN_PART_SCORE) return null;
      steps.push({ handler: best.handler, clause });
    }
    return steps;
  }

  const handler: CommandHandler = {
    id: 'app.compound',
    examples: ['sade görünüme geç ve ızgarayı gizle', 'elips aracına geç ve eksenleri gizle', 'kareli düzleme geç ve 2 kat yakınlaştır', 'ayrıntılı görünüme geç, koordinatları gizle', 'pergel aracına geç ve yakınlaştır', 'boş düzleme geç ve yazıları büyüt'],
    match(c, scene) { return plan(c, scene) ? 94 : 0; },
    run(c, scene) {
      const steps = plan(c, scene);
      if (!steps) throw new NotApplicable('');
      for (const step of steps) step.handler.run(step.clause, scene);
    },
  };
  return handler;
}
