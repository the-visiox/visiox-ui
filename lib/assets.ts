/**
 * Returns the base path for assets.
 * In GitHub Pages deployment, assets are served from /VisioX/
 * Locally and on Vercel, they are served from /
 *
 * Next.js automatically injects __NEXT_DATA__.basePath at build time
 * from the basePath in next.config.mjs.
 */
type NextDataWithBasePath = {
  basePath?: string;
};

export function getBasePath(): string {
  if (typeof window !== "undefined") {
    const nextData = window.__NEXT_DATA__ as NextDataWithBasePath | undefined;
    if (nextData?.basePath) {
      return nextData.basePath;
    }
  }
  return process.env.NEXT_PUBLIC_BASE_PATH || "";
}

/**
 * Prefix a path with the basePath for use in <img> src attributes.
 * Next.js <Link> and <Image> handle basePath automatically, but
 * plain <img> tags need manual prefixing.
 *
 * @example
 *   assetPath("/demo/surveillance.png")
 *   // returns "/VisioX/demo/surveillance.png" on GitHub Pages
 *   // returns "/demo/surveillance.png" locally
 */
export function assetPath(path: string): string {
  const base = getBasePath();
  // Don't prefix external URLs or already-prefixed paths
  if (path.startsWith("http") || path.startsWith("//") || path.startsWith("data:")) {
    return path;
  }
  return `${base}${path}`;
}
