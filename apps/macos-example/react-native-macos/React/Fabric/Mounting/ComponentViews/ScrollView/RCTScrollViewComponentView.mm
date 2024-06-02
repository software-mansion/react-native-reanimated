/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTScrollViewComponentView.h"

#import <React/RCTAssert.h>
#import <React/RCTBridge+Private.h>
#import <React/RCTConstants.h>
#import <React/RCTScrollEvent.h>

#import <react/renderer/components/scrollview/RCTComponentViewHelpers.h>
#import <react/renderer/components/scrollview/ScrollViewComponentDescriptor.h>
#import <react/renderer/components/scrollview/ScrollViewEventEmitter.h>
#import <react/renderer/components/scrollview/ScrollViewProps.h>
#import <react/renderer/components/scrollview/ScrollViewState.h>
#import <react/renderer/components/scrollview/conversions.h>

#import "RCTConversions.h"
#import "RCTCustomPullToRefreshViewProtocol.h"
#import "RCTEnhancedScrollView.h"
#import "RCTFabricComponentsPlugins.h"

using namespace facebook::react;

static const CGFloat kClippingLeeway = 44.0;

#if TARGET_OS_IOS // [macOS] [visionOS]
static UIScrollViewKeyboardDismissMode RCTUIKeyboardDismissModeFromProps(const ScrollViewProps &props)
{
  switch (props.keyboardDismissMode) {
    case ScrollViewKeyboardDismissMode::None:
      return UIScrollViewKeyboardDismissModeNone;
    case ScrollViewKeyboardDismissMode::OnDrag:
      return UIScrollViewKeyboardDismissModeOnDrag;
    case ScrollViewKeyboardDismissMode::Interactive:
      return UIScrollViewKeyboardDismissModeInteractive;
  }
}
#endif // [macOS] [visionOS]

#if !TARGET_OS_OSX // [macOS
static UIScrollViewIndicatorStyle RCTUIScrollViewIndicatorStyleFromProps(const ScrollViewProps &props)
{
  switch (props.indicatorStyle) {
    case ScrollViewIndicatorStyle::Default:
      return UIScrollViewIndicatorStyleDefault;
    case ScrollViewIndicatorStyle::Black:
      return UIScrollViewIndicatorStyleBlack;
    case ScrollViewIndicatorStyle::White:
      return UIScrollViewIndicatorStyleWhite;
  }
}
#endif // [macOS]

// Once Fabric implements proper NativeAnimationDriver, this should be removed.
// This is just a workaround to allow animations based on onScroll event.
// This is only used to animate sticky headers in ScrollViews, and only the contentOffset and tag is used.
// TODO: T116850910 [Fabric][iOS] Make Fabric not use legacy RCTEventDispatcher for native-driven AnimatedEvents
static void RCTSendScrollEventForNativeAnimations_DEPRECATED(RCTUIScrollView *scrollView, NSInteger tag) // [macOS]
{
  static uint16_t coalescingKey = 0;
  RCTScrollEvent *scrollEvent = [[RCTScrollEvent alloc] initWithEventName:@"onScroll"
                                                                 reactTag:[NSNumber numberWithInt:tag]
                                                  scrollViewContentOffset:scrollView.contentOffset
                                                   scrollViewContentInset:scrollView.contentInset
                                                    scrollViewContentSize:scrollView.contentSize
                                                          scrollViewFrame:scrollView.frame
                                                      scrollViewZoomScale:scrollView.zoomScale
                                                                 userData:nil
                                                            coalescingKey:coalescingKey];
  RCTBridge *bridge = [RCTBridge currentBridge];
  if (bridge) {
    [bridge.eventDispatcher sendEvent:scrollEvent];
  } else {
    NSDictionary *userInfo = [NSDictionary dictionaryWithObjectsAndKeys:scrollEvent, @"event", nil];
    [[NSNotificationCenter defaultCenter] postNotificationName:@"RCTNotifyEventDispatcherObserversOfEvent_DEPRECATED"
                                                        object:nil
                                                      userInfo:userInfo];
  }
}

@interface RCTScrollViewComponentView () <
#if !TARGET_OS_OSX // [macOS]
    UIScrollViewDelegate,
#endif // [macOS]
    RCTScrollViewProtocol,
    RCTScrollableProtocol,
    RCTEnhancedScrollViewOverridingDelegate>

@end

