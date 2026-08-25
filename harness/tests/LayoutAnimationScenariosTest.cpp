#include <gtest/gtest.h>

#include <algorithm>
#include <array>
#include <chrono>
#include <set>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

#include <harness/AnimationHarness.h>

#include <react/renderer/components/view/ViewProps.h>

namespace reanimated::layout_animation::test {

using namespace std::chrono_literals;
using Time = Choreographer::Time;
using facebook::react::Tag;

namespace {

std::vector<DriverMode> platformModes() {
#ifdef HARNESS_PLATFORM_ANDROID
  return {DriverMode::AndroidPush, DriverMode::AndroidPull};
#else
  return {DriverMode::IOS};
#endif
}

void renderAt(
    AnimationHarness &harness,
    DriverMode mode,
    Time time,
    Snapshot snapshot,
    std::vector<AnimationConfig> configs = {}) {
  auto &timeline = harness.timeline();
  timeline.at(time, Lane::JS, [&harness, snapshot = std::move(snapshot), configs = std::move(configs)] {
    harness.render(snapshot, configs);
  });

  if (mode == DriverMode::IOS) {
    timeline.advanceTo(time);
    return;
  }

  timeline.at(time + 1ms, Lane::UI, [&] { harness.frame(); });
  timeline.advanceTo(time + 1ms);
}

template <typename Task>
void runUI(AnimationHarness &harness, Time time, Task task) {
  auto &timeline = harness.timeline();
  timeline.at(time, Lane::UI, [&] {
    task();
    harness.frame();
  });
  timeline.at(time + 1ms, Lane::UI, [&] { harness.frame(); });
  timeline.advanceTo(time + 1ms);
}

const AnimationStart &onlyStart(const AnimationHarness &harness) {
  if (harness.starts().size() != 1) {
    throw std::runtime_error("Expected exactly one animation start");
  }
  return harness.starts().front();
}

const AnimationStart *findStart(const AnimationHarness &harness, Tag tag, LayoutAnimationType type) {
  auto start = std::find_if(harness.starts().begin(), harness.starts().end(), [&](const auto &candidate) {
    return candidate.tag == tag && candidate.type == type;
  });
  return start == harness.starts().end() ? nullptr : &*start;
}

double startValue(const AnimationStart &start, const std::string &name) {
  auto value = start.values.find(name);
  EXPECT_NE(value, start.values.end());
  return value == start.values.end() ? 0 : value->second;
}

ProgressStyle finalStyle(const AnimationStart &start) {
  auto value = [&](const char *target, const char *current) {
    if (auto it = start.values.find(target); it != start.values.end()) {
      return it->second;
    }
    if (auto it = start.values.find(current); it != start.values.end()) {
      return it->second;
    }
    return 0.0;
  };
  return {
      .x = value("targetOriginX", "currentOriginX"),
      .y = value("targetOriginY", "currentOriginY"),
      .width = value("targetWidth", "currentWidth"),
      .height = value("targetHeight", "currentHeight"),
      .opacity = 1,
  };
}

void settleStarts(AnimationHarness &harness, Time time) {
  auto starts = std::vector<AnimationStart>{};
  auto seen = std::set<Tag>{};
  for (auto start = harness.starts().rbegin(); start != harness.starts().rend(); ++start) {
    if (seen.insert(start->tag).second && harness.isActive(start->tag)) {
      starts.push_back(*start);
    }
  }
  runUI(harness, time, [&] {
    for (const auto &start : starts) {
      harness.progress(start.tag, finalStyle(start));
    }
  });
  runUI(harness, time + 1ms, [&] {
    for (const auto &start : starts) {
      harness.end(start.tag, start.type == LayoutAnimationType::EXITING);
    }
  });
  harness.clearCalls();
}

Snapshot flatList(const std::vector<Tag> &tags, int round = 0) {
  auto children = std::vector<ViewSpec>{};
  children.reserve(tags.size());
  for (size_t index = 0; index < tags.size(); ++index) {
    children.push_back(view(
        tags[index],
        {static_cast<float>((index % 4) * 40),
         static_cast<float>((index / 4) * 40),
         static_cast<float>(30 + round % 3),
         30}));
  }
  return {std::move(children)};
}

std::vector<AnimationConfig> layoutConfigs(const std::vector<Tag> &tags, const std::string &name = "layout") {
  auto configs = std::vector<AnimationConfig>{};
  configs.reserve(tags.size());
  for (auto tag : tags) {
    configs.push_back(animation(tag, LayoutAnimationType::LAYOUT, name));
  }
  return configs;
}

Snapshot sharedScreens(bool firstActive, int count, int round = 0) {
  auto first = std::vector<ViewSpec>{};
  auto second = std::vector<ViewSpec>{};
  first.reserve(count);
  second.reserve(count);
  for (int index = 0; index < count; ++index) {
    first.push_back(
        view(100 + index, {static_cast<float>((index % 6) * 30), static_cast<float>((index / 6) * 30), 24, 24}));
    second.push_back(view(
        200 + index,
        {static_cast<float>(300 - (index % 6) * 35 + round % 7),
         static_cast<float>(200 - (index / 6) * 35),
         static_cast<float>(28 + round % 5),
         28}));
  }
  return {{
      sharedTransitionBoundary(2, firstActive, std::move(first)),
      sharedTransitionBoundary(4, !firstActive, std::move(second)),
  }};
}

std::vector<AnimationConfig> sharedConfigs(int count) {
  auto configs = std::vector<AnimationConfig>{};
  configs.reserve(count * 2);
  for (int index = 0; index < count; ++index) {
    auto name = "shared-" + std::to_string(index);
    configs.push_back(animation(100 + index, LayoutAnimationType::SHARED_ELEMENT_TRANSITION_NATIVE_ID, name, name));
    configs.push_back(animation(200 + index, LayoutAnimationType::SHARED_ELEMENT_TRANSITION_NATIVE_ID, name, name));
  }
  return configs;
}

std::vector<Tag> syntheticRootTags(AnimationHarness &harness) {
  auto tags = std::vector<Tag>{};
  for (const auto &child : harness.platform().hostTree().getRootStubView().children) {
    if (child->tag >= 10000000) {
      tags.push_back(child->tag);
    }
  }
  return tags;
}

} // namespace

TEST(LayoutAnimationScenariosTest, ExitingViewStaysMountedUntilItsAnimationEnds) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);

    renderAt(harness, mode, 0ms, Snapshot{{view(2, {0, 0, 100, 100})}});
    harness.clearCalls();
    renderAt(harness, mode, 10ms, Snapshot{}, {animation(2, LayoutAnimationType::EXITING, "fade-out")});

    const auto &start = onlyStart(harness);
    EXPECT_EQ(start.tag, 2);
    EXPECT_EQ(start.type, LayoutAnimationType::EXITING);
    EXPECT_EQ(start.config, "fade-out");
    EXPECT_TRUE(harness.platform().hostTree().hasTag(2));

    settleStarts(harness, 20ms);

    EXPECT_FALSE(harness.platform().hostTree().hasTag(2));
    EXPECT_EQ(harness.platform().hostTree().size(), 1);
  }
}

