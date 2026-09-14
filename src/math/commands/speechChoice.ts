import { normalizeSpokenCommand } from './speechText';
import { detectVerbs, fold } from './text';

export interface SpokenChoice {
  /** Uygulanacak metin (normalizeSpokenCommand uygulanmış) */
  text: string;
  /** Motor bu metni hatasız uygulayabiliyor mu? */
  understood: boolean;
  /** Bir önceki, tek başına anlaşılmayan parçayla birleştirildi mi? */
  merged: boolean;
}

/**
 * Tarayıcının bir cümle için verdiği olası metinlerden (en iyi N) motorun anladığı ilkini seçer.
 * Önce, bekleyen anlaşılmamış parçayla birleştirmeyi dener ("kenarları üç" + "dört ve beş olan üçgen çiz").
 * Hiçbiri anlaşılmazsa en olası metin döner; panel hatasını gösterir.
 */
export function chooseSpokenCommand(alternatives: string[], understands: (text: string) => boolean, fragment?: string): SpokenChoice {
  const candidates = [...new Set(alternatives.map(normalizeSpokenCommand).filter(Boolean))];
  if (fragment) {
    for (const candidate of candidates) {
      const merged = normalizeSpokenCommand(`${fragment} ${candidate}`);
      if (understands(merged)) return { text: merged, understood: true, merged: true };
    }
  }
  for (const candidate of candidates) if (understands(candidate)) return { text: candidate, understood: true, merged: false };
  return { text: candidates[0] ?? '', understood: false, merged: false };
}

/** Anlaşılmayan metin yarım bir cümle olabilir mi? Fiil ya da eşittir yoksa devamı beklenir ("yarıçapı iki olan"). */
export function looksIncomplete(text: string): boolean {
  return detectVerbs(fold(text)).size === 0 && !/=/.test(text);
}
