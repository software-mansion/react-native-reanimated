/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTUIManager.h"

#import <AVFoundation/AVFoundation.h>
#import <React/RCTSurfacePresenterStub.h>

#import <yoga/Yoga.h> // [macOS]

#import "RCTAssert.h"
#import "RCTBridge+Private.h"
#import "RCTBridge.h"
#import "RCTComponent.h"
#import "RCTComponentData.h"
#import "RCTConvert.h"
#import "RCTDefines.h"
#import "RCTDevSettings.h" // [macOS]
#import "RCTEventDispatcherProtocol.h"
#import "RCTLayoutAnimation.h"
#import "RCTLayoutAnimationGroup.h"
#import "RCTLog.h"
#import "RCTModuleData.h"
#import "RCTModuleMethod.h"
#import "RCTProfile.h"
#import "RCTRootContentView.h"
#import "RCTRootShadowView.h"
#import "RCTRootViewInternal.h"
#if !TARGET_OS_OSX // [macOS]
#import "RCTScrollableProtocol.h"
#endif // [macOS]
#import "RCTShadowView+Internal.h"
#import "RCTShadowView.h"
#import "RCTSurfaceRootShadowView.h"
#import "RCTSurfaceRootView.h"
#import "RCTUIManagerObserverCoordinator.h"
#import "RCTUIManagerUtils.h"
#import "RCTUtils.h"
#import "RCTView.h"
#import "RCTViewManager.h"
#import "UIView+React.h"
#import "RCTUIKit.h" // [macOS]
#import "RCTDeviceInfo.h" // [macOS]

#import <React/RCTUIKit.h>

void RCTTraverseViewNodes(id<RCTComponent> view, void (^block)(id<RCTComponent>)) // [macOS]
{
  if (view.reactTag) {
    block(view);

    for (id<RCTComponent> subview in view.reactSubviews) {
      RCTTraverseViewNodes(subview, block);
    }
  }
}

static NSString *RCTNativeIDRegistryKey(NSString *nativeID, NSNumber *rootTag)
{
  if (!nativeID || !rootTag) {
    return @"";
  }
  return [NSString stringWithFormat:@"%@-%@", rootTag, nativeID];
}

NSString *const RCTUIManagerWillUpdateViewsDueToContentSizeMultiplierChangeNotification =
    @"RCTUIManagerWillUpdateViewsDueToContentSizeMultiplierChangeNotification";

@implementation RCTUIManager {
  // Root views are only mutated on the shadow queue
  NSMutableSet<NSNumber *> *_rootViewTags;
  NSMutableArray<RCTViewManagerUIBlock> *_pendingUIBlocks;

  // Animation
  RCTLayoutAnimationGroup *_layoutAnimationGroup; // Main thread only

  NSMutableDictionary<NSNumber *, RCTShadowView *> *_shadowViewRegistry; // RCT thread only
  NSMutableDictionary<NSNumber *, RCTPlatformView *> *_viewRegistry; // Main thread only // [macOS]
  NSMapTable<NSString *, RCTPlatformView *> *_nativeIDRegistry; // [macOS]

  NSMapTable<RCTShadowView *, NSArray<NSString *> *> *_shadowViewsWithUpdatedProps; // UIManager queue only.
  NSHashTable<RCTShadowView *> *_shadowViewsWithUpdatedChildren; // UIManager queue only.

  // Keyed by viewName
  NSMutableDictionary *_componentDataByName;
}

@synthesize bridge = _bridge;
@synthesize moduleRegistry = _moduleRegistry;

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (void)invalidate
{
  /**
   * Called on the JS Thread since all modules are invalidated on the JS thread
   */

  // This only accessed from the shadow queue
  _pendingUIBlocks = nil;

  RCTExecuteOnMainQueue(^{
    RCT_PROFILE_BEGIN_EVENT(RCTProfileTagAlways, @"UIManager invalidate", nil);
    NSMutableDictionary<NSNumber *, id<RCTComponent>> *viewRegistry =
        (NSMutableDictionary<NSNumber *, id<RCTComponent>> *)self->_viewRegistry;
    for (NSNumber *rootViewTag in self->_rootViewTags) {
      id<RCTComponent> rootView = viewRegistry[rootViewTag];
      [self _purgeChildren:[rootView reactSubviews] fromRegistry:viewRegistry];
      if ([rootView conformsToProtocol:@protocol(RCTInvalidating)]) {
        [(id<RCTInvalidating>)rootView invalidate];
      }
    }

    self->_rootViewTags = nil;
    self->_shadowViewRegistry = nil;
    self->_viewRegistry = nil;
    self->_nativeIDRegistry = nil;
    self->_bridge = nil;

    [[NSNotificationCenter defaultCenter] removeObserver:self];
    RCT_PROFILE_END_EVENT(RCTProfileTagAlways, @"");
  });
}

- (NSMutableDictionary<NSNumber *, RCTShadowView *> *)shadowViewRegistry
{
  // NOTE: this method only exists so that it can be accessed by unit tests
  if (!_shadowViewRegistry) {
    _shadowViewRegistry = [NSMutableDictionary new];
  }
  return _shadowViewRegistry;
}

- (NSMutableDictionary<NSNumber *, RCTPlatformView *> *)viewRegistry // [macOS]
{
  // NOTE: this method only exists so that it can be accessed by unit tests
  if (!_viewRegistry) {
    _viewRegistry = [NSMutableDictionary new];
  }
  return _viewRegistry;
}

- (NSMapTable *)nativeIDRegistry
{
  if (!_nativeIDRegistry) {
    _nativeIDRegistry = [NSMapTable strongToWeakObjectsMapTable];
  }
  return _nativeIDRegistry;
}

- (void)setBridge:(RCTBridge *)bridge
{
  RCTEnforceNewArchitectureValidation(
      RCTNotAllowedInBridgeless, self, @"RCTUIManager must not be initialized for the new architecture");

  RCTAssert(_bridge == nil, @"Should not re-use same UIManager instance");
  _bridge = bridge;

  _shadowViewRegistry = [NSMutableDictionary new];
  _viewRegistry = [NSMutableDictionary new];
  _nativeIDRegistry = [NSMapTable strongToWeakObjectsMapTable];

  _shadowViewsWithUpdatedProps = [NSMapTable weakToStrongObjectsMapTable];
  _shadowViewsWithUpdatedChildren = [NSHashTable weakObjectsHashTable];

  // Internal resources
  _pendingUIBlocks = [NSMutableArray new];
  _rootViewTags = [NSMutableSet new];

  _observerCoordinator = [RCTUIManagerObserverCoordinator new];

  // Get view managers from bridge=
  _componentDataByName = [NSMutableDictionary new];
  for (Class moduleClass in _bridge.moduleClasses) {
    if ([moduleClass isSubclassOfClass:[RCTViewManager class]]) {
      RCTComponentData *componentData = [[RCTComponentData alloc] initWithManagerClass:moduleClass
                                                                                bridge:_bridge
                                                                       eventDispatcher:_bridge.eventDispatcher];
      _componentDataByName[componentData.name] = componentData;
    }
  }

#if !TARGET_OS_OSX // [macOS]
  // Preload the a11yManager as the RCTUIManager needs it to listen for notification
  // By eagerly preloading it in the setBridge method, we make sure that the manager is
  // properly initialized in the Main Thread and that we do not incur in any race condition
  // or concurrency problem.
  id<RCTBridgeModule> a11yManager = [self->_bridge moduleForName:@"AccessibilityManager"
                                           lazilyLoadIfNecessary:YES];
  __weak NSObject * a11yManagerWeakObject = a11yManager;
  // This dispatch_async avoids a deadlock while configuring native modules
  dispatch_async(dispatch_get_main_queue(), ^{
    __strong NSObject * a11yManagerStrongObject = a11yManagerWeakObject;
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(didReceiveNewContentSizeMultiplier)
                                                 name:@"RCTAccessibilityManagerDidUpdateMultiplierNotification"
                                               object:a11yManagerStrongObject];
  });
#if TARGET_OS_IOS // [visionOS]
  [[NSNotificationCenter defaultCenter] addObserver:self
                                           selector:@selector(namedOrientationDidChange)
                                               name:UIDeviceOrientationDidChangeNotification
                                             object:nil];
