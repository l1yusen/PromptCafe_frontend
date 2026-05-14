/**
 * 按行对齐两段文本，用于左右栏差异展示（LCS 回溯，无第三方依赖）。
 */
export type AlignedLineRow = {
  left: string;
  right: string;
  leftKind: "blank" | "same" | "removed" | "changed";
  rightKind: "blank" | "same" | "added" | "changed";
};

function splitLines(s: string): string[] {
  if (s === "") return [""];
  return s.split("\n");
}

export function alignTextByLines(left: string, right: string): AlignedLineRow[] {
  const a = splitLines(left);
  const b = splitLines(right);
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const stack: AlignedLineRow[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      stack.push({ left: a[i - 1], right: b[j - 1], leftKind: "same", rightKind: "same" });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({ left: "", right: b[j - 1], leftKind: "blank", rightKind: "added" });
      j--;
    } else if (i > 0) {
      stack.push({ left: a[i - 1], right: "", leftKind: "removed", rightKind: "blank" });
      i--;
    }
  }
  const ordered = stack.reverse();
  const out: AlignedLineRow[] = [];
  let k = 0;
  while (k < ordered.length) {
    const cur = ordered[k];
    const next = ordered[k + 1];
    if (
      cur &&
      next &&
      cur.leftKind === "removed" &&
      cur.rightKind === "blank" &&
      next.leftKind === "blank" &&
      next.rightKind === "added"
    ) {
      out.push({
        left: cur.left,
        right: next.right,
        leftKind: "changed",
        rightKind: "changed"
      });
      k += 2;
    } else {
      out.push(cur);
      k += 1;
    }
  }
  return out;
}
