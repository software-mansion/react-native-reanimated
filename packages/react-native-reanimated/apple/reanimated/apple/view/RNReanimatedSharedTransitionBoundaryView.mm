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
  //  const auto &oldViewProps = *std::static_pointer_cast<RNReanimatedSharedTransitionBoundaryProps const>(_props);
  //  const auto &newViewProps = *std::static_pointer_cast<RNReanimatedSharedTransitionBoundaryProps const>(props);

  [super updateProps:props oldProps:oldProps];
}

@end
