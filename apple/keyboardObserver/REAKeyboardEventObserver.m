#import <Foundation/Foundation.h>
#import <RNReanimated/READisplayLink.h>
#import <RNReanimated/REAKeyboardEventObserver.h>
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
  CFTimeInterval _animtionStart;
  float _targetKeyboardHeight;
}

- (instancetype)init
{
  self = [super init];
  _listeners = [[NSMutableDictionary alloc] init];
  _nextListenerId = @0;
  _state = UNKNOWN;
  _animtionStart = 0;
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
  _animtionStart = 0;
  //  [self updateKeyboardFrame];
}

- (CGFloat)estimateCurrentKeyboardHeightDiringAppearing
{
  float keyboardAnimationDuration = 0.5;
  float a1 = 1;
  float a2 = 5.1;
  float b1 = 1.6;
  float b2 = 7.6;
  float c1 = 0.2;
  float c2 = 2.4;
  CFTimeInterval elapsedTime = _displayLink.targetTimestamp - _animtionStart;
  float timeProgress = elapsedTime / keyboardAnimationDuration;
  if (timeProgress > 1) {
    timeProgress = 1;
  }
  float x = timeProgress;
  float progress = 1 - a1 * pow(1 - x, a2) - b1 * x * pow(1 - x, b2) - c1 * pow(x, 2) * pow(1 - x, c2);
  float currentKeyboardHeight = _targetKeyboardHeight * progress;
  return currentKeyboardHeight;
}

- (CGFloat)estimateCurrentKeyboardHeightDiringDisappearing
{
  float keyboardAnimationDuration = 0.45;
  float a1 = 1;
  float a2 = 5.5;
  float b1 = 2.5;
  float b2 = 6.4;
  float c1 = 1.6;
  float c2 = 3.3;
  CFTimeInterval elapsedTime = _displayLink.targetTimestamp - _animtionStart;
  float timeProgress = elapsedTime / keyboardAnimationDuration;
  if (timeProgress > 1) {
    timeProgress = 1;
  }
  float x = timeProgress;
  float progress = 1 - a1 * pow(1 - x, a2) - b1 * x * pow(1 - x, b2) - c1 * pow(x, 2) * pow(1 - x, c2);
  float currentKeyboardHeight = _targetKeyboardHeight * (1 - progress);
  return currentKeyboardHeight;
}

- (void)updateKeyboardFrame
{
  if (_animtionStart == 0) {
    _animtionStart = _displayLink.targetTimestamp - _displayLink.duration;
  }
  CAAnimation *positionAnimation = [_measuringView.layer animationForKey:@"position"];
  float caAnimationBeginTime = [[positionAnimation valueForKey:@"beginTime"] floatValue];
  if (caAnimationBeginTime != 0) {
    _animtionStart = caAnimationBeginTime;
  }

  CGFloat keyboardHeight = 0;
  if (_state == OPENING) {
    keyboardHeight = [self estimateCurrentKeyboardHeightDiringAppearing];
  } else if (_state == CLOSING) {
    keyboardHeight = [self estimateCurrentKeyboardHeightDiringDisappearing];
  }

  BOOL isAnimatingKeyboardChange = _measuringView.layer.presentationLayer.animationKeys.count != 0;
  if (!isAnimatingKeyboardChange) {
    // measuring view is no longer running an animation, we should settle in OPEN/CLOSE state
    if (_state == OPENING || _state == CLOSING) {
      _state = _state == OPENING ? OPEN : CLOSED;
    }
    if (_state == OPEN) {
      keyboardHeight = _targetKeyboardHeight;
    } else if (_state == CLOSED) {
      keyboardHeight = 0;
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
