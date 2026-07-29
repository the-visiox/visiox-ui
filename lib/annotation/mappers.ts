import type { ClassDto } from "@/lib/api/classes";
import type { AutoLabelPredictionResponse } from "@/lib/api";
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
      const d = r.data as {
        x: number; y: number; width: number; height: number;
        source?: string; confidence?: number; auto_label_source?: "uploaded_model" | "provider" | "propagation";
        auto_label_model_id?: number; auto_label_provider?: string; auto_label_engine_name?: string;
      };
      out.push({
        clientId: `srv-${r.id}`,
        serverId: r.id,
        shapeType: "rectangle",
        source: d.source === "auto_label" ? "auto_label" : "imported",
        confidence: d.confidence,
        autoLabelSource: d.auto_label_source,
        autoLabelModelId: d.auto_label_model_id,
        autoLabelProvider: d.auto_label_provider,
        autoLabelEngineName: d.auto_label_engine_name,
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
      const d = r.data as {
        points?: number[]; source?: string; confidence?: number;
        auto_label_source?: "uploaded_model" | "provider" | "propagation"; auto_label_model_id?: number;
        auto_label_provider?: string; auto_label_engine_name?: string;
      };
      const pts = d.points;
      if (pts && pts.length >= 6) {
        const bb = bboxFromPoints(pts);
        out.push({
          clientId: `srv-${r.id}`,
          serverId: r.id,
          shapeType: "polygon",
          source: d.source === "auto_label" ? "auto_label" : "imported",
          confidence: d.confidence,
          autoLabelSource: d.auto_label_source,
          autoLabelModelId: d.auto_label_model_id,
          autoLabelProvider: d.auto_label_provider,
          autoLabelEngineName: d.auto_label_engine_name,
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
    const autoLabelMetadata = s.source === "auto_label"
      ? {
          source: "auto_label",
          confidence: s.confidence,
          auto_label_source: s.autoLabelSource,
          auto_label_model_id: s.autoLabelModelId,
          auto_label_provider: s.autoLabelProvider,
          auto_label_engine_name: s.autoLabelEngineName,
        }
      : {};
    if (s.shapeType === "polygon" && s.points && s.points.length >= 6) {
      return {
        class_label: s.classLabelId,
        type: "polygon" as const,
        data: { points: s.points, ...autoLabelMetadata },
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
        ...autoLabelMetadata,
      },
      frame: s.frame ?? 0,
    };
  });
}

export function autoLabelPredictionsToEditor(result: AutoLabelPredictionResponse): EditorShape[] {
  const sourceKind = result.source.kind === "provider" ? "provider" : "uploaded_model";
  const modelId = typeof result.source.model_id === "number" ? result.source.model_id : undefined;
  const provider = typeof result.source.provider === "string" ? result.source.provider : undefined;
  const engineName = typeof result.source.name === "string"
    ? result.source.name
    : typeof result.source.model === "string" ? result.source.model : provider;

  return result.predictions.reduce<EditorShape[]>((shapes, prediction, index) => {
    const base = {
      clientId: `auto-${result.frame}-${Date.now()}-${index}`,
      classLabelId: prediction.class_label,
      source: "auto_label" as const,
      confidence: typeof prediction.confidence === "number" ? prediction.confidence : undefined,
      autoLabelSource: sourceKind as "uploaded_model" | "provider",
      autoLabelModelId: modelId,
      autoLabelProvider: provider,
      autoLabelEngineName: engineName,
      frame: result.frame,
    };
    if (prediction.type === "polygon" && prediction.data.points && prediction.data.points.length >= 6) {
      shapes.push({ ...base, shapeType: "polygon", ...bboxFromPoints(prediction.data.points), points: prediction.data.points });
      return shapes;
    }
    const { x, y, width, height } = prediction.data;
    if (![x, y, width, height].every((value) => typeof value === "number")) return shapes;
    shapes.push({
      ...base,
      shapeType: "rectangle",
      x: x as number,
      y: y as number,
      width: width as number,
      height: height as number,
    });
    return shapes;
  }, []);
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
