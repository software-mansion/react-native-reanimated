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

type WorkletClosure = Record<string, unknown>;

interface WorkletInitDataCommon {
  code: string;
}

type WorkletInitDataRelease = WorkletInitDataCommon;

interface WorkletInitDataDev extends WorkletInitDataCommon {
  location: string;
  sourceMap: string;
  version: string;
}

interface WorkletBaseCommon {
  __closure: WorkletClosure;
  __workletHash: number;
}

export interface WorkletBaseRelease extends WorkletBaseCommon {
  __initData: WorkletInitDataRelease;
}

export interface WorkletBaseDev extends WorkletBaseCommon {
  __initData: WorkletInitDataDev;
  /** `__stackDetails` is removed after parsing. */
  __stackDetails?: WorkletStackDetails;
}

export type WorkletFunctionDev<
  Args extends unknown[] = unknown[],
  ReturnValue = unknown,
> = ((...args: Args) => ReturnValue) & WorkletBaseDev;

type WorkletFunctionRelease<
  Args extends unknown[] = unknown[],
  ReturnValue = unknown,
> = ((...args: Args) => ReturnValue) & WorkletBaseRelease;

export type WorkletFunction<
  Args extends unknown[] = unknown[],
  ReturnValue = unknown,
> =
  | WorkletFunctionDev<Args, ReturnValue>
  | WorkletFunctionRelease<Args, ReturnValue>;
