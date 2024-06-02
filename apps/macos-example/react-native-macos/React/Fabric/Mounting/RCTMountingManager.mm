/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTMountingManager.h"

#import <QuartzCore/QuartzCore.h>

#import <React/RCTAssert.h>
#import <React/RCTComponent.h>
#import <React/RCTFollyConvert.h>
#import <React/RCTLog.h>
#import <React/RCTUtils.h>
#import <react/config/ReactNativeConfig.h>
#import <react/renderer/components/root/RootShadowNode.h>
#import <react/renderer/core/LayoutableShadowNode.h>
#import <react/renderer/core/RawProps.h>
#import <react/renderer/debug/SystraceSection.h>
#import <react/renderer/mounting/TelemetryController.h>
#import <react/utils/CoreFeatures.h>

#import <React/RCTComponentViewProtocol.h>
#import <React/RCTComponentViewRegistry.h>
#import <React/RCTConversions.h>
#import <React/RCTMountingTransactionObserverCoordinator.h>

using namespace facebook::react;

static SurfaceId RCTSurfaceIdForView(RCTUIView *view) // [macOS]
{
  do {
    if (RCTIsReactRootView(@(view.tag))) {
      return view.tag;
    }
    view = view.superview;
  } while (view != nil);

  return -1;
}

static void RCTPerformMountInstructions(
    const ShadowViewMutationList &mutations,
    RCTComponentViewRegistry *registry,
    RCTMountingTransactionObserverCoordinator &observerCoordinator,
    SurfaceId surfaceId)
{
  SystraceSection s("RCTPerformMountInstructions");

  for (const auto &mutation : mutations) {
    switch (mutation.type) {
      case ShadowViewMutation::Create: {
        auto &newChildShadowView = mutation.newChildShadowView;
        auto &newChildViewDescriptor =
            [registry dequeueComponentViewWithComponentHandle:newChildShadowView.componentHandle
                                                          tag:newChildShadowView.tag];
        observerCoordinator.registerViewComponentDescriptor(newChildViewDescriptor, surfaceId);
        break;
      }

      case ShadowViewMutation::Delete: {
        auto &oldChildShadowView = mutation.oldChildShadowView;
        auto &oldChildViewDescriptor = [registry componentViewDescriptorWithTag:oldChildShadowView.tag];

        observerCoordinator.unregisterViewComponentDescriptor(oldChildViewDescriptor, surfaceId);

        [registry enqueueComponentViewWithComponentHandle:oldChildShadowView.componentHandle
                                                      tag:oldChildShadowView.tag
                                  componentViewDescriptor:oldChildViewDescriptor];
        break;
      }

      case ShadowViewMutation::Insert: {
        auto &oldChildShadowView = mutation.oldChildShadowView;
        auto &newChildShadowView = mutation.newChildShadowView;
        auto &parentShadowView = mutation.parentShadowView;
        auto &newChildViewDescriptor = [registry componentViewDescriptorWithTag:newChildShadowView.tag];
        auto &parentViewDescriptor = [registry componentViewDescriptorWithTag:parentShadowView.tag];

        RCTUIView<RCTComponentViewProtocol> *newChildComponentView = newChildViewDescriptor.view; // [macOS]

        RCTAssert(newChildShadowView.props, @"`newChildShadowView.props` must not be null.");

        [newChildComponentView updateProps:newChildShadowView.props oldProps:oldChildShadowView.props];
        [newChildComponentView updateEventEmitter:newChildShadowView.eventEmitter];
        [newChildComponentView updateState:newChildShadowView.state oldState:oldChildShadowView.state];
        [newChildComponentView updateLayoutMetrics:newChildShadowView.layoutMetrics
                                  oldLayoutMetrics:oldChildShadowView.layoutMetrics];
        [newChildComponentView finalizeUpdates:RNComponentViewUpdateMaskAll];

        [parentViewDescriptor.view mountChildComponentView:newChildComponentView index:mutation.index];
        break;
      }

      case ShadowViewMutation::Remove: {
        auto &oldChildShadowView = mutation.oldChildShadowView;
        auto &parentShadowView = mutation.parentShadowView;
        auto &oldChildViewDescriptor = [registry componentViewDescriptorWithTag:oldChildShadowView.tag];
        auto &parentViewDescriptor = [registry componentViewDescriptorWithTag:parentShadowView.tag];
        [parentViewDescriptor.view unmountChildComponentView:oldChildViewDescriptor.view index:mutation.index];
        break;
      }

      case ShadowViewMutation::RemoveDeleteTree: {
        // TODO - not supported yet
        break;
      }

      case ShadowViewMutation::Update: {
        auto &oldChildShadowView = mutation.oldChildShadowView;
        auto &newChildShadowView = mutation.newChildShadowView;
        auto &newChildViewDescriptor = [registry componentViewDescriptorWithTag:newChildShadowView.tag];
        RCTUIView<RCTComponentViewProtocol> *newChildComponentView = newChildViewDescriptor.view; // [macOS]

        auto mask = RNComponentViewUpdateMask{};

        RCTAssert(newChildShadowView.props, @"`newChildShadowView.props` must not be null.");

        if (oldChildShadowView.props != newChildShadowView.props) {
          [newChildComponentView updateProps:newChildShadowView.props oldProps:oldChildShadowView.props];
          mask |= RNComponentViewUpdateMaskProps;
        }

        if (oldChildShadowView.eventEmitter != newChildShadowView.eventEmitter) {
          [newChildComponentView updateEventEmitter:newChildShadowView.eventEmitter];
          mask |= RNComponentViewUpdateMaskEventEmitter;
        }

        if (oldChildShadowView.state != newChildShadowView.state) {
          [newChildComponentView updateState:newChildShadowView.state oldState:oldChildShadowView.state];
          mask |= RNComponentViewUpdateMaskState;
        }

        if (oldChildShadowView.layoutMetrics != newChildShadowView.layoutMetrics) {
          [newChildComponentView updateLayoutMetrics:newChildShadowView.layoutMetrics
                                    oldLayoutMetrics:oldChildShadowView.layoutMetrics];
          mask |= RNComponentViewUpdateMaskLayoutMetrics;
        }

        if (mask != RNComponentViewUpdateMaskNone) {
          [newChildComponentView finalizeUpdates:mask];
        }

        break;
      }
    }
  }
}

