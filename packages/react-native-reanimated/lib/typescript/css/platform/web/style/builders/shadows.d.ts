import type { TextStyle, ViewStyle } from 'react-native';
type BoxShadowProps = Pick<ViewStyle, 'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius'>;
export declare const boxShadowBuilder: import("..").RuleBuilder<Partial<BoxShadowProps>>;
type TextShadowProps = Pick<TextStyle, 'textShadowColor' | 'textShadowOffset' | 'textShadowRadius'>;
export declare const textShadowBuilder: import("..").RuleBuilder<Partial<TextShadowProps>>;
export {};
//# sourceMappingURL=shadows.d.ts.map