#endif // [visionOS]
  [RCTLayoutAnimation initializeStatics];
#endif // [macOS]
}

#pragma mark - Event emitting

#if !TARGET_OS_OSX // [macOS]
- (void)didReceiveNewContentSizeMultiplier
{
  // Report the event across the bridge.
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
  id multiplier = [[self->_bridge moduleForName:@"AccessibilityManager"
                          lazilyLoadIfNecessary:YES] valueForKey:@"multiplier"];
  if (multiplier) {
    [[_moduleRegistry moduleForName:"EventDispatcher"] sendDeviceEventWithName:@"didUpdateContentSizeMultiplier"
                                                                          body:multiplier];
  }
#pragma clang diagnostic pop

  RCTExecuteOnUIManagerQueue(^{
    [[NSNotificationCenter defaultCenter]
        postNotificationName:RCTUIManagerWillUpdateViewsDueToContentSizeMultiplierChangeNotification
                      object:self];
    [self setNeedsLayout];
  });
}
#endif // [macOS]

#if TARGET_OS_IOS // [macOS] [visionOS]
// Names and coordinate system from html5 spec:
// https://developer.mozilla.org/en-US/docs/Web/API/Screen.orientation
// https://developer.mozilla.org/en-US/docs/Web/API/Screen.lockOrientation
static NSDictionary *deviceOrientationEventBody(UIDeviceOrientation orientation)
{
  NSString *name;
  NSNumber *degrees = @0;
  BOOL isLandscape = NO;
  switch (orientation) {
    case UIDeviceOrientationPortrait:
      name = @"portrait-primary";
      break;
    case UIDeviceOrientationPortraitUpsideDown:
      name = @"portrait-secondary";
      degrees = @180;
      break;
    case UIDeviceOrientationLandscapeRight:
      name = @"landscape-primary";
      degrees = @-90;
      isLandscape = YES;
      break;
    case UIDeviceOrientationLandscapeLeft:
      name = @"landscape-secondary";
      degrees = @90;
      isLandscape = YES;
      break;
    case UIDeviceOrientationFaceDown:
    case UIDeviceOrientationFaceUp:
    case UIDeviceOrientationUnknown:
      // Unsupported
      return nil;
  }
  return @{
    @"name" : name,
    @"rotationDegrees" : degrees,
    @"isLandscape" : @(isLandscape),
  };
}

- (void)namedOrientationDidChange
{
  NSDictionary *orientationEvent = deviceOrientationEventBody([UIDevice currentDevice].orientation);
  if (!orientationEvent) {
    return;
  }

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
  [[_moduleRegistry moduleForName:"EventDispatcher"] sendDeviceEventWithName:@"namedOrientationDidChange"
                                                                        body:orientationEvent];
#pragma clang diagnostic pop
}
#endif // [macOS] [visionOS]

- (dispatch_queue_t)methodQueue
{
  return RCTGetUIManagerQueue();
}

- (void)registerRootViewTag:(NSNumber *)rootTag
{
  RCTAssertUIManagerQueue();

  RCTAssert(RCTIsReactRootView(rootTag), @"Attempt to register rootTag (%@) which is not actually root tag.", rootTag);

  RCTAssert(
      ![_rootViewTags containsObject:rootTag],
      @"Attempt to register rootTag (%@) which was already registered.",
      rootTag);

  [_rootViewTags addObject:rootTag];

  // Registering root shadow view
  RCTSurfaceRootShadowView *shadowView = [RCTSurfaceRootShadowView new];
  shadowView.reactTag = rootTag;
  _shadowViewRegistry[rootTag] = shadowView;

  // Registering root view
  RCTExecuteOnMainQueue(^{
    RCTSurfaceRootView *rootView = [RCTSurfaceRootView new];
    rootView.reactTag = rootTag;
    self->_viewRegistry[rootTag] = rootView;
  });
}

- (void)registerRootView:(RCTRootContentView *)rootView
{
  RCTAssertMainQueue();

  NSNumber *reactTag = rootView.reactTag;
  RCTAssert(RCTIsReactRootView(reactTag), @"View %@ with tag #%@ is not a root view", rootView, reactTag);

  RCTPlatformView *existingView = _viewRegistry[reactTag]; // [macOS]
  RCTAssert(
      existingView == nil || existingView == rootView,
      @"Expect all root views to have unique tag. Added %@ twice",
      reactTag);

  CGSize availableSize = rootView.availableSize;

  // Register view
  _viewRegistry[reactTag] = rootView;

  // Register shadow view
  RCTRootShadowView *shadowView = [RCTRootShadowView new]; // [macOS] do this early to prevent RCTI18nUtil deadlock

  RCTExecuteOnUIManagerQueue(^{
    if (!self->_viewRegistry) {
      return;
    }

    shadowView.availableSize = availableSize;
    shadowView.reactTag = reactTag;
    shadowView.viewName = NSStringFromClass([rootView class]);
    self->_shadowViewRegistry[shadowView.reactTag] = shadowView;
    [self->_rootViewTags addObject:reactTag];
  });
}

- (NSString *)viewNameForReactTag:(NSNumber *)reactTag
{
  RCTAssertUIManagerQueue();
  NSString *name = _shadowViewRegistry[reactTag].viewName;
  if (name) {
    return name;
  }

// Re-enable componentViewName_DO_NOT_USE_THIS_IS_BROKEN once macOS uses Fabric
#if !TARGET_OS_OSX // [macOS]
  __block RCTPlatformView *view; // [macOS]
  RCTUnsafeExecuteOnMainQueueSync(^{
    view = self->_viewRegistry[reactTag];
  });

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wundeclared-selector"

  if ([view respondsToSelector:@selector(componentViewName_DO_NOT_USE_THIS_IS_BROKEN)]) {
    return [view performSelector:@selector(componentViewName_DO_NOT_USE_THIS_IS_BROKEN)];
  }

#pragma clang diagnostic pop
#endif // [macOS]
  return nil;
}

- (RCTPlatformView *)viewForReactTag:(NSNumber *)reactTag // [macOS]
{
  RCTAssertMainQueue();
  RCTPlatformView *view = [_bridge.surfacePresenter findComponentViewWithTag_DO_NOT_USE_DEPRECATED:reactTag.integerValue]; // [macOS]
  if (!view) {
    view = _viewRegistry[reactTag];
  }
  return view;
}

- (RCTShadowView *)shadowViewForReactTag:(NSNumber *)reactTag
{
#if !TARGET_OS_OSX // [macOS]
  RCTAssertUIManagerQueue();
#endif // [macOS]
  return _shadowViewRegistry[reactTag];
}

- (void)_executeBlockWithShadowView:(void (^)(RCTShadowView *shadowView))block forTag:(NSNumber *)tag
{
  RCTAssertMainQueue();

  RCTExecuteOnUIManagerQueue(^{
    RCTShadowView *shadowView = self->_shadowViewRegistry[tag];

    if (shadowView == nil) {
      RCTLogInfo(
          @"Could not locate shadow view with tag #%@, this is probably caused by a temporary inconsistency between native views and shadow views.",
          tag);
      return;
    }

    block(shadowView);
  });
}

- (void)setAvailableSize:(CGSize)availableSize forRootView:(RCTUIView *)rootView // [macOS]
{
  RCTAssertMainQueue();

  void (^block)(RCTShadowView *) = ^(RCTShadowView *shadowView) {
    RCTAssert(
        [shadowView isKindOfClass:[RCTRootShadowView class]], @"Located shadow view is actually not root view.");

    RCTRootShadowView *rootShadowView = (RCTRootShadowView *)shadowView;

    if (CGSizeEqualToSize(availableSize, rootShadowView.availableSize)) {
      return;
    }

    rootShadowView.availableSize = availableSize;
    [self setNeedsLayout];
  };

#if TARGET_OS_OSX // [macOS
  if (rootView.inLiveResize) {
    NSNumber* tag = rootView.reactTag;
    // Synchronously relayout to prevent "tearing" when resizing windows.
    // Still run block asynchronously below so it "wins" after any in-flight layout.
    RCTUnsafeExecuteOnUIManagerQueueSync(^{
      RCTShadowView *shadowView = self->_shadowViewRegistry[tag];
      block(shadowView);
    });
  }
#endif // macOS]

  [self _executeBlockWithShadowView:block forTag:rootView.reactTag];
}