@implementation RCTScrollViewComponentView {
  ScrollViewShadowNode::ConcreteState::Shared _state;
  CGSize _contentSize;
  NSTimeInterval _lastScrollEventDispatchTime;
  NSTimeInterval _scrollEventThrottle;
  // Flag indicating whether the scrolling that is currently happening
  // is triggered by user or not.
  // This helps to only update state from `scrollViewDidScroll` in case
  // some other part of the system scrolls scroll view.
  BOOL _isUserTriggeredScrolling;
  BOOL _shouldUpdateContentInsetAdjustmentBehavior;

  CGPoint _contentOffsetWhenClipped;

  __weak RCTUIView *_contentView; // [macOS]

  CGRect _prevFirstVisibleFrame;
  __weak RCTUIView *_firstVisibleView; // [macOS]
}

+ (RCTScrollViewComponentView *_Nullable)findScrollViewComponentViewForView:(RCTUIView *)view // [macOS]
{
  do {
    view = (RCTUIView *)view.superview; // [macOS]
  } while (view != nil && ![view isKindOfClass:[RCTScrollViewComponentView class]]);
  return (RCTScrollViewComponentView *)view;
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const ScrollViewProps>();
    _props = defaultProps;

    _scrollView = [[RCTEnhancedScrollView alloc] initWithFrame:self.bounds];
    _scrollView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
#if !TARGET_OS_OSX // [macOS]
    _scrollView.delaysContentTouches = NO;
#endif // [macOS]
    ((RCTEnhancedScrollView *)_scrollView).overridingDelegate = self;
    _isUserTriggeredScrolling = NO;
    _shouldUpdateContentInsetAdjustmentBehavior = YES;
    [self addSubview:_scrollView];

    _containerView = [[RCTUIView alloc] initWithFrame:CGRectZero]; // [macOS]
#if !TARGET_OS_OSX // [macOS]
    [_scrollView addSubview:_containerView];
#else // [macOS
    _containerView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    [_scrollView setDocumentView:_containerView];
#endif // macOS]
    
#if !TARGET_OS_OSX // [macOS]
    [self.scrollViewDelegateSplitter addDelegate:self];
#endif // [macOS]

    if (CoreFeatures::disableScrollEventThrottleRequirement) {
      _scrollEventThrottle = 0;
    } else {
      _scrollEventThrottle = INFINITY;
    }
  }

  return self;
}

- (void)dealloc
{
  // Removing all delegates from the splitter nils the actual delegate which prevents a crash on UIScrollView
  // deallocation.
#if !TARGET_OS_OSX // [macOS]
  [self.scrollViewDelegateSplitter removeAllDelegates];
#endif // [macOS]
}

#if !TARGET_OS_OSX // [macOS]
- (RCTGenericDelegateSplitter<id<UIScrollViewDelegate>> *)scrollViewDelegateSplitter
{
  return ((RCTEnhancedScrollView *)_scrollView).delegateSplitter;
}
#endif // [macOS]

#pragma mark - RCTMountingTransactionObserving

- (void)mountingTransactionWillMount:(const facebook::react::MountingTransaction &)transaction
                withSurfaceTelemetry:(const facebook::react::SurfaceTelemetry &)surfaceTelemetry
{
  [self _prepareForMaintainVisibleScrollPosition];
}

- (void)mountingTransactionDidMount:(const MountingTransaction &)transaction
               withSurfaceTelemetry:(const facebook::react::SurfaceTelemetry &)surfaceTelemetry
{
  [self _remountChildren];
  [self _adjustForMaintainVisibleContentPosition];
}

#pragma mark - RCTComponentViewProtocol

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<ScrollViewComponentDescriptor>();
}

