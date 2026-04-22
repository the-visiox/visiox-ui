import type { EditorShape } from "./types";
import { cloneShape } from "./object-state";

function cloneSnapshot(shapes: EditorShape[]): EditorShape[] {
  return shapes.map(cloneShape);
}

export class AnnotationsHistory {
  private past: EditorShape[][] = [];
  private future: EditorShape[][] = [];

  reset(): void {
    this.past = [];
    this.future = [];
  }

  record(previous: EditorShape[]): void {
    this.past.push(cloneSnapshot(previous));
    this.future = [];
  }

  undo(current: EditorShape[]): EditorShape[] | null {
    const previous = this.past.pop();
    if (!previous) return null;
    this.future.push(cloneSnapshot(current));
    return cloneSnapshot(previous);
  }

  redo(current: EditorShape[]): EditorShape[] | null {
    const next = this.future.pop();
    if (!next) return null;
    this.past.push(cloneSnapshot(current));
    return cloneSnapshot(next);
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }
}