TEST(LayoutAnimationScenariosTest, RemovingAnExitConfigUnmountsWithoutStartingIt) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);

    renderAt(
        harness,
        mode,
        0ms,
        Snapshot{{view(2, {0, 0, 100, 100})}},
        {animation(2, LayoutAnimationType::EXITING, "configured-exit")});
    harness.clearCalls();
    renderAt(harness, mode, 10ms, Snapshot{}, {removeAnimation(2, LayoutAnimationType::EXITING)});

    EXPECT_TRUE(harness.starts().empty());
    EXPECT_FALSE(harness.platform().hostTree().hasTag(2));
  }
}

TEST(LayoutAnimationScenariosTest, LayoutProgressAndRetargetUseTheCurrentMountedFrame) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);

    renderAt(
        harness,
        mode,
        0ms,
        Snapshot{{view(2, {0, 0, 100, 100})}},
        {animation(2, LayoutAnimationType::LAYOUT, "spring")});
    harness.clearCalls();
    renderAt(
        harness,
        mode,
        10ms,
        Snapshot{{view(2, {100, 20, 120, 80})}},
        {animation(2, LayoutAnimationType::LAYOUT, "spring")});

    auto first = onlyStart(harness);
    EXPECT_EQ(first.type, LayoutAnimationType::LAYOUT);
    EXPECT_EQ(startValue(first, "currentOriginX"), 0);
    EXPECT_EQ(startValue(first, "targetOriginX"), 100);

    runUI(harness, 20ms, [&] { harness.progress(2, {.x = 40, .y = 8, .width = 108, .height = 92, .opacity = 1}); });
    EXPECT_EQ(harness.platform().hostTree().getStubView(2).layoutMetrics.frame.origin.x, 40);

    harness.clearCalls();
    renderAt(
        harness,
        mode,
        30ms,
        Snapshot{{view(2, {200, 40, 140, 60})}},
        {animation(2, LayoutAnimationType::LAYOUT, "retarget")});

    auto second = onlyStart(harness);
    EXPECT_EQ(second.type, LayoutAnimationType::LAYOUT);
    EXPECT_EQ(startValue(second, "currentOriginX"), 40);
    EXPECT_EQ(startValue(second, "targetOriginX"), 200);

    settleStarts(harness, 40ms);
    const auto &frame = harness.platform().hostTree().getStubView(2).layoutMetrics.frame;
    EXPECT_EQ(frame.origin.x, 200);
    EXPECT_EQ(frame.origin.y, 40);
    EXPECT_EQ(frame.size.width, 140);
    EXPECT_EQ(frame.size.height, 60);
  }
}

TEST(LayoutAnimationScenariosTest, ExitingDescendantKeepsDeletedAncestorsAlive) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);

    renderAt(harness, mode, 0ms, Snapshot{{view(2, {0, 0, 200, 200}, {view(3, {10, 10, 100, 100})})}});
    harness.clearCalls();
    renderAt(harness, mode, 10ms, Snapshot{}, {animation(3, LayoutAnimationType::EXITING, "nested-exit")});

    const auto &start = onlyStart(harness);
    EXPECT_EQ(start.tag, 3);
    EXPECT_EQ(start.type, LayoutAnimationType::EXITING);
    EXPECT_TRUE(harness.platform().hostTree().hasTag(2));
    EXPECT_TRUE(harness.platform().hostTree().hasTag(3));

    settleStarts(harness, 20ms);

    EXPECT_FALSE(harness.platform().hostTree().hasTag(2));
    EXPECT_FALSE(harness.platform().hostTree().hasTag(3));
    EXPECT_EQ(harness.platform().hostTree().size(), 1);
  }
}