- (void)updateLayoutMetrics:(const LayoutMetrics &)layoutMetrics
           oldLayoutMetrics:(const LayoutMetrics &)oldLayoutMetrics
{
  [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:oldLayoutMetrics];
  if (layoutMetrics.layoutDirection != oldLayoutMetrics.layoutDirection) {
    CGAffineTransform transform = (layoutMetrics.layoutDirection == LayoutDirection::LeftToRight)
        ? CGAffineTransformIdentity
        : CGAffineTransformMakeScale(-1, 1);

    _containerView.transform = transform;
#if !TARGET_OS_OSX // [macOS]
    _scrollView.transform = transform;
#endif // [macOS]
  }
}

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps
{
  const auto &oldScrollViewProps = static_cast<const ScrollViewProps &>(*_props);
  const auto &newScrollViewProps = static_cast<const ScrollViewProps &>(*props);

#define REMAP_PROP(reactName, localName, target)                      \
  if (oldScrollViewProps.reactName != newScrollViewProps.reactName) { \
    target.localName = newScrollViewProps.reactName;                  \
  }

#define REMAP_VIEW_PROP(reactName, localName) REMAP_PROP(reactName, localName, self)
#define MAP_VIEW_PROP(name) REMAP_VIEW_PROP(name, name)
#define REMAP_SCROLL_VIEW_PROP(reactName, localName) \
  REMAP_PROP(reactName, localName, ((RCTEnhancedScrollView *)_scrollView))
#define MAP_SCROLL_VIEW_PROP(name) REMAP_SCROLL_VIEW_PROP(name, name)

  // FIXME: Commented props are not supported yet.
  MAP_SCROLL_VIEW_PROP(alwaysBounceHorizontal);
  MAP_SCROLL_VIEW_PROP(alwaysBounceVertical);
#if !TARGET_OS_OSX // [macOS]
  MAP_SCROLL_VIEW_PROP(bounces);
  MAP_SCROLL_VIEW_PROP(bouncesZoom);
  MAP_SCROLL_VIEW_PROP(canCancelContentTouches);
#endif // [macOS]
  MAP_SCROLL_VIEW_PROP(centerContent);
  // MAP_SCROLL_VIEW_PROP(automaticallyAdjustContentInsets);
#if !TARGET_OS_OSX // [macOS]
  MAP_SCROLL_VIEW_PROP(decelerationRate);
  MAP_SCROLL_VIEW_PROP(directionalLockEnabled);
  MAP_SCROLL_VIEW_PROP(maximumZoomScale);
  MAP_SCROLL_VIEW_PROP(minimumZoomScale);
#endif // [macOS]
  MAP_SCROLL_VIEW_PROP(scrollEnabled);
#if !TARGET_OS_OSX // [macOS]
  MAP_SCROLL_VIEW_PROP(pagingEnabled);
  MAP_SCROLL_VIEW_PROP(pinchGestureEnabled);
  MAP_SCROLL_VIEW_PROP(scrollsToTop);
#endif // [macOS]
  MAP_SCROLL_VIEW_PROP(showsHorizontalScrollIndicator);
  MAP_SCROLL_VIEW_PROP(showsVerticalScrollIndicator);

  if (oldScrollViewProps.scrollIndicatorInsets != newScrollViewProps.scrollIndicatorInsets) {
    _scrollView.scrollIndicatorInsets = RCTUIEdgeInsetsFromEdgeInsets(newScrollViewProps.scrollIndicatorInsets);
  }

  if (oldScrollViewProps.indicatorStyle != newScrollViewProps.indicatorStyle) {
#if !TARGET_OS_OSX // [macOS]
    _scrollView.indicatorStyle = RCTUIScrollViewIndicatorStyleFromProps(newScrollViewProps);
#endif // [macOS]
  }

  if (oldScrollViewProps.scrollEventThrottle != newScrollViewProps.scrollEventThrottle) {
    // Zero means "send value only once per significant logical event".
    // Prop value is in milliseconds.
    // iOS implementation uses `NSTimeInterval` (in seconds).
    CGFloat throttleInSeconds = newScrollViewProps.scrollEventThrottle / 1000.0;
    CGFloat msPerFrame = 1.0 / 60.0;
    if (throttleInSeconds < 0) {
      _scrollEventThrottle = INFINITY;
    } else if (throttleInSeconds <= msPerFrame) {
      _scrollEventThrottle = 0;
    } else {
      _scrollEventThrottle = throttleInSeconds;
    }
  }

  MAP_SCROLL_VIEW_PROP(zoomScale);

  if (oldScrollViewProps.contentInset != newScrollViewProps.contentInset) {
    _scrollView.contentInset = RCTUIEdgeInsetsFromEdgeInsets(newScrollViewProps.contentInset);
  }

  RCTEnhancedScrollView *scrollView = (RCTEnhancedScrollView *)_scrollView;
  if (oldScrollViewProps.contentOffset != newScrollViewProps.contentOffset) {
    _scrollView.contentOffset = RCTCGPointFromPoint(newScrollViewProps.contentOffset);
  }

  if (oldScrollViewProps.snapToAlignment != newScrollViewProps.snapToAlignment) {
    scrollView.snapToAlignment = RCTNSStringFromString(toString(newScrollViewProps.snapToAlignment));
  }

  scrollView.snapToStart = newScrollViewProps.snapToStart;
  scrollView.snapToEnd = newScrollViewProps.snapToEnd;

  if (oldScrollViewProps.snapToOffsets != newScrollViewProps.snapToOffsets) {
    NSMutableArray<NSNumber *> *snapToOffsets = [NSMutableArray array];
    for (const auto &snapToOffset : newScrollViewProps.snapToOffsets) {
      [snapToOffsets addObject:[NSNumber numberWithFloat:snapToOffset]];
    }
    scrollView.snapToOffsets = snapToOffsets;
  }

#if !TARGET_OS_OSX // [macOS]
  if (oldScrollViewProps.automaticallyAdjustsScrollIndicatorInsets !=
      newScrollViewProps.automaticallyAdjustsScrollIndicatorInsets) {
    scrollView.automaticallyAdjustsScrollIndicatorInsets = newScrollViewProps.automaticallyAdjustsScrollIndicatorInsets;
  }

  if ((oldScrollViewProps.contentInsetAdjustmentBehavior != newScrollViewProps.contentInsetAdjustmentBehavior) ||
      _shouldUpdateContentInsetAdjustmentBehavior) {
    const auto contentInsetAdjustmentBehavior = newScrollViewProps.contentInsetAdjustmentBehavior;
    if (contentInsetAdjustmentBehavior == ContentInsetAdjustmentBehavior::Never) {
      scrollView.contentInsetAdjustmentBehavior = UIScrollViewContentInsetAdjustmentNever;
    } else if (contentInsetAdjustmentBehavior == ContentInsetAdjustmentBehavior::Automatic) {
      scrollView.contentInsetAdjustmentBehavior = UIScrollViewContentInsetAdjustmentAutomatic;
    } else if (contentInsetAdjustmentBehavior == ContentInsetAdjustmentBehavior::ScrollableAxes) {
      scrollView.contentInsetAdjustmentBehavior = UIScrollViewContentInsetAdjustmentAutomatic;
    } else if (contentInsetAdjustmentBehavior == ContentInsetAdjustmentBehavior::Always) {
      scrollView.contentInsetAdjustmentBehavior = UIScrollViewContentInsetAdjustmentAlways;
    }
    _shouldUpdateContentInsetAdjustmentBehavior = NO;
  }
#endif // [macOS]
    
  MAP_SCROLL_VIEW_PROP(disableIntervalMomentum);
  MAP_SCROLL_VIEW_PROP(snapToInterval);

  if (oldScrollViewProps.keyboardDismissMode != newScrollViewProps.keyboardDismissMode) {
#if TARGET_OS_IOS // [macOS] [visionOS]
    scrollView.keyboardDismissMode = RCTUIKeyboardDismissModeFromProps(newScrollViewProps);
#endif // [macOS] [visionOS]
  }

  [super updateProps:props oldProps:oldProps];
}

