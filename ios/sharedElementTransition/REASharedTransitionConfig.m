#import <RNReanimated/REASharedTransitionConfig.h>

@implementation REASharedTransitionConfig

- (instancetype)initWithFromView:(UIView *)fromView
                          toView:(UIView *)toView
                   fromContainer:(UIView *)fromContainer
                   fromViewFrame:(CGRect)fromViewFrame
{
  if (self = [super init]) {
    _fromView = fromView;
    _toView = toView;
    _fromContainer = fromContainer;
    _fromViewFrame = fromViewFrame;
  }

  return self;
}

@end
