// Matematiksel Nesne ve Koordinat Tipleri

export type Point2D = {
  x: number;
  y: number;
};

export type ScreenPoint = {
  x: number;
  y: number;
};

export type ObjectType =
  | 'point'
  | 'segment'
  | 'line'
  | 'ray'
  | 'circle'
  | 'angle'
  | 'polygon'
  | 'function'
  | 'slider'
  | 'fraction'
  | 'pen'
  | 'text'
  | 'image';

export interface BaseMathObject {
  id: string;
  type: ObjectType;
  label: string;
  showLabel: boolean;
  color: string;
  visible: boolean;
  locked?: boolean;
  selected?: boolean;
  createdAt: number;
}

export interface PointObject extends BaseMathObject {
  type: 'point';
  x: number;
  y: number;
  size?: number; // Nokta yarıçapı (piksel)
  isIndependent: boolean; // Bağımsız sürüklenebilir mi yoksa kesişim/bağımlı nokta mı
  dependsOn?: string[]; // Bağımlı olduğu nesne kimlikleri
}

export interface SegmentObject extends BaseMathObject {
  type: 'segment';
  startPointId: string;
  endPointId: string;
  thickness?: number;
  style?: 'solid' | 'dashed' | 'dotted';
  showLength?: boolean;
}

export interface LineObject extends BaseMathObject {
  type: 'line';
  point1Id: string;
  point2Id: string;
  thickness?: number;
  style?: 'solid' | 'dashed';
  showEquation?: boolean;
}

export interface RayObject extends BaseMathObject {
  type: 'ray';
  startPointId: string;
  throughPointId: string;
  thickness?: number;
  style?: 'solid' | 'dashed';
}

export interface CircleObject extends BaseMathObject {
  type: 'circle';
  centerPointId: string;
  radiusPointId?: string; // Yarıçapı belirleyen ikinci nokta
  fixedRadius?: number; // Sabit yarıçaplı ise
  fillOpacity?: number;
  showArea?: boolean;
  showPerimeter?: boolean;
}

export interface AngleObject extends BaseMathObject {
  type: 'angle';
  point1Id: string; // Açının bir kolundaki nokta
  vertexPointId: string; // Açının köşe noktası
  point3Id: string; // Açının diğer kolundaki nokta
  showValue?: boolean;
  arcRadius?: number;
}

export interface PolygonObject extends BaseMathObject {
  type: 'polygon';
  pointIds: string[]; // Sıralı köşe noktaları
  fillColor?: string;
  fillOpacity?: number;
  showArea?: boolean;
  showPerimeter?: boolean;
}

export interface FunctionObject extends BaseMathObject {
  type: 'function';
  expression: string; // Örn: "2*x + 1" veya "a*x^2 + b"
  domain?: [number, number];
  color: string;
  thickness?: number;
  style?: 'solid' | 'dashed';
}

export interface SliderObject extends BaseMathObject {
  type: 'slider';
  variableName: string; // Örn: 'a', 'b', 'm'
  min: number;
  max: number;
  step: number;
  value: number;
}

export interface FractionObject extends BaseMathObject {
  type: 'fraction';
  numerator: number;
  denominator: number;
  x: number;
  y: number;
  radius: number;
  modelType: 'pie' | 'bar';
}

export interface PenStrokeObject extends BaseMathObject {
  type: 'pen';
  points: Point2D[];
  thickness: number;
}

export interface TextObject extends BaseMathObject {
  type: 'text';
  text: string;
  x: number;
  y: number;
  fontSize?: number;
}

export interface ImageObject extends BaseMathObject {
  type: 'image';
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type MathObject =
  | PointObject
  | SegmentObject
  | LineObject
  | RayObject
  | CircleObject
  | AngleObject
  | PolygonObject
  | FunctionObject
  | SliderObject
  | FractionObject
  | PenStrokeObject
  | TextObject
  | ImageObject;

export interface ViewportTransform {
  zoom: number; // Piksel / birim ölçeği (varsayılan: 40px = 1 birim)
  panX: number; // Merkezin ekran piksel X ofseti
  panY: number; // Merkezin ekran piksel Y ofseti
  width: number;
  height: number;
  showGrid: boolean;
  showAxes: boolean;
  showCoordinates: boolean;
  snapToGrid: boolean;
  gridStep: number;
}
