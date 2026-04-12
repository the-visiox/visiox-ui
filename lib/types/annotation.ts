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
  /** Bounding box (used for rectangles; for polygons, sync from points for UI). */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Closed polygon in image pixels [x1,y1,x2,y2,...] — omit for axis-aligned boxes. */
  points?: number[];
};

export type LabelDefinition = {
  id: number;
  name: string;
  color: string;
};
