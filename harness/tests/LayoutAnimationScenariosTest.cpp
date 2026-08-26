#include <gtest/gtest.h>

#include <algorithm>
#include <array>
#include <chrono>
#include <optional>
#include <set>
#include <stdexcept>
#include <string>
#include <unordered_map>
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
  auto value = [&](std::initializer_list<const char *> names) -> std::optional<double> {
    for (const auto *name : names) {
      if (auto it = start.values.find(name); it != start.values.end()) {
        return it->second;
      }
    }
    return std::nullopt;
  };
  return {
      .x = value({"targetOriginX", "target.originX", "currentOriginX", "source.originX"}),
      .y = value({"targetOriginY", "target.originY", "currentOriginY", "source.originY"}),
      .width = value({"targetWidth", "target.width", "currentWidth", "source.width"}),
      .height = value({"targetHeight", "target.height", "currentHeight", "source.height"}),
      .opacity = value({"target.opacity"}).value_or(1),
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
      screen(2, {sharedTransitionBoundary(3, firstActive, std::move(first))}),
      screen(4, {sharedTransitionBoundary(5, !firstActive, std::move(second))}),
  }};
}

Snapshot sharedGeometryScreens(bool firstActive) {
  auto source = view(100, {40, 60, 120, 80});
  source.opacity = 0.4;
  auto target = view(200, {680, 500, 240, 180});
  target.opacity = 1;
  return {{
      screen(2, {sharedTransitionBoundary(3, firstActive, {source})}),
      screen(4, {sharedTransitionBoundary(5, !firstActive, {target})}),
  }};
}

Snapshot nestedSharedGeometryScreens(bool firstActive) {
  auto source = view(100, {15, 25, 120, 80});
  source.opacity = 0.4;
  auto target = view(200, {80, 100, 240, 180});
  target.opacity = 1;
  return {{
      screen(2, {sharedTransitionBoundary(3, firstActive, {view(30, {25, 35, 400, 400}, {source})})}),
      screen(4, {sharedTransitionBoundary(5, !firstActive, {view(50, {600, 400, 400, 400}, {target})})}),
  }};
}

void expectHostGeometry(AnimationHarness &harness, Tag tag, Frame expected) {
  const auto &view = harness.platform().hostTree().getStubView(tag);
  const auto &frame = view.layoutMetrics.frame;
  EXPECT_FLOAT_EQ(frame.origin.x, expected.x);
  EXPECT_FLOAT_EQ(frame.origin.y, expected.y);
  EXPECT_FLOAT_EQ(frame.size.width, expected.width);
  EXPECT_FLOAT_EQ(frame.size.height, expected.height);
}

void expectHostAbsoluteGeometry(AnimationHarness &harness, Tag tag, Frame expected) {
  const auto &tree = harness.platform().hostTree();
  const auto &view = tree.getStubView(tag);
  auto frame = view.layoutMetrics.frame;
  auto parentTag = view.parentTag;
  while (parentTag != facebook::react::NO_VIEW_TAG) {
    const auto &parent = tree.getStubView(parentTag);
    frame.origin.x += parent.layoutMetrics.frame.origin.x;
    frame.origin.y += parent.layoutMetrics.frame.origin.y;
    parentTag = parent.parentTag;
  }
  EXPECT_FLOAT_EQ(frame.origin.x, expected.x);
  EXPECT_FLOAT_EQ(frame.origin.y, expected.y);
  EXPECT_FLOAT_EQ(frame.size.width, expected.width);
  EXPECT_FLOAT_EQ(frame.size.height, expected.height);
}

void expectHostFrame(AnimationHarness &harness, Tag tag, Frame expected, float opacity) {
  expectHostGeometry(harness, tag, expected);
  const auto &view = harness.platform().hostTree().getStubView(tag);
  const auto &props = static_cast<const facebook::react::ViewProps &>(*view.props);
  EXPECT_FLOAT_EQ(props.opacity, opacity);
}

float hostOpacity(AnimationHarness &harness, Tag tag) {
  const auto &view = harness.platform().hostTree().getStubView(tag);
  const auto &props = static_cast<const facebook::react::ViewProps &>(*view.props);
  return props.opacity;
}

void expectHostOpacity(AnimationHarness &harness, Tag tag, float opacity) {
  EXPECT_FLOAT_EQ(hostOpacity(harness, tag), opacity);
}

std::vector<Tag> childTags(const facebook::react::StubView &parent) {
  auto tags = std::vector<Tag>{};
  tags.reserve(parent.children.size());
  for (const auto &child : parent.children) {
    tags.push_back(child->tag);
  }
  return tags;
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
    EXPECT_EQ(startValue(start, "currentOriginX"), 0);
    EXPECT_EQ(startValue(start, "currentOriginY"), 0);
    EXPECT_EQ(startValue(start, "currentWidth"), 100);
    EXPECT_EQ(startValue(start, "currentHeight"), 100);
    EXPECT_TRUE(harness.platform().hostTree().hasTag(2));
    expectHostFrame(harness, 2, {0, 0, 100, 100}, 1);

    settleStarts(harness, 20ms);

    EXPECT_FALSE(harness.platform().hostTree().hasTag(2));
    EXPECT_EQ(harness.platform().hostTree().size(), 1);
  }
}

