#import "MountCounter.h"

@implementation MountCounter

- (void)didMountComponentsWithRootTag:(NSInteger)rootTag
{
  _count += 1;
}

@end
