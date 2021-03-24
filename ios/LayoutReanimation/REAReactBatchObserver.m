//
//  REAReactBatchObserver.m
//  RNReanimated
//
//  Created by Szymon Kapala on 22/03/2021.
//

#import "REAReactBatchObserver.h"
#import "RCTShadowView.h"
#import "REAAnimationRootView.h"

@interface REAReactBatchObserver ()

@property (strong, atomic) RCTUIManager* uiManager;
@property (strong, atomic) RCTBridge* bridge;
@property (strong, atomic) NSMutableSet<NSNumber *>* affectedAnimationRootsTags;

@end

@implementation REAReactBatchObserver

- (void) invalidate
{
    self.uiManager = nil;
    self.bridge = nil;
    [self.uiManager.observerCoordinator removeObserver:self];
}

- (instancetype)initWithBridge:(RCTBridge*)bridge
{
    if (self = [super init]) {
        self.bridge = bridge;
        self.uiManager = [bridge moduleForClass:[RCTUIManager class]];
        self.affectedAnimationRootsTags = [NSMutableSet new];
        [self.uiManager.observerCoordinator addObserver:self];
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
                                       void(^)(REAAnimationRootView* view)) = ^void(NSDictionary<NSNumber *,UIView *> *viewRegistry, void(^block)(REAAnimationRootView* view)) {
        for (NSNumber *tag in affectedAnimationRootsTags) {
            UIView* view = viewRegistry[tag];
            RCTAssert([view isKindOfClass:[REAAnimationRootView class]], @"View is not an subclass of REAAnimationRootView");
            REAAnimationRootView* aniamtionRoot = (REAAnimationRootView*) view;
            NSSet* capturableProperties = aniamtionRoot.capturablePropeties;
            //Todo
        }
    };
    
    [self.uiManager prependUIBlock:^(RCTUIManager *uiManager, NSDictionary<NSNumber *,UIView *> *viewRegistry) {
        void (^block)(REAAnimationRootView*) = ^void(REAAnimationRootView* view) {
            //TODO
        };
        goThroughAffectedWithBlock(viewRegistry, block);
    }];
    
    // TODO remove reactTags if there are no longer valid
    [self.uiManager addUIBlock:^(RCTUIManager *uiManager, NSDictionary<NSNumber *,UIView *> *viewRegistry) {
        void (^block)(REAAnimationRootView*) = ^void(REAAnimationRootView* view) {
            ///TODO
        };
        goThroughAffectedWithBlock(viewRegistry, block);
    }];
}

- (void)uiManagerWillPerformLayout: (RCTUIManager *)uiManager
{
    // if it's not performant enough then we can also get dirty AnimationRoots by extending Yoga nodes
    for (NSNumber *tag in [REAReactBatchObserver animationRootsTags])
    {
        RCTShadowView* shadowView = [self.uiManager shadowViewForReactTag:tag];
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
