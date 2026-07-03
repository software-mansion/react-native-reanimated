#import <reanimated/apple/pseudoSelectors/REATouchHoverCoordinator.h>

#if !TARGET_OS_OSX && !TARGET_OS_TV

#import <UIKit/UIKit.h>

/// One registered touch-`:hover` view (weak owner = unregister key, weak view = hit-testing).
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
- (void)primaryTouchBegan:(NSSet<UITouch *> *)touches;
- (void)primaryTouchEnded:(NSSet<UITouch *> *)touches;
- (void)touchSequenceEnded;
@end

@implementation REAHoverTouchObserver
- (void)touchesBegan:(NSSet<UITouch *> *)touches withEvent:(UIEvent *)event
{
  [self.coordinator primaryTouchBegan:touches];
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

// Movement (points) below which a release counts as a stationary tap - the finger never left the
// touched branch, so the release re-hit-test is skipped. Matches UIKit's tap allowable-movement.
static const CGFloat kPrimaryTouchTapMovement = 10.0;

@implementation REATouchHoverCoordinator {
  NSMutableArray<REATouchHoverEntry *> *_entries;
  REAHoverTouchObserver *_windowObserver;
  __weak UIWindow *_observedWindow;
  // Only the first finger drives `:hover`; the rest are ignored, web-like. The claim is held until
  // every finger of the sequence lifts, so a later finger can never become a new primary mid-gesture.
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
  _primaryTouch = nil;
  // Drop any `:hover` left in the window we stopped observing (e.g. when a modal/alert becomes key
  // and we rebind), mirroring Android's removeWindowObserver.
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

#pragma mark - Primary-touch lifecycle

- (void)primaryTouchBegan:(NSSet<UITouch *> *)touches
{
  if (_primaryTouch != nil) {
    return; // A finger is already driving :hover; ignore the rest.
  }
  UIWindow *window = _observedWindow;
  UITouch *touch = touches.anyObject;
  if (window == nil || touch == nil) {
    return;
  }
  _primaryTouch = touch;
  _primaryTouchDownPoint = [touch locationInView:window];
  UIView *hit = [window hitTest:_primaryTouchDownPoint withEvent:nil];
  // Touch-down reconciles `:hover` to the touched branch right away: the new branch lights up and any
  // previously-hovered view is dropped on this same down, even if the touch later becomes a scroll.
  [self hoverBranchOfHitView:hit];
}

- (void)primaryTouchEnded:(NSSet<UITouch *> *)touches
{
  if (_primaryTouch == nil || ![touches containsObject:_primaryTouch]) {
    return;
  }
  UIWindow *window = _observedWindow;
  // A stationary tap never leaves the touched branch, so keep it as-is; the release re-hit-test is only
  // needed once the finger has actually moved (a drag/scroll). Skipping it for a tap also sidesteps a
  // react-native-svg quirk: RNSVG's hit-test can resolve a different element after the front one
  // re-renders for `:hover`, which would spuriously drop a just-hovered svg element on release.
  if (window != nil) {
    CGPoint releasePoint = [_primaryTouch locationInView:window];
    CGFloat dx = releasePoint.x - _primaryTouchDownPoint.x;
    CGFloat dy = releasePoint.y - _primaryTouchDownPoint.y;
    if (dx * dx + dy * dy <= kPrimaryTouchTapMovement * kPrimaryTouchTapMovement) {
      return;
    }
  }
  // The finger moved: only the release location matters now - a hovered view stays hovered when the
  // finger lifts over it and is dropped otherwise (dragged or scrolled off). Nothing new is hovered.
  // A cancelled primary never gets here, so a system interruption keeps the `:hover`.
  UIView *hit = window != nil ? [window hitTest:[_primaryTouch locationInView:window] withEvent:nil] : nil;
  for (REATouchHoverEntry *entry in _entries) {
    if (entry->hovered && ![self isView:entry->view onBranchOfHitView:hit]) {
      [self setEntry:entry hovered:NO];
    }
  }
}

- (void)touchSequenceEnded
{
  _primaryTouch = nil;
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

- (void)hoverBranchOfHitView:(UIView *)hit
{
  // Hit-test the topmost view: `:hover` applies to it and its registered ancestors only (matching
  // CSS), so views that merely overlap the hit branch no longer all activate. hitTest honors z-order,
  // userInteractionEnabled, hidden and alpha, and returns nil over blank space (drops all `:hover`).
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
