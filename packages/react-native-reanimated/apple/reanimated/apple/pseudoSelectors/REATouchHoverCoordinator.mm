#import <reanimated/apple/pseudoSelectors/REATouchHoverCoordinator.h>

#if !TARGET_OS_OSX && !TARGET_OS_TV

#import <UIKit/UIKit.h>

/// One registration. Hover entries live in `_entries`, press entries in `_pressEntries`;
/// `deepest` distinguishes `:active-deepest` from `:active` and is unused for hover.
@interface REATouchEntry : NSObject {
 @public
  __weak id owner;
  __weak UIView *view;
  std::function<void(bool)> callback;
  BOOL engaged;
  BOOL deepest;
}
@end
@implementation REATouchEntry
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
  NSMutableArray<REATouchEntry *> *_entries;
  NSMutableArray<REATouchEntry *> *_pressEntries;
  REAHoverTouchObserver *_windowObserver;
  __weak UIWindow *_observedWindow;
  __weak UITouch *_primaryTouch;
  CGPoint _primaryTouchDownPoint;
  BOOL _pressGateHeld;
  __weak UITouch *_resolvedHitsTouch;
  CGPoint _resolvedHitsPoint;
  __weak UIView *_resolvedBumpedHit;
  __weak UIView *_resolvedPlainHit;
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
  REATouchEntry *entry = [REATouchEntry new];
  entry->owner = owner;
  entry->view = view;
  entry->callback = std::move(callback);
  [_entries addObject:entry];
  [self refreshWindowObserver];
}

- (void)unregisterObserver:(id)owner
{
  NSMutableArray<REATouchEntry *> *removed = [NSMutableArray array];
  for (REATouchEntry *entry in _entries) {
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
  REATouchEntry *entry = [REATouchEntry new];
  entry->owner = owner;
  entry->view = view;
  entry->callback = std::move(callback);
  entry->deepest = deepest;
  [_pressEntries addObject:entry];
  [self refreshWindowObserver];
}

- (void)unregisterPressObserver:(id)owner
{
  NSMutableArray<REATouchEntry *> *removed = [NSMutableArray array];
  for (REATouchEntry *entry in _pressEntries) {
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
  [self endPressSequence];
}

- (void)purgeEntries:(NSArray<REATouchEntry *> *)batch
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
  UIView *bumpedHit = nil;
  UIView *plainHit = nil;
  [self resolveHitsForTouch:touch inWindow:window atPoint:_primaryTouchDownPoint bumped:&bumpedHit plain:&plainHit];
  [self hoverBranchOfHitView:bumpedHit];
  [self activateRescuedPressEntriesWithBumpedHit:bumpedHit plainHit:plainHit];
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
    [self endPressSequence];
  }
}

- (void)primaryTouchEnded:(NSSet<UITouch *> *)touches
{
  if (_primaryTouch == nil || ![touches containsObject:_primaryTouch]) {
    return;
  }
  [self endPressSequence];
  UIWindow *window = _observedWindow;
  if (window != nil && [self isPointWithinTapSlop:[_primaryTouch locationInView:window]]) {
    return;
  }
  UIView *hit = window != nil ? [self hitTestInWindow:window atPoint:[_primaryTouch locationInView:window]] : nil;
  for (REATouchEntry *entry in _entries) {
    if (entry->engaged && ![self isView:entry->view onBranchOfHitView:hit]) {
      [self setEntry:entry engaged:NO];
    }
  }
}

