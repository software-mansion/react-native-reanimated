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

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const REASharedTransitionBoundaryProps>();
    _props = defaultProps;
  }

  return self;
}

- (void)updateLayoutMetrics:(const facebook::react::LayoutMetrics &)layoutMetrics
           oldLayoutMetrics:(const facebook::react::LayoutMetrics &)oldLayoutMetrics
{
  // RCTViewComponentView stops hit testing at a view with no overflow inset.
  // Synchronous transforms move children out of the frame without layout,
  // so always report an overflow to keep them touchable.
  auto hitTestableLayoutMetrics = layoutMetrics;
  hitTestableLayoutMetrics.overflowInset = {.left = -1, .top = -1, .right = -1, .bottom = -1};

  [super updateLayoutMetrics:hitTestableLayoutMetrics oldLayoutMetrics:oldLayoutMetrics];
  self.frame = RCTCGRectFromRect(layoutMetrics.frame);
}

@end