- (void)updateState:(const State::Shared &)state oldState:(const State::Shared &)oldState
{
  assert(std::dynamic_pointer_cast<ScrollViewShadowNode::ConcreteState const>(state));
  _state = std::static_pointer_cast<ScrollViewShadowNode::ConcreteState const>(state);
  auto &data = _state->getData();

  auto contentOffset = RCTCGPointFromPoint(data.contentOffset);
  if (!oldState && !CGPointEqualToPoint(contentOffset, CGPointZero)) {
    _scrollView.contentOffset = contentOffset;
  }

  CGSize contentSize = RCTCGSizeFromSize(data.getContentSize());

  if (CGSizeEqualToSize(_contentSize, contentSize)) {
    return;
  }

  _contentSize = contentSize;
  _containerView.frame = CGRect{RCTCGPointFromPoint(data.contentBoundingRect.origin), contentSize};

  [self _preserveContentOffsetIfNeededWithBlock:^{
    self->_scrollView.contentSize = contentSize;
  }];
}

/*
 * Disables programmatical changing of ScrollView's `contentOffset` if a touch gesture is in progress.
 */
- (void)_preserveContentOffsetIfNeededWithBlock:(void (^)())block
{
  if (!block) {
    return;
  }

  if (!_isUserTriggeredScrolling) {
    return block();
  }

  [((RCTEnhancedScrollView *)_scrollView) preserveContentOffsetWithBlock:block];
}

