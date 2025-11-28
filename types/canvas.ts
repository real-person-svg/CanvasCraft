export type Tool =
  | "select"
  | "hand"
  | "pen"
  | "line"
  | "rectangle"
  | "circle"
  | "arrow"
  | "text"
  | "image"
  | "eraser";
export type ImageFilter = "none" | "grayscale" | "sepia" | "invert";

export interface CanvasPath {
  id: string;
  points: number[];
  stroke: string;
  strokeWidth: number;
  fill?: string;
  opacity?: number;
}

export interface CanvasShape {
  id: string;
  type: "rectangle" | "circle" | "arrow" | "text" | "line" | "image";
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  //text types
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  backgroundColor?: string;
  isbold?: boolean;
  isitalic?: boolean;
  isunderline?: boolean;
  isstrikethrough?: boolean;
  // format?:string
  points?: number[];
  stroke: string;
  strokeWidth: number;
  fill?: string;
  opacity?: number;
  rotation: number;
  //image types
  src?: string;
  filter?: string;
}

export interface CanvasObject {
  id: string;
  type: "path" | "shape";
  data: CanvasPath | CanvasShape;
  selected?: boolean;
  zIndex: number;
}

export interface GuideLine {
  id: string;
  type: "horizontal" | "vertical";
  position: number;
  isTemp?: boolean; // 临时辅助线，用于吸附提示
}
