import sanitizeHtml from "sanitize-html";

export function formatTrackDuration(ms: number | null): string {
  if (!ms) return "--:--";
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatRuntime(minutes: number | null): string | null {
  if (!minutes) return null;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours === 0 ? `${mins}m` : `${hours}h ${mins}m`;
}

export function formatDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Apple Music editorial notes (album.attributes.editorialNotes) mix real
// inline markup (<b>, <i>) with plain "\n\n" for paragraph breaks -- there's
// no <p> wrapping to begin with, so paragraphs have to be reconstructed
// before sanitizing, or they'd collapse into one run-on block (HTML doesn't
// render bare newlines as breaks). Sanitize down to a small allowlist (no
// attributes at all, so no href/src/on* survive) before it's ever passed to
// dangerouslySetInnerHTML.
const EDITORIAL_HTML_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "b", "strong", "i", "em", "ul", "ol", "li"],
  allowedAttributes: {},
};

export function sanitizeEditorialHtml(html: string): string {
  const withParagraphs = `<p>${html
    .trim()
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br>")}</p>`;
  return sanitizeHtml(withParagraphs, EDITORIAL_HTML_OPTIONS);
}
