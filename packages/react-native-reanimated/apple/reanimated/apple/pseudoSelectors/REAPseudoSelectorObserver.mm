#import <reanimated/apple/pseudoSelectors/REAPseudoSelectorObserver.h>

#import <UIKit/UIKit.h>

@interface REAPseudoSelectorObserver () <UIGestureRecognizerDelegate>
- (void)attachActiveToView:(REAUIView *)view;
- (void)attachActiveDeepestToView:(REAUIView *)view;
- (void)attachHoverToView:(REAUIView *)view;
- (void)attachFocusToView:(REAUIView *)view;
- (void)attachFocusWithinToView:(REAUIView *)view;
@end

@implementation REAPseudoSelectorObserver {
  __weak REAUIView *_view;
  reanimated::PseudoSelector _selector;
  UIGestureRecognizer *_gestureRecognizer;
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
      [self attachActiveToView:view];
      break;
    case reanimated::PseudoSelector::ActiveDeepest:
      [self attachActiveDeepestToView:view];
      break;
    case reanimated::PseudoSelector::Hover:
      [self attachHoverToView:view];
      break;
    case reanimated::PseudoSelector::Focus:
      [self attachFocusToView:view];
      break;
    case reanimated::PseudoSelector::FocusWithin:
      [self attachFocusWithinToView:view];
      break;
  }
}

- (void)attachActiveToView:(REAUIView *)view
{
  [self attachActiveGestureRecognizerToView:view];
}

- (void)attachActiveDeepestToView:(REAUIView *)view
{
  [self attachActiveGestureRecognizerToView:view];
}

- (void)attachActiveGestureRecognizerToView:(REAUIView *)view
{
  UILongPressGestureRecognizer *recognizer =
      [[UILongPressGestureRecognizer alloc] initWithTarget:self action:@selector(handleActiveGesture:)];
  recognizer.minimumPressDuration = 0;
  recognizer.delegate = self;
  recognizer.cancelsTouchesInView = NO;
  [view addGestureRecognizer:recognizer];
  _gestureRecognizer = recognizer;
}

- (void)attachHoverToView:(REAUIView *)view
{
  if (@available(iOS 13.0, *)) {
    UIHoverGestureRecognizer *recognizer =
        [[UIHoverGestureRecognizer alloc] initWithTarget:self action:@selector(handleHoverGesture:)];
    recognizer.delegate = self;
    [view addGestureRecognizer:recognizer];
    _gestureRecognizer = recognizer;
  }
}

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

- (void)handleHoverGesture:(UIHoverGestureRecognizer *)recognizer API_AVAILABLE(ios(13.0))
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

- (BOOL)gestureRecognizerShouldBegin:(UIGestureRecognizer *)gestureRecognizer
{
  REAUIView *view = _view;
  if (!view) {
    return NO;
  }
  // always allow for :active
  if (_selector == reanimated::PseudoSelector::Active) {
    return YES;
  }
  // for :active-deepest walk up from the hit view: if any descendant
  // already has an :active-deepest gesture recognizer, that descendant
  // owns the touch.
  CGPoint location = [gestureRecognizer locationInView:view];
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
  return YES;
}

- (BOOL)gestureRecognizer:(UIGestureRecognizer *)gestureRecognizer
    shouldRecognizeSimultaneouslyWithGestureRecognizer:(UIGestureRecognizer *)otherGestureRecognizer
{
  return YES;
}

- (void)detach
{
  if (_gestureRecognizer && _view) {
    [_view removeGestureRecognizer:_gestureRecognizer];
  }
  _gestureRecognizer = nil;
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
