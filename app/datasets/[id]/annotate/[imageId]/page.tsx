import { Suspense } from "react";
import AnnotatePageClient from "./AnnotatePageClient";
export { generateStaticParams } from "./params";

export default function AnnotatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fcfaf7] flex items-center justify-center text-stone-500 text-sm font-medium">
          Loading workspace…
        </div>
      }
    >
      <AnnotatePageClient />
    </Suspense>
  );
}
