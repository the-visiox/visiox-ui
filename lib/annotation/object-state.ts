import type { EditorShape, ShapeType } from "./types";

type ShapePatch = Partial<Omit<EditorShape, "clientId">>;

export class ObjectState {
  private shape: EditorShape;

  constructor(shape: EditorShape) {
    this.shape = cloneShape(shape);
  }

  get clientId(): string {
    return this.shape.clientId;
  }

  get shapeType(): ShapeType {
    return this.shape.shapeType;
  }

  toShape(): EditorShape {
    return cloneShape(this.shape);
  }

  update(patch: ShapePatch): void {
    this.shape = normalizeShape({
      ...this.shape,
      ...patch,
      points: patch.points ? [...patch.points] : this.shape.points,
    });
  }
}

export function cloneShape(shape: EditorShape): EditorShape {
  return {
    ...shape,
    points: shape.points ? [...shape.points] : undefined,
  };
}

export function normalizeShape(shape: EditorShape): EditorShape {
  if (shape.points && shape.points.length >= 2) {
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i < shape.points.length; i += 2) {
      xs.push(shape.points[i]);
      ys.push(shape.points[i + 1]);
    }
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return {
      ...shape,
      x: Number.isFinite(minX) ? minX : shape.x,
      y: Number.isFinite(minY) ? minY : shape.y,
      width: Number.isFinite(maxX - minX) ? maxX - minX : shape.width,
      height: Number.isFinite(maxY - minY) ? maxY - minY : shape.height,
      points: [...shape.points],
    };
  }

  return { ...shape };
}
