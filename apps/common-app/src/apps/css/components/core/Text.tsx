import { useNavigation } from '@react-navigation/native';
import type {
  GestureResponderEvent,
  TextProps as RNTextProps,
} from 'react-native';
import { StyleSheet, Text as RNText } from 'react-native';

import type {
  AnimationsNavigationRouteName,
  TransitionsNavigationRouteName,
} from '@/apps/css/examples';
import { colors, text } from '@/theme';
import type { FontVariant } from '@/types';

function parseTextVariant(textToParse: string): [FontVariant, string] {
  const match = textToParse.match(/^(#+)\s+/);
  if (match) {
    const hashes = match[1].length;
    const cleanedText = textToParse.slice(match[0].length);
    if (hashes < 4) {
      return [`heading${hashes}` as FontVariant, cleanedText];
    } else if (hashes < 7) {
      return [`subHeading${hashes - 3}` as FontVariant, cleanedText];
    }
  }
  return ['body1', textToParse];
}

const REGEX = /`([^`]+)`|\*\*([^*]+)\*\*/g;

const VARIANT_COLORS: Record<FontVariant, string> = {
  body1: colors.foreground3,
  body2: colors.foreground3,
  body3: colors.foreground3,
  code: colors.primaryDark,
  heading1: colors.foreground1,
  heading2: colors.foreground1,
  heading3: colors.foreground1,
  heading4: colors.foreground1,
  inlineCode: colors.primaryDark,
  label1: colors.foreground2,
  label2: colors.foreground2,
  label3: colors.foreground2,
  subHeading1: colors.foreground1,
  subHeading2: colors.foreground1,
  subHeading3: colors.foreground1,
};

export type TextProps = {
  variant?: FontVariant;
  navLink?: AnimationsNavigationRouteName | TransitionsNavigationRouteName;
  center?: boolean;
} & RNTextProps;

export default function Text({
  center,
  children,
  navLink,
  onPress,
  style,
  variant,
  ...rest
}: TextProps) {
  const navigation = useNavigation();

  const getVariantProps = (textVariant: FontVariant, extraStyle = {}) => ({
    ...rest,
    onPress:
      navLink &&
      ((args: GestureResponderEvent) => {
        onPress?.(args);
        navigation.navigate(navLink as never);
      }),
    style: [
      text[textVariant],
      {
        backgroundColor:
          textVariant === 'inlineCode' ? colors.primaryLight : 'transparent',
        color: VARIANT_COLORS[textVariant],
        textAlign: center ? 'center' : undefined,
      },
      navLink && styles.link,
      style,
      extraStyle, // Optional extra styles for things like bold
    ],
  });

  if (variant === 'inlineCode') {
    return (
      <Text>
        {' '}
        <RNText {...getVariantProps(variant)}>{children}</RNText>{' '}
      </Text>
    );
  }

  const renderTextWithCode = (textToParse: string) => {
    let resultingVariant = variant as FontVariant;
    let resultingText = textToParse;

    if (!variant) {
      [resultingVariant, resultingText] = parseTextVariant(textToParse);
    }

    return resultingText.split(REGEX).map((part, index) => {
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
            {...getVariantProps(resultingVariant, { fontWeight: 'bold' })}>
            {part}
          </RNText>
        );
      }
      // Default: regular text
      return (
        <RNText key={index} {...getVariantProps(resultingVariant)}>
          {part}
        </RNText>
      );
    });
  };

  const isString = typeof children === 'string';

  return (
    <RNText {...getVariantProps(variant ?? 'body1')}>
      {isString ? renderTextWithCode(children) : children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  link: {
    textDecorationLine: 'underline',
  },
});