- (void)setLocalData:(NSObject *)localData forView:(RCTUIView *)view // [macOS]
{
  RCTAssertMainQueue();
  [self
      _executeBlockWithShadowView:^(RCTShadowView *shadowView) {
        shadowView.localData = localData;
        [self setNeedsLayout];
      }
                           forTag:view.reactTag];
}

- (RCTPlatformView *)viewForNativeID:(NSString *)nativeID withRootTag:(NSNumber *)rootTag
{
  if (!nativeID || !rootTag) {
    return nil;
  }
  RCTPlatformView *view;  // [macOS]
  @synchronized(self) {
    view = [_nativeIDRegistry objectForKey:RCTNativeIDRegistryKey(nativeID, rootTag)];
  }
  return view;
}

- (void)setNativeID:(NSString *)nativeID forView:(RCTUIView *)view // [macOS]
{
  if (!nativeID || !view) {
    return;
  }
  __weak RCTUIManager *weakSelf = self;
  RCTExecuteOnUIManagerQueue(^{
    NSNumber *rootTag = [weakSelf shadowViewForReactTag:view.reactTag].rootView.reactTag;
    @synchronized(weakSelf) {
      [weakSelf.nativeIDRegistry setObject:view forKey:RCTNativeIDRegistryKey(nativeID, rootTag)];
    }
  });
}

- (void)setSize:(CGSize)size forView:(RCTUIView *)view // [macOS]
{
  RCTAssertMainQueue();
  [self
      _executeBlockWithShadowView:^(RCTShadowView *shadowView) {
        if (CGSizeEqualToSize(size, shadowView.size)) {
          return;
        }

        shadowView.size = size;
        [self setNeedsLayout];
      }
                           forTag:view.reactTag];
}

- (void)setIntrinsicContentSize:(CGSize)intrinsicContentSize forView:(RCTUIView *)view // [macOS]
{
  RCTAssertMainQueue();
  [self
      _executeBlockWithShadowView:^(RCTShadowView *shadowView) {
        if (CGSizeEqualToSize(shadowView.intrinsicContentSize, intrinsicContentSize)) {
          return;
        }

        shadowView.intrinsicContentSize = intrinsicContentSize;
        [self setNeedsLayout];
      }
                           forTag:view.reactTag];
}

/**
 * Unregisters views from registries
 */
- (void)_purgeChildren:(NSArray<id<RCTComponent>> *)children
          fromRegistry:(NSMutableDictionary<NSNumber *, id<RCTComponent>> *)registry
{
  for (id<RCTComponent> child in children) {
    RCTTraverseViewNodes(registry[child.reactTag], ^(id<RCTComponent> subview) {
      RCTAssert(![subview isReactRootView], @"Root views should not be unregistered");
      if ([subview conformsToProtocol:@protocol(RCTInvalidating)]) {
        [(id<RCTInvalidating>)subview invalidate];
      }
      [registry removeObjectForKey:subview.reactTag];
    });
  }
}

- (void)addUIBlock:(RCTViewManagerUIBlock)block
{
  RCTAssertUIManagerQueue();

  if (!block || !_viewRegistry) {
    return;
  }

  [_pendingUIBlocks addObject:block];
}

- (void)prependUIBlock:(RCTViewManagerUIBlock)block
{
  RCTAssertUIManagerQueue();

  if (!block || !_viewRegistry) {
    return;
  }

  [_pendingUIBlocks insertObject:block atIndex:0];
}

- (void)setNextLayoutAnimationGroup:(RCTLayoutAnimationGroup *)layoutAnimationGroup
{
  RCTAssertMainQueue();

  if (_layoutAnimationGroup && ![_layoutAnimationGroup isEqual:layoutAnimationGroup]) {
    RCTLogWarn(
        @"Warning: Overriding previous layout animation with new one before the first began:\n%@ -> %@.",
        [_layoutAnimationGroup description],
        [layoutAnimationGroup description]);
  }

  _layoutAnimationGroup = layoutAnimationGroup;
}

- (RCTViewManagerUIBlock)uiBlockWithLayoutUpdateForRootView:(RCTRootShadowView *)rootShadowView
{
  RCTAssertUIManagerQueue();

  NSPointerArray *affectedShadowViews = [NSPointerArray weakObjectsPointerArray];
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
      frameDataArray[index++] = (RCTFrameData){
          layoutMetrics.frame,
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
        RCTPlatformView *view = self->_viewRegistry[reactTag]; // [macOS]
        RCTAssert(view != nil, @"view (for ID %@) not found", reactTag);

        RCTRootView *rootView = (RCTRootView *)[view superview];
        if ([rootView isKindOfClass:[RCTRootView class]]) {
          rootView.intrinsicContentSize = contentSize;
        }
      });
    }
  }

  // Perform layout (possibly animated)
  return ^(__unused RCTUIManager *uiManager, NSDictionary<NSNumber *, RCTPlatformView *> *viewRegistry) { // [macOS]
    const RCTFrameData *frameDataArray = (const RCTFrameData *)framesData.bytes;
    RCTLayoutAnimationGroup *layoutAnimationGroup = uiManager->_layoutAnimationGroup;

    __block NSUInteger completionsCalled = 0;

    NSInteger index = 0;
    for (NSNumber *reactTag in reactTags) {
      RCTFrameData frameData = frameDataArray[index++];

      RCTPlatformView *view = viewRegistry[reactTag]; // [macOS]
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
    }

    // Clean up
    uiManager->_layoutAnimationGroup = nil;
  };
}

/**
 * A method to be called from JS, which takes a container ID and then releases
 * all subviews for that container upon receipt.
 */
RCT_EXPORT_METHOD(removeSubviewsFromContainerWithID : (nonnull NSNumber *)containerID)
{
  RCTLogWarn(
      @"RCTUIManager.removeSubviewsFromContainerWithID method is deprecated and it will not be implemented in newer versions of RN (Fabric) - T47686450");
  id<RCTComponent> container = _shadowViewRegistry[containerID];
  RCTAssert(container != nil, @"container view (for ID %@) not found", containerID);

  NSUInteger subviewsCount = [container reactSubviews].count;
  NSMutableArray<NSNumber *> *indices = [[NSMutableArray alloc] initWithCapacity:subviewsCount];
  for (NSUInteger childIndex = 0; childIndex < subviewsCount; childIndex++) {
    [indices addObject:@(childIndex)];
  }

  [self manageChildren:containerID
        moveFromIndices:nil
          moveToIndices:nil
      addChildReactTags:nil
           addAtIndices:nil
        removeAtIndices:indices];
}

/**
 * Disassociates children from container. Doesn't remove from registries.
 * TODO: use [NSArray getObjects:buffer] to reuse same fast buffer each time.
 *
 * @returns Array of removed items.
 */
- (NSArray<id<RCTComponent>> *)_childrenToRemoveFromContainer:(id<RCTComponent>)container
                                                    atIndices:(NSArray<NSNumber *> *)atIndices
{
  // If there are no indices to move or the container has no subviews don't bother
  // We support parents with nil subviews so long as they're all nil so this allows for this behavior
  if (atIndices.count == 0 || [container reactSubviews].count == 0) {
    return nil;
  }
  // Construction of removed children must be done "up front", before indices are disturbed by removals.
  NSMutableArray<id<RCTComponent>> *removedChildren = [NSMutableArray arrayWithCapacity:atIndices.count];
  RCTAssert(container != nil, @"container view (for ID %@) not found", container);
  for (NSNumber *indexNumber in atIndices) {
    NSUInteger index = indexNumber.unsignedIntegerValue;
    if (index < [container reactSubviews].count) {
      [removedChildren addObject:[container reactSubviews][index]];
    }
  }
  if (removedChildren.count != atIndices.count) {
    NSString *message = [NSString stringWithFormat:@"removedChildren count (%tu) was not what we expected (%tu)",
                                                   removedChildren.count,
                                                   atIndices.count];
    RCTFatal(RCTErrorWithMessage(message));
  }
  return removedChildren;
}

