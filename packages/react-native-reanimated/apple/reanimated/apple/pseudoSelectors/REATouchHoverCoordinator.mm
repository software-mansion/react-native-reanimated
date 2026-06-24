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

/// Passive key-window touch observer. It never leaves `.possible`, so it never claims the gesture
/// or interferes with the per-view `:active` / `:active-deepest` recognizers.
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
- (void)touchesCancelled:(NSSet<UITouch *> *)touches withEvent:(UIEvent *)event
{
  [self.coordinator observeTouchCancelled];
}
@end

@implementation REATouchHoverCoordinator {
  NSMutableArray<REATouchHoverEntry *> *_entries;
  REAHoverTouchObserver *_windowObserver;
  __weak UIWindow *_observedWindow;
  CGPoint _windowTouchStartScreen;
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
  CGPoint onScreen = [window convertPoint:inWindow toCoordinateSpace:window.screen.coordinateSpace];
  _windowTouchStartScreen = onScreen;
  [self recomputeAtScreenPoint:onScreen];
}

- (void)observeTouchMoved:(UITouch *)touch
{
  // A scroll/drag (movement past a small slop) dismisses sticky :hover, matching Chrome.
  UIWindow *window = _observedWindow;
  if (window == nil || touch == nil) {
    return;
  }
  CGPoint inWindow = [touch locationInView:window];
  CGPoint onScreen = [window convertPoint:inWindow toCoordinateSpace:window.screen.coordinateSpace];
  CGFloat dx = onScreen.x - _windowTouchStartScreen.x;
  CGFloat dy = onScreen.y - _windowTouchStartScreen.y;
  if (dx * dx + dy * dy > 100.0) {
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

// Visible only if the whole superview chain is, mirroring Android's View.isShown().
- (BOOL)isViewVisibleOnScreen:(UIView *)view
{
  if (view.window == nil) {
    return NO;
  }
  for (UIView *current = view; current != nil; current = current.superview) {
    if (current.hidden || current.alpha <= 0.01) {
      return NO;
    }
  }
  return YES;
}

- (void)recomputeAtScreenPoint:(CGPoint)onScreen
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
    BOOL wantHover = NO;
    if ([self isViewVisibleOnScreen:view]) {
      CGPoint local = [view convertPoint:onScreen fromCoordinateSpace:view.window.screen.coordinateSpace];
      wantHover = [view pointInside:local withEvent:nil];
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
