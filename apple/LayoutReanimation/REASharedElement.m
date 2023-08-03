#import <RNReanimated/REASharedElement.h>

#import <React/RCTUIKit.h>

@implementation REASharedElement
- (instancetype)initWithSourceView:(RCTUIView *)sourceView
                sourceViewSnapshot:(REASnapshot *)sourceViewSnapshot
                        targetView:(RCTUIView *)targetView
                targetViewSnapshot:(REASnapshot *)targetViewSnapshot
{
  self = [super init];
  _sourceView = sourceView;
  _sourceViewSnapshot = sourceViewSnapshot;
  _targetView = targetView;
  _targetViewSnapshot = targetViewSnapshot;
  _animationType = SHARED_ELEMENT_TRANSITION;
  return self;
}
@end
