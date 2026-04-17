import type { ClassDto } from "@/lib/api/classes";
import { bboxFromPoints } from "@/lib/annotation-core/geometry";
import type { EditorShape, LabelDefinition } from "@/lib/types/annotation";

export type AnnotationApiRow = {
  id: number;
  class_label: number;
  type: string;
  data: Record<string, unknown>;
};

export function apiShapesToEditor(rows: AnnotationApiRow[]): EditorShape[] {
  const out: EditorShape[] = [];

  for (const r of rows) {
    if (r.type === "bbox" || r.type === "rectangle") {
      const d = r.data as { x: number; y: number; width: number; height: number };
      out.push({
        clientId: `srv-${r.id}`,
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
          classLabelId: r.class_label,
          ...bb,
          points: pts,
        });
      }
    }
  }

  return out;
}

export function editorToApiPayload(shapes: EditorShape[]) {
  return shapes.map((s) => {
    if (s.points && s.points.length >= 6) {
      return {
        class_label: s.classLabelId,
        type: "polygon" as const,
        data: { points: s.points },
        frame: 0,
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
      frame: 0,
    };
  });
}

export function mergeProjectClassesWithProfile(
  classes: ClassDto[],
  profile: { id: number; name: string; color: string }[]
): LabelDefinition[] {
  const byId = new Map(profile.map((p) => [p.id, p]));

  const merged: LabelDefinition[] = classes.map((c) => {
    const override = byId.get(c.id);
    return {
      id: c.id,
      name: override?.name ?? c.name,
      color: (override?.color ?? c.color) || "#f97316",
    };
  });

  for (const p of profile) {
    if (!merged.some((m) => m.id === p.id)) {
      merged.push({ id: p.id, name: p.name, color: p.color });
    }
  }

  return merged;
}
