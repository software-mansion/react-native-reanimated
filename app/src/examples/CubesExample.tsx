import React from 'react';
import Animated, {
  useAnimatedStyle,
  useAnimatedSensor,
  SensorType,
  IOSReferenceFrame,
} from 'react-native-reanimated';
import { View, Button, StyleSheet, Text } from 'react-native';

// euler angles are in order ZXY, z = yaw, x = pitch, y = roll
// https://en.wikipedia.org/wiki/Euler_angles#Rotation_matrix (ZXY Tait–Bryan angles)
function eulerToMatrix(pitch: number, roll: number, yaw: number) {
  'worklet';
  const s1 = Math.sin(yaw);
  const c1 = Math.cos(yaw);
  const s2 = Math.sin(pitch);
  const c2 = Math.cos(pitch);
  const s3 = Math.sin(roll);
  const c3 = Math.cos(roll);

  return [
    c1 * c3 - s1 * s2 * s3,
    c3 * s1 + c1 * s2 * s3,
    -c2 * s3,
    0,

    -c2 * s1,
    c1 * c2,
    s2,
    0,

    c1 * s3 + c3 * s1 * s2,
    s1 * s3 - c1 * c3 * s2,
    c2 * c3,
    0,

    0,
    0,
    0,
    1,
  ];
}

