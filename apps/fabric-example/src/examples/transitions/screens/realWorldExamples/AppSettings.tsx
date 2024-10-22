import { darken, lighten } from '../../../../utils';
import { colors, flex, radius, sizes, spacing } from '../../../../theme';
import type { PropsWithChildren } from 'react';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { cubicBezier } from 'react-native-reanimated';

const FONT_SIZES = [16, 18, 22];
const COLORS = ['#7A58E2', '#3CADA4', '#3592DE', '#C14E9A', '#F38C65'];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const switchOptions = [
  'Subscribe to the newsletter',
  'Keep in background',
  'Show in the Applications bar',
  'Auto-update the app',
];

export default function AppSettings() {
  const [selectedOptions, setSelectedOptions] = useState<Set<number>>(
    () => new Set()
  );
  const [fontSize, setFontSize] = useState(FONT_SIZES[0]);
  const [theme, setTheme] = useState(COLORS[0]);

  const bgColor = darken(theme, 90);
  const fgColor = lighten(theme, 50);

  return (
    <Animated.ScrollView
      style={[
        flex.fill,
        {
          transitionProperty: 'backgroundColor',
          transitionDuration: 200,
          backgroundColor: bgColor,
        },
      ]}
      contentContainerStyle={flex.fill}>
      <View style={styles.container}>
        <SettingsSection title="General" accentColor={theme}>
          {switchOptions.map((option, index) => (
            <SettingsRow key={option}>
              <Switch
                inactiveBackgroundColor={fgColor}
                activeBackgroundColor={theme}
                active={selectedOptions.has(index)}
                onChange={() => {
                  const newOptions = new Set(selectedOptions);
                  if (selectedOptions.has(index)) {
                    newOptions.delete(index);
                  } else {
                    newOptions.add(index);
                  }
                  setSelectedOptions(newOptions);
                }}
              />
              <Label color={fgColor} fontSize={fontSize}>
                {option}
              </Label>
            </SettingsRow>
          ))}
        </SettingsSection>

        <SettingsSection title="Appearance" accentColor={theme}>
          <SettingsRow>
            <Label color={fgColor} fontSize={fontSize}>
              Font Size
            </Label>
            <View style={styles.colorSwatches}>
              {FONT_SIZES.map((size) => (
                <FontSizeButton
                  key={size}
                  fontSize={size}
                  active={fontSize === size}
                  onPress={() => setFontSize(size)}
                />
              ))}
            </View>
          </SettingsRow>
          <SettingsRow>
            <Label color={fgColor} fontSize={fontSize}>
              Theme
            </Label>
            <View style={styles.colorSwatches}>
              {COLORS.map((color) => (
                <ColorSwatch
                  key={color}
                  color={color}
                  active={theme === color}
                  onPress={() => setTheme(color)}
                />
              ))}
            </View>
          </SettingsRow>
        </SettingsSection>
      </View>
    </Animated.ScrollView>
  );
}

type SettingsSectionProps = PropsWithChildren<{
  title: string;
  accentColor: string;
}>;

function SettingsSection({
  title,
  accentColor,
  children,
}: SettingsSectionProps) {
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Animated.View
        style={[
          styles.separator,
          {
            transitionProperty: 'backgroundColor',
            transitionDuration: 200,
            backgroundColor: accentColor,
          },
        ]}
      />
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

type SettingsRowProps = {
  children: React.ReactNode;
};

function SettingsRow({ children }: SettingsRowProps) {
  return <View style={styles.settingsRow}>{children}</View>;
}

type LabelProps = {
  children: string;
  fontSize: number;
  color: string;
};

function Label({ children, color, fontSize }: LabelProps) {
  return (
    <Animated.Text
      style={[
        styles.label,
        { transitionProperty: 'all', transitionDuration: 200, color, fontSize },
      ]}>
      {children}
    </Animated.Text>
  );
}

type SwitchProps = {
  inactiveBackgroundColor: string;
  activeBackgroundColor: string;
  active: boolean;
  onChange: () => void;
};

function Switch({
  inactiveBackgroundColor,
  activeBackgroundColor,
  active,
  onChange,
}: SwitchProps) {
  return (
    <Pressable style={styles.switch} onPress={onChange} hitSlop={spacing.xxs}>
      <Animated.View
        style={[
          styles.switchBackground,
          {
            transitionProperty: 'all',
            transitionDuration: 300,
            opacity: active ? 1 : 0.5,
            backgroundColor: active
              ? activeBackgroundColor
              : inactiveBackgroundColor,
          },
        ]}
      />

      <Animated.View
        style={[
          styles.switchThumb,
          {
            transitionProperty: 'all',
            transitionDuration: 500,
            transitionTimingFunction: cubicBezier(0.2, 0.9, 0.5, 1),
            transform: [{ translateX: active ? '-100%' : 0 }],
            left: active ? '100%' : 0,
          },
        ]}>
        <Animated.View
          style={[
            styles.thumbPressIndicator,
            {
              // Use animation instead of transition here to ensure that it
              // runs only when the switch state changes from inactive to
              // active (transition will react to both changes)
              animationName: active
                ? {
                    from: { transform: [{ scale: 1 }], opacity: 0.75 },
                    to: { transform: [{ scale: 2 }], opacity: 0 },
                  }
                : undefined,
              animationDuration: 300,
            },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

type FontSizeButtonProps = {
  fontSize: number;
  active: boolean;
  onPress: () => void;
};

function FontSizeButton({ fontSize, active, onPress }: FontSizeButtonProps) {
  return (
    <Pressable style={styles.fontSizeButton} onPress={onPress}>
      <Animated.View
        style={[
          styles.fontSizeBackground,
          {
            transitionProperty: 'all',
            transitionDuration: 200,
            transitionTimingFunction: cubicBezier(0.15, 1.41, 1, 1.51),
            transform: [{ scale: active ? 1 : 0.5 }],
            opacity: active ? 1 : 0,
          },
        ]}
      />
      <Text style={[styles.fontSizeText, { fontSize }]}>A</Text>
    </Pressable>
  );
}

type ColorSwatchProps = {
  color: string;
  active: boolean;
  onPress: () => void;
};

function ColorSwatch({ color, active, onPress }: ColorSwatchProps) {
  return (
    <AnimatedPressable
      style={[
        styles.colorSwatch,
        {
          transitionProperty: 'borderWidth',
          transitionDuration: 300,
          backgroundColor: color,
          borderWidth: active ? 4 : 1,
        },
      ]}
      onPress={onPress}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xl,
    gap: spacing.xxl,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: colors.white,
  },
  separator: {
    height: 3,
    width: sizes.md,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  sectionContent: {
    gap: spacing.md,
  },
  settingsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
  },
  switch: {
    width: sizes.md,
    justifyContent: 'center',
    padding: spacing.xxxs,
  },
  switchBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.full,
  },
  switchThumb: {
    backgroundColor: colors.white,
    width: 20,
    height: 20,
    borderRadius: radius.full,
  },
  thumbPressIndicator: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.white,
    borderRadius: radius.full,
  },
  fontSizeButton: {
    ...flex.center,
    width: sizes.sm,
    height: sizes.sm,
  },
  fontSizeBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  fontSizeText: {
    color: colors.white,
  },
  colorSwatches: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  colorSwatch: {
    width: sizes.sm,
    height: sizes.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.white,
  },
});
