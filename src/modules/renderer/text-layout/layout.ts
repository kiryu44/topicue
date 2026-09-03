export interface TextLayoutOptions {
  maxWidth: number;
  maxLines: number;
  fontSize: number;
  minFontSize: number;
}

export interface TextLayoutResult {
  lines: string[];
  fontSize: number;
  truncated: boolean;
}

const forbiddenLineStart = new Set("、。，．)]｝〕〉》」』】！？!?ー〜…：；".split(""));

export const layoutText = (
  text: string,
  measure: (value: string, fontSize: number) => number,
  options: TextLayoutOptions,
): TextLayoutResult => {
  const graphemes = [
    ...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text),
  ].map(({ segment }) => segment);
  for (let size = options.fontSize; size >= options.minFontSize; size -= 1) {
    const lines: string[] = [];
    let current = "";
    let index = 0;
    while (index < graphemes.length) {
      const grapheme = graphemes[index] as string;
      const next = current + grapheme;
      if (current.length > 0 && measure(next, size) > options.maxWidth) {
        if (forbiddenLineStart.has(grapheme) && measure(next, size) <= options.maxWidth * 1.08) {
          current = next;
          index += 1;
        }
        lines.push(current);
        current = "";
      } else {
        current = next;
        index += 1;
      }
    }
    if (current.length > 0) lines.push(current);
    if (lines.length <= options.maxLines) return { lines, fontSize: size, truncated: false };
  }
  const fontSize = options.minFontSize;
  const lines: string[] = [];
  let current = "";
  for (const grapheme of graphemes) {
    if (measure(`${current}${grapheme}…`, fontSize) > options.maxWidth) {
      lines.push(current);
      current = grapheme;
      if (lines.length === options.maxLines) break;
    } else current += grapheme;
  }
  const lastIndex = options.maxLines - 1;
  lines[lastIndex] = `${lines[lastIndex] ?? current}…`;
  return { lines: lines.slice(0, options.maxLines), fontSize, truncated: true };
};
