const ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const PATH_PREFIXES = ["/shorts/", "/embed/", "/live/", "/v/"];

export function parseYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (ID_PATTERN.test(trimmed)) return trimmed;

  let url: URL;
  try {
    url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\.|^m\./, "");
  if (host === "youtu.be") return checkId(url.pathname.slice(1).split("/")[0]);
  if (host !== "youtube.com" && host !== "music.youtube.com") return null;

  const fromQuery = url.searchParams.get("v");
  if (fromQuery) return checkId(fromQuery);

  for (const prefix of PATH_PREFIXES) {
    if (url.pathname.startsWith(prefix)) {
      return checkId(url.pathname.slice(prefix.length).split("/")[0]);
    }
  }
  return null;
}

function checkId(candidate: string) {
  return ID_PATTERN.test(candidate) ? candidate : null;
}
