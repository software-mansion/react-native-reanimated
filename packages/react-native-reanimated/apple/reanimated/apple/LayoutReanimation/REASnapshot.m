#import <Foundation/Foundation.h>
#import <React/RCTUtils.h>
#import <React/RCTView.h>
#import <React/UIView+React.h>
#import <reanimated/apple/LayoutReanimation/REAScreensHelper.h>
#import <reanimated/apple/LayoutReanimation/REASnapshot.h>

NS_ASSUME_NONNULL_BEGIN

@implementation REASnapshot

const int ScreenStackPresentationModal = 1; // RNSScreenStackPresentationModal
const int DEFAULT_MODAL_TOP_OFFSET = 69; // Default iOS modal is shifted from screen top edge by 69px

- (instancetype)init:(REAUIView *)view
{
  self = [super init];
  [self makeSnapshotForView:view useAbsolutePositionOnly:NO withOffsetX:0 withOffsetY:0];
  return self;
}

- (instancetype)initWithAbsolutePosition:(REAUIView *)view withOffsetX:(double)offsetX withOffsetY:(double)offsetY
{
  self = [super init];
  [self makeSnapshotForView:view useAbsolutePositionOnly:YES withOffsetX:offsetX withOffsetY:offsetY];
  return self;
}

- (instancetype)initWithAbsolutePosition:(REAUIView *)view
{
  self = [super init];
  [self makeSnapshotForView:view useAbsolutePositionOnly:YES withOffsetX:0 withOffsetY:0];
  return self;
}

