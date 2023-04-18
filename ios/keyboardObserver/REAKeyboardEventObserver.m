#import <Foundation/Foundation.h>
#import <RNReanimated/REAKeyboardEventObserver.h>
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
  UIView *_measuringView;
  CADisplayLink *_displayLink;
  KeyboardState _state;
  KeyboardEventListenerBlock _listener;
}

@synthesize enabled = _enabled;

- (instancetype)initWithEventListenerBlock:(KeyboardEventListenerBlock)listener
{
  self = [super init];
  if (self) {
    _state = UNKNOWN;
    _listener = listener;
  }
  return self;
}

- (void)setEnabled:(BOOL)enabled
{
#if TARGET_OS_TV
  NSLog(@"Keyboard handling is not supported on tvOS");
#else
  if (enabled != _enabled) {
    RCTExecuteOnMainQueue(^() {
      if (enabled) {
        if (!self->_measuringView) {
          self->_measuringView = [[UIView alloc] initWithFrame:CGRectMake(0, -1, 0, 0)];
          UIWindow *keyWindow = [[[UIApplication sharedApplication] delegate] window];
          [keyWindow addSubview:self->_measuringView];
        }
        [[NSNotificationCenter defaultCenter] addObserver:self
                                                 selector:@selector(keyboardWillChangeFrame:)
                                                     name:UIKeyboardWillChangeFrameNotification
                                                   object:nil];
      } else {
        [[NSNotificationCenter defaultCenter] removeObserver:self];
      }
    });
  }
#endif
  _enabled = enabled;
}

- (void)runUpdater
{
  if (!_displayLink) {
    _displayLink = [CADisplayLink displayLinkWithTarget:self selector:@selector(updateKeyboardFrame)];
    _displayLink.preferredFramesPerSecond = 120; // will fallback to 60 fps for devices without Pro Motion display
    [_displayLink addToRunLoop:[NSRunLoop mainRunLoop] forMode:NSRunLoopCommonModes];
  }
  _displayLink.paused = NO;
  [self updateKeyboardFrame];
}

- (void)updateKeyboardFrame
{
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
    _displayLink.paused = YES;
  }

  if (_enabled) {
    _listener(_state, keyboardHeight);
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

- (void)dealloc
{
  [self->_displayLink invalidate];
  self->_displayLink = nil;
  [[NSNotificationCenter defaultCenter] removeObserver:self];
}

@end