- (void)mountChildComponentView:(RCTUIView<RCTComponentViewProtocol> *)childComponentView index:(NSInteger)index // [macOS]
{
  [_containerView insertSubview:childComponentView atIndex:index];
  if (![childComponentView conformsToProtocol:@protocol(RCTCustomPullToRefreshViewProtocol)]) {
    _contentView = childComponentView;
  }
}

- (void)unmountChildComponentView:(RCTUIView<RCTComponentViewProtocol> *)childComponentView index:(NSInteger)index // [macOS]
{
  [childComponentView removeFromSuperview];
  if (![childComponentView conformsToProtocol:@protocol(RCTCustomPullToRefreshViewProtocol)] &&
      _contentView == childComponentView) {
    _contentView = nil;
  }
}

/*
 * Returns whether or not the scroll view interaction should be blocked because
 * JavaScript was found to be the responder.
 */
- (BOOL)_shouldDisableScrollInteraction
{
  RCTUIView *ancestorView = (RCTUIView *)self.superview;  // [macOS]

  while (ancestorView) {
    if ([ancestorView respondsToSelector:@selector(isJSResponder)]) {
      BOOL isJSResponder = ((RCTUIView<RCTComponentViewProtocol> *)ancestorView).isJSResponder; // [macOS]
      if (isJSResponder) {
        return YES;
      }
    }

    ancestorView = (RCTUIView *)ancestorView.superview; // [macOS]
  }

  return NO;
}

- (ScrollViewMetrics)_scrollViewMetrics
{
  ScrollViewMetrics metrics;
  metrics.contentSize = RCTSizeFromCGSize(_scrollView.contentSize);
  metrics.contentOffset = RCTPointFromCGPoint(_scrollView.contentOffset);
  metrics.contentInset = RCTEdgeInsetsFromUIEdgeInsets(_scrollView.contentInset);
  metrics.containerSize = RCTSizeFromCGSize(_scrollView.bounds.size);
  metrics.zoomScale = _scrollView.zoomScale;

  if (_layoutMetrics.layoutDirection == LayoutDirection::RightToLeft) {
    metrics.contentOffset.x = metrics.contentSize.width - metrics.containerSize.width - metrics.contentOffset.x;
  }

  return metrics;
}

- (void)_updateStateWithContentOffset
{
  if (!_state) {
    return;
  }
  auto contentOffset = RCTPointFromCGPoint(_scrollView.contentOffset);
  _state->updateState([contentOffset](const ScrollViewShadowNode::ConcreteState::Data &data) {
    auto newData = data;
    newData.contentOffset = contentOffset;
    return std::make_shared<ScrollViewShadowNode::ConcreteState::Data const>(newData);
  });
}

- (void)prepareForRecycle
{
  const auto &props = static_cast<const ScrollViewProps &>(*_props);
  _scrollView.contentOffset = RCTCGPointFromPoint(props.contentOffset);
  // We set the default behavior to "never" so that iOS
  // doesn't do weird things to UIScrollView insets automatically
  // and keeps it as an opt-in behavior.
#if !TARGET_OS_OSX // [macOS]
  _scrollView.contentInsetAdjustmentBehavior = UIScrollViewContentInsetAdjustmentNever;
#endif // [macOS]
  _shouldUpdateContentInsetAdjustmentBehavior = YES;
  _state.reset();
  _isUserTriggeredScrolling = NO;
  CGRect oldFrame = self.frame;
  self.frame = CGRectZero;
  self.frame = oldFrame;
  _contentView = nil;
  _prevFirstVisibleFrame = CGRectZero;
  _firstVisibleView = nil;
  [super prepareForRecycle];
}

#pragma mark - UIScrollViewDelegate

- (BOOL)touchesShouldCancelInContentView:(__unused RCTUIView *)view // [macOS]
{
  // Historically, `UIScrollView`s in React Native do not cancel touches
  // started on `UIControl`-based views (as normal iOS `UIScrollView`s do).
  return ![self _shouldDisableScrollInteraction];
}

