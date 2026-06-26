#import <reanimated/apple/view/REASharedTransitionBoundaryView.h>

#import <Common/NativeView/react/renderer/components/rnreanimated/ComponentDescriptors.h>
#import <React/RCTConversions.h>
#import <react/renderer/components/rnreanimated/EventEmitters.h>
#import <react/renderer/components/rnreanimated/Props.h>
#import <react/renderer/components/rnreanimated/RCTComponentViewHelpers.h>

using namespace facebook::react;

@implementation REASharedTransitionBoundaryView

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<REASharedTransitionBoundaryComponentDescriptor>();
}

- (void)updateLayoutMetrics:(const facebook::react::LayoutMetrics &)layoutMetrics
           oldLayoutMetrics:(const facebook::react::LayoutMetrics &)oldLayoutMetrics
{
  [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:oldLayoutMetrics];
  self.frame = RCTCGRectFromRect(layoutMetrics.frame);
}

@end
