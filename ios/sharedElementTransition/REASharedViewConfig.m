#import <RNReanimated/REASharedViewConfig.h>

@implementation REASharedViewConfig {
  UIView *_view;
}

- (instancetype)initWithTag:(NSNumber *)viewTag
{
  self = [super init];
  _viewTag = viewTag;
  _toRemove = false;
  return self;
}

- (void)setView:(UIView *)view;
{
  _view = view;
  _toRemove = false;
}

- (UIView *)getView;
{
  _toRemove = true;
  UIView *viewPtr = _view;
  _view = nil;
  return viewPtr;
}

@end
