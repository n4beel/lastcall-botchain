import { HTMLAttributes } from "react";

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  noPadding?: boolean;
}

/** A banded block with a heavy amber edge; state is carried by colour here. */
export default function Panel({ elevated, noPadding, children, className = "", style, ...props }: PanelProps) {
  return (
    <div
      className={[noPadding ? "" : "p-5", className].join(" ")}
      style={{
        background: elevated ? "var(--bg-elevated)" : "var(--bg-surface)",
        border: "1px solid var(--border-default)", borderLeft: "4px solid var(--accent)",
        borderRadius: "4px",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