TEST(LayoutAnimationScenariosTest, ExitingViewKeepsItsHostIndexUntilCompletion) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);

    renderAt(
        harness,
        mode,
        0ms,
        Snapshot{{view(2, {0, 0, 80, 80}), view(3, {100, 0, 80, 80})}},
        {animation(2, LayoutAnimationType::EXITING, "indexed-exit")});
    harness.clearCalls();
    const auto frameIndex = harness.platform().mountedFrames().size();

    renderAt(harness, mode, 10ms, Snapshot{{view(3, {100, 0, 80, 80})}});

    ASSERT_NE(findStart(harness, 2, LayoutAnimationType::EXITING), nullptr);
    EXPECT_EQ(childTags(harness.platform().hostTree().getRootStubView()), (std::vector<Tag>{2, 3}));
    const auto &frames = harness.platform().mountedFrames();
    for (auto index = frameIndex; index < frames.size(); ++index) {
      for (const auto &mutation : frames[index].mutations) {
        EXPECT_FALSE(mutation.tag == 2 && (mutation.type == "remove" || mutation.type == "insert"));
      }
    }

    runUI(harness, 20ms, [&] { harness.end(2, true); });
    EXPECT_EQ(childTags(harness.platform().hostTree().getRootStubView()), (std::vector<Tag>{3}));
  }
}

TEST(LayoutAnimationScenariosTest, ImmediateExitCompletionCanReenterTheStartCallback) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    harness.completeAnimationsOnStart();

    renderAt(harness, mode, 0ms, Snapshot{{view(2, {0, 0, 100, 100})}});
    harness.clearCalls();
    renderAt(harness, mode, 10ms, Snapshot{}, {animation(2, LayoutAnimationType::EXITING, "reduced-motion")});
    runUI(harness, 20ms, [] {});

    const auto &start = onlyStart(harness);
    EXPECT_EQ(start.tag, 2);
    EXPECT_EQ(start.type, LayoutAnimationType::EXITING);
    EXPECT_FALSE(harness.isActive(2));
    EXPECT_FALSE(harness.platform().hostTree().hasTag(2));
  }
}

TEST(LayoutAnimationScenariosTest, RemovingAModalScreenSkipsDescendantExitAnimations) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);

    renderAt(harness, mode, 0ms, Snapshot{{modalScreen(2, {view(3, {20, 30, 100, 100})})}});
    harness.clearCalls();
    renderAt(harness, mode, 10ms, Snapshot{}, {animation(3, LayoutAnimationType::EXITING, "modal-child-exit")});

    EXPECT_TRUE(harness.starts().empty());
    EXPECT_FALSE(harness.platform().hostTree().hasTag(2));
    EXPECT_FALSE(harness.platform().hostTree().hasTag(3));
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
    expectHostFrame(harness, 2, {0, 0, 100, 100}, 1);

    runUI(harness, 20ms, [&] { harness.progress(2, {.x = 40, .y = 8, .width = 108, .height = 92, .opacity = 1}); });
    expectHostFrame(harness, 2, {40, 8, 108, 92}, 1);

    harness.clearCalls();
    renderAt(
        harness,
        mode,
        30ms,
        Snapshot{{view(2, {200, 40, 140, 60})}},
        {animation(2, LayoutAnimationType::LAYOUT, "retarget")});

    auto second = onlyStart(harness);
    EXPECT_EQ(second.type, LayoutAnimationType::LAYOUT);
    EXPECT_EQ(second.config, "retarget");
    EXPECT_EQ(startValue(second, "currentOriginX"), 40);
    EXPECT_EQ(startValue(second, "targetOriginX"), 200);
    expectHostFrame(harness, 2, {40, 8, 108, 92}, 1);

    settleStarts(harness, 40ms);
    const auto &frame = harness.platform().hostTree().getStubView(2).layoutMetrics.frame;
    EXPECT_EQ(frame.origin.x, 200);
    EXPECT_EQ(frame.origin.y, 40);
    EXPECT_EQ(frame.size.width, 140);
    EXPECT_EQ(frame.size.height, 60);
  }
}

#ifdef HARNESS_PROXY_REGISTRY
TEST(LayoutAnimationScenariosTest, ConfigRemovalRetargetsWithTheCapturedLayoutConfig) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);

    renderAt(harness, mode, 0ms, Snapshot{{view(2, {0, 0, 100, 100})}});
    renderAt(
        harness,
        mode,
        10ms,
        Snapshot{{view(2, {100, 0, 100, 100})}},
        {animation(2, LayoutAnimationType::LAYOUT, "captured")});
    runUI(harness, 20ms, [&] { harness.progress(2, {.x = 40, .y = 0, .width = 100, .height = 100}); });

    harness.clearCalls();
    renderAt(
        harness,
        mode,
        30ms,
        Snapshot{{view(2, {200, 0, 100, 100})}},
        {removeAnimation(2, LayoutAnimationType::LAYOUT)});

    const auto &start = onlyStart(harness);
    EXPECT_EQ(start.type, LayoutAnimationType::LAYOUT);
    EXPECT_EQ(start.config, "captured");
    EXPECT_EQ(startValue(start, "currentOriginX"), 40);
    EXPECT_EQ(startValue(start, "targetOriginX"), 200);
    settleStarts(harness, 40ms);
    EXPECT_EQ(harness.platform().hostTree().getStubView(2).layoutMetrics.frame.origin.x, 200);
  }
}
#endif

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

