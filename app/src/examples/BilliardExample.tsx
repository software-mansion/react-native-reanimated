import * as React from 'react';

import Animated, {
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Box2d, b2Shape, b2World } from 'react-native-box2d';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { StyleSheet, Text, View } from 'react-native';

function deg2rad(deg: number) {
  'worklet';
  return (deg * Math.PI) / 180;
}

function rad2deg(rad: number) {
  'worklet';
  return (rad / Math.PI) * 180;
}

function mm2px(mm: number) {
  'worklet';
  return mm * 35;
}

function px2mm(px: number) {
  'worklet';
  return px / mm2px(1);
}

const BALL_RADIUS_MM = 0.5;

const HOLE_RADIUS_PX = 25;

const WorldContext = React.createContext<b2World | null>(null);

interface WorldProps extends React.PropsWithChildren {
  gravity: [number, number];
  velocityIterations: number;
  positionIterations: number;
}

function World({
  gravity,
  velocityIterations,
  positionIterations,
  children,
}: WorldProps) {
  // space
  const world = React.useMemo(() => {
    const gravityVec = Box2d.b2Vec2(...gravity);
    return Box2d.b2World(gravityVec);
  }, [gravity]);

  // time
  useFrameCallback(({ timeSincePreviousFrame }) => {
    if (timeSincePreviousFrame !== null) {
      world.Step(
        timeSincePreviousFrame / 1000,
        velocityIterations,
        positionIterations
      );
    }
  });

  return (
    <WorldContext.Provider value={world}>{children}</WorldContext.Provider>
  );
}

function useWorld(): b2World {
  const world = React.useContext(WorldContext);
  if (world === null) {
    throw new Error(
      'No context provided: useWorld() can only be used in a descendant of <World>'
    );
  }
  return world;
}

enum BodyType {
  STATIC = 0,
  KINEMATIC = 1,
  DYNAMIC = 2,
}

interface BodyProps {
  shape: b2Shape;
  type: BodyType;
  density: number;
  restitution: number;
  friction: number;
  linearDamping: number;
  x: number;
  y: number;
  angle: number;
}

function useBody({
  shape,
  type,
  density,
  restitution,
  friction,
  linearDamping,
  x,
  y,
  angle,
}: BodyProps) {
  const world = useWorld();

  const position = useSharedValue({ x, y, angle });

  const body = React.useMemo(() => {
    const bodyDef = Box2d.b2BodyDef();
    bodyDef.type = type;
    bodyDef.position = Box2d.b2Vec2(x, y);
    bodyDef.angle = deg2rad(angle);

    const fixtureDef = Box2d.b2FixtureDef();
    fixtureDef.shape = shape;
    fixtureDef.density = density;
    fixtureDef.restitution = restitution;
    fixtureDef.friction = friction;

    const body = world.CreateBody(bodyDef);
    body.CreateFixture(fixtureDef);
    body.SetLinearDamping(linearDamping);

    return body;
  }, [
    world,
    shape,
    type,
    density,
    restitution,
    friction,
    linearDamping,
    x,
    y,
    angle,
  ]);

  React.useEffect(() => {
    return () => {
      world.DestroyBody(body);
    };
  }, [world, body]);

  useFrameCallback(() => {
    const { x, y } = body.GetPosition();
    const angle = rad2deg(body.GetAngle());
    position.value = { x, y, angle };
  });

  return { body, position };
}

function useBoxShape(width: number, height: number) {
  return React.useMemo(() => {
    const shape = Box2d.b2PolygonShape();
    shape.SetAsBox(width / 2, height / 2);
    return shape;
  }, [width, height]);
}

interface WallProps {
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  shadow?: boolean;
}

function Wall({ x, y, width, height, angle, shadow }: WallProps) {
  const shape = useBoxShape(width, height);

  useBody({
    shape,
    type: BodyType.STATIC,
    density: 1,
    restitution: 0,
    friction: 0,
    linearDamping: 0,
    x,
    y,
    angle,
  });

  const style = {
    width: mm2px(width),
    height: mm2px(height),
    transform: [
      { translateX: mm2px(x - width / 2) },
      { translateY: mm2px(y - height / 2) },
      { rotate: `${angle}deg` },
    ],
  };

  return (
    <>
      {shadow && <View style={[styles.wallShadow, style]} />}
      <View style={[styles.wall, style]} />
    </>
  );
}

type BallNumber =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15;

interface BallProps {
  x: number;
  y: number;
  number: BallNumber;
}

