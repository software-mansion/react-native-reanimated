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
}

@synthesize sharedTransitionsItems;

- (instancetype)init
{
  self = [super init];
  sharedTransitionsItems = [NSMutableDictionary<NSString *, NSMutableArray<SharedViewConfig *> *> new];
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
  REASnapshot *before = [[REASnapshot alloc] init:fromView withConverter:converter withParent:startingViewConverter];
  if ([transitionType isEqualToString:@"sharedElementTransition"]) {
    REASnapshot *after = [[REASnapshot alloc] init:toView withConverter:converter withParent:toViewConverter];
    [_animationsManager onViewTransition:toView before:before after:after];
  } else {
    [_animationsManager onScreenTransition:fromView finish:before transitionType:transitionType];
  }
}

- (void)registerTransitioinTag:(NSString *)transitionTag viewTag:(NSNumber *)viewTag
{
  if (!sharedTransitionsItems[transitionTag]) {
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

- (void)afterPreparingCallback;
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
    }
  }
}

@end
