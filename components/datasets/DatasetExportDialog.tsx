"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, CheckCircle2, ChevronDown, Copy, Download, Image as ImageIcon, Tags, X } from "lucide-react";

import { datasets, type DatasetExportFormat } from "@/lib/api";

const EXPORT_FORMAT_GROUPS = [
  {
    label: "JSON",
    formats: [
      { value: "coco", label: "COCO" },
      { value: "coco_keypoints", label: "COCO Keypoints" },
    ],
  },
  {
    label: "TXT",
    formats: [
      { value: "yolo", label: "YOLO" },
      { value: "imagenet", label: "ImageNet" },
    ],
  },
  {
    label: "XML",
    formats: [{ value: "voc", label: "Pascal VOC" }],
  },
  {
    label: "PNG",
    formats: [{ value: "mask", label: "Segmentation Mask" }],
  },
] as const;

type ExportFormat = DatasetExportFormat;
type DownloadOption = "download" | "code";
type DialogStep = "options" | "code";
type ExportContent = "images-and-labels" | "labels-only";

interface WritableFileHandle {
  createWritable: () => Promise<{
    write: (data: Blob) => Promise<void>;
    close: () => Promise<void>;
  }>;
}

interface WritableDirectoryHandle {
  getFileHandle: (name: string, options: { create: boolean }) => Promise<WritableFileHandle>;
}

