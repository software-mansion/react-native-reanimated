#import <Foundation/Foundation.h>
#import <reanimated/apple/sensor/ReanimatedHingeProbe.h>
#import <reanimated/apple/sensor/ReanimatedSensor.h>
#import <reanimated/apple/sensor/ReanimatedSensorContainer.h>

static NSNumber *_nextSensorId = nil;

@implementation ReanimatedSensorContainer

- (instancetype)init
{
  self = [super init];
  _sensors = [[NSMutableDictionary alloc] init];
  _nextSensorId = @0;
  [NSNotificationCenter.defaultCenter addObserver:self
                                         selector:@selector(hingeProbeDidFindHinge)
                                             name:ReanimatedHingeProbeDidFindHingeNotification
                                           object:nil];
  return self;
}

- (bool)isSensorAvailable:(ReanimatedSensorType)sensorType
{
  return [ReanimatedSensor isAvailable:sensorType];
}

- (int)registerSensor:(ReanimatedSensorType)sensorType
             interval:(int)interval
    iosReferenceFrame:(int)iosReferenceFrame
               setter:(void (^)(double[], int))setter
{
  ReanimatedSensor *sensor = [[ReanimatedSensor alloc] init:sensorType
                                                   interval:interval
                                          iosReferenceFrame:iosReferenceFrame
                                                     setter:setter];
  if ([sensor initialize]) {
    NSNumber *sensorId = [_nextSensorId copy];
    _nextSensorId = [NSNumber numberWithInt:[_nextSensorId intValue] + 1];
    [_sensors setObject:sensor forKey:sensorId];
    return [sensorId intValue];
  } else {
    return -1;
  }
}

- (void)unregisterSensor:(int)sensorId
{
  NSNumber *_sensorId = [NSNumber numberWithInt:sensorId];
  if (_sensors[_sensorId] == nil) {
    return;
  }
  [_sensors[_sensorId] cancel];
  [_sensors removeObjectForKey:_sensorId];
}

- (void)observeSensorAvailability:(ReanimatedSensorAvailabilityListener)listener
{
  self.availabilityListener = listener;
}

- (void)hingeProbeDidFindHinge
{
  ReanimatedSensorAvailabilityListener listener = self.availabilityListener;
  if (listener != nil) {
    listener(HINGE, true);
  }
}

@end
