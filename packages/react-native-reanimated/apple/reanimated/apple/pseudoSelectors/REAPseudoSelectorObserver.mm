#import <reanimated/apple/pseudoSelectors/REAPseudoSelectorObserver.h>

#if !TARGET_OS_OSX
#import <UIKit/UIKit.h>
typedef UIGestureRecognizer REAGestureRecognizer;
#else
#import <AppKit/AppKit.h>
typedef NSGestureRecognizer REAGestureRecognizer;
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
  // View the recognizer is attached to: `_view` for normal views, or the nearest
  // interactive ancestor for non-interactive ones (e.g. SVG elements). See
  // `interactionViewForView:`.
  __weak REAUIView *_interactionView;
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
#if !TARGET_OS_OSX
  // Whether this observer marked its SVG shape touch-`responsible` (see sSvgResponsibleRefs).
  BOOL _markedSvgResponsible;
#endif
}

#if !TARGET_OS_OSX
// Ref-count of pseudo observers keeping each SVG shape touch-`responsible` (set via KVC, since reanimated
// must not link react-native-svg). Marking it lets RNSVGSvgView's per-path hitTest resolve the shape, so
// overlapping `:active-deepest` shapes arbitrate to the topmost. Reverted when the last observer detaches.
static NSMapTable<REAUIView *, NSNumber *> *sSvgResponsibleRefs;
#endif

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
  REAUIView *interactionView = [self interactionViewForView:view];
  _interactionView = interactionView;
  switch (selector) {
    case reanimated::PseudoSelector::Active:
    case reanimated::PseudoSelector::ActiveDeepest:
      [self attachActiveGestureRecognizerToView:interactionView];
      [self markSvgResponsible];
      break;
    case reanimated::PseudoSelector::Hover:
      [self attachHoverToView:interactionView];
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

// Returns the view the recognizer should attach to.
//
// SVG elements force `isUserInteractionEnabled` to NO and their container
// swallows touches that miss a "responsible" node, so a recognizer on the SVG
// element never fires. To support pseudo selectors on SVG without a responder
// prop, attach to the nearest non-SVG interactive ancestor and scope the touch
// back to the element's bounds in `isTouchInScope:`. Regular views resolve to
// themselves.
- (REAUIView *)interactionViewForView:(REAUIView *)view
{
#if !TARGET_OS_OSX
  REAUIView *candidate = view;
  while (candidate != nil &&
         (!candidate.isUserInteractionEnabled || [NSStringFromClass([candidate class]) hasPrefix:@"RNSVG"])) {
    candidate = candidate.superview;
  }
  return candidate ?: view;
#else
  return view;
#endif
}

// When the recognizer is on an ancestor (SVG case), the gesture targets this
// element only if the touch lands within its bounds. Directly-attached
// recognizers are always in scope.
- (BOOL)isTouchInScope:(REAGestureRecognizer *)recognizer
{
  REAUIView *element = _view;
  if (!element || element == _interactionView) {
    return YES;
  }
  CGPoint location = [recognizer locationInView:element];
  return CGRectContainsPoint(element.bounds, location);
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
// Fires only when this view's own text input gains focus. resolveView returns
// the Fabric wrapper (RCTTextInputComponentView); the notification object is
// the inner UITextField/UITextView, a direct child of the wrapper, so
// `superview == strongView` is the right test.
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
    case UIGestureRecognizerStateChanged:
      // The pointer can move on and off the element within the ancestor, so
      // re-evaluate scope on every change (always YES when directly attached).
      _callback([self isTouchInScope:recognizer]);
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
      _callback([self isTouchInScope:recognizer]);
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
// _view is an SVG shape when the recognizer moved to an interaction ancestor and _view is an RNSVG node.
- (BOOL)isSvgShape
{
  return _view != nil && _view != _interactionView && [NSStringFromClass([_view class]) hasPrefix:@"RNSVG"];
}

// The RNSVGSvgView hosting _view: the topmost consecutive RNSVG ancestor (walking past any RNSVG groups).
- (REAUIView *)svgViewAncestor
{
  REAUIView *svgView = nil;
  for (REAUIView *v = _view; v != nil && [NSStringFromClass([v class]) hasPrefix:@"RNSVG"]; v = v.superview) {
    svgView = v;
  }
  return svgView;
}

// Mark _view touch-`responsible` (KVC) so RNSVGSvgView's per-path hitTest resolves it; ref-counted so
// several selectors on one shape don't each toggle it.
- (void)markSvgResponsible
{
  if (_markedSvgResponsible || ![self isSvgShape] || ![_view respondsToSelector:@selector(setResponsible:)]) {
    return;
  }
  if (sSvgResponsibleRefs == nil) {
    sSvgResponsibleRefs = [NSMapTable weakToStrongObjectsMapTable];
  }
  NSInteger count = [[sSvgResponsibleRefs objectForKey:_view] integerValue];
  if (count == 0) {
    [_view setValue:@YES forKey:@"responsible"];
  }
  [sSvgResponsibleRefs setObject:@(count + 1) forKey:_view];
  _markedSvgResponsible = YES;
}

- (void)unmarkSvgResponsible
{
  if (!_markedSvgResponsible) {
    return;
  }
  _markedSvgResponsible = NO;
  REAUIView *shape = _view;
  if (shape == nil || sSvgResponsibleRefs == nil) {
    return;
  }
  NSInteger count = [[sSvgResponsibleRefs objectForKey:shape] integerValue];
  if (count <= 1) {
    [sSvgResponsibleRefs removeObjectForKey:shape];
    if ([shape respondsToSelector:@selector(setResponsible:)]) {
      [shape setValue:@NO forKey:@"responsible"];
    }
  } else {
    [sSvgResponsibleRefs setObject:@(count - 1) forKey:shape];
  }
}
#endif

- (BOOL)gestureRecognizerShouldBegin:(REAGestureRecognizer *)gestureRecognizer
{
  REAUIView *view = _view;
  if (!view) {
    return NO;
  }
  // The descendant walk is only for :active-deepest; every other selector
  // sharing this delegate (e.g. :active, :hover) always allows.
  if (_selector != reanimated::PseudoSelector::ActiveDeepest) {
    return YES;
  }
#if !TARGET_OS_OSX
  // SVG shapes are virtual children on a shared SvgView, so the descendant walk below can't see them
  // ([view hitTest:] on the interaction ancestor is self-or-nil). Arbitrate per-path via the SvgView's
  // own hitTest, which - with the shapes marked responsible - returns the topmost shape under the point,
  // so this observer wins only when that shape is its own.
  if ([self isSvgShape]) {
    REAUIView *svgView = [self svgViewAncestor];
    if (svgView == nil) {
      return YES;
    }
    return [svgView hitTest:[gestureRecognizer locationInView:svgView] withEvent:nil] == view;
  }
#endif
  // Walk up from the hit view: if a descendant already has an :active-deepest
  // or :active recognizer, it owns the touch.
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

- (BOOL)gestureRecognizer:(REAGestureRecognizer *)gestureRecognizer
    shouldRecognizeSimultaneouslyWithGestureRecognizer:(REAGestureRecognizer *)otherGestureRecognizer
{
  return YES;
}

- (void)detach
{
  REAUIView *gestureHost = _interactionView ?: _view;
  if (_gestureRecognizer && gestureHost) {
    [gestureHost removeGestureRecognizer:_gestureRecognizer];
  }
  _gestureRecognizer = nil;
#if !TARGET_OS_OSX
  [self unmarkSvgResponsible];
#endif
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