- (void)_removeChildren:(NSArray<id<RCTComponent>> *)children fromContainer:(id<RCTComponent>)container
{
  for (id<RCTComponent> removedChild in children) {
    [container removeReactSubview:removedChild];
  }
}

/**
 * Remove subviews from their parent with an animation.
 */
- (void)_removeChildren:(NSArray<RCTPlatformView *> *)children // [macOS]
          fromContainer:(RCTPlatformView *)container // [macOS]
          withAnimation:(RCTLayoutAnimationGroup *)animation
{
  RCTAssertMainQueue();
  RCTLayoutAnimation *deletingLayoutAnimation = animation.deletingLayoutAnimation;

  __block NSUInteger completionsCalled = 0;
  for (RCTPlatformView *removedChild in children) { // [macOS]
    void (^completion)(BOOL) = ^(BOOL finished) {
      completionsCalled++;

      [removedChild removeFromSuperview];

      if (animation.callback && completionsCalled == children.count) {
        animation.callback(@[ @(finished) ]);

        // It's unsafe to call this callback more than once, so we nil it out here
        // to make sure that doesn't happen.
        animation.callback = nil;
      }
    };

    // Hack: At this moment we have two contradict intents.
    // First one: We want to delete the view from view hierarchy.
    // Second one: We want to animate this view, which implies the existence of this view in the hierarchy.
    // So, we have to remove this view from React's view hierarchy but postpone removing from UIKit's hierarchy.
    // Here the problem: the default implementation of `-[UIView removeReactSubview:]` also removes the view from
    // UIKit's hierarchy. So, let's temporary restore the view back after removing. To do so, we have to memorize
    // original `superview` (which can differ from `container`) and an index of removed view.
    RCTPlatformView *originalSuperview = removedChild.superview; // [macOS]
    NSUInteger originalIndex = [originalSuperview.subviews indexOfObjectIdenticalTo:removedChild];
#if TARGET_OS_OSX // [macOS
    NSView *nextLowerView = nil;
    if (originalIndex > 0) {
      nextLowerView = [originalSuperview.subviews objectAtIndex:originalIndex - 1];
    }
#endif // macOS]
    [container removeReactSubview:removedChild];
    // Disable user interaction while the view is animating
    // since the view is (conceptually) deleted and not supposed to be interactive.
    if ([removedChild respondsToSelector:@selector(setUserInteractionEnabled:)]) { // [macOS
      ((RCTUIView *)removedChild).userInteractionEnabled = NO; // [macOS]
    }
#if !TARGET_OS_OSX // [macOS]
    [originalSuperview insertSubview:removedChild atIndex:originalIndex];
#else // [macOS
    [originalSuperview addSubview:removedChild positioned:nextLowerView == nil ? NSWindowBelow : NSWindowAbove relativeTo:nextLowerView];
#endif // macOS]
    
    NSString *property = deletingLayoutAnimation.property;
    [deletingLayoutAnimation
          performAnimations:^{
            if ([property isEqualToString:@"scaleXY"]) {
              removedChild.layer.transform = CATransform3DMakeScale(0.001, 0.001, 0.001);
            } else if ([property isEqualToString:@"scaleX"]) {
              removedChild.layer.transform = CATransform3DMakeScale(0.001, 1, 0.001);
            } else if ([property isEqualToString:@"scaleY"]) {
              removedChild.layer.transform = CATransform3DMakeScale(1, 0.001, 0.001);
            } else if ([property isEqualToString:@"opacity"]) {
              removedChild.layer.opacity = 0.0;
            } else {
              RCTLogError(@"Unsupported layout animation createConfig property %@", deletingLayoutAnimation.property);
            }
          }
        withCompletionBlock:completion];
  }
}

RCT_EXPORT_METHOD(removeRootView : (nonnull NSNumber *)rootReactTag)
{
  RCTShadowView *rootShadowView = _shadowViewRegistry[rootReactTag];
  RCTAssert(rootShadowView.superview == nil, @"root view cannot have superview (ID %@)", rootReactTag);
  [self _purgeChildren:(NSArray<id<RCTComponent>> *)rootShadowView.reactSubviews
          fromRegistry:(NSMutableDictionary<NSNumber *, id<RCTComponent>> *)_shadowViewRegistry];
  [_shadowViewRegistry removeObjectForKey:rootReactTag];
  [_rootViewTags removeObject:rootReactTag];

  [self addUIBlock:^(RCTUIManager *uiManager, NSDictionary<NSNumber *, RCTPlatformView *> *viewRegistry) { // [macOS]
    RCTAssertMainQueue();
    RCTPlatformView *rootView = viewRegistry[rootReactTag]; // [macOS]
    [uiManager _purgeChildren:(NSArray<id<RCTComponent>> *)rootView.reactSubviews
                 fromRegistry:(NSMutableDictionary<NSNumber *, id<RCTComponent>> *)viewRegistry];
    [(NSMutableDictionary *)viewRegistry removeObjectForKey:rootReactTag];
  }];
}

RCT_EXPORT_METHOD(replaceExistingNonRootView : (nonnull NSNumber *)reactTag withView : (nonnull NSNumber *)newReactTag)
{
  RCTLogWarn(
      @"RCTUIManager.replaceExistingNonRootView method is deprecated and it will not be implemented in newer versions of RN (Fabric) - T47686450");
  RCTShadowView *shadowView = _shadowViewRegistry[reactTag];
  RCTAssert(shadowView != nil, @"shadowView (for ID %@) not found", reactTag);

  RCTShadowView *superShadowView = shadowView.superview;
  if (!superShadowView) {
    RCTAssert(NO, @"shadowView super (of ID %@) not found", reactTag);
    return;
  }

  NSUInteger indexOfView = [superShadowView.reactSubviews indexOfObjectIdenticalTo:shadowView];
  RCTAssert(indexOfView != NSNotFound, @"View's superview doesn't claim it as subview (id %@)", reactTag);
  NSArray<NSNumber *> *removeAtIndices = @[ @(indexOfView) ];
  NSArray<NSNumber *> *addTags = @[ newReactTag ];
  [self manageChildren:superShadowView.reactTag
        moveFromIndices:nil
          moveToIndices:nil
      addChildReactTags:addTags
           addAtIndices:removeAtIndices
        removeAtIndices:removeAtIndices];
}

RCT_EXPORT_METHOD(setChildren : (nonnull NSNumber *)containerTag reactTags : (NSArray<NSNumber *> *)reactTags)
{
  RCTSetChildren(containerTag, reactTags, (NSDictionary<NSNumber *, id<RCTComponent>> *)_shadowViewRegistry);

  [self addUIBlock:^(__unused RCTUIManager *uiManager, NSDictionary<NSNumber *, RCTPlatformView *> *viewRegistry) { // [macOS]
    RCTSetChildren(containerTag, reactTags, (NSDictionary<NSNumber *, id<RCTComponent>> *)viewRegistry);
  }];

  [self _shadowViewDidReceiveUpdatedChildren:_shadowViewRegistry[containerTag]];
}

static void RCTSetChildren(
    NSNumber *containerTag,
    NSArray<NSNumber *> *reactTags,
    NSDictionary<NSNumber *, id<RCTComponent>> *registry)
{
  id<RCTComponent> container = registry[containerTag];
  NSInteger index = 0;
  for (NSNumber *reactTag in reactTags) {
    id<RCTComponent> view = registry[reactTag];
    if (view) {
      [container insertReactSubview:view atIndex:index++];
    }
  }
}

