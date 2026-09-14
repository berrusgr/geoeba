import type { CommandHandler } from '../types';
import { pointAssign, pointCreate, pointOnObject } from './basic/points';
import { line, ray, segment, verticalLine } from './basic/lines';
import { angleCreate } from './basic/angles';

export const family = { id: 'basic', title: 'Nokta ve doğrular' };

/**
 * Noktalar (koordinatla, adla, orijinde, rastgele, nesne üzerinde, "A = (1; 2)"), doğru parçaları (iki nokta, koordinatlar,
 * verilen uzunluk, sırayla birleştirme; vektör isteği açıklanır), doğrular (iki nokta, yatay/dikey, eğim, x = k), ışınlar ve açı oluşturma.
 */
export const handlers: CommandHandler[] = [pointAssign, verticalLine, pointOnObject, pointCreate, angleCreate, segment, line, ray];
