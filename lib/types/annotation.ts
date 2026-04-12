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

export type EditorShape = {
  clientId: string;
  classLabelId: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type LabelDefinition = {
  id: number;
  name: string;
  color: string;
};
