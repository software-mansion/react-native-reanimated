#import "REAUIManager.h"
#import <Foundation/Foundation.h>
#import "RCTComponentData.h"
#import "RCTUIManagerObserverCoordinator.h"
#import "RCTRootShadowView.h"
#import "RCTRootViewInternal.h"
#import "RCTLayoutAnimation.h"
#import "RCTLayoutAnimationGroup.h"

@interface RCTUIManager(REA)
- (void)_manageChildren:(NSNumber *)containerTag
        moveFromIndices:(NSArray<NSNumber *> *)moveFromIndices
          moveToIndices:(NSArray<NSNumber *> *)moveToIndices
      addChildReactTags:(NSArray<NSNumber *> *)addChildReactTags
           addAtIndices:(NSArray<NSNumber *> *)addAtIndices
        removeAtIndices:(NSArray<NSNumber *> *)removeAtIndices
               registry:(NSMutableDictionary<NSNumber *, id<RCTComponent>> *)registry;

//- (RCTViewManagerUIBlock)uiBlockWithLayoutUpdateForRootView:(RCTRootShadowView *)rootShadowView;
- (NSArray<id<RCTComponent>> *)_childrenToRemoveFromContainer:(id<RCTComponent>)container
                                                    atIndices:(NSArray<NSNumber *> *)atIndices;
@end

@implementation REAUIManager

BOOL blockSetter = false;

+ (NSString*)moduleName
{
  return NSStringFromClass([RCTUIManager class]);
}

- (void)setBridge:(RCTBridge *)bridge
{
    if(!_blockSetter) {
        _blockSetter = true;
        
        self.bridge = bridge;
        [self setValue:[bridge.uiManager valueForKey:@"_shadowViewRegistry"] forKey:@"_shadowViewRegistry"];
        [self setValue:[bridge.uiManager valueForKey:@"_viewRegistry"] forKey:@"_viewRegistry"];
        [self setValue:[bridge.uiManager valueForKey:@"_nativeIDRegistry"] forKey:@"_nativeIDRegistry"];
        [self setValue:[bridge.uiManager valueForKey:@"_shadowViewsWithUpdatedProps"] forKey:@"_shadowViewsWithUpdatedProps"];
        [self setValue:[bridge.uiManager valueForKey:@"_shadowViewsWithUpdatedChildren"] forKey:@"_shadowViewsWithUpdatedChildren"];
        [self setValue:[bridge.uiManager valueForKey:@"_pendingUIBlocks"] forKey:@"_pendingUIBlocks"];
        [self setValue:[bridge.uiManager valueForKey:@"_rootViewTags"] forKey:@"_rootViewTags"];
        [self setValue:[bridge.uiManager valueForKey:@"_observerCoordinator"] forKey:@"_observerCoordinator"];
        [self setValue:[bridge.uiManager valueForKey:@"_componentDataByName"] forKey:@"_componentDataByName"];
        
        _blockSetter = false;
    }
}

- (void)_manageChildren:(NSNumber *)containerTag
        moveFromIndices:(NSArray<NSNumber *> *)moveFromIndices
          moveToIndices:(NSArray<NSNumber *> *)moveToIndices
      addChildReactTags:(NSArray<NSNumber *> *)addChildReactTags
           addAtIndices:(NSArray<NSNumber *> *)addAtIndices
        removeAtIndices:(NSArray<NSNumber *> *)removeAtIndices
               registry:(NSMutableDictionary<NSNumber *, id<RCTComponent>> *)registry
{
  id<RCTComponent> container = registry[containerTag];
  NSArray<id<RCTComponent>> *permanentlyRemovedChildren = [super _childrenToRemoveFromContainer:container atIndices:removeAtIndices];
  BOOL isUIViewRegistry = ((id)registry == (id)[self valueForKey:@"_viewRegistry"]);
  if(isUIViewRegistry) {
    for (UIView *removedChild in permanentlyRemovedChildren) {
      REASnapshot* snapshot = [[REASnapshot alloc] init:removedChild];
      [self->_animationsManager onViewRemoval:removedChild parent:removedChild.superview before:snapshot];
    }
//    UIView* currentView = (UIView*)container;
//    REASnapshot* snapshot = [[REASnapshot alloc] init:currentView];
//    [self->_animationsManager onViewRemoval:currentView parent:currentView.superview before:snapshot];
//    removeAtIndices = nil;
  }
  
  [super _manageChildren:containerTag
         moveFromIndices:moveFromIndices
           moveToIndices:moveToIndices
       addChildReactTags:addChildReactTags
            addAtIndices:addAtIndices
         removeAtIndices:removeAtIndices
                registry:registry];
}

