/// <reference types="react" />
import type { AnimatedComponentProps, IAnimatedComponentInternal, IJSPropsUpdater, InitialComponentProps } from './commonTypes';
declare class JSPropsUpdaterNative implements IJSPropsUpdater {
    private static _tagToComponentMapping;
    private static isInitialized;
    constructor();
    addOnJSPropsChangeListener(animatedComponent: React.Component<AnimatedComponentProps<InitialComponentProps>> & IAnimatedComponentInternal): void;
    removeOnJSPropsChangeListener(animatedComponent: React.Component<AnimatedComponentProps<InitialComponentProps>> & IAnimatedComponentInternal): void;
}
declare class JSPropsUpdaterWeb implements IJSPropsUpdater {
    addOnJSPropsChangeListener(_animatedComponent: React.Component<AnimatedComponentProps<InitialComponentProps>> & IAnimatedComponentInternal): void;
    removeOnJSPropsChangeListener(_animatedComponent: React.Component<AnimatedComponentProps<InitialComponentProps>> & IAnimatedComponentInternal): void;
}
type JSPropsUpdaterOptions = typeof JSPropsUpdaterWeb | typeof JSPropsUpdaterNative;
declare let JSPropsUpdater: JSPropsUpdaterOptions;
export default JSPropsUpdater;
//# sourceMappingURL=JSPropsUpdater.d.ts.map