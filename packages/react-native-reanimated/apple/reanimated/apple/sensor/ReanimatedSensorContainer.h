#import <reanimated/apple/sensor/ReanimatedSensorType.h>

typedef void (^ReanimatedSensorAvailabilityListener)(ReanimatedSensorType sensorType, bool isAvailable);

@interface ReanimatedSensorContainer : NSObject {
  NSNumber *_nextSensorId;
  NSMutableDictionary *_sensors;
  ReanimatedSensorAvailabilityListener _availabilityListener;
}

- (instancetype)init;
- (bool)isSensorAvailable:(ReanimatedSensorType)sensorType;
- (int)registerSensor:(ReanimatedSensorType)sensorType
             interval:(int)interval
    iosReferenceFrame:(int)iosReferenceFrame
               setter:(void (^)(double[], int))setter;
- (void)unregisterSensor:(int)sensorId;
/// The listener runs on the main thread.
- (void)observeSensorAvailability:(ReanimatedSensorAvailabilityListener)listener;

@end
