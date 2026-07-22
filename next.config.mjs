/** @type {import('next').NextConfig} */

const isGithubActions = process.env.GITHUB_ACTIONS === "true";
const repo = isGithubActions ? process.env.GITHUB_REPOSITORY.split("/")[1] : "";
const basePath = repo && !repo.endsWith(".github.io") ? `/${repo}` : "";

const nextConfig = {
  images: {
    unoptimized: true,
  },
  basePath: basePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
