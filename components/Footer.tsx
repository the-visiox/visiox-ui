import Link from "next/link";
import { assetPath } from "@/lib/assets";

export default function Footer() {
  return (
    <footer className="bg-[#f5f2ed] border-t border-stone-200 pt-8 pb-4 px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-6">
          {/* Logo + Description */}
          <div className="col-span-2 lg:col-span-2">
            <Link href="/" className="inline-block">
              <div
                className={[
                  "flex items-center space-x-3 mb-6 group cursor-pointer animate-float",
                  "hover:[animation-play-state:paused]",
                ].join(" ")}
              >
                <img
                  src={assetPath("/logos/visiox_text.png")}
                  alt="VisioX Logo"
                  className="
                                        h-12 w-auto object-contain
                                        transition-all duration-300
                                        group-hover:scale-105
                                        group-hover:drop-shadow-[0_10px_30px_rgba(255,115,0,0.35)]
                                    "
                />
              </div>
            </Link>

            <p className="text-stone-600 max-w-sm mb-4 text-sm">
              The leading intelligent computer vision platform for high-quality data annotation and visual analysis.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-stone-900 font-bold mb-3 text-sm uppercase tracking-wider">Product</h4>
            <ul className="space-y-4 text-sm">
              {["Features", "Solutions", "Pricing", "API"].map((item) => (
                <li key={item}>
                  <a href="#" className="text-stone-600 hover:text-[#FF7300] transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-stone-900 font-bold mb-3 text-sm uppercase tracking-wider">Resources</h4>
            <ul className="space-y-4 text-sm">
              {["Documentation", "Community", "Blog", "Support"].map((item) => (
                <li key={item}>
                  <a href="#" className="text-stone-600 hover:text-[#FF7300] transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-stone-900 font-bold mb-3 text-sm uppercase tracking-wider">Company</h4>
            <ul className="space-y-4 text-sm">
              {["About Us", "Careers", "Contact", "Legal"].map((item) => (
                <li key={item}>
                  <a href="#" className="text-stone-600 hover:text-[#FF7300] transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className={[
            "pt-4 border-t border-stone-200 flex flex-col md:flex-row justify-between items-center",
            "space-y-4 md:space-y-0 text-sm text-stone-500",
          ].join(" ")}
        >
          <p>© 2026 VisioX. All rights reserved.</p>
          <div className="flex space-x-6">
            {["Privacy Policy", "Terms of Service", "Cookie Policy"].map((item) => (
              <a key={item} href="#" className="hover:text-stone-900 transition-colors">
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
