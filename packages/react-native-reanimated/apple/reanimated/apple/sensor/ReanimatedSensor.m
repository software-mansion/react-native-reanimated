#import <reanimated/apple/sensor/ReanimatedSensor.h>

#if !TARGET_OS_TV && !TARGET_OS_OSX && !TARGET_OS_VISION
#import <CoreMotion/CoreMotion.h>
#import <UIKit/UIKit.h>

static const int AUTO_REFERENCE_FRAME = 4;

@interface ReanimatedSensor ()

@property (nonatomic, readonly) ReanimatedSensorType sensorType;
@property (nonatomic, readonly) double interval;
@property (nonatomic, readonly) int referenceFrame;

- (void)handleReading:(CMLogItem *)reading streamInterval:(double)streamInterval;

@end

@implementation ReanimatedSensor {
  double _lastTimestamp;
  void (^_setter)(double[], int);
}

- (instancetype)init:(ReanimatedSensorType)sensorType
             interval:(int)interval
    iosReferenceFrame:(int)iosReferenceFrame
               setter:(void (^)(double[], int))setter
{
  self = [super init];
  _sensorType = sensorType;
  if (interval == -1) {
    _interval = 1.0 / UIScreen.mainScreen.maximumFramesPerSecond;
  } else {
    _interval = interval / 1000.0; // in seconds
  }
  _referenceFrame = iosReferenceFrame;
  _setter = setter;
  return self;
}

- (void)handleReading:(CMLogItem *)reading streamInterval:(double)streamInterval
{
  // This takes the reading closest to the interval, using the time of the readings, as handlers can
  // wait on the main queue. CoreMotion also rounds the update interval, so a sensor as fast as the
  // stream gets a reading that comes early instead of every other one.
  if (reading.timestamp - _lastTimestamp < _interval - streamInterval / 2) {
    return;
  }
  _lastTimestamp = reading.timestamp;

  const double G = 9.81;
  switch (_sensorType) {
    case ACCELEROMETER: {
      CMAcceleration acceleration = ((CMAccelerometerData *)reading).acceleration;
      // convert G to m/s^2
      double data[] = {acceleration.x * G, acceleration.y * G, acceleration.z * G};
      _setter(data, [self getInterfaceOrientation]);
      break;
    }
    case GYROSCOPE: {
      CMRotationRate rotationRate = ((CMGyroData *)reading).rotationRate;
      double data[] = {rotationRate.x, rotationRate.y, rotationRate.z};
      _setter(data, [self getInterfaceOrientation]);
      break;
    }
    case GRAVITY: {
      CMAcceleration gravity = ((CMDeviceMotion *)reading).gravity;
      // convert G to m/s^2
      double data[] = {gravity.x * G, gravity.y * G, gravity.z * G};
      _setter(data, [self getInterfaceOrientation]);
      break;
    }
    case MAGNETIC_FIELD: {
      CMMagneticField magneticField = ((CMMagnetometerData *)reading).magneticField;
      double data[] = {magneticField.x, magneticField.y, magneticField.z};
      _setter(data, [self getInterfaceOrientation]);
      break;
    }
    case ROTATION_VECTOR: {
      CMAttitude *attitude = ((CMDeviceMotion *)reading).attitude;
      double data[] = {
          attitude.quaternion.x,
          attitude.quaternion.y,
          attitude.quaternion.z,
          attitude.quaternion.w,
          attitude.yaw,
          attitude.pitch,
          attitude.roll};
      _setter(data, [self getInterfaceOrientation]);
      break;
    }
  }
}

- (int)getInterfaceOrientation
{
  UIInterfaceOrientation orientation = UIInterfaceOrientationPortrait;
  for (UIScene *scene in UIApplication.sharedApplication.connectedScenes) {
    if ([scene isKindOfClass:[UIWindowScene class]]) {
      orientation = ((UIWindowScene *)scene).interfaceOrientation;
      break;
    }
  }
  switch (orientation) {
    case UIInterfaceOrientationLandscapeLeft:
      return 270;
    case UIInterfaceOrientationLandscapeRight:
      return 90;
    case UIInterfaceOrientationPortraitUpsideDown:
      return 180;
    default:
      return 0;
  }
}

@end

// Updates of one kind from one CMMotionManager. Gravity and rotation are both device motion.
typedef NS_ENUM(NSUInteger, ReanimatedSensorStreamKind) {
  ACCELEROMETER_STREAM,
  GYROSCOPE_STREAM,
  MAGNETOMETER_STREAM,
  DEVICE_MOTION_STREAM,
};

static ReanimatedSensorStreamKind streamKindOf(ReanimatedSensorType sensorType)
{
  switch (sensorType) {
    case ACCELEROMETER:
      return ACCELEROMETER_STREAM;
    case GYROSCOPE:
      return GYROSCOPE_STREAM;
    case MAGNETIC_FIELD:
      return MAGNETOMETER_STREAM;
    case GRAVITY:
    case ROTATION_VECTOR:
      return DEVICE_MOTION_STREAM;
  }
}

