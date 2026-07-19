#import <reanimated/Tools/FeatureFlags.h>
#import <reanimated/apple/REAAssertJavaScriptQueue.h>
#import <reanimated/apple/REAAssertTurboModuleManagerQueue.h>
#import <reanimated/apple/REACoreAnimationDelegate.h>
#import <reanimated/apple/REANodesManager.h>
#import <reanimated/apple/REAUIView.h>
// LayoutAnimationTrace start
#ifndef NDEBUG
#import <reanimated/apple/LayoutAnimationTraceInstrumentation.h>
#endif // NDEBUG
// LayoutAnimationTrace end

#import <React/RCTComponentViewProtocol.h>
#import <React/RCTComponentViewRegistry.h>
#import <React/RCTMountingManager.h>
#import <React/RCTUtils.h>

#import <QuartzCore/QuartzCore.h>

#import <algorithm>
#import <cmath>
#import <string>
#import <unordered_map>
#import <vector>

using namespace facebook::react;

@implementation REANodesManager {
  READisplayLink *_displayLink;
  NSMutableArray<REAOnAnimationCallback> *_onAnimationCallbacks;
  REAEventHandler _eventHandler;
  REAPerformOperations _performOperations;
}

- (READisplayLink *)getDisplayLink
{
  RCTAssertMainQueue();

  if (!_displayLink) {
    _displayLink = [READisplayLink displayLinkWithTarget:self selector:@selector(onAnimationFrame:)];
#if !TARGET_OS_OSX
    _displayLink.preferredFramesPerSecond = 120; // will fallback to 60 fps for devices without Pro Motion display
#endif // TARGET_OS_OSX
    [_displayLink addToRunLoop:[NSRunLoop mainRunLoop] forMode:NSRunLoopCommonModes];
  }
  return _displayLink;
}

- (void)useDisplayLinkOnMainQueue:(CADisplayLinkOperation)displayLinkOperation
{
  // This method is called on the JavaScript queue during initialization or on the ShadowQueue during invalidation.
  react_native_assert(REAIsJavaScriptQueue() || REAIsTurboModuleManagerQueue());

  __weak __typeof__(self) weakSelf = self;
  RCTExecuteOnMainQueue(^{
    __typeof__(self) strongSelf = weakSelf;
    if (strongSelf == nil) {
      return;
    }
    displayLinkOperation([strongSelf getDisplayLink]);
  });
}

- (nonnull instancetype)init
{
  REAAssertJavaScriptQueue();

  if ((self = [super init])) {
    _onAnimationCallbacks = [NSMutableArray new];
    _eventHandler = ^(id<RCTEvent> event) {
      // no-op
    };
  }
  [self useDisplayLinkOnMainQueue:^(READisplayLink *displayLink) { [displayLink setPaused:YES]; }];

  return self;
}

- (void)invalidate
{
  REAAssertTurboModuleManagerQueue();

  _eventHandler = nil;
  [self useDisplayLinkOnMainQueue:^(READisplayLink *displayLink) { [displayLink invalidate]; }];
}

- (void)postOnAnimation:(REAOnAnimationCallback)clb
{
  RCTAssertMainQueue();
  [_onAnimationCallbacks addObject:clb];
  [self startUpdatingOnAnimationFrame];
}

- (void)registerEventHandler:(REAEventHandler)eventHandler
{
  REAAssertJavaScriptQueue();
  _eventHandler = eventHandler;
}

- (void)registerPerformOperations:(REAPerformOperations)performOperations
{
  REAAssertJavaScriptQueue();
  _performOperations = performOperations;
}

- (void)startUpdatingOnAnimationFrame
{
  RCTAssertMainQueue();
  [[self getDisplayLink] setPaused:NO];
}

- (void)stopUpdatingOnAnimationFrame
{
  RCTAssertMainQueue();
  [[self getDisplayLink] setPaused:YES];
}

