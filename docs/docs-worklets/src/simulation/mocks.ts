export function fetchFromBackend(path: string): {
  path: string;
  items: number[];
} {
  return { path, items: [1, 2, 3, 4, 5] };
}

export function updateDb(rows: unknown): number {
  return Array.isArray(rows) ? rows.length : 1;
}

export function doImportantStuff(): number {
  return 42;
}

export function formatPresses(count: number): string {
  return `You pressed me ${count} ${count === 1 ? 'time' : 'times'}`;
}

export function applyTransform<T>(style: T): T {
  return style;
}

export function decodeAudio(chunk: number): { chunk: number; samples: number } {
  return { chunk, samples: chunk * 512 };
}

export function playAudio(buffer: { samples: number }): number {
  return buffer.samples;
}

export function parseMarkdown(text: string): { text: string; nodes: number } {
  return { text, nodes: text.length };
}

export function renderHtml(ast: { nodes: number }): string {
  return '<p>'.repeat(ast.nodes);
}

export function cacheHtml(key: string, html: string): number {
  return key.length + html.length;
}
