import type { CommandHandler } from '../types';
import { clearAll, redo, selectAll, undo } from './app/history';
import { compoundOf } from './app/compound';
import { help } from './app/help';
import { style } from './app/style';
import { dialog, toolSelect } from './app/toolHandlers';
import { viewMode, viewToggle, zoom } from './app/view';

export const family = { id: 'app', title: 'Uygulama ve görünüm' };

/**
 * Sahneyi değiştirmeyen arayüz komutları: geri al/yinele, tuvali temizleme, tümünü seçme, araç ve pencere açma,
 * görünüm (ızgara, eksen, yakınlaştırma, düzlem), stil ayarları ve yardım. Hepsi AppAction üretir.
 */
const parts: CommandHandler[] = [undo, redo, clearAll, selectAll, toolSelect, dialog, viewToggle, zoom, viewMode, style, help];
/** Bölünmemiş "… geç ve …" cümleleri: her parça bu ailedeyse sırayla uygulanır (bkz. app/compound.ts). */
export const handlers: CommandHandler[] = [compoundOf(parts), ...parts];