RCT_EXPORT_METHOD(manageChildren
                  : (nonnull NSNumber *)containerTag moveFromIndices
                  : (NSArray<NSNumber *> *)moveFromIndices moveToIndices
                  : (NSArray<NSNumber *> *)moveToIndices addChildReactTags
                  : (NSArray<NSNumber *> *)addChildReactTags addAtIndices
                  : (NSArray<NSNumber *> *)addAtIndices removeAtIndices
                  : (NSArray<NSNumber *> *)removeAtIndices)
{
  [self _manageChildren:containerTag
        moveFromIndices:moveFromIndices
          moveToIndices:moveToIndices
      addChildReactTags:addChildReactTags
           addAtIndices:addAtIndices
        removeAtIndices:removeAtIndices
               registry:(NSMutableDictionary<NSNumber *, id<RCTComponent>> *)_shadowViewRegistry];

  [self addUIBlock:^(RCTUIManager *uiManager, NSDictionary<NSNumber *, RCTPlatformView *> *viewRegistry) { // [macOS]
    [uiManager _manageChildren:containerTag
               moveFromIndices:moveFromIndices
                 moveToIndices:moveToIndices
             addChildReactTags:addChildReactTags
                  addAtIndices:addAtIndices
               removeAtIndices:removeAtIndices
                      registry:(NSMutableDictionary<NSNumber *, id<RCTComponent>> *)viewRegistry];
  }];

  [self _shadowViewDidReceiveUpdatedChildren:_shadowViewRegistry[containerTag]];
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
  RCTAssert(
      moveFromIndices.count == moveToIndices.count,
      @"moveFromIndices had size %tu, moveToIndices had size %tu",
      moveFromIndices.count,
      moveToIndices.count);
  RCTAssert(addChildReactTags.count == addAtIndices.count, @"there should be at least one React child to add");

  // Removes (both permanent and temporary moves) are using "before" indices
  NSArray<id<RCTComponent>> *permanentlyRemovedChildren = [self _childrenToRemoveFromContainer:container
                                                                                     atIndices:removeAtIndices];
  NSArray<id<RCTComponent>> *temporarilyRemovedChildren = [self _childrenToRemoveFromContainer:container
                                                                                     atIndices:moveFromIndices];

  BOOL isUIViewRegistry = ((id)registry == (id)_viewRegistry);
  if (isUIViewRegistry && _layoutAnimationGroup.deletingLayoutAnimation) {
    [self _removeChildren:(NSArray<RCTPlatformView *> *)permanentlyRemovedChildren // [macOS]
            fromContainer:(RCTPlatformView *)container // [macOS]
            withAnimation:_layoutAnimationGroup];
  } else {
    [self _removeChildren:permanentlyRemovedChildren fromContainer:container];
  }

  [self _removeChildren:temporarilyRemovedChildren fromContainer:container];
  [self _purgeChildren:permanentlyRemovedChildren fromRegistry:registry];

  // Figure out what to insert - merge temporary inserts and adds
  NSMutableDictionary *destinationsToChildrenToAdd = [NSMutableDictionary dictionary];
  for (NSInteger index = 0, length = temporarilyRemovedChildren.count; index < length; index++) {
    destinationsToChildrenToAdd[moveToIndices[index]] = temporarilyRemovedChildren[index];
  }

  for (NSInteger index = 0, length = addAtIndices.count; index < length; index++) {
    id<RCTComponent> view = registry[addChildReactTags[index]];
    if (view) {
      destinationsToChildrenToAdd[addAtIndices[index]] = view;
    }
  }

  NSArray<NSNumber *> *sortedIndices =
      [destinationsToChildrenToAdd.allKeys sortedArrayUsingSelector:@selector(compare:)];
  for (NSNumber *reactIndex in sortedIndices) {
    [container insertReactSubview:destinationsToChildrenToAdd[reactIndex] atIndex:reactIndex.integerValue];
  }
}

RCT_EXPORT_METHOD(createView
                  : (nonnull NSNumber *)reactTag viewName
                  : (NSString *)viewName rootTag
                  : (nonnull NSNumber *)rootTag props
                  : (NSDictionary *)props)
{
  RCTComponentData *componentData = _componentDataByName[viewName];
  if (componentData == nil) {
    RCTLogError(@"No component found for view with name \"%@\"", viewName);
  }

  // Register shadow view
  RCTShadowView *shadowView = [componentData createShadowViewWithTag:reactTag];
  if (shadowView) {
    [componentData setProps:props forShadowView:shadowView];
    _shadowViewRegistry[reactTag] = shadowView;
    RCTShadowView *rootView = _shadowViewRegistry[rootTag];
    RCTAssert(
        [rootView isKindOfClass:[RCTRootShadowView class]]
        || [rootView isKindOfClass:[RCTSurfaceRootShadowView class]]
        ,
        @"Given `rootTag` (%@) does not correspond to a valid root shadow view instance.",
        rootTag);
    shadowView.rootView = (RCTRootShadowView *)rootView;
  }

  // Dispatch view creation directly to the main thread instead of adding to
  // UIBlocks array. This way, it doesn't get deferred until after layout.
  __block RCTPlatformView *preliminaryCreatedView = nil; // [macOS]

  void (^createViewBlock)(void) = ^{
    // Do nothing on the second run.
    if (preliminaryCreatedView) {
      return;
    }

    preliminaryCreatedView = [componentData createViewWithTag:reactTag rootTag:rootTag];

    if (preliminaryCreatedView) {
      self->_viewRegistry[reactTag] = preliminaryCreatedView;
    }
  };

  // We cannot guarantee that asynchronously scheduled block will be executed
  // *before* a block is added to the regular mounting process (simply because
  // mounting process can be managed externally while the main queue is
  // locked).
  // So, we positively dispatch it asynchronously and double check inside
  // the regular mounting block.

  RCTExecuteOnMainQueue(createViewBlock);

  [self addUIBlock:^(__unused RCTUIManager *uiManager, __unused NSDictionary<NSNumber *, RCTPlatformView *> *viewRegistry) { // [macOS]
    createViewBlock();

    if (preliminaryCreatedView) {
      [componentData setProps:props forView:preliminaryCreatedView];
    }
  }];

  [self _shadowView:shadowView didReceiveUpdatedProps:[props allKeys]];
}

RCT_EXPORT_METHOD(updateView
                  : (nonnull NSNumber *)reactTag viewName
                  : (NSString *)viewName // not always reliable, use shadowView.viewName if available
                      props
                  : (NSDictionary *)props)
{
  RCTShadowView *shadowView = _shadowViewRegistry[reactTag];
  RCTComponentData *componentData = _componentDataByName[shadowView.viewName ?: viewName];
  [componentData setProps:props forShadowView:shadowView];

  [self addUIBlock:^(__unused RCTUIManager *uiManager, NSDictionary<NSNumber *, RCTPlatformView *> *viewRegistry) { // [macOS]
    RCTPlatformView *view = viewRegistry[reactTag]; // [macOS]
    [componentData setProps:props forView:view];
  }];

  [self _shadowView:shadowView didReceiveUpdatedProps:[props allKeys]];
}

- (void)synchronouslyUpdateViewOnUIThread:(NSNumber *)reactTag viewName:(NSString *)viewName props:(NSDictionary *)props
{
  RCTAssertMainQueue();
  RCTComponentData *componentData = _componentDataByName[viewName];
  RCTPlatformView *view = _viewRegistry[reactTag]; // [macOS]
  [componentData setProps:props forView:view];
}

RCT_EXPORT_METHOD(focus : (nonnull NSNumber *)reactTag)
{
  [self addUIBlock:^(__unused RCTUIManager *uiManager, NSDictionary<NSNumber *, RCTUIView *> *viewRegistry) { // [macOS]
    RCTUIView *newResponder = viewRegistry[reactTag]; // [macOS]
    [newResponder reactFocus];
  }];
}

RCT_EXPORT_METHOD(blur : (nonnull NSNumber *)reactTag)
{
  [self addUIBlock:^(__unused RCTUIManager *uiManager, NSDictionary<NSNumber *, RCTUIView *> *viewRegistry) { // [macOS]
    RCTUIView *currentResponder = viewRegistry[reactTag]; // [macOS]
    [currentResponder reactBlur];
  }];
}

RCT_EXPORT_METHOD(findSubviewIn
                  : (nonnull NSNumber *)reactTag atPoint
                  : (CGPoint)point callback
                  : (RCTResponseSenderBlock)callback)
{
  [self addUIBlock:^(__unused RCTUIManager *uiManager, NSDictionary<NSNumber *, RCTPlatformView *> *viewRegistry) { // [macOS]
    RCTPlatformView *view = viewRegistry[reactTag]; // [macOS]
    RCTPlatformView *target = RCTUIViewHitTestWithEvent(view, point, nil); // [macOS]
    CGRect frame = [target convertRect:target.bounds toView:view];

    while (target.reactTag == nil && target.superview != nil) {
      target = target.superview;
    }

    callback(@[
      RCTNullIfNil(target.reactTag),
      @(frame.origin.x),
      @(frame.origin.y),
      @(frame.size.width),
      @(frame.size.height),
    ]);
  }];
}

