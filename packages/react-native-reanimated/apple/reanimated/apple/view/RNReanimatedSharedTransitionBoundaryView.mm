#import <reanimated/apple/view/RNReanimatedSharedTransitionBoundaryView.h>

#import <Common/NativeView/react/renderer/components/rnreanimated/ComponentDescriptors.h>
#import <react/renderer/components/rnreanimated/EventEmitters.h>
#import <react/renderer/components/rnreanimated/Props.h>
#import <react/renderer/components/rnreanimated/RCTComponentViewHelpers.h>

using namespace facebook::react;

@implementation RNReanimatedSharedTransitionBoundaryView

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<RNReanimatedSharedTransitionBoundaryComponentDescriptor>();
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
  [super updateProps:props oldProps:oldProps];
}

@end