@implementation RCTMountingManager {
  RCTMountingTransactionObserverCoordinator _observerCoordinator;
  BOOL _transactionInFlight;
  BOOL _followUpTransactionRequired;
  ContextContainer::Shared _contextContainer;
}

- (instancetype)init
{
  if (self = [super init]) {
    _componentViewRegistry = [RCTComponentViewRegistry new];
  }

  return self;
}

- (void)setContextContainer:(ContextContainer::Shared)contextContainer
{
  _contextContainer = contextContainer;
}

- (void)attachSurfaceToView:(RCTUIView *)view surfaceId:(SurfaceId)surfaceId // [macOS]
{
  RCTAssertMainQueue();

  RCTAssert(view.subviews.count == 0, @"The view must not have any subviews.");

  RCTComponentViewDescriptor rootViewDescriptor =
      [_componentViewRegistry dequeueComponentViewWithComponentHandle:RootShadowNode::Handle() tag:surfaceId];
  [view addSubview:rootViewDescriptor.view];
}

- (void)detachSurfaceFromView:(RCTUIView *)view surfaceId:(SurfaceId)surfaceId // [macOS]
{
  RCTAssertMainQueue();
  RCTComponentViewDescriptor rootViewDescriptor = [_componentViewRegistry componentViewDescriptorWithTag:surfaceId];

  [rootViewDescriptor.view removeFromSuperview];

  [_componentViewRegistry enqueueComponentViewWithComponentHandle:RootShadowNode::Handle()
                                                              tag:surfaceId
                                          componentViewDescriptor:rootViewDescriptor];
}

- (void)scheduleTransaction:(MountingCoordinator::Shared)mountingCoordinator
{
  if (RCTIsMainQueue()) {
    // Already on the proper thread, so:
    // * No need to do a thread jump;
    // * No need to do expensive copy of all mutations;
    // * No need to allocate a block.
    [self initiateTransaction:*mountingCoordinator];
    return;
  }

  RCTExecuteOnMainQueue(^{
    RCTAssertMainQueue();
    [self initiateTransaction:*mountingCoordinator];
  });
}

- (void)dispatchCommand:(ReactTag)reactTag commandName:(NSString *)commandName args:(NSArray *)args
{
  if (RCTIsMainQueue()) {
    // Already on the proper thread, so:
    // * No need to do a thread jump;
    // * No need to allocate a block.
    [self synchronouslyDispatchCommandOnUIThread:reactTag commandName:commandName args:args];
    return;
  }

  RCTExecuteOnMainQueue(^{
    [self synchronouslyDispatchCommandOnUIThread:reactTag commandName:commandName args:args];
  });
}

- (void)sendAccessibilityEvent:(ReactTag)reactTag eventType:(NSString *)eventType
{
  if (RCTIsMainQueue()) {
    // Already on the proper thread, so:
    // * No need to do a thread jump;
    // * No need to allocate a block.
    [self synchronouslyDispatchAccessbilityEventOnUIThread:reactTag eventType:eventType];
    return;
  }

  RCTExecuteOnMainQueue(^{
    [self synchronouslyDispatchAccessbilityEventOnUIThread:reactTag eventType:eventType];
  });
}

- (void)initiateTransaction:(const MountingCoordinator &)mountingCoordinator
{
  SystraceSection s("-[RCTMountingManager initiateTransaction:]");
  RCTAssertMainQueue();

  if (_transactionInFlight) {
    _followUpTransactionRequired = YES;
    return;
  }

  do {
    _followUpTransactionRequired = NO;
    _transactionInFlight = YES;
    [self performTransaction:mountingCoordinator];
    _transactionInFlight = NO;
  } while (_followUpTransactionRequired);
}

