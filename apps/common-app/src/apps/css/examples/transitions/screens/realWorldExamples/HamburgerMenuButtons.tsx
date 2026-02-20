import type { ComponentType } from 'react';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { CSSTransitionProperties } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import {
  Button,
  Grid,
  ScrollScreen,
  Stagger,
  Text,
} from '@/apps/css/components';
import { colors, flex, radius, spacing } from '@/theme';

const BUTTON_SIZE = 36;

export default function HamburgerMenuButtons() {
  const [autoAnimate, setAutoAnimate] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (autoAnimate) {
      const interval = setInterval(() => {
        setOpen((prev) => !prev);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [autoAnimate]);

  const autoOpen = autoAnimate ? open : undefined;

  return (
    <ScrollScreen contentContainerStyle={{ paddingVertical: spacing.lg }}>
      <View style={styles.buttons}>
        <Button
          activeOpacity={1}
          title={`${autoAnimate ? 'Stop' : 'Start'} Auto Animate`}
          onPress={() => setAutoAnimate(!autoAnimate)}
        />
      </View>
      <Grid
        columnGap={spacing.sm}
        columns={3}
        rowGap={spacing.md}
        staggerInterval={100}>
        <Example autoOpen={autoOpen} Component={Simple} title="Simple" />
        <Example autoOpen={autoOpen} Component={LeftArrow} title="Left Arrow" />
        <Example
          autoOpen={autoOpen}
          Component={RightArrow}
          title="Right Arrow"
        />
        <Example autoOpen={autoOpen} Component={ToPlus} title="To Plus" />
        <Example autoOpen={autoOpen} Component={ToMinus} title="To Minus" />
        <Example autoOpen={autoOpen} Component={InCircle} title="In Circle" />
        <Example autoOpen={autoOpen} Component={Skew} title="Skew" />
        <Example autoOpen={autoOpen} Component={Rotate} title="Rotate" />
        <Example
          autoOpen={autoOpen}
          Component={ToPlusAndRotate}
          title="To Plus and Rotate"
        />
        <Example autoOpen={autoOpen} Component={Split} title="Split" />
        <Example
          autoOpen={autoOpen}
          Component={TwoBarsSimple}
          title="Two Bars Simple"
        />
        <Example
          autoOpen={autoOpen}
          Component={TwoBarsRotating}
          title="Two Bars Rotating"
        />
        <Example
          autoOpen={autoOpen}
          Component={SplitAndFlyAway}
          title="Split and Fly Away"
        />
        <Example autoOpen={autoOpen} Component={FlyAway} title="Fly Away" />
        <Example
          autoOpen={autoOpen}
          Component={ManyRotations}
          title="Many Rotations"
        />
      </Grid>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  buttons: {
    alignItems: 'flex-end',
    marginBottom: spacing.xs,
  },
});

type ExampleComponentProps = {
  open: boolean;
};

type ExampleProps = {
  title: string;
  Component: ComponentType<ExampleComponentProps>;
  autoOpen?: boolean;
};

function Example({ autoOpen, Component, title }: ExampleProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (autoOpen !== undefined) {
      setOpen(autoOpen);
    }
  }, [autoOpen]);

  return (
    <Pressable style={sharedStyles.cell} onPress={() => setOpen(!open)}>
      <Stagger delay={50}>
        <View style={sharedStyles.container}>
          <Component open={open} />
        </View>
        <Text variant="label2" center>
          {title}
        </Text>
      </Stagger>
    </Pressable>
  );
}

const sharedStyles = StyleSheet.create({
  cell: {
    alignItems: 'center',
    backgroundColor: colors.background1,
    borderRadius: radius.md,
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'space-between',
    padding: spacing.sm,
    width: '100%',
  },
  container: {
    height: BUTTON_SIZE,
    justifyContent: 'center',
    width: BUTTON_SIZE,
  },
  line: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    height: 5,
    position: 'absolute',
    width: BUTTON_SIZE,
  },
});