@interface ReanimatedSensorStream : NSObject

@property (nonatomic, readonly) ReanimatedSensorStreamKind kind;
@property (nonatomic, readonly) CMMotionManager *manager;
@property (nonatomic, readonly) int referenceFrame;
// Atomic, because the handlers read these on the main queue. They never take the lock of the hub.
@property (atomic, readonly, copy) NSArray<ReanimatedSensor *> *sensors;
@property (atomic, readonly) double interval;

- (instancetype)initWithKind:(ReanimatedSensorStreamKind)kind
                     manager:(CMMotionManager *)manager
              referenceFrame:(int)referenceFrame;
- (void)addSensor:(ReanimatedSensor *)sensor;
- (void)removeSensor:(ReanimatedSensor *)sensor;
- (bool)hasRotationSensor;
- (void)switchToReferenceFrame:(int)referenceFrame;
- (void)stop;

@end

@interface ReanimatedSensorStream ()

@property (atomic, readwrite, copy) NSArray<ReanimatedSensor *> *sensors;
@property (atomic, readwrite) double interval;

@end

@implementation ReanimatedSensorStream

- (instancetype)initWithKind:(ReanimatedSensorStreamKind)kind
                     manager:(CMMotionManager *)manager
              referenceFrame:(int)referenceFrame
{
  self = [super init];
  _kind = kind;
  _manager = manager;
  _referenceFrame = referenceFrame;
  self.sensors = @[];
  return self;
}

- (void)addSensor:(ReanimatedSensor *)sensor
{
  const bool wasRunning = self.sensors.count > 0;
  self.sensors = [self.sensors arrayByAddingObject:sensor];
  [self updateInterval];
  if (!wasRunning) {
    [self start];
  }
}

- (void)removeSensor:(ReanimatedSensor *)sensor
{
  NSMutableArray<ReanimatedSensor *> *sensors = [self.sensors mutableCopy];
  [sensors removeObject:sensor];
  self.sensors = sensors;
  if (sensors.count > 0) {
    [self updateInterval];
  }
}

- (bool)hasRotationSensor
{
  for (ReanimatedSensor *sensor in self.sensors) {
    if (sensor.sensorType == ROTATION_VECTOR) {
      return true;
    }
  }
  return false;
}

- (void)switchToReferenceFrame:(int)referenceFrame
{
  if (referenceFrame == _referenceFrame) {
    return;
  }
  _referenceFrame = referenceFrame;
  [self stop];
  [self start];
}

// The stream runs at the fastest interval of its sensors, and each sensor skips what it doesn't need.
- (void)updateInterval
{
  double interval = DBL_MAX;
  for (ReanimatedSensor *sensor in self.sensors) {
    interval = MIN(interval, sensor.interval);
  }
  self.interval = interval;
  switch (_kind) {
    case ACCELEROMETER_STREAM:
      _manager.accelerometerUpdateInterval = interval;
      break;
    case GYROSCOPE_STREAM:
      _manager.gyroUpdateInterval = interval;
      break;
    case MAGNETOMETER_STREAM:
      _manager.magnetometerUpdateInterval = interval;
      break;
    case DEVICE_MOTION_STREAM:
      _manager.deviceMotionUpdateInterval = interval;
      break;
  }
}

- (void)start
{
  NSOperationQueue *queue = [NSOperationQueue mainQueue];
  // Weak, because the manager keeps the handler for as long as it runs.
  __weak ReanimatedSensorStream *weakSelf = self;
  switch (_kind) {
    case ACCELEROMETER_STREAM: {
      [_manager startAccelerometerUpdatesToQueue:queue
                                     withHandler:^(CMAccelerometerData *data, NSError *error) {
                                       [weakSelf deliverReading:data];
                                     }];
      break;
    }
    case GYROSCOPE_STREAM: {
      [_manager startGyroUpdatesToQueue:queue
                            withHandler:^(CMGyroData *data, NSError *error) { [weakSelf deliverReading:data]; }];
      break;
    }
    case MAGNETOMETER_STREAM: {
      [_manager startMagnetometerUpdatesToQueue:queue
                                    withHandler:^(CMMagnetometerData *data, NSError *error) {
                                      [weakSelf deliverReading:data];
                                    }];
      break;
    }
    case DEVICE_MOTION_STREAM: {
      [_manager setShowsDeviceMovementDisplay:YES];
      // the binary shift works here because of the definition of CMAttitudeReferenceFrame
      [_manager startDeviceMotionUpdatesUsingReferenceFrame:(1 << _referenceFrame)
                                                    toQueue:queue
                                                withHandler:^(CMDeviceMotion *data, NSError *error) {
                                                  [weakSelf deliverReading:data];
                                                }];
      break;
    }
  }
}

