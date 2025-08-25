import type { StyleProp } from 'react-native';

import type { AnimatedStyle } from './_mess';
import type { SharedValue } from './values';

/*
  Style type properties (properties that extends StyleProp<ViewStyle>)
  can be defined with other property names than "style". For example `contentContainerStyle` in FlatList.
  Type definition for all style type properties should act similarly, hence we
  pick keys with 'Style' substring with the use of this utility type.
*/
type PickStyleProps<Props> = Pick<
  Props,
  {
    [Key in keyof Props]-?: Key extends `${string}Style` | 'style'
      ? Key
      : never;
  }[keyof Props]
>;

type AnimatedStyleProps<Props extends object> = {
  [Key in keyof PickStyleProps<Props>]: StyleProp<AnimatedStyle<Props[Key]>>;
};

/** Component props that are not specially handled by us. */
type RestProps<Props extends object> = {
  [K in keyof Omit<Props, keyof PickStyleProps<Props> | 'style'>]:
    | Props[K]
    | SharedValue<Props[K]>;
};
