#import <reanimated/apple/pseudoSelectors/REAPseudoSelectorObserver.h>

#if !TARGET_OS_OSX
#import <UIKit/UIKit.h>
#else
#import <AppKit/AppKit.h>
#endif

#if !TARGET_OS_OSX
@interface REAPseudoSelectorObserver () <UIGestureRecognizerDelegate>
#else
@interface REAPseudoSelectorObserver () <NSGestureRecognizerDelegate>
#endif
- (void)attachActiveGestureRecognizerToView:(REAUIView *)view;
- (void)attachHoverToView:(REAUIView *)view;
#if !TARGET_OS_OSX
- (void)attachFocusToView:(REAUIView *)view;
- (void)attachFocusWithinToView:(REAUIView *)view;
#else
- (void)attachMacFocusObservers;
#endif
@end

@implementation REAPseudoSelectorObserver {
  __weak REAUIView *_view;
  reanimated::PseudoSelector _selector;
#if !TARGET_OS_OSX
  UIGestureRecognizer *_gestureRecognizer;
#else
  NSGestureRecognizer *_gestureRecognizer;
  NSTrackingArea *_trackingArea;
  NSWindow *_observedWindow;
  id _windowFrameObserver;
#endif
  NSArray *_notificationObservers;
  std::function<void(bool)> _callback;
}

- (instancetype)initWithView:(REAUIView *)view
                    selector:(reanimated::PseudoSelector)selector
                    callback:(std::function<void(bool)>)callback
{
  if (self = [super init]) {
    _view = view;
    _selector = selector;
    _callback = std::move(callback);
    [self attachSelector:selector toView:view];
  }
  return self;
}

- (void)attachSelector:(reanimated::PseudoSelector)selector toView:(REAUIView *)view
{
  switch (selector) {
    case reanimated::PseudoSelector::Active:
    case reanimated::PseudoSelector::ActiveDeepest:
      [self attachActiveGestureRecognizerToView:view];
      break;
    case reanimated::PseudoSelector::Hover:
      [self attachHoverToView:view];
      break;
#if !TARGET_OS_OSX
    case reanimated::PseudoSelector::Focus:
      [self attachFocusToView:view];
      break;
    case reanimated::PseudoSelector::FocusWithin:
      [self attachFocusWithinToView:view];
      break;
#else
    case reanimated::PseudoSelector::Focus:
    case reanimated::PseudoSelector::FocusWithin:
      [self attachMacFocusObservers];
      break;
#endif
  }
}

- (void)attachActiveGestureRecognizerToView:(REAUIView *)view
{
#if !TARGET_OS_OSX
  UILongPressGestureRecognizer *recognizer =
      [[UILongPressGestureRecognizer alloc] initWithTarget:self action:@selector(handleActiveGesture:)];
  recognizer.cancelsTouchesInView = NO;
#else
  NSPressGestureRecognizer *recognizer =
      [[NSPressGestureRecognizer alloc] initWithTarget:self action:@selector(handleActiveGesture:)];
#endif
  recognizer.minimumPressDuration = 0;
  recognizer.delegate = self;
  [view addGestureRecognizer:recognizer];
  _gestureRecognizer = recognizer;
}

- (void)attachHoverToView:(REAUIView *)view
{
#if !TARGET_OS_OSX
#if !TARGET_OS_TV
  UIHoverGestureRecognizer *recognizer =
      [[UIHoverGestureRecognizer alloc] initWithTarget:self action:@selector(handleHoverGesture:)];
  recognizer.delegate = self;
  [view addGestureRecognizer:recognizer];
  _gestureRecognizer = recognizer;
#endif
#else // TARGET_OS_OSX
  NSTrackingArea *trackingArea = [[NSTrackingArea alloc]
      initWithRect:NSZeroRect
           options:NSTrackingMouseEnteredAndExited | NSTrackingActiveAlways | NSTrackingInVisibleRect
             owner:self
          userInfo:nil];
  [view addTrackingArea:trackingArea];
  _trackingArea = trackingArea;
#endif
}

#if !TARGET_OS_OSX
// Fires only when this view's own text input gains focus.
// On iOS, resolveView returns the Fabric wrapper (RCTTextInputComponentView), not the inner
// UITextField/UITextView. The notification object is always the inner UITextField/UITextView,
// which is always a direct child of the wrapper - so superview == strongView is sufficient.
- (void)attachFocusToView:(REAUIView *)view
{
  __weak REAUIView *weakView = view;

  auto isOurs = ^BOOL(NSNotification *note) {
    REAUIView *strongView = weakView;
    return strongView != nil && ((UIView *)note.object).superview == strongView;
  };

  [self attachFocusObserversWithPredicate:isOurs];
}