RCT_EXPORT_METHOD(dispatchViewManagerCommand
                  : (nonnull NSNumber *)reactTag commandID
                  : (id /*(NSString or NSNumber) */)commandID commandArgs
                  : (NSArray<id> *)commandArgs)
{
  RCTShadowView *shadowView = _shadowViewRegistry[reactTag];
  RCTComponentData *componentData = _componentDataByName[shadowView.viewName];

// Re-enable componentViewName_DO_NOT_USE_THIS_IS_BROKEN once macOS uses Fabric
#if !TARGET_OS_OSX // [macOS]
  // Achtung! Achtung!
  // This is a remarkably hacky and ugly workaround.
  // We need this only temporary for some testing. We need this hack until Fabric fully implements command-execution
  // pipeline. This does not affect non-Fabric apps.
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wundeclared-selector"
  if (!componentData) {
    __block RCTPlatformView *view; // [macOS]
    RCTUnsafeExecuteOnMainQueueSync(^{
      view = self->_viewRegistry[reactTag];
    });
    if ([view respondsToSelector:@selector(componentViewName_DO_NOT_USE_THIS_IS_BROKEN)]) {
      NSString *name = [view performSelector:@selector(componentViewName_DO_NOT_USE_THIS_IS_BROKEN)];
      componentData = _componentDataByName[[NSString stringWithFormat:@"RCT%@", name]];
    }
  }
#pragma clang diagnostic pop
#endif // [macOS]

  Class managerClass = componentData.managerClass;
  RCTModuleData *moduleData = [_bridge moduleDataForName:RCTBridgeModuleNameForClass(managerClass)];

  id<RCTBridgeMethod> method;
  if ([commandID isKindOfClass:[NSNumber class]]) {
    method = moduleData.methods[[commandID intValue]];
  } else if ([commandID isKindOfClass:[NSString class]]) {
    method = moduleData.methodsByName[commandID];
    if (method == nil) {
      RCTLogError(@"No command found with name \"%@\"", commandID);
    }
  } else {
    RCTLogError(@"dispatchViewManagerCommand must be called with a string or integer command");
    return;
  }

  NSArray *args = [@[ reactTag ] arrayByAddingObjectsFromArray:commandArgs];
  [method invokeWithBridge:_bridge module:componentData.manager arguments:args];
}

- (void)batchDidComplete
{
  [self _layoutAndMount];
}

/**
 * Sets up animations, computes layout, creates UI mounting blocks for computed layout,
 * runs these blocks and all other already existing blocks.
 */
- (void)_layoutAndMount
{
  [self _dispatchPropsDidChangeEvents];
  [self _dispatchChildrenDidChangeEvents];

  [_observerCoordinator uiManagerWillPerformLayout:self];

  // Perform layout
  for (NSNumber *reactTag in _rootViewTags) {
    RCTRootShadowView *rootView = (RCTRootShadowView *)_shadowViewRegistry[reactTag];
    [self addUIBlock:[self uiBlockWithLayoutUpdateForRootView:rootView]];
  }

  [_observerCoordinator uiManagerDidPerformLayout:self];

  [_observerCoordinator uiManagerWillPerformMounting:self];

  [self flushUIBlocksWithCompletion:^{
    [self->_observerCoordinator uiManagerDidPerformMounting:self];
  }];
}

- (void)flushUIBlocksWithCompletion:(void (^)(void))completion
{
  RCTAssertUIManagerQueue();

  // First copy the previous blocks into a temporary variable, then reset the
  // pending blocks to a new array. This guards against mutation while
  // processing the pending blocks in another thread.
  NSArray<RCTViewManagerUIBlock> *previousPendingUIBlocks = _pendingUIBlocks;
  _pendingUIBlocks = [NSMutableArray new];

  if (previousPendingUIBlocks.count == 0) {
    completion();
    return;
  }

  __weak typeof(self) weakSelf = self;

  void (^mountingBlock)(void) = ^{
    typeof(self) strongSelf = weakSelf;

    @try {
      for (RCTViewManagerUIBlock block in previousPendingUIBlocks) {
        block(strongSelf, strongSelf->_viewRegistry);
      }
    } @catch (NSException *exception) {
      RCTLogError(@"Exception thrown while executing UI block: %@", exception);
    }
  };

  if ([self.observerCoordinator uiManager:self performMountingWithBlock:mountingBlock]) {
    completion();
    return;
  }

  // Execute the previously queued UI blocks
  RCTProfileBeginFlowEvent();
  RCTExecuteOnMainQueue(^{
    RCTProfileEndFlowEvent();
    RCT_PROFILE_BEGIN_EVENT(RCTProfileTagAlways, @"-[UIManager flushUIBlocks]", (@{
                              @"count" : [@(previousPendingUIBlocks.count) stringValue],
                            }));

    mountingBlock();

    RCT_PROFILE_END_EVENT(RCTProfileTagAlways, @"");

    RCTExecuteOnUIManagerQueue(completion);
  });
}

- (void)setNeedsLayout
{
  // If there is an active batch layout will happen when batch finished, so we will wait for that.
  // Otherwise we immediately trigger layout.
  if (![_bridge isBatchActive] && ![_bridge isLoading]) {
    [self _layoutAndMount];
  }
}

- (void)_shadowView:(RCTShadowView *)shadowView didReceiveUpdatedProps:(NSArray<NSString *> *)props
{
  // We collect a set with changed `shadowViews` and its changed props,
  // so we have to maintain this collection properly.
  NSArray<NSString *> *previousProps;
  if ((previousProps = [_shadowViewsWithUpdatedProps objectForKey:shadowView])) {
    // Merging already registered changed props and new ones.
    NSMutableSet *set = [NSMutableSet setWithArray:previousProps];
    [set addObjectsFromArray:props];
    props = [set allObjects];
  }

  [_shadowViewsWithUpdatedProps setObject:props forKey:shadowView];
}

- (void)_shadowViewDidReceiveUpdatedChildren:(RCTShadowView *)shadowView
{
  [_shadowViewsWithUpdatedChildren addObject:shadowView];
}

- (void)_dispatchChildrenDidChangeEvents
{
  if (_shadowViewsWithUpdatedChildren.count == 0) {
    return;
  }

  NSHashTable<RCTShadowView *> *shadowViews = _shadowViewsWithUpdatedChildren;
  _shadowViewsWithUpdatedChildren = [NSHashTable weakObjectsHashTable];

  NSMutableArray *tags = [NSMutableArray arrayWithCapacity:shadowViews.count];

  for (RCTShadowView *shadowView in shadowViews) {
    [shadowView didUpdateReactSubviews];
    [tags addObject:shadowView.reactTag];
  }

  [self addUIBlock:^(__unused RCTUIManager *uiManager, NSDictionary<NSNumber *, RCTUIView *> *viewRegistry) { // [macOS]
    for (NSNumber *tag in tags) {
      RCTUIView<RCTComponent> *view = viewRegistry[tag]; // [macOS]
      [view didUpdateReactSubviews];
    }
  }];
}

- (void)_dispatchPropsDidChangeEvents
{
  if (_shadowViewsWithUpdatedProps.count == 0) {
    return;
  }

  NSMapTable<RCTShadowView *, NSArray<NSString *> *> *shadowViews = _shadowViewsWithUpdatedProps;
  _shadowViewsWithUpdatedProps = [NSMapTable weakToStrongObjectsMapTable];

  NSMapTable<NSNumber *, NSArray<NSString *> *> *tags = [NSMapTable strongToStrongObjectsMapTable];

  for (RCTShadowView *shadowView in shadowViews) {
    NSArray<NSString *> *props = [shadowViews objectForKey:shadowView];
    [shadowView didSetProps:props];
    [tags setObject:props forKey:shadowView.reactTag];
  }

  [self addUIBlock:^(__unused RCTUIManager *uiManager, NSDictionary<NSNumber *, RCTUIView *> *viewRegistry) { // [macOS]
    for (NSNumber *tag in tags) {
      RCTUIView<RCTComponent> *view = viewRegistry[tag]; // [macOS]
      [view didSetProps:[tags objectForKey:tag]];
    }
  }];
}