const SHARED_CONFIG: CSSTransitionProperties = {
  transitionDuration: 300,
  transitionProperty: 'all',
  transitionTimingFunction: 'ease-out',
};

function Simple({ open }: ExampleComponentProps) {
  const lineStyle = [sharedStyles.line, SHARED_CONFIG];

  return (
    <View>
      <Animated.View
        style={[
          lineStyle,
          {
            transform: open
              ? [{ rotate: '45deg' }]
              : [{ translateY: -BUTTON_SIZE / 4 }],
          },
        ]}
      />
      <Animated.View
        style={[
          lineStyle,
          {
            opacity: open ? 0 : 1,
          },
        ]}
      />
      <Animated.View
        style={[
          lineStyle,
          {
            transform: open
              ? [{ rotate: '-45deg' }]
              : [{ translateY: BUTTON_SIZE / 4 }],
          },
        ]}
      />
    </View>
  );
}

function LeftArrow({ open }: ExampleComponentProps) {
  const lineStyle = [sharedStyles.line, SHARED_CONFIG];

  return (
    <View>
      <Animated.View
        style={[
          lineStyle,
          {
            transform: [
              { rotate: `${open ? -45 : 0}deg` },
              { translateY: -BUTTON_SIZE / 4 },
            ],
            width: open ? BUTTON_SIZE * 0.6 : BUTTON_SIZE,
          },
        ]}
      />
      <View style={sharedStyles.line} />
      <Animated.View
        style={[
          lineStyle,
          {
            transform: [
              { rotate: `${open ? 45 : 0}deg` },
              { translateY: BUTTON_SIZE / 4 },
            ],
            width: open ? BUTTON_SIZE * 0.6 : BUTTON_SIZE,
          },
        ]}
      />
    </View>
  );
}

function RightArrow({ open }: ExampleComponentProps) {
  const lineStyle = [sharedStyles.line, SHARED_CONFIG];

  return (
    <View style={{ alignItems: 'flex-end' }}>
      <Animated.View
        style={[
          lineStyle,
          {
            transform: [
              { rotate: `${open ? 45 : 0}deg` },
              { translateY: -BUTTON_SIZE / 4 },
            ],
            width: open ? BUTTON_SIZE * 0.6 : BUTTON_SIZE,
          },
        ]}
      />
      <View style={sharedStyles.line} />
      <Animated.View
        style={[
          lineStyle,
          {
            transform: [
              { rotate: `${open ? -45 : 0}deg` },
              { translateY: BUTTON_SIZE / 4 },
            ],
            width: open ? BUTTON_SIZE * 0.6 : BUTTON_SIZE,
          },
        ]}
      />
    </View>
  );
}

function ToPlus({ open }: ExampleComponentProps) {
  const lineStyle = [sharedStyles.line, SHARED_CONFIG];

  return (
    <View>
      <Animated.View
        style={[
          lineStyle,
          {
            transform: [{ translateY: open ? 0 : -BUTTON_SIZE / 4 }],
          },
        ]}
      />
      <Animated.View
        style={[
          lineStyle,
          {
            opacity: open ? 0 : 1,
          },
        ]}
      />
      <Animated.View
        style={[
          lineStyle,
          {
            transform: open
              ? [{ rotate: '90deg' }]
              : [{ translateY: BUTTON_SIZE / 4 }],
          },
        ]}
      />
    </View>
  );
}

function ToMinus({ open }: ExampleComponentProps) {
  const lineStyle = [sharedStyles.line, SHARED_CONFIG];

  return (
    <View>
      <Animated.View
        style={[
          lineStyle,
          {
            opacity: open ? 0 : 1,
            transform: [
              { translateY: -BUTTON_SIZE / 4 },
              { translateX: open ? -BUTTON_SIZE : 0 },
            ],
          },
        ]}
      />
      <View style={sharedStyles.line} />
      <Animated.View
        style={[
          lineStyle,
          {
            opacity: open ? 0 : 1,
            transform: [
              { translateY: BUTTON_SIZE / 4 },
              { translateX: open ? BUTTON_SIZE : 0 },
            ],
          },
        ]}
      />
    </View>
  );
}

