/**
 * We hardcode the version of Reanimated here in order to compare it with the
 * version used to build the native part of the library in runtime. Remember to
 * keep this in sync with the version declared in `package.json`
 */
export declare const jsVersion = "4.0.0-beta.3";
/**
 * Extra checks for conforming with the version of `react-native-worklets`. Even
 * if the App compiles there could be ABI mismatches.
 */
export declare const acceptedWorkletsVersion: {
    min: string;
    max: string;
};
//# sourceMappingURL=jsVersion.d.ts.map