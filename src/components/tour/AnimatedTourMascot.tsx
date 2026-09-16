"use client";

export type TourMascotPose = "welcome" | "present" | "point" | "tip" | "success";

function Gesture({ pose }: { pose: TourMascotPose }) {
  const common = {
    fill: "none",
    stroke: "#151515",
    strokeWidth: 5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (pose === "welcome") {
    return (
      <g className="tour-guide-gesture tour-guide-wave">
        <path d="M111 101 C129 96 136 84 139 69" {...common} />
        <path d="M139 69 L145 54 M139 69 L153 59 M139 69 L156 70 M139 69 L151 80" {...common} />
        <path d="M136 69 C137 63 141 60 146 61 C151 62 154 67 153 72 C151 79 146 84 140 84" fill="#fff" stroke="#151515" strokeWidth="4" strokeLinejoin="round" />
      </g>
    );
  }

  if (pose === "present") {
    return (
      <g className="tour-guide-gesture tour-guide-present">
        <path d="M111 103 C128 108 141 104 151 95" {...common} />
        <path d="M151 95 C157 90 164 89 170 91 M151 95 C158 99 166 101 172 99 M151 95 C157 94 162 96 167 98" {...common} />
        <path d="M111 105 C100 112 93 119 87 127" {...common} />
      </g>
    );
  }

  if (pose === "point") {
    return (
      <g className="tour-guide-gesture tour-guide-point">
        <path d="M111 101 C132 95 149 85 165 78" {...common} />
        <path d="M165 78 L177 74" {...common} />
        <path d="M166 79 C169 82 171 84 173 87" {...common} />
        <circle cx="181" cy="72" r="3" fill="#ef442f" />
        <path d="M183 62 L186 55 M188 66 L195 62 M187 75 L195 77" stroke="#ef442f" strokeWidth="3.5" strokeLinecap="round" />
      </g>
    );
  }

  if (pose === "tip") {
    return (
      <g className="tour-guide-gesture tour-guide-tip">
        <path d="M110 103 C127 96 134 82 134 67" {...common} />
        <path d="M134 67 L134 50" {...common} />
        <path d="M134 67 C140 65 145 67 148 71" {...common} />
        <path d="M132 43 L132 36 M143 47 L149 41 M145 57 L154 56" stroke="#ef442f" strokeWidth="3.5" strokeLinecap="round" />
      </g>
    );
  }

  return (
    <g className="tour-guide-gesture tour-guide-success">
      <path d="M110 103 C126 96 139 86 145 74" {...common} />
      <path d="M145 74 L145 61 M145 66 C151 63 156 64 159 68 M145 70 C151 70 156 72 158 76 M145 75 C150 77 154 80 155 84" {...common} />
      <path d="M146 59 L150 50" {...common} />
      <path d="M153 54 L159 47 M158 61 L166 58" stroke="#ef442f" strokeWidth="3.5" strokeLinecap="round" />
    </g>
  );
}

export function AnimatedTourMascot({
  pose,
  stepKey,
}: {
  pose: TourMascotPose;
  stepKey: number;
}) {
  return (
    <div className="relative h-36 w-36 shrink-0 max-sm:h-24 max-sm:w-24" aria-hidden="true">
      <style>{`
        @keyframes tourGuideEnter {
          0% { opacity: 0; transform: translate3d(-10px, 8px, 0) scale(.94); }
          72% { opacity: 1; transform: translate3d(1px, -2px, 0) scale(1.012); }
          100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
        }
        @keyframes tourGuideFloat {
          0%, 100% { transform: translateY(0) rotate(-.18deg); }
          50% { transform: translateY(-3px) rotate(.22deg); }
        }
        @keyframes tourGuideBlink {
          0%, 43%, 47%, 100% { transform: scaleY(1); }
          45% { transform: scaleY(.08); }
        }
        @keyframes tourGuideWave {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-7deg); }
          55% { transform: rotate(5deg); }
          78% { transform: rotate(-3deg); }
        }
        @keyframes tourGuidePoint {
          0%, 75%, 100% { transform: translateX(0); }
          84% { transform: translateX(3px); }
          92% { transform: translateX(0); }
        }
        @keyframes tourGuideTip {
          0%, 72%, 100% { transform: translateY(0); }
          82% { transform: translateY(-3px); }
          90% { transform: translateY(0); }
        }
        @keyframes tourGuideSuccess {
          0%, 76%, 100% { transform: translateY(0) rotate(0deg); }
          84% { transform: translateY(-3px) rotate(-2deg); }
          92% { transform: translateY(-1px) rotate(1deg); }
        }
        @keyframes tourGuideShadow {
          0%, 100% { opacity: .14; transform: translateX(-50%) scaleX(1); }
          50% { opacity: .08; transform: translateX(-50%) scaleX(.9); }
        }
        .tour-guide-enter { animation: tourGuideEnter .42s cubic-bezier(.2,.8,.2,1) both; }
        .tour-guide-float { animation: tourGuideFloat 3.1s ease-in-out .42s infinite; transform-origin: 50% 88%; }
        .tour-guide-eye { animation: tourGuideBlink 4.8s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .tour-guide-wave { animation: tourGuideWave 2.25s ease-in-out .5s infinite; transform-box: fill-box; transform-origin: 15% 78%; }
        .tour-guide-point { animation: tourGuidePoint 2.55s ease-in-out .55s infinite; }
        .tour-guide-tip { animation: tourGuideTip 2.65s ease-in-out .55s infinite; }
        .tour-guide-success { animation: tourGuideSuccess 2.6s ease-in-out .55s infinite; transform-box: fill-box; transform-origin: 25% 80%; }
        .tour-guide-shadow { animation: tourGuideShadow 3.1s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .tour-guide-enter,
          .tour-guide-float,
          .tour-guide-eye,
          .tour-guide-gesture,
          .tour-guide-shadow { animation: none !important; }
        }
      `}</style>

      <div className="tour-guide-shadow absolute bottom-1 left-1/2 h-2.5 w-16 -translate-x-1/2 rounded-[100%] bg-black blur-[5px]" />
      <div key={`${pose}-${stepKey}`} className="tour-guide-enter absolute inset-0">
        <svg
          viewBox="0 0 200 210"
          className="tour-guide-float h-full w-full overflow-visible"
          role="presentation"
        >
          <g stroke="#151515" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M68 129 L61 183 Q60 195 71 198 L83 198 L88 138" fill="#151515" />
            <path d="M98 136 L101 190 Q102 199 113 199 L126 198 L119 129" fill="#151515" />
            <path d="M59 198 Q72 198 83 198 L82 204 L57 204 Q53 203 55 200 Z" fill="#fff" />
            <path d="M102 199 Q114 199 127 198 L132 203 L103 204 Q99 202 102 199 Z" fill="#fff" />

            <path d="M59 91 Q82 79 106 91 L117 137 Q92 146 64 137 Z" fill="#fff" />
            <path d="M74 91 L85 101 L95 91" fill="none" />
            <path d="M58 101 C48 110 45 124 53 135" fill="none" />
            <path d="M53 135 C57 140 64 141 69 136" fill="none" />

            <g>
              <rect x="48" y="118" width="37" height="48" rx="5" fill="#f4f0eb" transform="rotate(-8 48 118)" />
              <rect x="58" y="129" width="13" height="13" rx="3" fill="#ef442f" stroke="none" />
              <text x="64.5" y="139" textAnchor="middle" fontSize="9" fontWeight="800" fill="#fff" stroke="none">R</text>
            </g>

            <rect x="96" y="103" width="16" height="16" rx="4" fill="#ef442f" stroke="none" />
            <text x="104" y="114.5" textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff" stroke="none">R</text>

            <ellipse cx="84" cy="58" rx="31" ry="34" fill="#fff" />
            <g fill="#111" stroke="none">
              <circle cx="59" cy="43" r="15" />
              <circle cx="66" cy="30" r="17" />
              <circle cx="81" cy="25" r="18" />
              <circle cx="96" cy="28" r="17" />
              <circle cx="108" cy="40" r="16" />
              <circle cx="55" cy="57" r="13" />
              <circle cx="110" cy="57" r="12" />
            </g>
            <path d="M58 55 Q62 43 70 41 Q78 45 84 39 Q92 45 104 43 Q111 50 111 61 Q108 83 84 91 Q60 84 57 64 Z" fill="#fff" />
            <g className="tour-guide-eye" fill="#151515" stroke="none">
              <ellipse cx="74" cy="60" rx="3.5" ry="5" />
              <ellipse cx="95" cy="60" rx="3.5" ry="5" />
            </g>
            <path d="M83 67 Q84 70 81 72" fill="none" strokeWidth="3" />
            <path d="M75 76 Q84 84 94 76" fill="none" strokeWidth="3.5" />
          </g>
          <Gesture pose={pose} />
        </svg>
      </div>
    </div>
  );
}
