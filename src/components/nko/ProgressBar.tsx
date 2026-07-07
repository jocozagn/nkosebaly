interface ProgressBarProps {
  percent: number;
  label?: string;
  size?: "sm" | "md";
}

/** Barre de progression simple */
const ProgressBar = ({ percent, label, size = "md" }: ProgressBarProps) => {
  const safePercent = Math.min(100, Math.max(0, percent));

  return (
    <div className="w-full">
      {label && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs" style={{ color: "var(--brand-gray)" }}>{label}</span>
          <span className="text-xs font-semibold" style={{ color: "var(--brand-brown)" }}>{safePercent}%</span>
        </div>
      )}
      <div
        className={`w-full rounded-full overflow-hidden bg-[#f0e8df] ${size === "sm" ? "h-1.5" : "h-2.5"}`}
        role="progressbar"
        aria-valuenow={safePercent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${safePercent}%`, backgroundColor: "var(--brand-brown)" }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
