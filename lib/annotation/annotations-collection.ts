import type { EditorShape } from "./types";
import { ObjectState, cloneShape, normalizeShape } from "./object-state";

export class AnnotationsCollection {
  private objects = new Map<string, ObjectState>();

  replace(shapes: EditorShape[]): EditorShape[] {
    this.objects.clear();
    for (const shape of shapes) {
      this.objects.set(shape.clientId, new ObjectState(normalizeShape(shape)));
    }
    return this.export();
  }

  export(): EditorShape[] {
    return Array.from(this.objects.values()).map((state) => state.toShape());
  }

  update(updater: (current: EditorShape[]) => EditorShape[]): EditorShape[] {
    const next = updater(this.export()).map((shape) => normalizeShape(cloneShape(shape)));
    return this.replace(next);
  }
}
