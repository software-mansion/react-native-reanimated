import type { AnimatedSensor, SensorConfig, Value3D, ValueRotation } from '../commonTypes';
import { SensorType } from '../commonTypes';
/**
 * Lets you create animations based on data from the device's sensors.
 *
 * @param sensorType - Type of the sensor to use. Configured with
 *   {@link SensorType} enum.
 * @param config - The sensor configuration - {@link SensorConfig}.
 * @returns An object containing the sensor measurements [shared
 *   value](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#shared-value)
 *   and a function to unregister the sensor
 * @see https://docs.swmansion.com/react-native-reanimated/docs/device/useAnimatedSensor
 */
export declare function useAnimatedSensor(sensorType: SensorType.ROTATION, userConfig?: Partial<SensorConfig>): AnimatedSensor<ValueRotation>;
export declare function useAnimatedSensor(sensorType: Exclude<SensorType, SensorType.ROTATION>, userConfig?: Partial<SensorConfig>): AnimatedSensor<Value3D>;
//# sourceMappingURL=useAnimatedSensor.d.ts.map