interface WindowWithFilePickers extends Window {
  showSaveFilePicker?: (options: {
    suggestedName: string;
    types: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<WritableFileHandle>;
  showDirectoryPicker?: (options: { mode: "readwrite" }) => Promise<WritableDirectoryHandle>;
}

const EXPORT_LABELS = new Map<ExportFormat, string>(
  EXPORT_FORMAT_GROUPS.flatMap((group) => group.formats.map((format) => [format.value, format.label] as const)),
);

export interface DatasetExportTarget {
  id: number;
  name: string;
}

interface DatasetExportDialogProps {
  targets: readonly DatasetExportTarget[];
  exportName: string;
  dialogTitle?: string;
  subtitle?: string;
  open: boolean;
  onClose: () => void;
}

function safeFilename(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "dataset";
}

export default function DatasetExportDialog({
  targets,
  exportName,
  dialogTitle = "Download dataset",
  subtitle,
  open,
  onClose,
}: DatasetExportDialogProps) {
  const formatButtonId = useId();
  const formatListId = useId();
  const dialogTitleId = useId();
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | null>(null);
  const [exportContent, setExportContent] = useState<ExportContent>("images-and-labels");
  const [downloadOption, setDownloadOption] = useState<DownloadOption>("download");
  const [formatMenuOpen, setFormatMenuOpen] = useState(false);
  const [step, setStep] = useState<DialogStep>("options");
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const formatMenuRef = useRef<HTMLDivElement>(null);

  const closeDialog = useCallback(() => {
    setSelectedFormat(null);
    setExportContent("images-and-labels");
    setDownloadOption("download");
    setFormatMenuOpen(false);
    setStep("options");
    setCopied(false);
    setExporting(false);
    setExportError("");
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (exporting) return;
      if (formatMenuOpen) {
        setFormatMenuOpen(false);
        return;
      }
      closeDialog();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeDialog, exporting, formatMenuOpen, open]);

  useEffect(() => {
    if (!formatMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!formatMenuRef.current?.contains(event.target as Node)) {
        setFormatMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [formatMenuOpen]);

  if (!open || typeof document === "undefined") return null;

  const exportItems = selectedFormat
    ? targets.map((target) => ({
        target,
        url: datasets.exportUrl(target.id, selectedFormat, exportContent === "images-and-labels"),
      }))
    : [];
  const codeItems = exportItems.map(({ target, url: exportUrl }) => {
    const url = new URL(exportUrl);
    url.searchParams.delete("token");
    url.searchParams.delete("format");
    url.searchParams.delete("export_format");
    url.searchParams.delete("save_images");
    return {
      name: safeFilename(target.name),
      url: url.toString(),
    };
  });
  const saveImagesParam = exportContent === "images-and-labels" ? "1" : "0";
  const codeSnippet = selectedFormat
    ? targets.length === 1
      ? [
          "import requests",
          "",
          `url = "${codeItems[0]?.url ?? ""}"`,
          'headers = {"Authorization": "Bearer <YOUR_ACCESS_TOKEN>"}',
          `params = {"export_format": "${selectedFormat}", "save_images": "${saveImagesParam}"}`,
          "",
          "response = requests.get(url, headers=headers, params=params)",
          "response.raise_for_status()",
          "",
          `with open("${codeItems[0]?.name ?? safeFilename(exportName)}-${selectedFormat}.zip", "wb") as file:`,
          "    file.write(response.content)",
        ].join("\n")
      : [
          "import requests",
          "",
          `datasets_to_download = ${JSON.stringify(codeItems, null, 4)}`,
          'headers = {"Authorization": "Bearer <YOUR_ACCESS_TOKEN>"}',
          `params = {"export_format": "${selectedFormat}", "save_images": "${saveImagesParam}"}`,
          "",
          "for dataset in datasets_to_download:",
          '    response = requests.get(dataset["url"], headers=headers, params=params)',
          "    response.raise_for_status()",
          `    filename = f'{dataset["name"]}-${selectedFormat}.zip'`,
          '    with open(filename, "wb") as file:',
          "        file.write(response.content)",
        ].join("\n")
    : "";

  const handleContinue = async () => {
    if (!selectedFormat || exportItems.length === 0) return;

    if (downloadOption === "code") {
      setStep("code");
      return;
    }

    setExporting(true);
    setExportError("");

    const pickerWindow = window as WindowWithFilePickers;
    let fileHandle: WritableFileHandle | null = null;
    let directoryHandle: WritableDirectoryHandle | null = null;
    let completed = false;

    try {
      if (exportItems.length === 1 && pickerWindow.showSaveFilePicker) {
        const target = exportItems[0].target;
        fileHandle = await pickerWindow.showSaveFilePicker({
          suggestedName: `${safeFilename(target.name)}-${selectedFormat}.zip`,
          types: [
            {
              description: "ZIP archive",
              accept: { "application/zip": [".zip"] },
            },
          ],
        });
      } else if (exportItems.length > 1 && pickerWindow.showDirectoryPicker) {
        directoryHandle = await pickerWindow.showDirectoryPicker({
          mode: "readwrite",
        });
      }

      for (const { target } of exportItems) {
        const blob = await datasets.exportArchive(target.id, selectedFormat, exportContent === "images-and-labels");
        const filename = `${safeFilename(target.name)}-${selectedFormat}.zip`;

        if (fileHandle) {
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
        } else if (directoryHandle) {
          const targetFile = await directoryHandle.getFileHandle(filename, {
            create: true,
          });
          const writable = await targetFile.createWritable();
          await writable.write(blob);
          await writable.close();
        } else {
          const objectUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = objectUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
        }
      }

      completed = true;
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setExportError(error instanceof Error ? error.message : "Dataset export failed.");
      }
    } finally {
      setExporting(false);
    }

    if (completed) closeDialog();
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codeSnippet);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return createPortal(
    <div
      className={[
        "fixed inset-0 z-[250] flex items-center justify-center bg-stone-950/45",
        "p-4 backdrop-blur-sm",
      ].join(" ")}
      onMouseDown={(event) => {
        if (!exporting && event.target === event.currentTarget) closeDialog();
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
        aria-busy={exporting}
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={[
          "w-full max-w-2xl overflow-visible rounded-2xl border border-stone-200 bg-[#fcfaf7]",
          "shadow-2xl shadow-stone-950/20",
        ].join(" ")}
      >
        <div className={["flex items-center justify-between border-b border-stone-200 px-5 py-4", "sm:px-6"].join(" ")}>
          <div className="flex items-center gap-3">
            <div
              className={[
                "flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100",
                "text-orange-600",
              ].join(" ")}
            >
              <Download className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h2 id={dialogTitleId} className="text-lg font-bold text-stone-900">
                {step === "code" ? "Download code" : dialogTitle}
              </h2>
              <p className="mt-0.5 text-xs font-medium text-stone-500">
                {subtitle ?? (targets.length === 1 ? targets[0]?.name : `${exportName} - ${targets.length} datasets`)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeDialog}
            disabled={exporting}
            className={[
              "rounded-xl p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50",
              "disabled:cursor-not-allowed disabled:opacity-40",
            ].join(" ")}
            aria-label="Close export dialog"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {step === "options" ? (
          <>
            <div className="max-h-[calc(100vh-10rem)] space-y-7 overflow-y-auto px-5 py-6 sm:px-6">
              <div>
                <label htmlFor={formatButtonId} className="mb-2 block text-sm font-bold text-stone-800">
                  Image and annotation format
                </label>
                <div ref={formatMenuRef} className="relative">
                  <button
                    id={formatButtonId}
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={formatMenuOpen}
                    aria-controls={formatListId}
                    onClick={() => setFormatMenuOpen((current) => !current)}
                    disabled={exporting}
                    className={`flex h-11 w-full items-center justify-between rounded-xl border bg-white
                      px-3.5 text-left text-sm font-medium transition
                      focus-visible:outline-none focus-visible:ring-2
                      focus-visible:ring-orange-400/35 ${
                        formatMenuOpen
                          ? "border-orange-400 ring-2 ring-orange-100"
                          : "border-stone-300 hover:border-stone-400"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <span className={selectedFormat ? "text-stone-800" : "text-stone-500"}>
                      {selectedFormat ? EXPORT_LABELS.get(selectedFormat) : "Select a format"}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-stone-400 transition-transform ${formatMenuOpen ? "rotate-180" : ""}`}
                      aria-hidden
                    />
                  </button>

                  <AnimatePresence>
                    {formatMenuOpen ? (
                      <motion.div
                        id={formatListId}
                        role="listbox"
                        aria-labelledby={formatButtonId}
                        initial={{ opacity: 0, y: -6, scale: 0.99 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.99 }}
                        transition={{ duration: 0.14 }}
                        className={[
                          "absolute left-0 right-0 top-[calc(100%+0.45rem)] z-20 max-h-72 overflow-y-auto",
                          "rounded-xl border border-stone-200 bg-white p-1.5 shadow-xl shadow-stone-300/40",
                        ].join(" ")}
                      >
                        {EXPORT_FORMAT_GROUPS.map((group) => (
                          <div
                            key={group.label}
                            className="mb-1 border-b border-stone-100 pb-1 last:mb-0 last:border-b-0 last:pb-0"
                          >
                            <p
                              className={[
                                "px-2.5 pb-1 pt-1.5 text-[10px] font-extrabold uppercase",
                                "tracking-[0.16em] text-stone-400",
                              ].join(" ")}
                            >
                              {group.label}
                            </p>
                            {group.formats.map((format) => {
                              const selected = selectedFormat === format.value;
                              return (
                                <button
                                  key={format.value}
                                  type="button"
                                  role="option"
                                  aria-selected={selected}
                                  onClick={() => {
                                    setSelectedFormat(format.value);
                                    setFormatMenuOpen(false);
                                  }}
                                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2
                                    text-left text-sm font-semibold transition ${
                                      selected ? "bg-orange-50 text-orange-700" : "text-stone-700 hover:bg-stone-50"
                                    }`}
                                >
                                  {format.label}
                                  {selected ? <Check className="h-4 w-4 text-orange-500" aria-hidden /> : null}
                                </button>
                              );
                            })}
                          </div>
                        ))}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>

              <fieldset disabled={exporting} className="disabled:opacity-60">
                <legend className="mb-2.5 text-sm font-bold text-stone-800">Export contents</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label
                    className={`flex min-h-[88px] cursor-pointer items-start gap-3 rounded-xl border
                      px-4 py-3.5 transition focus-within:ring-2
                      focus-within:ring-orange-400/30 ${
                        exportContent === "images-and-labels"
                          ? "border-orange-300 bg-orange-50/60"
                          : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50"
                      }`}
                  >
                    <input
                      type="radio"
                      name="dataset-export-content"
                      value="images-and-labels"
                      checked={exportContent === "images-and-labels"}
                      onChange={() => setExportContent("images-and-labels")}
                      className="peer sr-only"
                    />
                    <span
                      aria-hidden
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
                        exportContent === "images-and-labels"
                          ? "bg-orange-500 text-white shadow-sm shadow-orange-500/25"
                          : "bg-stone-100 text-stone-400 peer-hover:text-stone-600"
                      }`}
                    >
                      <ImageIcon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-stone-800">Images + labels</span>
                      <span className="mt-1 block text-xs leading-5 text-stone-500">
                        Include source images and annotation files in the ZIP.
                      </span>
                    </span>
                  </label>

                  <label
                    className={`flex min-h-[88px] cursor-pointer items-start gap-3 rounded-xl border
                      px-4 py-3.5 transition focus-within:ring-2
                      focus-within:ring-orange-400/30 ${
                        exportContent === "labels-only"
                          ? "border-orange-300 bg-orange-50/60"
                          : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50"
                      }`}
                  >
                    <input
                      type="radio"
                      name="dataset-export-content"
                      value="labels-only"
                      checked={exportContent === "labels-only"}
                      onChange={() => setExportContent("labels-only")}
                      className="peer sr-only"
                    />
                    <span
                      aria-hidden
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
                        exportContent === "labels-only"
                          ? "bg-orange-500 text-white shadow-sm shadow-orange-500/25"
                          : "bg-stone-100 text-stone-400 peer-hover:text-stone-600"
                      }`}
                    >
                      <Tags className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-stone-800">Labels only</span>
                      <span className="mt-1 block text-xs leading-5 text-stone-500">
                        Export annotations and classes without source images.
                      </span>
                    </span>
                  </label>
                </div>
              </fieldset>

              <fieldset disabled={exporting} className="disabled:opacity-60">
                <legend className="mb-2.5 text-sm font-bold text-stone-800">Download options</legend>
                <div className="space-y-2">
                  <label
                    className={`flex min-h-[76px] cursor-pointer items-start gap-3 rounded-xl border
                      px-4 py-3.5 transition focus-within:ring-2
                      focus-within:ring-orange-400/30 ${
                        downloadOption === "download"
                          ? "border-orange-300 bg-orange-50/60"
                          : "border-transparent hover:bg-stone-100/70"
                      }`}
                  >
                    <input
                      type="radio"
                      name="dataset-download-option"
                      value="download"
                      checked={downloadOption === "download"}
                      onChange={() => setDownloadOption("download")}
                      className="peer sr-only"
                    />
                    <span
                      aria-hidden
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full
                        border-2 bg-white transition ${
                          downloadOption === "download"
                            ? "border-orange-500 shadow-sm shadow-orange-500/20"
                            : "border-stone-300 peer-hover:border-stone-400"
                        }`}
                    >
                      <span
                        className={`h-2.5 w-2.5 rounded-full bg-orange-500 transition-transform ${
                          downloadOption === "download" ? "scale-100" : "scale-0"
                        }`}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-stone-800">Save ZIP to computer</span>
                      <span className="mt-1 block text-sm leading-5 text-stone-500">
                        Choose a save location when supported by your browser.
                      </span>
                    </span>
                  </label>

                  <label
                    className={`flex min-h-[76px] cursor-pointer items-start gap-3 rounded-xl border
                      px-4 py-3.5 transition focus-within:ring-2
                      focus-within:ring-orange-400/30 ${
                        downloadOption === "code"
                          ? "border-orange-300 bg-orange-50/60"
                          : "border-transparent hover:bg-stone-100/70"
                      }`}
                  >
                    <input
                      type="radio"
                      name="dataset-download-option"
                      value="code"
                      checked={downloadOption === "code"}
                      onChange={() => setDownloadOption("code")}
                      className="peer sr-only"
                    />
                    <span
                      aria-hidden
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full
                        border-2 bg-white transition ${
                          downloadOption === "code"
                            ? "border-orange-500 shadow-sm shadow-orange-500/20"
                            : "border-stone-300 peer-hover:border-stone-400"
                        }`}
                    >
                      <span
                        className={`h-2.5 w-2.5 rounded-full bg-orange-500 transition-transform ${
                          downloadOption === "code" ? "scale-100" : "scale-0"
                        }`}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-stone-800">Show download code</span>
                      <span className="mt-1 block text-sm leading-5 text-stone-500">
                        {targets.length === 1
                          ? "Use a Python snippet to download this dataset in a notebook."
                          : "Use a Python loop to download every dataset in a notebook."}
                      </span>
                    </span>
                  </label>
                </div>
              </fieldset>

              {exportError ? (
                <div
                  role="alert"
                  className={[
                    "rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm",
                    "font-medium text-red-700",
                  ].join(" ")}
                >
                  {exportError}
                </div>
              ) : null}
            </div>

            <div
              className={[
                "flex items-center justify-between gap-3 border-t border-stone-200 bg-white/70 px-5",
                "py-3.5 sm:px-6",
              ].join(" ")}
            >
              <button
                type="button"
                onClick={closeDialog}
                disabled={exporting}
                className={[
                  "h-10 rounded-xl border border-stone-300 bg-white px-4 text-sm font-bold text-stone-600",
                  "transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2",
                  "focus-visible:ring-orange-400/40 disabled:cursor-not-allowed disabled:opacity-50",
                ].join(" ")}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedFormat || targets.length === 0 || exporting}
                onClick={() => void handleContinue()}
                className={[
                  "flex h-10 items-center rounded-xl bg-gradient-to-r from-[#E66700] via-[#FF7300]",
                  "to-[#F1A222] px-5 text-sm font-bold text-white shadow-lg shadow-orange-500/20",
                  "disabled:pointer-events-none disabled:opacity-45",
                ].join(" ")}
              >
                {exporting ? "Preparing ZIP..." : "Continue"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="px-5 py-6 sm:px-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-stone-800">Python requests</p>
                  <p className="mt-0.5 text-xs text-stone-500">Replace the access-token placeholder before running.</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  className={[
                    "flex h-9 shrink-0 items-center gap-2 rounded-xl border border-stone-200 bg-white px-3",
                    "text-xs font-bold text-stone-600 transition hover:bg-stone-50",
                  ].join(" ")}
                >
                  {copied ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
                  ) : (
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                  )}
                  {copied ? "Copied" : "Copy code"}
                </button>
              </div>
              <pre
                className={[
                  "max-h-80 overflow-auto rounded-2xl bg-stone-950 p-4 text-xs leading-6 text-stone-100",
                  "shadow-inner",
                ].join(" ")}
              >
                <code>{codeSnippet}</code>
              </pre>
            </div>

            <div
              className={[
                "flex items-center justify-between gap-3 border-t border-stone-200 bg-white/70 px-5",
                "py-3.5 sm:px-6",
              ].join(" ")}
            >
              <button
                type="button"
                onClick={() => setStep("options")}
                className={[
                  "h-10 rounded-xl border border-stone-300 bg-white px-4 text-sm font-bold text-stone-600",
                  "transition hover:bg-stone-50",
                ].join(" ")}
              >
                Back
              </button>
              <button
                type="button"
                onClick={closeDialog}
                className={[
                  "h-10 rounded-xl bg-stone-900 px-5 text-sm font-bold text-white",
                  "transition hover:bg-stone-800",
                ].join(" ")}
              >
                Done
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>,
    document.body,
  );
}
