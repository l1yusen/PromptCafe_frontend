import DOMPurify from "dompurify";
import MarkdownIt from "markdown-it";

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true
});

/** 将 Markdown 转为可安全插入页面的 HTML（禁用 raw HTML，经 DOMPurify 清洗）。 */
export function markdownToSafeHtml(source: string): string {
  if (!source.trim()) return "";
  return DOMPurify.sanitize(md.render(source));
}
