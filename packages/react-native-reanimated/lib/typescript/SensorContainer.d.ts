import type { ShareableRef } from 'react-native-worklets';
import type { SensorConfig, SensorType, SharedValue, Value3D, ValueRotation } from './commonTypes';
export declare class SensorContainer {
    private nativeSensors;
    getSensorId(sensorType: SensorType, config: SensorConfig): number;
    initializeSensor(sensorType: SensorType, config: SensorConfig): SharedValue<Value3D | ValueRotation>;
    registerSensor(sensorType: SensorType, config: SensorConfig, handler: ShareableRef<(data: Value3D | ValueRotation) => void>): number;
    unregisterSensor(sensorId: number): void;
}
//# sourceMappingURL=SensorContainer.d.ts.map