function createIdentityMatrix() {
  'worklet';
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

function reuseTranslate3dCommand(
  matrixCommand: number[],
  x: number,
  y: number,
  z: number
) {
  'worklet';
  matrixCommand[12] = x;
  matrixCommand[13] = y;
  matrixCommand[14] = z;
}

function multiplyInto(out: number[], a: number[], b: number[]) {
  'worklet';
  const [
    a00,
    a01,
    a02,
    a03,
    a10,
    a11,
    a12,
    a13,
    a20,
    a21,
    a22,
    a23,
    a30,
    a31,
    a32,
    a33,
  ] = a;

  let [b0, b1, b2, b3] = b;
  out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  b0 = b[4];
  b1 = b[5];
  b2 = b[6];
  b3 = b[7];
  out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  b0 = b[8];
  b1 = b[9];
  b2 = b[10];
  b3 = b[11];
  out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  b0 = b[12];
  b1 = b[13];
  b2 = b[14];
  b3 = b[15];
  out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
}

function transformOrigin(
  matrix: number[],
  origin: { x: number; y: number; z: number }
) {
  'worklet';
  const { x, y, z } = origin;

  const translate = createIdentityMatrix();
  reuseTranslate3dCommand(translate, x, y, z);
  multiplyInto(matrix, translate, matrix);

  const untranslate = createIdentityMatrix();
  reuseTranslate3dCommand(untranslate, -x, -y, -z);
  multiplyInto(matrix, matrix, untranslate);
}

// http://www.songho.ca/opengl/gl_quaternion.html
function quaternionToMatrix(q: number[]) {
  'worklet';
  const [x, y, z, s] = q;
  return [
    1 - 2 * y * y - 2 * z * z,
    2 * x * y - 2 * s * z,
    2 * x * z + 2 * s * y,
    0,
    2 * x * y + 2 * s * z,
    1 - 2 * x * x - 2 * z * z,
    2 * y * z - 2 * s * x,
    0,
    2 * x * z - 2 * s * y,
    2 * y * z + 2 * s * x,
    1 - 2 * x * x - 2 * y * y,
    0,
    0,
    0,
    0,
    1,
  ];
}

// euler angles are in order ZXY, z = yaw, x = pitch, y = roll
// https://github.com/mrdoob/three.js/blob/dev/src/math/Quaternion.js#L237
function eulerToQuaternion(pitch: number, roll: number, yaw: number) {
  'worklet';
  const c1 = Math.cos(pitch / 2);
  const s1 = Math.sin(pitch / 2);
  const c2 = Math.cos(roll / 2);
  const s2 = Math.sin(roll / 2);
  const c3 = Math.cos(yaw / 2);
  const s3 = Math.sin(yaw / 2);

  return [
    s1 * c2 * c3 - c1 * s2 * s3,
    c1 * s2 * c3 + s1 * c2 * s3,
    c1 * c2 * s3 + s1 * s2 * c3,
    c1 * c2 * c3 - s1 * s2 * s3,
  ];
}

function multiplyQuaternions(a: number[], b: number[]) {
  'worklet';
  return [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ];
}

const sidesRotations = [
  [0, 0, 0],
  [Math.PI / 2, 0, 0],
  [-Math.PI / 2, 0, 0],
  [0, Math.PI / 2, 0],
  [0, -Math.PI / 2, 0],
  [Math.PI, 0, 0],
];

const sidesColors = [
  '#8B9576',
  '#0D519A',
  '#AF351B',
  '#555E6B',
  '#7F09E1',
  '#9DB89A',
];

function CubeWithEulerAngles() {
  const animatedSensor = useAnimatedSensor(SensorType.ROTATION, {
    iosReferenceFrame: IOSReferenceFrame.XArbitraryZVertical,
    adjustToInterfaceOrientation: true,
  });

  const sidesStyles = sidesRotations.map((rotation, i) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAnimatedStyle(() => {
      const pitch = animatedSensor.sensor.value.pitch;
      const roll = animatedSensor.sensor.value.roll;
      const yaw = animatedSensor.sensor.value.yaw;

      const sideLength = 100;
      const origin = { x: 0, y: 0, z: -sideLength / 2 };

      const it = eulerToMatrix(rotation[0], rotation[1], rotation[2]);
      const matrix = eulerToMatrix(pitch, -roll, yaw);
      multiplyInto(matrix, matrix, it);
      transformOrigin(matrix, origin);

      return {
        transform: [{ perspective: 1000 }, { matrix: matrix }],
        backgroundColor: sidesColors[i],
      };
    })
  );

  return (
    <View style={componentStyle.boxContainer}>
      {sidesStyles.map((style, i) => (
        <Animated.View style={[componentStyle.box, style]} key={i}>
          <Text>EULER</Text>
        </Animated.View>
      ))}
    </View>
  );
}

function CubeWithQuaternions() {
  const animatedSensor = useAnimatedSensor(SensorType.ROTATION, {
    adjustToInterfaceOrientation: true,
  });

  const sidesStyles = sidesRotations.map((rotation, i) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAnimatedStyle(() => {
      const sideLength = 100;
      const origin = { x: 0, y: 0, z: -sideLength / 2 };

      const q0 = eulerToQuaternion(-rotation[0], -rotation[1], rotation[2]);

      const { qx, qy, qz, qw } = animatedSensor.sensor.value;
      const q1 = [-qx, qy, -qz, qw];

      const q = multiplyQuaternions(q0, q1);

      const matrix = quaternionToMatrix(q);
      transformOrigin(matrix, origin);

      return {
        transform: [{ perspective: 1000 }, { matrix: matrix }],
        backgroundColor: sidesColors[i],
      };
    })
  );

  return (
    <View style={componentStyle.boxContainer}>
      {sidesStyles.map((style, i) => (
        <Animated.View style={[componentStyle.box, style]} key={i}>
          <Text>QUATERNIONS</Text>
        </Animated.View>
      ))}
    </View>
  );
}

export default function CubesExample() {
  const animatedSensor = useAnimatedSensor(SensorType.ROTATION, {
    adjustToInterfaceOrientation: true,
  });

  const compassStyle = useAnimatedStyle(() => {
    const yaw = animatedSensor.sensor.value.yaw;

    return {
      transform: [{ rotate: `${yaw}rad` }],
    };
  });

  return (
    <View style={componentStyle.container}>
      <Button
        title={'log data'}
        onPress={() => console.log(animatedSensor.sensor.value)}
      />
      <View style={componentStyle.cubesContainer}>
        <CubeWithQuaternions />
        <CubeWithEulerAngles />
      </View>

      <View style={componentStyle.boxContainer}>
        <Animated.View style={[componentStyle.compass, compassStyle]}>
          <View style={componentStyle.arrow} />
        </Animated.View>
      </View>
    </View>
  );
}

const componentStyle = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  cubesContainer: {
    flexDirection: 'row',
  },
  box: {
    width: 100,
    height: 100,
    position: 'absolute',
    top: 0,
    left: 0,
    backfaceVisibility: 'hidden',
  },
  compass: {
    backgroundColor: 'black',
    width: 20,
    height: 100,
  },
  arrow: {
    backgroundColor: 'red',
    width: 20,
    height: 20,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  boxContainer: {
    width: 150,
    height: 150,
  },
});