- (void)attachFocusWithinToView:(REAUIView *)view
{
  __weak REAUIView *weakView = view;

  auto isOurs = ^BOOL(NSNotification *note) {
    REAUIView *strongView = weakView;
    return strongView != nil && [note.object isKindOfClass:[UIView class]] &&
        [(UIView *)note.object isDescendantOfView:strongView];
  };

  [self attachFocusObserversWithPredicate:isOurs];
}
#else
static int _focusObserverContext;

- (void)attachMacFocusObservers
{
  [self observeWindowForFocus];

  __weak REAPseudoSelectorObserver *weakSelf = self;
  _windowFrameObserver = [[NSNotificationCenter defaultCenter]
      addObserverForName:NSViewGlobalFrameDidChangeNotification
                  object:_view
                   queue:NSOperationQueue.mainQueue
              usingBlock:^(NSNotification *_Nonnull note) { [weakSelf observeWindowForFocus]; }];
}

- (void)observeWindowForFocus
{
  if (!_view)
    return;
  NSWindow *currentWindow = _view.window;
  if (_observedWindow == currentWindow)
    return;

  if (_observedWindow) {
    [_observedWindow removeObserver:self forKeyPath:@"firstResponder" context:&_focusObserverContext];
  }

  _observedWindow = currentWindow;

  if (_observedWindow) {
    [_observedWindow addObserver:self
                      forKeyPath:@"firstResponder"
                         options:NSKeyValueObservingOptionInitial | NSKeyValueObservingOptionNew
                         context:&_focusObserverContext];
  }
}

- (void)observeValueForKeyPath:(NSString *)keyPath
                      ofObject:(id)object
                        change:(NSDictionary<NSKeyValueChangeKey, id> *)change
                       context:(void *)context
{
  if (context == &_focusObserverContext) {
    if (!_view || !_callback)
      return;
    NSResponder *firstResponder = _observedWindow.firstResponder;
    BOOL isFocused = NO;
    if ([firstResponder isKindOfClass:[NSView class]]) {
      NSView *focusedView = (NSView *)firstResponder;
      if (_selector == reanimated::PseudoSelector::Focus) {
        if ([NSStringFromClass([_view class]) isEqualToString:@"RCTTextInputComponentView"]) {
          isFocused = [focusedView isDescendantOf:_view];
        } else {
          isFocused = (focusedView == _view);
        }
      } else {
        // FocusWithin
        isFocused = [focusedView isDescendantOf:_view];
      }
    }
    _callback(isFocused);
  } else {
    [super observeValueForKeyPath:keyPath ofObject:object change:change context:context];
  }
}
#endif

#if !TARGET_OS_OSX
- (void)attachFocusObserversWithPredicate:(BOOL (^)(NSNotification *))isOurs
{
  NSNotificationCenter *nc = [NSNotificationCenter defaultCenter];
  // Capture callback by value to avoid retain cycle: self -> _notificationObservers -> blocks -> self
  auto callback = _callback;

  NSMutableArray *observers = [NSMutableArray array];
  for (NSNotificationName beginName in @[
         UITextFieldTextDidBeginEditingNotification,
         UITextViewTextDidBeginEditingNotification,
       ]) {
    id ob = [nc addObserverForName:beginName
                            object:nil
                             queue:NSOperationQueue.mainQueue
                        usingBlock:^(NSNotification *note) {
                          if (isOurs(note)) {
                            callback(true);
                          }
                        }];
    [observers addObject:ob];
  }
  for (NSNotificationName endName in @[
         UITextFieldTextDidEndEditingNotification,
         UITextViewTextDidEndEditingNotification,
       ]) {
    id ob = [nc addObserverForName:endName
                            object:nil
                             queue:NSOperationQueue.mainQueue
                        usingBlock:^(NSNotification *note) {
                          if (isOurs(note)) {
                            callback(false);
                          }
                        }];
    [observers addObject:ob];
  }
  _notificationObservers = [observers copy];
}
#endif

#if !TARGET_OS_OSX

#if !TARGET_OS_TV
- (void)handleHoverGesture:(UIHoverGestureRecognizer *)recognizer
{
  switch (recognizer.state) {
    case UIGestureRecognizerStateBegan:
      _callback(true);
      break;
    case UIGestureRecognizerStateEnded:
    case UIGestureRecognizerStateCancelled:
    case UIGestureRecognizerStateFailed:
      _callback(false);
      break;
    default:
      break;
  }
}
#endif

