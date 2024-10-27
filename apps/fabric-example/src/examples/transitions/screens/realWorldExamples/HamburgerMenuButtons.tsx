import { colors, flex, radius, spacing } from '../../../../theme';
import {
  Button,
  Grid,
  ScrollScreen,
  Stagger,
  Text,
} from '../../../../components';
import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { CSSTransitionConfig } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

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
          title={`${autoAnimate ? 'Stop' : 'Start'} Auto Animate`}
          onPress={() => setAutoAnimate(!autoAnimate)}
        />
      </View>
      <Grid
        columns={3}
        staggerInterval={100}
        columnGap={spacing.sm}
        rowGap={spacing.md}>
        <Example title="Simple" Component={Simple} autoOpen={autoOpen} />
        <Example title="Left Arrow" Component={LeftArrow} autoOpen={autoOpen} />
        <Example
          title="Right Arrow"
          Component={RightArrow}
          autoOpen={autoOpen}
        />
        <Example title="To Plus" Component={ToPlus} autoOpen={autoOpen} />
        <Example title="To Minus" Component={ToMinus} autoOpen={autoOpen} />
        <Example title="In Circle" Component={InCircle} autoOpen={autoOpen} />
        <Example title="Skew" Component={Skew} autoOpen={autoOpen} />
        <Example title="Rotate" Component={Rotate} autoOpen={autoOpen} />
        <Example
          title="To Plus and Rotate"
          Component={ToPlusAndRotate}
          autoOpen={autoOpen}
        />
        <Example title="Split" Component={Split} autoOpen={autoOpen} />
        <Example
          title="Two Bars Simple"
          Component={TwoBarsSimple}
          autoOpen={autoOpen}
        />
        <Example
          title="Two Bars Rotating"
          Component={TwoBarsRotating}
          autoOpen={autoOpen}
        />
        <Example
          title="Split and Fly Away"
          Component={SplitAndFlyAway}
          autoOpen={autoOpen}
        />
        <Example title="Fly Away" Component={FlyAway} autoOpen={autoOpen} />
        <Example
          title="Many Rotations"
          Component={ManyRotations}
          autoOpen={autoOpen}
        />
      </Grid>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  buttons: {
    marginBottom: spacing.xs,
    alignItems: 'flex-end',
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

function Example({ title, autoOpen, Component }: ExampleProps) {
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
  container: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    justifyContent: 'center',
  },
  line: {
    width: BUTTON_SIZE,
    position: 'absolute',
    height: 5,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  cell: {
    backgroundColor: colors.background1,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    gap: spacing.sm,
    width: '100%',
    flex: 1,
  },
});

const SHARED_CONFIG: CSSTransitionConfig = {
  transitionProperty: 'all',
  transitionDuration: 300,
  transitionTimingFunction: 'easeOut',
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
            transform: [
              { translateY: -BUTTON_SIZE / 4 },
              { translateX: open ? -BUTTON_SIZE : 0 },
            ],
            opacity: open ? 0 : 1,
          },
        ]}
      />
      <View style={sharedStyles.line} />
      <Animated.View
        style={[
          lineStyle,
          {
            transform: [
              { translateY: BUTTON_SIZE / 4 },
              { translateX: open ? BUTTON_SIZE : 0 },
            ],
            opacity: open ? 0 : 1,
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
            transform: [{ translateY: open ? 0 : -BUTTON_SIZE / 4 }],
            width: open ? 0.6 * BUTTON_SIZE : BUTTON_SIZE,
            height: open ? 4 : 5,
          },
        ]}
      />
      <Animated.View
        style={[
          lineStyle,
          {
            opacity: open ? 0 : 1,
            width: open ? 0.6 * BUTTON_SIZE : BUTTON_SIZE,
            height: open ? 4 : 5,
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
            width: open ? 0.6 * BUTTON_SIZE : BUTTON_SIZE,
            height: open ? 4 : 5,
          },
        ]}
      />
    </Animated.View>
  );
}

const inCircleStyles = StyleSheet.create({
  container: {
    ...flex.center,
    borderWidth: 4,
    width: '100%',
    height: '100%',
    borderRadius: radius.full,
  },
});

function Skew({ open }: ExampleComponentProps) {
  const lineStyle = [sharedStyles.line, SHARED_CONFIG];

  return (
    <Animated.View
      style={{
        transitionProperty: 'transform',
        transitionDuration: 300,
        transform: [{ rotate: open ? '35deg' : '0deg' }],
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
        transitionProperty: 'transform',
        transitionDuration: 300,
        transform: [{ rotate: open ? '90deg' : '0deg' }],
        alignItems: 'center',
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
        transitionProperty: 'transform',
        transitionDuration: 200,
        transitionDelay: open ? 300 : 0,
        transform: [{ rotate: open ? '45deg' : '0deg' }],
        alignItems: 'center',
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
    position: 'absolute',
    width: 0.6 * BUTTON_SIZE,
    height: 5,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
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
          transitionDelay: open ? 0 : 300,
          gap: open ? BUTTON_SIZE : 0,
          opacity: open ? 0 : 1,
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
              transitionDelay: open ? 300 : 0,
              transform: [{ rotate: open ? '45deg' : '0deg' }],
            },
          ]}
        />
        <Animated.View
          style={[
            sharedStyles.line,
            SHARED_CONFIG,
            {
              transitionDelay: open ? 300 : 0,
              transform: [{ rotate: open ? '-45deg' : '0deg' }],
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
    width: 0.5 * BUTTON_SIZE,
    height: 5,
    backgroundColor: colors.primary,
  },
  splitLineLeft: {
    borderTopLeftRadius: radius.full,
    borderBottomLeftRadius: radius.full,
  },
  splitLineRight: {
    borderTopRightRadius: radius.full,
    borderBottomRightRadius: radius.full,
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
    width: BUTTON_SIZE,
    height: 5,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
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
