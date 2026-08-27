// Çalışma Alanı Araç ve Durum Tipleri

import { MathObject } from './math';

export type ToolMode =
  | 'select'
  | 'point'
  | 'segment'
  | 'line'
  | 'ray'
  | 'circle'
  | 'angle'
  | 'polygon'
  | 'square'
  | 'rectangle'
  | 'regular_polygon'
  | 'pen'
  | 'measure_distance'
  | 'measure_angle'
  | 'measure_area'
  | 'measure_perimeter'
  | 'unit_measure'
  | 'area_model'
  | 'ruler'
  | 'setsquare'
  | 'rotate'
  | 'reflect'
  | 'symmetry'
  | 'fraction'
  | 'image'
  | 'text'
  | 'slider'
  | 'function'
  | 'delete'
  | 'pan';

export interface ToolCategory {
  id: string;
  name: string;
  tools: {
    id: ToolMode;
    name: string;
    description: string;
    icon: string;
    shortcut?: string;
  }[];
}

export interface WorkspaceHistoryStep {
  objects: MathObject[];
  description: string; // Türkçe işlem açıklaması (Örn: "A noktası eklendi")
  timestamp: number;
}

export interface WorkspaceState {
  objects: MathObject[];
  selectedObjectId: string | null;
  activeTool: ToolMode;
  isDragging: boolean;
  draggedObjectId: string | null;
  pendingCreation: {
    tool: ToolMode;
    selectedPointIds: string[];
    previewCoordinates?: { x: number; y: number };
  };
  history: WorkspaceHistoryStep[];
  historyIndex: number;
}
