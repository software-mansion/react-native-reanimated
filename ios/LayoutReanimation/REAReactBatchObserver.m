#import "REAReactBatchObserver.h"
#import "RCTShadowView.h"
#import "REAAnimationRootView.h"
#import "REAViewTraverser.h"
#import "REASnapshooter.h"
#import "REAUIManager.h"

@interface REAReactBatchObserver ()

@property (strong, atomic) RCTUIManager* uiManager;
@property (strong, atomic) RCTBridge* bridge;
@property (strong, atomic) NSMutableSet<NSNumber *>* affectedNodes;

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
    self.affectedNodes = [NSMutableSet new];
}

- (instancetype)initWithBridge:(RCTBridge*)bridge
{
    if (self = [super init]) {
        self.bridge = bridge;
        self.uiManager = [bridge moduleForClass:[REAUIManager class]];
        self.affectedNodes = [NSMutableSet new];
        [self.uiManager.observerCoordinator addObserver:self];
        _animationsManager = [[REAAnimationsManager alloc] initWithUIManager:self.uiManager];
        _alreadySeen = [NSMutableSet new];
        _parents = [NSMutableDictionary new];
        _snapshotsOfRemoved = [NSMutableDictionary new];
        _deactivate = true;
        _forceRemove = true;
        return self;
    }
    return nil;
}

#pragma mark - RCTUIManagerObserver

- (void)uiManagerWillPerformMounting:(RCTUIManager *)uiManager
{
    NSMutableSet* affectedTags = [self.affectedNodes copy];
    self.affectedNodes = [NSMutableSet new];
    [_snapshotsOfRemoved removeAllObjects];
    NSMutableDictionary<NSNumber*, REASnapshot*>* firstSnapshots = [NSMutableDictionary new];
    
    [uiManager prependUIBlock:^(RCTUIManager *uiManager, NSDictionary<NSNumber *,UIView *> *viewRegistry) {
        self.deactivate = false;
        self.forceRemove = false;
        for(NSNumber* tag in affectedTags) {
            UIView* currentView = viewRegistry[tag];
            firstSnapshots[@(currentView.tag)] = [REASnapshot init];
        }
    }];
    
  [uiManager addUIBlock:^(RCTUIManager *uiManager, NSDictionary<NSNumber *,UIView *> *viewRegistry) {
    for(NSNumber* tag in affectedTags) {
        UIView* currentView = viewRegistry[tag];
        firstSnapshots[@(currentView.tag)] = [REASnapshot init];
    }
    //
//    for (int tag : affectedTags) {
//      View view = null;
//      try {
//          view = nativeViewHierarchyManager.resolveView(tag);
//      } catch (IllegalViewOperationException e) {
//          //noop
//      }
//      if (view == null && alreadySeen.contains(tag)) { // removed not new
//          continue;
//      }
//      if (view == null && !alreadySeen.contains(tag)) { // it is a new view
//          continue;
//
//      }
//      if (!alreadySeen.contains(tag)) {
//          if (view.isAttachedToWindow()) {
//              addViewListener(view);
//              continue;
//          } else {
//              continue;
//          }
//      }
//      Snapshot snapshot = firstSnapshots.get(tag);
//      if (snapshot != null) {
//          mAnimationsManager.onViewUpdate(view, snapshot, new Snapshot(view, nativeViewHierarchyManager));
//      }
//  }
//  forceRemove = true;
//  deactivate = true;
//  for (Map.Entry<Integer, Snapshot> entry : snapshotsOfRemoved.entrySet()) {
//      mAnimationsManager.onViewRemoval(entry.getValue().view, entry.getValue().parent, entry.getValue()); // TODO check for each od them if they are detached in the sense of Screens
//      alreadySeen.remove(entry.getValue().view.getId());
//  }
  }];
    
    //-----------------------------------------------------------------------------------
    
    void (^goThroughAffectedWithBlock)(NSDictionary<NSNumber *,UIView *> *viewRegistry,
                                       void(^)(REAAnimationRootView* view, NSNumber *)) = ^void(NSDictionary<NSNumber *,UIView *> *viewRegistry, void(^block)(REAAnimationRootView* view, NSNumber *)) {
        for (NSNumber *tag in affectedTags) {
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
          
//          [_animationsManager notifyAboutChangeWithBeforeSnapshots:snapshooterDict[tag] afterSnapshooter:snapshooter]; // TODO
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
        [self.affectedNodes addObject:tag];
        continue;
      }
      if (YGNodeIsDirty(shadowView.yogaNode)) {
          [self.affectedNodes addObject:tag];
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

