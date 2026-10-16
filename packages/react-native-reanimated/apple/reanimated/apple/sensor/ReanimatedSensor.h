#import <Foundation/Foundation.h>

#if !TARGET_OS_TV && !TARGET_OS_OSX
#import <CoreMotion/CoreMotion.h>
#import <UIKit/UIKit.h>
#endif

#import <reanimated/apple/sensor/ReanimatedSensorType.h>

/// Posted on the main thread when the first hinge reading arrives.
extern NSNotificationName const ReanimatedHingeDidBecomeAvailableNotification;

@interface ReanimatedSensor : NSObject {
  ReanimatedSensorType _sensorType;
  double _interval;
  double _lastTimestamp;
  int _referenceFrame;
#if !TARGET_OS_TV && !TARGET_OS_OSX
  CMMotionManager *_motionManager;
#endif
  void (^_setter)(double[], int);
}

+ (bool)isAvailable:(ReanimatedSensorType)sensorType;
- (instancetype)init:(ReanimatedSensorType)sensorType
             interval:(int)interval
    iosReferenceFrame:(int)iosReferenceFrame
               setter:(void (^)(double[], int))setter;
- (bool)initialize;
- (bool)initializeGyroscope;
- (bool)initializeAccelerometer;
- (bool)initializeGravity;
- (bool)initializeMagnetometer;
- (bool)initializeOrientation;
- (bool)initializeHinge;
- (void)cancel;

@end