- (void)touchSequenceEnded
{
  _primaryTouch = nil;
  _resolvedHitsTouch = nil;
  [self endPressSequence];
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
- (void)activateRescuedPressEntriesWithBumpedHit:(UIView *)bumpedHit plainHit:(UIView *)plainHit
{
  if (_pressEntries.count == 0 || bumpedHit == nil) {
    return;
  }
  UIView *deepestPressView = [self deepestRescuedPressViewUnder:bumpedHit reachableHit:plainHit];
  BOOL engagedAny = NO;
  for (REATouchEntry *entry in _pressEntries) {
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
  for (REATouchEntry *entry in _pressEntries) {
    [self setEntry:entry engaged:NO];
  }
}

// The gate outlives the engaged state on purpose: a press dismissed by dragging keeps the touch
// sequence in charge, exactly as the recognizer path keeps its own claim until the gesture ends.
- (void)endPressSequence
{
  [self deactivateAllPressEntries];
  if (_pressGateHeld) {
    _pressGateHeld = NO;
    REAPseudoPressGateRelease();
  }
}

#pragma mark - State reconciliation

- (void)setEntry:(REATouchEntry *)entry engaged:(BOOL)engaged
{
  if (entry->engaged == engaged) {
    return;
  }
  entry->engaged = engaged;
  if (entry->callback) {
    entry->callback(engaged);
  }
}

- (UIView *)rescuedPressViewForTouch:(UITouch *)touch inWindow:(UIWindow *)window atPoint:(CGPoint)point
{
  // Vetoing a recognizer for a press that nothing then engages would leave the touch dead.
  if (window == nil || window != _observedWindow || _pressEntries.count == 0) {
    return nil;
  }
  if (_primaryTouch != nil && _primaryTouch != touch) {
    return nil;
  }
  UIView *bumpedHit = nil;
  UIView *plainHit = nil;
  [self resolveHitsForTouch:touch inWindow:window atPoint:point bumped:&bumpedHit plain:&plainHit];
  return [self deepestRescuedPressViewUnder:bumpedHit reachableHit:plainHit];
}

// The view the press fallback owns at this point: the innermost registered one the alpha bump
// revealed. Anything UIKit can reach unaided is left to its own recognizer.
- (UIView *)deepestRescuedPressViewUnder:(UIView *)bumpedHit reachableHit:(UIView *)plainHit
{
  for (UIView *current = bumpedHit; current != nil; current = current.superview) {
    if ([self isPressRegisteredView:current] && ![self isView:current onBranchOfHitView:plainHit]) {
      return current;
    }
  }
  return nil;
}

// Both hit tests the press paths need. The engaging path and every :active-deepest recognizer on
// the way down ask for the same point, so resolving once per touch saves a full window walk each
// and leaves them no way to decide over different answers.
- (void)resolveHitsForTouch:(UITouch *)touch
                   inWindow:(UIWindow *)window
                    atPoint:(CGPoint)point
                     bumped:(UIView **)bumpedHit
                      plain:(UIView **)plainHit
{
  if (touch == nil || touch != _resolvedHitsTouch || !CGPointEqualToPoint(point, _resolvedHitsPoint)) {
    _resolvedHitsTouch = touch;
    _resolvedHitsPoint = point;
    _resolvedBumpedHit = [self hitTestInWindow:window atPoint:point];
    _resolvedPlainHit = [window hitTest:point withEvent:nil];
  }
  *bumpedHit = _resolvedBumpedHit;
  *plainHit = _resolvedPlainHit;
}

- (BOOL)isPressRegisteredView:(UIView *)view
{
  for (REATouchEntry *entry in _pressEntries) {
    if (entry->view == view) {
      return YES;
    }
  }
  return NO;
}

// UIKit's -hitTest: skips views with alpha below ~0.01, so an `opacity: 0` view is unreachable. Bump each
// near-zero registered view over the threshold for the hit-test, restoring before compositing (never drawn).
- (UIView *)hitTestInWindow:(UIWindow *)window atPoint:(CGPoint)point
{
  static const CGFloat kHitTestableAlpha = 0.02;
  NSArray<REATouchEntry *> *entryLists[] = {_entries, _pressEntries};
  NSMutableArray<UIView *> *lifted = nil;
  NSMutableArray<NSNumber *> *savedAlphas = nil;
  for (NSUInteger listIndex = 0; listIndex < 2; listIndex++) {
    for (REATouchEntry *entry in entryLists[listIndex]) {
      UIView *view = entry->view;
      // A view carrying both `:hover` and `:active` is in both lists, and the bumped alpha reads
      // back a hair below the threshold, so only this check keeps its original alpha restorable.
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
  NSMutableArray<REATouchEntry *> *dead = nil;
  for (REATouchEntry *entry in _entries) {
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
  for (REATouchEntry *entry in _entries) {
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
