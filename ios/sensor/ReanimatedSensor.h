#import <CoreMotion/CoreMotion.h>
#import "ReanimatedSensorType.h"

@interface ReanimatedSensor : NSObject {
  ReanimatedSensorType _sensorType;
  double _interval;
  double _lastTimestamp;
  CMMotionManager *_motionManager;
  void (^_setter)(double[]);
}

- (instancetype)init:(ReanimatedSensorType)sensorType interval:(int)interval setter:(void (^)(double[]))setter;
- (bool)initialize;
- (bool)initializeGyroscope;
- (bool)initializeAccelerometer;
- (bool)initializeGravity;
- (bool)initializeMagnetometer;
- (bool)initializeOrientation;
- (void)cancel;

@end
