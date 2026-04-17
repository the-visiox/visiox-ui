import type { LabelDefinition } from "@/lib/types/annotation";

export type LabelMeta = {
  name: string;
  color: string;
};

export function buildLabelMetaMap(labels: LabelDefinition[]): Map<number, LabelMeta> {
  return new Map(labels.map((label) => [label.id, { name: label.name, color: label.color }]));
}

export function colorFor(labels: LabelDefinition[], classLabelId: number): string {
  return labels.find((l) => l.id === classLabelId)?.color ?? "#f97316";
}

export function labelNameFor(labels: LabelDefinition[], classLabelId: number): string {
  return labels.find((l) => l.id === classLabelId)?.name ?? "Label";
}

export function colorFromMap(labelMetaMap: Map<number, LabelMeta>, classLabelId: number): string {
  return labelMetaMap.get(classLabelId)?.color ?? "#f97316";
}

export function labelNameFromMap(labelMetaMap: Map<number, LabelMeta>, classLabelId: number): string {
  return labelMetaMap.get(classLabelId)?.name ?? "Label";
}
