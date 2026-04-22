import type { SetStateAction } from "react";
import type { EditorShape } from "./types";
import { AnnotationsCollection } from "./annotations-collection";
import { AnnotationsHistory } from "./annotations-history";

export class AnnotationSession {
  private readonly collection = new AnnotationsCollection();
  private readonly history = new AnnotationsHistory();

  hydrate(shapes: EditorShape[]): EditorShape[] {
    this.history.reset();
    return this.collection.replace(shapes);
  }

  export(): EditorShape[] {
    return this.collection.export();
  }

  update(action: SetStateAction<EditorShape[]>): EditorShape[] {
    const previous = this.collection.export();
    const next = typeof action === "function" ? action(previous) : action;
    if (next === previous) return previous;
    this.history.record(previous);
    return this.collection.replace(next);
  }

  undo(): EditorShape[] | null {
    const previous = this.history.undo(this.collection.export());
    return previous ? this.collection.replace(previous) : null;
  }

  redo(): EditorShape[] | null {
    const next = this.history.redo(this.collection.export());
    return next ? this.collection.replace(next) : null;
  }

  get canUndo(): boolean {
    return this.history.canUndo;
  }

  get canRedo(): boolean {
    return this.history.canRedo;
  }
}
