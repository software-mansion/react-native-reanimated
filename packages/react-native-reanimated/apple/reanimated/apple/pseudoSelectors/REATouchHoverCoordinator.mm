#import <reanimated/apple/pseudoSelectors/REATouchHoverCoordinator.h>

#if !TARGET_OS_OSX && !TARGET_OS_TV

#import <UIKit/UIKit.h>

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

@interface REATouchPressEntry : NSObject {
 @public
  __weak id owner;
  __weak UIView *view;
  std::function<void(bool)> callback;
  BOOL deepest;
  BOOL activated;
}
@end
@implementation REATouchPressEntry
@end

@interface REAHoverTouchObserver : UIGestureRecognizer
@property (nonatomic, weak) REATouchHoverCoordinator *coordinator;
@end

@interface REATouchHoverCoordinator () <UIGestureRecognizerDelegate>
- (void)primaryTouchBegan:(NSSet<UITouch *> *)touches;
- (void)primaryTouchMoved:(NSSet<UITouch *> *)touches;
- (void)primaryTouchEnded:(NSSet<UITouch *> *)touches;
- (void)touchSequenceEnded;
@end

@implementation REAHoverTouchObserver
- (void)touchesBegan:(NSSet<UITouch *> *)touches withEvent:(UIEvent *)event
{
  [self.coordinator primaryTouchBegan:touches];
}
- (void)touchesMoved:(NSSet<UITouch *> *)touches withEvent:(UIEvent *)event
{
  [self.coordinator primaryTouchMoved:touches];
}
- (void)touchesEnded:(NSSet<UITouch *> *)touches withEvent:(UIEvent *)event
{
  [self.coordinator primaryTouchEnded:touches];
  [self failIfSequenceEnded:event];
}
- (void)touchesCancelled:(NSSet<UITouch *> *)touches withEvent:(UIEvent *)event
{
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
  [self.coordinator touchSequenceEnded];
}
@end

static const CGFloat kPrimaryTouchTapMovement = 10.0;