TEST(LayoutAnimationScenariosTest, NestedExitingGrandchildKeepsAllDeletedAncestorsAlive) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);

    renderAt(
        harness,
        mode,
        0ms,
        Snapshot{{view(2, {0, 0, 240, 160}, {view(3, {10, 10, 200, 120}, {view(4, {20, 20, 80, 80})})})}});
    harness.clearCalls();
    renderAt(harness, mode, 10ms, Snapshot{}, {animation(4, LayoutAnimationType::EXITING, "deep-exit")});

    const auto *start = findStart(harness, 4, LayoutAnimationType::EXITING);
    ASSERT_NE(start, nullptr);
    EXPECT_EQ(start->config, "deep-exit");
    const auto &tree = harness.platform().hostTree();
    ASSERT_TRUE(tree.hasTag(2));
    ASSERT_TRUE(tree.hasTag(3));
    ASSERT_TRUE(tree.hasTag(4));
    EXPECT_EQ(tree.getStubView(3).parentTag, 2);
    EXPECT_EQ(tree.getStubView(4).parentTag, 3);

    runUI(harness, 20ms, [&] { harness.end(4, true); });
    EXPECT_FALSE(tree.hasTag(2));
    EXPECT_FALSE(tree.hasTag(3));
    EXPECT_FALSE(tree.hasTag(4));
    EXPECT_EQ(tree.size(), 1);
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
    EXPECT_EQ(childTags(harness.platform().hostTree().getStubView(2)), (std::vector<Tag>{3, 4}));

    runUI(harness, 20ms, [&] { harness.end(3, true); });
    EXPECT_FALSE(harness.platform().hostTree().hasTag(3));
    EXPECT_TRUE(harness.platform().hostTree().hasTag(4));
    EXPECT_TRUE(harness.platform().hostTree().hasTag(2));
    EXPECT_EQ(childTags(harness.platform().hostTree().getStubView(2)), (std::vector<Tag>{4}));

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
    expectHostFrame(harness, 2, {0, 0, 80, 80}, 1);
    expectHostFrame(harness, 3, {100, 0, 80, 80}, 1);
    expectHostFrame(harness, 4, {0, 0, 90, 90}, 0);

    settleStarts(harness, 20ms);

    EXPECT_TRUE(harness.platform().hostTree().hasTag(2));
    EXPECT_FALSE(harness.platform().hostTree().hasTag(3));
    EXPECT_TRUE(harness.platform().hostTree().hasTag(4));
    EXPECT_EQ(harness.platform().hostTree().size(), 3);
    expectHostFrame(harness, 2, {120, 20, 100, 60}, 1);
    expectHostFrame(harness, 4, {0, 0, 90, 90}, 1);
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

    const auto *start = findStart(harness, 3, LayoutAnimationType::EXITING);
    ASSERT_NE(start, nullptr);
    EXPECT_EQ(start->config, "nested-override");
    EXPECT_TRUE(harness.platform().hostTree().hasTag(2));
    EXPECT_TRUE(harness.platform().hostTree().hasTag(3));
    EXPECT_EQ(harness.platform().hostTree().getStubView(3).parentTag, 2);
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
    EXPECT_EQ(start.config, "move");
    EXPECT_EQ(startValue(start, "currentOriginX"), 0);
    EXPECT_EQ(startValue(start, "currentOriginY"), 0);
    EXPECT_EQ(startValue(start, "currentWidth"), 200);
    EXPECT_EQ(startValue(start, "currentHeight"), 100);
    EXPECT_EQ(startValue(start, "targetOriginX"), 20);
    EXPECT_EQ(startValue(start, "targetOriginY"), 20);
    EXPECT_EQ(startValue(start, "targetWidth"), 100);
    EXPECT_EQ(startValue(start, "targetHeight"), 100);
    EXPECT_FALSE(harness.platform().hostTree().hasTag(3));
    EXPECT_EQ(harness.platform().hostTree().getStubView(4).parentTag, 2);
    expectHostGeometry(harness, 4, {0, 0, 200, 100});

    settleStarts(harness, 20ms);
    EXPECT_EQ(harness.platform().hostTree().getStubView(4).parentTag, 2);
    expectHostGeometry(harness, 4, {20, 20, 100, 100});
  }
}

TEST(LayoutAnimationScenariosTest, FlatteningAParentWhileRemovingAChildKeepsHostOrderConsistent) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto initial = Snapshot{{
        view(8, {0, 300, 20, 20}),
        view(2, {20, 20, 200, 200}, false, {view(3, {0, 0, 100, 100}, {view(4, {0, 0, 50, 50})})}),
        view(9, {300, 300, 20, 20}),
    }};
    auto flattened = Snapshot{{
        view(8, {0, 300, 20, 20}),
        view(2, {20, 20, 200, 200}, true, {view(3, {0, 0, 100, 100})}),
        view(9, {300, 300, 20, 20}),
    }};

    renderAt(harness, mode, 0ms, initial, {animation(3, LayoutAnimationType::EXITING, "armed-exit")});
    harness.clearCalls();
    renderAt(harness, mode, 10ms, flattened);

    EXPECT_FALSE(harness.platform().hostTree().hasTag(2));
    EXPECT_TRUE(harness.platform().hostTree().hasTag(3));
    EXPECT_FALSE(harness.platform().hostTree().hasTag(4));
    EXPECT_EQ(harness.platform().hostTree().getStubView(3).parentTag, 1);
    EXPECT_EQ(childTags(harness.platform().hostTree().getRootStubView()), (std::vector<Tag>{8, 3, 9}));
    expectHostGeometry(harness, 3, {20, 20, 100, 100});
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

    const auto &start = onlyStart(harness);
    EXPECT_EQ(start.tag, 2);
    EXPECT_EQ(start.type, LayoutAnimationType::ENTERING);
    EXPECT_EQ(start.config, "enter-again");
    EXPECT_TRUE(harness.platform().hostTree().hasTag(2));
    EXPECT_EQ(harness.platform().hostTree().getRootStubView().children.size(), 1);
    expectHostFrame(harness, 2, {50, 0, 100, 100}, 0);
    settleStarts(harness, 30ms);
    EXPECT_TRUE(harness.platform().hostTree().hasTag(2));
    EXPECT_EQ(harness.platform().hostTree().getRootStubView().children.size(), 1);
    expectHostFrame(harness, 2, {50, 0, 100, 100}, 1);
  }
}

