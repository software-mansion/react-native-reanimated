#import <Foundation/Foundation.h>
#import <RNReanimated/REASnapshot.h>
#import <React/UIView+React.h>

NS_ASSUME_NONNULL_BEGIN

@implementation REASnapshot

- (instancetype)init:(UIView *)view
{
  self = [super init];
  [self makeSnapshotForView:view useAbsolutePositionOnly:NO];
  return self;
}

- (instancetype)initWithAbsolutePosition:(UIView *)view
{
  self = [super init];
  [self makeSnapshotForView:view useAbsolutePositionOnly:YES];
  return self;
}

- (void)makeSnapshotForView:(UIView *)view useAbsolutePositionOnly:(BOOL)useAbsolutePositionOnly
{
  UIView *mainWindow = UIApplication.sharedApplication.keyWindow;
  CGPoint absolutePosition = [[view superview] convertPoint:view.center toView:mainWindow];
  _values = [NSMutableDictionary new];
  _values[@"windowWidth"] = [NSNumber numberWithDouble:mainWindow.bounds.size.width];
  _values[@"windowHeight"] = [NSNumber numberWithDouble:mainWindow.bounds.size.height];
  _values[@"width"] = [NSNumber numberWithDouble:(double)(view.bounds.size.width)];
  _values[@"height"] = [NSNumber numberWithDouble:(double)(view.bounds.size.height)];
  _values[@"globalOriginX"] = [NSNumber numberWithDouble:absolutePosition.x - view.bounds.size.width / 2.0];
  _values[@"globalOriginY"] = [NSNumber numberWithDouble:absolutePosition.y - view.bounds.size.height / 2.0];
  if (useAbsolutePositionOnly) {
    _values[@"originX"] = _values[@"globalOriginX"];
    _values[@"originY"] = _values[@"globalOriginY"];
    _values[@"originYByParent"] = [NSNumber numberWithDouble:view.center.y - view.bounds.size.height / 2.0];

    UIView *navigationContainer = view.reactViewController.navigationController.view;
    UIView *header = [navigationContainer.subviews count] > 1 ? navigationContainer.subviews[1] : nil;
    if (header != nil) {
      _values[@"headerHeight"] = @(header.frame.size.height);
    } else {
      _values[@"headerHeight"] = @(0);
    }

    // https://developer.apple.com/documentation/corefoundation/cgaffinetransform?language=objc
    UIView *transformedView;
    bool isTransformed = false;
    do {
      if (transformedView == nil) {
        transformedView = view;
      } else {
        transformedView = transformedView.superview;
      }
      CGAffineTransform transform = transformedView.transform;
      isTransformed = transform.a != 1 || transform.b != 0 || transform.c != 0 || transform.d != 1 ||
          transform.tx != 0 || transform.ty != 0;
    } while (!isTransformed && transformedView != nil);
    if (isTransformed && transformedView != nil) {
      CGAffineTransform transform = transformedView.transform;
      NSNumber *a = @(transform.a);
      NSNumber *b = @(transform.b);
      NSNumber *c = @(transform.c);
      NSNumber *d = @(transform.d);
      NSNumber *tx = @(transform.tx);
      NSNumber *ty = @(transform.tx);
      _values[@"transformMatrix"] = @[ a, b, @(0), c, d, @(0), tx, ty, @(1) ];

      _values[@"originX"] = @([_values[@"originX"] doubleValue] - [tx doubleValue]);
      _values[@"originY"] = @([_values[@"originY"] doubleValue] - [ty doubleValue]);
    } else {
      _values[@"transformMatrix"] = @[ @(1), @(0), @(0), @(0), @(1), @(0), @(0), @(0), @(1) ];
    }

  } else {
    _values[@"originX"] = [NSNumber numberWithDouble:view.center.x - view.bounds.size.width / 2.0];
    _values[@"originY"] = [NSNumber numberWithDouble:view.center.y - view.bounds.size.height / 2.0];
  }
}

@end

NS_ASSUME_NONNULL_END