// Overrided https://github.com/facebook/react-native/blob/v0.65.0/React/Modules/RCTUIManager.m#L530
- (RCTViewManagerUIBlock)uiBlockWithLayoutUpdateForRootView:(RCTRootShadowView *)rootShadowView
{
//  RCTAssertUIManagerQueue();

//  [super uiBlockWithLayoutUpdateForRootView: rootShadowView];
  
  NSHashTable<RCTShadowView *> *affectedShadowViews = [NSHashTable weakObjectsHashTable];
  [rootShadowView layoutWithAffectedShadowViews:affectedShadowViews];

  if (!affectedShadowViews.count) {
    // no frame change results in no UI update block
    return nil;
  }

  typedef struct {
    CGRect frame;
    UIUserInterfaceLayoutDirection layoutDirection;
    BOOL isNew;
    BOOL parentIsNew;
    RCTDisplayType displayType;
  } RCTFrameData;

  // Construct arrays then hand off to main thread
  NSUInteger count = affectedShadowViews.count;
  NSMutableArray *reactTags = [[NSMutableArray alloc] initWithCapacity:count];
  NSMutableData *framesData = [[NSMutableData alloc] initWithLength:sizeof(RCTFrameData) * count];
  {
    NSUInteger index = 0;
    RCTFrameData *frameDataArray = (RCTFrameData *)framesData.mutableBytes;
    for (RCTShadowView *shadowView in affectedShadowViews) {
      reactTags[index] = shadowView.reactTag;
      RCTLayoutMetrics layoutMetrics = shadowView.layoutMetrics;
      frameDataArray[index++] = (RCTFrameData){layoutMetrics.frame,
                                               layoutMetrics.layoutDirection,
                                               shadowView.isNewView,
                                               shadowView.superview.isNewView,
                                               layoutMetrics.displayType};
    }
  }

  for (RCTShadowView *shadowView in affectedShadowViews) {
    // We have to do this after we build the parentsAreNew array.
    shadowView.newView = NO;

    NSNumber *reactTag = shadowView.reactTag;

    if (shadowView.onLayout) {
      CGRect frame = shadowView.layoutMetrics.frame;
      shadowView.onLayout(@{
        @"layout" : @{
          @"x" : @(frame.origin.x),
          @"y" : @(frame.origin.y),
          @"width" : @(frame.size.width),
          @"height" : @(frame.size.height),
        },
      });
    }

    if (RCTIsReactRootView(reactTag) && [shadowView isKindOfClass:[RCTRootShadowView class]]) {
      CGSize contentSize = shadowView.layoutMetrics.frame.size;

      RCTExecuteOnMainQueue(^{
        NSMutableDictionary<NSNumber *, UIView *>* viewRegistry = [self valueForKey:@"_viewRegistry"];
        UIView *view = viewRegistry[reactTag];
        RCTAssert(view != nil, @"view (for ID %@) not found", reactTag);

        RCTRootView *rootView = (RCTRootView *)[view superview];
        if ([rootView isKindOfClass:[RCTRootView class]]) {
          rootView.intrinsicContentSize = contentSize;
        }
      });
    }
  }

  // Perform layout (possibly animated)
  return ^(__unused RCTUIManager *uiManager, NSDictionary<NSNumber *, UIView *> *viewRegistry) {
    const RCTFrameData *frameDataArray = (const RCTFrameData *)framesData.bytes;
    RCTLayoutAnimationGroup *layoutAnimationGroup = [uiManager valueForKey:@"_layoutAnimationGroup"];

    __block NSUInteger completionsCalled = 0;

    NSInteger index = 0;
    for (NSNumber *reactTag in reactTags) {
      RCTFrameData frameData = frameDataArray[index++];

      UIView *view = viewRegistry[reactTag];
      CGRect frame = frameData.frame;

      UIUserInterfaceLayoutDirection layoutDirection = frameData.layoutDirection;
      BOOL isNew = frameData.isNew;
      RCTLayoutAnimation *updatingLayoutAnimation = isNew ? nil : layoutAnimationGroup.updatingLayoutAnimation;
      BOOL shouldAnimateCreation = isNew && !frameData.parentIsNew;
      RCTLayoutAnimation *creatingLayoutAnimation =
          shouldAnimateCreation ? layoutAnimationGroup.creatingLayoutAnimation : nil;
      BOOL isHidden = frameData.displayType == RCTDisplayTypeNone;

      void (^completion)(BOOL) = ^(BOOL finished) {
        completionsCalled++;
        if (layoutAnimationGroup.callback && completionsCalled == count) {
          layoutAnimationGroup.callback(@[ @(finished) ]);

          // It's unsafe to call this callback more than once, so we nil it out here
          // to make sure that doesn't happen.
          layoutAnimationGroup.callback = nil;
        }
      };

      if (view.reactLayoutDirection != layoutDirection) {
        view.reactLayoutDirection = layoutDirection;
      }

      if (view.isHidden != isHidden) {
        view.hidden = isHidden;
      }
      
      REASnapshot* snapshotBefore = [[REASnapshot alloc] init:view];
      if (creatingLayoutAnimation) {
        // Animate view creation
        [view reactSetFrame:frame];

        CATransform3D finalTransform = view.layer.transform;
        CGFloat finalOpacity = view.layer.opacity;

        NSString *property = creatingLayoutAnimation.property;
        if ([property isEqualToString:@"scaleXY"]) {
          view.layer.transform = CATransform3DMakeScale(0, 0, 0);
        } else if ([property isEqualToString:@"scaleX"]) {
          view.layer.transform = CATransform3DMakeScale(0, 1, 0);
        } else if ([property isEqualToString:@"scaleY"]) {
          view.layer.transform = CATransform3DMakeScale(1, 0, 0);
        } else if ([property isEqualToString:@"opacity"]) {
          view.layer.opacity = 0.0;
        } else {
          RCTLogError(@"Unsupported layout animation createConfig property %@", creatingLayoutAnimation.property);
        }

        [creatingLayoutAnimation
              performAnimations:^{
                if ([property isEqualToString:@"scaleX"] || [property isEqualToString:@"scaleY"] ||
                    [property isEqualToString:@"scaleXY"]) {
                  view.layer.transform = finalTransform;
                } else if ([property isEqualToString:@"opacity"]) {
                  view.layer.opacity = finalOpacity;
                }
              }
            withCompletionBlock:completion];

      } else if (updatingLayoutAnimation) {
        // Animate view update
        [updatingLayoutAnimation
              performAnimations:^{
                [view reactSetFrame:frame];
              }
            withCompletionBlock:completion];

      } else {
        // Update without animation
        [view reactSetFrame:frame];
        completion(YES);
      }
      
      if(isNew) {
        REASnapshot* snapshot = [[REASnapshot alloc] init:view];
        [self->_animationsManager onViewCreate:view parent:view.superview after:snapshot];
      }
      else {
        REASnapshot* snapshotAfter = [[REASnapshot alloc] init:view];
        [self->_animationsManager onViewUpdate:view before:snapshotBefore after:snapshotAfter];
      }
      
    }

    // Clean up
    [uiManager setValue:nil forKey:@"_layoutAnimationGroup"];
  };
}