TEST(LayoutAnimationScenariosTest, TwoExitingSiblingsCanFinishOutOfOrder) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);

    renderAt(
        harness,
        mode,
        0ms,
        Snapshot{{view(2, {0, 0, 200, 100}, {view(3, {0, 0, 80, 80}), view(4, {100, 0, 80, 80})})}},
        {animation(3, LayoutAnimationType::EXITING, "short"), animation(4, LayoutAnimationType::EXITING, "long")});
    harness.clearCalls();
    renderAt(harness, mode, 10ms, Snapshot{});

    ASSERT_NE(findStart(harness, 3, LayoutAnimationType::EXITING), nullptr);
    ASSERT_NE(findStart(harness, 4, LayoutAnimationType::EXITING), nullptr);
    EXPECT_TRUE(harness.platform().hostTree().hasTag(2));

    runUI(harness, 20ms, [&] { harness.end(3, true); });
    EXPECT_FALSE(harness.platform().hostTree().hasTag(3));
    EXPECT_TRUE(harness.platform().hostTree().hasTag(4));
    EXPECT_TRUE(harness.platform().hostTree().hasTag(2));

    runUI(harness, 30ms, [&] { harness.end(4, true); });
    EXPECT_FALSE(harness.platform().hostTree().hasTag(2));
    EXPECT_FALSE(harness.platform().hostTree().hasTag(4));
    EXPECT_EQ(harness.platform().hostTree().size(), 1);
  }
}

TEST(LayoutAnimationScenariosTest, EnteringLayoutAndExitingShareOneCommit) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);

    renderAt(harness, mode, 0ms, Snapshot{{view(2, {0, 0, 80, 80}), view(3, {100, 0, 80, 80})}});
    harness.clearCalls();
    renderAt(
        harness,
        mode,
        10ms,
        Snapshot{{view(2, {120, 20, 100, 60}), view(4, {0, 0, 90, 90})}},
        {animation(2, LayoutAnimationType::LAYOUT, "move"),
         animation(3, LayoutAnimationType::EXITING, "leave"),
         animation(4, LayoutAnimationType::ENTERING, "arrive")});

    ASSERT_NE(findStart(harness, 2, LayoutAnimationType::LAYOUT), nullptr);
    ASSERT_NE(findStart(harness, 3, LayoutAnimationType::EXITING), nullptr);
    ASSERT_NE(findStart(harness, 4, LayoutAnimationType::ENTERING), nullptr);
    EXPECT_TRUE(harness.platform().hostTree().hasTag(3));

    settleStarts(harness, 20ms);

    EXPECT_TRUE(harness.platform().hostTree().hasTag(2));
    EXPECT_FALSE(harness.platform().hostTree().hasTag(3));
    EXPECT_TRUE(harness.platform().hostTree().hasTag(4));
    EXPECT_EQ(harness.platform().hostTree().size(), 3);
  }
}

TEST(LayoutAnimationScenariosTest, SkipExitingOnAnAncestorRemovesItsAnimatedSubtreeImmediately) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    harness.timeline().at(0ms, Lane::JS, [&] { harness.setShouldAnimateExiting(2, false); });
    renderAt(
        harness,
        mode,
        0ms,
        Snapshot{{view(2, {0, 0, 120, 120}, {view(3, {10, 10, 80, 80})})}},
        {animation(3, LayoutAnimationType::EXITING, "nested-exit")});
    harness.clearCalls();

    renderAt(harness, mode, 10ms, Snapshot{});

    EXPECT_TRUE(harness.starts().empty());
    EXPECT_FALSE(harness.platform().hostTree().hasTag(2));
    EXPECT_FALSE(harness.platform().hostTree().hasTag(3));
  }
}

TEST(LayoutAnimationScenariosTest, NestedSkipExitingCanBeOverriddenForAChild) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    harness.timeline().at(0ms, Lane::JS, [&] {
      harness.setShouldAnimateExiting(2, false);
      harness.setShouldAnimateExiting(3, true);
    });
    renderAt(
        harness,
        mode,
        0ms,
        Snapshot{{view(2, {0, 0, 120, 120}, {view(3, {10, 10, 80, 80})})}},
        {animation(3, LayoutAnimationType::EXITING, "nested-override")});
    harness.clearCalls();

    renderAt(harness, mode, 10ms, Snapshot{});

    ASSERT_NE(findStart(harness, 3, LayoutAnimationType::EXITING), nullptr);
    EXPECT_TRUE(harness.platform().hostTree().hasTag(2));
    settleStarts(harness, 20ms);
    EXPECT_EQ(harness.platform().hostTree().size(), 1);
  }
}