- (void)scrollViewDidScroll:(RCTUIScrollView *)scrollView // [macOS]
{
  if (!_isUserTriggeredScrolling || CoreFeatures::enableGranularScrollViewStateUpdatesIOS) {
    [self _updateStateWithContentOffset];
  }

  NSTimeInterval now = CACurrentMediaTime();
  if ((_lastScrollEventDispatchTime == 0) || (now - _lastScrollEventDispatchTime > _scrollEventThrottle)) {
    _lastScrollEventDispatchTime = now;
    if (_eventEmitter) {
      static_cast<const ScrollViewEventEmitter &>(*_eventEmitter).onScroll([self _scrollViewMetrics]);
    }
#if !TARGET_OS_OSX // [macOS]
    RCTSendScrollEventForNativeAnimations_DEPRECATED(scrollView, self.tag);
#endif // [macOS]
  }

  [self _remountChildrenIfNeeded];
}

- (void)scrollViewDidZoom:(RCTUIScrollView *)scrollView // [macOS]
{
  [self scrollViewDidScroll:scrollView];
}

- (BOOL)scrollViewShouldScrollToTop:(RCTUIScrollView *)scrollView // [macOS]
{
  _isUserTriggeredScrolling = YES;
  return YES;
}

- (void)scrollViewDidScrollToTop:(RCTUIScrollView *)scrollView // [macOS]
{
  _isUserTriggeredScrolling = NO;
  [self _updateStateWithContentOffset];
}

- (void)scrollViewWillBeginDragging:(RCTUIScrollView *)scrollView // [macOS]
{
  [self _forceDispatchNextScrollEvent];

  if (!_eventEmitter) {
    return;
  }

  static_cast<const ScrollViewEventEmitter &>(*_eventEmitter).onScrollBeginDrag([self _scrollViewMetrics]);
  _isUserTriggeredScrolling = YES;
}

- (void)scrollViewDidEndDragging:(RCTUIScrollView *)scrollView willDecelerate:(BOOL)decelerate // [macOS]
{
  [self _forceDispatchNextScrollEvent];

  if (!_eventEmitter) {
    return;
  }

  static_cast<const ScrollViewEventEmitter &>(*_eventEmitter).onScrollEndDrag([self _scrollViewMetrics]);

  [self _updateStateWithContentOffset];

  if (!decelerate) {
    // ScrollView will not decelerate and `scrollViewDidEndDecelerating` will not be called.
    // `_isUserTriggeredScrolling` must be set to NO here.
    _isUserTriggeredScrolling = NO;
  }
}

- (void)scrollViewWillBeginDecelerating:(RCTUIScrollView *)scrollView // [macOS]
{
  [self _forceDispatchNextScrollEvent];

  if (!_eventEmitter) {
    return;
  }

  static_cast<const ScrollViewEventEmitter &>(*_eventEmitter).onMomentumScrollBegin([self _scrollViewMetrics]);
}

- (void)scrollViewDidEndDecelerating:(RCTUIScrollView *)scrollView // [macOS]
{
  [self _forceDispatchNextScrollEvent];

  if (!_eventEmitter) {
    return;
  }

  static_cast<const ScrollViewEventEmitter &>(*_eventEmitter).onMomentumScrollEnd([self _scrollViewMetrics]);
  [self _updateStateWithContentOffset];
  _isUserTriggeredScrolling = NO;
}

- (void)scrollViewDidEndScrollingAnimation:(RCTUIScrollView *)scrollView // [macOS]
{
  [self _handleFinishedScrolling:scrollView];
}

- (void)_handleFinishedScrolling:(RCTUIScrollView *)scrollView // [macOS]
{
  [self _forceDispatchNextScrollEvent];
  [self scrollViewDidScroll:scrollView];

  if (!_eventEmitter) {
    return;
  }

  static_cast<const ScrollViewEventEmitter &>(*_eventEmitter).onMomentumScrollEnd([self _scrollViewMetrics]);
  [self _updateStateWithContentOffset];
}

- (void)scrollViewWillBeginZooming:(RCTUIScrollView *)scrollView withView:(nullable RCTUIView *)view // [macOS]
{
  [self _forceDispatchNextScrollEvent];

  if (!_eventEmitter) {
    return;
  }

  static_cast<const ScrollViewEventEmitter &>(*_eventEmitter).onScrollBeginDrag([self _scrollViewMetrics]);
}

- (void)scrollViewDidEndZooming:(RCTUIScrollView *)scrollView withView:(nullable RCTUIView *)view atScale:(CGFloat)scale // [macOS]
{
  [self _forceDispatchNextScrollEvent];

  if (!_eventEmitter) {
    return;
  }

  static_cast<const ScrollViewEventEmitter &>(*_eventEmitter).onScrollEndDrag([self _scrollViewMetrics]);
  [self _updateStateWithContentOffset];
}