TEST(LayoutAnimationScenariosTest, RecreatingAWaitingSubviewFlushesItsWithheldRemoval) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto initial = Snapshot{{view(2, {0, 0, 220, 100}, {viewInstance(3, 0, {0, 0, 100, 100})})}};

    renderAt(harness, mode, 0ms, initial);
    harness.clearCalls();
    renderAt(harness, mode, 10ms, Snapshot{}, {animation(2, LayoutAnimationType::EXITING, "exit")});
    ASSERT_NE(findStart(harness, 2, LayoutAnimationType::EXITING), nullptr);
    ASSERT_TRUE(harness.platform().hostTree().hasTag(3));

    harness.clearCalls();
    renderAt(harness, mode, 20ms, Snapshot{{viewInstance(3, 1, {40, 50, 120, 80})}});

    const auto &tree = harness.platform().hostTree();
    ASSERT_TRUE(tree.hasTag(3));
    EXPECT_EQ(tree.getStubView(3).parentTag, 1);
    expectHostGeometry(harness, 3, {40, 50, 120, 80});
    ASSERT_TRUE(tree.hasTag(2));
    EXPECT_TRUE(tree.getStubView(2).children.empty());

    runUI(harness, 30ms, [&] { harness.end(2, true); });
    EXPECT_FALSE(tree.hasTag(2));
    EXPECT_TRUE(tree.hasTag(3));
    EXPECT_EQ(tree.getRootStubView().children.size(), 1);
  }
}

TEST(LayoutAnimationScenariosTest, RecreatingASettledExitBeforeCleanupReplacesTheDeadNode) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);

    renderAt(harness, mode, 0ms, Snapshot{{viewInstance(2, 0, {0, 0, 100, 100})}});
    harness.clearCalls();
    renderAt(harness, mode, 10ms, Snapshot{}, {animation(2, LayoutAnimationType::EXITING, "exit")});
    ASSERT_NE(findStart(harness, 2, LayoutAnimationType::EXITING), nullptr);

    auto &timeline = harness.timeline();
    timeline.at(20ms, Lane::UI, [&] { harness.end(2, true); });
    timeline.advanceTo(20ms);
    harness.clearCalls();
    renderAt(
        harness,
        mode,
        21ms,
        Snapshot{{viewInstance(2, 1, {50, 60, 120, 80})}},
        {animation(2, LayoutAnimationType::ENTERING, "replace-dead")});

    const auto &tree = harness.platform().hostTree();
    const auto &start = onlyStart(harness);
    EXPECT_EQ(start.tag, 2);
    EXPECT_EQ(start.type, LayoutAnimationType::ENTERING);
    EXPECT_EQ(start.config, "replace-dead");
    ASSERT_TRUE(tree.hasTag(2));
    EXPECT_EQ(tree.getStubView(2).parentTag, 1);
    EXPECT_EQ(tree.getRootStubView().children.size(), 1);
    expectHostFrame(harness, 2, {50, 60, 120, 80}, 0);
    settleStarts(harness, 30ms);
    expectHostFrame(harness, 2, {50, 60, 120, 80}, 1);
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
    expectHostFrame(harness, 2, {10, 20, 100, 80}, 0);

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
    expectHostOpacity(harness, 2, 1);

    runUI(harness, 4ms, [&] { harness.progress(2, {.opacity = 0.2}); });
    expectHostOpacity(harness, 2, 1);
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
    expectHostFrame(harness, 2, {10, 20, 100, 80}, 0);

    runUI(harness, 10ms, [&] { harness.progress(2, {.opacity = 0.35}); });
    const auto &progressed = harness.platform().hostTree().getStubView(2);
    const auto &progressedProps = static_cast<const facebook::react::ViewProps &>(*progressed.props);
    EXPECT_FLOAT_EQ(progressedProps.opacity, 0.35);

    settleStarts(harness, 20ms);
    const auto &settled = harness.platform().hostTree().getStubView(2);
    const auto &settledProps = static_cast<const facebook::react::ViewProps &>(*settled.props);
    EXPECT_EQ(settledProps.opacity, 1);

    runUI(harness, 30ms, [&] { harness.progress(2, {.opacity = 0.1}); });
    expectHostOpacity(harness, 2, 1);
  }
}

TEST(LayoutAnimationScenariosTest, DisplayNoneEmitsPlatformSpecificHostMutationsAcrossRepeatedToggles) {
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
      renderAt(harness, mode, time, Snapshot{{round % 2 == 0 ? hidden : visible}});
      EXPECT_TRUE(harness.starts().empty()) << round;
      if (round % 2 == 0 && mode == DriverMode::IOS) {
        EXPECT_FALSE(harness.platform().hostTree().hasTag(2)) << round;
      } else {
        ASSERT_TRUE(harness.platform().hostTree().hasTag(2)) << round;
        expectHostGeometry(harness, 2, round % 2 == 0 ? Frame{} : Frame{0, 0, 100, 100});
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

    const auto &start = onlyStart(harness);
    EXPECT_EQ(start.type, LayoutAnimationType::SHARED_ELEMENT_TRANSITION);
    EXPECT_EQ(start.config, "hero");
    EXPECT_NE(start.tag, 3);
    EXPECT_NE(start.tag, 5);
    EXPECT_EQ(startValue(start, "source.originX"), 0);
    EXPECT_EQ(startValue(start, "source.originY"), 0);
    EXPECT_EQ(startValue(start, "source.width"), 80);
    EXPECT_EQ(startValue(start, "source.height"), 80);
    EXPECT_EQ(startValue(start, "target.originX"), 200);
    EXPECT_EQ(startValue(start, "target.originY"), 100);
    EXPECT_EQ(startValue(start, "target.width"), 120);
    EXPECT_EQ(startValue(start, "target.height"), 120);
    EXPECT_TRUE(harness.platform().hostTree().hasTag(start.tag));
    expectHostFrame(harness, 3, {0, 0, 80, 80}, 0);
    expectHostFrame(harness, 5, {200, 100, 120, 120}, 0);
    expectHostFrame(harness, start.tag, {0, 0, 80, 80}, 1);

    auto containerTag = start.tag;
    settleStarts(harness, 20ms);
    EXPECT_FALSE(harness.platform().hostTree().hasTag(containerTag));
    expectHostFrame(harness, 3, {0, 0, 80, 80}, 0);
    expectHostFrame(harness, 5, {200, 100, 120, 120}, 1);
    EXPECT_TRUE(syntheticRootTags(harness).empty());
  }
}

