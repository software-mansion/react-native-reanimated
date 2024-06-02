/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTSurfaceHostingView.h"
#import "RCTConstants.h"
#import "RCTDefines.h"
#import "RCTSurface.h"
#import "RCTSurfaceDelegate.h"
#import "RCTSurfaceView.h"
#import "RCTUtils.h"

@interface RCTSurfaceHostingView ()

@property (nonatomic, assign) BOOL isActivityIndicatorViewVisible;
@property (nonatomic, assign) BOOL isSurfaceViewVisible;

@end

@implementation RCTSurfaceHostingView {
  RCTUIView *_Nullable _activityIndicatorView; // [macOS]
  RCTUIView *_Nullable _surfaceView; // [macOS]
  RCTSurfaceStage _stage;
}

RCT_NOT_IMPLEMENTED(-(instancetype)init)
RCT_NOT_IMPLEMENTED(-(instancetype)initWithFrame : (CGRect)frame)
RCT_NOT_IMPLEMENTED(-(nullable instancetype)initWithCoder : (NSCoder *)coder)

- (instancetype)initWithSurface:(id<RCTSurfaceProtocol>)surface
                sizeMeasureMode:(RCTSurfaceSizeMeasureMode)sizeMeasureMode
{
  if (self = [super initWithFrame:CGRectZero]) {
    _surface = surface;
    _sizeMeasureMode = sizeMeasureMode;

    _surface.delegate = self;
    _stage = surface.stage;
    [self _updateViews];

    // For backward compatibility with RCTRootView, set a color here instead of transparent (OS default).
    self.backgroundColor = [RCTUIColor whiteColor]; // [macOS]
  }

  return self;
}

- (void)dealloc
{
  [_surface stop];
}

- (void)layoutSubviews
{
  [super layoutSubviews];

  CGSize minimumSize;
  CGSize maximumSize;

  RCTSurfaceMinimumSizeAndMaximumSizeFromSizeAndSizeMeasureMode(
      self.bounds.size, _sizeMeasureMode, &minimumSize, &maximumSize);
#if !TARGET_OS_OSX // [macOS]
  CGRect windowFrame = [self.window convertRect:self.frame fromView:self.superview];
#else // [macOS
  CGRect windowFrame = [self.window.contentView convertRect:self.frame toView:self.superview];
#endif // macOS]

  [_surface setMinimumSize:minimumSize maximumSize:maximumSize viewportOffset:windowFrame.origin];
}

- (CGSize)intrinsicContentSize
{
  if (RCTSurfaceStageIsPreparing(_stage)) {
    if (_activityIndicatorView) {
      return _activityIndicatorView.intrinsicContentSize;
    }

    return CGSizeZero;
  }

  return _surface.intrinsicSize;
}

- (CGSize)sizeThatFits:(CGSize)size
{
  if (RCTSurfaceStageIsPreparing(_stage)) {
    if (_activityIndicatorView) {
#if !TARGET_OS_OSX // [macOS]
      return [_activityIndicatorView sizeThatFits:size];
#else // [macOS
      return [_activityIndicatorView fittingSize];
#endif // macOS]
    }

    return CGSizeZero;
  }

  CGSize minimumSize;
  CGSize maximumSize;

  RCTSurfaceMinimumSizeAndMaximumSizeFromSizeAndSizeMeasureMode(size, _sizeMeasureMode, &minimumSize, &maximumSize);

  return [_surface sizeThatFitsMinimumSize:minimumSize maximumSize:maximumSize];
}

- (void)setStage:(RCTSurfaceStage)stage
{
  if (stage == _stage) {
    return;
  }

  BOOL shouldInvalidateLayout = RCTSurfaceStageIsRunning(stage) != RCTSurfaceStageIsRunning(_stage) ||
      RCTSurfaceStageIsPreparing(stage) != RCTSurfaceStageIsPreparing(_stage);

  _stage = stage;

  if (shouldInvalidateLayout) {
    [self _invalidateLayout];
    [self _updateViews];
  }
}

