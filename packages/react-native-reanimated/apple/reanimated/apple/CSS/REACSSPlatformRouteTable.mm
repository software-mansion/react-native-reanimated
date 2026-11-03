#import <reanimated/apple/CSS/REACSSPlatformRouteTable.h>
#import <reanimated/apple/NativeAnimations/REANativeAnimationPlatform.h>

#import <vector>

namespace reanimated::css {

using namespace native_animation;

CSSPlatformRouteTable makeCoreAnimationRouteTable()
{
  // TODO: border props snap when RN rasterizes the border (the view fails
  // useCoreAnimationBorderRendering); route them only when the layer draws them.
  return {
      .targets =
          {
              {"opacity", AnimationTarget::Opacity},
              {"backgroundColor", AnimationTarget::BackgroundColor},
              {"borderColor", AnimationTarget::BorderColor},
              {"borderRadius", AnimationTarget::BorderRadius},
              {"shadowColor", AnimationTarget::ShadowColor},
              {"shadowOpacity", AnimationTarget::ShadowOpacity},
              {"shadowRadius", AnimationTarget::ShadowRadius},
              {"shadowOffset", AnimationTarget::ShadowOffset},
          },
      .timingKinds = std::vector(kCoreAnimationTimingKinds.begin(), kCoreAnimationTimingKinds.end()),
  };
}

} // namespace reanimated::css
