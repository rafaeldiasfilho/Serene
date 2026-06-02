"use client";

import type { CSSProperties, ReactNode } from "react";

export const POST_IT_PREVIEW_LIMIT = 220;

type PostItPaperProps = {
  children?: ReactNode;
  className?: string;
  color?: string | null;
  content: string;
  expanded?: boolean;
  size?: "card" | "folder" | "mural";
  textColor?: string | null;
};

type PostItStyle = CSSProperties & {
  "--post-it-bg"?: string;
  "--post-it-fg"?: string;
};

export function getPostItDisplayContent(content: string, expanded: boolean) {
  if (expanded || content.length <= POST_IT_PREVIEW_LIMIT) {
    return content;
  }

  return `${content.slice(0, POST_IT_PREVIEW_LIMIT).trimEnd()}...`;
}

function getSizeClass(size: PostItPaperProps["size"], expanded: boolean) {
  if (size === "mural") {
    return expanded ? "min-h-44" : "aspect-square min-h-36";
  }

  if (size === "folder") {
    return expanded ? "min-h-64" : "aspect-square min-h-48";
  }

  return expanded ? "min-h-56" : "aspect-square";
}

export function PostItPaper({
  children,
  className = "",
  color,
  content,
  expanded = false,
  size = "card",
  textColor,
}: PostItPaperProps) {
  const paperColor = color ?? "#FFE6A8";
  const inkColor = textColor ?? "#4A3A2A";
  const style: PostItStyle = {
    "--post-it-bg": paperColor,
    "--post-it-fg": inkColor,
  };

  return (
    <div className={["post-it-paper-wrap", className].filter(Boolean).join(" ")} style={style}>
      <span aria-hidden="true" className="post-it-paper-layer post-it-paper-layer-back" />
      <span aria-hidden="true" className="post-it-paper-layer post-it-paper-layer-mid" />
      <div className={["post-it-paper", getSizeClass(size, expanded)].join(" ")}>
        <span aria-hidden="true" className="post-it-paper-tape" />
        <p className="post-it-paper-content">{content}</p>
        {children}
      </div>
    </div>
  );
}
