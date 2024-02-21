#import <Foundation/Foundation.h>
#import <RNReanimated/READisplayLink.h>
#import <RNReanimated/REAKeyboardEventObserver.h>
#import <RNReanimated/REATimer.h>
#import <RNReanimated/REAUIKit.h>
#import <React/RCTDefines.h>
#import <React/RCTUIManager.h>

typedef NS_ENUM(NSUInteger, KeyboardState) {
  UNKNOWN = 0,
  OPENING = 1,
  OPEN = 2,
  CLOSING = 3,
  CLOSED = 4,
};

@implementation REAKeyboardEventObserver {
  REAUIView *_measuringView;
  NSNumber *_nextListenerId;
  NSMutableDictionary *_listeners;
  READisplayLink *_displayLink;
  KeyboardState _state;
  CFTimeInterval _animtionStartTimestamp;
  float _targetKeyboardHeight;
}

- (instancetype)init
{
  self = [super init];
  _listeners = [[NSMutableDictionary alloc] init];
  _nextListenerId = @0;
  _state = UNKNOWN;
  _animtionStartTimestamp = 0;
  NSNotificationCenter *notificationCenter = [NSNotificationCenter defaultCenter];

  [notificationCenter addObserver:self
                         selector:@selector(cleanupListeners)
                             name:RCTBridgeDidInvalidateModulesNotification
                           object:nil];
  return self;
}

- (READisplayLink *)getDisplayLink
{
  RCTAssertMainQueue();

  if (!_displayLink) {
    _displayLink = [READisplayLink displayLinkWithTarget:self selector:@selector(updateKeyboardFrame)];
#if !TARGET_OS_OSX
    _displayLink.preferredFramesPerSecond = 120; // will fallback to 60 fps for devices without Pro Motion display
#endif
    [_displayLink addToRunLoop:[NSRunLoop mainRunLoop] forMode:NSRunLoopCommonModes];
  }
  return _displayLink;
}

#if TARGET_OS_TV
- (int)subscribeForKeyboardEvents:(KeyboardEventListenerBlock)listener
{
  NSLog(@"Keyboard handling is not supported on tvOS");
  return 0;
}

- (void)unsubscribeFromKeyboardEvents:(int)listenerId
{
  NSLog(@"Keyboard handling is not supported on tvOS");
}

#elif TARGET_OS_OSX

- (int)subscribeForKeyboardEvents:(KeyboardEventListenerBlock)listener
{
  NSLog(@"Keyboard handling is not supported on macOS");
  return 0;
}

- (void)unsubscribeFromKeyboardEvents:(int)listenerId
{
  NSLog(@"Keyboard handling is not supported on macOS");
}

#else

- (void)runUpdater
{
  [[self getDisplayLink] setPaused:NO];
  _animtionStartTimestamp = 0;
  [self updateKeyboardFrame:true];
}

- (float)getTargetTimestamp
{
  float targetTimestamp = _displayLink.targetTimestamp;
  return reanimated::calculateTimestampWithSlowAnimations(targetTimestamp) * 1000;
}

- (float)estimateProgressForDuration:(float)keyboardAnimationDuration
                                  a1:(float)a1
                                  a2:(float)a2
                                  b1:(float)b1
                                  b2:(float)b2
                                  c1:(float)c1
                                  c2:(float)c2
{
  CFTimeInterval elapsedTime = _displayLink.targetTimestamp - _animtionStartTimestamp;
  float timeProgress = elapsedTime / keyboardAnimationDuration;
  if (timeProgress > 1) {
    timeProgress = 1;
  }
  float x = timeProgress;
  float progress = 1 - a1 * pow(1 - x, a2) - b1 * x * pow(1 - x, b2) - c1 * pow(x, 2) * pow(1 - x, c2);
  return progress;
}

- (CGFloat)estimateCurrentKeyboardHeightDuringAppearing
{
  // Values comes from estimation: https://www.desmos.com/calculator/clhzejf5bs
  float progress = [self estimateProgressForDuration:0.5 a1:1 a2:5.1 b1:1.6 b2:7.6 c1:0.2 c2:2.4];
  float currentKeyboardHeight = _targetKeyboardHeight * progress;
  return currentKeyboardHeight;
}

- (CGFloat)estimateCurrentKeyboardHeightDuringDisappearing
{
  // Values comes from estimation: https://www.desmos.com/calculator/d3v550ofzs
  float progress = [self estimateProgressForDuration:0.45 a1:1 a2:5.5 b1:2.5 b2:6.4 c1:1.6 c2:3.3];
  float currentKeyboardHeight = _targetKeyboardHeight * (1 - progress);
  return currentKeyboardHeight;
}

