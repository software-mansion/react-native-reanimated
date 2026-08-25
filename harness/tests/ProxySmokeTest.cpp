#include <gtest/gtest.h>

#include <chrono>

#include <harness/AnimationHarness.h>

namespace reanimated::layout_animation::test {

using namespace std::chrono_literals;

TEST(ProxySmokeTest, RunsEnteringAnimationThroughTheRealProxy) {
  auto modes = std::vector<DriverMode>{DriverMode::IOS};
#ifdef HARNESS_PLATFORM_ANDROID
  modes = {DriverMode::AndroidPush, DriverMode::AndroidPull};
#endif

  for (auto mode : modes) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto &timeline = harness.timeline();

    timeline.at(0ms, Lane::JS, [&] {
      harness.render(Snapshot{{view(2, {10, 20, 100, 80})}}, {animation(2, LayoutAnimationType::ENTERING, "fade-in")});
    });
#ifdef HARNESS_PLATFORM_ANDROID
    timeline.at(16ms, Lane::UI, [&] { harness.frame(); });
    timeline.advanceTo(16ms);
#else
    timeline.advanceTo(0ms);
#endif

    ASSERT_EQ(harness.starts().size(), 1);
    EXPECT_EQ(harness.starts()[0].tag, 2);
    EXPECT_EQ(harness.starts()[0].type, LayoutAnimationType::ENTERING);
    EXPECT_EQ(harness.starts()[0].config, "fade-in");
    EXPECT_EQ(harness.starts()[0].values.at("targetOriginX"), 10);
    EXPECT_TRUE(harness.platform().hostTree().hasTag(2));

    timeline.at(100ms, Lane::UI, [&] {
      harness.progress(2, {.x = 10, .y = 20, .width = 100, .height = 80, .opacity = 0.5});
      harness.frame();
    });
    timeline.at(200ms, Lane::UI, [&] {
      harness.end(2, false);
      harness.frame();
    });
    timeline.advanceTo(200ms);

    EXPECT_TRUE(harness.platform().hostTree().hasTag(2));
  }
}

} // namespace reanimated::layout_animation::test
