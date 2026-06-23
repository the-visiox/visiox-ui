import { Suspense } from "react";

import OAuthCallbackClient from "./OAuthCallbackClient";

function OAuthCallbackFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-100 via-amber-100 to-orange-300 px-6">
      <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-2xl shadow-orange-200/60">
        <h1 className="text-xl font-bold text-stone-900">Signing you in...</h1>
        <p className="mt-2 text-sm text-stone-500">
          Preparing the OAuth callback.
        </p>
      </div>
    </main>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<OAuthCallbackFallback />}>
      <OAuthCallbackClient />
    </Suspense>
  );
}
