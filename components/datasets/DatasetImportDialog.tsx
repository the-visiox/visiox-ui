"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  FileArchive,
  FileText,
  FolderTree,
  Image as ImageIcon,
  Loader2,
  Upload,
  X,
} from "lucide-react";

export type DatasetImportFormat = "images" | "yolo26";

const IMPORT_OPTIONS: Array<{ value: DatasetImportFormat; label: string }> = [
  { value: "images", label: "Images" },
  { value: "yolo26", label: "YOLO26" },
];

const subscribeToClient = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

const UPLOAD_RULES: Record<
  DatasetImportFormat,
  { accept: string; title: string; description: string; multiple: boolean; guide: string[] }
> = {
  images: {
    accept: "image/*,video/*,.mp4,.webm,.mov,.mkv,.avi,.m4v",
    title: "Drag and drop your images or videos here",
    description: "Images & videos - PNG, JPG, MP4, MOV...",
    multiple: true,
    guide: ["Upload image or video files.", "Duplicate files in the same selection are ignored."],
  },
  yolo26: {
    accept: ".zip,application/zip,application/x-zip-compressed",
    title: "Drag and drop your YOLO26 ZIP here",
    description: "Upload one .zip containing data.yaml plus train/valid/test folders",
    multiple: false,
    guide: [
      "The ZIP must include data.yaml or data.yml.",
      "Include both train/images and valid/images (or val/images) folders.",
      "Keep each labels folder beside its matching images folder.",
    ],
  },
};

const IMPORT_HINTS: Record<
  DatasetImportFormat,
  {
    title: string;
    description: string;
    testPath: string;
    structure: string;
    configLabel: string;
    configExample: string;
    checklist: string[];
  }
> = {
  images: {
    title: "Images upload guide",
    description: "Upload image or video files now and add annotations later in VisioX.",
    testPath: "images folder",
    structure: `dataset/
\`-- images/
    |-- image_001.jpg
    |-- image_002.png
    \`-- video_001.mp4`,
    configLabel: "Supported files",
    configExample: `Images: PNG, JPG, JPEG
Videos: MP4, MOV, WEBM`,
    checklist: [
      "Use this option when you only need to upload media files.",
      "You can annotate uploaded images in the VisioX annotation workspace.",
      "Duplicate files in the same selection are ignored.",
    ],
  },
  yolo26: {
    title: "YOLO26 ZIP import guide",
    description: "Upload one .zip archive that contains data.yaml and matching image/label folders.",
    testPath: "E:\\truck_detection.zip",
    structure: `truck_detection.zip
  |-- truck_detection/
    |-- data.yaml
    |-- train/
    |   |-- images/
    |   |-- labels/
    |-- valid/
    |   |-- images/
    |   |-- labels/
    |-- test/
        |-- images/
        |-- labels/`,
    configLabel: "data.yaml",
    configExample: `train: ../train/images
val: ../valid/images
test: ../test/images

nc: 1
names: ['truck']`,
    checklist: [
      "Choose YOLO26, then upload exactly one ZIP archive.",
      "Every image in images/ should have a matching .txt file in labels/.",
      "Keep class order in data.yaml names aligned with the label ids.",
    ],
  },
};

function isZipFile(file: File) {
  const name = file.name.toLowerCase();
  return name.endsWith(".zip") || file.type === "application/zip" || file.type === "application/x-zip-compressed";
}

