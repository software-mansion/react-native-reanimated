import type { SerializableRef } from 'react-native-worklets';
import type { SensorConfig, SharedValue, Value3D, ValueRotation } from './commonTypes';
import { SensorType } from './commonTypes';
export default class Sensor {
    listenersNumber: number;
    private sensorId;
    private sensorType;
    private data;
    private config;
    constructor(sensorType: SensorType, config: SensorConfig);
    register(eventHandler: SerializableRef<(data: Value3D | ValueRotation) => void>): boolean;
    isRunning(): boolean;
    isAvailable(): boolean;
    getSharedValue(): SharedValue<Value3D | ValueRotation>;
    unregister(): void;
}
//# sourceMappingURL=Sensor.d.ts.map