TEST(LayoutAnimationScenariosTest, SharedSourceUpdateDuringBoundaryFlipStaysHidden) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto configs = std::vector{
        animation(3, LayoutAnimationType::SHARED_ELEMENT_TRANSITION_NATIVE_ID, "hero", "hero"),
        animation(5, LayoutAnimationType::SHARED_ELEMENT_TRANSITION_NATIVE_ID, "hero", "hero"),
    };
    renderAt(
        harness,
        mode,
        0ms,
        Snapshot{{
            sharedTransitionBoundary(2, true, {view(3, {0, 0, 80, 80})}),
            sharedTransitionBoundary(4, false, {view(5, {200, 100, 120, 120})}),
        }},
        configs);
    harness.clearCalls();

    renderAt(
        harness,
        mode,
        10ms,
        Snapshot{{
            sharedTransitionBoundary(2, false, {view(3, {10, 0, 80, 80})}),
            sharedTransitionBoundary(4, true, {view(5, {200, 100, 120, 120})}),
        }});

    const auto &start = onlyStart(harness);
    EXPECT_EQ(start.type, LayoutAnimationType::SHARED_ELEMENT_TRANSITION);
    EXPECT_EQ(start.config, "hero");
    expectHostFrame(harness, start.tag, {0, 0, 80, 80}, 1);
    expectHostFrame(harness, 3, {10, 0, 80, 80}, 0);
    expectHostFrame(harness, 5, {200, 100, 120, 120}, 0);
  }
}

TEST(LayoutAnimationScenariosTest, SharedTargetUpdateDuringBoundaryFlipStaysHidden) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto configs = std::vector{
        animation(3, LayoutAnimationType::SHARED_ELEMENT_TRANSITION_NATIVE_ID, "hero", "hero"),
        animation(5, LayoutAnimationType::SHARED_ELEMENT_TRANSITION_NATIVE_ID, "hero", "hero"),
    };
    renderAt(
        harness,
        mode,
        0ms,
        Snapshot{{
            sharedTransitionBoundary(2, true, {view(3, {0, 0, 80, 80})}),
            sharedTransitionBoundary(4, false, {view(5, {200, 100, 120, 120})}),
        }},
        configs);
    harness.clearCalls();

    renderAt(
        harness,
        mode,
        10ms,
        Snapshot{{
            sharedTransitionBoundary(2, false, {view(3, {0, 0, 80, 80})}),
            sharedTransitionBoundary(4, true, {view(5, {210, 110, 120, 120})}),
        }});

    const auto &start = onlyStart(harness);
    EXPECT_EQ(start.type, LayoutAnimationType::SHARED_ELEMENT_TRANSITION);
    expectHostFrame(harness, start.tag, {0, 0, 80, 80}, 1);
    expectHostFrame(harness, 3, {0, 0, 80, 80}, 0);
    expectHostFrame(harness, 5, {210, 110, 120, 120}, 0);
  }
}

TEST(LayoutAnimationScenariosTest, SharedContainerTracksGeometryAndOpacityAcrossProgressFrames) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    renderAt(harness, mode, 0ms, sharedGeometryScreens(true), sharedConfigs(1));
    harness.clearCalls();
    renderAt(harness, mode, 10ms, sharedGeometryScreens(false));

    const auto &start = onlyStart(harness);
    ASSERT_EQ(start.type, LayoutAnimationType::SHARED_ELEMENT_TRANSITION);
    EXPECT_EQ(start.config, "shared-0");
    EXPECT_EQ(startValue(start, "source.originX"), 40);
    EXPECT_EQ(startValue(start, "source.originY"), 60);
    EXPECT_EQ(startValue(start, "source.width"), 120);
    EXPECT_EQ(startValue(start, "source.height"), 80);
    EXPECT_EQ(startValue(start, "target.originX"), 680);
    EXPECT_EQ(startValue(start, "target.originY"), 500);
    EXPECT_EQ(startValue(start, "target.width"), 240);
    EXPECT_EQ(startValue(start, "target.height"), 180);
    const auto containerTag = start.tag;
    expectHostFrame(harness, containerTag, {40, 60, 120, 80}, 0.4);
    expectHostOpacity(harness, 100, 0);
    expectHostOpacity(harness, 200, 0);

    struct ProgressFrame {
      Frame frame;
      float opacity;
    };
    const auto progressFrames = std::array{
        ProgressFrame{{200, 170, 150, 105}, 0.55},
        ProgressFrame{{360, 280, 180, 130}, 0.7},
        ProgressFrame{{520, 390, 210, 155}, 0.85},
        ProgressFrame{{680, 500, 240, 180}, 1},
    };

    auto time = 20ms;
    for (const auto &progressFrame : progressFrames) {
      runUI(harness, time, [&] {
        harness.progress(
            containerTag,
            {
                .x = progressFrame.frame.x,
                .y = progressFrame.frame.y,
                .width = progressFrame.frame.width,
                .height = progressFrame.frame.height,
                .opacity = progressFrame.opacity,
            });
      });
      expectHostFrame(harness, containerTag, progressFrame.frame, progressFrame.opacity);
      expectHostOpacity(harness, 100, 0);
      expectHostOpacity(harness, 200, 0);
      time += 10ms;
    }

    runUI(harness, time, [&] { harness.end(containerTag, false); });
    EXPECT_FALSE(harness.platform().hostTree().hasTag(containerTag));
    expectHostFrame(harness, 100, {40, 60, 120, 80}, 0);
    expectHostFrame(harness, 200, {680, 500, 240, 180}, 1);
    EXPECT_TRUE(syntheticRootTags(harness).empty());
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
  expectHostFrame(harness, containers[0], {0, 0, 24, 24}, 1);
  expectHostOpacity(harness, 100, 0);
  expectHostOpacity(harness, 200, 0);

  runUI(harness, 20ms, [&] { harness.transitionProgress(4, 0.5, false, false); });
  expectHostFrame(harness, containers[0], {150, 100, 26, 26}, 1);
  expectHostOpacity(harness, 100, 0);
  expectHostOpacity(harness, 200, 0);

  runUI(harness, 30ms, [&] { harness.transitionProgress(4, 1, false, false); });
  EXPECT_FALSE(harness.platform().hostTree().hasTag(containers[0]));
  expectHostFrame(harness, 100, {0, 0, 24, 24}, 0);
  expectHostFrame(harness, 200, {300, 200, 28, 28}, 1);
  EXPECT_TRUE(syntheticRootTags(harness).empty());
}