function getBallColor(number: BallNumber) {
  switch (number) {
    case 0:
      return 'white';
    case 1:
    case 9:
      return 'gold';
    case 2:
    case 10:
      return 'blue';
    case 3:
    case 11:
      return 'red';
    case 4:
    case 12:
      return 'purple';
    case 5:
    case 13:
      return 'darkorange';
    case 6:
    case 14:
      return 'green';
    case 7:
    case 15:
      return 'maroon';
    case 8:
      return 'black';
    default:
      throw new Error('Invalid number');
  }
}

function useCircleShape(radius: number) {
  return React.useMemo(() => {
    const shape = Box2d.b2CircleShape();
    shape.SetRadius(radius);
    return shape;
  }, [radius]);
}

function Ball({ x, y, number }: BallProps) {
  const shape = useCircleShape(BALL_RADIUS_MM);

  const { body, position } = useBody({
    shape,
    type: BodyType.DYNAMIC,
    density: 1,
    restitution: 0.9,
    friction: 0,
    linearDamping: 1.7,
    x: x + Math.random() * 0.03, // introduce randomness
    y: y + Math.random() * 0.03, // introduce randomness
    angle: 0,
  });

  const animatedStyle = useAnimatedStyle(() => {
    const { x, y } = position.value;
    const visible = x > 1 && x < 9.5 && y > 1 && y < 21.5;
    return {
      transform: [
        { translateX: mm2px(x - BALL_RADIUS_MM) },
        { translateY: mm2px(y - BALL_RADIUS_MM) },
      ],
      opacity: withTiming(visible ? 1 : 0),
    };
  }, [position]);

  const translation = useSharedValue({ x: 0, y: 0 });

  const gesture = React.useMemo(() => {
    if (number === 0) {
      // white ball
      return Gesture.Pan()
        .minDistance(0)
        .onChange((e) => {
          translation.value = {
            x: e.translationX,
            y: e.translationY,
          };
        })
        .onFinalize((e) => {
          const vec = Box2d.b2Vec2(
            px2mm(e.translationX) * -15,
            px2mm(e.translationY) * -15
          );
          body.ApplyLinearImpulseToCenter(vec, true);
          translation.value = { x: 0, y: 0 };
        });
    } else {
      return Gesture.Tap(); // dummy
    }
  }, [body, number, translation]);

  const rectangleColor = getBallColor(number);

  const outerColor = number > 8 ? 'white' : rectangleColor;

  const isUnderlined = number === 6 || number === 9;

  const arrow = useAnimatedStyle(() => {
    if (number !== 0) {
      return {};
    }
    const length = Math.sqrt(
      translation.value.x ** 2 + translation.value.y ** 2
    );
    const angle = Math.atan2(translation.value.y, translation.value.x);
    return {
      width: length,
      top: mm2px(position.value.y),
      left: mm2px(position.value.x),
      transform: [
        { translateX: -translation.value.x },
        { translateY: -translation.value.y },
        { translateX: -length / 2 },
        { rotate: `${angle}rad` },
        { translateX: length / 2 },
      ],
    };
  });

  return (
    <>
      {number === 0 && <Animated.View style={[styles.arrow, arrow]} />}
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[
            styles.ball,
            {
              width: mm2px(2 * BALL_RADIUS_MM),
              height: mm2px(2 * BALL_RADIUS_MM),
            },
            animatedStyle,
          ]}>
          <View style={styles.ballShadow} />
          <View style={[styles.ballOuter, { backgroundColor: outerColor }]}>
            <View
              style={[
                styles.ballRectangle,
                { backgroundColor: rectangleColor },
              ]}>
              <View style={styles.ballCircle}>
                <Text
                  style={[
                    styles.ballText,
                    isUnderlined && styles.ballTextUnderline,
                  ]}>
                  {number || ''}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
    </>
  );
}

function Balls() {
  const x0 = 5.5;
  const y0 = 8;
  const d = 2 * BALL_RADIUS_MM;
  const sqrt3over2 = Math.sqrt(3) / 2;

  return (
    <>
      <Ball number={0} x={x0} y={x0 + 12} />
      <Ball number={3} x={x0 - 2 * d} y={y0 - 4 * d * sqrt3over2} />
      <Ball number={12} x={x0 - d} y={y0 - 4 * d * sqrt3over2} />
      <Ball number={6} x={x0} y={y0 - 4 * d * sqrt3over2} />
      <Ball number={15} x={x0 + d} y={y0 - 4 * d * sqrt3over2} />
      <Ball number={2} x={x0 + 2 * d} y={y0 - 4 * d * sqrt3over2} />
      <Ball number={9} x={x0 - 1.5 * d} y={y0 - 3 * d * sqrt3over2} />
      <Ball number={14} x={x0 - 0.5 * d} y={y0 - 3 * d * sqrt3over2} />
      <Ball number={4} x={x0 + 0.5 * d} y={y0 - 3 * d * sqrt3over2} />
      <Ball number={13} x={x0 + 1.5 * d} y={y0 - 3 * d * sqrt3over2} />
      <Ball number={5} x={x0 - d} y={y0 - 2 * d * sqrt3over2} />
      <Ball number={8} x={x0} y={y0 - 2 * d * sqrt3over2} />
      <Ball number={7} x={x0 + d} y={y0 - 2 * d * sqrt3over2} />
      <Ball number={10} x={x0 - 0.5 * d} y={y0 - sqrt3over2 * d} />
      <Ball number={11} x={x0 + 0.5 * d} y={y0 - sqrt3over2 * d} />
      <Ball number={1} x={x0} y={y0} />
    </>
  );
}

