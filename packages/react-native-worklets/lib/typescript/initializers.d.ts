import type { IWorkletsModule } from './WorkletsModule';
export declare function callGuardDEV<Args extends unknown[], ReturnValue>(fn: (...args: Args) => ReturnValue, ...args: Args): ReturnValue | void;
export declare function setupCallGuard(): void;
export declare function setupConsole(): void;
export declare function initializeUIRuntime(WorkletsModule: IWorkletsModule): void;
//# sourceMappingURL=initializers.d.ts.map