///**
// * Remove subviews from their parent with an animation.
// */
//- (void)_removeChildren:(NSArray<UIView *> *)children
//          fromContainer:(UIView *)container
//          withAnimation:(RCTLayoutAnimationGroup *)animation
//{
//  RCTAssertMainQueue();
//  RCTLayoutAnimation *deletingLayoutAnimation = animation.deletingLayoutAnimation;
//
//  __block NSUInteger completionsCalled = 0;
//  for (UIView *removedChild in children) {
//    void (^completion)(BOOL) = ^(BOOL finished) {
//      completionsCalled++;
//
//      [removedChild removeFromSuperview];
//
//      if (animation.callback && completionsCalled == children.count) {
//        animation.callback(@[ @(finished) ]);
//
//        // It's unsafe to call this callback more than once, so we nil it out here
//        // to make sure that doesn't happen.
//        animation.callback = nil;
//      }
//    };
//
//    // Hack: At this moment we have two contradict intents.
//    // First one: We want to delete the view from view hierarchy.
//    // Second one: We want to animate this view, which implies the existence of this view in the hierarchy.
//    // So, we have to remove this view from React's view hierarchy but postpone removing from UIKit's hierarchy.
//    // Here the problem: the default implementation of `-[UIView removeReactSubview:]` also removes the view from
//    // UIKit's hierarchy. So, let's temporary restore the view back after removing. To do so, we have to memorize
//    // original `superview` (which can differ from `container`) and an index of removed view.
//    UIView *originalSuperview = removedChild.superview;
//    NSUInteger originalIndex = [originalSuperview.subviews indexOfObjectIdenticalTo:removedChild];
//    [container removeReactSubview:removedChild];
//    // Disable user interaction while the view is animating
//    // since the view is (conceptually) deleted and not supposed to be interactive.
//    removedChild.userInteractionEnabled = NO;
//    [originalSuperview insertSubview:removedChild atIndex:originalIndex];
//
//    NSString *property = deletingLayoutAnimation.property;
//    [deletingLayoutAnimation
//          performAnimations:^{
//            if ([property isEqualToString:@"scaleXY"]) {
//              removedChild.layer.transform = CATransform3DMakeScale(0.001, 0.001, 0.001);
//            } else if ([property isEqualToString:@"scaleX"]) {
//              removedChild.layer.transform = CATransform3DMakeScale(0.001, 1, 0.001);
//            } else if ([property isEqualToString:@"scaleY"]) {
//              removedChild.layer.transform = CATransform3DMakeScale(1, 0.001, 0.001);
//            } else if ([property isEqualToString:@"opacity"]) {
//              removedChild.layer.opacity = 0.0;
//            } else {
//              RCTLogError(@"Unsupported layout animation createConfig property %@", deletingLayoutAnimation.property);
//            }
//          }
//        withCompletionBlock:completion];
//  }
//}

- (Class)class
{
    return [RCTUIManager class];
}

+ (Class)class
{
    return [RCTUIManager class];
}

@end
