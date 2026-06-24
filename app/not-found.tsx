import Link from "next/link";
import { Search, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#fcfaf7] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div
          className={["inline-flex items-center justify-center w-16 h-16 rounded-2xl", "bg-orange-50 mb-6"].join(" ")}
        >
          <Search className="w-8 h-8 text-orange-400" />
        </div>

        <p className="text-sm font-bold uppercase tracking-widest text-stone-400 mb-3">404</p>
        <h1 className="text-3xl font-bold text-stone-900 mb-3">Page not found</h1>
        <p className="text-stone-500 mb-8 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <Link
          href="/home"
          className={[
            "inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-100 text-orange-700 border",
            "border-orange-200 text-sm font-bold hover:bg-orange-200 hover:-translate-y-0.5",
            "hover:shadow-lg hover:shadow-orange-100 active:scale-95 transition-all duration-200",
          ].join(" ")}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to overview
        </Link>
      </div>
    </div>
  );
}
