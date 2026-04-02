#import <reanimated/apple/pseudoSelectors/REAPseudoSelectorObserver.h>

#import <UIKit/UIKit.h>

@interface REAPseudoSelectorObserver () <UIGestureRecognizerDelegate>
- (void)attachActiveToView:(REAUIView *)view;
- (void)attachHoverToView:(REAUIView *)view;
- (void)attachFocusToView:(REAUIView *)view;
@end

@implementation REAPseudoSelectorObserver {
  __weak REAUIView *_view;
  UIGestureRecognizer *_gestureRecognizer;
  NSArray *_notificationObservers;
  std::function<void(bool)> _callback;
}

- (instancetype)initWithView:(REAUIView *)view
                    selector:(NSString *)selectorName
                    callback:(std::function<void(bool)>)callback
{
  if (self = [super init]) {
    _view = view;
    _callback = std::move(callback);
    [self attachSelector:selectorName toView:view];
  }
  return self;
}

- (void)attachSelector:(NSString *)selectorName toView:(REAUIView *)view
{
  NSLog(@"[PseudoSelector] attachSelector: %@ to view: %@", selectorName, view);
  if ([selectorName isEqualToString:@":active"]) {
    [self attachActiveToView:view];
  } else if ([selectorName isEqualToString:@":hover"]) {
    [self attachHoverToView:view];
  } else if ([selectorName isEqualToString:@":focus"]) {
    [self attachFocusToView:view];
  }
}

- (void)attachActiveToView:(REAUIView *)view
{
  UILongPressGestureRecognizer *recognizer =
      [[UILongPressGestureRecognizer alloc] initWithTarget:self action:@selector(handleActiveGesture:)];
  recognizer.minimumPressDuration = 0;
  recognizer.delegate = self;
  recognizer.cancelsTouchesInView = NO;
  [view addGestureRecognizer:recognizer];
  _gestureRecognizer = recognizer;
  NSLog(@"[PseudoSelector] attached UILongPressGestureRecognizer (minimumPressDuration=0) to view: %@", view);
}

- (void)attachHoverToView:(REAUIView *)view
{
  if (@available(iOS 13.0, *)) {
    UIHoverGestureRecognizer *recognizer =
        [[UIHoverGestureRecognizer alloc] initWithTarget:self action:@selector(handleHoverGesture:)];
    recognizer.delegate = self;
    [view addGestureRecognizer:recognizer];
    _gestureRecognizer = recognizer;
    NSLog(@"[PseudoSelector] attached UIHoverGestureRecognizer to view: %@", view);
  }
}

- (void)attachFocusToView:(REAUIView *)view
{
  NSNotificationCenter *nc = [NSNotificationCenter defaultCenter];
  __weak REAUIView *weakView = view;
  // Capture callback by value to avoid retain cycle: self -> _notificationObservers -> blocks -> self.
  // note.object is the UITextField/UITextView, which is a descendant of the RN wrapper view (view with the tag).
  auto callback = _callback;

  auto isOurs = ^BOOL(NSNotification *note) {
    REAUIView *strongView = weakView;
    return strongView != nil &&
           [note.object isKindOfClass:[UIView class]] &&
           [(UIView *)note.object isDescendantOfView:strongView];
  };

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
      NSLog(@"[PseudoSelector] :hover → true");
      _callback(true);
      break;
    case UIGestureRecognizerStateEnded:
    case UIGestureRecognizerStateCancelled:
    case UIGestureRecognizerStateFailed:
      NSLog(@"[PseudoSelector] :hover → false");
      _callback(false);
      break;
    default:
      break;
  }
}

- (void)handleActiveGesture:(UILongPressGestureRecognizer *)recognizer
{
  NSLog(@"[PseudoSelector] handleActiveGesture state: %ld", (long)recognizer.state);
  switch (recognizer.state) {
    case UIGestureRecognizerStateBegan:
      NSLog(@"[PseudoSelector] :active → true");
      _callback(true);
      break;
    case UIGestureRecognizerStateEnded:
    case UIGestureRecognizerStateCancelled:
    case UIGestureRecognizerStateFailed:
      NSLog(@"[PseudoSelector] :active → false");
      _callback(false);
      break;
    default:
      break;
  }
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