TEST(LayoutAnimationScenariosTest, ReparentingStartsLayoutAnimationAndMovesTheView) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto initial =
        Snapshot{{view(2, {0, 0, 300, 200}, {view(3, {20, 20, 200, 120}, false, {view(4, {0, 0, 200, 100})})})}};
    auto moved =
        Snapshot{{view(2, {0, 0, 300, 200}, {view(3, {20, 20, 200, 120}, true, {view(4, {0, 0, 100, 100})})})}};

    renderAt(harness, mode, 0ms, initial, {animation(4, LayoutAnimationType::LAYOUT, "move")});
    harness.clearCalls();
    renderAt(harness, mode, 10ms, moved, {animation(4, LayoutAnimationType::LAYOUT, "move")});

    const auto &start = onlyStart(harness);
    EXPECT_EQ(start.tag, 4);
    EXPECT_EQ(start.type, LayoutAnimationType::LAYOUT);
    EXPECT_FALSE(harness.platform().hostTree().hasTag(3));
    EXPECT_EQ(harness.platform().hostTree().getStubView(4).parentTag, 2);

    settleStarts(harness, 20ms);
    EXPECT_EQ(harness.platform().hostTree().getStubView(4).parentTag, 2);
  }
}

TEST(LayoutAnimationScenariosTest, FlatteningAParentWhileRemovingAChildKeepsHostOrderConsistent) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto initial =
        Snapshot{{view(2, {20, 20, 200, 200}, false, {view(3, {0, 0, 100, 100}, {view(4, {0, 0, 50, 50})})})}};
    auto flattened = Snapshot{{view(2, {20, 20, 200, 200}, true, {view(3, {0, 0, 100, 100})})}};

    renderAt(harness, mode, 0ms, initial, {animation(3, LayoutAnimationType::EXITING, "armed-exit")});
    harness.clearCalls();
    renderAt(harness, mode, 10ms, flattened);

    EXPECT_FALSE(harness.platform().hostTree().hasTag(2));
    EXPECT_TRUE(harness.platform().hostTree().hasTag(3));
    EXPECT_FALSE(harness.platform().hostTree().hasTag(4));
    EXPECT_EQ(harness.platform().hostTree().getStubView(3).parentTag, 1);
    EXPECT_EQ(findStart(harness, 3, LayoutAnimationType::EXITING), nullptr);
  }
}

TEST(LayoutAnimationScenariosTest, RecreatingAnExitingTagCancelsTheStaleRemoval) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);

    renderAt(harness, mode, 0ms, Snapshot{{viewInstance(2, 0, {0, 0, 100, 100})}});
    harness.clearCalls();
    renderAt(harness, mode, 10ms, Snapshot{}, {animation(2, LayoutAnimationType::EXITING, "exit")});
    ASSERT_EQ(harness.starts().size(), 1);
    ASSERT_TRUE(harness.platform().hostTree().hasTag(2));

    harness.clearCalls();
    renderAt(
        harness,
        mode,
        20ms,
        Snapshot{{viewInstance(2, 1, {50, 0, 100, 100})}},
        {animation(2, LayoutAnimationType::ENTERING, "enter-again")});

    EXPECT_TRUE(harness.platform().hostTree().hasTag(2));
    EXPECT_EQ(harness.platform().hostTree().getRootStubView().children.size(), 1);
    if (!harness.starts().empty()) {
      settleStarts(harness, 30ms);
    }
    EXPECT_TRUE(harness.platform().hostTree().hasTag(2));
    EXPECT_EQ(harness.platform().hostTree().getRootStubView().children.size(), 1);
  }
}

TEST(LayoutAnimationScenariosTest, ZeroDurationEnteringCanSettleOnItsFirstFrame) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);

    renderAt(
        harness,
        mode,
        0ms,
        Snapshot{{view(2, {10, 20, 100, 80})}},
        {animation(2, LayoutAnimationType::ENTERING, "duration-zero")});
    auto start = onlyStart(harness);

    runUI(harness, 2ms, [&] {
      harness.progress(start.tag, finalStyle(start));
      harness.end(start.tag, false);
    });

    EXPECT_TRUE(harness.platform().hostTree().hasTag(2));
    const auto &frame = harness.platform().hostTree().getStubView(2).layoutMetrics.frame;
    EXPECT_EQ(frame.origin.x, 10);
    EXPECT_EQ(frame.origin.y, 20);
    EXPECT_EQ(frame.size.width, 100);
    EXPECT_EQ(frame.size.height, 80);
  }
}

TEST(LayoutAnimationScenariosTest, ProgressAppliesAnimatedStyleProps) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);

    renderAt(
        harness,
        mode,
        0ms,
        Snapshot{{view(2, {10, 20, 100, 80})}},
        {animation(2, LayoutAnimationType::ENTERING, "fade-in")});

    runUI(harness, 10ms, [&] { harness.progress(2, {.opacity = 0.35}); });
    const auto &progressed = harness.platform().hostTree().getStubView(2);
    const auto &progressedProps = static_cast<const facebook::react::ViewProps &>(*progressed.props);
    EXPECT_FLOAT_EQ(progressedProps.opacity, 0.35);

    settleStarts(harness, 20ms);
    const auto &settled = harness.platform().hostTree().getStubView(2);
    const auto &settledProps = static_cast<const facebook::react::ViewProps &>(*settled.props);
    EXPECT_EQ(settledProps.opacity, 1);
  }
}

