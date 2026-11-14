import { ToolError } from './errors.mts';

export interface TraceElement {
  name: string;
  attributes: Record<string, string>;
  text: string;
  children: TraceElement[];
}

export type TraceRow = Record<string, TraceElement | null>;

export interface TraceTable {
  schema: string;
  columns: string[];
  rows: TraceRow[];
}

const NAME = /[A-Za-z_:][-A-Za-z0-9_.:]*/y;
const ATTRIBUTE =
  /\s+([A-Za-z_:][-A-Za-z0-9_.:]*)\s*=\s*(?:"([^"<]*)"|'([^'<]*)')/y;
const TAG_END = /\s*(\/?)>/y;
const CLOSING_TAG = /<\/([A-Za-z_:][-A-Za-z0-9_.:]*)\s*>/y;
const WHITESPACE = /^\s*$/;
const ENTITY = /&(?:([A-Za-z]+)|#([0-9]+)|#x([0-9A-Fa-f]+));|&/g;
const NAMED_ENTITIES: Record<string, string> = {
  lt: '<',
  gt: '>',
  amp: '&',
  quot: '"',
  apos: "'",
};
const MAX_CODE_POINT = 0x10ffff;

export function parseTraceTables(xml: string): TraceTable[] {
  const root = new XmlReader(xml).read();
  if (root.name !== 'trace-query-result') {
    throw new ToolError(
      `The xctrace export has the root element <${root.name}>, expected <trace-query-result>`
    );
  }
  return root.children
    .filter((node) => node.name === 'node')
    .flatMap((node) => {
      const schema = child(node, 'schema');
      return schema ? [traceTable(node, schema)] : [];
    });
}

export function child(
  element: TraceElement,
  name: string
): TraceElement | null {
  return element.children.find((each) => each.name === name) ?? null;
}

export function childText(element: TraceElement, name: string): string | null {
  return child(element, name)?.text ?? null;
}

class XmlReader {
  readonly #xml: string;
  readonly #open: TraceElement[] = [];
  readonly #elementsById = new Map<string, TraceElement>();
  #root: TraceElement | null = null;
  #position = 0;

  constructor(xml: string) {
    this.#xml = xml;
  }

  read(): TraceElement {
    const xml = this.#xml;
    while (this.#position < xml.length) {
      const tagStart = xml.indexOf('<', this.#position);
      const textEnd = tagStart === -1 ? xml.length : tagStart;
      if (textEnd > this.#position) {
        this.#readText(textEnd);
      }
      if (tagStart === -1) {
        break;
      }
      if (xml.startsWith('<?', tagStart)) {
        this.#readDeclaration(tagStart);
      } else if (xml.startsWith('<!', tagStart)) {
        this.#fail(tagStart, 'comments, CDATA and DOCTYPE are not supported');
      } else if (xml.startsWith('</', tagStart)) {
        this.#readEndTag(tagStart);
      } else {
        this.#readStartTag(tagStart);
      }
    }
    const unclosed = this.#open.at(-1);
    if (unclosed) {
      this.#fail(xml.length, `the element <${unclosed.name}> has no end tag`);
    }
    return this.#root ?? this.#fail(xml.length, 'no root element');
  }

  #readText(end: number) {
    const text = this.#xml.slice(this.#position, end);
    const parent = this.#open.at(-1);
    const isWhitespace = WHITESPACE.test(text);
    if (!parent) {
      if (!isWhitespace) {
        this.#fail(this.#position, 'text outside the root element');
      }
    } else if (
      !isWhitespace ||
      (parent.children.length === 0 && this.#xml.startsWith('</', end))
    ) {
      parent.text += this.#decodeEntities(text, this.#position);
    }
    this.#position = end;
  }

  #readDeclaration(tagStart: number) {
    const end = this.#xml.indexOf('?>', tagStart);
    if (end === -1) {
      this.#fail(tagStart, 'the declaration has no end');
    }
    this.#position = end + 2;
  }

  #readEndTag(tagStart: number) {
    CLOSING_TAG.lastIndex = tagStart;
    const name =
      CLOSING_TAG.exec(this.#xml)?.[1] ?? this.#fail(tagStart, 'a bad end tag');
    const element = this.#open.pop();
    if (!element || element.name !== name) {
      this.#fail(
        tagStart,
        `the end tag </${name}> does not close <${element?.name ?? 'nothing'}>`
      );
    }
    this.#position = CLOSING_TAG.lastIndex;
    this.#finish(element, tagStart);
  }

  #readStartTag(tagStart: number) {
    NAME.lastIndex = tagStart + 1;
    const name =
      NAME.exec(this.#xml)?.[0] ?? this.#fail(tagStart, 'a bad tag name');
    const element: TraceElement = {
      name,
      attributes: {},
      text: '',
      children: [],
    };
    let attributesEnd = NAME.lastIndex;
    ATTRIBUTE.lastIndex = attributesEnd;
    let attribute: RegExpExecArray | null;
    while ((attribute = ATTRIBUTE.exec(this.#xml))) {
      element.attributes[attribute[1]] = this.#decodeEntities(
        attribute[2] ?? attribute[3],
        attribute.index
      );
      attributesEnd = ATTRIBUTE.lastIndex;
    }
    TAG_END.lastIndex = attributesEnd;
    const tagEnd =
      TAG_END.exec(this.#xml) ??
      this.#fail(attributesEnd, `a bad tag <${name}>`);
    this.#position = TAG_END.lastIndex;
    if (tagEnd[1] === '/') {
      this.#finish(element, tagStart);
    } else {
      this.#open.push(element);
    }
  }

  #finish(element: TraceElement, tagStart: number) {
    const { id, ref } = element.attributes;
    const resolved =
      ref === undefined
        ? element
        : (this.#elementsById.get(ref) ??
          this.#fail(tagStart, `ref="${ref}" names no earlier id`));
    if (ref === undefined && id !== undefined) {
      this.#elementsById.set(id, element);
    }
    const parent = this.#open.at(-1);
    if (parent) {
      parent.children.push(resolved);
    } else if (this.#root) {
      this.#fail(tagStart, `a second root element <${element.name}>`);
    } else {
      this.#root = resolved;
    }
  }

  #decodeEntities(text: string, position: number): string {
    if (!text.includes('&')) {
      return text;
    }
    return text.replace(
      ENTITY,
      (
        entity,
        name?: string,
        decimal?: string,
        hexadecimal?: string,
        offset = 0
      ) =>
        this.#decodeEntity(
          entity,
          name,
          decimal ?? hexadecimal,
          decimal === undefined,
          position + offset
        )
    );
  }

  #decodeEntity(
    entity: string,
    name: string | undefined,
    digits: string | undefined,
    isHexadecimal: boolean,
    at: number
  ): string {
    if (name !== undefined) {
      return (
        NAMED_ENTITIES[name] ?? this.#fail(at, `the unknown entity ${entity}`)
      );
    }
    if (digits === undefined) {
      return this.#fail(at, 'a "&" that starts no entity');
    }
    const codePoint = Number.parseInt(digits, isHexadecimal ? 16 : 10);
    return codePoint <= MAX_CODE_POINT
      ? String.fromCodePoint(codePoint)
      : this.#fail(at, `the entity ${entity} names no character`);
  }

  #fail(at: number, problem: string): never {
    throw new ToolError(
      `The xctrace export is not valid XML at ${location(this.#xml, at)}: ${problem}`
    );
  }
}

