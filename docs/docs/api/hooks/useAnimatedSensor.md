---
id: useAnimatedSensor
title: useAnimatedSensor
sidebar_label: useAnimatedSensor
---

With the `useAnimatedSensor` hook, you can easily create cool interactive animations based on data from sensors in the device such as gyroscope, accelerometer etc.

```js
useAnimatedSensor(sensorType: [SensorType], config?: [UserConfig]) -> [AnimatedSensor]
```

### Arguments

#### `sensorType` - [[SensorType](#sensortype-enum)]
You can select the sensor available in [[SensorType](#sensortype-enum)] enum.

#### `config` - [[UserConfig](#userconfig-object)]
Optionally, you can pass configuration to customize the sensor behavior.

### Returns
Hook `useAnimatedSensor` returns an instance of [[AnimatedSensor](#animatedsensor-object)];

### Types

#### `AnimatedSensor: [object]`
Properties:
* `sensor`: [[SharedValue](../../api/hooks/useSharedValue)] contains [[3DVector](#3dvector-object)] or [[RotationVector](#rotationvector-object)] or `null`  
  contains actual sensor measurements as a shared value
* `unregister: [function]`  
  allows you to stop listening to sensor updates
* `isAvailable: [boolean]`  
  the flag contains information on the availability of sensors in a device
* `config`: [[UserConfig](#userconfig-object)]  
  the configuration provided by a user

#### `SensorType: [enum]`
`SensorType` is an enum that contains possibly supported sensors.
Values:
* `ACCELEROMETER`  
  measurements output as [[3DVector](#3dvector-object)]
* `GYROSCOPE`  
  measurements output as [[3DVector](#3dvector-object)]
* `GRAVITY`  
  measurements output as [[3DVector](#3dvector-object)]
* `MAGNETIC_FIELD`  
  measurements output as [[3DVector](#3dvector-object)]
* `ROTATION`  
  measurements output as [[RotationVector](#rotationvector-object)]

#### `UserConfig: [object]`
Properties:
* `interval: [number]` - interval in milliseconds between shared value updates

#### `3DVector: [object]`
Properties:
* `x: number`
* `y: number`
* `z: number`

#### `RotationVector: [object]`
Properties:
* `qw: number`
* `qx: number`
* `qy: number`
* `qz: number`
* `yaw: number`
* `pitch: number`
* `roll: number`

### Example
```js
function UseAnimatedSensorExample() {
  const animatedSensor = useAnimatedSensor(SensorType.ROTATION, { interval: 10 }); // <- initialization
  const style = useAnimatedStyle(() => {
    const yaw = Math.abs(animatedSensor.sensor.value.yaw);
    const pitch = Math.abs(animatedSensor.sensor.value.pitch);
    return {
      height: withTiming(yaw * 200 + 20, { duration: 100 }), // <- usage
      width: withTiming(pitch * 200 + 20, { duration: 100 }), // <- usage
    };
  });

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Animated.View
        style={[{ backgroundColor: 'black' }, style]}
      />
    </View>
  );
}
```

### Live example

<video src="https://user-images.githubusercontent.com/36106620/158634922-eaad656e-c837-44d5-8d51-8e7fa27c5a16.mp4" controls="controls" muted="muted" width="400"></video>

### Tips

:::caution

On iOS, if you want to read sensor data you need to enable location services on your device (`Settings > Privacy > Location Services`).

:::
