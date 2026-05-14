import type { AlignedLineRow } from "./lineDiff";
import type { PromptVersionRecord } from "../api/types";

export function versionMetaBlock(v: PromptVersionRecord): string {
  const tags = (v.tags ?? []).join(", ");
  const vars = JSON.stringify(v.variables ?? [], null, 2);
  return [
    `标题: ${v.title}`,
    `简介: ${(v.description ?? "").trim() || "（空）"}`,
    `标签: ${tags || "（空）"}`,
    `变量:\n${vars}`
  ].join("\n\n");
}

export function diffLineClass(line: AlignedLineRow, side: "left" | "right"): string {
  if (side === "left") {
    if (line.leftKind === "removed") return "diff-removed";
    if (line.leftKind === "changed") return "diff-changed";
    if (line.leftKind === "blank") return "diff-blank";
  } else {
    if (line.rightKind === "added") return "diff-added";
    if (line.rightKind === "changed") return "diff-changed";
    if (line.rightKind === "blank") return "diff-blank";
  }
  return "";
}
