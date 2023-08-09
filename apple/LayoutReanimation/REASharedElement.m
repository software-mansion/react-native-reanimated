#import <RNReanimated/REASharedElement.h>

#import <RNReanimated/REAUIKit.h>

@implementation REASharedElement
- (instancetype)initWithSourceView:(RNAUIView *)sourceView
                sourceViewSnapshot:(REASnapshot *)sourceViewSnapshot
                        targetView:(RNAUIView *)targetView
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
