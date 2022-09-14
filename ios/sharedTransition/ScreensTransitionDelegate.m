#import <RNReanimated/ScreensTransitionDelegate.h>

@implementation SharedViewConfig {
  UIView *_view;
}

- (instancetype)initWithTag:(NSNumber *)viewTag
{
  self = [super init];
  _viewTag = viewTag;
  _toRemove = false;
  return self;
}

- (void)setView:(UIView *)view;
{
  _view = view;
  _toRemove = false;
}

- (UIView *)getView;
{
  _toRemove = true;
  UIView *viewPtr = _view;
  _view = nil;
  return viewPtr;
}

@end

@implementation ScreensTransitionDelegate {
  RCTUIManager *_uiManager;
  NSMutableDictionary *_snapshotRegistry;
  NSMutableSet<NSNumber *> *_toRestore;
}

@synthesize sharedTransitionsItems;
@synthesize sharedElementsIterationOrder;

- (instancetype)init
{
  self = [super init];
  sharedTransitionsItems = [NSMutableDictionary<NSString *, NSMutableArray<SharedViewConfig *> *> new];
  sharedElementsIterationOrder = [NSMutableArray<NSString *> new];
  _snapshotRegistry = [NSMutableDictionary new];
  _toRestore = [NSMutableSet<NSNumber *> new];
  return self;
}

- (void)setUIManager:(RCTUIManager *)uiManager
{
  _uiManager = uiManager;
}

- (void)reanimatedMockTransitionWithConverterView:(UIView *)converter
                                         fromView:(UIView *)fromView
                                fromViewConverter:(UIView *)startingViewConverter
                                           toView:(UIView *)toView
                                  toViewConverter:(UIView *)toViewConverter
                                   transitionType:(NSString *)transitionType
{
  if ([transitionType isEqualToString:@"sharedElementTransition"]) {
    [_toRestore addObject:fromView.reactTag];
    REASnapshot *before = _snapshotRegistry[fromView.reactTag];
    REASnapshot *after = _snapshotRegistry[toView.reactTag];
    [_animationsManager onViewTransition:fromView before:before after:after];
    [_animationsManager onViewTransition:toView before:before after:after];
  } 
  else {
    // TODO: animate scrreen transition
    // [_animationsManager onScreenTransition:fromView finish:toViewSnapshot transitionType:transitionType];
  }
}

- (void)registerTransitioinTag:(NSString *)transitionTag viewTag:(NSNumber *)viewTag
{
  if (!sharedTransitionsItems[transitionTag]) {
    [sharedElementsIterationOrder addObject:transitionTag];
    sharedTransitionsItems[transitionTag] = [NSMutableArray<SharedViewConfig *> new];
  }
  SharedViewConfig *sharedViewConfig = [[SharedViewConfig new] initWithTag:viewTag];
  [self->sharedTransitionsItems[transitionTag] addObject:sharedViewConfig];
}

- (void)unregisterTransitioinTag:(NSString *)transitionTag viewTag:(NSNumber *)viewTag
{
  for (SharedViewConfig *config in sharedTransitionsItems[transitionTag]) {
    NSNumber *currentViewTag = config.viewTag;
    if (currentViewTag == viewTag) {
      config.toRemove = true;
    }
  }
}

- (void)afterPreparingCallback
{
  for (NSString *transitionTag in sharedTransitionsItems) {
    NSMutableArray<SharedViewConfig *> *sharedViewConfigs = sharedTransitionsItems[transitionTag];
    NSMutableArray *discardedItems = [NSMutableArray array];
    for (SharedViewConfig *config in sharedViewConfigs) {
      if (config.toRemove) {
        [discardedItems addObject:config];
      }
    }
    [sharedViewConfigs removeObjectsInArray:discardedItems];
    if ([sharedTransitionsItems[transitionTag] count] == 0) {
      [sharedTransitionsItems removeObjectForKey:transitionTag];
      [sharedElementsIterationOrder removeObject:transitionTag];
    }
  }
}

- (void)notifyAboutViewDidDisappear:(UIView *)screeen
{
  REANodesManager *reanimatedNodeManager = [_animationsManager getNodeManager];
  for (NSNumber *viewTag in _toRestore) {
    REASnapshot *initialState = _snapshotRegistry[viewTag];
    [_animationsManager stopAnimation:viewTag];
    [reanimatedNodeManager updateProps:initialState.values ofViewWithTag:viewTag withName:@"UIView"];
  }
  [_toRestore removeAllObjects];
}

- (void)makeSnapshot:(UIView *)view withViewController:(UIView *)viewController
{
  _snapshotRegistry[view.reactTag] = [[REASnapshot alloc] init:view withParent:viewController];
}

@end