RCT_EXPORT_METHOD(measure : (nonnull NSNumber *)reactTag callback : (RCTResponseSenderBlock)callback)
{
  [self addUIBlock:^(__unused RCTUIManager *uiManager, NSDictionary<NSNumber *, RCTPlatformView *> *viewRegistry) { // [macOS]
    RCTPlatformView *view = viewRegistry[reactTag]; // [macOS]
    if (!view) {
      // this view was probably collapsed out
      RCTLogWarn(@"measure cannot find view with tag #%@", reactTag);
      callback(@[]);
      return;
    }

    // If in a <Modal>, rootView will be the root of the modal container.
    RCTPlatformView *rootView = view; // [macOS]
    while (rootView.superview && ![rootView isReactRootView]) {
      rootView = rootView.superview;
    }

    // By convention, all coordinates, whether they be touch coordinates, or
    // measurement coordinates are with respect to the root view.
    CGRect frame = view.frame;
    CGRect globalBounds = [view convertRect:view.bounds toView:rootView];

    callback(@[
      @(frame.origin.x),
      @(frame.origin.y),
      @(globalBounds.size.width),
      @(globalBounds.size.height),
      @(globalBounds.origin.x),
      @(globalBounds.origin.y),
    ]);
  }];
}

RCT_EXPORT_METHOD(measureInWindow : (nonnull NSNumber *)reactTag callback : (RCTResponseSenderBlock)callback)
{
  [self addUIBlock:^(__unused RCTUIManager *uiManager, NSDictionary<NSNumber *, RCTPlatformView *> *viewRegistry) { // [macOS]
    RCTPlatformView *view = viewRegistry[reactTag]; // [macOS]
    if (!view) {
      // this view was probably collapsed out
      RCTLogWarn(@"measure cannot find view with tag #%@", reactTag);
      callback(@[]);
      return;
    }

    // Return frame coordinates in window
    CGRect windowFrame = [view convertRect:view.bounds toView:nil];
#if TARGET_OS_OSX // [macOS
    //The macOS default coordinate system has its origin at the lower left of the drawing area, so we need to flip the y-axis coordinate.
    windowFrame.origin.y = view.window.contentView.frame.size.height - windowFrame.origin.y - windowFrame.size.height;
#endif // macOS]
    
    callback(@[
      @(windowFrame.origin.x),
      @(windowFrame.origin.y),
      @(windowFrame.size.width),
      @(windowFrame.size.height),
    ]);
  }];
}

/**
 * Returns if the shadow view provided has the `ancestor` shadow view as
 * an actual ancestor.
 */
RCT_EXPORT_METHOD(viewIsDescendantOf
                  : (nonnull NSNumber *)reactTag ancestor
                  : (nonnull NSNumber *)ancestorReactTag callback
                  : (RCTResponseSenderBlock)callback)
{
  RCTShadowView *shadowView = _shadowViewRegistry[reactTag];
  RCTShadowView *ancestorShadowView = _shadowViewRegistry[ancestorReactTag];
  if (!shadowView) {
    return;
  }
  if (!ancestorShadowView) {
    return;
  }
  BOOL viewIsAncestor = [shadowView viewIsDescendantOf:ancestorShadowView];
  callback(@[ @(viewIsAncestor) ]);
}

static void RCTMeasureLayout(RCTShadowView *view, RCTShadowView *ancestor, RCTResponseSenderBlock callback)
{
  if (!view) {
    return;
  }
  if (!ancestor) {
    return;
  }
  CGRect result = [view measureLayoutRelativeToAncestor:ancestor];
  if (CGRectIsNull(result)) {
    RCTLogError(
        @"view %@ (tag #%@) is not a descendant of %@ (tag #%@)", view, view.reactTag, ancestor, ancestor.reactTag);
    return;
  }
  CGFloat leftOffset = result.origin.x;
  CGFloat topOffset = result.origin.y;
  CGFloat width = result.size.width;
  CGFloat height = result.size.height;
  if (isnan(leftOffset) || isnan(topOffset) || isnan(width) || isnan(height)) {
    RCTLogError(@"Attempted to measure layout but offset or dimensions were NaN");
    return;
  }
  callback(@[ @(leftOffset), @(topOffset), @(width), @(height) ]);
}

/**
 * Returns the computed recursive offset layout in a dictionary form. The
 * returned values are relative to the `ancestor` shadow view. Returns `nil`, if
 * the `ancestor` shadow view is not actually an `ancestor`. Does not touch
 * anything on the main UI thread. Invokes supplied callback with (x, y, width,
 * height).
 */
RCT_EXPORT_METHOD(measureLayout
                  : (nonnull NSNumber *)reactTag relativeTo
                  : (nonnull NSNumber *)ancestorReactTag errorCallback
                  : (__unused RCTResponseSenderBlock)errorCallback callback
                  : (RCTResponseSenderBlock)callback)
{
  RCTShadowView *shadowView = _shadowViewRegistry[reactTag];
  RCTShadowView *ancestorShadowView = _shadowViewRegistry[ancestorReactTag];
  RCTMeasureLayout(shadowView, ancestorShadowView, callback);
}

/**
 * Returns the computed recursive offset layout in a dictionary form. The
 * returned values are relative to the `ancestor` shadow view. Returns `nil`, if
 * the `ancestor` shadow view is not actually an `ancestor`. Does not touch
 * anything on the main UI thread. Invokes supplied callback with (x, y, width,
 * height).
 */
RCT_EXPORT_METHOD(measureLayoutRelativeToParent
                  : (nonnull NSNumber *)reactTag errorCallback
                  : (__unused RCTResponseSenderBlock)errorCallback callback
                  : (RCTResponseSenderBlock)callback)
{
  RCTLogWarn(
      @"RCTUIManager.measureLayoutRelativeToParent method is deprecated and it will not be implemented in newer versions of RN (Fabric) - T47686450");
  RCTShadowView *shadowView = _shadowViewRegistry[reactTag];
  RCTMeasureLayout(shadowView, shadowView.reactSuperview, callback);
}

/**
 * JS sets what *it* considers to be the responder. Later, scroll views can use
 * this in order to determine if scrolling is appropriate.
 */
RCT_EXPORT_METHOD(setJSResponder
                  : (nonnull NSNumber *)reactTag blockNativeResponder
                  : (__unused BOOL)blockNativeResponder)
{
  [self addUIBlock:^(__unused RCTUIManager *uiManager, NSDictionary<NSNumber *, RCTPlatformView *> *viewRegistry) { // [macOS]
    _jsResponder = viewRegistry[reactTag];
    // Fabric view's are not stored in viewRegistry. We avoid logging a warning in that case.
    if (!_jsResponder && !RCTUIManagerTypeForTagIsFabric(reactTag)) {
      RCTLogWarn(@"Invalid view set to be the JS responder - tag %@", reactTag);
    }
  }];
}

RCT_EXPORT_METHOD(clearJSResponder)
{
  [self addUIBlock:^(__unused RCTUIManager *uiManager, __unused NSDictionary<NSNumber *, RCTPlatformView *> *viewRegistry) { // [macOS]
    _jsResponder = nil;
  }];
}

