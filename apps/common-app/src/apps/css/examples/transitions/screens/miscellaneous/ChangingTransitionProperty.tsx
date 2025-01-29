import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type {
  CSSTransitionProperties,
  CSSTransitionProperty,
  CSSTransitionSettings,
  StyleProps,
} from 'react-native-reanimated';
import Animated, { LinearTransition } from 'react-native-reanimated';

import {
  Button,
  Checkbox,
  ScrollScreen,
  Section,
  Stagger,
} from '@/apps/css/components';
import {
  TransitionConfiguration,
  TransitionStyleChange,
} from '@/apps/css/examples/transitions/components';
import { colors, flex, radius, sizes, spacing } from '@/theme';

const PROPERTIES = [
  'none',
  'width',
  'height',
  'transform',
  'backgroundColor',
  'borderRadius',
  'all',
] satisfies Array<CSSTransitionProperty>;

const transitionSettings: CSSTransitionSettings = {
  transitionDuration: '1s',
  transitionTimingFunction: 'ease-in-out',
};

const transitionStyles: Array<StyleProps> = [
  {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    height: sizes.md,
    width: sizes.md,
  },
  {
    backgroundColor: colors.primaryDark,
    borderRadius: '50%',
    height: sizes.xl,
    transform: [{ rotate: '360deg' }],
    width: sizes.xl,
  },
  {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.xl,
    height: sizes.md,
    width: sizes.xl,
  },
  {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    height: sizes.xl,
    transform: [{ rotate: '180deg' }],
    width: sizes.md,
  },
];

export default function ChangingTransitionProperty() {
  const [transitionProperty, setTransitionProperty] = useState<
    Array<string> | string
  >('all');
  const [currentStyleIndex, setCurrentStyleIndex] = useState(0);
  const [displayStyleChanges, setDisplayStyleChanges] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setCurrentStyleIndex(1);
    }, 250);
    const interval = setInterval(() => {
      setCurrentStyleIndex((prev) => (prev + 1) % transitionStyles.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleSelect = (propertyName: string) => {
    if (
      propertyName === 'none' ||
      propertyName === 'all' ||
      transitionProperty === 'none' ||
      transitionProperty === 'all'
    ) {
      setTransitionProperty(propertyName);
    } else if (!Array.isArray(transitionProperty)) {
      if (transitionProperty === propertyName) {
        setTransitionProperty('none');
      } else {
        setTransitionProperty([transitionProperty, propertyName]);
      }
    } else {
      const newProperties = transitionProperty.includes(propertyName)
        ? transitionProperty.filter((item) => item !== propertyName)
        : [...transitionProperty, propertyName];
      setTransitionProperty(
        newProperties.length > 1 ? newProperties : newProperties[0]
      );
    }
  };

  const isSelected = (propertyName: string) =>
    Array.isArray(transitionProperty)
      ? transitionProperty.includes(propertyName)
      : transitionProperty === propertyName;

  const transitionProperties: CSSTransitionProperties = {
    transitionProperty: transitionProperty as CSSTransitionProperty,
    ...transitionSettings,
  };

  return (
    <ScrollScreen>
      <Stagger>
        <Section
          description="This example shows how selected transition properties affect view style changes. You can observe which properties are being animated when the style is changing."
          title="Transition Property">
          <View style={styles.content}>
            <View style={styles.buttons}>
              {PROPERTIES.map((property, index) => (
                <Button
                  activeOpacity={1}
                  key={index}
                  title={property}
                  style={[
                    flex.grow,
                    isSelected(property)
                      ? styles.activeButton
                      : styles.inactiveButton,
                  ]}
                  onPress={() => handleSelect(property)}
                />
              ))}
            </View>

            <View style={styles.preview}>
              <Animated.View
                style={[
                  transitionProperties,
                  transitionStyles[currentStyleIndex],
                ]}
              />
            </View>

            <Animated.View
              layout={LinearTransition}
              style={styles.styleChangeWrapper}>
              {displayStyleChanges && (
                <TransitionStyleChange
                  activeStyleIndex={currentStyleIndex}
                  transitionStyles={transitionStyles}
                />
              )}
            </Animated.View>
            <Checkbox
              label="Display style changes"
              selected={displayStyleChanges}
              onChange={setDisplayStyleChanges}
            />
          </View>
        </Section>

        <Section
          description="Transition configuration consists of the style changes that will be animated and the transition settings."
          title="Transition configuration">
          <TransitionConfiguration
            transitionProperties={transitionProperties}
            transitionStyles={transitionStyles}
          />
        </Section>
      </Stagger>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  activeButton: {
    backgroundColor: colors.primary,
  },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  content: {
    gap: spacing.xs,
  },
  inactiveButton: {
    backgroundColor: colors.primaryLight,
  },
  preview: {
    alignItems: 'center',
    backgroundColor: colors.background2,
    borderRadius: radius.md,
    height: sizes.xxl,
    justifyContent: 'center',
  },
  styleChangeWrapper: {
    overflow: 'hidden',
  },
});