function InCircle({ open }: ExampleComponentProps) {
  const lineStyle = [sharedStyles.line, SHARED_CONFIG];

  return (
    <Animated.View
      style={[
        inCircleStyles.container,
        SHARED_CONFIG,
        {
          borderColor: open ? colors.primary : 'transparent',
          transform: [{ rotate: open ? '45deg' : '0deg' }],
        },
      ]}>
      <Animated.View
        style={[
          lineStyle,
          {
            height: open ? 4 : 5,
            transform: [{ translateY: open ? 0 : -BUTTON_SIZE / 4 }],
            width: open ? 0.6 * BUTTON_SIZE : BUTTON_SIZE,
          },
        ]}
      />
      <Animated.View
        style={[
          lineStyle,
          {
            height: open ? 4 : 5,
            opacity: open ? 0 : 1,
            width: open ? 0.6 * BUTTON_SIZE : BUTTON_SIZE,
          },
        ]}
      />
      <Animated.View
        style={[
          lineStyle,
          {
            height: open ? 4 : 5,
            transform: open
              ? [{ rotate: '90deg' }]
              : [{ translateY: BUTTON_SIZE / 4 }],
            width: open ? 0.6 * BUTTON_SIZE : BUTTON_SIZE,
          },
        ]}
      />
    </Animated.View>
  );
}

const inCircleStyles = StyleSheet.create({
  container: {
    ...flex.center,
    borderRadius: radius.full,
    borderWidth: 4,
    height: '100%',
    width: '100%',
  },
});

function Skew({ open }: ExampleComponentProps) {
  const lineStyle = [sharedStyles.line, SHARED_CONFIG];

  return (
    <Animated.View
      style={{
        transform: [{ rotate: open ? '35deg' : '0deg' }],
        transitionDuration: 300,
        transitionProperty: 'transform',
      }}>
      <Animated.View
        style={[
          lineStyle,
          {
            transform: [{ translateY: -BUTTON_SIZE / 4 }],
            width: open ? 0.6 * BUTTON_SIZE : BUTTON_SIZE,
          },
        ]}
      />
      <Animated.View
        style={[
          lineStyle,
          {
            width: open ? 0.8 * BUTTON_SIZE : BUTTON_SIZE,
          },
        ]}
      />
      <Animated.View
        style={[
          lineStyle,
          {
            transform: [{ translateY: BUTTON_SIZE / 4 }],
          },
        ]}
      />
    </Animated.View>
  );
}

function Rotate({ open }: ExampleComponentProps) {
  const lineStyle = [sharedStyles.line, SHARED_CONFIG];

  return (
    <Animated.View
      style={{
        alignItems: 'center',
        transform: [{ rotate: open ? '90deg' : '0deg' }],
        transitionDuration: 300,
        transitionProperty: 'transform',
      }}>
      <Animated.View
        style={[
          lineStyle,
          {
            transform: [{ translateY: -BUTTON_SIZE / 4 }],
            width: open ? 0.6 * BUTTON_SIZE : BUTTON_SIZE,
          },
        ]}
      />
      <Animated.View
        style={[
          lineStyle,
          {
            width: open ? 0.8 * BUTTON_SIZE : BUTTON_SIZE,
          },
        ]}
      />
      <Animated.View
        style={[
          lineStyle,
          {
            transform: [{ translateY: BUTTON_SIZE / 4 }],
          },
        ]}
      />
    </Animated.View>
  );
}

function ToPlusAndRotate({ open }: ExampleComponentProps) {
  const lineStyle = [sharedStyles.line, SHARED_CONFIG];

  return (
    <Animated.View
      style={{
        alignItems: 'center',
        transform: [{ rotate: open ? '45deg' : '0deg' }],
        transitionDelay: open ? 300 : 0,
        transitionDuration: 200,
        transitionProperty: 'transform',
      }}>
      <Animated.View
        style={[
          lineStyle,
          {
            transform: [{ translateY: open ? 0 : -BUTTON_SIZE / 4 }],
          },
        ]}
      />
      <Animated.View
        style={[
          lineStyle,
          {
            width: open ? 0 : BUTTON_SIZE,
          },
        ]}
      />
      <Animated.View
        style={[
          lineStyle,
          {
            transform: open
              ? [{ rotate: '90deg' }]
              : [{ translateY: BUTTON_SIZE / 4 }],
          },
        ]}
      />
    </Animated.View>
  );
}

