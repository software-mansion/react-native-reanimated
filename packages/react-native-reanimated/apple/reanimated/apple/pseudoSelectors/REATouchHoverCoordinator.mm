#import <reanimated/apple/pseudoSelectors/REATouchHoverCoordinator.h>

#if !TARGET_OS_OSX && !TARGET_OS_TV

#import <UIKit/UIKit.h>

/// One registered touch-`:hover` view (weak owner = unregister key, weak view = bounds).
@interface REATouchHoverEntry : NSObject {
 @public
  __weak id owner;
  __weak UIView *view;
  std::function<void(bool)> callback;
  BOOL hovered;
}
@end
@implementation REATouchHoverEntry
@end

/// Passive key-window touch observer. It only ever transitions to `.failed` (once every finger of a
/// sequence has lifted), so it never claims the gesture or interferes with the per-view `:active` /
/// `:active-deepest` recognizers. Reaching that terminal state each sequence is essential: UIKit only
/// runs `-reset` after a terminal transition, and an observer that stays `.possible` forever is never
/// reset, wedging the key window's gesture environment so a UIScrollView pan can no longer begin.
@interface REAHoverTouchObserver : UIGestureRecognizer
@property (nonatomic, weak) REATouchHoverCoordinator *coordinator;
@end

@interface REATouchHoverCoordinator () <UIGestureRecognizerDelegate>
- (void)observeTouchBegan:(UITouch *)touch;
- (void)observeTouchMoved:(UITouch *)touch;
- (void)observeTouchCancelled;
@end

@implementation REAHoverTouchObserver
- (void)touchesBegan:(NSSet<UITouch *> *)touches withEvent:(UIEvent *)event
{
  [self.coordinator observeTouchBegan:touches.anyObject];
}
- (void)touchesMoved:(NSSet<UITouch *> *)touches withEvent:(UIEvent *)event
{
  [self.coordinator observeTouchMoved:touches.anyObject];
}
- (void)touchesEnded:(NSSet<UITouch *> *)touches withEvent:(UIEvent *)event
{
  [self failIfSequenceEnded:event];
}
- (void)touchesCancelled:(NSSet<UITouch *> *)touches withEvent:(UIEvent *)event
{
  [self.coordinator observeTouchCancelled];
  [self failIfSequenceEnded:event];
}
- (void)failIfSequenceEnded:(UIEvent *)event
{
  for (UITouch *touch in event.allTouches) {
    if (touch.phase != UITouchPhaseEnded && touch.phase != UITouchPhaseCancelled) {
      return;
    }
  }
  self.state = UIGestureRecognizerStateFailed;
}
@end

static const CGFloat kTouchHoverSlop = 10.0;

@implementation REATouchHoverCoordinator {
  NSMutableArray<REATouchHoverEntry *> *_entries;
  REAHoverTouchObserver *_windowObserver;
  __weak UIWindow *_observedWindow;
  CGPoint _windowTouchStart;
}

+ (instancetype)sharedCoordinator
{
  static REATouchHoverCoordinator *instance;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{ instance = [[REATouchHoverCoordinator alloc] init]; });
  return instance;
}

- (instancetype)init
{
  if (self = [super init]) {
    _entries = [NSMutableArray array];
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(refreshWindowObserver)
                                                 name:UIWindowDidBecomeKeyNotification
                                               object:nil];
  }
  return self;
}

- (void)registerObserver:(id)owner view:(UIView *)view callback:(std::function<void(bool)>)callback
{
  [self unregisterObserver:owner];
  REATouchHoverEntry *entry = [REATouchHoverEntry new];
  entry->owner = owner;
  entry->view = view;
  entry->callback = std::move(callback);
  entry->hovered = NO;
  [_entries addObject:entry];
  [self refreshWindowObserver];
}

- (void)unregisterObserver:(id)owner
{
  NSMutableArray<REATouchHoverEntry *> *removed = [NSMutableArray array];
  for (REATouchHoverEntry *entry in _entries) {
    if (entry->owner == nil || entry->owner == owner) {
      [self setEntry:entry hovered:NO];
      [removed addObject:entry];
    }
  }
  [self purgeEntries:removed];
}

- (UIWindow *)activeKeyWindow
{
  for (UIScene *scene in UIApplication.sharedApplication.connectedScenes) {
    if (![scene isKindOfClass:[UIWindowScene class]]) {
      continue;
    }
    for (UIWindow *window in ((UIWindowScene *)scene).windows) {
      if (window.isKeyWindow) {
        return window;
      }
    }
  }
  return nil;
}

- (void)refreshWindowObserver
{
  if (_entries.count == 0) {
    return;
  }
  UIWindow *keyWindow = [self activeKeyWindow];
  if (keyWindow == nil || (_observedWindow == keyWindow && _windowObserver != nil)) {
    return;
  }
  [self removeWindowObserver];
  REAHoverTouchObserver *observer = [[REAHoverTouchObserver alloc] init];
  observer.coordinator = self;
  observer.cancelsTouchesInView = NO;
  observer.delaysTouchesBegan = NO;
  observer.delaysTouchesEnded = NO;
  observer.delegate = self;
  [keyWindow addGestureRecognizer:observer];
  _windowObserver = observer;
  _observedWindow = keyWindow;
}

