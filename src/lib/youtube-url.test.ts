import { describe, expect, it } from "vitest";
import { parseYouTubeId } from "./youtube-url";

describe("parseYouTubeId", () => {
  const id = "dQw4w9WgXcQ";
  it.each([
    [`https://www.youtube.com/watch?v=${id}`, id],
    [`https://www.youtube.com/watch?v=${id}&t=42s&list=PL123`, id],
    [`https://youtu.be/${id}?si=abc`, id],
    [`https://youtube.com/shorts/${id}`, id],
    [`https://m.youtube.com/watch?v=${id}`, id],
    [`https://music.youtube.com/watch?v=${id}`, id],
    [`https://www.youtube.com/embed/${id}`, id],
    [`youtube.com/watch?v=${id}`, id],
    [id, id],
    ["https://vimeo.com/12345", null],
    ["not a url", null],
    [`https://www.youtube.com/watch?v=short`, null],
  ])("parses %s", (input, expected) => {
    expect(parseYouTubeId(input)).toBe(expected);
  });
});
