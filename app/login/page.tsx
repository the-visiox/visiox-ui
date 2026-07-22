import { Suspense } from "react";

import LoginClient from "./LoginClient";

function LoginFallback() {
  return (
    <main
      className={[
        "flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-100",
        "via-amber-100 to-orange-300",
      ].join(" ")}
    >
      <p className="text-sm font-medium text-stone-600">Loading sign in...</p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginClient />
    </Suspense>
  );
}