- (void)performTransaction:(const MountingCoordinator &)mountingCoordinator
{
  SystraceSection s("-[RCTMountingManager performTransaction:]");
  RCTAssertMainQueue();

  auto surfaceId = mountingCoordinator.getSurfaceId();

  mountingCoordinator.getTelemetryController().pullTransaction(
      [&](const MountingTransaction &transaction, const SurfaceTelemetry &surfaceTelemetry) {
        [self.delegate mountingManager:self willMountComponentsWithRootTag:surfaceId];
        _observerCoordinator.notifyObserversMountingTransactionWillMount(transaction, surfaceTelemetry);
      },
      [&](const MountingTransaction &transaction, const SurfaceTelemetry &surfaceTelemetry) {
        RCTPerformMountInstructions(
            transaction.getMutations(), _componentViewRegistry, _observerCoordinator, surfaceId);
      },
      [&](const MountingTransaction &transaction, const SurfaceTelemetry &surfaceTelemetry) {
        _observerCoordinator.notifyObserversMountingTransactionDidMount(transaction, surfaceTelemetry);
        [self.delegate mountingManager:self didMountComponentsWithRootTag:surfaceId];
      });
}

- (void)setIsJSResponder:(BOOL)isJSResponder
    blockNativeResponder:(BOOL)blockNativeResponder
           forShadowView:(const facebook::react::ShadowView &)shadowView
{
  ReactTag reactTag = shadowView.tag;
  RCTExecuteOnMainQueue(^{
    RCTUIView<RCTComponentViewProtocol> *componentView = [self->_componentViewRegistry findComponentViewWithTag:reactTag]; // [macOS]
    [componentView setIsJSResponder:isJSResponder];
  });
}

- (void)synchronouslyUpdateViewOnUIThread:(ReactTag)reactTag
                             changedProps:(NSDictionary *)props
                      componentDescriptor:(const ComponentDescriptor &)componentDescriptor
{
  RCTAssertMainQueue();
  RCTUIView<RCTComponentViewProtocol> *componentView = [_componentViewRegistry findComponentViewWithTag:reactTag]; // [macOS]
  SurfaceId surfaceId = RCTSurfaceIdForView(componentView);
  Props::Shared oldProps = [componentView props];
  Props::Shared newProps = componentDescriptor.cloneProps(
      PropsParserContext{surfaceId, *_contextContainer.get()}, oldProps, RawProps(convertIdToFollyDynamic(props)));

  NSSet<NSString *> *propKeys = componentView.propKeysManagedByAnimated_DO_NOT_USE_THIS_IS_BROKEN ?: [NSSet new];
  propKeys = [propKeys setByAddingObjectsFromArray:props.allKeys];
  componentView.propKeysManagedByAnimated_DO_NOT_USE_THIS_IS_BROKEN = nil;
  [componentView updateProps:newProps oldProps:oldProps];
  componentView.propKeysManagedByAnimated_DO_NOT_USE_THIS_IS_BROKEN = propKeys;

  const auto &newViewProps = static_cast<const ViewProps &>(*newProps);

  if (props[@"transform"]) {
    auto layoutMetrics = LayoutMetrics();
    layoutMetrics.frame.size.width = componentView.layer.bounds.size.width;
    layoutMetrics.frame.size.height = componentView.layer.bounds.size.height;
    CATransform3D newTransform = RCTCATransform3DFromTransformMatrix(newViewProps.resolveTransform(layoutMetrics));
    if (!CATransform3DEqualToTransform(newTransform, componentView.layer.transform)) {
      componentView.layer.transform = newTransform;
    }
  }
  if (props[@"opacity"] && componentView.layer.opacity != (float)newViewProps.opacity) {
    componentView.layer.opacity = newViewProps.opacity;
  }

  [componentView finalizeUpdates:RNComponentViewUpdateMaskProps];
}

- (void)synchronouslyDispatchCommandOnUIThread:(ReactTag)reactTag
                                   commandName:(NSString *)commandName
                                          args:(NSArray *)args
{
  RCTAssertMainQueue();
  RCTUIView<RCTComponentViewProtocol> *componentView = [_componentViewRegistry findComponentViewWithTag:reactTag]; // [macOS]
  [componentView handleCommand:commandName args:args];
}

- (void)synchronouslyDispatchAccessbilityEventOnUIThread:(ReactTag)reactTag eventType:(NSString *)eventType
{
  if ([@"focus" isEqualToString:eventType]) {
    RCTUIView<RCTComponentViewProtocol> *componentView = [_componentViewRegistry findComponentViewWithTag:reactTag]; // [macOS]
#if !TARGET_OS_OSX // [macOS]
    UIAccessibilityPostNotification(UIAccessibilityLayoutChangedNotification, componentView);
#endif // [macOS]
  }
}

@end