function Walls() {
  const SQRT_2 = Math.sqrt(2);

  return (
    <>
      <Wall x={5.5} y={0} width={7} height={2} angle={0} shadow />
      <Wall x={5.5} y={22.75} width={7} height={2} angle={0} shadow />
      <Wall x={0} y={6.25} width={2} height={8.5} angle={0} shadow />
      <Wall x={0} y={16.25} width={2} height={8.5} angle={0} shadow />
      <Wall x={11} y={6.25} width={2} height={8.5} angle={0} shadow />
      <Wall x={11} y={16.25} width={2} height={8.5} angle={0} shadow />
      <Wall x={2} y={-1} width={2 * SQRT_2} height={2 * SQRT_2} angle={45} />
      <Wall x={-1} y={2} width={2 * SQRT_2} height={2 * SQRT_2} angle={45} />
      <Wall x={9} y={-1} width={2 * SQRT_2} height={2 * SQRT_2} angle={45} />
      <Wall x={12} y={2} width={2 * SQRT_2} height={2 * SQRT_2} angle={45} />
      <Wall x={-1} y={20.5} width={2 * SQRT_2} height={2 * SQRT_2} angle={45} />
      <Wall x={2} y={23.75} width={2 * SQRT_2} height={2 * SQRT_2} angle={45} />
      <Wall x={9} y={23.75} width={2 * SQRT_2} height={2 * SQRT_2} angle={45} />
      <Wall x={12} y={20.5} width={2 * SQRT_2} height={2 * SQRT_2} angle={45} />
    </>
  );
}

interface HoleProps {
  x: number;
  y: number;
}

function Hole({ x, y }: HoleProps) {
  return (
    <View
      style={[
        styles.hole,
        { left: mm2px(x) - HOLE_RADIUS_PX, top: mm2px(y) - HOLE_RADIUS_PX },
      ]}
    />
  );
}

function Holes() {
  return (
    <>
      <Hole x={1} y={1} />
      <Hole x={10} y={1} />
      <Hole x={0.5} y={11.25} />
      <Hole x={10.5} y={11.25} />
      <Hole x={1} y={21.625} />
      <Hole x={10} y={21.625} />
    </>
  );
}

function Frame() {
  return <View pointerEvents="none" style={styles.frame} />;
}

export default function BilliardExample() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.content}>
        <World gravity={[0, 0]} velocityIterations={6} positionIterations={2}>
          <Holes />
          <Walls />
          <Balls />
          <Frame />
        </World>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(100,50,0)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40, // header
  },
  content: {
    width: mm2px(11),
    height: mm2px(22.75),
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'rgb(90,200,100)',
  },
  wall: {
    position: 'absolute',
    backgroundColor: 'green',
  },
  wallShadow: {
    position: 'absolute',
    backgroundColor: 'black',
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
  },
  frame: {
    position: 'absolute',
    left: mm2px(-1),
    top: mm2px(-1),
    width: mm2px(13),
    height: mm2px(24.75),
    borderRadius: 85,
    borderWidth: 50,
    borderColor: 'rgb(100,50,0)',
  },
  arrow: {
    height: 1,
    backgroundColor: 'red',
    position: 'absolute',
  },
  ball: {
    position: 'absolute',
  },
  ballShadow: {
    backgroundColor: 'black',
    position: 'absolute',
    shadowColor: 'black',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    width: mm2px(2 * BALL_RADIUS_MM),
    height: mm2px(2 * BALL_RADIUS_MM),
    borderRadius: mm2px(BALL_RADIUS_MM),
  },
  ballOuter: {
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 9999,
    borderRadius: mm2px(BALL_RADIUS_MM),
  },
  ballRectangle: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ballCircle: {
    backgroundColor: 'white',
    width: 18,
    height: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ballText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  ballTextUnderline: {
    textDecorationLine: 'underline',
  },
  hole: {
    width: HOLE_RADIUS_PX * 2,
    height: HOLE_RADIUS_PX * 2,
    borderRadius: HOLE_RADIUS_PX,
    backgroundColor: 'black',
    position: 'absolute',
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
  },
});
