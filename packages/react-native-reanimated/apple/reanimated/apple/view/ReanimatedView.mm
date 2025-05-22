#import <reanimated/apple/view/ReanimatedView.h>

#import <react/renderer/components/rnreanimated/ComponentDescriptors.h>
#import <react/renderer/components/rnreanimated/EventEmitters.h>
#import <react/renderer/components/rnreanimated/RCTComponentViewHelpers.h>

using namespace facebook::react;

@implementation ReanimatedView

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<ReanimatedViewComponentDescriptor>();
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
  [super updateProps:props oldProps:oldProps];
}

@end

Class<RCTComponentViewProtocol> ReanimatedViewCls(void)
{
  return ReanimatedView.class;
}
