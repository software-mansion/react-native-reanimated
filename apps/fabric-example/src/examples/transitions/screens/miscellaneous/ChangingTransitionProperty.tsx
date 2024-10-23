import { colors, flex, radius, sizes, spacing } from '../../../../theme';
import {
  Button,
  Checkbox,
  ScrollScreen,
  Section,
  Stagger,
} from '../../../../components';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type {
  CSSTransitionConfig,
  CSSTransitionProperty,
  CSSTransitionSettings,
  StyleProps,
} from 'react-native-reanimated';
import Animated, { LinearTransition } from 'react-native-reanimated';
import {
  TransitionConfiguration,
  TransitionStyleChange,
} from '../../components';

const PROPERTIES = [
  'none',
  'width',
  'height',
  'transform',
  'backgroundColor',
  'borderRadius',
  'all',
] satisfies CSSTransitionProperty[];

const transitionSettings: CSSTransitionSettings = {
  transitionDuration: '1s',
  transitionTimingFunction: 'easeInOut',
};

const transitionStyles: StyleProps[] = [
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
    width: sizes.xl,
    transform: [{ rotate: '360deg' }],
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
    width: sizes.md,
    transform: [{ rotate: '180deg' }],
  },
];

export default function ChangingTransitionProperty() {
  const [transitionProperty, setTransitionProperty] = useState<
    string | string[]
  >('all');
  const [currentStyleIndex, setCurrentStyleIndex] = useState(0);
  const [displayStyleChanges, setDisplayStyleChanges] = useState(true);

  useEffect(() => {
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

  const transitionConfig: CSSTransitionConfig = {
    transitionProperty: transitionProperty as CSSTransitionProperty,
    ...transitionSettings,
  };

  return (
    <ScrollScreen>
      <Stagger>
        <Section
          title="Transition Property"
          description="This example shows how selected transition properties affect view style changes. You can observe which properties are being animated when the style is changing.">
          <View style={styles.content}>
            <View style={styles.buttons}>
              {PROPERTIES.map((property, index) => (
                <Button
                  key={index}
                  title={property}
                  onPress={() => handleSelect(property)}
                  activeOpacity={1}
                  style={[
                    flex.grow,
                    isSelected(property)
                      ? styles.activeButton
                      : styles.inactiveButton,
                  ]}
                />
              ))}
            </View>

            <View style={styles.preview}>
              <Animated.View
                style={[transitionConfig, transitionStyles[currentStyleIndex]]}
              />
            </View>

            <Animated.View
              style={styles.styleChangeWrapper}
              layout={LinearTransition}>
              {displayStyleChanges && (
                <TransitionStyleChange
                  transitionStyles={transitionStyles}
                  activeStyleIndex={currentStyleIndex}
                />
              )}
            </Animated.View>

            <Checkbox
              label="Display style changes"
              onChange={setDisplayStyleChanges}
              selected={displayStyleChanges}
            />
          </View>
        </Section>

        <Section
          title="Transition configuration"
          description="Transition configuration consists of the style changes that will be animated and the transition settings.">
          <TransitionConfiguration
            sharedConfig={transitionConfig}
            transitionStyles={transitionStyles}
          />
        </Section>
      </Stagger>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xs,
  },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  inactiveButton: {
    backgroundColor: colors.primaryLight,
  },
  activeButton: {
    backgroundColor: colors.primary,
  },
  preview: {
    backgroundColor: colors.background2,
    borderRadius: radius.md,
    height: sizes.xxl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  styleChangeWrapper: {
    overflow: 'hidden',
  },
});
