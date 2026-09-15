// Türkiye Yüzyılı Maarif Modeli (TYMM) 2026 — Ortaokul (5-8) ve Lise (9-12) Resmî Müfredatı
import { CurriculumData } from '@/types/curriculum';
import { ilkokulLevel } from './ilkokulData';
import { ortaokulLevel } from './ortaokulData';
import { liseLevel } from './liseData';

export const curriculumData: CurriculumData = {
  levels: {
    ilkokul: ilkokulLevel,
    ortaokul: ortaokulLevel,
    lise: liseLevel,
  },
};
