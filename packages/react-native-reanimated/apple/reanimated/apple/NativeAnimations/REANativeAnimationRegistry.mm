#import <reanimated/apple/NativeAnimations/REANativeAnimationRegistry.h>

#import <reanimated/apple/REACoreAnimationDelegate.h>

#import <React/RCTUtils.h>

#import <unordered_set>

namespace {

NSString *handleKey(const reanimated::NativeAnimationHandle &handle)
{
  return [NSString stringWithFormat:@"%d.%d.%u.%llu", handle.surfaceId, handle.tag, handle.owner, handle.generation];
}

NSString *animationKeyPrefix(const reanimated::NativeAnimationHandle &handle)
{
  return [NSString stringWithFormat:@"reanimated.layout.%d.%d.%llu.", handle.surfaceId, handle.tag, handle.generation];
}

NSString *claimKey(const reanimated::NativeAnimationHandle &handle, NSString *target)
{
  return [NSString stringWithFormat:@"%d.%d.%@", handle.surfaceId, handle.tag, target];
}

void replaceStartValue(CAAnimation *animation, id value)
{
  if (value == nil) {
    return;
  }
  if ([animation isKindOfClass:[CABasicAnimation class]]) {
    ((CABasicAnimation *)animation).fromValue = value;
    return;
  }
  if ([animation isKindOfClass:[CAKeyframeAnimation class]]) {
    CAKeyframeAnimation *keyframes = (CAKeyframeAnimation *)animation;
    if (keyframes.values.count == 0) {
      return;
    }
    NSMutableArray *values = [keyframes.values mutableCopy];
    values[0] = value;
    keyframes.values = values;
  }
}

} // namespace

@interface REAActiveNativeAnimation : NSObject

@property (nonatomic) reanimated::NativeAnimationHandle handle;
@property (nonatomic, strong) CALayer *layer;
@property (nonatomic, strong) NSMutableDictionary<NSString *, NSMutableArray<NSString *> *> *keysByTarget;
@property (nonatomic) NSUInteger pendingTrackCount;
@property (nonatomic) BOOL started;
@property (nonatomic) BOOL terminal;
@property (nonatomic) std::function<void(void)> onStart;
@property (nonatomic) std::function<void(bool)> onTerminal;

@end

@implementation REAActiveNativeAnimation
@end

@implementation REANativeAnimationRegistry {
  NSMutableDictionary<NSString *, REAActiveNativeAnimation *> *_activeByHandle;
  NSMutableDictionary<NSString *, NSString *> *_ownerByTarget;
}

- (instancetype)init
{
  if (self = [super init]) {
    _activeByHandle = [NSMutableDictionary dictionary];
    _ownerByTarget = [NSMutableDictionary dictionary];
  }
  return self;
}

- (void)finishActive:(REAActiveNativeAnimation *)active finished:(BOOL)finished
{
  RCTAssertMainQueue();
  if (active.terminal) {
    return;
  }
  active.terminal = YES;
  NSString *activeHandleKey = handleKey(active.handle);
  for (NSString *target in active.keysByTarget) {
    NSString *targetClaimKey = claimKey(active.handle, target);
    if ([_ownerByTarget[targetClaimKey] isEqualToString:activeHandleKey]) {
      [_ownerByTarget removeObjectForKey:targetClaimKey];
    }
  }
  [_activeByHandle removeObjectForKey:activeHandleKey];
  auto completion = active.onTerminal;
  active.onTerminal = nullptr;
  if (completion) {
    completion(finished);
  }
}

- (void)trackStoppedForHandleKey:(NSString *)activeHandleKey
                    animationKey:(NSString *)animationKey
                        finished:(BOOL)finished
{
  RCTAssertMainQueue();
  REAActiveNativeAnimation *active = _activeByHandle[activeHandleKey];
  if (active == nil || active.terminal) {
    return;
  }
  for (NSString *target in active.keysByTarget.allKeys) {
    NSMutableArray<NSString *> *keys = active.keysByTarget[target];
    if ([keys containsObject:animationKey]) {
      [keys removeObject:animationKey];
      if (keys.count == 0) {
        [active.keysByTarget removeObjectForKey:target];
        NSString *targetClaimKey = claimKey(active.handle, target);
        if ([_ownerByTarget[targetClaimKey] isEqualToString:activeHandleKey]) {
          [_ownerByTarget removeObjectForKey:targetClaimKey];
        }
      }
      break;
    }
  }
  if (active.pendingTrackCount > 0) {
    active.pendingTrackCount--;
  }
  if (!finished) {
    // A single failed physical track makes the logical animation terminal.
    // Detach the remaining delegates before removal so their stop callbacks
    // cannot race this handle's one terminal event.
    for (NSString *target in active.keysByTarget.allKeys) {
      for (NSString *key in [active.keysByTarget[target] copy]) {
        CAAnimation *animation = [active.layer animationForKey:key];
        animation.delegate = nil;
        [active.layer removeAnimationForKey:key];
      }
    }
    [self finishActive:active finished:NO];
  } else if (active.pendingTrackCount == 0) {
    [self finishActive:active finished:YES];
  }
}