TEST(LayoutAnimationScenariosTest, DisplayNoneCanToggleRepeatedlyAroundLayoutAnimations) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto visible = view(2, {0, 0, 100, 100});
    auto hidden = visible;
    hidden.displayNone = true;

    renderAt(harness, mode, 0ms, Snapshot{{visible}});
    auto time = 10ms;
    for (int round = 0; round < 40; ++round) {
      harness.clearCalls();
      renderAt(
          harness,
          mode,
          time,
          Snapshot{{round % 2 == 0 ? hidden : visible}},
          {animation(2, LayoutAnimationType::LAYOUT, "display-toggle")});
      if (!harness.starts().empty()) {
        settleStarts(harness, time + 2ms);
      }
      time += 4ms;
    }

    EXPECT_TRUE(harness.platform().hostTree().hasTag(2));
    EXPECT_EQ(harness.platform().hostTree().size(), 2);
  }
}

TEST(LayoutAnimationScenariosTest, SharedTagMovesBetweenActiveBoundaries) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto first = Snapshot{{
        sharedTransitionBoundary(2, true, {view(3, {0, 0, 80, 80})}),
        sharedTransitionBoundary(4, false, {view(5, {200, 100, 120, 120})}),
    }};
    auto second = Snapshot{{
        sharedTransitionBoundary(2, false, {view(3, {0, 0, 80, 80})}),
        sharedTransitionBoundary(4, true, {view(5, {200, 100, 120, 120})}),
    }};
    auto configs = std::vector{
        animation(3, LayoutAnimationType::SHARED_ELEMENT_TRANSITION_NATIVE_ID, "hero", "hero"),
        animation(5, LayoutAnimationType::SHARED_ELEMENT_TRANSITION_NATIVE_ID, "hero", "hero"),
    };

    renderAt(harness, mode, 0ms, first, configs);
    harness.clearCalls();
    renderAt(harness, mode, 10ms, second);

    auto start = std::find_if(harness.starts().begin(), harness.starts().end(), [](const auto &candidate) {
      return candidate.type == LayoutAnimationType::SHARED_ELEMENT_TRANSITION;
    });
    ASSERT_NE(start, harness.starts().end());
    EXPECT_EQ(start->config, "hero");
    EXPECT_NE(start->tag, 3);
    EXPECT_NE(start->tag, 5);
    EXPECT_TRUE(harness.platform().hostTree().hasTag(start->tag));

    auto containerTag = start->tag;
    settleStarts(harness, 20ms);
    EXPECT_FALSE(harness.platform().hostTree().hasTag(containerTag));
    EXPECT_TRUE(harness.platform().hostTree().hasTag(3));
    EXPECT_TRUE(harness.platform().hostTree().hasTag(5));
  }
}

TEST(LayoutAnimationScenariosTest, DuplicateSharedNamesDoNotLeaveSyntheticContainers) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto first = Snapshot{{
        sharedTransitionBoundary(2, true, {view(10, {0, 0, 50, 50}), view(11, {60, 0, 50, 50})}),
        sharedTransitionBoundary(4, false, {view(20, {200, 0, 50, 50}), view(21, {260, 0, 50, 50})}),
    }};
    auto second = Snapshot{{
        sharedTransitionBoundary(2, false, {view(10, {0, 0, 50, 50}), view(11, {60, 0, 50, 50})}),
        sharedTransitionBoundary(4, true, {view(20, {200, 0, 50, 50}), view(21, {260, 0, 50, 50})}),
    }};
    auto configs = std::vector<AnimationConfig>{};
    for (auto tag : {10, 11, 20, 21}) {
      configs.push_back(
          animation(tag, LayoutAnimationType::SHARED_ELEMENT_TRANSITION_NATIVE_ID, "duplicate", "duplicate"));
    }

    renderAt(harness, mode, 0ms, first, std::move(configs));
    harness.clearCalls();
    renderAt(harness, mode, 10ms, second);

    ASSERT_FALSE(harness.starts().empty());
    ASSERT_FALSE(syntheticRootTags(harness).empty());
    settleStarts(harness, 20ms);
    EXPECT_TRUE(syntheticRootTags(harness).empty());
    for (auto tag : {10, 11, 20, 21}) {
      EXPECT_TRUE(harness.platform().hostTree().hasTag(tag));
    }
  }
}

#ifndef HARNESS_PLATFORM_ANDROID
TEST(LayoutAnimationScenariosTest, InteractiveSharedTransitionProgressesAndFinishes) {
  auto harness = AnimationHarness(DriverMode::IOS);
  renderAt(harness, DriverMode::IOS, 0ms, sharedScreens(true, 1), sharedConfigs(1));

  runUI(harness, 10ms, [&] { harness.transitionProgress(4, 0.1, false, false); });
  auto containers = syntheticRootTags(harness);
  ASSERT_EQ(containers.size(), 1);

  runUI(harness, 20ms, [&] { harness.transitionProgress(4, 0.5, false, false); });
  EXPECT_TRUE(harness.platform().hostTree().hasTag(containers[0]));

  runUI(harness, 30ms, [&] { harness.transitionProgress(4, 1, false, false); });
  EXPECT_FALSE(harness.platform().hostTree().hasTag(containers[0]));
  EXPECT_TRUE(harness.platform().hostTree().hasTag(100));
  EXPECT_TRUE(harness.platform().hostTree().hasTag(200));
}

