import { Text as RNText, StyleSheet } from 'react-native';
import type { TextProps as RNTextProps } from 'react-native';
import { colors, text } from '../../theme';
import type { FontVariant } from '../../types';
import { navigate } from '../../navigation';
import type { NavigationRouteName } from '../../navigation';

const CODE_REGEX = /`([^`]+)`/g;

const VARIANT_COLORS: Record<Exclude<FontVariant, 'code'>, string> = {
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
};

type TextProps = RNTextProps & {
  variant?: FontVariant;
  navLink?: NavigationRouteName;
};

export default function Text({
  variant = 'body1',
  style,
  children,
  navLink,
  onPress,
  ...rest
}: TextProps) {
  const variantStyle = text[variant];

  const getVariantProps = (v: FontVariant): RNTextProps => ({
    ...rest,
    style: [
      variantStyle,
      v === 'code' ? styles.code : { color: VARIANT_COLORS[v] },
      navLink && styles.link,
      style,
    ],
    onPress:
      navLink &&
      ((args) => {
        onPress?.(args);
        navigate(navLink);
      }),
  });

  if (variant === 'code') {
    return (
      <Text>
        {' '}
        <RNText {...getVariantProps('code')}>{children}</RNText>{' '}
      </Text>
    );
  }

  const renderTextWithCode = (textToParse: string) =>
    textToParse.split(CODE_REGEX).map((part, index) => (
      <RNText
        key={index}
        {...getVariantProps(index % 2 === 1 ? 'code' : variant)}>
        {part}
      </RNText>
    ));

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
  code: {
    color: colors.primaryDark,
    backgroundColor: colors.primaryLight,
  },
  link: {
    textDecorationLine: 'underline',
  },
});
