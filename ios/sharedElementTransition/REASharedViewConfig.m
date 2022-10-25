#import <RNReanimated/REASharedViewConfig.h>

@implementation REASharedViewConfig

- (instancetype)initWithTag:(NSNumber *)viewTag
{
  self = [super init];
  _viewTag = viewTag;
  _toRemove = false;
  return self;
}

@end
