#import "REAReactBatchObserver.h"
#import "RCTShadowView.h"
#import "REAAnimationRootView.h"
#import "REAViewTraverser.h"
#import "REASnapshooter.h"

@interface REAReactBatchObserver ()

@property (strong, atomic) RCTUIManager* uiManager;
@property (strong, atomic) RCTBridge* bridge;
@property (strong, atomic) NSMutableSet<NSNumber *>* affectedAnimationRootsTags;

@end

@implementation REAReactBatchObserver

- (void)invalidate
{
    self.uiManager = nil;
    self.bridge = nil;
    [self.animationsManager invalidate];
    self.animationsManager = nil;
    [self.uiManager.observerCoordinator removeObserver:self];
    [[REAReactBatchObserver animationRootsTags] removeAllObjects];
    self.affectedAnimationRootsTags = [NSMutableSet new];
}

- (instancetype)initWithBridge:(RCTBridge*)bridge
{
    if (self = [super init]) {
        self.bridge = bridge;
        self.uiManager = [bridge moduleForClass:[RCTUIManager class]];
        self.affectedAnimationRootsTags = [NSMutableSet new];
        [self.uiManager.observerCoordinator addObserver:self];
        _animationsManager = [[REAAnimationsManager alloc] initWithUIManager:self.uiManager];
        return self;
    }
    return nil;
}

#pragma mark - RCTUIManagerObserver

- (void)uiManagerWillPerformMounting:(RCTUIManager *)uiManager
{
    NSMutableSet* affectedAnimationRootsTags = self.affectedAnimationRootsTags;
    self.affectedAnimationRootsTags = [NSMutableSet new];
    
    void (^goThroughAffectedWithBlock)(NSDictionary<NSNumber *,UIView *> *viewRegistry,
                                       void(^)(REAAnimationRootView* view, NSNumber *)) = ^void(NSDictionary<NSNumber *,UIView *> *viewRegistry, void(^block)(REAAnimationRootView* view, NSNumber *)) {
        for (NSNumber *tag in affectedAnimationRootsTags) {
            UIView* view = viewRegistry[tag];
            RCTAssert(view == nil || [view isKindOfClass:[REAAnimationRootView class]], @"View is not a subclass of REAAnimationRootView");
            REAAnimationRootView* animtionRoot = (REAAnimationRootView*) view;
            block(animtionRoot, tag);
        }
    };
  
    __block NSMutableDictionary * snapshooterDict = [NSMutableDictionary new];
    
    [self.uiManager prependUIBlock:^(RCTUIManager *uiManager, NSDictionary<NSNumber *,UIView *> *viewRegistry) {
      // TODO use weak self
        void (^block)(REAAnimationRootView*, NSNumber *) = ^void(REAAnimationRootView* view, NSNumber *tag) {
          NSSet* capturableProps = view.capturablePropeties;
          REASnapshooter* snapshooter = [[REASnapshooter alloc] initWithTag:tag capturableProps:capturableProps];
          
          if (view.shouldBeAnimated) {
            //TODO
          }
          
          [REAViewTraverser traverse:view withBlock:^(UIView* view) {
            [snapshooter takeSnapshot: view];
          }];
          snapshooterDict[tag] = snapshooter;
        };
      
        goThroughAffectedWithBlock(viewRegistry, block);
    }];
    
    //TODO remove reactTags if there are no longer valid
    [self.uiManager addUIBlock:^(RCTUIManager *uiManager, NSDictionary<NSNumber *,UIView *> *viewRegistry) {
      // TODO use weak self
        void (^block)(REAAnimationRootView*, NSNumber *) = ^void(REAAnimationRootView* view, NSNumber *tag) {
          NSSet* capturableProps = view.capturablePropeties;
          REASnapshooter* snapshooter = [[REASnapshooter alloc] initWithTag:tag capturableProps:capturableProps];
          if (view) {
            [REAViewTraverser traverse:view withBlock:^(UIView* view) {
              [snapshooter takeSnapshot: view];
            }];
          }
          
          [_animationsManager notifyAboutChangeWithBeforeSnapshots:snapshooterDict[tag] afterSnapshooter:snapshooter];
        };
        goThroughAffectedWithBlock(viewRegistry, block);
    }];
}

- (void)uiManagerWillPerformLayout: (RCTUIManager *)uiManager
{
    // if it's not performant enough then we can also get dirty AnimationRoots by extending Yoga nodes
    for (NSNumber *tag in [[REAReactBatchObserver animationRootsTags] copy])
    {
        RCTShadowView* shadowView = [self.uiManager shadowViewForReactTag:tag];
      if (shadowView == nil) {
        [[REAReactBatchObserver animationRootsTags] removeObject:tag];
        [self.affectedAnimationRootsTags addObject:tag];
        continue;
      }
      if (YGNodeIsDirty(shadowView.yogaNode)) {
          [self.affectedAnimationRootsTags addObject:tag];
      }
    }
}

+ (NSMutableSet<NSNumber*>*) animationRootsTags
{
    static dispatch_once_t once;
    static NSMutableSet<NSNumber*>* tags;
    dispatch_once(&once, ^{
        tags = [NSMutableSet new];
    });
    return tags;
}

@end