- (RCTUIView *)viewForZoomingInScrollView:(__unused RCTUIScrollView *)scrollView // [macOS]
{
  return _containerView;
}

#pragma mark -

- (void)_forceDispatchNextScrollEvent
{
  _lastScrollEventDispatchTime = 0;
}

#pragma mark - Native commands

- (void)handleCommand:(const NSString *)commandName args:(const NSArray *)args
{
  RCTScrollViewHandleCommand(self, commandName, args);
}

- (void)flashScrollIndicators
{
#if !TARGET_OS_OSX // [macOS]
  [_scrollView flashScrollIndicators];
#endif // [macOS]
}

- (void)scrollTo:(double)x y:(double)y animated:(BOOL)animated
{
  CGPoint offset = CGPointMake(x, y);
  CGRect maxRect = CGRectMake(
      fmin(-_scrollView.contentInset.left, 0),
      fmin(-_scrollView.contentInset.top, 0),
      fmax(
          _scrollView.contentSize.width - _scrollView.bounds.size.width + _scrollView.contentInset.right +
              fmax(_scrollView.contentInset.left, 0),
          0.01),
      fmax(
          _scrollView.contentSize.height - _scrollView.bounds.size.height + _scrollView.contentInset.bottom +
              fmax(_scrollView.contentInset.top, 0),
          0.01)); // Make width and height greater than 0

  const auto &props = static_cast<const ScrollViewProps &>(*_props);
  if (!CGRectContainsPoint(maxRect, offset) && !props.scrollToOverflowEnabled) {
    CGFloat localX = fmax(offset.x, CGRectGetMinX(maxRect));
    localX = fmin(localX, CGRectGetMaxX(maxRect));
    CGFloat localY = fmax(offset.y, CGRectGetMinY(maxRect));
    localY = fmin(localY, CGRectGetMaxY(maxRect));
    offset = CGPointMake(localX, localY);
  }

  [self scrollToOffset:offset animated:animated];
}

- (void)scrollToEnd:(BOOL)animated
{
  BOOL isHorizontal = _scrollView.contentSize.width > self.frame.size.width;
  CGPoint offset;
  if (isHorizontal) {
    CGFloat offsetX = _scrollView.contentSize.width - _scrollView.bounds.size.width + _scrollView.contentInset.right;
    offset = CGPointMake(fmax(offsetX, 0), 0);
  } else {
    CGFloat offsetY = _scrollView.contentSize.height - _scrollView.bounds.size.height + _scrollView.contentInset.bottom;
    offset = CGPointMake(0, fmax(offsetY, 0));
  }

  [self scrollToOffset:offset animated:animated];
}

#pragma mark - Child views mounting

- (void)updateClippedSubviewsWithClipRect:(CGRect)clipRect relativeToView:(RCTUIView *)clipView // [macOS]
{
  // Do nothing. ScrollView manages its subview clipping individually in `_remountChildren`.
}

- (void)_remountChildrenIfNeeded
{
  CGPoint contentOffset = _scrollView.contentOffset;

  if (std::abs(_contentOffsetWhenClipped.x - contentOffset.x) < kClippingLeeway &&
      std::abs(_contentOffsetWhenClipped.y - contentOffset.y) < kClippingLeeway) {
    return;
  }

  _contentOffsetWhenClipped = contentOffset;

  [self _remountChildren];
}

- (void)_remountChildren
{
#if !TARGET_OS_OSX // [macOS]
  [_scrollView updateClippedSubviewsWithClipRect:CGRectInset(_scrollView.bounds, -kClippingLeeway, -kClippingLeeway)
                                  relativeToView:_scrollView];
#endif // [macOS]
}

#pragma mark - RCTScrollableProtocol

- (CGSize)contentSize
{
  return _contentSize;
}

- (void)scrollToOffset:(CGPoint)offset
{
  [self scrollToOffset:offset animated:YES];
}