- (void)makeSnapshotForView:(REAUIView *)view
    useAbsolutePositionOnly:(BOOL)useAbsolutePositionOnly
                withOffsetX:(double)offsetX
                withOffsetY:(double)offsetY
{
#if TARGET_OS_OSX
  REAUIView *mainWindow = UIApplication.sharedApplication.keyWindow;
#else
  REAUIView *mainWindow = RCTKeyWindow();
#endif
  CGPoint absolutePosition = [[view superview] convertPoint:view.center toView:mainWindow];
  _values = [NSMutableDictionary new];
#if TARGET_OS_OSX
  _values[@"windowWidth"] = [NSNumber numberWithDouble:mainWindow.frame.size.width];
  _values[@"windowHeight"] = [NSNumber numberWithDouble:mainWindow.frame.size.height];
#else
  _values[@"windowWidth"] = [NSNumber numberWithDouble:mainWindow.bounds.size.width];
  _values[@"windowHeight"] = [NSNumber numberWithDouble:mainWindow.bounds.size.height];
#endif
  _values[@"width"] = [NSNumber numberWithDouble:(double)(view.bounds.size.width)];
  _values[@"height"] = [NSNumber numberWithDouble:(double)(view.bounds.size.height)];
  _values[@"globalOriginX"] = [NSNumber numberWithDouble:offsetX + absolutePosition.x - view.bounds.size.width / 2.0];
  _values[@"globalOriginY"] = [NSNumber numberWithDouble:offsetY + absolutePosition.y - view.bounds.size.height / 2.0];
  if (useAbsolutePositionOnly) {
    _values[@"originX"] = _values[@"globalOriginX"];
    _values[@"originY"] = _values[@"globalOriginY"];
    _values[@"originXByParent"] = [NSNumber numberWithDouble:view.center.x - view.bounds.size.width / 2.0];
    _values[@"originYByParent"] = [NSNumber numberWithDouble:view.center.y - view.bounds.size.height / 2.0];

#if TARGET_OS_OSX
    REAUIView *header = nil;
#else
    REAUIView *navigationContainer = view.reactViewController.navigationController.view;
    REAUIView *header = [navigationContainer.subviews count] > 1 ? navigationContainer.subviews[1] : nil;
#endif
    if (header != nil) {
      CGFloat headerHeight = header.frame.size.height;
      CGFloat headerOriginY = header.frame.origin.y;
      REAUIView *screen = [REAScreensHelper getScreenForView:view];
      if ([REAScreensHelper isScreenModal:screen] && screen.superview == nil) {
        int additionalModalOffset = 0;
        REAUIView *screenWrapper = [REAScreensHelper getScreenWrapper:view];
        int screenType = [REAScreensHelper getScreenType:screenWrapper];
        if (screenType == ScreenStackPresentationModal) {
          additionalModalOffset = DEFAULT_MODAL_TOP_OFFSET;
        }
        float originY = [_values[@"originY"] doubleValue] + headerHeight + headerOriginY + additionalModalOffset;
        _values[@"originY"] = @(originY);
      }
      _values[@"headerHeight"] = @(headerHeight);
    } else {
      _values[@"headerHeight"] = @(0);
    }

    // store the transofrmMatrix of this view, so that we can reestablish it later
    CGAffineTransform transform = view.transform;
    _values[@"transformMatrix"] = @[
      @(transform.a),
      @(transform.b),
      @(0),
      @(transform.c),
      @(transform.d),
      @(0),
      @(transform.tx),
      @(transform.ty),
      @(1)
    ];

    transform = [self findCombinedTransform:view];
    _values[@"combinedTransformMatrix"] = @[
      @(transform.a),
      @(transform.b),
      @(0),
      @(transform.c),
      @(transform.d),
      @(0),
      @(transform.tx),
      @(transform.ty),
      @(1)
    ];

    REAUIView *transformedView = [self maybeFindTransitionView:view];
    if (transformedView != nil) {
      // iOS affine matrix: https://developer.apple.com/documentation/corefoundation/cgaffinetransform
      transform = transformedView.transform;
      // revert the transformation that was applied to the view when transition started, since we are intereseted only
      // in the final result of the transition
      CGPoint center = [[view superview] convertPoint:view.center toView:transformedView.superview];
      CGPoint parentCenter = transformedView.center;
      CGFloat x = center.x, y = center.y, a = transform.a, b = transform.b, c = transform.c, d = transform.d,
              tx = transform.tx, ty = transform.ty, parentX = parentCenter.x, parentY = parentCenter.y;
      center.x = (b - a) * (x - parentX - tx) / (b * c - a * d) + parentX;
      center.y = (d - c) * (y - parentY - ty) / (a * d - b * c) + parentY;
      CGPoint absolute = [[transformedView superview] convertPoint:center toView:nil];
      _values[@"originX"] = [NSNumber numberWithDouble:offsetX + absolute.x - view.bounds.size.width / 2.0];
      _values[@"originY"] = [NSNumber numberWithDouble:offsetY + absolute.y - view.bounds.size.height / 2.0];
    }
#if defined(RCT_NEW_ARCH_ENABLED) || TARGET_OS_TV
    _values[@"borderRadius"] = @(0);
#else
    if ([view respondsToSelector:@selector(borderRadius)]) {
      // For example `RCTTextView` doesn't have `borderRadius` selector
      RCTView *rctView = ((RCTView *)view);
      CGFloat borderRadius = ((RCTView *)view).borderRadius;
      _values[@"borderRadius"] = @(borderRadius);
      _values[@"borderTopLeftRadius"] = @([self get:rctView.borderTopLeftRadius orDefault:borderRadius]);
      _values[@"borderTopRightRadius"] = @([self get:rctView.borderTopRightRadius orDefault:borderRadius]);
      _values[@"borderBottomLeftRadius"] = @([self get:rctView.borderBottomLeftRadius orDefault:borderRadius]);
      _values[@"borderBottomRightRadius"] = @([self get:rctView.borderBottomRightRadius orDefault:borderRadius]);
    } else {
      _values[@"borderRadius"] = @(0);
      _values[@"borderTopLeftRadius"] = @(0);
      _values[@"borderTopRightRadius"] = @(0);
      _values[@"borderBottomLeftRadius"] = @(0);
      _values[@"borderBottomRightRadius"] = @(0);
    }

#endif
  } else {
    _values[@"originX"] = @(view.center.x - view.bounds.size.width / 2.0);
    _values[@"originY"] = @(view.center.y - view.bounds.size.height / 2.0);
  }
}

- (CGAffineTransform)findCombinedTransform:(REAUIView *)view
{
  CGAffineTransform transform = view.transform;
  view = view.superview;
  while (view != nil && ![REAScreensHelper isRNSScreenType:view]) {
    // ignore transforms that are caused by transitions
    if (![view.superview isKindOfClass:NSClassFromString(@"UITransitionView")]) {
      CGAffineTransform t = view.transform;
      // we are ignoring translations in superviews, since the positioning obtained by converting the center point (and
      // applying it's view transforms) to the main window is already correct, here we only care about scale, shear and
      // rotation
      transform = CGAffineTransformConcat(transform, CGAffineTransformMake(t.a, t.b, t.c, t.d, 0, 0));
    }
    view = view.superview;
  }
  return transform;
}

- (REAUIView *)maybeFindTransitionView:(REAUIView *)view
{
  while (view != nil && ![REAScreensHelper isRNSScreenType:view]) {
    if ([view.superview isKindOfClass:NSClassFromString(@"UITransitionView")]) {
      return view;
    }
    view = view.superview;
  }
  return nil;
}

- (CGFloat)get:(CGFloat)value orDefault:(CGFloat)def
{
  return value == -1 ? def : value;
}

@end

NS_ASSUME_NONNULL_END