function isMediaFile(file: File) {
  return file.type.startsWith("image/") || file.type.startsWith("video/");
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface DatasetImportDialogProps {
  open: boolean;
  datasetName: string;
  onClose: () => void;
  onSubmit: (files: File[], format: DatasetImportFormat, replaceExisting: boolean) => Promise<void>;
}

export default function DatasetImportDialog({ open, datasetName, onClose, onSubmit }: DatasetImportDialogProps) {
  const mounted = useSyncExternalStore(subscribeToClient, getClientSnapshot, getServerSnapshot);
  const [format, setFormat] = useState<DatasetImportFormat>("images");
  const [formatMenuOpen, setFormatMenuOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [hintOpen, setHintOpen] = useState(false);
  const [hintPosition, setHintPosition] = useState<{
    left: number;
    top: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formatMenuRef = useRef<HTMLDivElement>(null);
  const hintButtonRef = useRef<HTMLButtonElement>(null);
  const hintCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedOption = IMPORT_OPTIONS.find((option) => option.value === format) ?? IMPORT_OPTIONS[0];
  const rule = UPLOAD_RULES[format];
  const selectedHint = IMPORT_HINTS[format];
  const archiveImport = format !== "images";

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || submitting) return;
      if (hintOpen) {
        setHintOpen(false);
        return;
      }
      onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [hintOpen, onClose, open, submitting]);

  useEffect(() => {
    if (!formatMenuOpen) return;
    const closeMenu = (event: PointerEvent) => {
      if (!formatMenuRef.current?.contains(event.target as Node)) setFormatMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeMenu);
    return () => document.removeEventListener("pointerdown", closeMenu);
  }, [formatMenuOpen]);

  useEffect(() => {
    if (!hintOpen) return;

    const updateHintPosition = () => {
      const button = hintButtonRef.current;
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const viewportPadding = 16;
      const gap = 8;
      const width = Math.min(576, window.innerWidth - viewportPadding * 2);
      const left = Math.min(
        Math.max(rect.left, viewportPadding),
        window.innerWidth - width - viewportPadding,
      );
      const availableBelow = window.innerHeight - rect.bottom - gap - viewportPadding;

      if (availableBelow >= 240) {
        setHintPosition({ left, top: rect.bottom + gap, width, maxHeight: availableBelow });
        return;
      }

      const maxHeight = Math.max(160, rect.top - gap - viewportPadding);
      setHintPosition({
        left,
        top: Math.max(viewportPadding, rect.top - gap - maxHeight),
        width,
        maxHeight,
      });
    };

    updateHintPosition();
    window.addEventListener("resize", updateHintPosition);
    window.addEventListener("scroll", updateHintPosition, true);
    return () => {
      window.removeEventListener("resize", updateHintPosition);
      window.removeEventListener("scroll", updateHintPosition, true);
    };
  }, [hintOpen]);

  useEffect(
    () => () => {
      if (hintCloseTimerRef.current) clearTimeout(hintCloseTimerRef.current);
    },
    [],
  );

  if (!mounted || !open) return null;

  const addFiles = (incoming: FileList | File[]) => {
    const candidates = Array.from(incoming);
    if (archiveImport) {
      const archive = candidates.find(isZipFile);
      if (!archive) {
        setError(`Please upload one ${selectedOption.label} .zip archive.`);
        return;
      }
      setFiles([archive]);
      setError("");
      return;
    }

    const mediaFiles = candidates.filter(isMediaFile);
    if (mediaFiles.length === 0) {
      setError("Please upload image or video files.");
      return;
    }
    setFiles((current) => {
      const existing = new Set(current.map((file) => `${file.name}:${file.size}`));
      return [...current, ...mediaFiles.filter((file) => !existing.has(`${file.name}:${file.size}`))];
    });
    setError("");
  };

  const resetAndClose = () => {
    if (submitting) return;
    setFiles([]);
    setError("");
    setDragOver(false);
    setFormatMenuOpen(false);
    setHintOpen(false);
    onClose();
  };

  const showHint = () => {
    if (hintCloseTimerRef.current) clearTimeout(hintCloseTimerRef.current);
    setHintOpen(true);
  };

  const hideHint = () => {
    hintCloseTimerRef.current = setTimeout(() => setHintOpen(false), 100);
  };

  const startImport = () => {
    if (files.length === 0) {
      setError(archiveImport ? `Please upload one ${selectedOption.label} .zip archive.` : "Select files to upload.");
      return;
    }
    setSubmitting(true);
    setError("");
    const uploadTask = onSubmit(files, format, archiveImport && replaceExisting);
    setFiles([]);
    onClose();
    void uploadTask
      .catch(() => {
        // The dataset page owns background upload errors after this dialog closes.
      })
      .finally(() => setSubmitting(false));
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/35 p-3 backdrop-blur-sm sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) resetAndClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dataset-import-title"
        className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-stone-100 px-5 py-5 sm:px-8">
          <div className="min-w-0">
            <h2 id="dataset-import-title" className="text-xl font-bold tracking-tight text-stone-950 sm:text-2xl">
              Upload data
            </h2>
            <p className="mt-1 truncate text-sm text-stone-500">
              Add files to <span className="font-bold text-orange-600">{datasetName}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            disabled={submitting}
            aria-label="Close upload dialog"
            className="rounded-xl p-2.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30 disabled:opacity-50"
          >
            <X className="h-6 w-6" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-8">
          {error ? (
            <div role="alert" className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <section className="rounded-2xl border border-orange-200 bg-orange-50/60 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-orange-600 ring-1 ring-orange-100">
                  <FolderTree className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-stone-900">Dataset import format</h3>
                      <div className="relative z-30" onMouseEnter={showHint} onMouseLeave={hideHint}>
                        <button
                          ref={hintButtonRef}
                          type="button"
                          aria-describedby="dataset-upload-hint"
                          aria-label={`Show ${selectedHint.title}`}
                          aria-expanded={hintOpen}
                          onFocus={showHint}
                          onBlur={hideHint}
                          onClick={showHint}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-orange-600 transition-colors hover:bg-orange-100 focus-visible:bg-orange-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30"
                        >
                          <CircleHelp className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 text-xs leading-6 text-stone-600">Choose the annotation format to import.</p>
                  </div>
                </div>
              </div>

              <div ref={formatMenuRef} className="relative shrink-0">
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={formatMenuOpen}
                  disabled={submitting}
                  onClick={() => setFormatMenuOpen((current) => !current)}
                  className={[
                    "flex h-10 min-w-40 items-center justify-between gap-4 rounded-xl border bg-white px-3.5",
                    "text-sm font-bold text-stone-900 outline-none transition disabled:opacity-50",
                    formatMenuOpen
                      ? "border-orange-500 ring-2 ring-orange-500/15"
                      : "border-orange-200 hover:border-orange-400 focus-visible:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/20",
                  ].join(" ")}
                >
                  <span>{selectedOption.label}</span>
                  <ChevronDown className={`h-4 w-4 text-orange-500 transition-transform ${formatMenuOpen ? "rotate-180" : ""}`} />
                </button>
                {formatMenuOpen ? (
                  <div
                    role="listbox"
                    aria-label="Dataset import format"
                    className="absolute right-0 top-full z-40 mt-2 min-w-40 overflow-hidden rounded-xl border border-stone-200 bg-white p-1.5 shadow-xl"
                  >
                    {IMPORT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={option.value === format}
                        onClick={() => {
                          setFormat(option.value);
                          setFiles([]);
                          setError("");
                          setReplaceExisting(true);
                          setFormatMenuOpen(false);
                        }}
                        className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                          option.value === format
                            ? "bg-orange-50 font-bold text-orange-700"
                            : "font-medium text-stone-700 hover:bg-stone-50 hover:text-stone-950"
                        }`}
                      >
                        {option.label}
                        {option.value === format ? <Check className="h-4 w-4 text-orange-500" /> : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          {format === "yolo26" ? (
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-stone-200 bg-stone-50/70 p-4 transition-colors hover:border-orange-200 hover:bg-orange-50/40">
              <input
                type="checkbox"
                checked={replaceExisting}
                disabled={submitting}
                onChange={(event) => setReplaceExisting(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-orange-500"
              />
              <span className="min-w-0">
                <span className="block text-sm font-bold text-stone-900">Update matching images</span>
                <span className="mt-1 block text-xs leading-5 text-stone-600">
                  Reuse images with the same file name and replace their annotations. Existing files are not uploaded to
                  MinIO again.
                </span>
              </span>
            </label>
          ) : null}

          {hintOpen && hintPosition
            ? createPortal(
                <div
                  id="dataset-upload-hint"
                  role="tooltip"
                  onMouseEnter={showHint}
                  onMouseLeave={hideHint}
                  className="fixed z-[130] overflow-y-auto rounded-2xl border border-orange-200 bg-white p-5 shadow-xl"
                  style={hintPosition}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <p className="text-base font-bold text-stone-900">{selectedHint.title}</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-stone-600">{selectedHint.description}</p>
                  <p className="mt-2 text-sm text-stone-600">
                    Test path:{" "}
                    <code className="break-all rounded-md bg-stone-100 px-2 py-1 font-semibold text-stone-700">
                      {selectedHint.testPath}
                    </code>
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-orange-100 bg-orange-50/30 p-4 text-stone-800">
                      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-600">
                        <FileArchive className="h-4 w-4" /> Expected structure
                      </div>
                      <pre className="overflow-x-auto whitespace-pre font-mono text-[11px] leading-6">
{selectedHint.structure}
                      </pre>
                    </div>
                    <div className="rounded-xl border border-orange-100 bg-orange-50/30 p-4">
                      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-600">
                        <FileText className="h-4 w-4" /> {selectedHint.configLabel}
                      </div>
                      <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-6 text-stone-700">
{selectedHint.configExample}
                      </pre>
                    </div>
                  </div>

                  <ul className="mt-5 space-y-3 text-sm leading-5 text-stone-700">
                    {selectedHint.checklist.map((item) => (
                      <li key={item} className="grid grid-cols-[20px_minmax(0,1fr)] gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-100">
                          <Check className="h-3.5 w-3.5 text-orange-600" />
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>,
                document.body,
              )
            : null}

          <section>
            <input
              ref={fileInputRef}
              type="file"
              multiple={rule.multiple}
              accept={rule.accept}
              className="hidden"
              onChange={(event) => {
                if (event.target.files) addFiles(event.target.files);
                event.target.value = "";
              }}
            />
            <div
              role="button"
              tabIndex={submitting ? -1 : 0}
              aria-disabled={submitting}
              onClick={() => !submitting && fileInputRef.current?.click()}
              onKeyDown={(event) => {
                if (!submitting && (event.key === "Enter" || event.key === " ")) fileInputRef.current?.click();
              }}
              onDragOver={(event) => {
                event.preventDefault();
                if (!submitting) setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(false);
                if (!submitting) addFiles(event.dataTransfer.files);
              }}
              className={`min-h-52 rounded-2xl border border-dashed px-4 py-6 outline-none transition-all ${
                submitting ? "cursor-not-allowed opacity-50" : "cursor-pointer"
              } ${
                dragOver
                  ? "border-orange-500 bg-orange-50"
                  : "border-orange-300 bg-orange-50/20 hover:border-orange-500 hover:bg-orange-50/50 focus-visible:ring-2 focus-visible:ring-orange-500/30"
              }`}
            >
              {files.length === 0 ? (
                <div className="flex min-h-40 flex-col items-center justify-center text-center">
                  <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50">
                    <Upload className="h-7 w-7 text-orange-500" />
                  </span>
                  <p className="text-sm font-semibold text-stone-700">{rule.title}</p>
                  <p className="my-2 text-xs text-stone-400">or</p>
                  <span className="rounded-xl border border-orange-500 bg-white px-5 py-2.5 text-sm font-bold text-orange-600">
                    Browse files
                  </span>
                  <p className="mt-4 text-xs text-stone-400">{rule.description}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-stone-700">
                      {files.length} file{files.length === 1 ? "" : "s"} selected
                    </p>
                    <span className="text-xs text-orange-500">{archiveImport ? "Click or drop replacement" : "Click or drop more"}</span>
                  </div>
                  <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                    {files.map((file, index) => (
                      <div key={`${file.name}:${file.size}`} className="flex items-center gap-3 rounded-xl border border-stone-100 bg-white px-3 py-2 shadow-sm">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-100">
                          {archiveImport ? (
                            <FileArchive className="h-4 w-4 text-orange-500" />
                          ) : (
                            <ImageIcon className="h-4 w-4 text-orange-400" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-stone-700">{file.name}</span>
                          <span className="block text-xs text-stone-400">{formatSize(file.size)}</span>
                        </span>
                        {!submitting ? (
                          <button
                            type="button"
                            aria-label={`Remove ${file.name}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              setFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
                            }}
                            className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-500"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        <footer className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-stone-100 bg-white px-5 py-4 sm:px-8">
          <button
            type="button"
            onClick={resetAndClose}
            disabled={submitting}
            className="h-11 rounded-xl border border-stone-200 bg-white px-6 text-sm font-bold text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={startImport}
            disabled={submitting || files.length === 0}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 text-sm font-bold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {submitting ? "Starting import..." : "Start import"}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
