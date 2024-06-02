/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTBridge.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTBridgeProxy.h>
#import <React/RCTInvalidating.h>
#import <React/RCTRootView.h>
#import <React/RCTUIKit.h> // [macOS]
#import <React/RCTViewManager.h>

/**
 * Posted right before re-render happens. This is a chance for views to invalidate their state so
 * next render cycle will pick up updated views and layout appropriately.
 */
RCT_EXTERN NSString *const RCTUIManagerWillUpdateViewsDueToContentSizeMultiplierChangeNotification;

void RCTTraverseViewNodes(id<RCTComponent> view, void (^block)(id<RCTComponent>)); // [macOS]

@class RCTLayoutAnimationGroup;
@class RCTUIManagerObserverCoordinator;

/**
 * The RCTUIManager is the module responsible for updating the view hierarchy.
 */
@interface RCTUIManager : NSObject <RCTBridgeModule, RCTInvalidating>

/**
 * Register a root view tag and creates corresponding `rootView` and
 * `rootShadowView`.
 */
- (void)registerRootViewTag:(NSNumber *)rootTag;

/**
 * Register a root view with the RCTUIManager.
 */
- (void)registerRootView:(RCTUIView *)rootView; // [macOS]

/**
 * Gets the view name associated with a reactTag.
 */
- (NSString *)viewNameForReactTag:(NSNumber *)reactTag;

/**
 * Gets the view associated with a reactTag.
 */
- (RCTPlatformView *)viewForReactTag:(NSNumber *)reactTag; // [macOS]

/**
 * Gets the shadow view associated with a reactTag.
 */
- (RCTShadowView *)shadowViewForReactTag:(NSNumber *)reactTag;

/**
 * Set the available size (`availableSize` property) for a root view.
 * This might be used in response to changes in external layout constraints.
 * This value will be directly trasmitted to layout engine and defines how big viewport is;
 * this value does not affect root node size style properties.
 * Can be considered as something similar to `setSize:forView:` but applicable only for root view.
 */
- (void)setAvailableSize:(CGSize)availableSize forRootView:(RCTUIView *)rootView; // [macOS]

/**
 * Sets local data for a shadow view corresponded with given view.
 * In some cases we need a way to specify some environmental data to shadow view
 * to improve layout (or do something similar), so `localData` serves these needs.
 * For example, any stateful embedded native views may benefit from this.
 * Have in mind that this data is not supposed to interfere with the state of
 * the shadow view.
 * Please respect one-directional data flow of React.
 */
- (void)setLocalData:(NSObject *)localData forView:(RCTUIView *)view; // [macOS]

/**
 * Set the size of a view. This might be in response to a screen rotation
 * or some other layout event outside of the React-managed view hierarchy.
 */
- (void)setSize:(CGSize)size forView:(RCTPlatformView *)view; // [macOS]

/**
 * Set the natural size of a view, which is used when no explicit size is set.
 * Use `UIViewNoIntrinsicMetric` to ignore a dimension.
 * The `size` must NOT include padding and border.
 */
- (void)setIntrinsicContentSize:(CGSize)intrinsicContentSize forView:(RCTPlatformView *)view; // [macOS]

/**
 * Sets up layout animation which will perform on next layout pass.
 * The animation will affect only one next layout pass.
 * Must be called on the main queue.
 */
- (void)setNextLayoutAnimationGroup:(RCTLayoutAnimationGroup *)layoutAnimationGroup;

/**
 * Schedule a block to be executed on the UI thread. Useful if you need to execute
 * view logic after all currently queued view updates have completed.
 */
- (void)addUIBlock:(RCTViewManagerUIBlock)block;

/**
 * Schedule a block to be executed on the UI thread. Useful if you need to execute
 * view logic before all currently queued view updates have completed.
 */
- (void)prependUIBlock:(RCTViewManagerUIBlock)block;

/**
 * Used by native animated module to bypass the process of updating the values through the shadow
 * view hierarchy. This method will directly update native views, which means that updates for
 * layout-related propertied won't be handled properly.
 * Make sure you know what you're doing before calling this method :)
 */
- (void)synchronouslyUpdateViewOnUIThread:(NSNumber *)reactTag
                                 viewName:(NSString *)viewName
                                    props:(NSDictionary *)props;

/**
 * Given a reactTag from a component, find its root view, if possible.
 * Otherwise, this will give back nil.
 *
 * @param reactTag the component tag
 * @param completion the completion block that will hand over the rootView, if any.
 *
 */
- (void)rootViewForReactTag:(NSNumber *)reactTag withCompletion:(void (^)(RCTPlatformView *view))completion; // [macOS]

/**
 * Finds a view that is tagged with nativeID as its nativeID prop
 * with the associated rootTag root tag view hierarchy. Returns the
 * view if found, nil otherwise.
 *
 * @param nativeID the id reference to native component relative to root view.
 * @param rootTag the react tag of root view hierarchy from which to find the view.
 */
- (RCTPlatformView *)viewForNativeID:(NSString *)nativeID withRootTag:(NSNumber *)rootTag; // [macOS]

/**
 * Register a view that is tagged with nativeID as its nativeID prop
 *
 * @param nativeID the id reference to native component relative to root view.
 * @param view the view that is tagged with nativeID as its nativeID prop.
 */
- (void)setNativeID:(NSString *)nativeID forView:(RCTUIView *)view; // [macOS]

/**
 * The view that is currently first responder, according to the JS context.
 */
+ (RCTPlatformView *)JSResponder; // [macOS]

/**
 * In some cases we might want to trigger layout from native side.
 * React won't be aware of this, so we need to make sure it happens.
 */
- (void)setNeedsLayout;

/**
 * Dedicated object for subscribing for UIManager events.
 * See `RCTUIManagerObserver` protocol for more details.
 */
@property (atomic, retain, readonly) RCTUIManagerObserverCoordinator *observerCoordinator;

@end

/**
 * This category makes the current RCTUIManager instance available via the
 * RCTBridge, which is useful for RCTBridgeModules or RCTViewManagers that
 * need to access the RCTUIManager.
 */
@interface RCTBridge (RCTUIManager)

@property (nonatomic, readonly) RCTUIManager *uiManager;

@end

@interface RCTBridgeProxy (RCTUIManager)

@property (nonatomic, readonly) RCTUIManager *uiManager;

@end

RCT_EXTERN NSMutableDictionary<NSString *, id> *RCTModuleConstantsForDestructuredComponent(
    NSMutableDictionary<NSString *, NSDictionary *> *directEvents,
    NSMutableDictionary<NSString *, NSDictionary *> *bubblingEvents,
    Class managerClass,
    NSString *name,
    NSDictionary<NSString *, id> *viewConfig);