TEST(LayoutAnimationScenariosTest, InteractiveSharedTransitionUsesAbsoluteGeometryAtEveryProgress) {
  auto harness = AnimationHarness(DriverMode::IOS);
  renderAt(harness, DriverMode::IOS, 0ms, nestedSharedGeometryScreens(true), sharedConfigs(1));

  runUI(harness, 10ms, [&] { harness.transitionProgress(4, 0, false, false); });
  const auto containers = syntheticRootTags(harness);
  ASSERT_EQ(containers.size(), 1);
  const auto containerTag = containers[0];
  expectHostAbsoluteGeometry(harness, containerTag, {40, 60, 120, 80});
  expectHostOpacity(harness, 100, 0);
  expectHostOpacity(harness, 200, 0);

  struct ProgressFrame {
    double progress;
    Frame frame;
  };
  const auto progressFrames = std::array{
      ProgressFrame{0.25, {200, 170, 150, 105}},
      ProgressFrame{0.5, {360, 280, 180, 130}},
      ProgressFrame{0.75, {520, 390, 210, 155}},
  };

  auto time = 20ms;
  for (const auto &progressFrame : progressFrames) {
    runUI(harness, time, [&] { harness.transitionProgress(4, progressFrame.progress, false, false); });
    expectHostAbsoluteGeometry(harness, containerTag, progressFrame.frame);
    expectHostOpacity(harness, 100, 0);
    expectHostOpacity(harness, 200, 0);
    time += 10ms;
  }

  runUI(harness, time, [&] { harness.transitionProgress(4, 1, false, false); });
  EXPECT_FALSE(harness.platform().hostTree().hasTag(containerTag));
  expectHostAbsoluteGeometry(harness, 200, {680, 500, 240, 180});
  expectHostOpacity(harness, 100, 0);
  expectHostOpacity(harness, 200, 1);
  EXPECT_TRUE(syntheticRootTags(harness).empty());
}

