// LinkedIn URL helpers. ChatWave never fetches linkedin.com: LinkedIn requires login and forbids scraping, so we only
// validate and normalise the link the user typed, derive a display name from the URL slug, and let the browser open it.
const HOST_RE = /^(?:www\.|[a-z]{2,3}\.)?linkedin\.com$/i;
const KINDS = { in: "profile", company: "company", school: "school" };
const SLUG_RE = /^[\p{L}\p{N}_%.\-]{1,100}$/u;

export function parseLinkedInUrl(input) {
  const raw = typeof input === "string" ? input.trim() : "";
  if (!raw || raw.length > 400) throw badRequest("Paste a LinkedIn profile URL, e.g. https://www.linkedin.com/in/your-name");
  let url;
  try { url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`); } catch { throw badRequest("That does not look like a valid URL."); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw badRequest("Only plain http(s) LinkedIn links are supported.");
  if (!HOST_RE.test(url.hostname)) throw badRequest("Only linkedin.com links are supported.");
  const [type, slugRaw] = url.pathname.split("/").filter(Boolean);
  const kind = KINDS[(type || "").toLowerCase()];
  if (!kind || !slugRaw) throw badRequest("Use a LinkedIn profile (/in/…), company (/company/…) or school (/school/…) link.");
  let slug; try { slug = decodeURIComponent(slugRaw); } catch { throw badRequest("The LinkedIn link contains invalid characters."); }
  if (!SLUG_RE.test(slug)) throw badRequest("The LinkedIn link contains invalid characters.");
  const segment = Object.keys(KINDS).find(key => KINDS[key] === kind);
  return { url: `https://www.linkedin.com/${segment}/${encodeURIComponent(slug)}/`, kind, handle: slug, suggestedTitle: titleFromSlug(slug) };
}

export function titleFromSlug(slug) {
  const words = slug.replace(/-[a-f0-9]{6,12}$/i, "").split(/[-_.]+/).filter(Boolean);
  return (words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") || slug).slice(0, 120);
}

function badRequest(message) { return Object.assign(new Error(message), { statusCode: 400 }); }