- (void)handleActiveGesture:(UILongPressGestureRecognizer *)recognizer
{
  switch (recognizer.state) {
    case UIGestureRecognizerStateBegan:
      _callback(true);
      break;
    case UIGestureRecognizerStateEnded:
    case UIGestureRecognizerStateCancelled:
    case UIGestureRecognizerStateFailed:
      _callback(false);
      break;
    default:
      break;
  }
}

#else // TARGET_OS_OSX

- (void)mouseEntered:(NSEvent *)event
{
  _callback(true);
}

- (void)mouseExited:(NSEvent *)event
{
  _callback(false);
}

- (void)handleActiveGesture:(NSPressGestureRecognizer *)recognizer
{
  switch (recognizer.state) {
    case NSGestureRecognizerStateBegan:
      _callback(true);
      break;
    case NSGestureRecognizerStateEnded:
    case NSGestureRecognizerStateCancelled:
    case NSGestureRecognizerStateFailed:
      _callback(false);
      break;
    default:
      break;
  }
}

#endif // TARGET_OS_OSX

#if !TARGET_OS_OSX
- (BOOL)gestureRecognizerShouldBegin:(UIGestureRecognizer *)gestureRecognizer
#else
- (BOOL)gestureRecognizerShouldBegin:(NSGestureRecognizer *)gestureRecognizer
#endif
{
  REAUIView *view = _view;
  if (!view) {
    return NO;
  }
  // The descendant walk below is only meaningful for :active-deepest.
  // :active always allows, and any other selector (e.g. :hover, which shares
  // this delegate) never participates in deepest arbitration.
  if (_selector != reanimated::PseudoSelector::ActiveDeepest) {
    return YES;
  }
  // for :active-deepest walk up from the hit view: if any descendant
  // already has an :active-deepest or :active gesture recognizer, that descendant
  // owns the touch.
  CGPoint location = [gestureRecognizer locationInView:view];
#if !TARGET_OS_OSX
  UIView *current = [view hitTest:location withEvent:nil];
  while (current && current != view) {
    for (UIGestureRecognizer *gr in current.gestureRecognizers) {
      if ([gr.delegate isKindOfClass:[REAPseudoSelectorObserver class]] &&
          [gr isKindOfClass:[UILongPressGestureRecognizer class]]) {
        return NO;
      }
    }
    current = current.superview;
  }
#else
  NSPoint locationInSuper = [view convertPoint:location toView:view.superview];
  NSView *current = [view.superview hitTest:locationInSuper];

  while (current && current != view) {
    for (NSGestureRecognizer *gr in current.gestureRecognizers) {
      if ([gr.delegate isKindOfClass:[REAPseudoSelectorObserver class]] &&
          [gr isKindOfClass:[NSPressGestureRecognizer class]]) {
        return NO;
      }
    }
    current = current.superview;
  }
#endif
  return YES;
}

#if !TARGET_OS_OSX
- (BOOL)gestureRecognizer:(UIGestureRecognizer *)gestureRecognizer
    shouldRecognizeSimultaneouslyWithGestureRecognizer:(UIGestureRecognizer *)otherGestureRecognizer
#else
- (BOOL)gestureRecognizer:(NSGestureRecognizer *)gestureRecognizer
    shouldRecognizeSimultaneouslyWithGestureRecognizer:(NSGestureRecognizer *)otherGestureRecognizer
#endif
{
  return YES;
}

- (void)detach
{
  if (_gestureRecognizer && _view) {
    [_view removeGestureRecognizer:_gestureRecognizer];
  }
  _gestureRecognizer = nil;
#if TARGET_OS_OSX
  if (_trackingArea && _view) {
    [_view removeTrackingArea:_trackingArea];
  }
  _trackingArea = nil;
  if (_observedWindow) {
    [_observedWindow removeObserver:self forKeyPath:@"firstResponder" context:&_focusObserverContext];
    _observedWindow = nil;
  }
  if (_windowFrameObserver) {
    [[NSNotificationCenter defaultCenter] removeObserver:_windowFrameObserver];
    _windowFrameObserver = nil;
  }
#endif
  if (_notificationObservers) {
    NSNotificationCenter *nc = [NSNotificationCenter defaultCenter];
    for (id ob in _notificationObservers) {
      [nc removeObserver:ob];
    }
    _notificationObservers = nil;
  }
  _callback = nullptr;
}

- (void)dealloc
{
  [self detach];
}

@end
