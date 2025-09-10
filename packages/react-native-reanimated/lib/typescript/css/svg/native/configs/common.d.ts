import type { GestureResponderHandlers } from 'react-native';
import type { AccessibilityProps, ClipProps, ColorProps, CommonFilterProps, CommonMarkerProps, CommonMaskProps, DefinitionProps, FillProps, NativeProps, ResponderProps, StrokeProps, TouchableProps, TransformProps } from 'react-native-svg';
import type { StyleBuilderConfig } from '../../../native';
type NonAnimatablePropNames = keyof GestureResponderHandlers | keyof TouchableProps | keyof DefinitionProps | keyof NativeProps | keyof AccessibilityProps;
export type SvgStyleBuilderConfig<T> = StyleBuilderConfig<Omit<T, NonAnimatablePropNames>>;
export declare const commonSvgProps: {
    readonly filter: (boolean | import("../../../types").ConfigPropertyAlias<CommonFilterProps>) | {
        process: import("../../../native").ValueProcessor<string, any>;
    };
    readonly mask: (boolean | import("../../../types").ConfigPropertyAlias<CommonMaskProps>) | {
        process: import("../../../native").ValueProcessor<string, any>;
    };
    readonly marker: (boolean | import("../../../types").ConfigPropertyAlias<CommonMarkerProps>) | {
        process: import("../../../native").ValueProcessor<string, any>;
    };
    readonly markerStart: (boolean | import("../../../types").ConfigPropertyAlias<CommonMarkerProps>) | {
        process: import("../../../native").ValueProcessor<string, any>;
    };
    readonly markerMid: (boolean | import("../../../types").ConfigPropertyAlias<CommonMarkerProps>) | {
        process: import("../../../native").ValueProcessor<string, any>;
    };
    readonly markerEnd: (boolean | import("../../../types").ConfigPropertyAlias<CommonMarkerProps>) | {
        process: import("../../../native").ValueProcessor<string, any>;
    };
    readonly pointerEvents: (boolean | import("../../../types").ConfigPropertyAlias<Omit<ResponderProps, keyof GestureResponderHandlers>>) | {
        process: import("../../../native").ValueProcessor<"none" | "auto" | "box-none" | "box-only", any>;
    };
    readonly translate: (boolean | import("../../../types").ConfigPropertyAlias<TransformProps>) | {
        process: import("../../../native").ValueProcessor<import("react-native-svg").NumberArray, any>;
    };
    readonly translateX: (boolean | import("../../../types").ConfigPropertyAlias<TransformProps>) | {
        process: import("../../../native").ValueProcessor<import("react-native-svg").NumberProp, any>;
    };
    readonly translateY: (boolean | import("../../../types").ConfigPropertyAlias<TransformProps>) | {
        process: import("../../../native").ValueProcessor<import("react-native-svg").NumberProp, any>;
    };
    readonly origin: (boolean | import("../../../types").ConfigPropertyAlias<TransformProps>) | {
        process: import("../../../native").ValueProcessor<import("react-native-svg").NumberArray, any>;
    };
    readonly originX: (boolean | import("../../../types").ConfigPropertyAlias<TransformProps>) | {
        process: import("../../../native").ValueProcessor<import("react-native-svg").NumberProp, any>;
    };
    readonly originY: (boolean | import("../../../types").ConfigPropertyAlias<TransformProps>) | {
        process: import("../../../native").ValueProcessor<import("react-native-svg").NumberProp, any>;
    };
    readonly scale: (boolean | import("../../../types").ConfigPropertyAlias<TransformProps>) | {
        process: import("../../../native").ValueProcessor<import("react-native-svg").NumberArray, any>;
    };
    readonly scaleX: (boolean | import("../../../types").ConfigPropertyAlias<TransformProps>) | {
        process: import("../../../native").ValueProcessor<import("react-native-svg").NumberProp, any>;
    };
    readonly scaleY: (boolean | import("../../../types").ConfigPropertyAlias<TransformProps>) | {
        process: import("../../../native").ValueProcessor<import("react-native-svg").NumberProp, any>;
    };
    readonly skew: (boolean | import("../../../types").ConfigPropertyAlias<TransformProps>) | {
        process: import("../../../native").ValueProcessor<import("react-native-svg").NumberArray, any>;
    };
    readonly skewX: (boolean | import("../../../types").ConfigPropertyAlias<TransformProps>) | {
        process: import("../../../native").ValueProcessor<import("react-native-svg").NumberProp, any>;
    };
    readonly skewY: (boolean | import("../../../types").ConfigPropertyAlias<TransformProps>) | {
        process: import("../../../native").ValueProcessor<import("react-native-svg").NumberProp, any>;
    };
    readonly rotation: (boolean | import("../../../types").ConfigPropertyAlias<TransformProps>) | {
        process: import("../../../native").ValueProcessor<import("react-native-svg").NumberProp, any>;
    };
    readonly x: (boolean | import("../../../types").ConfigPropertyAlias<TransformProps>) | {
        process: import("../../../native").ValueProcessor<import("react-native-svg").NumberArray, any>;
    };
    readonly y: (boolean | import("../../../types").ConfigPropertyAlias<TransformProps>) | {
        process: import("../../../native").ValueProcessor<import("react-native-svg").NumberArray, any>;
    };
    readonly transform: (boolean | import("../../../types").ConfigPropertyAlias<TransformProps>) | {
        process: import("../../../native").ValueProcessor<string | readonly (({
            scaleX: import("react-native").AnimatableNumericValue;
        } & {
            scaleY?: undefined;
            translateX?: undefined;
            translateY?: undefined;
            perspective?: undefined;
            rotate?: undefined;
            rotateX?: undefined;
            rotateY?: undefined;
            rotateZ?: undefined;
            scale?: undefined;
            skewX?: undefined;
            skewY?: undefined;
            matrix?: undefined;
        }) | ({
            scaleY: import("react-native").AnimatableNumericValue;
        } & {
            scaleX?: undefined;
            translateX?: undefined;
            translateY?: undefined;
            perspective?: undefined;
            rotate?: undefined;
            rotateX?: undefined;
            rotateY?: undefined;
            rotateZ?: undefined;
            scale?: undefined;
            skewX?: undefined;
            skewY?: undefined;
            matrix?: undefined;
        }) | ({
            translateX: `${number}%` | import("react-native").AnimatableNumericValue;
        } & {
            scaleX?: undefined;
            scaleY?: undefined;
            translateY?: undefined;
            perspective?: undefined;
            rotate?: undefined;
            rotateX?: undefined;
            rotateY?: undefined;
            rotateZ?: undefined;
            scale?: undefined;
            skewX?: undefined;
            skewY?: undefined;
            matrix?: undefined;
        }) | ({
            translateY: `${number}%` | import("react-native").AnimatableNumericValue;
        } & {
            scaleX?: undefined;
            scaleY?: undefined;
            translateX?: undefined;
            perspective?: undefined;
            rotate?: undefined;
            rotateX?: undefined;
            rotateY?: undefined;
            rotateZ?: undefined;
            scale?: undefined;
            skewX?: undefined;
            skewY?: undefined;
            matrix?: undefined;
        }) | ({
            perspective: import("react-native").AnimatableNumericValue;
        } & {
            scaleX?: undefined;
            scaleY?: undefined;
            translateX?: undefined;
            translateY?: undefined;
            rotate?: undefined;
            rotateX?: undefined;
            rotateY?: undefined;
            rotateZ?: undefined;
            scale?: undefined;
            skewX?: undefined;
            skewY?: undefined;
            matrix?: undefined;
        }) | ({
            rotate: import("react-native").AnimatableStringValue;
        } & {
            scaleX?: undefined;
            scaleY?: undefined;
            translateX?: undefined;
            translateY?: undefined;
            perspective?: undefined;
            rotateX?: undefined;
            rotateY?: undefined;
            rotateZ?: undefined;
            scale?: undefined;
            skewX?: undefined;
            skewY?: undefined;
            matrix?: undefined;
        }) | ({
            rotateX: import("react-native").AnimatableStringValue;
        } & {
            scaleX?: undefined;
            scaleY?: undefined;
            translateX?: undefined;
            translateY?: undefined;
            perspective?: undefined;
            rotate?: undefined;
            rotateY?: undefined;
            rotateZ?: undefined;
            scale?: undefined;
            skewX?: undefined;
            skewY?: undefined;
            matrix?: undefined;
        }) | ({
            rotateY: import("react-native").AnimatableStringValue;
        } & {
            scaleX?: undefined;
            scaleY?: undefined;
            translateX?: undefined;
            translateY?: undefined;
            perspective?: undefined;
            rotate?: undefined;
            rotateX?: undefined;
            rotateZ?: undefined;
            scale?: undefined;
            skewX?: undefined;
            skewY?: undefined;
            matrix?: undefined;
        }) | ({
            rotateZ: import("react-native").AnimatableStringValue;
        } & {
            scaleX?: undefined;
            scaleY?: undefined;
            translateX?: undefined;
            translateY?: undefined;
            perspective?: undefined;
            rotate?: undefined;
            rotateX?: undefined;
            rotateY?: undefined;
            scale?: undefined;
            skewX?: undefined;
            skewY?: undefined;
            matrix?: undefined;
        }) | ({
            scale: import("react-native").AnimatableNumericValue;
        } & {
            scaleX?: undefined;
            scaleY?: undefined;
            translateX?: undefined;
            translateY?: undefined;
            perspective?: undefined;
            rotate?: undefined;
            rotateX?: undefined;
            rotateY?: undefined;
            rotateZ?: undefined;
            skewX?: undefined;
            skewY?: undefined;
            matrix?: undefined;
        }) | ({
            skewX: import("react-native").AnimatableStringValue;
        } & {
            scaleX?: undefined;
            scaleY?: undefined;
            translateX?: undefined;
            translateY?: undefined;
            perspective?: undefined;
            rotate?: undefined;
            rotateX?: undefined;
            rotateY?: undefined;
            rotateZ?: undefined;
            scale?: undefined;
            skewY?: undefined;
            matrix?: undefined;
        }) | ({
            skewY: import("react-native").AnimatableStringValue;
        } & {
            scaleX?: undefined;
            scaleY?: undefined;
            translateX?: undefined;
            translateY?: undefined;
            perspective?: undefined;
            rotate?: undefined;
            rotateX?: undefined;
            rotateY?: undefined;
            rotateZ?: undefined;
            scale?: undefined;
            skewX?: undefined;
            matrix?: undefined;
        }) | ({
            matrix: import("react-native").AnimatableNumericValue[];
        } & {
            scaleX?: undefined;
            scaleY?: undefined;
            translateX?: undefined;
            translateY?: undefined;
            perspective?: undefined;
            rotate?: undefined;
            rotateX?: undefined;
            rotateY?: undefined;
            rotateZ?: undefined;
            scale?: undefined;
            skewX?: undefined;
            skewY?: undefined;
        }))[] | import("react-native-svg").ColumnMajorTransformMatrix, any>;
    };
    readonly clipRule: (boolean | import("../../../types").ConfigPropertyAlias<ClipProps>) | {
        process: import("../../../native").ValueProcessor<import("react-native-svg").FillRule, any>;
    };
    readonly clipPath: (boolean | import("../../../types").ConfigPropertyAlias<ClipProps>) | {
        process: import("../../../native").ValueProcessor<string, any>;
    };
    readonly stroke: (boolean | import("../../../types").ConfigPropertyAlias<StrokeProps>) | {
        process: import("../../../native").ValueProcessor<import("react-native").ColorValue, any>;
    };
    readonly strokeWidth: (boolean | import("../../../types").ConfigPropertyAlias<StrokeProps>) | {
        process: import("../../../native").ValueProcessor<import("react-native-svg").NumberProp, any>;
    };
    readonly strokeOpacity: (boolean | import("../../../types").ConfigPropertyAlias<StrokeProps>) | {
        process: import("../../../native").ValueProcessor<import("react-native-svg").NumberProp, any>;
    };
    readonly strokeDasharray: (boolean | import("../../../types").ConfigPropertyAlias<StrokeProps>) | {
        process: import("../../../native").ValueProcessor<import("react-native-svg").NumberProp | readonly import("react-native-svg").NumberProp[], any>;
    };
    readonly strokeDashoffset: (boolean | import("../../../types").ConfigPropertyAlias<StrokeProps>) | {
        process: import("../../../native").ValueProcessor<import("react-native-svg").NumberProp, any>;
    };
    readonly strokeLinecap: (boolean | import("../../../types").ConfigPropertyAlias<StrokeProps>) | {
        process: import("../../../native").ValueProcessor<import("react-native-svg").Linecap, any>;
    };
    readonly strokeLinejoin: (boolean | import("../../../types").ConfigPropertyAlias<StrokeProps>) | {
        process: import("../../../native").ValueProcessor<import("react-native-svg").Linejoin, any>;
    };
    readonly strokeMiterlimit: (boolean | import("../../../types").ConfigPropertyAlias<StrokeProps>) | {
        process: import("../../../native").ValueProcessor<import("react-native-svg").NumberProp, any>;
    };
    readonly vectorEffect: (boolean | import("../../../types").ConfigPropertyAlias<StrokeProps>) | {
        process: import("../../../native").ValueProcessor<import("react-native-svg").VectorEffect, any>;
    };
    readonly fill: (boolean | import("../../../types").ConfigPropertyAlias<FillProps>) | {
        process: import("../../../native").ValueProcessor<import("react-native").ColorValue, any>;
    };
    readonly fillOpacity: (boolean | import("../../../types").ConfigPropertyAlias<FillProps>) | {
        process: import("../../../native").ValueProcessor<import("react-native-svg").NumberProp, any>;
    };
    readonly fillRule: (boolean | import("../../../types").ConfigPropertyAlias<FillProps>) | {
        process: import("../../../native").ValueProcessor<import("react-native-svg").FillRule, any>;
    };
    readonly color: (boolean | import("../../../types").ConfigPropertyAlias<ColorProps>) | {
        process: import("../../../native").ValueProcessor<import("react-native").ColorValue, any>;
    };
};
export {};
//# sourceMappingURL=common.d.ts.map