const POSTS_PER_PAGE = 2;

export function fetchFromBackend(path: string): {
  path: string;
  items: number[];
} {
  const page = Number(/page=(\d+)/.exec(path)?.[1] ?? 1);
  const first = (page - 1) * POSTS_PER_PAGE + 1;
  return {
    path,
    items: Array.from({ length: POSTS_PER_PAGE }, (_, index) => first + index),
  };
}

export function doImportantStuff(): number {
  return 42;
}

export function formatPresses(count: number): string {
  return `You pressed me ${count} ${count === 1 ? 'time' : 'times'}`;
}

export function decodeAudio(chunk: number): { chunk: number; samples: number } {
  return { chunk, samples: chunk * 512 };
}

export function applyEqualizer<T>(buffer: T): T {
  return buffer;
}

export function mixChannels<T>(buffer: T): T {
  return buffer;
}

export function resolveLinks<T>(ast: T): T {
  return ast;
}

export function layoutBlocks<T>(ast: T): T {
  return ast;
}

export function applyTheme<T>(ast: T): T {
  return ast;
}

export function playAudio(buffer: { samples: number }): number {
  return buffer.samples;
}

export function parseMarkdown(
  text: string,
  revision = 1
): { text: string; revision: number } {
  return { text, revision };
}

const TEXT_STYLES = ['bold', 'italic', 'underline', 'strikethrough', 'code'];

export function renderHtml(ast: { text: string; revision: number }): {
  text: string;
  style: string;
} {
  const style = TEXT_STYLES[(ast.revision - 1) % TEXT_STYLES.length];
  return { text: style, style };
}
