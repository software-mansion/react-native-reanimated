import type { WorkletFunction } from 'react-native-worklets';
import type { DependencyList } from './commonTypes';
export declare function buildWorkletsHash<Args extends unknown[], ReturnValue>(worklets: Record<string, WorkletFunction<Args, ReturnValue>> | WorkletFunction<Args, ReturnValue>[]): string;
export declare function buildDependencies(dependencies: DependencyList, handlers: Record<string, WorkletFunction | undefined>): unknown[];
export declare function areDependenciesEqual(nextDependencies: DependencyList, prevDependencies: DependencyList): boolean;
export declare function isAnimated(prop: unknown): boolean;
export declare function shallowEqual<T extends Record<string | number | symbol, unknown>>(a: T, b: T): boolean;
export declare function validateAnimatedStyles(styles: unknown[] | object): void;
//# sourceMappingURL=utils.d.ts.map