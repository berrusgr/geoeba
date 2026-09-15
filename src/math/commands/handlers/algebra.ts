import type { CommandHandler } from '../types';
import { evaluateHandlers } from './algebra/evaluate';
import { functionHandlers } from './algebra/functions';
import { sliderHandlers } from './algebra/sliders';
import { widgetHandlers } from './algebra/widgets';
import { scriptAnimationHandler, scriptSetValueHandler, scriptTraceHandler } from './algebra/scripting';

export const family = { id: 'algebra', title: 'Cebir ve etkileşim' };

/**
 * Fonksiyonlar (f(x) = …, "x kare fonksiyonu", polinom uydurma), fonksiyon değeri ve hesap ("f(5) kaç", "2^10 kaç"),
 * kaydırıcılar (a = 2, oluşturma, değer/aralık, oynatma), yazı notları, kesir modelleri, onay kutusu, düğme, girdi kutusu;
 * betikleme komutları (CanlandırmayıBaşlat, StartAnimation, DeğerAta, SetValue, İzBırak, İzleriTemizle);
 * görsel ve kalem için araç açma.
 */
export const handlers: CommandHandler[] = [
  scriptAnimationHandler,
  scriptSetValueHandler,
  scriptTraceHandler,
  ...functionHandlers,
  ...evaluateHandlers,
  ...sliderHandlers,
  ...widgetHandlers,
];