@implementation REATouchHoverCoordinator {
  NSMutableArray<REATouchHoverEntry *> *_entries;
  NSMutableArray<REATouchPressEntry *> *_pressEntries;
  REAHoverTouchObserver *_windowObserver;
  __weak UIWindow *_observedWindow;
  __weak UITouch *_primaryTouch;
  CGPoint _primaryTouchDownPoint;
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
    _pressEntries = [NSMutableArray array];
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

- (void)registerPressObserver:(id)owner
                         view:(UIView *)view
                      deepest:(BOOL)deepest
                     callback:(std::function<void(bool)>)callback
{
  [self unregisterPressObserver:owner];
  REATouchPressEntry *entry = [REATouchPressEntry new];
  entry->owner = owner;
  entry->view = view;
  entry->callback = std::move(callback);
  entry->deepest = deepest;
  entry->activated = NO;
  [_pressEntries addObject:entry];
  [self refreshWindowObserver];
}

- (void)unregisterPressObserver:(id)owner
{
  NSMutableArray<REATouchPressEntry *> *removed = [NSMutableArray array];
  for (REATouchPressEntry *entry in _pressEntries) {
    if (entry->owner == nil || entry->owner == owner) {
      [self setPressEntry:entry activated:NO];
      [removed addObject:entry];
    }
  }
  if (removed.count == 0) {
    return;
  }
  [_pressEntries removeObjectsInArray:removed];
  if (_entries.count == 0 && _pressEntries.count == 0) {
    [self removeWindowObserver];
  }
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
  if (_entries.count == 0 && _pressEntries.count == 0) {
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
  _primaryTouch = nil;
  [self clearAll];
  [self deactivateAllPressEntries];
}

- (void)purgeEntries:(NSArray<REATouchHoverEntry *> *)batch
{
  if (batch.count == 0) {
    return;
  }
  [_entries removeObjectsInArray:batch];
  if (_entries.count == 0 && _pressEntries.count == 0) {
    [self removeWindowObserver];
  }
}

#pragma mark - Primary-touch lifecycle

- (void)primaryTouchBegan:(NSSet<UITouch *> *)touches
{
  if (_primaryTouch != nil) {
    return;
  }
  UIWindow *window = _observedWindow;
  UITouch *touch = touches.anyObject;
  if (window == nil || touch == nil) {
    return;
  }
  _primaryTouch = touch;
  _primaryTouchDownPoint = [touch locationInView:window];
  UIView *hit = [self hitTestInWindow:window atPoint:_primaryTouchDownPoint];
  [self hoverBranchOfHitView:hit];
  [self activateRescuedPressEntriesInWindow:window bumpedHit:hit];
}

- (void)primaryTouchMoved:(NSSet<UITouch *> *)touches
{
  if (_primaryTouch == nil || ![touches containsObject:_primaryTouch]) {
    return;
  }
  UIWindow *window = _observedWindow;
  if (window == nil) {
    return;
  }
  CGPoint point = [_primaryTouch locationInView:window];
  CGFloat dx = point.x - _primaryTouchDownPoint.x;
  CGFloat dy = point.y - _primaryTouchDownPoint.y;
  if (dx * dx + dy * dy > kPrimaryTouchTapMovement * kPrimaryTouchTapMovement) {
    [self deactivateAllPressEntries];
  }
}

- (void)primaryTouchEnded:(NSSet<UITouch *> *)touches
{
  if (_primaryTouch == nil || ![touches containsObject:_primaryTouch]) {
    return;
  }
  [self deactivateAllPressEntries];
  UIWindow *window = _observedWindow;
  if (window != nil) {
    CGPoint releasePoint = [_primaryTouch locationInView:window];
    CGFloat dx = releasePoint.x - _primaryTouchDownPoint.x;
    CGFloat dy = releasePoint.y - _primaryTouchDownPoint.y;
    if (dx * dx + dy * dy <= kPrimaryTouchTapMovement * kPrimaryTouchTapMovement) {
      return;
    }
  }
  UIView *hit = window != nil ? [self hitTestInWindow:window atPoint:[_primaryTouch locationInView:window]] : nil;
  for (REATouchHoverEntry *entry in _entries) {
    if (entry->hovered && ![self isView:entry->view onBranchOfHitView:hit]) {
      [self setEntry:entry hovered:NO];
    }
  }
}

- (void)touchSequenceEnded
{
  _primaryTouch = nil;
  [self deactivateAllPressEntries];
}

#pragma mark - Fallback press path

// Activates press entries whose views only became hit-testable thanks to the alpha bump. Views
// UIKit can reach on its own are excluded here: their UILongPressGestureRecognizer handles the
// press, so the two paths never both fire for one view.
- (void)activateRescuedPressEntriesInWindow:(UIWindow *)window bumpedHit:(UIView *)bumpedHit
{
  if (_pressEntries.count == 0 || bumpedHit == nil) {
    return;
  }
  UIView *plainHit = [window hitTest:_primaryTouchDownPoint withEvent:nil];
  UIView *deepestPressView = nil;
  for (UIView *current = bumpedHit; current != nil && deepestPressView == nil; current = current.superview) {
    for (REATouchPressEntry *entry in _pressEntries) {
      if (entry->view == current) {
        deepestPressView = current;
        break;
      }
    }
  }
  for (REATouchPressEntry *entry in _pressEntries) {
    UIView *view = entry->view;
    if (view == nil || ![self isView:view onBranchOfHitView:bumpedHit] ||
        [self isView:view onBranchOfHitView:plainHit]) {
      continue;
    }
    if (entry->deepest && view != deepestPressView) {
      continue;
    }
    [self setPressEntry:entry activated:YES];
  }
}

- (void)deactivateAllPressEntries
{
  for (REATouchPressEntry *entry in _pressEntries) {
    [self setPressEntry:entry activated:NO];
  }
}

- (void)setPressEntry:(REATouchPressEntry *)entry activated:(BOOL)activated
{
  if (entry->activated == activated) {
    return;
  }
  entry->activated = activated;
  if (entry->callback) {
    entry->callback(activated);
  }
}

#pragma mark - State reconciliation

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
  NSMutableArray<UIView *> *candidates = [NSMutableArray arrayWithCapacity:_entries.count + _pressEntries.count];
  for (REATouchHoverEntry *entry in _entries) {
    if (entry->view != nil) {
      [candidates addObject:entry->view];
    }
  }
  for (REATouchPressEntry *entry in _pressEntries) {
    if (entry->view != nil) {
      [candidates addObject:entry->view];
    }
  }
  NSMutableArray<UIView *> *lifted = nil;
  NSMutableArray<NSNumber *> *savedAlphas = nil;
  for (UIView *view in candidates) {
    if (view.alpha >= kHitTestableAlpha || [lifted containsObject:view]) {
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

- (void)hoverBranchOfHitView:(UIView *)hit
{
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
    [self setEntry:entry hovered:[self isView:view onBranchOfHitView:hit]];
  }
  [self purgeEntries:dead];
}

- (BOOL)isView:(UIView *)view onBranchOfHitView:(UIView *)hit
{
  for (UIView *current = hit; current != nil; current = current.superview) {
    if (current == view) {
      return YES;
    }
  }
  return NO;
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
