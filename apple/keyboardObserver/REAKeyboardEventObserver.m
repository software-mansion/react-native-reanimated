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
  DETACHED = 5,
};

@implementation REAKeyboardEventObserver {
  REAUIView *_measuringView;
  NSNumber *_nextListenerId;
  NSMutableDictionary *_listeners;
  READisplayLink *_displayLink;
  KeyboardState _state;
}

- (instancetype)init
{
  self = [super init];
  _listeners = [[NSMutableDictionary alloc] init];
  _nextListenerId = @0;
  _state = UNKNOWN;

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
  [self updateKeyboardFrame];
}

- (void)updateKeyboardFrame
{
  // for detached keyboard we always return 0 height
  if (_state == DETACHED) {
    // make sure that state = DETACHED, height = 0 gets emitted only once
    [[self getDisplayLink] setPaused:YES];
    
    for (NSString *key in _listeners.allKeys) {
      ((KeyboardEventListenerBlock)_listeners[key])(_state, 0);
    }
    return;
  }
  
  BOOL isAnimatingKeyboardChange = _measuringView.layer.presentationLayer.animationKeys.count != 0;
  CGRect measuringFrame =
      isAnimatingKeyboardChange ? _measuringView.layer.presentationLayer.frame : _measuringView.frame;
  CGFloat keyboardHeight = measuringFrame.size.height;

  if (!isAnimatingKeyboardChange) {
    // measuring view is no longer running an animation, we should settle in OPEN/CLOSE state
    if (_state == OPENING || _state == CLOSING) {
      _state = _state == OPENING ? OPEN : CLOSED;
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

  // compute checks for detached keyboard
  CGRect screenBounds = [[UIScreen mainScreen]bounds];
  Boolean isBeginFrameDetached =
    CGRectGetWidth(beginFrame) != CGRectGetWidth(screenBounds) ||
    (CGRectGetMaxY(beginFrame) != CGRectGetMaxY(screenBounds) &&
     CGRectGetMinY(beginFrame) != CGRectGetMaxY(screenBounds));
  Boolean isEndFrameDetached =
    CGRectGetWidth(screenBounds) != CGRectGetWidth(endFrame) ||
    (CGRectGetMaxY(endFrame) != CGRectGetMaxY(screenBounds) &&
     CGRectGetMinY(endFrame) != CGRectGetMaxY(screenBounds));
  // variables determining keyboard height's change
  CGFloat beginHeight = 0;
  CGFloat endHeight = 0;
  
  // it is worth noting, that the begin/end frames taken from userInfo will never be in state non-detached/detached - they transition from both non-detached to instantly both detached
  if (isBeginFrameDetached && isEndFrameDetached) {
    //detached keyboard frame changes
    _state = DETACHED;
    beginHeight = 0;
    endHeight = 0;
  } else if (isBeginFrameDetached && !isEndFrameDetached) {
    // transition from detached to normal keyboard
    // since keyboard changes we set the state to OPENING
    _state = OPENING;
    beginHeight = 0;
    endHeight = windowSize.height - endFrame.origin.y;
  } else if(!isBeginFrameDetached && !isEndFrameDetached) {
    // normal keyboard frame changes
    beginHeight = windowSize.height - beginFrame.origin.y;
    endHeight = windowSize.height - endFrame.origin.y;
    
    if (endHeight > 0 && _state != OPEN) {
      _state = OPENING;
    } else if (endHeight == 0 && _state != CLOSED) {
      _state = CLOSING;
    }
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
