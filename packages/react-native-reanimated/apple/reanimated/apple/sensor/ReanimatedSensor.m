#import <reanimated/apple/sensor/ReanimatedHingeProbe.h>
#import <reanimated/apple/sensor/ReanimatedSensor.h>

#if !TARGET_OS_TV && !TARGET_OS_OSX && !TARGET_OS_VISION
@interface ReanimatedSensor ()
#if __has_include(<UIKit/UIHingeInteraction.h>)
- (void)attachHingeInteraction API_AVAILABLE(ios(27.1));
#endif
@end

@implementation ReanimatedSensor

+ (bool)isAvailable:(ReanimatedSensorType)sensorType
{
  static CMMotionManager *motionManager;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{ motionManager = [[CMMotionManager alloc] init]; });

  switch (sensorType) {
    case ACCELEROMETER:
      return [motionManager isAccelerometerAvailable];
    case GYROSCOPE:
      return [motionManager isGyroAvailable];
    case MAGNETIC_FIELD:
      return [motionManager isMagnetometerAvailable];
    case GRAVITY:
    case ROTATION_VECTOR:
      return [motionManager isDeviceMotionAvailable];
    case HINGE:
      return [ReanimatedHingeProbe hasHinge];
  }
  return false;
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
  _motionManager = [[CMMotionManager alloc] init];
  return self;
}

- (bool)initialize
{
  if (![ReanimatedSensor isAvailable:_sensorType]) {
    return false;
  }

  if (_sensorType == ACCELEROMETER) {
    return [self initializeAccelerometer];
  } else if (_sensorType == GYROSCOPE) {
    return [self initializeGyroscope];
  } else if (_sensorType == GRAVITY) {
    return [self initializeGravity];
  } else if (_sensorType == MAGNETIC_FIELD) {
    return [self initializeMagnetometer];
  } else if (_sensorType == ROTATION_VECTOR) {
    return [self initializeOrientation];
  } else if (_sensorType == HINGE) {
    return [self initializeHinge];
  }

  return false;
}

- (bool)initializeGyroscope
{
  [_motionManager setGyroUpdateInterval:_interval];
  [_motionManager startGyroUpdates];
  [_motionManager
      startGyroUpdatesToQueue:[NSOperationQueue mainQueue]
                  withHandler:^(CMGyroData *sensorData, NSError *error) {
                    double currentTime = CACurrentMediaTime() * 1000;
                    if (currentTime - self->_lastTimestamp < self->_interval) {
                      return;
                    }
                    double data[] = {sensorData.rotationRate.x, sensorData.rotationRate.y, sensorData.rotationRate.z};
                    self->_setter(data, [self getInterfaceOrientation]);
                    self->_lastTimestamp = currentTime;
                  }];

  return true;
}

- (bool)initializeAccelerometer
{
  [_motionManager setAccelerometerUpdateInterval:_interval];
  [_motionManager startAccelerometerUpdates];
  [_motionManager startAccelerometerUpdatesToQueue:[NSOperationQueue mainQueue]
                                       withHandler:^(CMAccelerometerData *sensorData, NSError *error) {
                                         double currentTime = CACurrentMediaTime() * 1000;
                                         if (currentTime - self->_lastTimestamp < self->_interval) {
                                           return;
                                         }
                                         double G = 9.81;
                                         // convert G to m/s^2
                                         double data[] = {
                                             sensorData.acceleration.x * G,
                                             sensorData.acceleration.y * G,
                                             sensorData.acceleration.z * G};
                                         self->_setter(data, [self getInterfaceOrientation]);
                                         self->_lastTimestamp = currentTime;
                                       }];

  return true;
}

- (bool)initializeGravity
{
  [_motionManager setDeviceMotionUpdateInterval:_interval];
  [_motionManager setShowsDeviceMovementDisplay:YES];
  [_motionManager
      startDeviceMotionUpdatesToQueue:[NSOperationQueue mainQueue]
                          withHandler:^(CMDeviceMotion *sensorData, NSError *error) {
                            double currentTime = CACurrentMediaTime() * 1000;
                            if (currentTime - self->_lastTimestamp < self->_interval) {
                              return;
                            }
                            double G = 9.81;
                            // convert G to m/s^2
                            double data[] = {
                                sensorData.gravity.x * G, sensorData.gravity.y * G, sensorData.gravity.z * G};
                            self->_setter(data, [self getInterfaceOrientation]);
                            self->_lastTimestamp = currentTime;
                          }];

  return true;
}

- (bool)initializeMagnetometer
{
  [_motionManager setMagnetometerUpdateInterval:_interval];
  [_motionManager startMagnetometerUpdates];
  [_motionManager
      startMagnetometerUpdatesToQueue:[NSOperationQueue mainQueue]
                          withHandler:^(CMMagnetometerData *sensorData, NSError *error) {
                            double currentTime = CACurrentMediaTime() * 1000;
                            if (currentTime - self->_lastTimestamp < self->_interval) {
                              return;
                            }
                            double data[] = {
                                sensorData.magneticField.x, sensorData.magneticField.y, sensorData.magneticField.z};
                            self->_setter(data, [self getInterfaceOrientation]);
                            self->_lastTimestamp = currentTime;
                          }];

  return true;
}

