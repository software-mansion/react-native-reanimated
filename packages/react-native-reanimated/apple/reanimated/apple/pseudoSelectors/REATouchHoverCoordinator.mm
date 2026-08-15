#import <reanimated/apple/pseudoSelectors/REATouchHoverCoordinator.h>

#if !TARGET_OS_OSX && !TARGET_OS_TV

#import <UIKit/UIKit.h>

@interface REATouchEntryBase : NSObject {
 @public
  __weak id owner;
  __weak UIView *view;
  std::function<void(bool)> callback;
  /// Last state delivered to the callback: hover for hover entries, press for press entries.
  BOOL engaged;
}
@end
@implementation REATouchEntryBase
@end

@interface REATouchHoverEntry : REATouchEntryBase
@end
@implementation REATouchHoverEntry
@end

@interface REATouchPressEntry : REATouchEntryBase {
 @public
  BOOL deepest;
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
- (void)primaryTouchCancelled:(NSSet<UITouch *> *)touches;
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
  [self.coordinator primaryTouchCancelled:touches];
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
  BOOL _pressGateHeld;
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
  [_entries addObject:entry];
  [self refreshWindowObserver];
}

- (void)unregisterObserver:(id)owner
{
  NSMutableArray<REATouchHoverEntry *> *removed = [NSMutableArray array];
  for (REATouchHoverEntry *entry in _entries) {
    if (entry->owner == nil || entry->owner == owner) {
      [self setEntry:entry engaged:NO];
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
  [_pressEntries addObject:entry];
  [self refreshWindowObserver];
}

- (void)unregisterPressObserver:(id)owner
{
  NSMutableArray<REATouchPressEntry *> *removed = [NSMutableArray array];
  for (REATouchPressEntry *entry in _pressEntries) {
    if (entry->owner == nil || entry->owner == owner) {
      [self setEntry:entry engaged:NO];
      [removed addObject:entry];
    }
  }
  if (removed.count == 0) {
    return;
  }
  [_pressEntries removeObjectsInArray:removed];
  [self removeWindowObserverIfIdle];
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
  [self removeWindowObserverIfIdle];
}

- (void)removeWindowObserverIfIdle
{
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
  if (![self isPointWithinTapSlop:[_primaryTouch locationInView:window]]) {
    [self deactivateAllPressEntries];
  }
}

- (void)primaryTouchCancelled:(NSSet<UITouch *> *)touches
{
  if (_primaryTouch != nil && [touches containsObject:_primaryTouch]) {
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
  if (window != nil && [self isPointWithinTapSlop:[_primaryTouch locationInView:window]]) {
    return;
  }
  UIView *hit = window != nil ? [self hitTestInWindow:window atPoint:[_primaryTouch locationInView:window]] : nil;
  for (REATouchHoverEntry *entry in _entries) {
    if (entry->engaged && ![self isView:entry->view onBranchOfHitView:hit]) {
      [self setEntry:entry engaged:NO];
    }
  }
}

- (void)touchSequenceEnded
{
  _primaryTouch = nil;
  [self deactivateAllPressEntries];
}

- (BOOL)isPointWithinTapSlop:(CGPoint)point
{
  CGFloat dx = point.x - _primaryTouchDownPoint.x;
  CGFloat dy = point.y - _primaryTouchDownPoint.y;
  return dx * dx + dy * dy <= kPrimaryTouchTapMovement * kPrimaryTouchTapMovement;
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
  BOOL engagedAny = NO;
  for (REATouchPressEntry *entry in _pressEntries) {
    UIView *view = entry->view;
    if (view == nil || ![self isView:view onBranchOfHitView:bumpedHit] ||
        [self isView:view onBranchOfHitView:plainHit]) {
      continue;
    }
    if (entry->deepest && view != deepestPressView) {
      continue;
    }
    [self setEntry:entry engaged:YES];
    engagedAny = YES;
  }
  if (engagedAny && !_pressGateHeld) {
    _pressGateHeld = YES;
    REAPseudoPressGateRetain(_primaryTouch);
  }
}

- (void)deactivateAllPressEntries
{
  for (REATouchPressEntry *entry in _pressEntries) {
    [self setEntry:entry engaged:NO];
  }
  if (_pressGateHeld) {
    _pressGateHeld = NO;
    REAPseudoPressGateRelease();
  }
}

#pragma mark - State reconciliation

- (void)setEntry:(REATouchEntryBase *)entry engaged:(BOOL)engaged
{
  if (entry->engaged == engaged) {
    return;
  }
  entry->engaged = engaged;
  if (entry->callback) {
    entry->callback(engaged);
  }
}

// UIKit's -hitTest: skips views with alpha below ~0.01, so an `opacity: 0` view is unreachable. Bump each
// near-zero registered view over the threshold for the hit-test, restoring before compositing (never drawn).
- (UIView *)hitTestInWindow:(UIWindow *)window atPoint:(CGPoint)point
{
  static const CGFloat kHitTestableAlpha = 0.02;
  NSArray<REATouchEntryBase *> *entryLists[] = {_entries, _pressEntries};
  NSMutableArray<UIView *> *lifted = nil;
  NSMutableArray<NSNumber *> *savedAlphas = nil;
  for (NSUInteger listIndex = 0; listIndex < 2; listIndex++) {
    for (REATouchEntryBase *entry in entryLists[listIndex]) {
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
      [self setEntry:entry engaged:NO];
      if (dead == nil) {
        dead = [NSMutableArray array];
      }
      [dead addObject:entry];
      continue;
    }
    [self setEntry:entry engaged:[self isView:view onBranchOfHitView:hit]];
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
    [self setEntry:entry engaged:NO];
  }
}

- (BOOL)gestureRecognizer:(UIGestureRecognizer *)gestureRecognizer
    shouldRecognizeSimultaneouslyWithGestureRecognizer:(UIGestureRecognizer *)otherGestureRecognizer
{
  return YES;
}

@end

#endif