TEST(LayoutAnimationScenariosTest, CancellingInteractiveSharedTransitionRestoresBothSides) {
  auto harness = AnimationHarness(DriverMode::IOS);
  renderAt(harness, DriverMode::IOS, 0ms, sharedScreens(true, 1), sharedConfigs(1));

  runUI(harness, 10ms, [&] { harness.transitionProgress(4, 0.25, false, false); });
  auto containers = syntheticRootTags(harness);
  ASSERT_EQ(containers.size(), 1);

  runUI(harness, 20ms, [&] { harness.cancelTransition(); });
  EXPECT_FALSE(harness.platform().hostTree().hasTag(containers[0]));
  EXPECT_TRUE(harness.platform().hostTree().hasTag(100));
  EXPECT_TRUE(harness.platform().hostTree().hasTag(200));
}
#endif

TEST(LayoutAnimationScenariosTest, AnimatedMountSideEffectCommitsAFollowUpTree) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto followUp = Snapshot{{view(2, {80, 20, 120, 80}), view(3, {0, 0, 50, 50})}};
    auto onMount = mutationCallback([&] { harness.platform().commitFromMount(followUp); });

    renderAt(
        harness,
        mode,
        0ms,
        Snapshot{{view(2, {0, 0, 100, 100}, {}, {.onMount = onMount})}},
        {animation(2, LayoutAnimationType::ENTERING, "mount-enter"),
         animation(2, LayoutAnimationType::LAYOUT, "mount-layout"),
         animation(3, LayoutAnimationType::ENTERING, "follow-up-enter")});
    runUI(harness, 2ms, [] {});

    ASSERT_NE(findStart(harness, 2, LayoutAnimationType::ENTERING), nullptr);
    auto layoutStart = findStart(harness, 2, LayoutAnimationType::LAYOUT);
    ASSERT_NE(layoutStart, nullptr);
    ASSERT_NE(findStart(harness, 3, LayoutAnimationType::ENTERING), nullptr);
    EXPECT_TRUE(harness.isActive(layoutStart->tag));
    EXPECT_EQ(startValue(*layoutStart, "targetOriginX"), 80);
    EXPECT_TRUE(harness.platform().hostTree().hasTag(2));
    EXPECT_TRUE(harness.platform().hostTree().hasTag(3));

    runUI(harness, 4ms, [&] { harness.progress(2, finalStyle(*layoutStart)); });
    settleStarts(harness, 6ms);
    const auto &frame = harness.platform().hostTree().getStubView(2).layoutMetrics.frame;
    EXPECT_EQ(frame.origin.x, 80);
    EXPECT_EQ(frame.origin.y, 20);
    EXPECT_EQ(frame.size.width, 120);
    EXPECT_EQ(frame.size.height, 80);
  }
}

TEST(LayoutAnimationScenariosTest, RapidReordersRetargetEveryMountedItem) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto tags = std::vector<Tag>{};
    for (Tag tag = 2; tag < 26; ++tag) {
      tags.push_back(tag);
    }

    renderAt(harness, mode, 0ms, flatList(tags), layoutConfigs(tags));
    auto time = 10ms;
    for (int round = 1; round <= 100; ++round) {
      harness.clearCalls();
      std::rotate(tags.begin(), tags.begin() + (round % tags.size()), tags.end());
      if (round % 3 == 0) {
        std::reverse(tags.begin(), tags.end());
      }
      renderAt(harness, mode, time, flatList(tags, round), layoutConfigs(tags, "rapid-layout"));
      ASSERT_FALSE(harness.starts().empty()) << "round " << round;
      settleStarts(harness, time + 2ms);
      time += 4ms;
    }

    const auto &children = harness.platform().hostTree().getRootStubView().children;
    ASSERT_EQ(children.size(), tags.size());
    for (size_t index = 0; index < tags.size(); ++index) {
      EXPECT_EQ(children[index]->tag, tags[index]);
    }
  }
}

TEST(LayoutAnimationStressTest, MixedListChurnOverlapsEnteringLayoutAndExiting) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto tags = std::vector<Tag>{};
    for (Tag tag = 2; tag < 20; ++tag) {
      tags.push_back(tag);
    }

    renderAt(harness, mode, 0ms, flatList(tags));
    Tag nextTag = 20;
    auto time = 10ms;
    for (int round = 1; round <= 80; ++round) {
      auto removed = std::vector<Tag>(tags.begin(), tags.begin() + 3);
      tags.erase(tags.begin(), tags.begin() + 3);
      auto added = std::vector<Tag>{nextTag++, nextTag++, nextTag++};
      tags.insert(tags.end(), added.begin(), added.end());
      std::rotate(tags.begin(), tags.begin() + (round % tags.size()), tags.end());
      if (round % 4 == 0) {
        std::reverse(tags.begin(), tags.end());
      }

      auto configs = layoutConfigs(tags, "list-layout");
      for (auto tag : removed) {
        configs.push_back(animation(tag, LayoutAnimationType::EXITING, "list-exit"));
      }
      for (auto tag : added) {
        configs.push_back(animation(tag, LayoutAnimationType::ENTERING, "list-enter"));
      }

      harness.clearCalls();
      renderAt(harness, mode, time, flatList(tags, round), std::move(configs));
      ASSERT_GE(harness.starts().size(), added.size() + removed.size()) << "round " << round;

      auto firstStarts = harness.starts();
      runUI(harness, time + 2ms, [&] {
        for (const auto &start : firstStarts) {
          harness.progress(start.tag, finalStyle(start));
        }
      });

      std::reverse(tags.begin(), tags.end());
      renderAt(harness, mode, time + 4ms, flatList(tags, round + 1), layoutConfigs(tags, "list-retarget"));
      settleStarts(harness, time + 6ms);

      const auto &children = harness.platform().hostTree().getRootStubView().children;
      ASSERT_EQ(children.size(), tags.size()) << "round " << round;
      for (size_t index = 0; index < tags.size(); ++index) {
        EXPECT_EQ(children[index]->tag, tags[index]) << "round " << round;
      }
      time += 10ms;
    }
  }
}

