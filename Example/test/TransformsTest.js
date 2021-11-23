import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { SafeAreaView, View, StyleSheet, Button } from 'react-native';
import React from 'react';

export default function Test() {
  const translate = useSharedValue(0);
  const rotate = useSharedValue(0);

  const matrix = useSharedValue(createIdentityMatrix());

  const plainTransforms = useAnimatedStyle(() => {
    return {
      transform: [
        { rotateZ: `${rotate.value}rad` },
        { translateX: translate.value },
      ],
    };
  });

  const matrixTransforms = useAnimatedStyle(() => {
    return {
      transform: [{ matrix: matrix.value }],
    };
  });

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View>
        <Button
          onPress={() => (translate.value = withTiming(translate.value + 30))}
          title="Translation transform"
        />
        <Button
          onPress={() =>
            (rotate.value = withTiming(rotate.value + Math.PI / 6))
          }
          title="Rotation transform"
        />
        <Animated.View style={[styles.box, plainTransforms]} />
        <Button
          onPress={() =>
            (matrix.value = withTiming(translate3d(matrix.value, 30, 0, 0)))
          }
          title="Translate matrix"
        />
        <Button
          onPress={() =>
            (matrix.value = withTiming(
              rotateZ(matrix.value, Math.PI / 6, 50, 50, 0)
            ))
          }
          title="Rotate matrix"
        />
        <Button
          onPress={() =>
            (matrix.value = withTiming(scale3d(matrix.value, 1.2, 1.2, 1)))
          }
          title="Scale matrix"
        />
        <Animated.View style={[styles.box, matrixTransforms]} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: 'blue',
  },
});

function createIdentityMatrix() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

function multiplyInto(out, a, b) {
  /* eslint-disable one-var */
  const a00 = a[0],
    a01 = a[1],
    a02 = a[2],
    a03 = a[3],
    a10 = a[4],
    a11 = a[5],
    a12 = a[6],
    a13 = a[7],
    a20 = a[8],
    a21 = a[9],
    a22 = a[10],
    a23 = a[11],
    a30 = a[12],
    a31 = a[13],
    a32 = a[14],
    a33 = a[15];

  let b0 = b[0],
    b1 = b[1],
    b2 = b[2],
    b3 = b[3];
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

function translate3d(matrix, x, y, z) {
  const change = createIdentityMatrix();
  change[12] = x;
  change[13] = y;
  change[14] = z;
  const result = createIdentityMatrix();
  multiplyInto(result, change, matrix);
  return result;
}

function rotateZ(matrix, radians, x, y, z) {
  const change = createIdentityMatrix();
  change[0] = Math.cos(radians);
  change[1] = Math.sin(radians);
  change[4] = -Math.sin(radians);
  change[5] = Math.cos(radians);

  const combined = createIdentityMatrix();
  translate3d(combined, -x, -y, -z);
  multiplyInto(combined, change, combined);
  translate3d(combined, x, y, z);
  const result = createIdentityMatrix();
  multiplyInto(result, change, matrix);
  return result;
}

function scale3d(matrix, xScale, yScale, zScale, x, y, z) {
  const change = createIdentityMatrix();
  change[0] = xScale;
  change[5] = yScale;
  change[10] = zScale;

  const combined = createIdentityMatrix();
  translate3d(combined, -x, -y, -z);
  multiplyInto(combined, change, combined);
  translate3d(combined, x, y, z);
  const result = createIdentityMatrix();
  multiplyInto(result, change, matrix);
  return result;
}
