import React from "react";

interface RefluxLockupProps {
  /** Size of the lockup text in px (icon will scale proportionally). Default is 28. */
  size?: number;
  /** Color variant: "dark" (mint icon, white text) or "light" (teal icon, dark text). Default is "dark". */
  variant?: "dark" | "light";
  /** Optional extra CSS classes */
  className?: string;
}

/**
 * Reflux Official Brand Lockup Component.
 * Enforces brand guidelines: wordmark first, icon immediately after.
 * Precision cropped SVG viewBox (14 14 72 72) eliminates built-in margin padding,
 * resulting in an exact, tight visual gap matching brand guidelines.
 */
export function RefluxLockup({
  size = 28,
  variant = "dark",
  className = "",
}: RefluxLockupProps) {
  const isDark = variant === "dark";
  const textColor = isDark ? "var(--surface-light)" : "var(--surface-dark)";
  const iconColor = isDark ? "var(--accent-mint)" : "var(--accent-teal)";

  // Icon size slightly larger than font size for optical balance (1.1x)
  const iconSize = Math.round(size * 1.1);
  // Tight gap proportional to font size (~0.15em)
  const gapSize = Math.max(4, Math.round(size * 0.15));

  return (
    <div
      className={`inline-flex items-center select-none ${className}`}
      style={{ gap: `${gapSize}px` }}
    >
      {/* Wordmark in Space Grotesk Bold */}
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: `${size}px`,
          color: textColor,
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        Reflux
      </span>

      {/* Petal icon mark with cropped viewBox eliminating blank margin */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="14 14 72 72"
        fill={iconColor}
        aria-hidden="true"
        style={{ display: "block" }}
      >
        {([0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330] as const).map(
          (deg) => (
            <path
              key={deg}
              d="M50,42 C47.2,34 46,26 46,18 A4.3,4.3 0 0 0 54,18 C54,26 52.8,34 50,42 Z"
              transform={`rotate(${deg} 50 50)`}
            />
          )
        )}
      </svg>
    </div>
  );
}
