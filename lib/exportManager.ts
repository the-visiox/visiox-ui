"use client";

import { useSyncExternalStore } from "react";
import { datasets, type DatasetExportFormat } from "@/lib/api";

export interface BackgroundExportTask {
  id: string;
  datasetId: number;
  datasetName: string;
  format: DatasetExportFormat;
  formatLabel: string;
  saveImages: boolean;
  status: "preparing" | "completed" | "error";
  filename?: string;
  error?: string;
  startedAt: number;
}

const EXPORT_FORMAT_LABELS: Record<DatasetExportFormat, string> = {
  coco: "COCO",
  coco_keypoints: "COCO Keypoints",
  yolo: "YOLO",
  imagenet: "ImageNet",
  voc: "Pascal VOC",
  mask: "Segmentation Mask",
};

let tasks: BackgroundExportTask[] = [];
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function safeFilename(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "dataset";
}

export function startBackgroundExport(
  target: { id: number; name: string },
  format: DatasetExportFormat,
  saveImages: boolean,
) {
  const taskId = `${target.id}-${format}-${Date.now()}`;
  const formatLabel = EXPORT_FORMAT_LABELS[format] || format.toUpperCase();

  const task: BackgroundExportTask = {
    id: taskId,
    datasetId: target.id,
    datasetName: target.name,
    format,
    formatLabel,
    saveImages,
    status: "preparing",
    startedAt: Date.now(),
  };

  tasks = [task, ...tasks];
  emitChange();

  void (async () => {
    try {
      const blob = await datasets.exportArchive(target.id, format, saveImages);
      const filename = `${safeFilename(target.name)}-${format}.zip`;

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);

      tasks = tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: "completed",
              filename,
            }
          : t,
      );
      emitChange();

      // Automatically clean up completed task after 4 seconds
      window.setTimeout(() => {
        dismissExportTask(taskId);
      }, 4000);
    } catch (err) {
      tasks = tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: "error",
              error: err instanceof Error ? err.message : "Export failed.",
            }
          : t,
      );
      emitChange();
    }
  })();

  return taskId;
}

export function dismissExportTask(taskId: string) {
  tasks = tasks.filter((t) => t.id !== taskId);
  emitChange();
}

export function useBackgroundExports(): BackgroundExportTask[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => tasks,
    () => [],
  );
}
