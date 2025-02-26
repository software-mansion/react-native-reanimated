'use strict';
export declare class WebSensor {
  start: () => void;
  stop: () => void;
  addEventListener: (eventType: string, eventHandler: () => void) => void;
  quaternion: [number, number, number, number];
  x: number;
  y: number;
  z: number;
}

type configOptions =
  | {
      referenceFrame: string;
      frequency?: undefined;
    }
  | {
      frequency: number;
      referenceFrame?: undefined;
    };

interface Constructable<T> {
  new (config: configOptions): T;
}

declare global {
  interface Window {
    Accelerometer: Constructable<WebSensor>;
    GravitySensor: Constructable<WebSensor>;
    Gyroscope: Constructable<WebSensor>;
    Magnetometer: Constructable<WebSensor>;
    AbsoluteOrientationSensor: Constructable<WebSensor>;
    Sensor: Constructable<WebSensor>;
    opera?: string;
  }
}