- (void)removeWindowObserver
{
  if (_windowObserver != nil && _observedWindow != nil) {
    [_observedWindow removeGestureRecognizer:_windowObserver];
  }
  _windowObserver = nil;
  _observedWindow = nil;
  // Clear any sticky :hover left in the window we just stopped observing (e.g. when a modal/alert
  // becomes key and we rebind), mirroring Android's removeWindowObserver.
  [self clearAll];
}

- (void)purgeEntries:(NSArray<REATouchHoverEntry *> *)batch
{
  if (batch.count == 0) {
    return;
  }
  [_entries removeObjectsInArray:batch];
  if (_entries.count == 0) {
    [self removeWindowObserver];
  }
}

- (void)observeTouchBegan:(UITouch *)touch
{
  UIWindow *window = _observedWindow;
  if (window == nil || touch == nil) {
    return;
  }
  CGPoint inWindow = [touch locationInView:window];
  _windowTouchStart = inWindow;
  [self recomputeAtWindowPoint:inWindow];
}

- (void)observeTouchMoved:(UITouch *)touch
{
  // A scroll/drag (movement past a small slop) dismisses sticky :hover, matching Chrome.
  UIWindow *window = _observedWindow;
  if (window == nil || touch == nil) {
    return;
  }
  CGPoint inWindow = [touch locationInView:window];
  CGFloat dx = inWindow.x - _windowTouchStart.x;
  CGFloat dy = inWindow.y - _windowTouchStart.y;
  if (dx * dx + dy * dy > kTouchHoverSlop * kTouchHoverSlop) {
    [self clearAll];
  }
}

- (void)observeTouchCancelled
{
  [self clearAll];
}

- (void)setEntry:(REATouchHoverEntry *)entry hovered:(BOOL)hovered
{
  if (entry->hovered == hovered) {
    return;
  }
  entry->hovered = hovered;
  if (entry->callback) {
    entry->callback(hovered);
  }
}

// UIKit's -hitTest: skips views with alpha below ~0.01, so an `opacity: 0` view is unreachable. Bump each
// near-zero registered view over the threshold for the hit-test, restoring before compositing (never drawn).
- (UIView *)hitTestInWindow:(UIWindow *)window atPoint:(CGPoint)point
{
  static const CGFloat kHitTestableAlpha = 0.02;
  NSMutableArray<UIView *> *lifted = nil;
  NSMutableArray<NSNumber *> *savedAlphas = nil;
  for (REATouchHoverEntry *entry in _entries) {
    UIView *view = entry->view;
    if (view == nil || view.alpha >= kHitTestableAlpha || [lifted containsObject:view]) {
      continue;
    }
    if (lifted == nil) {
      lifted = [NSMutableArray array];
      savedAlphas = [NSMutableArray array];
    }
    [lifted addObject:view];
    [savedAlphas addObject:@(view.alpha)];
    view.alpha = kHitTestableAlpha;
  }
  UIView *hit = [window hitTest:point withEvent:nil];
  [lifted enumerateObjectsUsingBlock:^(UIView *view, NSUInteger index, BOOL *stop) {
    view.alpha = savedAlphas[index].floatValue;
  }];
  return hit;
}

- (void)recomputeAtWindowPoint:(CGPoint)inWindow
{
  // Hit-test the topmost view: :hover applies to it and its ancestors only (matching CSS), so views
  // that merely overlap the hit branch no longer all activate. hitTest already honors z-order,
  // userInteractionEnabled and hidden, and returns nil over blank space (clears all :hover).
  UIView *hit = nil;
  UIWindow *window = _observedWindow;
  if (window != nil) {
    hit = [self hitTestInWindow:window atPoint:inWindow];
  }
  NSMutableArray<REATouchHoverEntry *> *dead = nil;
  for (REATouchHoverEntry *entry in _entries) {
    UIView *view = entry->view;
    if (view == nil) {
      [self setEntry:entry hovered:NO];
      if (dead == nil) {
        dead = [NSMutableArray array];
      }
      [dead addObject:entry];
      continue;
    }
    BOOL wantHover = NO;
    for (UIView *current = hit; current != nil; current = current.superview) {
      if (current == view) {
        wantHover = YES;
        break;
      }
    }
    [self setEntry:entry hovered:wantHover];
  }
  [self purgeEntries:dead];
}

- (void)clearAll
{
  for (REATouchHoverEntry *entry in _entries) {
    [self setEntry:entry hovered:NO];
  }
}

- (BOOL)gestureRecognizer:(UIGestureRecognizer *)gestureRecognizer
    shouldRecognizeSimultaneouslyWithGestureRecognizer:(UIGestureRecognizer *)otherGestureRecognizer
{
  return YES;
}

@end

#endif
