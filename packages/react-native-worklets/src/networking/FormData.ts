'use strict';

import { toArrayBuffer } from './bytes';
import { utf8Encode } from './utf8';

export class FormData {
  private formEntries: Array<[string, string]> = [];

  get [Symbol.toStringTag]() {
    return 'FormData';
  }

  append(name: string, value: unknown) {
    this.formEntries.push([String(name), String(value)]);
  }

  set(name: string, value: unknown) {
    this.delete(name);
    this.append(name, value);
  }

  get(name: string): string | null {
    const entry = this.formEntries.find(
      ([entryName]) => entryName === String(name)
    );
    return entry !== undefined ? entry[1] : null;
  }

  getAll(name: string): string[] {
    return this.formEntries
      .filter(([entryName]) => entryName === String(name))
      .map(([, value]) => value);
  }

  has(name: string): boolean {
    return this.formEntries.some(([entryName]) => entryName === String(name));
  }

  delete(name: string) {
    this.formEntries = this.formEntries.filter(
      ([entryName]) => entryName !== String(name)
    );
  }

  forEach(callback: (value: string, name: string, formData: FormData) => void) {
    for (const [name, value] of this.formEntries) {
      callback(value, name, this);
    }
  }

  *entries(): IterableIterator<[string, string]> {
    for (const [name, value] of this.formEntries) {
      yield [name, value];
    }
  }

  *keys(): IterableIterator<string> {
    for (const [name] of this.formEntries) {
      yield name;
    }
  }

  *values(): IterableIterator<string> {
    for (const [, value] of this.formEntries) {
      yield value;
    }
  }

  [Symbol.iterator]() {
    return this.entries();
  }

  /**
   * Mirrors React Native's non-standard `FormData.getParts`. Its presence makes
   * libraries like Axios treat this object as a React Native `FormData` and
   * leave the multipart encoding to `XMLHttpRequest`.
   */
  getParts(): Array<{
    string: string;
    fieldName: string;
    headers: Record<string, string>;
  }> {
    return this.formEntries.map(([name, value]) => ({
      string: value,
      fieldName: name,
      headers: {
        'content-disposition': `form-data; name="${escapeName(name)}"`,
      },
    }));
  }

  __encodeMultipart(): { body: ArrayBuffer; contentType: string } {
    const boundary = `----WorkletsFormDataBoundary${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
    let encoded = '';
    for (const [name, value] of this.formEntries) {
      encoded += `--${boundary}\r\ncontent-disposition: form-data; name="${escapeName(name)}"\r\n\r\n${value}\r\n`;
    }
    encoded += `--${boundary}--\r\n`;
    return {
      body: toArrayBuffer(utf8Encode(encoded)),
      contentType: `multipart/form-data; boundary=${boundary}`,
    };
  }
}

function escapeName(name: string): string {
  return name.replace(/\r/g, '%0D').replace(/\n/g, '%0A').replace(/"/g, '%22');
}