- (void)stop
{
  switch (_kind) {
    case ACCELEROMETER_STREAM:
      [_manager stopAccelerometerUpdates];
      break;
    case GYROSCOPE_STREAM:
      [_manager stopGyroUpdates];
      break;
    case MAGNETOMETER_STREAM:
      [_manager stopMagnetometerUpdates];
      break;
    case DEVICE_MOTION_STREAM:
      [_manager stopDeviceMotionUpdates];
      break;
  }
}

- (void)deliverReading:(CMLogItem *)reading
{
  if (reading == nil) {
    return;
  }
  const double interval = self.interval;
  for (ReanimatedSensor *sensor in self.sensors) {
    [sensor handleReading:reading streamInterval:interval];
  }
}

@end

@implementation ReanimatedSensorHub {
  CMMotionManager *_motionManager;
  NSMutableArray<ReanimatedSensorStream *> *_streams;
}

- (instancetype)init
{
  self = [super init];
  _motionManager = [[CMMotionManager alloc] init];
  _streams = [[NSMutableArray alloc] init];
  return self;
}

- (bool)isAvailable:(ReanimatedSensorType)sensorType
{
  switch (sensorType) {
    case ACCELEROMETER:
      return [_motionManager isAccelerometerAvailable];
    case GYROSCOPE:
      return [_motionManager isGyroAvailable];
    case MAGNETIC_FIELD:
      return [_motionManager isMagnetometerAvailable];
    case GRAVITY:
    case ROTATION_VECTOR:
      return [_motionManager isDeviceMotionAvailable];
  }
  return false;
}

- (bool)addSensor:(ReanimatedSensor *)sensor
{
  if (![self isAvailable:sensor.sensorType]) {
    return false;
  }
  @synchronized(self) {
    [[self streamForSensor:sensor] addSensor:sensor];
  }
  return true;
}

- (void)removeSensor:(ReanimatedSensor *)sensor
{
  @synchronized(self) {
    for (ReanimatedSensorStream *stream in _streams) {
      if (![stream.sensors containsObject:sensor]) {
        continue;
      }
      [stream removeSensor:sensor];
      if (stream.sensors.count == 0) {
        [stream stop];
        [_streams removeObject:stream];
      }
      return;
    }
  }
}

- (ReanimatedSensorStream *)streamForSensor:(ReanimatedSensor *)sensor
{
  const ReanimatedSensorStreamKind kind = streamKindOf(sensor.sensorType);
  const bool needsReferenceFrame = sensor.sensorType == ROTATION_VECTOR;
  const int referenceFrame = [self resolveReferenceFrame:sensor];

  // Only rotation depends on the reference frame, so a stream without it can switch to any frame.
  ReanimatedSensorStream *switchableStream = nil;
  for (ReanimatedSensorStream *stream in _streams) {
    if (stream.kind != kind) {
      continue;
    }
    if (!needsReferenceFrame || stream.referenceFrame == referenceFrame) {
      return stream;
    }
    if (![stream hasRotationSensor]) {
      switchableStream = stream;
    }
  }
  if (switchableStream != nil) {
    [switchableStream switchToReferenceFrame:referenceFrame];
    return switchableStream;
  }

  ReanimatedSensorStream *stream =
      [[ReanimatedSensorStream alloc] initWithKind:kind
                                           manager:[self managerForStreamOfKind:kind]
                                    referenceFrame:needsReferenceFrame ? referenceFrame : 0];
  [_streams addObject:stream];
  return stream;
}

// A second CMMotionManager is needed only for a second reference frame of device motion.
- (CMMotionManager *)managerForStreamOfKind:(ReanimatedSensorStreamKind)kind
{
  for (ReanimatedSensorStream *stream in _streams) {
    if (stream.kind == kind && stream.manager == _motionManager) {
      return [[CMMotionManager alloc] init];
    }
  }
  return _motionManager;
}

// On devices without magnetometer `Auto` falls back to `XArbitraryZVertical`,
// `XArbitraryCorrectedZVertical` otherwise
- (int)resolveReferenceFrame:(ReanimatedSensor *)sensor
{
  if (sensor.referenceFrame != AUTO_REFERENCE_FRAME) {
    return sensor.referenceFrame;
  }
  return [_motionManager isMagnetometerAvailable] ? 1 : 0;
}

@end

#else

@implementation ReanimatedSensor

- (instancetype)init:(ReanimatedSensorType)sensorType
             interval:(int)interval
    iosReferenceFrame:(int)iosReferenceFrame
               setter:(void (^)(double[], int))setter
{
  self = [super init];
  return self;
}

@end

@implementation ReanimatedSensorHub

- (bool)isAvailable:(ReanimatedSensorType)sensorType
{
  return false;
}

- (bool)addSensor:(ReanimatedSensor *)sensor
{
  return false;
}

- (void)removeSensor:(ReanimatedSensor *)sensor
{
}

@end
#endif
