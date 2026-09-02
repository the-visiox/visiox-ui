"use client";

import React from "react";
import Image from "next/image";
import { experimental_VGrid as VGrid } from "virtua";
import { motion } from "framer-motion";

import { useRouter, useParams } from "next/navigation";

interface ImageItem {
  id: string;
  url: string;
  name: string;
  labelCount: number;
}

interface ImageGridProps {
  images: ImageItem[];
  columns?: number;
}

const ImageGrid: React.FC<ImageGridProps> = ({ images, columns = 6 }) => {
  const router = useRouter();
  const params = useParams();
  const rowCount = Math.ceil(images.length / columns);
  const datasetId = params.id as string;

  return (
    <div
      className={["w-full h-[800px] border border-stone-200 rounded-3xl bg-stone-50/50", "overflow-hidden"].join(" ")}
    >
      <VGrid cellHeight={240} cellWidth={200} row={rowCount} col={columns} className="h-full p-4">
        {({ rowIndex, colIndex }) => {
          const image = images[rowIndex * columns + colIndex];
          if (!image) return <div className="p-2" />;

          return (
            <div className="p-2 h-full w-full">
              <motion.div
                key={image.id}
                onClick={() => router.push(`/datasets/${datasetId}/annotate/${image.id}`)}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={[
                  "h-full w-full bg-white rounded-2xl border border-stone-200 overflow-hidden group",
                  "relative shadow-sm hover:shadow-xl hover:border-orange-500/30 transition-all",
                  "duration-300 cursor-pointer",
                ].join(" ")}
              >
                <Image
                  src={image.url}
                  alt={image.name}
                  fill
                  unoptimized
                  className={[
                    "w-full h-full object-cover group-hover:scale-110 transition-transform",
                    "duration-500",
                  ].join(" ")}
                />

                {/* Overlay details */}
                <div
                  className={[
                    "absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0",
                    "group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end",
                  ].join(" ")}
                >
                  <p className="text-white text-[10px] font-bold truncate">{image.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={[
                        "px-1.5 py-0.5 bg-orange-500 text-white text-[8px] font-black rounded",
                        "uppercase",
                      ].join(" ")}
                    >
                      {image.labelCount} Labels
                    </span>
                  </div>
                </div>

                {/* Selection indicator (mock) */}
                <div
                  className={[
                    "absolute top-2 right-2 w-5 h-5 bg-white/90 backdrop-blur rounded-full flex items-center",
                    "justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm",
                  ].join(" ")}
                >
                  <div className="w-3 h-3 border-2 border-stone-300 rounded-sm" />
                </div>
              </motion.div>
            </div>
          );
        }}
      </VGrid>
    </div>
  );
};

export default ImageGrid;
