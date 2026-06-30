#import <reanimated/apple/pseudoSelectors/REATouchHoverCoordinator.h>

#if !TARGET_OS_OSX && !TARGET_OS_TV

#import <UIKit/UIKit.h>

/// One registered touch-`:hover` view. `displayed` is the live `:hover` (its callback has fired);
/// `committed` is the sticky state a tap leaves behind, restored when a pan/scroll is rolled back.
@interface REATouchHoverEntry : NSObject {
 @public
  __weak id owner;
  __weak UIView *view;
  std::function<void(bool)> callback;
  BOOL displayed;
  BOOL committed;
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
- (void)primaryTouchMoved:(NSSet<UITouch *> *)touches;
- (void)primaryTouchEnded:(NSSet<UITouch *> *)touches;
- (void)primaryTouchCancelled:(NSSet<UITouch *> *)touches;
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
}
@end

static const CGFloat kTouchHoverSlop = 10.0;

@implementation REATouchHoverCoordinator {
  NSMutableArray<REATouchHoverEntry *> *_entries;
  REAHoverTouchObserver *_windowObserver;
  __weak UIWindow *_observedWindow;
  // Only the first finger drives `:hover`; the rest are ignored until it lifts (matches the web,
  // where a touch implicitly captures the pointer). nil between gestures.
  __weak UITouch *_primaryTouch;
  __weak UIView *_primaryHitView;
  CGPoint _primaryDownPoint;
  BOOL _panned;
  BOOL _rolledBackForScroll;
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
  entry->displayed = NO;
  entry->committed = NO;
  [_entries addObject:entry];
  [self refreshWindowObserver];
}

- (void)unregisterObserver:(id)owner
{
  NSMutableArray<REATouchHoverEntry *> *removed = [NSMutableArray array];
  for (REATouchHoverEntry *entry in _entries) {
    if (entry->owner == nil || entry->owner == owner) {
      [self setEntry:entry displayed:NO];
      entry->committed = NO;
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
  // Drop any sticky :hover left in the window we stopped observing (e.g. when a modal/alert becomes
  // key and we rebind), mirroring Android's removeWindowObserver.
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
  _panned = NO;
  _rolledBackForScroll = NO;
  _primaryDownPoint = [touch locationInView:window];
  _primaryHitView = [window hitTest:_primaryDownPoint withEvent:nil];
  // Reconcile the live :hover to the touched view's hit-path: press feedback on the new branch,
  // and the previously-committed branch is cleared right away (restored later if this is a pan).
  [self displayHitPathAtWindowPoint:_primaryDownPoint];
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
  CGPoint inWindow = [_primaryTouch locationInView:window];
  CGFloat dx = inWindow.x - _primaryDownPoint.x;
  CGFloat dy = inWindow.y - _primaryDownPoint.y;
  if (dx * dx + dy * dy > kTouchHoverSlop * kTouchHoverSlop) {
    // A drag/scroll: mark it so the release rolls back to the committed :hover instead of committing
    // this branch. The branch keeps showing for now, so :hover stays while the finger moves over the
    // view (a within-view drag).
    _panned = YES;
  }
  // Once an enclosing scroll view actually starts scrolling, roll back the tentative :hover right
  // away instead of waiting for release - matching Android (whose per-view touch is cancelled by the
  // scroll) and the web (which drops the press feedback the moment scrolling begins). A within-view
  // drag that does not scroll keeps the :hover.
  if (_panned && !_rolledBackForScroll && [self primaryTouchStartedScrolling]) {
    _rolledBackForScroll = YES;
    [self revertToCommitted];
  }
}

- (BOOL)primaryTouchStartedScrolling
{
  for (UIView *view = _primaryHitView; view != nil; view = view.superview) {
    if ([view isKindOfClass:[UIScrollView class]] && ((UIScrollView *)view).isDragging) {
      return YES;
    }
  }
  return NO;
}

- (void)primaryTouchEnded:(NSSet<UITouch *> *)touches
{
  if (_primaryTouch == nil || ![touches containsObject:_primaryTouch]) {
    return;
  }
  // Decide tap-vs-pan from the lift point too, in case the slop was only crossed between the last
  // delivered move and the release (a fast flick); the final location is the source of truth.
  UIWindow *window = _observedWindow;
  if (!_panned && window != nil) {
    CGPoint up = [_primaryTouch locationInView:window];
    CGFloat dx = up.x - _primaryDownPoint.x;
    CGFloat dy = up.y - _primaryDownPoint.y;
    if (dx * dx + dy * dy > kTouchHoverSlop * kTouchHoverSlop) {
      _panned = YES;
    }
  }
  _primaryTouch = nil;
  if (_panned) {
    [self revertToCommitted]; // A pan/scroll never changes the sticky :hover.
  } else {
    [self commitDisplayed]; // A tap makes the touched branch sticky.
  }
}

- (void)primaryTouchCancelled:(NSSet<UITouch *> *)touches
{
  if (_primaryTouch == nil || ![touches containsObject:_primaryTouch]) {
    return;
  }
  _primaryTouch = nil;
  [self revertToCommitted];
}

#pragma mark - State reconciliation

- (void)setEntry:(REATouchHoverEntry *)entry displayed:(BOOL)displayed
{
  if (entry->displayed == displayed) {
    return;
  }
  entry->displayed = displayed;
  if (entry->callback) {
    entry->callback(displayed);
  }
}

- (void)displayHitPathAtWindowPoint:(CGPoint)inWindow
{
  // Hit-test the topmost view: :hover applies to it and its ancestors only (matching CSS), so views
  // that merely overlap the hit branch no longer all activate. hitTest honors z-order,
  // userInteractionEnabled, hidden and alpha, and returns nil over blank space (clears all :hover).
  UIWindow *window = _observedWindow;
  UIView *hit = window != nil ? [window hitTest:inWindow withEvent:nil] : nil;
  NSMutableArray<REATouchHoverEntry *> *dead = nil;
  for (REATouchHoverEntry *entry in _entries) {
    UIView *view = entry->view;
    if (view == nil) {
      [self setEntry:entry displayed:NO];
      if (dead == nil) {
        dead = [NSMutableArray array];
      }
      [dead addObject:entry];
      continue;
    }
    BOOL onHitPath = NO;
    for (UIView *current = hit; current != nil; current = current.superview) {
      if (current == view) {
        onHitPath = YES;
        break;
      }
    }
    [self setEntry:entry displayed:onHitPath];
  }
  [self purgeEntries:dead];
}

- (void)commitDisplayed
{
  for (REATouchHoverEntry *entry in _entries) {
    entry->committed = entry->displayed;
  }
}

- (void)revertToCommitted
{
  for (REATouchHoverEntry *entry in _entries) {
    [self setEntry:entry displayed:entry->committed];
  }
}

- (void)clearAll
{
  for (REATouchHoverEntry *entry in _entries) {
    [self setEntry:entry displayed:NO];
    entry->committed = NO;
  }
}

- (BOOL)gestureRecognizer:(UIGestureRecognizer *)gestureRecognizer
    shouldRecognizeSimultaneouslyWithGestureRecognizer:(UIGestureRecognizer *)otherGestureRecognizer
{
  return YES;
}

@end

#endif
