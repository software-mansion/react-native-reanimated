#import <reanimated/apple/REAAssertJavaScriptQueue.h>
#import <reanimated/apple/REAAssertTurboModuleManagerQueue.h>
#import <reanimated/apple/REACoreAnimationDelegate.h>
#import <reanimated/apple/REANodesManager.h>
#import <reanimated/apple/REAUIView.h>

#import <React/RCTComponentViewProtocol.h>
#import <React/RCTComponentViewRegistry.h>
#import <React/RCTMountingManager.h>
#import <React/RCTUtils.h>

#if REACT_NATIVE_MINOR_VERSION < 81
#import <React/RCTFollyConvert.h>
#endif

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
  [self useDisplayLinkOnMainQueue:^(READisplayLink *displayLink) {
    [displayLink setPaused:YES];
  }];

  return self;
}

- (void)invalidate
{
  REAAssertTurboModuleManagerQueue();

  _eventHandler = nil;
  [self useDisplayLinkOnMainQueue:^(READisplayLink *displayLink) {
    [displayLink invalidate];
  }];
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
    [strongSelf performOperations];
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
#if REACT_NATIVE_MINOR_VERSION >= 81
  [surfacePresenter schedulerDidSynchronouslyUpdateViewOnUIThread:viewTag props:props];
#else
  [surfacePresenter synchronouslyUpdateViewOnUIThread:@(viewTag) props:convertFollyDynamicToId(props)];
#endif
  [componentView setPropKeysManagedByAnimated_DO_NOT_USE_THIS_IS_BROKEN:propKeysManagedByAnimated];
  // `synchronouslyUpdateViewOnUIThread` does not flush props like `backgroundColor` etc.
  // so that's why we need to call `finalizeUpdates` here.
  [componentView finalizeUpdates:RNComponentViewUpdateMask{}];
}

// TODO: This probably should be removed but I'm leaving just in case I want to quickly rollback to this behaviour
// I took the route to use CATransaction instead of CAAnimationGroup, it seems to work better with interrupted
// animations
//- (void)runCoreAnimationForView:(ReactTag)viewTag
//                   initialFrame:(const facebook::react::Rect &)initialFrame
//                     animations:(const std::vector<reanimated::NativeLayoutAnimation> &)animations
//                         config:(const reanimated::LayoutAnimationRawConfig &)config
//           usePresentationLayer:(bool)usePresentationLayer
//                     completion:(std::function<void(bool)>)completion
//                   animationKey:(NSString *)animationKey
//{
//  RCTSurfacePresenter *surfacePresenter = self.surfacePresenter;
//  RCTComponentViewRegistry *componentViewRegistry = surfacePresenter.mountingManager.componentViewRegistry;
//  REAUIView<RCTComponentViewProtocol> *componentView =
//      [componentViewRegistry findComponentViewWithTag:static_cast<Tag>(viewTag)];
//
//  // Apart from entering animations, we are using the presentation layer's frame instead of the oldFrame to properly
//  // handle cases where animation is interrupted mid-way and replaced by the next one. In such cases the presentation
//  // layer allows us to start the new animation from the current visible position of the view and avoid "jumps"
//  CGRect presentationLayerFrame = componentView.layer.presentationLayer.frame;
//  facebook::react::Rect baseFrame = usePresentationLayer ? facebook::react::Rect{{presentationLayerFrame.origin.x,
//  presentationLayerFrame.origin.y}, {presentationLayerFrame.size.width, presentationLayerFrame.size.height}} :
//  initialFrame;
//
//  // TODO: Perhaps we could just add centerOffsets directly to baseFrame here and not have to deal with them anywhere
//  // else?
//
//  NSMutableArray *processedAnimations = [NSMutableArray array];
//
//  double delay = config.values->delay.value_or(0) / 1000;
//  double durationWithDelay = (config.values->duration.value() / 1000) + delay;
//
//  for (const auto &anim : animations) {
//    double fromValue = anim.getInitialValue(baseFrame);
//    double toValue = anim.targetValue;
//    NSString *keyPath = [NSString stringWithUTF8String:anim.key.c_str()];
//
//    // TODO: Detect if there's spring in the config and if so, use CASpringAnimation with proper config
//    CABasicAnimation *animation = [CABasicAnimation animationWithKeyPath:keyPath];
//    animation.fromValue = @(fromValue);
//    animation.toValue = @(toValue);
//    animation.beginTime = delay;
//
//    [processedAnimations addObject:animation];
//
//    // TODO: This is hardcoded for now. Figure this out for setting the final values of the properties
//    // Probably such implementation needs to be somewhere here, as it's iOS specific on setting something
//    // on the CA Layer
//    if ([keyPath isEqual:@"position.x"]) {
//      componentView.layer.position = CGPointMake(toValue, componentView.layer.position.y);
//    } else {
//      componentView.layer.position = CGPointMake(componentView.layer.position.x, toValue);
//    }
//  }
//
//  CAAnimationGroup *animationGroup = [CAAnimationGroup animation];
//  animationGroup.animations = processedAnimations;
//  animationGroup.duration = durationWithDelay;
//
//  REACoreAnimationDelegate *delegate =
//      [REACoreAnimationDelegate delegateWithStart:nil
//                                             stop:^(CAAnimation *animation, BOOL finished) {
//                                               completion(finished);
//                                             }];
//  animationGroup.delegate = delegate;
//
//  [componentView.layer addAnimation:animationGroup forKey:@"LAYOUT_ANIMATION"];
//}

