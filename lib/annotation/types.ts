/**
 * Canvas / editor types aligned with the VisioX annotation platform (CVAT-style).
 */

export type Tool =
  | "select"
  | "rectangle"
  | "polygon"
  | "polyline"
  | "points"
  | "cuboid"
  | "tag";

export const TOOL_SHORTCUTS: Record<string, Tool> = {
  n: "rectangle",
  p: "polygon",
  l: "polyline",
  k: "points",
  c: "cuboid",
  t: "tag",
  v: "select",
};

export type ShapeType = "rectangle" | "polygon" | "polyline" | "points" | "tag";

export type EditorShape = {
  clientId: string;
  shapeType: ShapeType;
  classLabelId: number;
  x: number;
  y: number;
  width: number;
  height: number;
  points?: number[];
  serverId?: number;
  source?: "manual" | "imported";
  frame?: number;
};

export type LabelDefinition = {
  id: number;
  name: string;
  color: string;
};