TEST(LayoutAnimationScenariosTest, CancellingInteractiveSharedTransitionRestoresBothSides) {
  auto harness = AnimationHarness(DriverMode::IOS);
  renderAt(harness, DriverMode::IOS, 0ms, sharedScreens(true, 1), sharedConfigs(1));

  runUI(harness, 10ms, [&] { harness.transitionProgress(4, 0.25, false, false); });
  auto containers = syntheticRootTags(harness);
  ASSERT_EQ(containers.size(), 1);

  runUI(harness, 20ms, [&] { harness.cancelTransition(2); });
  EXPECT_FALSE(harness.platform().hostTree().hasTag(containers[0]));
  expectHostFrame(harness, 100, {0, 0, 24, 24}, 1);
  expectHostFrame(harness, 200, {300, 200, 28, 28}, 1);
  EXPECT_TRUE(syntheticRootTags(harness).empty());
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

    ASSERT_NE(findStart(harness, 2, LayoutAnimationType::ENTERING), nullptr);
    auto layoutStart = findStart(harness, 2, LayoutAnimationType::LAYOUT);
    ASSERT_NE(layoutStart, nullptr);
    ASSERT_NE(findStart(harness, 3, LayoutAnimationType::ENTERING), nullptr);
    EXPECT_TRUE(harness.isActive(layoutStart->tag));
    EXPECT_EQ(startValue(*layoutStart, "targetOriginX"), 80);
    EXPECT_TRUE(harness.platform().hostTree().hasTag(2));
    if (mode == DriverMode::IOS) {
      EXPECT_TRUE(harness.platform().hostTree().hasTag(3));
    } else {
      EXPECT_FALSE(harness.platform().hostTree().hasTag(3));
    }

    runUI(harness, 2ms, [] {});
    EXPECT_TRUE(harness.platform().hostTree().hasTag(3));
    expectHostOpacity(harness, 3, 0);

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
      ASSERT_EQ(harness.starts().size(), tags.size()) << "round " << round;
      auto startedTags = std::set<Tag>{};
      for (const auto &start : harness.starts()) {
        EXPECT_EQ(start.type, LayoutAnimationType::LAYOUT) << "round " << round;
        EXPECT_EQ(start.config, "rapid-layout") << "round " << round;
        startedTags.insert(start.tag);
      }
      EXPECT_EQ(startedTags, std::set<Tag>(tags.begin(), tags.end())) << "round " << round;
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
      for (auto tag : removed) {
        ASSERT_NE(findStart(harness, tag, LayoutAnimationType::EXITING), nullptr) << "round " << round;
        EXPECT_TRUE(harness.platform().hostTree().hasTag(tag)) << "round " << round;
      }
      for (auto tag : added) {
        ASSERT_NE(findStart(harness, tag, LayoutAnimationType::ENTERING), nullptr) << "round " << round;
        expectHostOpacity(harness, tag, 0);
      }

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

      const auto *start = findStart(harness, 2, LayoutAnimationType::ENTERING);
      ASSERT_NE(start, nullptr) << generation;
      EXPECT_EQ(start->config, "recycled-enter") << generation;
      EXPECT_TRUE(harness.platform().hostTree().hasTag(2)) << generation;
      EXPECT_EQ(harness.platform().hostTree().getRootStubView().children.size(), 1) << generation;
      expectHostFrame(harness, 2, {static_cast<float>(generation % 30), 0, 100, 100}, 0);
      settleStarts(harness, time + 4ms);
      expectHostFrame(harness, 2, {static_cast<float>(generation % 30), 0, 100, 100}, 1);
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

#if defined(HARNESS_PROXY_REGISTRY) && defined(HARNESS_PLATFORM_ANDROID)
TEST(LayoutAnimationStressTest, UICleanupCannotOvertakeAPausedJSMountSchedule) {
  auto harness = AnimationHarness(DriverMode::AndroidPush);
  auto tags = std::vector<Tag>{};
  for (Tag tag = 10; tag < 22; ++tag) {
    tags.push_back(tag);
  }
  renderAt(harness, DriverMode::AndroidPush, 0ms, flatList(tags));

  tags.erase(tags.begin(), tags.begin() + 2);
  tags.push_back(22);
  tags.push_back(23);
  renderAt(
      harness,
      DriverMode::AndroidPush,
      10ms,
      flatList(tags),
      {animation(10, LayoutAnimationType::EXITING, "short-exit"),
       animation(11, LayoutAnimationType::EXITING, "short-exit")});
  ASSERT_NE(findStart(harness, 10, LayoutAnimationType::EXITING), nullptr);
  ASSERT_NE(findStart(harness, 11, LayoutAnimationType::EXITING), nullptr);
  harness.clearCalls();

  tags.erase(tags.begin(), tags.begin() + 2);
  tags.push_back(24);
  tags.push_back(25);
  harness.timeline().at(20ms, Lane::JS, [&] {
    harness.platform().pauseNextAndroidMountSchedule();
    harness.render(
        flatList(tags),
        {animation(12, LayoutAnimationType::EXITING, "short-exit"),
         animation(13, LayoutAnimationType::EXITING, "short-exit")});
  });
  harness.timeline().advanceTo(20ms);

  harness.timeline().at(21ms, Lane::UI, [&] {
    harness.end(10, true);
    harness.end(11, true);
    harness.frame();
  });
  harness.timeline().at(21ms, Lane::JS, [&] { harness.platform().resumeAndroidMountSchedule(); });
  harness.timeline().advanceTo(21ms);

  harness.timeline().at(23ms, Lane::UI, [&] { harness.frame(); });
  harness.timeline().advanceTo(23ms);

  EXPECT_FALSE(harness.platform().hostTree().hasTag(10));
  EXPECT_FALSE(harness.platform().hostTree().hasTag(11));
  for (auto tag : tags) {
    EXPECT_TRUE(harness.platform().hostTree().hasTag(tag));
  }
}
#endif

TEST(LayoutAnimationStressTest, BusyMainLanePreservesPlatformSpecificPullAccumulation) {
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
    const auto expectedStartCount = mode == DriverMode::AndroidPush ? tags.size() * 160 : tags.size();
    ASSERT_EQ(harness.starts().size(), expectedStartCount);
    for (const auto &start : harness.starts()) {
      EXPECT_EQ(start.type, LayoutAnimationType::LAYOUT);
      EXPECT_EQ(start.config, "busy-layout");
    }

    auto latestStarts = std::unordered_map<Tag, AnimationStart>{};
    for (auto start = harness.starts().rbegin(); start != harness.starts().rend(); ++start) {
      latestStarts.try_emplace(start->tag, *start);
    }
    ASSERT_EQ(latestStarts.size(), tags.size());
    for (const auto &[tag, start] : latestStarts) {
      const auto index = std::find(tags.begin(), tags.end(), tag) - tags.begin();
      ASSERT_LT(index, tags.size());
      EXPECT_EQ(startValue(start, "targetOriginX"), (index % 4) * 40);
      EXPECT_EQ(startValue(start, "targetOriginY"), (index / 4) * 40);
      EXPECT_EQ(startValue(start, "targetWidth"), 31);
    }
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
      auto startedTags = std::set<Tag>{};
      for (const auto &start : harness.starts()) {
        EXPECT_EQ(start.type, LayoutAnimationType::ENTERING) << burst;
        EXPECT_EQ(start.config, "spike-enter") << burst;
        startedTags.insert(start.tag);
        expectHostOpacity(harness, start.tag, 0);
      }
      EXPECT_EQ(startedTags.size(), 60) << burst;
      harness.clearCalls();
      renderAt(harness, mode, time + 2ms, Snapshot{}, std::move(exiting));
      ASSERT_EQ(harness.starts().size(), 60) << burst;
      startedTags.clear();
      for (const auto &start : harness.starts()) {
        EXPECT_EQ(start.type, LayoutAnimationType::EXITING) << burst;
        EXPECT_EQ(start.config, "spike-exit") << burst;
        startedTags.insert(start.tag);
        EXPECT_TRUE(harness.platform().hostTree().hasTag(start.tag)) << burst;
      }
      EXPECT_EQ(startedTags.size(), 60) << burst;
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
      auto configs = std::set<std::string>{};
      for (const auto &start : harness.starts()) {
        EXPECT_EQ(start.type, LayoutAnimationType::SHARED_ELEMENT_TRANSITION) << round;
        configs.insert(start.config);
      }
      for (int index = 0; index < 24; ++index) {
        EXPECT_TRUE(configs.contains("shared-" + std::to_string(index))) << round;
        ASSERT_FLOAT_EQ(hostOpacity(harness, 100 + index), 0) << round;
        ASSERT_FLOAT_EQ(hostOpacity(harness, 200 + index), 0) << round;
      }
      EXPECT_EQ(syntheticRootTags(harness).size(), 24) << round;
      settleStarts(harness, time + 2ms);
      EXPECT_TRUE(syntheticRootTags(harness).empty()) << round;
      for (int index = 0; index < 24; ++index) {
        ASSERT_FLOAT_EQ(hostOpacity(harness, firstActive ? 200 + index : 100 + index), 0) << round;
        ASSERT_FLOAT_EQ(hostOpacity(harness, firstActive ? 100 + index : 200 + index), 1) << round;
      }
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
    std::optional<Frame> mountedFrame;
    for (int round = 1; round <= 80; ++round) {
      firstActive = !firstActive;
      harness.clearCalls();
      renderAt(harness, mode, time, sharedScreens(firstActive, 1, round));
      auto start = onlyStart(harness);
      EXPECT_EQ(start.type, LayoutAnimationType::SHARED_ELEMENT_TRANSITION) << round;
      EXPECT_EQ(start.config, "shared-0") << round;
      if (mountedFrame) {
        EXPECT_FLOAT_EQ(startValue(start, "source.originX"), mountedFrame->x) << round;
        EXPECT_FLOAT_EQ(startValue(start, "source.originY"), mountedFrame->y) << round;
        EXPECT_FLOAT_EQ(startValue(start, "source.width"), mountedFrame->width) << round;
        EXPECT_FLOAT_EQ(startValue(start, "source.height"), mountedFrame->height) << round;
      }
      if (containerTag == 0) {
        containerTag = start.tag;
      }
      EXPECT_EQ(start.tag, containerTag) << round;
      EXPECT_TRUE(harness.platform().hostTree().hasTag(containerTag)) << round;
      EXPECT_EQ(syntheticRootTags(harness), (std::vector<Tag>{containerTag})) << round;
      ASSERT_FLOAT_EQ(hostOpacity(harness, 100), 0) << round;
      ASSERT_FLOAT_EQ(hostOpacity(harness, 200), 0) << round;

      mountedFrame = {
          static_cast<float>((startValue(start, "source.originX") + startValue(start, "target.originX")) / 2),
          static_cast<float>((startValue(start, "source.originY") + startValue(start, "target.originY")) / 2),
          static_cast<float>((startValue(start, "source.width") + startValue(start, "target.width")) / 2),
          static_cast<float>((startValue(start, "source.height") + startValue(start, "target.height")) / 2),
      };
      runUI(harness, time + 2ms, [&] {
        harness.progress(
            containerTag,
            {.x = mountedFrame->x,
             .y = mountedFrame->y,
             .width = mountedFrame->width,
             .height = mountedFrame->height,
             .opacity = 1});
      });
      expectHostFrame(harness, containerTag, *mountedFrame, 1);
      time += 5ms;
    }

    settleStarts(harness, time);
    EXPECT_FALSE(harness.platform().hostTree().hasTag(containerTag));
    EXPECT_TRUE(syntheticRootTags(harness).empty());
    expectHostOpacity(harness, firstActive ? 200 : 100, 0);
    expectHostOpacity(harness, firstActive ? 100 : 200, 1);
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
      auto wasVisible = std::array<bool, 3>{};
      auto configs = std::vector<AnimationConfig>{};
      for (int group = 0; group < 3; ++group) {
        auto item = group * 8 + (round * 3 + group) % 8;
        changed[group] = item;
        wasVisible[group] = visible[item];
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
      for (int group = 0; group < 3; ++group) {
        const auto tag = 100 + changed[group];
        const auto type = wasVisible[group] ? LayoutAnimationType::EXITING : LayoutAnimationType::ENTERING;
        const auto *start = findStart(harness, tag, type);
        ASSERT_NE(start, nullptr) << round << ':' << tag;
        EXPECT_EQ(start->config, wasVisible[group] ? "nested-exit" : "nested-enter");
        if (wasVisible[group]) {
          EXPECT_TRUE(harness.platform().hostTree().hasTag(tag)) << round << ':' << tag;
        } else {
          expectHostOpacity(harness, tag, 0);
        }
      }
      settleStarts(harness, time + 2ms);

      for (int group = 0; group < 3; ++group) {
        const auto flattened = (round + group) % 2 == 0;
        EXPECT_EQ(harness.platform().hostTree().hasTag(10 + group), !flattened) << round << ':' << group;
      }
      for (int item = 0; item < 24; ++item) {
        EXPECT_EQ(harness.platform().hostTree().hasTag(100 + item), visible[item]) << round << ':' << item;
        if (!visible[item]) {
          continue;
        }
        const auto group = item / 8;
        const auto index = item % 8;
        const auto flattened = (round + group) % 2 == 0;
        const auto expectedParent = flattened ? 1 : 10 + group;
        EXPECT_EQ(harness.platform().hostTree().getStubView(100 + item).parentTag, expectedParent)
            << round << ':' << item;
        expectHostGeometry(
            harness,
            100 + item,
            {static_cast<float>((flattened ? group * 260 : 0) + (index % 4) * 35 + round % 9),
             static_cast<float>((index / 4) * 35),
             static_cast<float>(28 + round % 4),
             28});
      }
      time += 5ms;
    }
  }
}

} // namespace reanimated::layout_animation::test