TEST(LayoutAnimationStressTest, RecycledTagsReplaceStillExitingInstances) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    renderAt(harness, mode, 0ms, Snapshot{{viewInstance(2, 0, {0, 0, 100, 100})}});

    auto time = 10ms;
    for (uint32_t generation = 1; generation <= 150; ++generation) {
      harness.clearCalls();
      renderAt(harness, mode, time, Snapshot{}, {animation(2, LayoutAnimationType::EXITING, "recycled-exit")});
      ASSERT_NE(findStart(harness, 2, LayoutAnimationType::EXITING), nullptr) << generation;

      harness.clearCalls();
      renderAt(
          harness,
          mode,
          time + 2ms,
          Snapshot{{viewInstance(2, generation, {static_cast<float>(generation % 30), 0, 100, 100})}},
          {animation(2, LayoutAnimationType::ENTERING, "recycled-enter")});

      EXPECT_TRUE(harness.platform().hostTree().hasTag(2)) << generation;
      EXPECT_EQ(harness.platform().hostTree().getRootStubView().children.size(), 1) << generation;
      if (!harness.starts().empty()) {
        settleStarts(harness, time + 4ms);
      }
      time += 7ms;
    }
  }
}

TEST(LayoutAnimationStressTest, InterruptedExitsAreCancelledBeforeBlockedUIWorkRuns) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto time = 0ms;

    for (uint32_t generation = 0; generation < 60; ++generation) {
      harness.timeline().at(time, Lane::JS, [&] { harness.setShouldAnimateExiting(2, false); });
      renderAt(
          harness,
          mode,
          time,
          Snapshot{{viewInstance(2, generation, {0, 0, 200, 120}, {viewInstance(3, generation, {50, 10, 90, 90})})}},
          {animation(3, LayoutAnimationType::EXITING, "blocked-exit")});
      harness.clearCalls();

      auto release = time + 10ms;
      harness.timeline().busyUntil(Lane::UI, release);
      harness.timeline().at(time + 2ms, Lane::JS, [&, generation] {
        harness.render(Snapshot{{viewInstance(2, generation, {0, 0, 200, 120})}});
      });
      harness.timeline().at(time + 3ms, Lane::JS, [&] { harness.render(Snapshot{}); });
      harness.timeline().advanceTo(release - 1ms);
      if (mode != DriverMode::IOS) {
        harness.timeline().at(release, Lane::UI, [&] { harness.frame(); });
      }
      harness.timeline().advanceTo(release);

      EXPECT_TRUE(harness.starts().empty()) << generation;
      EXPECT_FALSE(harness.platform().hostTree().hasTag(2)) << generation;
      EXPECT_FALSE(harness.platform().hostTree().hasTag(3)) << generation;
      time = release + 2ms;
    }
  }
}

TEST(LayoutAnimationStressTest, BusyMainLaneCoalescesRapidLayoutCommits) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto tags = std::vector<Tag>{};
    for (Tag tag = 2; tag < 18; ++tag) {
      tags.push_back(tag);
    }
    renderAt(harness, mode, 0ms, flatList(tags));
    harness.clearCalls();

    harness.timeline().busyUntil(Lane::UI, 250ms);
    for (int round = 1; round <= 160; ++round) {
      std::rotate(tags.begin(), tags.begin() + (round % tags.size()), tags.end());
      if (round % 5 == 0) {
        std::reverse(tags.begin(), tags.end());
      }
      auto snapshot = flatList(tags, round);
      auto configs = layoutConfigs(tags, "busy-layout");
      harness.timeline().at(
          std::chrono::milliseconds{round},
          Lane::JS,
          [&, snapshot = std::move(snapshot), configs = std::move(configs)] { harness.render(snapshot, configs); });
    }

    harness.timeline().advanceTo(249ms);
    if (mode != DriverMode::IOS) {
      harness.timeline().at(250ms, Lane::UI, [&] { harness.frame(); });
    }
    harness.timeline().advanceTo(250ms);
    ASSERT_FALSE(harness.starts().empty());
    settleStarts(harness, 251ms);

    const auto &children = harness.platform().hostTree().getRootStubView().children;
    ASSERT_EQ(children.size(), tags.size());
    for (size_t index = 0; index < tags.size(); ++index) {
      EXPECT_EQ(children[index]->tag, tags[index]);
    }
  }
}

