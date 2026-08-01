"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

function FlashToastInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const message = searchParams.get("flash");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) return;
    setVisible(true);

    // Nettoie l'URL pour qu'un rechargement de page ne réaffiche pas
    // le message indéfiniment.
    const params = new URLSearchParams(searchParams.toString());
    params.delete("flash");
    router.replace(params.toString() ? `${pathname}?${params}` : pathname, {
      scroll: false,
    });

    const timeout = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  if (!message || !visible) return null;

  return (
    <div
      role="status"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border border-surface-border bg-ink px-4 py-3 text-sm font-medium text-white shadow-card"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-accent-teal" />
      {message}
    </div>
  );
}

export function FlashToast() {
  // useSearchParams exige une frontière Suspense côté Next.js.
  return (
    <Suspense fallback={null}>
      <FlashToastInner />
    </Suspense>
  );
}
