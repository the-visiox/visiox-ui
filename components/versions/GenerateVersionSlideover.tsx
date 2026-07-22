"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Server, Layers, Settings, Zap } from "lucide-react";

interface VersionConfig {
  trainSplit: number;
  valSplit: number;
  testSplit: number;
  preprocessing: {
    autoOrient: boolean;
    resize: boolean;
    resizeWidth: number;
    resizeHeight: number;
  };
}

interface GenerateVersionSlideoverProps {
  isOpen: boolean;
  onClose: () => void;
  datasetId: string;
  onGenerate: (name: string, config: VersionConfig) => void;
}

export default function GenerateVersionSlideover({
  isOpen,
  onClose,
  datasetId,
  onGenerate,
}: GenerateVersionSlideoverProps) {
  const [versionName, setVersionName] = useState("v1");
  const [trainSplit, setTrainSplit] = useState(70);
  const [valSplit, setValSplit] = useState(20);
  const [testSplit, setTestSplit] = useState(10);

  const [preprocessing, setPreprocessing] = useState({
    autoOrient: true,
    resize: true,
    resizeWidth: 640,
    resizeHeight: 640,
  });

  const handleGenerate = () => {
    onGenerate(versionName, { trainSplit, valSplit, testSplit, preprocessing });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-40"
          />

          {/* Slideover Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={[
              "fixed right-0 top-0 bottom-0 w-full max-w-md bg-white border-l border-stone-200 z-50",
              "shadow-2xl flex flex-col",
            ].join(" ")}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-stone-100">
              <div>
                <h2 className="text-xl font-bold text-stone-900">Generate Version</h2>
                <p className="text-xs text-stone-500 font-medium tracking-wide mt-1 uppercase">
                  Dataset ID: {datasetId}
                </p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-stone-500" />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Version Naming */}
              <section className="space-y-3">
                <label
                  className={[
                    "text-xs font-bold text-stone-900 uppercase tracking-widest flex",
                    "items-center gap-2",
                  ].join(" ")}
                >
                  <Server className="w-4 h-4 text-stone-400" />
                  Version Name
                </label>
                <input
                  type="text"
                  value={versionName}
                  onChange={(e) => setVersionName(e.target.value)}
                  className={[
                    "w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm font-bold",
                    "text-stone-900 focus:outline-none focus:border-orange-500 focus:ring-1",
                    "focus:ring-orange-500 transition-all",
                  ].join(" ")}
                  placeholder="e.g., v1-baseline"
                />
              </section>

              {/* Data Splitting */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <label
                    className={[
                      "text-xs font-bold text-stone-900 uppercase tracking-widest flex",
                      "items-center gap-2",
                    ].join(" ")}
                  >
                    <Layers className="w-4 h-4 text-stone-400" />
                    Data Split
                  </label>
                  <span className="text-[10px] font-bold text-stone-400 bg-stone-100 px-2 py-1 rounded-lg">
                    {trainSplit + valSplit + testSplit}%
                  </span>
                </div>

                <div className="flex h-4 rounded-full overflow-hidden border border-stone-200">
                  <div style={{ width: `${trainSplit}%` }} className="bg-emerald-400 transition-all" />
                  <div style={{ width: `${valSplit}%` }} className="bg-amber-400 transition-all" />
                  <div style={{ width: `${testSplit}%` }} className="bg-red-400 transition-all" />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 text-center">
                    <p className="text-[10px] uppercase font-bold text-emerald-600 mb-1">Train</p>
                    <input
                      type="number"
                      value={trainSplit}
                      onChange={(e) => setTrainSplit(Number(e.target.value))}
                      className={[
                        "w-full bg-transparent text-center font-black text-lg text-stone-900",
                        "focus:outline-none",
                      ].join(" ")}
                    />
                  </div>
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 text-center">
                    <p className="text-[10px] uppercase font-bold text-amber-600 mb-1">Val</p>
                    <input
                      type="number"
                      value={valSplit}
                      onChange={(e) => setValSplit(Number(e.target.value))}
                      className={[
                        "w-full bg-transparent text-center font-black text-lg text-stone-900",
                        "focus:outline-none",
                      ].join(" ")}
                    />
                  </div>
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 text-center">
                    <p className="text-[10px] uppercase font-bold text-red-600 mb-1">Test</p>
                    <input
                      type="number"
                      value={testSplit}
                      onChange={(e) => setTestSplit(Number(e.target.value))}
                      className={[
                        "w-full bg-transparent text-center font-black text-lg text-stone-900",
                        "focus:outline-none",
                      ].join(" ")}
                    />
                  </div>
                </div>
              </section>

              {/* Preprocessing */}
              <section className="space-y-4">
                <label
                  className={[
                    "text-xs font-bold text-stone-900 uppercase tracking-widest flex",
                    "items-center gap-2",
                  ].join(" ")}
                >
                  <Settings className="w-4 h-4 text-stone-400" />
                  Preprocessing
                </label>

                <div className="space-y-3">
                  <label
                    className={[
                      "flex items-center justify-between p-4 bg-stone-50 border border-stone-100 rounded-xl",
                      "cursor-pointer hover:border-stone-300 transition-all",
                    ].join(" ")}
                  >
                    <div>
                      <p className="text-sm font-bold text-stone-900">Auto-Orient</p>
                      <p className="text-xs text-stone-500 mt-1">Strips EXIF rotation data</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preprocessing.autoOrient}
                      onChange={(e) => setPreprocessing({ ...preprocessing, autoOrient: e.target.checked })}
                      className="w-5 h-5 accent-orange-500"
                    />
                  </label>

                  <div className="p-4 bg-stone-50 border border-stone-100 rounded-xl">
                    <label className="flex items-center justify-between cursor-pointer mb-3">
                      <div>
                        <p className="text-sm font-bold text-stone-900">Resize Base</p>
                        <p className="text-xs text-stone-500 mt-1">Stretch/Pad to dimensions</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={preprocessing.resize}
                        onChange={(e) => setPreprocessing({ ...preprocessing, resize: e.target.checked })}
                        className="w-5 h-5 accent-orange-500"
                      />
                    </label>

                    {preprocessing.resize && (
                      <div className="flex items-center gap-2 pt-2 border-t border-stone-200">
                        <input
                          type="number"
                          value={preprocessing.resizeWidth}
                          onChange={(e) => setPreprocessing({ ...preprocessing, resizeWidth: Number(e.target.value) })}
                          className={[
                            "flex-1 bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm font-bold",
                            "text-center",
                          ].join(" ")}
                        />
                        <span className="text-stone-400 font-bold">x</span>
                        <input
                          type="number"
                          value={preprocessing.resizeHeight}
                          onChange={(e) => setPreprocessing({ ...preprocessing, resizeHeight: Number(e.target.value) })}
                          className={[
                            "flex-1 bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm font-bold",
                            "text-center",
                          ].join(" ")}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>

            {/* Footer / Actions */}
            <div className="p-6 border-t border-stone-100 bg-stone-50 flex gap-4">
              <button
                onClick={onClose}
                className={[
                  "flex-1 py-3.5 bg-white border border-stone-200 text-stone-600 rounded-xl font-bold",
                  "hover:bg-stone-100 transition-all",
                ].join(" ")}
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                className={[
                  "flex-1 py-3.5 bg-orange-500 text-white rounded-xl font-bold shadow-xl",
                  "shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex",
                  "items-center justify-center gap-2",
                ].join(" ")}
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>Generate</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