- (void)attachDelegateToAnimation:(CAAnimation *)animation
                        activeKey:(NSString *)activeKey
                     animationKey:(NSString *)animationKey
{
  __weak REANativeAnimationRegistry *weakSelf = self;
  animation.delegate = [REACoreAnimationDelegate
      delegateWithStart:^(CAAnimation *) {
        REANativeAnimationRegistry *strongSelf = weakSelf;
        REAActiveNativeAnimation *active = strongSelf->_activeByHandle[activeKey];
        if (active == nil || active.terminal || active.started) {
          return;
        }
        active.started = YES;
        if (active.onStart) {
          active.onStart();
        }
      }
      stop:^(CAAnimation *, BOOL finished) {
        [weakSelf trackStoppedForHandleKey:activeKey animationKey:animationKey finished:finished];
      }];
}

- (BOOL)installTracks:(NSArray<REANativeAnimationTrack *> *)tracks
               handle:(reanimated::NativeAnimationHandle)handle
                layer:(CALayer *)layer
              onStart:(std::function<void(void)>)onStart
           onTerminal:(std::function<void(bool)>)onTerminal
{
  RCTAssertMainQueue();
  NSString *newHandleKey = handleKey(handle);
  if (_activeByHandle[newHandleKey] != nil || tracks.count == 0) {
    return NO;
  }

  // CSS transitions currently use the raw key path as their CA key. Refuse
  // exact visual conflicts before changing any layout ownership.
  for (REANativeAnimationTrack *track in tracks) {
    if ([layer animationForKey:track.keyPath] != nil) {
      return NO;
    }
  }

  NSMutableDictionary<NSString *, NSMutableArray<REANativeAnimationTrack *> *> *incomingByTarget =
      [NSMutableDictionary dictionary];
  for (REANativeAnimationTrack *track in tracks) {
    NSMutableArray *targetTracks = incomingByTarget[track.ownershipTargetName];
    if (targetTracks == nil) {
      targetTracks = [NSMutableArray array];
      incomingByTarget[track.ownershipTargetName] = targetTracks;
    }
    [targetTracks addObject:track];
  }

  NSMutableDictionary<NSString *, REAActiveNativeAnimation *> *replaced = [NSMutableDictionary dictionary];
  for (NSString *target in incomingByTarget) {
    NSString *oldHandleKey = _ownerByTarget[claimKey(handle, target)];
    if (oldHandleKey != nil && ![oldHandleKey isEqualToString:newHandleKey]) {
      REAActiveNativeAnimation *old = _activeByHandle[oldHandleKey];
      if (old != nil) {
        replaced[oldHandleKey] = old;
      }
    }
  }

  REAActiveNativeAnimation *next = [REAActiveNativeAnimation new];
  next.handle = handle;
  next.layer = layer;
  next.keysByTarget = [NSMutableDictionary dictionary];
  next.onStart = std::move(onStart);
  next.onTerminal = std::move(onTerminal);
  _activeByHandle[newHandleKey] = next;

  // Presentation reads must happen while the replaced animations are still
  // installed. Reading first also makes the capture/remove/add sequence
  // explicit instead of relying on transaction commit timing.
  NSMutableDictionary<NSString *, id> *capturedStartValues = [NSMutableDictionary dictionary];
  if (replaced.count > 0) {
    CALayer *presentationLayer = layer.presentationLayer;
    for (NSString *target in incomingByTarget) {
      for (REANativeAnimationTrack *track in incomingByTarget[target]) {
        id presentationValue = [presentationLayer valueForKeyPath:track.keyPath];
        if (presentationValue != nil) {
          capturedStartValues[track.keyPath] = presentationValue;
        }
      }
    }
  }

  [CATransaction begin];
  [CATransaction setDisableActions:YES];

  // Move unaffected physical tracks to the replacement logical generation.
  // Their original layer-local timing is retained, so the visible trajectory
  // continues without restarting.
  for (NSString *oldHandleKey in replaced) {
    REAActiveNativeAnimation *old = replaced[oldHandleKey];
    old.terminal = YES;
    [_activeByHandle removeObjectForKey:oldHandleKey];
    for (NSString *target in old.keysByTarget) {
      NSArray<NSString *> *keys = [old.keysByTarget[target] copy];
      const BOOL targetIsReplaced = incomingByTarget[target] != nil;
      for (NSString *oldAnimationKey in keys) {
        CAAnimation *animation = [old.layer animationForKey:oldAnimationKey];
        if (animation != nil) {
          animation.delegate = nil;
        }
        [old.layer removeAnimationForKey:oldAnimationKey];
        if (!targetIsReplaced && animation != nil && old.layer == layer) {
          NSString *suffix = [oldAnimationKey componentsSeparatedByString:@"."].lastObject;
          NSString *newAnimationKey = [animationKeyPrefix(handle) stringByAppendingString:suffix];
          NSMutableArray<NSString *> *newKeys = next.keysByTarget[target];
          if (newKeys == nil) {
            newKeys = [NSMutableArray array];
            next.keysByTarget[target] = newKeys;
          }
          [newKeys addObject:newAnimationKey];
          next.pendingTrackCount++;
          [self attachDelegateToAnimation:animation activeKey:newHandleKey animationKey:newAnimationKey];
          [layer addAnimation:animation forKey:newAnimationKey];
          _ownerByTarget[claimKey(handle, target)] = newHandleKey;
        }
      }
    }
  }

  for (NSString *target in incomingByTarget) {
    NSMutableArray<NSString *> *keys = [NSMutableArray array];
    next.keysByTarget[target] = keys;
    for (REANativeAnimationTrack *track in incomingByTarget[target]) {
      CAAnimation *animation = [track.animation copy];
      id presentationValue = capturedStartValues[track.keyPath];
      if (presentationValue != nil) {
        replaceStartValue(animation, presentationValue);
      }
      NSString *newAnimationKey = [animationKeyPrefix(handle) stringByAppendingString:track.targetName];
      [keys addObject:newAnimationKey];
      next.pendingTrackCount++;
      [self attachDelegateToAnimation:animation activeKey:newHandleKey animationKey:newAnimationKey];
      [layer addAnimation:animation forKey:newAnimationKey];
    }
    _ownerByTarget[claimKey(handle, target)] = newHandleKey;
  }
  [CATransaction commit];

  for (REAActiveNativeAnimation *old in replaced.allValues) {
    auto completion = old.onTerminal;
    old.onTerminal = nullptr;
    if (completion) {
      completion(false);
    }
  }
  return YES;
}

