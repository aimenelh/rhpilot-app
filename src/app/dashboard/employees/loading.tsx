"use client";

import { AmbientNetwork } from "@/components/landing/AmbientNetwork";
import { Mascot } from "@/components/Mascot";

export default function EmployeesLoading() {
  return (
    <div className="relative flex min-h-screen items-center justify-center">
      <AmbientNetwork />
      <style>{`
        @keyframes mascotBreathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.045); }
        }
        .mascot-breathe { animation: mascotBreathe 2.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .mascot-breathe { animation: none; }
        }
      `}</style>
      <div className="relative flex flex-col items-center gap-4">
        <Mascot pose="createJourney" className="mascot-breathe h-40 w-auto" />
        <p className="text-sm font-medium text-ink-soft">Préparation de vos données...</p>
      </div>
    </div>
  );
}
