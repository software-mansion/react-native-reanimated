#include <gtest/gtest.h>

#include <chrono>

#include <harness/AnimationHarness.h>
#include <harness/TestMetadata.h>

#include <react/renderer/components/view/ViewProps.h>

namespace reanimated::layout_animation::test {

using namespace std::chrono_literals;

HARNESS_TEST(
    ProxySmokeTest,
    RunsEnteringAnimationThroughTheRealProxy,
    .description =
        "An entering view must be hidden before its first animation frame. "
        "A visible initial mount causes the Android flash fixed by GitHub #10198.",
    .githubIssues = {10198}) {
  auto modes = std::vector<DriverMode>{DriverMode::IOS};
#ifdef HARNESS_PLATFORM_ANDROID
  modes = {DriverMode::AndroidPush, DriverMode::AndroidPull};
#endif

  for (auto mode : modes) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto timeline = AnimationTimeline(harness);

    timeline.configureAnimations({
        .at = 0ms,
        .animations = {animation({
            .tag = 2,
            .type = LayoutAnimationType::ENTERING,
            .name = "fade-in",
        })},
    });
    timeline.render({
        .at = 0ms,
        .tree = snapshot({view({
            .tag = 2,
            .frame = {.x = 10, .y = 20, .width = 100, .height = 80},
        })}),
    });

    ASSERT_EQ(harness.starts().size(), 1);
    EXPECT_EQ(harness.starts()[0].tag, 2);
    EXPECT_EQ(harness.starts()[0].type, LayoutAnimationType::ENTERING);
    EXPECT_EQ(harness.starts()[0].config, "fade-in");
    EXPECT_EQ(harness.starts()[0].values.at("targetOriginX"), 10);
    EXPECT_TRUE(harness.platform().hostTree().hasTag(2));
    const auto &initialProps =
        static_cast<const facebook::react::ViewProps &>(*harness.platform().hostTree().getStubView(2).props);
    EXPECT_FLOAT_EQ(initialProps.opacity, 0);

    timeline.progress({
        .at = 100ms,
        .tag = 2,
        .style = {.x = 10, .y = 20, .width = 100, .height = 80, .opacity = 0.5},
    });
    const auto &progressProps =
        static_cast<const facebook::react::ViewProps &>(*harness.platform().hostTree().getStubView(2).props);
    EXPECT_FLOAT_EQ(progressProps.opacity, 0.5);

    timeline.progress({
        .at = 190ms,
        .tag = 2,
        .style = {.x = 10, .y = 20, .width = 100, .height = 80, .opacity = 1},
    });
    timeline.end({.at = 200ms, .tag = 2, .removeView = false});

    EXPECT_TRUE(harness.platform().hostTree().hasTag(2));
    const auto &finalProps =
        static_cast<const facebook::react::ViewProps &>(*harness.platform().hostTree().getStubView(2).props);
    EXPECT_FLOAT_EQ(finalProps.opacity, 1);
  }
}

} // namespace reanimated::layout_animation::test