- (void)onAnimationFrame:(READisplayLink *)displayLink
{
  RCTAssertMainQueue();

  NSArray<REAOnAnimationCallback> *callbacks = _onAnimationCallbacks;
  _onAnimationCallbacks = [NSMutableArray new];

  // When one of the callbacks would postOnAnimation callback we don't want
  // to process it until the next frame. This is why we cpy the array before
  // we iterate over it
  for (REAOnAnimationCallback block in callbacks) {
    block(displayLink);
  }

  [self performOperations];

  if (_onAnimationCallbacks.count == 0) {
    [self stopUpdatingOnAnimationFrame];
  }
}

- (void)performOperations
{
  RCTAssertMainQueue();
  _performOperations(); // calls ReanimatedModuleProxy::performOperations
}

- (void)dispatchEvent:(id<RCTEvent>)event
{
  RCTAssertMainQueue();
  __weak REAEventHandler eventHandler = _eventHandler;
  __weak __typeof__(self) weakSelf = self;
  RCTExecuteOnMainQueue(^void() {
    __typeof__(self) strongSelf = weakSelf;
    if (strongSelf == nil) {
      return;
    }
    if (eventHandler == nil) {
      return;
    }
    eventHandler(event);
    if constexpr (reanimated::StaticFeatureFlags::getFlag("USE_ANIMATION_BACKEND")) {
      // Flush already ran inside ReanimatedModuleProxy::handleEventAndFlush (see ReanimatedModule).
    } else {
      [strongSelf performOperations];
    }
  });
}

- (void)maybeFlushUIUpdatesQueue
{
  RCTAssertMainQueue();
  if ([[self getDisplayLink] isPaused]) {
    [self performOperations];
  }
}

- (void)synchronouslyUpdateUIProps:(ReactTag)viewTag props:(const folly::dynamic &)props
{
  RCTAssertMainQueue();

  RCTSurfacePresenter *surfacePresenter = self.surfacePresenter;
  RCTComponentViewRegistry *componentViewRegistry = surfacePresenter.mountingManager.componentViewRegistry;
  REAUIView<RCTComponentViewProtocol> *componentView =
      [componentViewRegistry findComponentViewWithTag:static_cast<Tag>(viewTag)];
  NSSet<NSString *> *propKeysManagedByAnimated = [componentView propKeysManagedByAnimated_DO_NOT_USE_THIS_IS_BROKEN];
  [surfacePresenter schedulerDidSynchronouslyUpdateViewOnUIThread:viewTag props:props];
  [componentView setPropKeysManagedByAnimated_DO_NOT_USE_THIS_IS_BROKEN:propKeysManagedByAnimated];
  // `synchronouslyUpdateViewOnUIThread` does not flush props like `backgroundColor` etc.
  // so that's why we need to call `finalizeUpdates` here.
  [componentView finalizeUpdates:RNComponentViewUpdateMask{}];
}

- (void)runNativeLayoutAnimation:(reanimated::NativeLayoutAnimationHandle)handle
                      descriptor:(const reanimated::NativeLayoutAnimationDescriptor &)descriptor
            usePresentationLayer:(bool)usePresentationLayer
               cancellationToken:(reanimated::NativeLayoutAnimationCancellationToken)cancellationToken
                      completion:(std::function<void(bool)>)completion
{
  const ReactTag viewTag = handle.tag;

  // Core Animation must be driven on the main thread, but the descriptor is
  // produced on the UI (worklet) thread - hop over with owned inputs.
  if (![NSThread isMainThread]) {
    auto ownedDescriptor = std::make_shared<const reanimated::NativeLayoutAnimationDescriptor>(descriptor);
    auto ownedCompletion = std::make_shared<std::function<void(bool)>>(std::move(completion));
    __weak REANodesManager *weakSelf = self;
    dispatch_async(dispatch_get_main_queue(), ^{
      REANodesManager *strongSelf = weakSelf;
      if (strongSelf == nil) {
// LayoutAnimationTrace start
#ifndef NDEBUG
        reanimated::layout_animation_trace::recordApplePlatformCompleted(viewTag, *ownedDescriptor, nil, false, false);
#endif // NDEBUG
       // LayoutAnimationTrace end
        (*ownedCompletion)(NO);
        return;
      }
      [strongSelf runNativeLayoutAnimationOnMain:handle
                                      descriptor:*ownedDescriptor
                            usePresentationLayer:usePresentationLayer
                               cancellationToken:std::move(cancellationToken)
                                      completion:std::move(*ownedCompletion)];
    });
    return;
  }

  [self runNativeLayoutAnimationOnMain:handle
                            descriptor:descriptor
                  usePresentationLayer:usePresentationLayer
                     cancellationToken:std::move(cancellationToken)
                            completion:std::move(completion)];
}