function traceTable(node: TraceElement, schema: TraceElement): TraceTable {
  const name = schema.attributes.name;
  if (name === undefined) {
    throw new ToolError('A schema of the xctrace export has no name');
  }
  const columns = schema.children
    .filter((column) => column.name === 'col')
    .map((column) => {
      const mnemonic = childText(column, 'mnemonic');
      if (mnemonic === null) {
        throw new ToolError(`A column of the table ${name} has no mnemonic`);
      }
      return mnemonic;
    });
  const rows = node.children
    .filter((row) => row.name === 'row')
    .map((row, index) => {
      if (row.children.length !== columns.length) {
        throw new ToolError(
          `Row ${index + 1} of the table ${name} has ${row.children.length} cells, expected ${columns.length}`
        );
      }
      return Object.fromEntries(
        columns.map((column, i) => [column, cellValue(row.children[i])])
      );
    });
  return { schema: name, columns, rows };
}

function cellValue(cell: TraceElement): TraceElement | null {
  return cell.name === 'sentinel' ? null : cell;
}

function location(xml: string, position: number): string {
  let line = 1;
  let lineStart = 0;
  let newline = xml.indexOf('\n');
  while (newline !== -1 && newline < position) {
    line++;
    lineStart = newline + 1;
    newline = xml.indexOf('\n', lineStart);
  }
  return `line ${line}, column ${position - lineStart + 1}`;
}
