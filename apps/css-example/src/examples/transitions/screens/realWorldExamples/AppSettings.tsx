import type { PropsWithChildren } from 'react';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { cubicBezier } from 'react-native-reanimated';

import { Screen } from '@/components';
import { colors, flex, radius, sizes, spacing } from '@/theme';
import { darken, lighten } from '@/utils';

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
    <Screen>
      <Animated.ScrollView
        contentContainerStyle={flex.fill}
        style={[
          flex.fill,
          {
            backgroundColor: bgColor,
            transitionDuration: 200,
            transitionProperty: 'backgroundColor',
          },
        ]}>
        <View style={styles.container}>
          <SettingsSection accentColor={theme} title="General">
            {switchOptions.map((option, index) => (
              <SettingsRow key={option}>
                <Switch
                  active={selectedOptions.has(index)}
                  activeBackgroundColor={theme}
                  inactiveBackgroundColor={fgColor}
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

          <SettingsSection accentColor={theme} title="Appearance">
            <SettingsRow>
              <Label color={fgColor} fontSize={fontSize}>
                Font Size
              </Label>
              <View style={styles.colorSwatches}>
                {FONT_SIZES.map((size) => (
                  <FontSizeButton
                    active={fontSize === size}
                    fontSize={size}
                    key={size}
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
                    active={theme === color}
                    color={color}
                    key={color}
                    onPress={() => setTheme(color)}
                  />
                ))}
              </View>
            </SettingsRow>
          </SettingsSection>
        </View>
      </Animated.ScrollView>
    </Screen>
  );
}

type SettingsSectionProps = PropsWithChildren<{
  title: string;
  accentColor: string;
}>;

function SettingsSection({
  accentColor,
  children,
  title,
}: SettingsSectionProps) {
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Animated.View
        style={[
          styles.separator,
          {
            backgroundColor: accentColor,
            transitionDuration: 200,
            transitionProperty: 'backgroundColor',
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
        { color, fontSize, transitionDuration: 200 },
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
  active,
  activeBackgroundColor,
  inactiveBackgroundColor,
  onChange,
}: SwitchProps) {
  return (
    <Pressable hitSlop={spacing.xxs} style={styles.switch} onPress={onChange}>
      <Animated.View
        style={[
          styles.switchBackground,
          {
            backgroundColor: active
              ? activeBackgroundColor
              : inactiveBackgroundColor,
            opacity: active ? 1 : 0.5,
            transitionDuration: 300,
          },
        ]}
      />

      <Animated.View
        style={[
          styles.switchThumb,
          {
            left: active ? '100%' : 0,
            transform: [{ translateX: active ? '-100%' : 0 }],
            transitionDuration: 500,
            transitionTimingFunction: cubicBezier(0.2, 0.9, 0.5, 1),
          },
        ]}>
        <Animated.View
          style={[
            styles.thumbPressIndicator,
            {
              // Use animation instead of transition here to ensure that it
              // runs only when the switch state changes from inactive to
              animationDuration: 300,
              // active (transition will react to both changes)
              animationName: active
                ? {
                    from: { opacity: 0.75, transform: [{ scale: 1 }] },
                    to: { opacity: 0, transform: [{ scale: 2 }] },
                  }
                : undefined,
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

function FontSizeButton({ active, fontSize, onPress }: FontSizeButtonProps) {
  return (
    <Pressable style={styles.fontSizeButton} onPress={onPress}>
      <Animated.View
        style={[
          styles.fontSizeBackground,
          {
            opacity: active ? 1 : 0,
            transitionDuration: 200,
            transitionProperty: 'opacity',
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

function ColorSwatch({ active, color, onPress }: ColorSwatchProps) {
  return (
    <AnimatedPressable
      style={[
        styles.colorSwatch,
        {
          backgroundColor: color,
          borderWidth: active ? 4 : 1,
          transitionDuration: 300,
          transitionProperty: 'borderWidth',
        },
      ]}
      onPress={onPress}
    />
  );
}

const styles = StyleSheet.create({
  colorSwatch: {
    borderColor: colors.white,
    borderRadius: radius.full,
    borderWidth: 1,
    height: sizes.sm,
    width: sizes.sm,
  },
  colorSwatches: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  container: {
    flex: 1,
    gap: spacing.xxl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xl,
  },
  fontSizeBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: radius.full,
    borderWidth: 1,
  },
  fontSizeButton: {
    ...flex.center,
    height: sizes.sm,
    width: sizes.sm,
  },
  fontSizeText: {
    color: colors.white,
  },
  label: {
    fontSize: 16,
  },
  sectionContent: {
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.white,
    fontSize: 22,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  separator: {
    height: 3,
    marginBottom: spacing.xl,
    marginTop: spacing.md,
    width: sizes.md,
  },
  settingsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.lg,
  },
  switch: {
    justifyContent: 'center',
    padding: spacing.xxxs,
    width: sizes.md,
  },
  switchBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.full,
  },
  switchThumb: {
    backgroundColor: colors.white,
    borderRadius: radius.full,
    height: 20,
    width: 20,
  },
  thumbPressIndicator: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.white,
    borderRadius: radius.full,
  },
});