function Split({ open }: ExampleComponentProps) {
  const lineStyle = [splitStyles.splitLine, SHARED_CONFIG];

  return (
    <View>
      <Animated.View
        style={[
          splitStyles.lineRow,
          SHARED_CONFIG,
          {
            transform: [
              { translateY: open ? -BUTTON_SIZE / 6 : -BUTTON_SIZE / 4 },
            ],
          },
        ]}>
        <Animated.View
          style={[
            lineStyle,
            {
              transform: open ? [{ translateX: 1 }, { rotate: '45deg' }] : [],
            },
          ]}
        />
        <Animated.View
          style={[
            lineStyle,
            splitStyles.splitLineRight,
            {
              transform: open ? [{ translateX: -1 }, { rotate: '-45deg' }] : [],
            },
          ]}
        />
      </Animated.View>
      <Animated.View
        style={[
          [sharedStyles.line, SHARED_CONFIG],
          {
            opacity: open ? 0 : 1,
          },
        ]}
      />
      <Animated.View
        style={[
          splitStyles.lineRow,
          SHARED_CONFIG,
          {
            transform: [
              { translateY: open ? BUTTON_SIZE / 6 : BUTTON_SIZE / 4 },
            ],
          },
        ]}>
        <Animated.View
          style={[
            lineStyle,
            {
              transform: open ? [{ translateX: 1 }, { rotate: '-45deg' }] : [],
            },
          ]}
        />
        <Animated.View
          style={[
            lineStyle,
            splitStyles.splitLineRight,
            {
              transform: open ? [{ translateX: -1 }, { rotate: '45deg' }] : [],
            },
          ]}
        />
      </Animated.View>
    </View>
  );
}

const splitStyles = StyleSheet.create({
  lineRow: {
    flexDirection: 'row',
    position: 'absolute',
    width: BUTTON_SIZE,
  },
  splitLine: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    height: 5,
    position: 'absolute',
    width: 0.6 * BUTTON_SIZE,
  },
  splitLineRight: {
    right: 0,
  },
});

function TwoBarsSimple({ open }: ExampleComponentProps) {
  const lineStyle = [sharedStyles.line, SHARED_CONFIG];

  return (
    <View>
      <Animated.View
        style={[
          lineStyle,
          {
            transform: open
              ? [{ rotate: '45deg' }]
              : [{ translateY: -BUTTON_SIZE / 4 }],
          },
        ]}
      />
      <Animated.View
        style={[
          lineStyle,
          {
            transform: open
              ? [{ rotate: '-45deg' }]
              : [{ translateY: BUTTON_SIZE / 4 }],
          },
        ]}
      />
    </View>
  );
}

function TwoBarsRotating({ open }: ExampleComponentProps) {
  const lineStyle = [sharedStyles.line, SHARED_CONFIG];

  return (
    <View>
      <Animated.View
        style={[
          lineStyle,
          {
            transform: open
              ? [{ rotate: '135deg' }, { scaleX: 1.25 }]
              : [{ translateY: -BUTTON_SIZE / 4 }],
          },
        ]}
      />
      <Animated.View
        style={[
          lineStyle,
          {
            transform: open
              ? [{ rotate: '-135deg' }, { scaleX: 1.25 }]
              : [{ translateY: BUTTON_SIZE / 4 }],
          },
        ]}
      />
    </View>
  );
}