TEST(LayoutAnimationStressTest, SixtyViewBurstsInterruptEnteringWithExiting) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto time = 0ms;

    for (uint32_t burst = 0; burst < 20; ++burst) {
      auto children = std::vector<ViewSpec>{};
      auto entering = std::vector<AnimationConfig>{};
      auto exiting = std::vector<AnimationConfig>{};
      for (Tag index = 0; index < 60; ++index) {
        auto tag = 100 + index;
        children.push_back(viewInstance(
            tag, burst, {static_cast<float>((index % 15) * 6), static_cast<float>((index / 15) * 6), 4, 4}));
        entering.push_back(animation(tag, LayoutAnimationType::ENTERING, "spike-enter"));
        exiting.push_back(animation(tag, LayoutAnimationType::EXITING, "spike-exit"));
      }

      renderAt(harness, mode, time, Snapshot{std::move(children)}, std::move(entering));
      ASSERT_EQ(harness.starts().size(), 60) << burst;
      harness.clearCalls();
      renderAt(harness, mode, time + 2ms, Snapshot{}, std::move(exiting));
      ASSERT_EQ(harness.starts().size(), 60) << burst;
      settleStarts(harness, time + 4ms);

      EXPECT_EQ(harness.platform().hostTree().size(), 1) << burst;
      time += 7ms;
    }
  }
}

TEST(LayoutAnimationStressTest, ManySharedTagsToggleBetweenBoundaries) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    renderAt(harness, mode, 0ms, sharedScreens(true, 24), sharedConfigs(24));

    auto firstActive = true;
    auto time = 10ms;
    for (int round = 1; round <= 40; ++round) {
      firstActive = !firstActive;
      harness.clearCalls();
      renderAt(harness, mode, time, sharedScreens(firstActive, 24, round));

      ASSERT_EQ(harness.starts().size(), 24) << round;
      for (const auto &start : harness.starts()) {
        EXPECT_EQ(start.type, LayoutAnimationType::SHARED_ELEMENT_TRANSITION) << round;
      }
      EXPECT_EQ(syntheticRootTags(harness).size(), 24) << round;
      settleStarts(harness, time + 2ms);
      EXPECT_TRUE(syntheticRootTags(harness).empty()) << round;
      time += 5ms;
    }
  }
}

TEST(LayoutAnimationStressTest, SharedTransitionRetargetsBeforeItSettles) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    renderAt(harness, mode, 0ms, sharedScreens(true, 1), sharedConfigs(1));

    auto firstActive = true;
    auto time = 10ms;
    Tag containerTag = 0;
    for (int round = 1; round <= 80; ++round) {
      firstActive = !firstActive;
      harness.clearCalls();
      renderAt(harness, mode, time, sharedScreens(firstActive, 1, round));
      auto start = onlyStart(harness);
      EXPECT_EQ(start.type, LayoutAnimationType::SHARED_ELEMENT_TRANSITION) << round;
      if (containerTag == 0) {
        containerTag = start.tag;
      }
      EXPECT_EQ(start.tag, containerTag) << round;
      EXPECT_TRUE(harness.platform().hostTree().hasTag(containerTag)) << round;
      time += 2ms;
    }

    settleStarts(harness, time);
    EXPECT_FALSE(harness.platform().hostTree().hasTag(containerTag));
  }
}

TEST(LayoutAnimationStressTest, NestedChurnChangesFlatteningWhileChildrenEnterAndExit) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto visible = std::array<bool, 24>{};
    visible.fill(true);
    auto generations = std::array<uint32_t, 24>{};

    auto snapshot = [&](int round) {
      auto groups = std::vector<ViewSpec>{};
      for (int group = 0; group < 3; ++group) {
        auto children = std::vector<ViewSpec>{};
        for (int index = 0; index < 8; ++index) {
          auto item = group * 8 + index;
          if (!visible[item]) {
            continue;
          }
          children.push_back(viewInstance(
              100 + item,
              generations[item],
              {static_cast<float>((index % 4) * 35 + round % 9),
               static_cast<float>((index / 4) * 35),
               static_cast<float>(28 + round % 4),
               28}));
        }
        groups.push_back(view(
            10 + group, {static_cast<float>(group * 260), 0, 240, 100}, (round + group) % 2 == 0, std::move(children)));
      }
      return Snapshot{std::move(groups)};
    };

    renderAt(harness, mode, 0ms, snapshot(0));
    auto time = 10ms;
    for (int round = 1; round <= 120; ++round) {
      auto changed = std::array<int, 3>{};
      auto configs = std::vector<AnimationConfig>{};
      for (int group = 0; group < 3; ++group) {
        auto item = group * 8 + (round * 3 + group) % 8;
        changed[group] = item;
        if (visible[item]) {
          configs.push_back(animation(100 + item, LayoutAnimationType::EXITING, "nested-exit"));
        } else {
          ++generations[item];
          configs.push_back(animation(100 + item, LayoutAnimationType::ENTERING, "nested-enter"));
        }
        visible[item] = !visible[item];
      }
      for (int item = 0; item < 24; ++item) {
        if (visible[item] && std::find(changed.begin(), changed.end(), item) == changed.end()) {
          configs.push_back(animation(100 + item, LayoutAnimationType::LAYOUT, "nested-layout"));
        }
      }

      harness.clearCalls();
      renderAt(harness, mode, time, snapshot(round), std::move(configs));
      ASSERT_FALSE(harness.starts().empty()) << round;
      settleStarts(harness, time + 2ms);

      for (int item = 0; item < 24; ++item) {
        EXPECT_EQ(harness.platform().hostTree().hasTag(100 + item), visible[item]) << round << ':' << item;
      }
      time += 5ms;
    }
  }
}

} // namespace reanimated::layout_animation::test
