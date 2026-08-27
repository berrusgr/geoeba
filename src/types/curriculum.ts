// Türkiye Yüzyılı Maarif Modeli (TYMM) & Müfredat Tipleri

import { MathObject, ViewportTransform } from './math';

export type LevelId = 'ilkokul' | 'ortaokul' | 'lise';

export type GradeId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type MathCategory =
  | 'hepsi'
  | 'geometri'
  | 'cebir'
  | 'olcme'
  | 'sayi'
  | 'islemler'
  | 'fonksiyon'
  | 'trigonometri'
  | 'istatistik'
  | 'veri'
  | 'olasilik';

export interface PizzaMissionConfig {
  leftDenominator: number;
  rightDenominator: number;
  initialLeftNumerator: number;
  initialRightNumerator: number;
  targetLeftNumerator: number;
  targetRightNumerator: number;
}

export interface PrismMissionConfig {
  targetVolume: number;
  initialLength: number;
  initialWidth: number;
  initialHeight: number;
}

export interface InteractiveMission {
  type:
    | 'quadrant_target'
    | 'pizza_fractions'
    | 'prism_volume'
    | 'number_line'
    | 'angle_explorer'
    | 'triangle_explorer'
    | 'slope_explorer'
    | 'slider_match'
    | 'custom';
  targetPoint?: { x: number; y: number; label?: string };
  targetQuadrant?: 'I' | 'II' | 'III' | 'IV';
  pizzaConfig?: PizzaMissionConfig;
  prismConfig?: PrismMissionConfig;
  currentSliders?: {
    name: string;
    label: string;
    min: number;
    max: number;
    step: number;
    value: number;
  }[];
  interactiveQuestions?: {
    stepIndex: number;
    stepTitle: string;
    prompt: string;
    options: string[];
    correctIndex: number;
    feedback: string;
  }[];
}

export interface ValidationRule {
  id: string;
  type:
    | 'angle_sum_equals'
    | 'segment_length_equals'
    | 'point_at_coordinate'
    | 'triangle_is_right'
    | 'circle_radius_equals'
    | 'polygon_area_equals'
    | 'slope_equals'
    | 'custom';
  targetIds?: string[];
  expectedValue?: number;
  tolerance?: number;
  successMessage: string;
  hintMessage?: string;
  validate?: (objects: MathObject[]) => boolean;
}

export interface ActivityStep {
  stepNumber: number;
  instruction: string;
  hint?: string;
  validationRuleId?: string;
}

export interface Activity {
  id: string;
  title: string;
  category?: MathCategory;
  description: string;
  learningGoal: string;
  folderColor?: string;
  previewType?:
    | 'pizza_fractions'
    | 'prism_volume'
    | 'cylinder_model'
    | 'aquarium_fluid'
    | 'unit_cubes'
    | 'number_line'
    | 'coordinate_grid'
    | 'triangle_pythagoras'
    | 'circle_radius'
    | 'slope_line'
    | 'angle_arc'
    | 'polygon_shapes'
    | 'balance_scale'
    | 'probability_spinner'
    | 'data_barchart'
    | 'prime_factor_tree'
    | 'ratio_proportion'
    | 'transformation_symmetry'
    | 'square_roots'
    | 'algebraic_tiles'
    | 'counting_objects'
    | 'apple_tree_collect'
    | 'kitten_ten_frames'
    | 'train_wagons'
    | 'compare_quantities'
    | 'frog_rhythmic'
    | 'fruit_estimation'
    | 'matching_pairs'
    | 'spatial_grid'
    | 'money_coins'
    | 'pattern_blocks'
    | 'clock_face'
    | 'addition_subtraction_visual'
    | 'triangle_explorer'
    | 'angle_explorer';
  initialObjects: MathObject[];
  initialViewport?: Partial<ViewportTransform>;
  steps: ActivityStep[];
  validationRules: ValidationRule[];
  mission?: InteractiveMission;
  allowedTools?: string[];
  completedMessage: string;
}

export interface TYMMTheme {
  id: string;
  code: string; // Örn: 'MAT.5.1', 'MAT.8.3'
  orderNumber: number; // İşleniş Sırası (Örn: 1, 2, 3...)
  themeName: string; // Örn: 'Sayılar ve Nicelikler (1)'
  fullTitle: string; // Örn: 'MAT.5.1. Sayılar ve Nicelikler (1)'
  category?: MathCategory;
  lessonHours: number; // Ders saati (Örn: 28, 38)
  outcomeCount: number; // Öğrenme Çıktısı Sayısı (Örn: 2, 7)
  description: string;
  colorTheme: string;
  topics: Topic[];
}

export interface Topic {
  id: string;
  title: string;
  code?: string; // Örn: 'MAT.5.1.1', 'MAT.8.3.5'
  category: MathCategory;
  themeId?: string;
  badge?: string;
  description: string;
  summary?: string;
  keyFormula?: string;
  explanationSteps?: string[];
  iconName?: string;
  colorTheme?: string;
  subTopicCount?: number;
  learningOutcomes: string[];
  activities: Activity[];
}

export interface Grade {
  gradeNumber: GradeId;
  title: string;
  subtitle: string;
  description: string;
  themes: TYMMTheme[];
  topics: Topic[];
}

export interface Level {
  id: LevelId;
  title: string;
  subtitle: string;
  description: string;
  gradeRange: string;
  grades: Grade[];
}

export interface CurriculumData {
  levels: Record<LevelId, Level>;
}