- (bool)initializeOrientation
{
  [_motionManager setDeviceMotionUpdateInterval:_interval];

  [_motionManager setShowsDeviceMovementDisplay:YES];

  // _referenceFrame = Auto, on devices without magnetometer fall back to `XArbitraryZVertical`,
  // `XArbitraryCorrectedZVertical` otherwise
  if (_referenceFrame == 4) {
    if (![_motionManager isMagnetometerAvailable]) {
      _referenceFrame = 0;
    } else {
      _referenceFrame = 1;
    }
  }

  // the binary shift works here because of the definition of CMAttitudeReferenceFrame
  [_motionManager startDeviceMotionUpdatesUsingReferenceFrame:(1 << _referenceFrame)
                                                      toQueue:[NSOperationQueue mainQueue]
                                                  withHandler:^(CMDeviceMotion *sensorData, NSError *error) {
                                                    double currentTime = CACurrentMediaTime() * 1000;
                                                    if (currentTime - self->_lastTimestamp < self->_interval) {
                                                      return;
                                                    }
                                                    CMAttitude *attitude = sensorData.attitude;
                                                    double data[] = {
                                                        attitude.quaternion.x,
                                                        attitude.quaternion.y,
                                                        attitude.quaternion.z,
                                                        attitude.quaternion.w,
                                                        attitude.yaw,
                                                        attitude.pitch,
                                                        attitude.roll};
                                                    self->_setter(data, [self getInterfaceOrientation]);
                                                    self->_lastTimestamp = currentTime;
                                                  }];

  return true;
}

- (bool)initializeHinge
{
#if __has_include(<UIKit/UIHingeInteraction.h>)
  if (@available(iOS 27.1, *)) {
    // Sensors are registered from the JS thread and interactions are main-thread
    // only, so all hinge state is read and written on the main queue.
    dispatch_async(dispatch_get_main_queue(), ^{ [self attachHingeInteraction]; });
    return true;
  }
#endif
  return false;
}

#if __has_include(<UIKit/UIHingeInteraction.h>)
- (void)attachHingeInteraction
{
  if (_hingeCancelled) {
    return;
  }

  __weak ReanimatedSensor *weakSelf = self;
  UIHingeInteraction *interaction =
      [[UIHingeInteraction alloc] initWithUpdateHandler:^(UIHingeInteraction *_, UIHingeInteractionUpdate *update) {
        ReanimatedSensor *strongSelf = weakSelf;
        UIHinge *hinge = update.hinge;
        // nil is not a measurement: it also arrives while the interaction is outside a hierarchy with a hinge.
        if (strongSelf == nil || hinge == nil) {
          return;
        }
        double data[] = {hinge.angle, (double)hinge.status};
        strongSelf->_setter(data, [strongSelf getInterfaceOrientation]);
      }];
  _hingeInteraction = interaction;
  [ReanimatedHingeProbe addInteraction:interaction];
}
#endif

- (void)cancel
{
  if (_sensorType == HINGE) {
    dispatch_async(dispatch_get_main_queue(), ^{
      self->_hingeCancelled = true;
      [ReanimatedHingeProbe removeInteraction:self->_hingeInteraction];
      self->_hingeInteraction = nil;
    });
  } else if (_sensorType == ACCELEROMETER) {
    [_motionManager stopAccelerometerUpdates];
  } else if (_sensorType == GYROSCOPE) {
    [_motionManager stopGyroUpdates];
  } else if (_sensorType == GRAVITY) {
    [_motionManager stopDeviceMotionUpdates];
  } else if (_sensorType == MAGNETIC_FIELD) {
    [_motionManager stopMagnetometerUpdates];
  } else if (_sensorType == ROTATION_VECTOR) {
    [_motionManager stopDeviceMotionUpdates];
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

#else

@implementation ReanimatedSensor

+ (bool)isAvailable:(ReanimatedSensorType)sensorType
{
  return false;
}

- (instancetype)init:(ReanimatedSensorType)sensorType
             interval:(int)interval
    iosReferenceFrame:(int)iosReferenceFrame
               setter:(void (^)(double[], int))setter
{
  self = [super init];
  return self;
}

- (bool)initialize
{
  return false;
}

- (bool)initializeGyroscope
{
  return false;
}

- (bool)initializeAccelerometer
{
  return false;
}

- (bool)initializeGravity
{
  return false;
}

- (bool)initializeMagnetometer
{
  return false;
}

- (bool)initializeOrientation
{
  return false;
}

- (bool)initializeHinge
{
  return false;
}

- (void)cancel
{
}

@end
#endif