- (float)getAnimatingKeyboardHeight
{
  if (_animtionStartTimestamp == 0) {
    // DisplayLink animations usually start later than CAAnimations.
    _animtionStartTimestamp = _displayLink.targetTimestamp - _displayLink.duration;
  }
  CAAnimation *positionAnimation = [_measuringView.layer animationForKey:@"position"];
  float caAnimationBeginTime = [[positionAnimation valueForKey:@"beginTime"] floatValue];
  if (caAnimationBeginTime != 0) {
    /*
      CAAnimations have their own timers, and synchronizing with their timer produces
      better visual effects. The CAAnimation timer is only available from the second
      frame of the animation.
    */
    _animtionStartTimestamp = caAnimationBeginTime;
  }

  CGFloat keyboardHeight = 0;
  if (_state == OPENING) {
    keyboardHeight = [self estimateCurrentKeyboardHeightDuringAppearing];
  } else if (_state == CLOSING) {
    keyboardHeight = [self estimateCurrentKeyboardHeightDuringDisappearing];
  }
  return keyboardHeight;
}

- (float)getStaticKeyboardHeight
{
  CGRect measuringFrame = _measuringView.frame;
  CGFloat keyboardHeight = measuringFrame.size.height;
  return keyboardHeight;
}

- (void)updateKeyboardFrame
{
  [self updateKeyboardFrame:false];
}

- (void)updateKeyboardFrame:(bool)useStaticHeight
{
  bool isKeyboardAnimationRunning = _measuringView.layer.presentationLayer.animationKeys.count != 0;
  CGFloat keyboardHeight = 0;
  if (isKeyboardAnimationRunning && !useStaticHeight) {
    /*
      _state != OPEN indicates that we don't want to use estimators if the keyboard type
      has been changed, for example, from QWERTY to emoji.
    */
    keyboardHeight = [self getAnimatingKeyboardHeight];
  } else {
    // measuring view is no longer running an animation, we should settle in OPEN/CLOSE state
    if (_state == OPENING || _state == CLOSING) {
      _state = _state == OPENING ? OPEN : CLOSED;
    }
    if (_state == OPEN || _state == CLOSED) {
      keyboardHeight = [self getStaticKeyboardHeight];
    }
    // stop display link updates if no animation is running
    [[self getDisplayLink] setPaused:YES];
  }

  for (NSString *key in _listeners.allKeys) {
    ((KeyboardEventListenerBlock)_listeners[key])(_state, keyboardHeight);
  }
}

- (void)keyboardWillChangeFrame:(NSNotification *)notification
{
  NSDictionary *userInfo = [notification userInfo];
  CGRect beginFrame = [[userInfo objectForKey:UIKeyboardFrameBeginUserInfoKey] CGRectValue];
  CGRect endFrame = [[userInfo objectForKey:UIKeyboardFrameEndUserInfoKey] CGRectValue];
  NSTimeInterval animationDuration = [[userInfo objectForKey:UIKeyboardAnimationDurationUserInfoKey] doubleValue];
  CGSize windowSize = [[[UIApplication sharedApplication] delegate] window].frame.size;

  CGFloat beginHeight = windowSize.height - beginFrame.origin.y;
  CGFloat endHeight = windowSize.height - endFrame.origin.y;

  if (endHeight > 0 && _state != OPEN) {
    _targetKeyboardHeight = endHeight;
    _state = OPENING;
  } else if (endHeight == 0 && _state != CLOSED) {
    _state = CLOSING;
  }

  _measuringView.frame = CGRectMake(0, -1, 0, beginHeight);
  [UIView animateWithDuration:animationDuration
                   animations:^{
                     self->_measuringView.frame = CGRectMake(0, -1, 0, endHeight);
                   }];
  [self runUpdater];
}

- (int)subscribeForKeyboardEvents:(KeyboardEventListenerBlock)listener
{
  NSNumber *listenerId = [_nextListenerId copy];
  _nextListenerId = [NSNumber numberWithInt:[_nextListenerId intValue] + 1];
  RCTExecuteOnMainQueue(^() {
    if (!self->_measuringView) {
      self->_measuringView = [[UIView alloc] initWithFrame:CGRectMake(0, -1, 0, 0)];
      UIWindow *keyWindow = [[[UIApplication sharedApplication] delegate] window];
      [keyWindow addSubview:self->_measuringView];
    }
    if ([self->_listeners count] == 0) {
      NSNotificationCenter *notificationCenter = [NSNotificationCenter defaultCenter];

      [notificationCenter addObserver:self
                             selector:@selector(keyboardWillChangeFrame:)
                                 name:UIKeyboardWillChangeFrameNotification
                               object:nil];
    }

    [self->_listeners setObject:listener forKey:listenerId];
  });
  return [listenerId intValue];
}

- (void)unsubscribeFromKeyboardEvents:(int)listenerId
{
  RCTExecuteOnMainQueue(^() {
    NSNumber *_listenerId = [NSNumber numberWithInt:listenerId];
    [self->_listeners removeObjectForKey:_listenerId];
    if ([self->_listeners count] == 0) {
      [[NSNotificationCenter defaultCenter] removeObserver:self name:UIKeyboardWillChangeFrameNotification object:nil];
    }
  });
}

- (void)cleanupListeners
{
  RCTUnsafeExecuteOnMainQueueSync(^() {
    [self->_listeners removeAllObjects];
    [[self getDisplayLink] invalidate];
    self->_displayLink = nil;
    [[NSNotificationCenter defaultCenter] removeObserver:self];
  });
}

#endif

@end