function SplitAndFlyAway({ open }: ExampleComponentProps) {
  const leftLineStyle = [
    splitAndFlyAwayStyles.splitLine,
    splitAndFlyAwayStyles.splitLineLeft,
  ];
  const rightLineStyle = [
    splitAndFlyAwayStyles.splitLine,
    splitAndFlyAwayStyles.splitLineRight,
  ];

  const splitLine = (
    <Animated.View
      style={[
        splitAndFlyAwayStyles.linesRow,
        SHARED_CONFIG,
        {
          gap: open ? BUTTON_SIZE : 0,
          opacity: open ? 0 : 1,
          transitionDelay: open ? 0 : 300,
        },
      ]}>
      <View style={leftLineStyle} />
      <View style={rightLineStyle} />
    </Animated.View>
  );

  return (
    <View style={splitAndFlyAwayStyles.container}>
      {splitLine}
      <View style={flex.center}>
        <Animated.View
          style={[
            sharedStyles.line,
            SHARED_CONFIG,
            {
              transform: [{ rotate: open ? '45deg' : '0deg' }],
              transitionDelay: open ? 300 : 0,
            },
          ]}
        />
        <Animated.View
          style={[
            sharedStyles.line,
            SHARED_CONFIG,
            {
              transform: [{ rotate: open ? '-45deg' : '0deg' }],
              transitionDelay: open ? 300 : 0,
            },
          ]}
        />
      </View>
      {splitLine}
    </View>
  );
}

const splitAndFlyAwayStyles = StyleSheet.create({
  container: {
    gap: BUTTON_SIZE / 4,
  },
  linesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  splitLine: {
    backgroundColor: colors.primary,
    height: 5,
    width: 0.5 * BUTTON_SIZE,
  },
  splitLineLeft: {
    borderBottomLeftRadius: radius.full,
    borderTopLeftRadius: radius.full,
  },
  splitLineRight: {
    borderBottomRightRadius: radius.full,
    borderTopRightRadius: radius.full,
  },
});

function FlyAway({ open }: ExampleComponentProps) {
  const lineStyle = [flyAwayStyles.line, SHARED_CONFIG];

  return (
    <View style={flyAwayStyles.container}>
      <Animated.View
        style={[
          lineStyle,
          {
            opacity: open ? 0 : 1,
            transform: [{ translateX: open ? -BUTTON_SIZE : 0 }],
          },
        ]}
      />
      <View style={flex.center}>
        <Animated.View
          style={[
            lineStyle,
            {
              position: 'absolute',
              transform: [{ rotate: open ? '45deg' : '0deg' }],
            },
          ]}
        />
        <Animated.View
          style={[
            lineStyle,
            {
              position: 'absolute',
              transform: [{ rotate: open ? '-45deg' : '0deg' }],
            },
          ]}
        />
      </View>
      <Animated.View
        style={[
          lineStyle,
          {
            opacity: open ? 0 : 1,
            transform: [{ translateX: open ? BUTTON_SIZE : 0 }],
          },
        ]}
      />
    </View>
  );
}

const flyAwayStyles = StyleSheet.create({
  container: {
    gap: BUTTON_SIZE / 4,
  },
  line: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    height: 5,
    width: BUTTON_SIZE,
  },
});

function ManyRotations({ open }: ExampleComponentProps) {
  const lineStyle = [sharedStyles.line, SHARED_CONFIG];

  return (
    <Animated.View
      style={[
        SHARED_CONFIG,
        {
          transform: open
            ? [{ translateY: BUTTON_SIZE / 8 }, { rotate: '180deg' }]
            : [],
        },
      ]}>
      <Animated.View
        style={[
          lineStyle,
          {
            transform: open
              ? [{ rotate: '45deg' }]
              : [{ translateY: -BUTTON_SIZE / 4 }],
          },
        ]}
      />
      <Animated.View
        style={[
          sharedStyles.line,
          SHARED_CONFIG,
          {
            opacity: open ? 0 : 1,
          },
        ]}
      />
      <Animated.View
        style={[
          lineStyle,
          {
            transform: open
              ? [{ rotate: '-45deg' }]
              : [{ translateY: BUTTON_SIZE / 4 }],
          },
        ]}
      />
    </Animated.View>
  );
}