- (void)scrollToOffset:(CGPoint)offset animated:(BOOL)animated
{
  if (_layoutMetrics.layoutDirection == LayoutDirection::RightToLeft) {
    // Adjusting offset.x in right to left layout direction.
    offset.x = self.contentSize.width - _scrollView.frame.size.width - offset.x;
  }

  if (CGPointEqualToPoint(_scrollView.contentOffset, offset)) {
    return;
  }

  [self _forceDispatchNextScrollEvent];

#if !TARGET_OS_OSX // [macOS]
  [_scrollView setContentOffset:offset animated:animated];
#endif // [macOS]

  if (!animated) {
    // When not animated, the expected workflow in ``scrollViewDidEndScrollingAnimation`` after scrolling is not going
    // to get triggered. We will need to manually execute here.
    [self _handleFinishedScrolling:_scrollView];
  }
}

- (void)zoomToRect:(CGRect)rect animated:(BOOL)animated
{
#if !TARGET_OS_OSX // [macOS]
  [_scrollView zoomToRect:rect animated:animated];
#endif // [macOS]
}

#if !TARGET_OS_OSX // [macOS]
- (void)addScrollListener:(NSObject<UIScrollViewDelegate> *)scrollListener
{
  [self.scrollViewDelegateSplitter addDelegate:scrollListener];
}

- (void)removeScrollListener:(NSObject<UIScrollViewDelegate> *)scrollListener
{
  [self.scrollViewDelegateSplitter removeDelegate:scrollListener];
}
#endif // [macOS]

#pragma mark - Maintain visible content position

- (void)_prepareForMaintainVisibleScrollPosition
{
  const auto &props = static_cast<const ScrollViewProps &>(*_props);
  if (!props.maintainVisibleContentPosition) {
    return;
  }

  BOOL horizontal = _scrollView.contentSize.width > self.frame.size.width;
  int minIdx = props.maintainVisibleContentPosition.value().minIndexForVisible;
  for (NSUInteger ii = minIdx; ii < _contentView.subviews.count; ++ii) {
    // Find the first entirely visible view.
    RCTUIView *subview = _contentView.subviews[ii]; // [macOS]
    BOOL hasNewView = NO;
    if (horizontal) {
      hasNewView = subview.frame.origin.x > _scrollView.contentOffset.x;
    } else {
      hasNewView = subview.frame.origin.y > _scrollView.contentOffset.y;
    }
    if (hasNewView || ii == _contentView.subviews.count - 1) {
      _prevFirstVisibleFrame = subview.frame;
      _firstVisibleView = subview;
      break;
    }
  }
}

- (void)_adjustForMaintainVisibleContentPosition
{
  const auto &props = static_cast<const ScrollViewProps &>(*_props);
  if (!props.maintainVisibleContentPosition) {
    return;
  }

  std::optional<int> autoscrollThreshold = props.maintainVisibleContentPosition.value().autoscrollToTopThreshold;
  BOOL horizontal = _scrollView.contentSize.width > self.frame.size.width;
  // TODO: detect and handle/ignore re-ordering
  if (horizontal) {
    CGFloat deltaX = _firstVisibleView.frame.origin.x - _prevFirstVisibleFrame.origin.x;
    if (ABS(deltaX) > 0.5) {
      CGFloat x = _scrollView.contentOffset.x;
      [self _forceDispatchNextScrollEvent];
      _scrollView.contentOffset = CGPointMake(_scrollView.contentOffset.x + deltaX, _scrollView.contentOffset.y);
      if (autoscrollThreshold) {
        // If the offset WAS within the threshold of the start, animate to the start.
        if (x <= autoscrollThreshold.value()) {
          [self scrollToOffset:CGPointMake(0, _scrollView.contentOffset.y) animated:YES];
        }
      }
    }
  } else {
    CGRect newFrame = _firstVisibleView.frame;
    CGFloat deltaY = newFrame.origin.y - _prevFirstVisibleFrame.origin.y;
    if (ABS(deltaY) > 0.5) {
      CGFloat y = _scrollView.contentOffset.y;
      [self _forceDispatchNextScrollEvent];
      _scrollView.contentOffset = CGPointMake(_scrollView.contentOffset.x, _scrollView.contentOffset.y + deltaY);
      if (autoscrollThreshold) {
        // If the offset WAS within the threshold of the start, animate to the start.
        if (y <= autoscrollThreshold.value()) {
          [self scrollToOffset:CGPointMake(_scrollView.contentOffset.x, 0) animated:YES];
        }
      }
    }
  }
}

@end

Class<RCTComponentViewProtocol> RCTScrollViewCls(void)
{
  return RCTScrollViewComponentView.class;
}
