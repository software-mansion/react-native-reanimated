#include <reanimated/apple/view/ReanimatedView.h>

#include <react/renderer/components/rnreanimated/ComponentDescriptors.h>
#include <react/renderer/components/rnreanimated/EventEmitters.h>
#include <react/renderer/components/rnreanimated/Props.h>
#include <react/renderer/components/rnreanimated/RCTComponentViewHelpers.h>

using namespace facebook::react;

@implementation ReanimatedView

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<ReanimatedViewComponentDescriptor>();
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
  //  const auto &oldViewProps = *std::static_pointer_cast<ReanimatedViewProps const>(_props);
  //  const auto &newViewProps = *std::static_pointer_cast<ReanimatedViewProps const>(props);

  [super updateProps:props oldProps:oldProps];
}

@end