- (void)runNativeLayoutAnimationOnMain:(reanimated::NativeLayoutAnimationHandle)handle
                            descriptor:(const reanimated::NativeLayoutAnimationDescriptor &)descriptor
                  usePresentationLayer:(bool)usePresentationLayer
                     cancellationToken:(reanimated::NativeLayoutAnimationCancellationToken)cancellationToken
                            completion:(std::function<void(bool)>)completion
{
  RCTAssertMainQueue();
  const ReactTag viewTag = handle.tag;

  if (cancellationToken->load(std::memory_order_acquire)) {
// LayoutAnimationTrace start
#ifndef NDEBUG
    reanimated::layout_animation_trace::recordApplePlatformCompleted(viewTag, descriptor, nil, false, false);
#endif // NDEBUG
    // LayoutAnimationTrace end
    completion(NO);
    return;
  }

  if (descriptor.properties.empty()) {
// LayoutAnimationTrace start
#ifndef NDEBUG
    reanimated::layout_animation_trace::recordApplePlatformCompleted(viewTag, descriptor, nil, true, false);
#endif // NDEBUG
    // LayoutAnimationTrace end
    completion(YES);
    return;
  }

  RCTSurfacePresenter *surfacePresenter = self.surfacePresenter;
  RCTComponentViewRegistry *componentViewRegistry = surfacePresenter.mountingManager.componentViewRegistry;
  REAUIView<RCTComponentViewProtocol> *componentView =
      [componentViewRegistry findComponentViewWithTag:static_cast<Tag>(viewTag)];
// LayoutAnimationTrace start
#ifndef NDEBUG
  reanimated::layout_animation_trace::recordApplePostMountObserved(viewTag, descriptor, componentView);
  reanimated::layout_animation_trace::recordAppleNativeViewLookup(viewTag, descriptor, componentView);
#endif // NDEBUG
  // LayoutAnimationTrace end
  if (componentView == nil) {
// LayoutAnimationTrace start
#ifndef NDEBUG
    reanimated::layout_animation_trace::recordApplePlatformCompleted(viewTag, descriptor, nil, false, false);
#endif // NDEBUG
    // LayoutAnimationTrace end
    completion(NO);
    return;
  }
  CALayer *layer = componentView.layer;
  NSString *generationKey = [NSString stringWithFormat:@"REA_LAYOUT_GENERATION_%llu", handle.generation];

  // Index the sampled channels by name for quick lookup / interpolation.
  std::unordered_map<std::string, const reanimated::NativeLayoutAnimationProperty *> channels;
  for (const auto &property : descriptor.properties) {
    channels[property.keyPath] = &property;
  }
  auto hasChannel = [&channels](const char *name) {
    return channels.find(name) != channels.end();
  };

  // Linear interpolation of a channel's sampled values at a normalized offset.
  auto channelValueAt = [&channels](const char *name, double offset, double fallback) -> double {
    auto it = channels.find(name);
    if (it == channels.end()) {
      return fallback;
    }
    const auto &offsets = it->second->offsets;
    const auto &values = it->second->values;
    if (values.empty()) {
      return fallback;
    }
    if (offset <= offsets.front()) {
      return values.front();
    }
    if (offset >= offsets.back()) {
      return values.back();
    }
    for (size_t i = 1; i < offsets.size(); i++) {
      if (offset <= offsets[i]) {
        const double span = offsets[i] - offsets[i - 1];
        const double t = span > 0 ? (offset - offsets[i - 1]) / span : 0;
        return values[i - 1] + (values[i] - values[i - 1]) * t;
      }
    }
    return values.back();
  };

  // Build a single uniform timeline. Resampling every grouped channel onto the
  // same key times keeps composed transforms / position-from-origin aligned.
  size_t sampleCount = 2;
  for (const auto &property : descriptor.properties) {
    sampleCount = std::max(sampleCount, property.offsets.size());
  }
  sampleCount = std::min<size_t>(sampleCount, 240);

  std::vector<double> sampleOffsets;
  sampleOffsets.reserve(sampleCount);
  NSMutableArray<NSNumber *> *keyTimes = [NSMutableArray arrayWithCapacity:sampleCount];
  for (size_t i = 0; i < sampleCount; i++) {
    const double offset = sampleCount > 1 ? static_cast<double>(i) / static_cast<double>(sampleCount - 1) : 0;
    sampleOffsets.push_back(offset);
    [keyTimes addObject:@(offset)];
  }

  double durationSec = descriptor.durationMs / 1000.0;
  if (durationSec <= 0) {
    durationSec = 1.0 / 60.0;
  }

  // Compose a CATransform3D from the canonical transform channels in a fixed
  // order (scale -> skew -> rotateZ -> rotateX -> rotateY -> translate ->
  // perspective). Channel angles are already in radians.
  auto composeTransform = [&channelValueAt](double offset) -> CATransform3D {
    const double sx = channelValueAt("scaleX", offset, 1);
    const double sy = channelValueAt("scaleY", offset, 1);
    const double skewX = channelValueAt("skewX", offset, 0);
    const double rotationZ = channelValueAt("rotation", offset, 0);
    const double rotationX = channelValueAt("rotationX", offset, 0);
    const double rotationY = channelValueAt("rotationY", offset, 0);
    const double translateX = channelValueAt("translateX", offset, 0);
    const double translateY = channelValueAt("translateY", offset, 0);
    const double perspective = channelValueAt("perspective", offset, 0);

    CATransform3D matrix = CATransform3DMakeScale(sx, sy, 1);
    if (skewX != 0) {
      CATransform3D skew = CATransform3DIdentity;
      skew.m21 = std::tan(skewX);
      matrix = CATransform3DConcat(matrix, skew);
    }
    if (rotationZ != 0) {
      matrix = CATransform3DConcat(matrix, CATransform3DMakeRotation(rotationZ, 0, 0, 1));
    }
    if (rotationX != 0) {
      matrix = CATransform3DConcat(matrix, CATransform3DMakeRotation(rotationX, 1, 0, 0));
    }
    if (rotationY != 0) {
      matrix = CATransform3DConcat(matrix, CATransform3DMakeRotation(rotationY, 0, 1, 0));
    }
    if (translateX != 0 || translateY != 0) {
      matrix = CATransform3DConcat(matrix, CATransform3DMakeTranslation(translateX, translateY, 0));
    }
    if (perspective != 0) {
      CATransform3D perspectiveMatrix = CATransform3DIdentity;
      perspectiveMatrix.m34 = -1.0 / perspective;
      matrix = CATransform3DConcat(matrix, perspectiveMatrix);
    }
    return matrix;
  };

  CALayer *presentationLayer = usePresentationLayer ? layer.presentationLayer : nil;
  // Only start from the presentation layer when we're actually interrupting an
  // in-flight animation on that key path - otherwise a freshly committed layout
  // would incorrectly start from its final on-screen position.
  auto presentationActive = [&](NSString *keyPath) -> BOOL {
    if (presentationLayer == nil) {
      return NO;
    }
    NSString *suffix = [@"_" stringByAppendingString:keyPath];
    for (NSString *key in layer.animationKeys) {
      if ([key hasPrefix:@"REA_LAYOUT_GENERATION_"] && [key hasSuffix:suffix]) {
        return YES;
      }
    }
    return NO;
  };

  NSMutableArray<NSString *> *animatedKeyPaths = [NSMutableArray array];
  NSMutableArray<CAKeyframeAnimation *> *animations = [NSMutableArray array];
  NSMutableArray *finalModelValues = [NSMutableArray array];

  auto registerAnimation = [&](NSString *keyPath, NSMutableArray *values, id finalValue, id presentationValue) {
    if (presentationValue != nil && values.count > 0) {
      values[0] = presentationValue;
    }
    CAKeyframeAnimation *animation = [CAKeyframeAnimation animationWithKeyPath:keyPath];
    animation.values = values;
    animation.keyTimes = keyTimes;
    animation.duration = durationSec;
    animation.calculationMode = kCAAnimationLinear;
    animation.removedOnCompletion = YES;
    animation.fillMode = kCAFillModeRemoved;
    [animatedKeyPaths addObject:keyPath];
    [animations addObject:animation];
    [finalModelValues addObject:finalValue];
  };

  // opacity
  if (hasChannel("opacity")) {
    NSMutableArray<NSNumber *> *values = [NSMutableArray arrayWithCapacity:sampleCount];
    for (double offset : sampleOffsets) {
      [values addObject:@(channelValueAt("opacity", offset, 1))];
    }
    id presentationValue = presentationActive(@"opacity") ? @(presentationLayer.opacity) : nil;
    registerAnimation(@"opacity", values, @(channelValueAt("opacity", 1.0, 1)), presentationValue);
  }

  // transform (composed from the canonical transform channels)
  const bool hasTransform = hasChannel("translateX") || hasChannel("translateY") || hasChannel("scaleX") ||
      hasChannel("scaleY") || hasChannel("rotation") || hasChannel("rotationX") || hasChannel("rotationY") ||
      hasChannel("skewX") || hasChannel("perspective");
  if (hasTransform) {
    NSMutableArray<NSValue *> *values = [NSMutableArray arrayWithCapacity:sampleCount];
    for (double offset : sampleOffsets) {
      [values addObject:[NSValue valueWithCATransform3D:composeTransform(offset)]];
    }
    id presentationValue =
        presentationActive(@"transform") ? [NSValue valueWithCATransform3D:presentationLayer.transform] : nil;
    registerAnimation(@"transform", values, [NSValue valueWithCATransform3D:composeTransform(1.0)], presentationValue);
  }

  // layout: width/height -> bounds.size, originX/originY -> position
  const CGSize currentBounds = layer.bounds.size;
  const CGPoint anchorPoint = layer.anchorPoint;
  const bool hasSize = hasChannel("width") || hasChannel("height");
  const bool hasOrigin = hasChannel("originX") || hasChannel("originY");

  if (hasSize) {
    NSMutableArray<NSValue *> *values = [NSMutableArray arrayWithCapacity:sampleCount];
    for (double offset : sampleOffsets) {
      const double width = channelValueAt("width", offset, currentBounds.width);
      const double height = channelValueAt("height", offset, currentBounds.height);
      [values addObject:[NSValue valueWithCGSize:CGSizeMake(width, height)]];
    }
    const double finalWidth = channelValueAt("width", 1.0, currentBounds.width);
    const double finalHeight = channelValueAt("height", 1.0, currentBounds.height);
    id presentationValue =
        presentationActive(@"bounds.size") ? [NSValue valueWithCGSize:presentationLayer.bounds.size] : nil;
    registerAnimation(
        @"bounds.size", values, [NSValue valueWithCGSize:CGSizeMake(finalWidth, finalHeight)], presentationValue);
  }

  if (hasOrigin) {
    NSMutableArray<NSValue *> *values = [NSMutableArray arrayWithCapacity:sampleCount];
    auto positionAt = [&](double offset) -> CGPoint {
      const double width = channelValueAt("width", offset, currentBounds.width);
      const double height = channelValueAt("height", offset, currentBounds.height);
      const double originX = channelValueAt("originX", offset, layer.frame.origin.x);
      const double originY = channelValueAt("originY", offset, layer.frame.origin.y);
      return CGPointMake(originX + anchorPoint.x * width, originY + anchorPoint.y * height);
    };
    for (double offset : sampleOffsets) {
      [values addObject:[NSValue valueWithCGPoint:positionAt(offset)]];
    }
    id presentationValue =
        presentationActive(@"position") ? [NSValue valueWithCGPoint:presentationLayer.position] : nil;
    registerAnimation(@"position", values, [NSValue valueWithCGPoint:positionAt(1.0)], presentationValue);
  }

  if (animations.count == 0) {
// LayoutAnimationTrace start
#ifndef NDEBUG
    reanimated::layout_animation_trace::recordApplePlatformCompleted(viewTag, descriptor, componentView, true, false);
#endif // NDEBUG
    // LayoutAnimationTrace end
    completion(YES);
    return;
  }

  // Attach the completion to the (single) longest-running animation. Every
  // animation here shares the same duration, so the first one is fine.
  REACoreAnimationDelegate *delegate = [REACoreAnimationDelegate
      delegateWithStart:^(CAAnimation *animation) {
// LayoutAnimationTrace start
#ifndef NDEBUG
        reanimated::layout_animation_trace::recordApplePlatformStarted(viewTag, descriptor, componentView);
        reanimated::layout_animation_trace::recordAppleModelPresentationSample(viewTag, descriptor, componentView);
#endif // NDEBUG
       // LayoutAnimationTrace end
      }
      stop:^(CAAnimation *animation, BOOL finished) {
// LayoutAnimationTrace start
#ifndef NDEBUG
        reanimated::layout_animation_trace::recordAppleModelPresentationSample(viewTag, descriptor, componentView);
        reanimated::layout_animation_trace::recordApplePlatformCompleted(
            viewTag, descriptor, componentView, finished, true);
#endif // NDEBUG
       // LayoutAnimationTrace end
        completion(finished);
      }];

  [CATransaction begin];
  [CATransaction setDisableActions:YES];
  for (NSUInteger i = 0; i < animations.count; i++) {
    NSString *keyPath = animatedKeyPaths[i];
    CAKeyframeAnimation *animation = animations[i];
    if (i == 0) {
      animation.delegate = delegate;
    }
    // Commit the final value to the model layer first, so the view holds its
    // end state once the (auto-removed) animation completes - no snap-back.
    [layer setValue:finalModelValues[i] forKeyPath:keyPath];
    [layer addAnimation:animation
                 forKey:[[generationKey stringByAppendingString:@"_"] stringByAppendingString:keyPath]];
  }
  [CATransaction commit];
}

- (void)cancelNativeLayoutAnimation:(reanimated::NativeLayoutAnimationHandle)handle
{
  const ReactTag viewTag = handle.tag;
  if (![NSThread isMainThread]) {
    __weak REANodesManager *weakSelf = self;
    dispatch_async(dispatch_get_main_queue(), ^{ [weakSelf cancelNativeLayoutAnimation:handle]; });
    return;
  }
  RCTComponentViewRegistry *registry = self.surfacePresenter.mountingManager.componentViewRegistry;
  REAUIView<RCTComponentViewProtocol> *view = [registry findComponentViewWithTag:static_cast<Tag>(viewTag)];
  CALayer *layer = view.layer;
  if (layer == nil) {
    return;
  }
  NSString *prefix = [NSString stringWithFormat:@"REA_LAYOUT_GENERATION_%llu_", handle.generation];
  for (NSString *key in layer.animationKeys.copy) {
    if ([key hasPrefix:prefix]) {
      [layer removeAnimationForKey:key];
    }
  }
}

@end
