import type { CSSKeyframesRuleImpl } from '../models';
/**
 * This class is responsible for managing the registry of CSS animation
 * keyframes. It keeps track of views that use specific animations and handles
 * native-side registration. Animation keyframes are registered on the native
 * side only when used for the first time and unregistered when removed from the
 * last view that uses them.
 */
export default class CSSKeyframesRegistry {
    private readonly registry_;
    has(animationName: string): boolean;
    add(keyframesRule: CSSKeyframesRuleImpl, viewTag: number): void;
    remove(animationName: string, viewTag: number): void;
}
//# sourceMappingURL=CSSKeyframesRegistry.d.ts.map