import { Suspense } from "react";
import DatasetsPageClient from "./DatasetsPageClient";

export default function DatasetsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center bg-[#fcfaf7] text-stone-500 text-sm font-medium">
          Loading datasets…
        </div>
      }
    >
      <DatasetsPageClient />
    </Suspense>
  );
}
