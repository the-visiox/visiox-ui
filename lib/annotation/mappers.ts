import type { ClassDto } from "@/lib/api/classes";
import { bboxFromPoints } from "./geometry";
import type { EditorShape, LabelDefinition } from "./types";

export type AnnotationApiRow = {
  id: number;
  class_label: number;
  type: string;
  data: Record<string, unknown>;
  frame?: number;
};

export function apiShapesToEditor(rows: AnnotationApiRow[]): EditorShape[] {
  const out: EditorShape[] = [];

  for (const r of rows) {
    if (r.type === "bbox" || r.type === "rectangle") {
      const d = r.data as { x: number; y: number; width: number; height: number };
      out.push({
        clientId: `srv-${r.id}`,
        serverId: r.id,
        shapeType: "rectangle",
        source: "imported",
        frame: r.frame ?? 0,
        classLabelId: r.class_label,
        x: d.x,
        y: d.y,
        width: d.width,
        height: d.height,
      });
      continue;
    }

    if (r.type === "polygon") {
      const d = r.data as { points?: number[] };
      const pts = d.points;
      if (pts && pts.length >= 6) {
        const bb = bboxFromPoints(pts);
        out.push({
          clientId: `srv-${r.id}`,
          serverId: r.id,
          shapeType: "polygon",
          source: "imported",
          frame: r.frame ?? 0,
          classLabelId: r.class_label,
          ...bb,
          points: pts,
        });
      }
      continue;
    }

    if (r.type === "polyline") {
      const d = r.data as { points?: number[] };
      const pts = d.points;
      if (pts && pts.length >= 4) {
        const bb = bboxFromPoints(pts);
        out.push({
          clientId: `srv-${r.id}`,
          serverId: r.id,
          shapeType: "polyline",
          source: "imported",
          frame: r.frame ?? 0,
          classLabelId: r.class_label,
          ...bb,
          points: pts,
        });
      }
      continue;
    }

    if (r.type === "point" || r.type === "keypoint") {
      const d = r.data as { points?: number[]; x?: number; y?: number };
      const pts = Array.isArray(d.points)
        ? d.points
        : typeof d.x === "number" && typeof d.y === "number"
          ? [d.x, d.y]
          : undefined;
      if (pts && pts.length >= 2) {
        const bb = bboxFromPoints(pts);
        out.push({
          clientId: `srv-${r.id}`,
          serverId: r.id,
          shapeType: "points",
          source: "imported",
          frame: r.frame ?? 0,
          classLabelId: r.class_label,
          ...bb,
          points: pts,
        });
      }
      continue;
    }

    if (r.type === "tag") {
      const d = r.data as { x?: number; y?: number };
      const x = typeof d.x === "number" ? d.x : 0;
      const y = typeof d.y === "number" ? d.y : 0;
      out.push({
        clientId: `srv-${r.id}`,
        serverId: r.id,
        shapeType: "tag",
        source: "imported",
        frame: r.frame ?? 0,
        classLabelId: r.class_label,
        x,
        y,
        width: 0,
        height: 0,
      });
    }
  }

  return out;
}

export function editorToApiPayload(shapes: EditorShape[]) {
  return shapes.map((s) => {
    if (s.shapeType === "polygon" && s.points && s.points.length >= 6) {
      return {
        class_label: s.classLabelId,
        type: "polygon" as const,
        data: { points: s.points },
        frame: s.frame ?? 0,
      };
    }

    if (s.shapeType === "polyline" && s.points && s.points.length >= 4) {
      return {
        class_label: s.classLabelId,
        type: "polyline" as const,
        data: { points: s.points },
        frame: s.frame ?? 0,
      };
    }

    if (s.shapeType === "points" && s.points && s.points.length >= 2) {
      return {
        class_label: s.classLabelId,
        type: "point" as const,
        data: { points: s.points },
        frame: s.frame ?? 0,
      };
    }

    if (s.shapeType === "tag") {
      return {
        class_label: s.classLabelId,
        type: "tag" as const,
        data: {
          x: s.x,
          y: s.y,
        },
        frame: s.frame ?? 0,
      };
    }

    return {
      class_label: s.classLabelId,
      type: "bbox" as const,
      data: {
        x: s.x,
        y: s.y,
        width: s.width,
        height: s.height,
      },
      frame: s.frame ?? 0,
    };
  });
}

export function mergeProjectClassesWithProfile(
  classes: ClassDto[],
  profile: { id: number; name: string; color: string }[],
): LabelDefinition[] {
  const byId = new Map(profile.map((p) => [p.id, p]));

  // The profile only overrides name/color of real project classes per-image.
  // Profile entries whose id no longer matches a class are stale leftovers from
  // deleted classes — drop them so phantom labels don't appear.
  return classes.map((c) => {
    const override = byId.get(c.id);
    return {
      id: c.id,
      name: override?.name ?? c.name,
      color: (override?.color ?? c.color) || "#f97316",
    };
  });
}
