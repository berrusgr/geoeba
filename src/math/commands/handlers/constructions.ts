import type { CommandHandler } from '../types';
import { altitude, angleBisector, directionLine, median, perpBisector } from './constructions/lines';
import { centers, diagonals, intersection, midpoint, ratio } from './constructions/points';
import { circumcircle, incircle, tangent, tangentCircle } from './constructions/circles';
import { bindSliders, unbindSliders } from './constructions/binding';

export const family = { id: 'constructions', title: 'İnşalar' };

/**
 * İnşalar: orta nokta, oranda bölme, dik/paralel doğru, dikme ve yükseklik, orta dikme, açıortay, kenarortay,
 * üçgen merkezleri, çevrel/iç teğet çember, kesişim, teğet, köşegen, kenar–kaydırıcı bağı.
 * Oluşan noktalar canlıdır (PointObject.construction): kaynak noktalar taşınınca birlikte güncellenir.
 */
export const handlers: CommandHandler[] = [
  unbindSliders,
  bindSliders,
  centers,
  diagonals,
  incircle,
  perpBisector,
  circumcircle,
  tangentCircle,
  tangent,
  altitude,
  angleBisector,
  median,
  ratio,
  midpoint,
  intersection,
  directionLine,
];
