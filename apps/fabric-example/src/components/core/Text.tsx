import { Text as RNText, StyleSheet } from 'react-native';
import type {
  GestureResponderEvent,
  TextProps as RNTextProps,
} from 'react-native';
import { colors, text } from '../../theme';
import type { FontVariant } from '../../types';
import { navigate } from '../../navigation';
import type { NavigationRouteName } from '../../navigation';

const CODE_REGEX = /`([^`]+)`/g;

const VARIANT_COLORS: Record<FontVariant, string> = {
  heading1: colors.foreground1,
  heading2: colors.foreground1,
  heading3: colors.foreground1,
  heading4: colors.foreground1,
  subHeading1: colors.foreground1,
  subHeading2: colors.foreground1,
  subHeading3: colors.foreground1,
  body1: colors.foreground3,
  body2: colors.foreground3,
  body3: colors.foreground3,
  label1: colors.foreground2,
  label2: colors.foreground2,
  label3: colors.foreground2,
  inlineCode: colors.primaryDark,
  code: colors.primaryDark,
};

type TextProps = RNTextProps & {
  variant?: FontVariant;
  navLink?: NavigationRouteName;
  center?: boolean;
};

export default function Text({
  variant = 'body1',
  style,
  children,
  navLink,
  onPress,
  center,
  ...rest
}: TextProps) {
  const variantStyle = text[variant];
  const color = VARIANT_COLORS[variant];

  const variantProps = {
    ...rest,
    style: [
      variantStyle,
      {
        color,
        backgroundColor:
          variant === 'inlineCode' ? colors.primaryLight : 'transparent',
        textAlign: center ? 'center' : undefined,
      },
      navLink && styles.link,
      style,
    ],
    onPress:
      navLink &&
      ((args: GestureResponderEvent) => {
        onPress?.(args);
        navigate(navLink);
      }),
  };

  if (variant === 'inlineCode') {
    return (
      <Text>
        {' '}
        <RNText {...variantProps}>{children}</RNText>{' '}
      </Text>
    );
  }

  const renderTextWithCode = (textToParse: string) =>
    textToParse.split(CODE_REGEX).map((part, index) => (
      <RNText key={index} {...variantProps}>
        {part}
      </RNText>
    ));

  return (
    <RNText {...variantProps}>
      {
        typeof children === 'string'
          ? renderTextWithCode(children)
          : children /* if children is not a string, render as-is */
      }
    </RNText>
  );
}

const styles = StyleSheet.create({
  link: {
    textDecorationLine: 'underline',
  },
});
