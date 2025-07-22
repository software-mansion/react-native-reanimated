'use strict';

/**
 * The below type is used for HostObjects returned by the JSI API that don't
 * have any accessible fields or methods but can carry data that is accessed
 * from the c++ side. We add a field to the type to make it possible for
 * typescript to recognize which JSI methods accept those types as arguments and
 * to be able to correctly type check other methods that may use them. However,
 * this field is not actually defined nor should be used for anything else as
 * assigning any data to those objects will throw an error.
 */
export type ShareableRef<T = unknown> = {
  __hostObjectShareableJSRef: T;
};

// In case of objects with depth or arrays of objects or arrays of arrays etc.
// we add this utility type that makes it a `SharaebleRef` of the outermost type.
export type FlatShareableRef<T> =
  T extends ShareableRef<infer U> ? ShareableRef<U> : ShareableRef<T>;

export type WorkletRuntime = {
  __hostObjectWorkletRuntime: never;
  readonly name: string;
};

export type WorkletStackDetails = [
  error: Error,
  lineOffset: number,
  columnOffset: number,
];

export type WorkletClosure = Record<string, unknown>;

interface WorkletInitData {
  code: string;
  /** Only in dev builds. */
  location?: string;
  /** Only in dev builds. */
  sourceMap?: string;
}

interface WorkletProps {
  __closure: WorkletClosure;
  __workletHash: number;
  /** Only in Legacy Bundling. */
  __initData?: WorkletInitData;
  /** Only for Handles. */
  __init?: () => unknown;
  /** `__stackDetails` is removed after parsing. */
  __stackDetails?: WorkletStackDetails;
  /** Only in dev builds. */
  __pluginVersion?: string;
}

export type WorkletFunction<
  TArgs extends unknown[] = unknown[],
  TReturn = unknown,
> = ((...args: TArgs) => TReturn) & WorkletProps;

export interface WorkletFactory<
  TArgs extends unknown[] = unknown[],
  TReturn = unknown,
  TClosureVariables extends Record<string, unknown> = Record<string, unknown>,
> {
  (closureVariables: TClosureVariables): WorkletFunction<TArgs, TReturn>;
}

export type ValueUnpacker = WorkletFunction<
  [objectToUnpack: unknown, category?: string],
  unknown
>;

export interface WorkletImport {
  __bundleData: {
    /** Name of the module which is the source of the import. */
    source: string;
    /** The name of the imported value. */
    imported: string;
  };
}