- (void)cancelHandle:(reanimated::NativeAnimationHandle)handle
         disposition:(reanimated::NativeAnimationCancelDisposition)disposition
{
  RCTAssertMainQueue();
  REAActiveNativeAnimation *active = _activeByHandle[handleKey(handle)];
  if (active == nil) {
    return;
  }
  // All cancellation dispositions stop this handle's physical ownership.
  // PreservePresentationForRetarget is fulfilled by installTracks:, which
  // performs capture/remove/add atomically when a replacement owns the same
  // target. RemoveRetainedView's lifecycle cleanup remains above this
  // platform registry.
  switch (disposition) {
    case reanimated::NativeAnimationCancelDisposition::SettleToCommittedModel:
    case reanimated::NativeAnimationCancelDisposition::PreservePresentationForRetarget:
    case reanimated::NativeAnimationCancelDisposition::RemoveRetainedView:
      break;
  }
  active.terminal = YES;
  [_activeByHandle removeObjectForKey:handleKey(handle)];
  for (NSString *target in active.keysByTarget) {
    NSString *targetClaimKey = claimKey(handle, target);
    if ([_ownerByTarget[targetClaimKey] isEqualToString:handleKey(handle)]) {
      [_ownerByTarget removeObjectForKey:targetClaimKey];
    }
    for (NSString *key in [active.keysByTarget[target] copy]) {
      [active.layer removeAnimationForKey:key];
    }
  }
}

- (void)cancelSurface:(facebook::react::SurfaceId)surfaceId
{
  RCTAssertMainQueue();
  for (REAActiveNativeAnimation *active in _activeByHandle.allValues.copy) {
    if (active.handle.surfaceId == surfaceId) {
      [self cancelHandle:active.handle
             disposition:reanimated::NativeAnimationCancelDisposition::SettleToCommittedModel];
    }
  }
}

@end