NSMutableDictionary<NSString *, id> *RCTModuleConstantsForDestructuredComponent(
    NSMutableDictionary<NSString *, NSDictionary *> *directEvents,
    NSMutableDictionary<NSString *, NSDictionary *> *bubblingEvents,
    Class managerClass,
    NSString *name,
    NSDictionary<NSString *, id> *viewConfig)
{
  NSMutableDictionary<NSString *, id> *moduleConstants = [NSMutableDictionary new];

  // Register which event-types this view dispatches.
  // React needs this for the event plugin.
  NSMutableDictionary<NSString *, NSDictionary *> *bubblingEventTypes = [NSMutableDictionary new];
  NSMutableDictionary<NSString *, NSDictionary *> *directEventTypes = [NSMutableDictionary new];

  // Add manager class
  moduleConstants[@"Manager"] = RCTBridgeModuleNameForClass(managerClass);

  // Add native props
  moduleConstants[@"NativeProps"] = viewConfig[@"propTypes"];
  moduleConstants[@"baseModuleName"] = viewConfig[@"baseModuleName"];
  moduleConstants[@"bubblingEventTypes"] = bubblingEventTypes;
  moduleConstants[@"directEventTypes"] = directEventTypes;
  // In the Old Architecture the "Commands" and "Constants" properties of view manager config are populated by
  // lazifyViewManagerConfig function in JS. This fuction uses NativeModules global object that is not available in the
  // New Architecture. To make native view configs work in the New Architecture we will populate these properties in
  // native.
  if (RCTGetUseNativeViewConfigsInBridgelessMode()) {
    moduleConstants[@"Commands"] = viewConfig[@"Commands"];
    moduleConstants[@"Constants"] = viewConfig[@"Constants"];
  }
  // Add direct events
  for (NSString *eventName in viewConfig[@"directEvents"]) {
    if (!directEvents[eventName]) {
      directEvents[eventName] = @{
        @"registrationName" : [eventName stringByReplacingCharactersInRange:(NSRange){0, 3} withString:@"on"],
      };
    }
    directEventTypes[eventName] = directEvents[eventName];
    if (RCT_DEBUG && bubblingEvents[eventName]) {
      RCTLogError(
          @"Component '%@' re-registered bubbling event '%@' as a "
           "direct event",
          name,
          eventName);
    }
  }

  // Add bubbling events
  for (NSString *eventName in viewConfig[@"bubblingEvents"]) {
    if (!bubblingEvents[eventName]) {
      NSString *bubbleName = [eventName stringByReplacingCharactersInRange:(NSRange){0, 3} withString:@"on"];
      bubblingEvents[eventName] = @{
        @"phasedRegistrationNames" : @{
          @"bubbled" : bubbleName,
          @"captured" : [bubbleName stringByAppendingString:@"Capture"],
        }
      };
    }
    bubblingEventTypes[eventName] = bubblingEvents[eventName];
    if (RCT_DEBUG && directEvents[eventName]) {
      RCTLogError(
          @"Component '%@' re-registered direct event '%@' as a "
           "bubbling event",
          name,
          eventName);
    }
  }

  // Add capturing events (added as bubbling events but with the 'skipBubbling' flag)
  for (NSString *eventName in viewConfig[@"capturingEvents"]) {
    if (!bubblingEvents[eventName]) {
      NSString *bubbleName = [eventName stringByReplacingCharactersInRange:(NSRange){0, 3} withString:@"on"];
      bubblingEvents[eventName] = @{
        @"phasedRegistrationNames" : @{
          @"bubbled" : bubbleName,
          @"captured" : [bubbleName stringByAppendingString:@"Capture"],
          @"skipBubbling" : @YES
        }
      };
    }
    bubblingEventTypes[eventName] = bubblingEvents[eventName];
    if (RCT_DEBUG && directEvents[eventName]) {
      RCTLogError(
          @"Component '%@' re-registered direct event '%@' as a "
           "bubbling event",
          name,
          eventName);
    }
  }

  return moduleConstants;
}

static NSMutableDictionary<NSString *, id> *moduleConstantsForComponentData(
    NSMutableDictionary<NSString *, NSDictionary *> *directEvents,
    NSMutableDictionary<NSString *, NSDictionary *> *bubblingEvents,
    RCTComponentData *componentData)
{
  return RCTModuleConstantsForDestructuredComponent(
      directEvents, bubblingEvents, componentData.managerClass, componentData.name, componentData.viewConfig);
}

- (NSDictionary<NSString *, id> *)constantsToExport
{
  return [self getConstants];
}

- (NSDictionary<NSString *, id> *)getConstants
{
  NSMutableDictionary<NSString *, NSDictionary *> *constants = [NSMutableDictionary new];
  NSMutableDictionary<NSString *, NSDictionary *> *directEvents = [NSMutableDictionary new];
  NSMutableDictionary<NSString *, NSDictionary *> *bubblingEvents = [NSMutableDictionary new];

  [_componentDataByName
      enumerateKeysAndObjectsUsingBlock:^(NSString *name, RCTComponentData *componentData, __unused BOOL *stop) {
        RCTAssert(!constants[name], @"UIManager already has constants for %@", componentData.name);
        NSMutableDictionary<NSString *, id> *moduleConstants =
            moduleConstantsForComponentData(directEvents, bubblingEvents, componentData);
        constants[name] = moduleConstants;
      }];

  return constants;
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(lazilyLoadView : (NSString *)name)
{
  if (_componentDataByName[name]) {
    return @{};
  }

  id<RCTBridgeDelegate> delegate = self.bridge.delegate;
  if (![delegate respondsToSelector:@selector(bridge:didNotFindModule:)]) {
    return @{};
  }

  NSString *moduleName = name;
  BOOL result = [delegate bridge:self.bridge didNotFindModule:moduleName];
  if (!result) {
    moduleName = [name stringByAppendingString:@"Manager"];
    result = [delegate bridge:self.bridge didNotFindModule:moduleName];
  }
  if (!result) {
    return @{};
  }

  id module = [self.bridge moduleForName:moduleName lazilyLoadIfNecessary:RCTTurboModuleEnabled()];
  if (module == nil) {
    // There is all sorts of code in this codebase that drops prefixes.
    //
    // If we didn't find a module, it's possible because it's stored under a key
    // which had RCT Prefixes stripped. Lets check one more time...
    module = [self.bridge moduleForName:RCTDropReactPrefixes(moduleName) lazilyLoadIfNecessary:RCTTurboModuleEnabled()];
  }

  if (!module) {
    return @{};
  }

  RCTComponentData *componentData = [[RCTComponentData alloc] initWithManagerClass:[module class]
                                                                            bridge:self.bridge
                                                                   eventDispatcher:self.bridge.eventDispatcher];
  _componentDataByName[componentData.name] = componentData;
  NSMutableDictionary<NSString *, NSDictionary *> *directEvents = [NSMutableDictionary new];
  NSMutableDictionary<NSString *, NSDictionary *> *bubblingEvents = [NSMutableDictionary new];
  NSMutableDictionary<NSString *, id> *moduleConstants =
      moduleConstantsForComponentData(directEvents, bubblingEvents, componentData);
  return @{
    @"viewConfig" : moduleConstants,
  };
}

RCT_EXPORT_METHOD(configureNextLayoutAnimation
                  : (NSDictionary *)config withCallback
                  : (RCTResponseSenderBlock)callback errorCallback
                  : (__unused RCTResponseSenderBlock)errorCallback)
{
  RCTLayoutAnimationGroup *layoutAnimationGroup = [[RCTLayoutAnimationGroup alloc] initWithConfig:config
                                                                                         callback:callback];

  [self addUIBlock:^(RCTUIManager *uiManager, __unused NSDictionary<NSNumber *, RCTPlatformView *> *viewRegistry) { // [macOS]
    [uiManager setNextLayoutAnimationGroup:layoutAnimationGroup];
  }];
}

- (void)rootViewForReactTag:(NSNumber *)reactTag withCompletion:(void (^)(RCTPlatformView *view))completion // [macOS]
{
  RCTAssertMainQueue();
  RCTAssert(completion != nil, @"Attempted to resolve rootView for tag %@ without a completion block", reactTag);

  if (reactTag == nil) {
    completion(nil);
    return;
  }

  RCTExecuteOnUIManagerQueue(^{
    NSNumber *rootTag = [self shadowViewForReactTag:reactTag].rootView.reactTag;
    RCTExecuteOnMainQueue(^{
      RCTPlatformView *rootView = nil; // [macOS]
      if (rootTag != nil) {
        rootView = [self viewForReactTag:rootTag];
      }
      completion(rootView);
    });
  });
}


static RCTPlatformView *_jsResponder; // [macOS]

+ (RCTPlatformView *)JSResponder // [macOS]
{
  RCTErrorNewArchitectureValidation(
      RCTNotAllowedInFabricWithoutLegacy, @"RCTUIManager", @"Please migrate this legacy surface to Fabric.");
  return _jsResponder;
}

@end

@implementation RCTBridge (RCTUIManager)

- (RCTUIManager *)uiManager
{
  return [self moduleForClass:[RCTUIManager class]];
}

@end
