#import <reanimated/apple/NativeAnimations/REANativeAnimationTrack.h>

@implementation REANativeAnimationTrack

- (instancetype)initWithAnimation:(CAAnimation *)animation
                          keyPath:(NSString *)keyPath
                       targetName:(NSString *)targetName
              ownershipTargetName:(NSString *)ownershipTargetName
{
  if (self = [super init]) {
    _animation = animation;
    _keyPath = [keyPath copy];
    _targetName = [targetName copy];
    _ownershipTargetName = [ownershipTargetName copy];
  }
  return self;
}

@end
