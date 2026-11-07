#import <Foundation/Foundation.h>

#import <reanimated/apple/sensor/ReanimatedSensorType.h>

@interface ReanimatedSensor : NSObject

- (instancetype)init:(ReanimatedSensorType)sensorType
             interval:(int)interval
    iosReferenceFrame:(int)iosReferenceFrame
               setter:(void (^)(double[], int))setter;

@end

// Delivers readings to sensors through a single CMMotionManager, as Apple warns that multiple
// instances can affect the rate of the data. Sensors in different reference frames are the only
// exception, because a CMMotionManager provides device motion in one frame at a time.
@interface ReanimatedSensorHub : NSObject

- (bool)isAvailable:(ReanimatedSensorType)sensorType;
- (bool)addSensor:(ReanimatedSensor *)sensor;
- (void)removeSensor:(ReanimatedSensor *)sensor;

@end
