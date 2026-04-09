import React, { ComponentProps, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInRight,
  FadeOutDown,
  FlipInYRight,
  RollOutRight,
  ZoomInRotate,
  ZoomOutLeft,
} from 'react-native-reanimated';

type EnteringAnimationProp = ComponentProps<typeof Animated.View>['entering'];
type ExitingAnimationProp = ComponentProps<typeof Animated.View>['exiting'];

interface AnimatedBlockProps {
  name: string;
  entering?: EnteringAnimationProp;
  exiting?: ExitingAnimationProp;
  defaultShow?: boolean;
  compact?: boolean;
}

const AnimatedBlock = ({
  compact,
  defaultShow,
  entering,
  exiting,
  name,
}: AnimatedBlockProps) => {
  const [show, setShow] = useState(defaultShow);
  return (
    <View style={styles.animatedBox}>
      {show ? (
        <TouchableWithoutFeedback onPress={() => setShow(!show)}>
          {/* Workaround for TouchableWithoutFeedback overwriting the nativeID */}
          <View>
            <Animated.View
              style={[
                styles.animatedBlock,
                compact ? styles.animatedBlockCompact : null,
              ]}
              entering={entering}
              exiting={exiting}>
              <Text style={styles.animatedText}>{name}</Text>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      ) : null}
      {!show ? (
        <Animated.View entering={entering ? undefined : FadeIn.delay(350)}>
          <TouchableOpacity
            style={[
              styles.animatedBlockPlaceholder,
              compact ? styles.animatedBlockCompact : null,
            ]}
            onPress={() => setShow(!show)}>
            <Text style={styles.animatedTextPlaceholder}>{name}</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : null}
    </View>
  );
};

interface ComparisonRowProps {
  title: string;
  description: string;
  defaultEntering?: EnteringAnimationProp;
  defaultExiting?: ExitingAnimationProp;
  entering?: EnteringAnimationProp;
  exiting?: ExitingAnimationProp;
  isExitCase?: boolean;
}

const ComparisonRow = ({
  defaultEntering,
  defaultExiting,
  description,
  entering,
  exiting,
  isExitCase,
  title,
}: ComparisonRowProps) => {
  const defaultShow = !!isExitCase;
  return (
    <View style={styles.comparisonSection}>
      <Text style={styles.overrideText}>{title}</Text>
      <Text style={styles.overrideDescription}>{description}</Text>
      <View style={styles.comparisonRow}>
        <View style={styles.comparisonColumn}>
          <Text style={styles.comparisonLabel}>Default</Text>
          <AnimatedBlock
            defaultShow={defaultShow}
            entering={defaultEntering}
            exiting={defaultExiting}
            name="Default"
          />
        </View>
        <View style={styles.comparisonColumn}>
          <Text style={styles.comparisonLabel}>Modified</Text>
          <AnimatedBlock
            defaultShow={defaultShow}
            entering={entering}
            exiting={exiting}
            name="Modified"
          />
        </View>
      </View>
    </View>
  );
};

export default function DefaultAnimationsOverrides() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.groupText}>Entering overrides</Text>
      <ComparisonRow
        defaultEntering={FadeInRight}
        description="withInitialValues({ opacity: 0, translateX: 360 })"
        entering={FadeInRight.withInitialValues({
          opacity: 0,
          translateX: 360,
        })}
        title="FadeInRight"
      />
      <ComparisonRow
        defaultEntering={ZoomInRotate}
        description="withInitialValues({ rotate: 3rad, transform: [scale: 0.05, rotate: 2.4rad] })"
        entering={ZoomInRotate.withInitialValues({
          rotate: '3rad',
          transform: [{ scale: 0.05 }, { rotate: '2.4rad' }],
        })}
        title="ZoomInRotate"
      />
      <ComparisonRow
        defaultEntering={FlipInYRight}
        description="withInitialValues({ transform: [perspective: 1200, rotateY: 45deg, translateX: 50] })"
        entering={FlipInYRight.withInitialValues({
          transform: [
            { perspective: 1200 },
            { rotateY: '45deg' },
            { translateX: 50 },
          ],
        })}
        title="FlipInYRight"
      />

      <Text style={styles.groupText}>Exiting overrides</Text>
      <ComparisonRow
        defaultExiting={FadeOutDown}
        description="withTargetValues({ opacity: 0, translateY: 320 })"
        exiting={FadeOutDown.withTargetValues({
          opacity: 0,
          translateY: 320,
        })}
        title="FadeOutDown"
        isExitCase
      />
      <ComparisonRow
        defaultExiting={RollOutRight}
        description="withTargetValues({ transform: [translateX: 900, rotate: 1080deg] })"
        exiting={RollOutRight.withTargetValues({
          transform: [{ translateX: 900 }, { rotate: '1080deg' }],
        })}
        title="RollOutRight"
        isExitCase
      />
      <ComparisonRow
        defaultExiting={ZoomOutLeft}
        description="withTargetValues({ transform: [translateX: -50, scale: 0.08] })"
        exiting={ZoomOutLeft.withTargetValues({
          transform: [{ translateX: -50 }, { scale: 0.08 }],
        })}
        title="ZoomOutLeft"
        isExitCase
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  animatedBlock: {
    alignItems: 'center',
    backgroundColor: '#001a72',
    borderColor: '#001a72',
    borderWidth: 3,
    height: 60,
    justifyContent: 'center',
    width: 300,
  },
  animatedBlockCompact: {
    width: 160,
  },
  animatedBlockPlaceholder: {
    alignItems: 'center',
    borderColor: '#001a72',
    borderStyle: 'dashed',
    borderWidth: 3,
    height: 60,
    justifyContent: 'center',
    width: 300,
  },
  animatedBox: {
    alignItems: 'center',
    padding: 5,
  },
  animatedText: {
    color: '#ffffff',
    fontSize: 20,
    userSelect: 'none',
  },
  animatedTextPlaceholder: {
    color: '#001a72',
    fontSize: 20,
  },
  comparisonColumn: {
    alignItems: 'center',
    flex: 1,
  },
  comparisonLabel: {
    color: '#444',
    fontSize: 13,
    fontWeight: '600',
    paddingBottom: 2,
  },
  comparisonRow: {
    flexDirection: 'column',
    gap: 2,
    paddingHorizontal: 8,
  },
  comparisonSection: {
    paddingBottom: 6,
  },
  container: {
    flexDirection: 'column',
  },
  groupText: {
    fontSize: 20,
    paddingBottom: 5,
    paddingLeft: 5,
    paddingTop: 5,
  },
  overrideDescription: {
    color: '#555',
    fontSize: 12,
    paddingBottom: 2,
    paddingHorizontal: 10,
  },
  overrideText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
    paddingBottom: 2,
    paddingLeft: 10,
    paddingRight: 10,
  },
});