- (void)setSizeMeasureMode:(RCTSurfaceSizeMeasureMode)sizeMeasureMode
{
  if (sizeMeasureMode == _sizeMeasureMode) {
    return;
  }

  _sizeMeasureMode = sizeMeasureMode;
  [self _invalidateLayout];
}

#pragma mark - isActivityIndicatorViewVisible

- (void)setIsActivityIndicatorViewVisible:(BOOL)visible
{
  if (_isActivityIndicatorViewVisible == visible) {
    return;
  }

  _isActivityIndicatorViewVisible = visible;

  if (visible) {
    if (_activityIndicatorViewFactory) {
      _activityIndicatorView = _activityIndicatorViewFactory();
      _activityIndicatorView.frame = self.bounds;
      _activityIndicatorView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
      [self addSubview:_activityIndicatorView];
    }
  } else {
    [_activityIndicatorView removeFromSuperview];
    _activityIndicatorView = nil;
  }
}

#pragma mark - isSurfaceViewVisible

- (void)setIsSurfaceViewVisible:(BOOL)visible
{
  if (_isSurfaceViewVisible == visible) {
    return;
  }

  _isSurfaceViewVisible = visible;

  if (visible) {
    _surfaceView = _surface.view;
    _surfaceView.frame = self.bounds;
    _surfaceView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    [self addSubview:_surfaceView];
  } else {
    [_surfaceView removeFromSuperview];
    _surfaceView = nil;
  }
}

#pragma mark - activityIndicatorViewFactory

- (void)setActivityIndicatorViewFactory:(RCTSurfaceHostingViewActivityIndicatorViewFactory)activityIndicatorViewFactory
{
  _activityIndicatorViewFactory = activityIndicatorViewFactory;
  if (_isActivityIndicatorViewVisible) {
    self.isActivityIndicatorViewVisible = NO;
    self.isActivityIndicatorViewVisible = YES;
  }
}

#pragma mark - UITraitCollection updates

#if !TARGET_OS_OSX // [macOS]
- (void)traitCollectionDidChange:(UITraitCollection *)previousTraitCollection
{
  [super traitCollectionDidChange:previousTraitCollection];
  [[NSNotificationCenter defaultCenter]
      postNotificationName:RCTUserInterfaceStyleDidChangeNotification
                    object:self
                  userInfo:@{
                    RCTUserInterfaceStyleDidChangeNotificationTraitCollectionKey : self.traitCollection,
                  }];
}
#else // [macOS
- (void)viewDidChangeEffectiveAppearance
{
  [super viewDidChangeEffectiveAppearance];
  [[NSNotificationCenter defaultCenter]
      postNotificationName:RCTUserInterfaceStyleDidChangeNotification
                    object:self
                  userInfo:@{
                    RCTUserInterfaceStyleDidChangeNotificationAppearanceKey : self.effectiveAppearance,
                  }];
}
#endif // macOS]

#pragma mark - Private stuff

- (void)_invalidateLayout
{
  [self invalidateIntrinsicContentSize];
#if !TARGET_OS_OSX // [macOS]
  [self.superview setNeedsLayout];
#else // [macOS
  [self.superview setNeedsLayout:YES];
#endif // macOS]
}

- (void)_updateViews
{
  self.isSurfaceViewVisible = RCTSurfaceStageIsRunning(_stage);
  self.isActivityIndicatorViewVisible = RCTSurfaceStageIsPreparing(_stage);
}

- (void)didMoveToWindow
{
  [super didMoveToWindow];
  [self _updateViews];
}

#pragma mark - RCTSurfaceDelegate

- (void)surface:(__unused RCTSurface *)surface didChangeStage:(RCTSurfaceStage)stage
{
  RCTExecuteOnMainQueue(^{
    [self setStage:stage];
  });
}

- (void)surface:(__unused RCTSurface *)surface didChangeIntrinsicSize:(__unused CGSize)intrinsicSize
{
  RCTExecuteOnMainQueue(^{
    [self _invalidateLayout];
  });
}

@end
