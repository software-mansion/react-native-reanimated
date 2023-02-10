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
  } else {
    _values[@"originX"] = [NSNumber numberWithDouble:view.center.x - view.bounds.size.width / 2.0];
    _values[@"originY"] = [NSNumber numberWithDouble:view.center.y - view.bounds.size.height / 2.0];
  }
}

@end

NS_ASSUME_NONNULL_END
