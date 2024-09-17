import { Text as RNText, StyleSheet } from 'react-native';
import type {
  GestureResponderEvent,
  TextProps as RNTextProps,
} from 'react-native';
import { colors, text } from '../../theme';
import type { FontVariant } from '../../types';
import { navigate } from '../../navigation';
import type { NavigationRouteName } from '../../navigation';

const REGEX = /`([^`]+)`|\*\*([^*]+)\*\*/g; // Updated regex to capture both `code` and **bold** syntax

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
  const getVariantProps = (textVariant: FontVariant, extraStyle = {}) => ({
    ...rest,
    style: [
      text[textVariant],
      {
        color: VARIANT_COLORS[textVariant],
        backgroundColor:
          textVariant === 'inlineCode' ? colors.primaryLight : 'transparent',
        textAlign: center ? 'center' : undefined,
      },
      navLink && styles.link,
      style,
      extraStyle, // Optional extra styles for things like bold
    ],
    onPress:
      navLink &&
      ((args: GestureResponderEvent) => {
        onPress?.(args);
        navigate(navLink);
      }),
  });

  if (variant === 'inlineCode') {
    return (
      <Text>
        {' '}
        <RNText {...getVariantProps(variant)}>{children}</RNText>{' '}
      </Text>
    );
  }

  const renderTextWithCode = (textToParse: string) =>
    textToParse.split(REGEX).map((part, index) => {
      if (index % 3 === 1) {
        // Apply inline code style
        return (
          <RNText key={index} {...getVariantProps('inlineCode')}>
            {part}
          </RNText>
        );
      } else if (index % 3 === 2) {
        // Apply bold style
        return (
          <RNText
            key={index}
            {...getVariantProps(variant, { fontWeight: 'bold' })}>
            {part}
          </RNText>
        );
      }
      // Default: regular text
      return (
        <RNText key={index} {...getVariantProps(variant)}>
          {part}
        </RNText>
      );
    });

  return (
    <RNText {...getVariantProps(variant)}>
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
