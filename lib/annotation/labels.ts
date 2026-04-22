import type { LabelDefinition } from "./types";

export type LabelMeta = {
  name: string;
  color: string;
};

export function buildLabelMetaMap(labels: LabelDefinition[]): Map<number, LabelMeta> {
  return new Map(labels.map((label) => [label.id, { name: label.name, color: label.color }]));
}

export function colorFor(labels: LabelDefinition[], classLabelId: number): string {
  return labels.find((label) => label.id === classLabelId)?.color ?? "#f97316";
}

export function labelNameFor(labels: LabelDefinition[], classLabelId: number): string {
  return labels.find((label) => label.id === classLabelId)?.name ?? "Label";
}

export function colorFromMap(map: Map<number, LabelMeta>, classLabelId: number): string {
  return map.get(classLabelId)?.color ?? "#f97316";
}

export function labelNameFromMap(map: Map<number, LabelMeta>, classLabelId: number): string {
  return map.get(classLabelId)?.name ?? "Label";
}