- (void)runCoreAnimationForView:(ReactTag)viewTag
                   initialFrame:(const facebook::react::Rect &)initialFrame
                     animations:(const std::vector<reanimated::NativeLayoutAnimation> &)animations
                         config:(const reanimated::LayoutAnimationRawConfig &)config
           usePresentationLayer:(bool)usePresentationLayer
                     completion:(std::function<void(bool)>)completion
{
  // If there are no animations, we're "finished" successfully.
  if (animations.size() == 0) {
    completion(YES);
    return;
  }

  RCTSurfacePresenter *surfacePresenter = self.surfacePresenter;
  RCTComponentViewRegistry *componentViewRegistry = surfacePresenter.mountingManager.componentViewRegistry;
  REAUIView<RCTComponentViewProtocol> *componentView =
      [componentViewRegistry findComponentViewWithTag:static_cast<Tag>(viewTag)];

  // Apart from entering animations, we are using the presentation layer's frame instead of the oldFrame to properly
  // handle cases where animation is interrupted mid-way and replaced by the next one. In such cases the presentation
  // layer allows us to start the new animation from the current visible position of the view and avoid "jumps"
  CGRect presentationLayerFrame = componentView.layer.presentationLayer.frame;
  facebook::react::Rect baseFrame = usePresentationLayer ? facebook::react::Rect{{presentationLayerFrame.origin.x, presentationLayerFrame.origin.y}, {presentationLayerFrame.size.width, presentationLayerFrame.size.height}} : initialFrame;

  // TODO: Perhaps we could just add centerOffsets directly to baseFrame here and not have to deal with them anywhere
  // else?

  [CATransaction begin];

  double delay = config.values->delay.value_or(0) / 1000;
  double duration = config.values->duration.value() / 1000;
  double absoluteBeginTime = [componentView.layer convertTime:CACurrentMediaTime() fromLayer:nil] + delay;

  REACoreAnimationDelegate *delegate =
      [REACoreAnimationDelegate delegateWithStart:nil
                                             stop:^(CAAnimation *animation, BOOL finished) {
                                               completion(finished);
                                             }];

  int i = 0;
  for (const auto &anim : animations) {
    double fromValue = anim.getInitialValue(baseFrame);
    double toValue = anim.targetValue;
    NSString *keyPath = [NSString stringWithUTF8String:anim.key.c_str()];

    CABasicAnimation *animation = [CABasicAnimation animationWithKeyPath:keyPath];
    animation.fromValue = @(fromValue);
    animation.toValue = @(toValue);

    animation.beginTime = absoluteBeginTime;
    animation.duration = duration;

    // Attach the delegate ONLY to the last animation
    // For more complex animations if we have such, that would have different pieces of different durations
    // we should find the longest one and attach it there
    // This is the only reasonable way to do it, I believe. We cannot use CAAnimationGroups because if we do that
    // further interruptable layout animations that don't contain certain animations of our current group
    // will cause those animations to end abruptly
    // On the other hand, just using animation group with different keys, will cause shifts of layouts
    // between different types of layout animations
    if (i == animations.size() - 1) {
      animation.delegate = delegate;
    }

    [componentView.layer addAnimation:animation forKey:keyPath];

    // Set the value for after the animation finishes - otherwise it will come back to the original state
    [CATransaction begin];
    [CATransaction setDisableActions:YES];
    [componentView.layer setValue:@(toValue) forKeyPath:keyPath];
    [CATransaction commit];
    i++;
  }

  [CATransaction commit];
}

@end
