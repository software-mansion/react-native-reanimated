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
#include <harness/TestMetadata.h>

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

std::set<Tag> startTags(const AnimationHarness &harness, LayoutAnimationType type, size_t from = 0) {
  auto tags = std::set<Tag>{};
  for (auto index = from; index < harness.starts().size(); ++index) {
    if (harness.starts()[index].type == type) {
      tags.insert(harness.starts()[index].tag);
    }
  }
  return tags;
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

struct SettleAnimations {
  Time at;
};

void settleStarts(AnimationHarness &harness, AnimationTimeline &timeline, SettleAnimations event) {
  auto starts = std::vector<AnimationStart>{};
  auto seen = std::set<Tag>{};
  for (auto start = harness.starts().rbegin(); start != harness.starts().rend(); ++start) {
    if (seen.insert(start->tag).second && harness.isActive(start->tag)) {
      starts.push_back(*start);
    }
  }
  timeline.onUI({
      .at = event.at,
      .task =
          [&] {
            for (const auto &start : starts) {
              harness.progress(start.tag, finalStyle(start));
            }
          },
  });
  timeline.onUI({
      .at = event.at + 1ms,
      .task =
          [&] {
            for (const auto &start : starts) {
              harness.end(start.tag, start.type == LayoutAnimationType::EXITING);
            }
          },
  });
  harness.clearCalls();
}

Frame flatListFrame(size_t index, int round) {
  return {
      .x = static_cast<float>((index % 4) * 40),
      .y = static_cast<float>((index / 4) * 40),
      .width = static_cast<float>(30 + round % 3),
      .height = 30,
  };
}

Snapshot flatList(const std::vector<Tag> &tags, int round = 0) {
  auto children = std::vector<ViewSpec>{};
  children.reserve(tags.size());
  for (size_t index = 0; index < tags.size(); ++index) {
    children.push_back(view({
        .tag = tags[index],
        .frame = flatListFrame(index, round),
    }));
  }
  return {std::move(children)};
}

std::vector<AnimationConfig> layoutConfigs(const std::vector<Tag> &tags, const std::string &name = "layout") {
  auto configs = std::vector<AnimationConfig>{};
  configs.reserve(tags.size());
  for (auto tag : tags) {
    configs.push_back(animation({
        .tag = tag,
        .type = LayoutAnimationType::LAYOUT,
        .name = name,
    }));
  }
  return configs;
}

Snapshot sharedScreens(bool firstActive, int count, int round = 0) {
  auto first = std::vector<ViewSpec>{};
  auto second = std::vector<ViewSpec>{};
  first.reserve(count);
  second.reserve(count);
  for (int index = 0; index < count; ++index) {
    first.push_back(view({
        .tag = 100 + index,
        .frame =
            {
                .x = static_cast<float>((index % 6) * 30),
                .y = static_cast<float>((index / 6) * 30),
                .width = 24,
                .height = 24,
            },
    }));
    second.push_back(view({
        .tag = 200 + index,
        .frame =
            {
                .x = static_cast<float>(300 - (index % 6) * 35 + round % 7),
                .y = static_cast<float>(200 - (index / 6) * 35),
                .width = static_cast<float>(28 + round % 5),
                .height = 28,
            },
    }));
  }
  return {{
      screen({
          .tag = 2,
          .children = {sharedTransitionBoundary({
              .tag = 3,
              .children = std::move(first),
              .boundaryActive = firstActive,
          })},
      }),
      screen({
          .tag = 4,
          .children = {sharedTransitionBoundary({
              .tag = 5,
              .children = std::move(second),
              .boundaryActive = !firstActive,
          })},
      }),
  }};
}

Snapshot sharedGeometryScreens(bool firstActive) {
  auto source = view({
      .tag = 100,
      .frame = {.x = 40, .y = 60, .width = 120, .height = 80},
      .opacity = 0.4,
  });
  auto target = view({
      .tag = 200,
      .frame = {.x = 680, .y = 500, .width = 240, .height = 180},
      .opacity = 1,
  });
  return {{
      screen({
          .tag = 2,
          .children = {sharedTransitionBoundary({
              .tag = 3,
              .children = {source},
              .boundaryActive = firstActive,
          })},
      }),
      screen({
          .tag = 4,
          .children = {sharedTransitionBoundary({
              .tag = 5,
              .children = {target},
              .boundaryActive = !firstActive,
          })},
      }),
  }};
}

Snapshot nestedSharedGeometryScreens(bool firstActive) {
  auto source = view({
      .tag = 100,
      .frame = {.x = 15, .y = 25, .width = 120, .height = 80},
      .opacity = 0.4,
  });
  auto target = view({
      .tag = 200,
      .frame = {.x = 80, .y = 100, .width = 240, .height = 180},
      .opacity = 1,
  });
  return {{
      screen({
          .tag = 2,
          .children = {sharedTransitionBoundary({
              .tag = 3,
              .children = {view({
                  .tag = 30,
                  .frame = {.x = 25, .y = 35, .width = 400, .height = 400},
                  .children = {source},
              })},
              .boundaryActive = firstActive,
          })},
      }),
      screen({
          .tag = 4,
          .children = {sharedTransitionBoundary({
              .tag = 5,
              .children = {view({
                  .tag = 50,
                  .frame = {.x = 600, .y = 400, .width = 400, .height = 400},
                  .children = {target},
              })},
              .boundaryActive = !firstActive,
          })},
      }),
  }};
}

Frame hostGeometry(AnimationHarness &harness, Tag tag) {
  const auto &frame = harness.platform().hostTree().getStubView(tag).layoutMetrics.frame;
  return {frame.origin.x, frame.origin.y, frame.size.width, frame.size.height};
}

float hostOpacity(AnimationHarness &harness, Tag tag) {
  const auto &view = harness.platform().hostTree().getStubView(tag);
  const auto &props = static_cast<const facebook::react::ViewProps &>(*view.props);
  return props.opacity;
}

struct ExpectedHostView {
  Tag tag;
  std::optional<Frame> frame;
  std::optional<Frame> absoluteFrame;
  std::optional<float> opacity;
};

void expectHostView(AnimationHarness &harness, ExpectedHostView expected) {
  const auto &tree = harness.platform().hostTree();
  const auto &view = tree.getStubView(expected.tag);
  if (expected.frame) {
    const auto &frame = view.layoutMetrics.frame;
    EXPECT_FLOAT_EQ(frame.origin.x, expected.frame->x);
    EXPECT_FLOAT_EQ(frame.origin.y, expected.frame->y);
    EXPECT_FLOAT_EQ(frame.size.width, expected.frame->width);
    EXPECT_FLOAT_EQ(frame.size.height, expected.frame->height);
  }
  if (expected.absoluteFrame) {
    auto frame = view.layoutMetrics.frame;
    auto parentTag = view.parentTag;
    while (parentTag != facebook::react::NO_VIEW_TAG) {
      const auto &parent = tree.getStubView(parentTag);
      frame.origin.x += parent.layoutMetrics.frame.origin.x;
      frame.origin.y += parent.layoutMetrics.frame.origin.y;
      parentTag = parent.parentTag;
    }
    EXPECT_FLOAT_EQ(frame.origin.x, expected.absoluteFrame->x);
    EXPECT_FLOAT_EQ(frame.origin.y, expected.absoluteFrame->y);
    EXPECT_FLOAT_EQ(frame.size.width, expected.absoluteFrame->width);
    EXPECT_FLOAT_EQ(frame.size.height, expected.absoluteFrame->height);
  }
  if (expected.opacity) {
    const auto &props = static_cast<const facebook::react::ViewProps &>(*view.props);
    EXPECT_FLOAT_EQ(props.opacity, *expected.opacity);
  }
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
    configs.push_back(animation({
        .tag = 100 + index,
        .type = LayoutAnimationType::SHARED_ELEMENT_TRANSITION_NATIVE_ID,
        .name = name,
        .sharedTransitionTag = name,
    }));
    configs.push_back(animation({
        .tag = 200 + index,
        .type = LayoutAnimationType::SHARED_ELEMENT_TRANSITION_NATIVE_ID,
        .name = name,
        .sharedTransitionTag = name,
    }));
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

HARNESS_TEST(
    LayoutAnimationScenariosTest,
    ExitingViewStaysMountedUntilItsAnimationEnds,
    .description =
        "An exiting view must remain mounted after React removes it. "
        "Early deletion cuts off the animation and leaves later progress without a host view.") {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto timeline = AnimationTimeline(harness);

    timeline.render({
        .at = 0ms,
        .tree = snapshot({view({
            .tag = 2,
            .frame = {.x = 0, .y = 0, .width = 100, .height = 100},
        })}),
    });
    harness.clearCalls();
    timeline.configureAnimations({
        .at = 10ms,
        .animations = {animation({
            .tag = 2,
            .type = LayoutAnimationType::EXITING,
            .name = "fade-out",
        })},
    });
    timeline.render({.at = 10ms, .tree = {}});

    const auto &start = onlyStart(harness);
    EXPECT_EQ(start.tag, 2);
    EXPECT_EQ(start.type, LayoutAnimationType::EXITING);
    EXPECT_EQ(start.config, "fade-out");
    EXPECT_EQ(startValue(start, "currentOriginX"), 0);
    EXPECT_EQ(startValue(start, "currentOriginY"), 0);
    EXPECT_EQ(startValue(start, "currentWidth"), 100);
    EXPECT_EQ(startValue(start, "currentHeight"), 100);
    EXPECT_TRUE(harness.platform().hostTree().hasTag(2));
    expectHostView(harness, {.tag = 2, .frame = Frame{.x = 0, .y = 0, .width = 100, .height = 100}, .opacity = 1});

    settleStarts(harness, timeline, {.at = 20ms});

    EXPECT_FALSE(harness.platform().hostTree().hasTag(2));
    EXPECT_EQ(harness.platform().hostTree().size(), 1);
  }
}

HARNESS_TEST(
    LayoutAnimationScenariosTest,
    ExitingViewKeepsItsHostIndexUntilCompletion,
    .description =
        "An exiting sibling must keep its original host index until completion. "
        "Moving it to the end changes stacking and draws it above later siblings, as fixed by GitHub #10392.",
    .githubIssues = {10392}) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto timeline = AnimationTimeline(harness);

    timeline.configureAnimations({
        .at = 0ms,
        .animations = {animation({
            .tag = 2,
            .type = LayoutAnimationType::EXITING,
            .name = "indexed-exit",
        })},
    });
    timeline.render({
        .at = 0ms,
        .tree = snapshot({
            view({.tag = 2, .frame = {.x = 0, .y = 0, .width = 80, .height = 80}}),
            view({.tag = 3, .frame = {.x = 100, .y = 0, .width = 80, .height = 80}}),
        }),
    });
    harness.clearCalls();
    const auto frameIndex = harness.platform().mountedFrames().size();

    timeline.render({
        .at = 10ms,
        .tree = snapshot({view({
            .tag = 3,
            .frame = {.x = 100, .y = 0, .width = 80, .height = 80},
        })}),
    });

    ASSERT_NE(findStart(harness, 2, LayoutAnimationType::EXITING), nullptr);
    EXPECT_EQ(childTags(harness.platform().hostTree().getRootStubView()), (std::vector<Tag>{2, 3}));
    const auto &frames = harness.platform().mountedFrames();
    for (auto index = frameIndex; index < frames.size(); ++index) {
      for (const auto &mutation : frames[index].mutations) {
        EXPECT_FALSE(mutation.tag == 2 && (mutation.type == "remove" || mutation.type == "insert"));
      }
    }

    timeline.end({.at = 20ms, .tag = 2, .removeView = true});
    EXPECT_EQ(childTags(harness.platform().hostTree().getRootStubView()), (std::vector<Tag>{3}));
  }
}

HARNESS_TEST(
    LayoutAnimationCrashRegressionTest,
    ImmediateExitCompletionCanReenterTheStartCallback,
    .description =
        "Reduced motion or zero duration can complete an exit inside its start callback. "
        "Native bookkeeping must exist before that callback, or reentrant completion reads incomplete state and crashes, as in GitHub #9646.",
    .githubIssues = {9646}) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto timeline = AnimationTimeline(harness);
    harness.completeAnimationsOnStart();

    timeline.render({
        .at = 0ms,
        .tree = snapshot({view({
            .tag = 2,
            .frame = {.x = 0, .y = 0, .width = 100, .height = 100},
        })}),
    });
    harness.clearCalls();
    timeline.configureAnimations({
        .at = 10ms,
        .animations = {animation({
            .tag = 2,
            .type = LayoutAnimationType::EXITING,
            .name = "reduced-motion",
        })},
    });
    timeline.render({.at = 10ms, .tree = {}});
    timeline.onUI({.at = 20ms, .task = {}});

    const auto &start = onlyStart(harness);
    EXPECT_EQ(start.tag, 2);
    EXPECT_EQ(start.type, LayoutAnimationType::EXITING);
    EXPECT_FALSE(harness.isActive(2));
    EXPECT_FALSE(harness.platform().hostTree().hasTag(2));
  }
}

HARNESS_TEST(
    LayoutAnimationScenariosTest,
    RemovingAModalScreenSkipsDescendantExitAnimations,
    .description =
        "A native modal pop must not start exit animations for its descendants. "
        "The native screen owns subtree teardown, so Reanimated retention can leave invalid views, as fixed by GitHub #7667.",
    .githubIssues = {7667}) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto timeline = AnimationTimeline(harness);

    timeline.render({
        .at = 0ms,
        .tree = snapshot({modalScreen({
            .tag = 2,
            .children = {view({
                .tag = 3,
                .frame = {.x = 20, .y = 30, .width = 100, .height = 100},
            })},
        })}),
    });
    harness.clearCalls();
    timeline.configureAnimations({
        .at = 10ms,
        .animations = {animation({
            .tag = 3,
            .type = LayoutAnimationType::EXITING,
            .name = "modal-child-exit",
        })},
    });
    timeline.render({.at = 10ms, .tree = {}});

    EXPECT_TRUE(harness.starts().empty());
    EXPECT_FALSE(harness.platform().hostTree().hasTag(2));
    EXPECT_FALSE(harness.platform().hostTree().hasTag(3));
  }
}

HARNESS_TEST(
    LayoutAnimationScenariosTest,
    RemovingAnExitConfigUnmountsWithoutStartingIt,
    .description =
        "Removing an exit configuration before deletion must make the removal immediate. "
        "Reusing stale configuration would start an animation that JavaScript no longer requested.") {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto timeline = AnimationTimeline(harness);

    timeline.configureAnimations({
        .at = 0ms,
        .animations = {animation({
            .tag = 2,
            .type = LayoutAnimationType::EXITING,
            .name = "configured-exit",
        })},
    });
    timeline.render({
        .at = 0ms,
        .tree = snapshot({view({
            .tag = 2,
            .frame = {.x = 0, .y = 0, .width = 100, .height = 100},
        })}),
    });
    harness.clearCalls();
    timeline.configureAnimations({
        .at = 10ms,
        .animations = {removeAnimation({.tag = 2, .type = LayoutAnimationType::EXITING})},
    });
    timeline.render({.at = 10ms, .tree = {}});

    EXPECT_TRUE(harness.starts().empty());
    EXPECT_FALSE(harness.platform().hostTree().hasTag(2));
  }
}

HARNESS_TEST(
    LayoutAnimationScenariosTest,
    LayoutProgressAndRetargetUseTheCurrentMountedFrame,
    .description =
        "A retargeted layout animation must start from the currently mounted animated frame. "
        "Starting from the latest React frame makes the view jump and loses completion ownership from the prior animation.") {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto timeline = AnimationTimeline(harness);

    timeline.configureAnimations({
        .at = 0ms,
        .animations = {animation({
            .tag = 2,
            .type = LayoutAnimationType::LAYOUT,
            .name = "spring",
        })},
    });
    timeline.render({
        .at = 0ms,
        .tree = snapshot({view({
            .tag = 2,
            .frame = {.x = 0, .y = 0, .width = 100, .height = 100},
        })}),
    });
    harness.clearCalls();
    timeline.configureAnimations({
        .at = 10ms,
        .animations = {animation({
            .tag = 2,
            .type = LayoutAnimationType::LAYOUT,
            .name = "spring",
        })},
    });
    timeline.render({
        .at = 10ms,
        .tree = snapshot({view({
            .tag = 2,
            .frame = {.x = 100, .y = 20, .width = 120, .height = 80},
        })}),
    });

    auto first = onlyStart(harness);
    EXPECT_EQ(first.type, LayoutAnimationType::LAYOUT);
    EXPECT_EQ(startValue(first, "currentOriginX"), 0);
    EXPECT_EQ(startValue(first, "targetOriginX"), 100);
    expectHostView(harness, {.tag = 2, .frame = Frame{.x = 0, .y = 0, .width = 100, .height = 100}, .opacity = 1});

    timeline.progress({
        .at = 20ms,
        .tag = 2,
        .style = {.x = 40, .y = 8, .width = 108, .height = 92, .opacity = 1},
    });
    expectHostView(harness, {.tag = 2, .frame = Frame{.x = 40, .y = 8, .width = 108, .height = 92}, .opacity = 1});

    harness.clearCalls();
    timeline.configureAnimations({
        .at = 30ms,
        .animations = {animation({
            .tag = 2,
            .type = LayoutAnimationType::LAYOUT,
            .name = "retarget",
        })},
    });
    timeline.render({
        .at = 30ms,
        .tree = snapshot({view({
            .tag = 2,
            .frame = {.x = 200, .y = 40, .width = 140, .height = 60},
        })}),
    });

    auto second = onlyStart(harness);
    EXPECT_EQ(second.type, LayoutAnimationType::LAYOUT);
    EXPECT_EQ(second.config, "retarget");
    EXPECT_EQ(startValue(second, "currentOriginX"), 40);
    EXPECT_EQ(startValue(second, "targetOriginX"), 200);
    expectHostView(harness, {.tag = 2, .frame = Frame{.x = 40, .y = 8, .width = 108, .height = 92}, .opacity = 1});

    settleStarts(harness, timeline, {.at = 40ms});
    const auto &frame = harness.platform().hostTree().getStubView(2).layoutMetrics.frame;
    EXPECT_EQ(frame.origin.x, 200);
    EXPECT_EQ(frame.origin.y, 40);
    EXPECT_EQ(frame.size.width, 140);
    EXPECT_EQ(frame.size.height, 60);
  }
}

#ifdef HARNESS_PROXY_REGISTRY
HARNESS_TEST(
    LayoutAnimationScenariosTest,
    ConfigRemovalRetargetsWithTheCapturedLayoutConfig,
    .description =
        "An active layout animation owns the configuration that started it. "
        "A later render may remove the JavaScript configuration, but retargeting must still use the captured value fixed by GitHub #10373.",
    .githubIssues = {10373}) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto timeline = AnimationTimeline(harness);

    timeline.render({
        .at = 0ms,
        .tree = snapshot({view({
            .tag = 2,
            .frame = {.x = 0, .y = 0, .width = 100, .height = 100},
        })}),
    });
    timeline.configureAnimations({
        .at = 10ms,
        .animations = {animation({
            .tag = 2,
            .type = LayoutAnimationType::LAYOUT,
            .name = "captured",
        })},
    });
    timeline.render({
        .at = 10ms,
        .tree = snapshot({view({
            .tag = 2,
            .frame = {.x = 100, .y = 0, .width = 100, .height = 100},
        })}),
    });
    timeline.progress({
        .at = 20ms,
        .tag = 2,
        .style = {.x = 40, .y = 0, .width = 100, .height = 100},
    });

    harness.clearCalls();
    timeline.configureAnimations({
        .at = 30ms,
        .animations = {removeAnimation({.tag = 2, .type = LayoutAnimationType::LAYOUT})},
    });
    timeline.render({
        .at = 30ms,
        .tree = snapshot({view({
            .tag = 2,
            .frame = {.x = 200, .y = 0, .width = 100, .height = 100},
        })}),
    });

    const auto &start = onlyStart(harness);
    EXPECT_EQ(start.type, LayoutAnimationType::LAYOUT);
    EXPECT_EQ(start.config, "captured");
    EXPECT_EQ(startValue(start, "currentOriginX"), 40);
    EXPECT_EQ(startValue(start, "targetOriginX"), 200);
    settleStarts(harness, timeline, {.at = 40ms});
    EXPECT_EQ(harness.platform().hostTree().getStubView(2).layoutMetrics.frame.origin.x, 200);
  }
}
#endif

HARNESS_TEST(
    LayoutAnimationScenariosTest,
    ExitingDescendantKeepsDeletedAncestorsAlive,
    .description =
        "An exiting descendant needs its deleted ancestors to remain mounted as structural hosts. "
        "Removing an ancestor early makes descendant mutations target a detached hierarchy.") {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto timeline = AnimationTimeline(harness);

    timeline.render({
        .at = 0ms,
        .tree = snapshot({view({
            .tag = 2,
            .frame = {.x = 0, .y = 0, .width = 200, .height = 200},
            .children = {view({
                .tag = 3,
                .frame = {.x = 10, .y = 10, .width = 100, .height = 100},
            })},
        })}),
    });
    harness.clearCalls();
    timeline.configureAnimations({
        .at = 10ms,
        .animations = {animation({
            .tag = 3,
            .type = LayoutAnimationType::EXITING,
            .name = "nested-exit",
        })},
    });
    timeline.render({.at = 10ms, .tree = {}});

    const auto &start = onlyStart(harness);
    EXPECT_EQ(start.tag, 3);
    EXPECT_EQ(start.type, LayoutAnimationType::EXITING);
    EXPECT_TRUE(harness.platform().hostTree().hasTag(2));
    EXPECT_TRUE(harness.platform().hostTree().hasTag(3));

    settleStarts(harness, timeline, {.at = 20ms});

    EXPECT_FALSE(harness.platform().hostTree().hasTag(2));
    EXPECT_FALSE(harness.platform().hostTree().hasTag(3));
    EXPECT_EQ(harness.platform().hostTree().size(), 1);
  }
}

HARNESS_TEST(
    LayoutAnimationScenariosTest,
    NestedExitingGrandchildKeepsAllDeletedAncestorsAlive,
    .description =
        "An exiting grandchild can require several deleted ancestors to wait. "
        "Missing waiting-node bookkeeping for any ancestor creates cleanup mutations against removed views, as fixed by GitHub #10103.",
    .githubIssues = {10103}) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto timeline = AnimationTimeline(harness);

    timeline.render({
        .at = 0ms,
        .tree = snapshot({view({
            .tag = 2,
            .frame = {.x = 0, .y = 0, .width = 240, .height = 160},
            .children = {view({
                .tag = 3,
                .frame = {.x = 10, .y = 10, .width = 200, .height = 120},
                .children = {view({
                    .tag = 4,
                    .frame = {.x = 20, .y = 20, .width = 80, .height = 80},
                })},
            })},
        })}),
    });
    harness.clearCalls();
    timeline.configureAnimations({
        .at = 10ms,
        .animations = {animation({
            .tag = 4,
            .type = LayoutAnimationType::EXITING,
            .name = "deep-exit",
        })},
    });
    timeline.render({.at = 10ms, .tree = {}});

    const auto *start = findStart(harness, 4, LayoutAnimationType::EXITING);
    ASSERT_NE(start, nullptr);
    EXPECT_EQ(start->config, "deep-exit");
    const auto &tree = harness.platform().hostTree();
    ASSERT_TRUE(tree.hasTag(2));
    ASSERT_TRUE(tree.hasTag(3));
    ASSERT_TRUE(tree.hasTag(4));
    EXPECT_EQ(tree.getStubView(3).parentTag, 2);
    EXPECT_EQ(tree.getStubView(4).parentTag, 3);

    timeline.end({.at = 20ms, .tag = 4, .removeView = true});
    EXPECT_FALSE(tree.hasTag(2));
    EXPECT_FALSE(tree.hasTag(3));
    EXPECT_FALSE(tree.hasTag(4));
    EXPECT_EQ(tree.size(), 1);
  }
}

HARNESS_TEST(
    LayoutAnimationScenariosTest,
    TwoExitingSiblingsCanFinishOutOfOrder,
    .description =
        "Each exiting sibling owns independent completion state. "
        "Finishing one animation must not delete or settle another sibling that remains active.") {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto timeline = AnimationTimeline(harness);

    timeline.configureAnimations({
        .at = 0ms,
        .animations =
            {
                animation({.tag = 3, .type = LayoutAnimationType::EXITING, .name = "short"}),
                animation({.tag = 4, .type = LayoutAnimationType::EXITING, .name = "long"}),
            },
    });
    timeline.render({
        .at = 0ms,
        .tree = snapshot({view({
            .tag = 2,
            .frame = {.x = 0, .y = 0, .width = 200, .height = 100},
            .children =
                {
                    view({.tag = 3, .frame = {.x = 0, .y = 0, .width = 80, .height = 80}}),
                    view({.tag = 4, .frame = {.x = 100, .y = 0, .width = 80, .height = 80}}),
                },
        })}),
    });
    harness.clearCalls();
    timeline.render({.at = 10ms, .tree = {}});

    ASSERT_NE(findStart(harness, 3, LayoutAnimationType::EXITING), nullptr);
    ASSERT_NE(findStart(harness, 4, LayoutAnimationType::EXITING), nullptr);
    EXPECT_TRUE(harness.platform().hostTree().hasTag(2));
    EXPECT_EQ(childTags(harness.platform().hostTree().getStubView(2)), (std::vector<Tag>{3, 4}));

    timeline.end({.at = 20ms, .tag = 3, .removeView = true});
    EXPECT_FALSE(harness.platform().hostTree().hasTag(3));
    EXPECT_TRUE(harness.platform().hostTree().hasTag(4));
    EXPECT_TRUE(harness.platform().hostTree().hasTag(2));
    EXPECT_EQ(childTags(harness.platform().hostTree().getStubView(2)), (std::vector<Tag>{4}));

    timeline.end({.at = 30ms, .tag = 4, .removeView = true});
    EXPECT_FALSE(harness.platform().hostTree().hasTag(2));
    EXPECT_FALSE(harness.platform().hostTree().hasTag(4));
    EXPECT_EQ(harness.platform().hostTree().size(), 1);
  }
}

HARNESS_TEST(
    LayoutAnimationScenariosTest,
    EnteringLayoutAndExitingShareOneCommit,
    .description =
        "One React commit can start different animation types on different tags. "
        "The proxy must classify every mutation without dropping or assigning the wrong configuration.") {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto timeline = AnimationTimeline(harness);

    timeline.render({
        .at = 0ms,
        .tree = snapshot({
            view({.tag = 2, .frame = {.x = 0, .y = 0, .width = 80, .height = 80}}),
            view({.tag = 3, .frame = {.x = 100, .y = 0, .width = 80, .height = 80}}),
        }),
    });
    harness.clearCalls();
    timeline.configureAnimations({
        .at = 10ms,
        .animations =
            {
                animation({.tag = 2, .type = LayoutAnimationType::LAYOUT, .name = "move"}),
                animation({.tag = 3, .type = LayoutAnimationType::EXITING, .name = "leave"}),
                animation({.tag = 4, .type = LayoutAnimationType::ENTERING, .name = "arrive"}),
            },
    });
    timeline.render({
        .at = 10ms,
        .tree = snapshot({
            view({.tag = 2, .frame = {.x = 120, .y = 20, .width = 100, .height = 60}}),
            view({.tag = 4, .frame = {.x = 0, .y = 0, .width = 90, .height = 90}}),
        }),
    });

    ASSERT_NE(findStart(harness, 2, LayoutAnimationType::LAYOUT), nullptr);
    ASSERT_NE(findStart(harness, 3, LayoutAnimationType::EXITING), nullptr);
    ASSERT_NE(findStart(harness, 4, LayoutAnimationType::ENTERING), nullptr);
    EXPECT_TRUE(harness.platform().hostTree().hasTag(3));
    expectHostView(harness, {.tag = 2, .frame = Frame{.x = 0, .y = 0, .width = 80, .height = 80}, .opacity = 1});
    expectHostView(harness, {.tag = 3, .frame = Frame{.x = 100, .y = 0, .width = 80, .height = 80}, .opacity = 1});
    expectHostView(harness, {.tag = 4, .frame = Frame{.x = 0, .y = 0, .width = 90, .height = 90}, .opacity = 0});

    settleStarts(harness, timeline, {.at = 20ms});

    EXPECT_TRUE(harness.platform().hostTree().hasTag(2));
    EXPECT_FALSE(harness.platform().hostTree().hasTag(3));
    EXPECT_TRUE(harness.platform().hostTree().hasTag(4));
    EXPECT_EQ(harness.platform().hostTree().size(), 3);
    expectHostView(harness, {.tag = 2, .frame = Frame{.x = 120, .y = 20, .width = 100, .height = 60}, .opacity = 1});
    expectHostView(harness, {.tag = 4, .frame = Frame{.x = 0, .y = 0, .width = 90, .height = 90}, .opacity = 1});
  }
}

HARNESS_TEST(
    LayoutAnimationScenariosTest,
    SkipExitingOnAnAncestorRemovesItsAnimatedSubtreeImmediately,
    .description =
        "An ancestor's skip-exiting policy must remove its animated subtree immediately. "
        "Retaining descendants violates the caller's opt-out and can keep detached views mounted.") {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto timeline = AnimationTimeline(harness);
    timeline.setShouldAnimateExiting({.at = 0ms, .tag = 2, .animate = false});
    timeline.configureAnimations({
        .at = 0ms,
        .animations = {animation({
            .tag = 3,
            .type = LayoutAnimationType::EXITING,
            .name = "nested-exit",
        })},
    });
    timeline.render({
        .at = 0ms,
        .tree = snapshot({view({
            .tag = 2,
            .frame = {.x = 0, .y = 0, .width = 120, .height = 120},
            .children = {view({
                .tag = 3,
                .frame = {.x = 10, .y = 10, .width = 80, .height = 80},
            })},
        })}),
    });
    harness.clearCalls();

    timeline.render({.at = 10ms, .tree = {}});

    EXPECT_TRUE(harness.starts().empty());
    EXPECT_FALSE(harness.platform().hostTree().hasTag(2));
    EXPECT_FALSE(harness.platform().hostTree().hasTag(3));
  }
}

HARNESS_TEST(
    LayoutAnimationScenariosTest,
    NestedSkipExitingCanBeOverriddenForAChild,
    .description =
        "A child can opt back into exit animations below a skipped ancestor. "
        "Policy inheritance must preserve the explicit child override instead of suppressing the whole subtree.") {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto timeline = AnimationTimeline(harness);
    timeline.setShouldAnimateExiting({.at = 0ms, .tag = 2, .animate = false});
    timeline.setShouldAnimateExiting({.at = 0ms, .tag = 3, .animate = true});
    timeline.configureAnimations({
        .at = 0ms,
        .animations = {animation({
            .tag = 3,
            .type = LayoutAnimationType::EXITING,
            .name = "nested-override",
        })},
    });
    timeline.render({
        .at = 0ms,
        .tree = snapshot({view({
            .tag = 2,
            .frame = {.x = 0, .y = 0, .width = 120, .height = 120},
            .children = {view({
                .tag = 3,
                .frame = {.x = 10, .y = 10, .width = 80, .height = 80},
            })},
        })}),
    });
    harness.clearCalls();

    timeline.render({.at = 10ms, .tree = {}});

    const auto *start = findStart(harness, 3, LayoutAnimationType::EXITING);
    ASSERT_NE(start, nullptr);
    EXPECT_EQ(start->config, "nested-override");
    EXPECT_TRUE(harness.platform().hostTree().hasTag(2));
    EXPECT_TRUE(harness.platform().hostTree().hasTag(3));
    EXPECT_EQ(harness.platform().hostTree().getStubView(3).parentTag, 2);
    settleStarts(harness, timeline, {.at = 20ms});
    EXPECT_EQ(harness.platform().hostTree().size(), 1);
  }
}

HARNESS_TEST(
    LayoutAnimationScenariosTest,
    ReparentingStartsLayoutAnimationAndMovesTheView,
    .description =
        "Moving a stable view between parents is a layout change, not a replacement. "
        "The view must keep its identity and animate toward its new absolute position.") {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto timeline = AnimationTimeline(harness);
    auto initial = snapshot({view({
        .tag = 2,
        .frame = {.x = 0, .y = 0, .width = 300, .height = 200},
        .children = {view({
            .tag = 3,
            .frame = {.x = 20, .y = 20, .width = 200, .height = 120},
            .children = {view({
                .tag = 4,
                .frame = {.x = 0, .y = 0, .width = 200, .height = 100},
            })},
            .collapsable = false,
            .hasNativeId = false,
        })},
    })});
    auto moved = snapshot({view({
        .tag = 2,
        .frame = {.x = 0, .y = 0, .width = 300, .height = 200},
        .children = {view({
            .tag = 3,
            .frame = {.x = 20, .y = 20, .width = 200, .height = 120},
            .children = {view({
                .tag = 4,
                .frame = {.x = 0, .y = 0, .width = 100, .height = 100},
            })},
            .collapsable = true,
            .hasNativeId = false,
        })},
    })});

    timeline.configureAnimations({
        .at = 0ms,
        .animations = {animation({.tag = 4, .type = LayoutAnimationType::LAYOUT, .name = "move"})},
    });
    timeline.render({.at = 0ms, .tree = initial});
    harness.clearCalls();
    timeline.configureAnimations({
        .at = 10ms,
        .animations = {animation({.tag = 4, .type = LayoutAnimationType::LAYOUT, .name = "move"})},
    });
    timeline.render({.at = 10ms, .tree = moved});

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
    expectHostView(harness, {.tag = 4, .frame = Frame{.x = 0, .y = 0, .width = 200, .height = 100}});

    settleStarts(harness, timeline, {.at = 20ms});
    EXPECT_EQ(harness.platform().hostTree().getStubView(4).parentTag, 2);
    expectHostView(harness, {.tag = 4, .frame = Frame{.x = 20, .y = 20, .width = 100, .height = 100}});
  }
}

HARNESS_TEST(
    LayoutAnimationScenariosTest,
    FlatteningAParentWhileRemovingAChildKeepsHostOrderConsistent,
    .description =
        "Flattening can change host parent and index in the same commit as child removal. "
        "Mutation ordering must preserve host order and avoid operations against an already removed container.") {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto timeline = AnimationTimeline(harness);
    auto initial = snapshot({
        view({.tag = 8, .frame = {.x = 0, .y = 300, .width = 20, .height = 20}}),
        view({
            .tag = 2,
            .frame = {.x = 20, .y = 20, .width = 200, .height = 200},
            .children = {view({
                .tag = 3,
                .frame = {.x = 0, .y = 0, .width = 100, .height = 100},
                .children = {view({
                    .tag = 4,
                    .frame = {.x = 0, .y = 0, .width = 50, .height = 50},
                })},
            })},
            .collapsable = false,
            .hasNativeId = false,
        }),
        view({.tag = 9, .frame = {.x = 300, .y = 300, .width = 20, .height = 20}}),
    });
    auto flattened = snapshot({
        view({.tag = 8, .frame = {.x = 0, .y = 300, .width = 20, .height = 20}}),
        view({
            .tag = 2,
            .frame = {.x = 20, .y = 20, .width = 200, .height = 200},
            .children = {view({
                .tag = 3,
                .frame = {.x = 0, .y = 0, .width = 100, .height = 100},
            })},
            .collapsable = true,
            .hasNativeId = false,
        }),
        view({.tag = 9, .frame = {.x = 300, .y = 300, .width = 20, .height = 20}}),
    });

    timeline.configureAnimations({
        .at = 0ms,
        .animations = {animation({
            .tag = 3,
            .type = LayoutAnimationType::EXITING,
            .name = "armed-exit",
        })},
    });
    timeline.render({.at = 0ms, .tree = initial});
    harness.clearCalls();
    timeline.render({.at = 10ms, .tree = flattened});

    EXPECT_FALSE(harness.platform().hostTree().hasTag(2));
    EXPECT_TRUE(harness.platform().hostTree().hasTag(3));
    EXPECT_FALSE(harness.platform().hostTree().hasTag(4));
    EXPECT_EQ(harness.platform().hostTree().getStubView(3).parentTag, 1);
    EXPECT_EQ(childTags(harness.platform().hostTree().getRootStubView()), (std::vector<Tag>{8, 3, 9}));
    expectHostView(harness, {.tag = 3, .frame = Frame{.x = 20, .y = 20, .width = 100, .height = 100}});
    EXPECT_EQ(findStart(harness, 3, LayoutAnimationType::EXITING), nullptr);
  }
}

HARNESS_TEST(
    LayoutAnimationCrashRegressionTest,
    RecreatingAnExitingTagCancelsTheStaleRemoval,
    .description =
        "React can reuse a native tag while the previous view family is still exiting. "
        "Stale cleanup must be cancelled, or it removes the new instance and corrupts the host tree.") {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto timeline = AnimationTimeline(harness);

    timeline.render({
        .at = 0ms,
        .tree = snapshot({view({
            .tag = 2,
            .frame = {.x = 0, .y = 0, .width = 100, .height = 100},
            .generation = 0,
        })}),
    });
    harness.clearCalls();
    timeline.configureAnimations({
        .at = 10ms,
        .animations = {animation({.tag = 2, .type = LayoutAnimationType::EXITING, .name = "exit"})},
    });
    timeline.render({.at = 10ms, .tree = {}});
    ASSERT_EQ(harness.starts().size(), 1);
    ASSERT_TRUE(harness.platform().hostTree().hasTag(2));

    harness.clearCalls();
    timeline.configureAnimations({
        .at = 20ms,
        .animations = {animation({
            .tag = 2,
            .type = LayoutAnimationType::ENTERING,
            .name = "enter-again",
        })},
    });
    timeline.render({
        .at = 20ms,
        .tree = snapshot({view({
            .tag = 2,
            .frame = {.x = 50, .y = 0, .width = 100, .height = 100},
            .generation = 1,
        })}),
    });

    const auto &start = onlyStart(harness);
    EXPECT_EQ(start.tag, 2);
    EXPECT_EQ(start.type, LayoutAnimationType::ENTERING);
    EXPECT_EQ(start.config, "enter-again");
    EXPECT_TRUE(harness.platform().hostTree().hasTag(2));
    EXPECT_EQ(harness.platform().hostTree().getRootStubView().children.size(), 1);
    expectHostView(harness, {.tag = 2, .frame = Frame{.x = 50, .y = 0, .width = 100, .height = 100}, .opacity = 0});
    settleStarts(harness, timeline, {.at = 30ms});
    EXPECT_TRUE(harness.platform().hostTree().hasTag(2));
    EXPECT_EQ(harness.platform().hostTree().getRootStubView().children.size(), 1);
    expectHostView(harness, {.tag = 2, .frame = Frame{.x = 50, .y = 0, .width = 100, .height = 100}, .opacity = 1});
  }
}

HARNESS_TEST(
    LayoutAnimationCrashRegressionTest,
    RecreatingAWaitingSubviewFlushesItsWithheldRemoval,
    .description =
        "React can recreate an interior tag that is retained only to host an exiting descendant. "
        "The proxy must reconcile that waiting node before old cleanup targets the new family and crashes, as fixed by GitHub #10073.",
    .githubIssues = {10073}) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto timeline = AnimationTimeline(harness);
    auto initial = snapshot({view({
        .tag = 2,
        .frame = {.x = 0, .y = 0, .width = 220, .height = 100},
        .children = {view({
            .tag = 3,
            .frame = {.x = 0, .y = 0, .width = 100, .height = 100},
            .generation = 0,
        })},
    })});

    timeline.render({.at = 0ms, .tree = initial});
    harness.clearCalls();
    timeline.configureAnimations({
        .at = 10ms,
        .animations = {animation({.tag = 2, .type = LayoutAnimationType::EXITING, .name = "exit"})},
    });
    timeline.render({.at = 10ms, .tree = {}});
    ASSERT_NE(findStart(harness, 2, LayoutAnimationType::EXITING), nullptr);
    ASSERT_TRUE(harness.platform().hostTree().hasTag(3));

    harness.clearCalls();
    timeline.render({
        .at = 20ms,
        .tree = snapshot({view({
            .tag = 3,
            .frame = {.x = 40, .y = 50, .width = 120, .height = 80},
            .generation = 1,
        })}),
    });

    const auto &tree = harness.platform().hostTree();
    ASSERT_TRUE(tree.hasTag(3));
    EXPECT_EQ(tree.getStubView(3).parentTag, 1);
    expectHostView(harness, {.tag = 3, .frame = Frame{.x = 40, .y = 50, .width = 120, .height = 80}});
    ASSERT_TRUE(tree.hasTag(2));
    EXPECT_TRUE(tree.getStubView(2).children.empty());

    timeline.end({.at = 30ms, .tag = 2, .removeView = true});
    EXPECT_FALSE(tree.hasTag(2));
    EXPECT_TRUE(tree.hasTag(3));
    EXPECT_EQ(tree.getRootStubView().children.size(), 1);
  }
}

HARNESS_TEST(
    LayoutAnimationCrashRegressionTest,
    RecreatingASettledExitBeforeCleanupReplacesTheDeadNode,
    .description =
        "React can reuse a tag after an old exit settles but before its cleanup pull. "
        "Cleanup must distinguish the dead family from the replacement, or it deletes the new view or erases its animation, as fixed by GitHub #10073 and #9621.",
    .githubIssues = {10073, 9621}) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto timeline = AnimationTimeline(harness);

    timeline.render({
        .at = 0ms,
        .tree = snapshot({view({
            .tag = 2,
            .frame = {.x = 0, .y = 0, .width = 100, .height = 100},
            .generation = 0,
        })}),
    });
    harness.clearCalls();
    timeline.configureAnimations({
        .at = 10ms,
        .animations = {animation({.tag = 2, .type = LayoutAnimationType::EXITING, .name = "exit"})},
    });
    timeline.render({.at = 10ms, .tree = {}});
    ASSERT_NE(findStart(harness, 2, LayoutAnimationType::EXITING), nullptr);

    auto &choreographer = harness.timeline();
    choreographer.at(20ms, Lane::UI, [&] { harness.end(2, true); });
    choreographer.advanceTo(20ms);
    harness.clearCalls();
    timeline.configureAnimations({
        .at = 21ms,
        .animations = {animation({
            .tag = 2,
            .type = LayoutAnimationType::ENTERING,
            .name = "replace-dead",
        })},
    });
    timeline.render({
        .at = 21ms,
        .tree = snapshot({view({
            .tag = 2,
            .frame = {.x = 50, .y = 60, .width = 120, .height = 80},
            .generation = 1,
        })}),
    });

    const auto &tree = harness.platform().hostTree();
    const auto &start = onlyStart(harness);
    EXPECT_EQ(start.tag, 2);
    EXPECT_EQ(start.type, LayoutAnimationType::ENTERING);
    EXPECT_EQ(start.config, "replace-dead");
    ASSERT_TRUE(tree.hasTag(2));
    EXPECT_EQ(tree.getStubView(2).parentTag, 1);
    EXPECT_EQ(tree.getRootStubView().children.size(), 1);
    expectHostView(harness, {.tag = 2, .frame = Frame{.x = 50, .y = 60, .width = 120, .height = 80}, .opacity = 0});
    settleStarts(harness, timeline, {.at = 30ms});
    expectHostView(harness, {.tag = 2, .frame = Frame{.x = 50, .y = 60, .width = 120, .height = 80}, .opacity = 1});
  }
}

HARNESS_TEST(
    LayoutAnimationScenariosTest,
    ZeroDurationEnteringCanSettleOnItsFirstFrame,
    .description =
        "An animation that settles on its first frame still needs the exact final style mutation. "
        "Skipping settled progress leaves the host view hidden or stale, as fixed by GitHub #10171.",
    .githubIssues = {10171}) {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto timeline = AnimationTimeline(harness);

    timeline.configureAnimations({
        .at = 0ms,
        .animations = {animation({
            .tag = 2,
            .type = LayoutAnimationType::ENTERING,
            .name = "duration-zero",
        })},
    });
    timeline.render({
        .at = 0ms,
        .tree = snapshot({view({
            .tag = 2,
            .frame = {.x = 10, .y = 20, .width = 100, .height = 80},
        })}),
    });
    auto start = onlyStart(harness);
    expectHostView(harness, {.tag = 2, .frame = Frame{.x = 10, .y = 20, .width = 100, .height = 80}, .opacity = 0});

    timeline.onUI({
        .at = 2ms,
        .task =
            [&] {
              harness.progress(start.tag, finalStyle(start));
              harness.end(start.tag, false);
            },
    });

    EXPECT_TRUE(harness.platform().hostTree().hasTag(2));
    const auto &frame = harness.platform().hostTree().getStubView(2).layoutMetrics.frame;
    EXPECT_EQ(frame.origin.x, 10);
    EXPECT_EQ(frame.origin.y, 20);
    EXPECT_EQ(frame.size.width, 100);
    EXPECT_EQ(frame.size.height, 80);
    expectHostView(harness, {.tag = 2, .opacity = 1});

    timeline.progress({.at = 4ms, .tag = 2, .style = {.opacity = 0.2}});
    expectHostView(harness, {.tag = 2, .opacity = 1});
  }
}

HARNESS_TEST(
    LayoutAnimationScenariosTest,
    ProgressAppliesAnimatedStyleProps,
    .description =
        "Layout-animation progress carries style properties as well as geometry. "
        "Dropping those properties can leave opacity and other animated values stale while the frame appears correct.") {
  for (auto mode : platformModes()) {
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
    expectHostView(harness, {.tag = 2, .frame = Frame{.x = 10, .y = 20, .width = 100, .height = 80}, .opacity = 0});

    timeline.progress({.at = 10ms, .tag = 2, .style = {.opacity = 0.35}});
    const auto &progressed = harness.platform().hostTree().getStubView(2);
    const auto &progressedProps = static_cast<const facebook::react::ViewProps &>(*progressed.props);
    EXPECT_FLOAT_EQ(progressedProps.opacity, 0.35);

    settleStarts(harness, timeline, {.at = 20ms});
    const auto &settled = harness.platform().hostTree().getStubView(2);
    const auto &settledProps = static_cast<const facebook::react::ViewProps &>(*settled.props);
    EXPECT_EQ(settledProps.opacity, 1);

    timeline.progress({.at = 30ms, .tag = 2, .style = {.opacity = 0.1}});
    expectHostView(harness, {.tag = 2, .opacity = 1});
  }
}

HARNESS_TEST(
    LayoutAnimationScenariosTest,
    DisplayNoneEmitsPlatformSpecificHostMutationsAcrossRepeatedToggles,
    .description =
        "React Native platforms represent display-none views with different host mutations. "
        "The harness must preserve those differences so Reanimated sees the same inputs that each device produces.") {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto timeline = AnimationTimeline(harness);
    auto visible = view({
        .tag = 2,
        .frame = {.x = 0, .y = 0, .width = 100, .height = 100},
    });
    auto hidden = visible;
    hidden.displayNone = true;

    timeline.render({.at = 0ms, .tree = snapshot({visible})});
    auto time = 10ms;
    for (int round = 0; round < 40; ++round) {
      harness.clearCalls();
      timeline.render({
          .at = time,
          .tree = snapshot({round % 2 == 0 ? hidden : visible}),
      });
      EXPECT_TRUE(harness.starts().empty()) << round;
      if (round % 2 == 0 && mode == DriverMode::IOS) {
        EXPECT_FALSE(harness.platform().hostTree().hasTag(2)) << round;
      } else {
        ASSERT_TRUE(harness.platform().hostTree().hasTag(2)) << round;
        auto expectedFrame = round % 2 == 0 ? Frame{} : Frame{.x = 0, .y = 0, .width = 100, .height = 100};
        expectHostView(harness, {.tag = 2, .frame = expectedFrame});
        const auto expectedDisplay =
            round % 2 == 0 ? facebook::react::DisplayType::None : facebook::react::DisplayType::Flex;
        EXPECT_EQ(harness.platform().hostTree().getStubView(2).layoutMetrics.displayType, expectedDisplay) << round;
        ASSERT_FALSE(harness.platform().mountedFrames().empty());
        ASSERT_EQ(harness.platform().mountedFrames().back().root.children.size(), 1);
        EXPECT_EQ(harness.platform().mountedFrames().back().root.children[0].display, round % 2 == 0 ? "none" : "flex")
            << round;
      }
      time += 4ms;
    }

    EXPECT_TRUE(harness.platform().hostTree().hasTag(2));
    EXPECT_EQ(harness.platform().hostTree().size(), 2);
  }
}

HARNESS_TEST(
    LayoutAnimationScenariosTest,
    SharedTagMovesBetweenActiveBoundaries,
    .description =
        "A shared-tag match must hide the original views while a synthetic container owns the transition. "
        "Completion must remove that container and restore the target, or duplicate or stale content remains visible.") {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto timeline = AnimationTimeline(harness);
    auto first = snapshot({
        sharedTransitionBoundary({
            .tag = 2,
            .children = {view({
                .tag = 3,
                .frame = {.x = 0, .y = 0, .width = 80, .height = 80},
            })},
            .boundaryActive = true,
        }),
        sharedTransitionBoundary({
            .tag = 4,
            .children = {view({
                .tag = 5,
                .frame = {.x = 200, .y = 100, .width = 120, .height = 120},
            })},
            .boundaryActive = false,
        }),
    });
    auto second = snapshot({
        sharedTransitionBoundary({
            .tag = 2,
            .children = {view({
                .tag = 3,
                .frame = {.x = 0, .y = 0, .width = 80, .height = 80},
            })},
            .boundaryActive = false,
        }),
        sharedTransitionBoundary({
            .tag = 4,
            .children = {view({
                .tag = 5,
                .frame = {.x = 200, .y = 100, .width = 120, .height = 120},
            })},
            .boundaryActive = true,
        }),
    });
    auto configs = std::vector{
        animation({
            .tag = 3,
            .type = LayoutAnimationType::SHARED_ELEMENT_TRANSITION_NATIVE_ID,
            .name = "hero",
            .sharedTransitionTag = "hero",
        }),
        animation({
            .tag = 5,
            .type = LayoutAnimationType::SHARED_ELEMENT_TRANSITION_NATIVE_ID,
            .name = "hero",
            .sharedTransitionTag = "hero",
        }),
    };

    timeline.configureAnimations({.at = 0ms, .animations = configs});
    timeline.render({.at = 0ms, .tree = first});
    harness.clearCalls();
    timeline.render({.at = 10ms, .tree = second});

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
    expectHostView(harness, {.tag = 3, .frame = Frame{.x = 0, .y = 0, .width = 80, .height = 80}, .opacity = 0});
    expectHostView(harness, {.tag = 5, .frame = Frame{.x = 200, .y = 100, .width = 120, .height = 120}, .opacity = 0});
    expectHostView(
        harness, {.tag = start.tag, .frame = Frame{.x = 0, .y = 0, .width = 80, .height = 80}, .opacity = 1});

    auto containerTag = start.tag;
    settleStarts(harness, timeline, {.at = 20ms});
    EXPECT_FALSE(harness.platform().hostTree().hasTag(containerTag));
    expectHostView(harness, {.tag = 3, .frame = Frame{.x = 0, .y = 0, .width = 80, .height = 80}, .opacity = 0});
    expectHostView(harness, {.tag = 5, .frame = Frame{.x = 200, .y = 100, .width = 120, .height = 120}, .opacity = 1});
    EXPECT_TRUE(syntheticRootTags(harness).empty());
  }
}

HARNESS_TEST(
    LayoutAnimationScenariosTest,
    SharedSourceUpdateDuringBoundaryFlipStaysHidden,
    .description =
        "React can update a source view in the same commit that starts a shared transition. "
        "The hidden-source mutation must win over the React update, or both the source and transition container are visible.") {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto timeline = AnimationTimeline(harness);
    auto configs = std::vector{
        animation({
            .tag = 3,
            .type = LayoutAnimationType::SHARED_ELEMENT_TRANSITION_NATIVE_ID,
            .name = "hero",
            .sharedTransitionTag = "hero",
        }),
        animation({
            .tag = 5,
            .type = LayoutAnimationType::SHARED_ELEMENT_TRANSITION_NATIVE_ID,
            .name = "hero",
            .sharedTransitionTag = "hero",
        }),
    };
    timeline.configureAnimations({.at = 0ms, .animations = configs});
    timeline.render({
        .at = 0ms,
        .tree = snapshot({
            sharedTransitionBoundary({
                .tag = 2,
                .children = {view({
                    .tag = 3,
                    .frame = {.x = 0, .y = 0, .width = 80, .height = 80},
                })},
                .boundaryActive = true,
            }),
            sharedTransitionBoundary({
                .tag = 4,
                .children = {view({
                    .tag = 5,
                    .frame = {.x = 200, .y = 100, .width = 120, .height = 120},
                })},
                .boundaryActive = false,
            }),
        }),
    });
    harness.clearCalls();

    timeline.render({
        .at = 10ms,
        .tree = snapshot({
            sharedTransitionBoundary({
                .tag = 2,
                .children = {view({
                    .tag = 3,
                    .frame = {.x = 10, .y = 0, .width = 80, .height = 80},
                })},
                .boundaryActive = false,
            }),
            sharedTransitionBoundary({
                .tag = 4,
                .children = {view({
                    .tag = 5,
                    .frame = {.x = 200, .y = 100, .width = 120, .height = 120},
                })},
                .boundaryActive = true,
            }),
        }),
    });

    const auto &start = onlyStart(harness);
    EXPECT_EQ(start.type, LayoutAnimationType::SHARED_ELEMENT_TRANSITION);
    EXPECT_EQ(start.config, "hero");
    expectHostView(
        harness, {.tag = start.tag, .frame = Frame{.x = 0, .y = 0, .width = 80, .height = 80}, .opacity = 1});
    expectHostView(harness, {.tag = 3, .frame = Frame{.x = 10, .y = 0, .width = 80, .height = 80}, .opacity = 0});
    expectHostView(harness, {.tag = 5, .frame = Frame{.x = 200, .y = 100, .width = 120, .height = 120}, .opacity = 0});
  }
}

HARNESS_TEST(
    LayoutAnimationScenariosTest,
    SharedTargetUpdateDuringBoundaryFlipStaysHidden,
    .description =
        "React can update a target view in the same commit that starts a shared transition. "
        "The hidden-target mutation must win over the React update, or both the target and transition container are visible.") {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto timeline = AnimationTimeline(harness);
    auto configs = std::vector{
        animation({
            .tag = 3,
            .type = LayoutAnimationType::SHARED_ELEMENT_TRANSITION_NATIVE_ID,
            .name = "hero",
            .sharedTransitionTag = "hero",
        }),
        animation({
            .tag = 5,
            .type = LayoutAnimationType::SHARED_ELEMENT_TRANSITION_NATIVE_ID,
            .name = "hero",
            .sharedTransitionTag = "hero",
        }),
    };
    timeline.configureAnimations({.at = 0ms, .animations = configs});
    timeline.render({
        .at = 0ms,
        .tree = snapshot({
            sharedTransitionBoundary({
                .tag = 2,
                .children = {view({
                    .tag = 3,
                    .frame = {.x = 0, .y = 0, .width = 80, .height = 80},
                })},
                .boundaryActive = true,
            }),
            sharedTransitionBoundary({
                .tag = 4,
                .children = {view({
                    .tag = 5,
                    .frame = {.x = 200, .y = 100, .width = 120, .height = 120},
                })},
                .boundaryActive = false,
            }),
        }),
    });
    harness.clearCalls();

    timeline.render({
        .at = 10ms,
        .tree = snapshot({
            sharedTransitionBoundary({
                .tag = 2,
                .children = {view({
                    .tag = 3,
                    .frame = {.x = 0, .y = 0, .width = 80, .height = 80},
                })},
                .boundaryActive = false,
            }),
            sharedTransitionBoundary({
                .tag = 4,
                .children = {view({
                    .tag = 5,
                    .frame = {.x = 210, .y = 110, .width = 120, .height = 120},
                })},
                .boundaryActive = true,
            }),
        }),
    });

    const auto &start = onlyStart(harness);
    EXPECT_EQ(start.type, LayoutAnimationType::SHARED_ELEMENT_TRANSITION);
    expectHostView(
        harness, {.tag = start.tag, .frame = Frame{.x = 0, .y = 0, .width = 80, .height = 80}, .opacity = 1});
    expectHostView(harness, {.tag = 3, .frame = Frame{.x = 0, .y = 0, .width = 80, .height = 80}, .opacity = 0});
    expectHostView(harness, {.tag = 5, .frame = Frame{.x = 210, .y = 110, .width = 120, .height = 120}, .opacity = 0});
  }
}

HARNESS_TEST(
    LayoutAnimationScenariosTest,
    SharedContainerTracksGeometryAndOpacityAcrossProgressFrames,
    .description =
        "A non-interactive shared animation applies JavaScript-produced style to its synthetic container. "
        "The mounted container must preserve every geometry and opacity value so native orchestration does not distort interpolation.") {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto timeline = AnimationTimeline(harness);
    timeline.configureAnimations({.at = 0ms, .animations = sharedConfigs(1)});
    timeline.render({.at = 0ms, .tree = sharedGeometryScreens(true)});
    harness.clearCalls();
    timeline.render({.at = 10ms, .tree = sharedGeometryScreens(false)});

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
    expectHostView(
        harness, {.tag = containerTag, .frame = Frame{.x = 40, .y = 60, .width = 120, .height = 80}, .opacity = 0.4});
    expectHostView(harness, {.tag = 100, .opacity = 0});
    expectHostView(harness, {.tag = 200, .opacity = 0});

    struct ProgressFrame {
      Frame frame;
      float opacity;
    };
    const auto progressFrames = std::array{
        ProgressFrame{
            .frame = {.x = 200, .y = 170, .width = 150, .height = 105},
            .opacity = 0.55,
        },
        ProgressFrame{
            .frame = {.x = 360, .y = 280, .width = 180, .height = 130},
            .opacity = 0.7,
        },
        ProgressFrame{
            .frame = {.x = 520, .y = 390, .width = 210, .height = 155},
            .opacity = 0.85,
        },
        ProgressFrame{
            .frame = {.x = 680, .y = 500, .width = 240, .height = 180},
            .opacity = 1,
        },
    };

    auto time = 20ms;
    for (const auto &progressFrame : progressFrames) {
      timeline.progress({
          .at = time,
          .tag = containerTag,
          .style =
              {
                  .x = progressFrame.frame.x,
                  .y = progressFrame.frame.y,
                  .width = progressFrame.frame.width,
                  .height = progressFrame.frame.height,
                  .opacity = progressFrame.opacity,
              },
      });
      expectHostView(
          harness,
          {
              .tag = containerTag,
              .frame = progressFrame.frame,
              .opacity = progressFrame.opacity,
          });
      expectHostView(harness, {.tag = 100, .opacity = 0});
      expectHostView(harness, {.tag = 200, .opacity = 0});
      time += 10ms;
    }

    timeline.end({.at = time, .tag = containerTag, .removeView = false});
    EXPECT_FALSE(harness.platform().hostTree().hasTag(containerTag));
    expectHostView(harness, {.tag = 100, .frame = Frame{.x = 40, .y = 60, .width = 120, .height = 80}, .opacity = 0});
    expectHostView(
        harness, {.tag = 200, .frame = Frame{.x = 680, .y = 500, .width = 240, .height = 180}, .opacity = 1});
    EXPECT_TRUE(syntheticRootTags(harness).empty());
  }
}

HARNESS_TEST(
    LayoutAnimationScenariosTest,
    DuplicateSharedNamesDoNotLeaveSyntheticContainers,
    .description =
        "Several views can use the same shared name during replacement. "
        "The proxy must pair and clean them without orphaning containers or hiding unrelated originals.") {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto timeline = AnimationTimeline(harness);
    auto first = snapshot({
        sharedTransitionBoundary({
            .tag = 2,
            .children =
                {
                    view({.tag = 10, .frame = {.x = 0, .y = 0, .width = 50, .height = 50}}),
                    view({.tag = 11, .frame = {.x = 60, .y = 0, .width = 50, .height = 50}}),
                },
            .boundaryActive = true,
        }),
        sharedTransitionBoundary({
            .tag = 4,
            .children =
                {
                    view({.tag = 20, .frame = {.x = 200, .y = 0, .width = 50, .height = 50}}),
                    view({.tag = 21, .frame = {.x = 260, .y = 0, .width = 50, .height = 50}}),
                },
            .boundaryActive = false,
        }),
    });
    auto second = snapshot({
        sharedTransitionBoundary({
            .tag = 2,
            .children =
                {
                    view({.tag = 10, .frame = {.x = 0, .y = 0, .width = 50, .height = 50}}),
                    view({.tag = 11, .frame = {.x = 60, .y = 0, .width = 50, .height = 50}}),
                },
            .boundaryActive = false,
        }),
        sharedTransitionBoundary({
            .tag = 4,
            .children =
                {
                    view({.tag = 20, .frame = {.x = 200, .y = 0, .width = 50, .height = 50}}),
                    view({.tag = 21, .frame = {.x = 260, .y = 0, .width = 50, .height = 50}}),
                },
            .boundaryActive = true,
        }),
    });
    auto configs = std::vector<AnimationConfig>{};
    for (auto tag : {10, 11, 20, 21}) {
      configs.push_back(animation({
          .tag = tag,
          .type = LayoutAnimationType::SHARED_ELEMENT_TRANSITION_NATIVE_ID,
          .name = "duplicate",
          .sharedTransitionTag = "duplicate",
      }));
    }

    timeline.configureAnimations({.at = 0ms, .animations = std::move(configs)});
    timeline.render({.at = 0ms, .tree = first});
    harness.clearCalls();
    timeline.render({.at = 10ms, .tree = second});

    ASSERT_FALSE(harness.starts().empty());
    ASSERT_FALSE(syntheticRootTags(harness).empty());
    settleStarts(harness, timeline, {.at = 20ms});
    EXPECT_TRUE(syntheticRootTags(harness).empty());
    for (auto tag : {10, 11, 20, 21}) {
      EXPECT_TRUE(harness.platform().hostTree().hasTag(tag));
    }
  }
}

#ifndef HARNESS_PLATFORM_ANDROID
HARNESS_TEST(
    LayoutAnimationScenariosTest,
    InteractiveSharedTransitionProgressesAndFinishes,
    .description =
        "An interactive shared transition must remain active until navigation reaches its terminal state. "
        "Early cleanup or missing completion leaves source and target visibility inconsistent.") {
  auto harness = AnimationHarness(DriverMode::IOS);
  auto timeline = AnimationTimeline(harness);
  timeline.configureAnimations({.at = 0ms, .animations = sharedConfigs(1)});
  timeline.render({.at = 0ms, .tree = sharedScreens(true, 1)});

  timeline.transitionProgress({
      .at = 10ms,
      .targetTag = 4,
      .progress = 0.1,
      .closing = false,
      .goingForward = false,
  });
  auto containers = syntheticRootTags(harness);
  ASSERT_EQ(containers.size(), 1);
  expectHostView(
      harness, {.tag = containers[0], .frame = Frame{.x = 0, .y = 0, .width = 24, .height = 24}, .opacity = 1});
  expectHostView(harness, {.tag = 100, .opacity = 0});
  expectHostView(harness, {.tag = 200, .opacity = 0});

  timeline.transitionProgress({
      .at = 20ms,
      .targetTag = 4,
      .progress = 0.5,
      .closing = false,
      .goingForward = false,
  });
  expectHostView(
      harness, {.tag = containers[0], .frame = Frame{.x = 150, .y = 100, .width = 26, .height = 26}, .opacity = 1});
  expectHostView(harness, {.tag = 100, .opacity = 0});
  expectHostView(harness, {.tag = 200, .opacity = 0});

  timeline.transitionProgress({
      .at = 30ms,
      .targetTag = 4,
      .progress = 1,
      .closing = false,
      .goingForward = false,
  });
  EXPECT_FALSE(harness.platform().hostTree().hasTag(containers[0]));
  expectHostView(harness, {.tag = 100, .frame = Frame{.x = 0, .y = 0, .width = 24, .height = 24}, .opacity = 0});
  expectHostView(harness, {.tag = 200, .frame = Frame{.x = 300, .y = 200, .width = 28, .height = 28}, .opacity = 1});
  EXPECT_TRUE(syntheticRootTags(harness).empty());
}

HARNESS_TEST(
    LayoutAnimationScenariosTest,
    InteractiveSharedTransitionUsesAbsoluteGeometryAtEveryProgress,
    .description =
        "Interactive interpolation must use root-space frames when shared views are nested. "
        "Parent-relative coordinates make the synthetic container jump and follow the wrong path.") {
  auto harness = AnimationHarness(DriverMode::IOS);
  auto timeline = AnimationTimeline(harness);
  timeline.configureAnimations({.at = 0ms, .animations = sharedConfigs(1)});
  timeline.render({.at = 0ms, .tree = nestedSharedGeometryScreens(true)});

  timeline.transitionProgress({
      .at = 10ms,
      .targetTag = 4,
      .progress = 0,
      .closing = false,
      .goingForward = false,
  });
  const auto containers = syntheticRootTags(harness);
  ASSERT_EQ(containers.size(), 1);
  const auto containerTag = containers[0];
  expectHostView(harness, {.tag = containerTag, .absoluteFrame = Frame{.x = 40, .y = 60, .width = 120, .height = 80}});
  expectHostView(harness, {.tag = 100, .opacity = 0});
  expectHostView(harness, {.tag = 200, .opacity = 0});

  struct ProgressFrame {
    double progress;
    Frame frame;
  };
  const auto progressFrames = std::array{
      ProgressFrame{
          .progress = 0.25,
          .frame = {.x = 200, .y = 170, .width = 150, .height = 105},
      },
      ProgressFrame{
          .progress = 0.5,
          .frame = {.x = 360, .y = 280, .width = 180, .height = 130},
      },
      ProgressFrame{
          .progress = 0.75,
          .frame = {.x = 520, .y = 390, .width = 210, .height = 155},
      },
  };

  auto time = 20ms;
  for (const auto &progressFrame : progressFrames) {
    timeline.transitionProgress({
        .at = time,
        .targetTag = 4,
        .progress = progressFrame.progress,
        .closing = false,
        .goingForward = false,
    });
    expectHostView(harness, {.tag = containerTag, .absoluteFrame = progressFrame.frame});
    expectHostView(harness, {.tag = 100, .opacity = 0});
    expectHostView(harness, {.tag = 200, .opacity = 0});
    time += 10ms;
  }

  timeline.transitionProgress({
      .at = time,
      .targetTag = 4,
      .progress = 1,
      .closing = false,
      .goingForward = false,
  });
  EXPECT_FALSE(harness.platform().hostTree().hasTag(containerTag));
  expectHostView(harness, {.tag = 200, .absoluteFrame = Frame{.x = 680, .y = 500, .width = 240, .height = 180}});
  expectHostView(harness, {.tag = 100, .opacity = 0});
  expectHostView(harness, {.tag = 200, .opacity = 1});
  EXPECT_TRUE(syntheticRootTags(harness).empty());
}

HARNESS_TEST(
    LayoutAnimationScenariosTest,
    CancellingInteractiveSharedTransitionRestoresBothSides,
    .description =
        "Cancelling interactive navigation must restore both original views and remove the synthetic container. "
        "Otherwise one side can remain hidden after the gesture reverses.") {
  auto harness = AnimationHarness(DriverMode::IOS);
  auto timeline = AnimationTimeline(harness);
  timeline.configureAnimations({.at = 0ms, .animations = sharedConfigs(1)});
  timeline.render({.at = 0ms, .tree = sharedScreens(true, 1)});

  timeline.transitionProgress({
      .at = 10ms,
      .targetTag = 4,
      .progress = 0.25,
      .closing = false,
      .goingForward = false,
  });
  auto containers = syntheticRootTags(harness);
  ASSERT_EQ(containers.size(), 1);

  timeline.cancelTransition({.at = 20ms, .sourceTag = 2});
  EXPECT_FALSE(harness.platform().hostTree().hasTag(containers[0]));
  expectHostView(harness, {.tag = 100, .frame = Frame{.x = 0, .y = 0, .width = 24, .height = 24}, .opacity = 1});
  expectHostView(harness, {.tag = 200, .frame = Frame{.x = 300, .y = 200, .width = 28, .height = 28}, .opacity = 1});
  EXPECT_TRUE(syntheticRootTags(harness).empty());
}
#endif

HARNESS_TEST(
    LayoutAnimationScenariosTest,
    AnimatedMountSideEffectCommitsAFollowUpTree,
    .description =
        "Native mounting can synchronously cause a React state commit. "
        "The proxy and platform driver must process the follow-up tree without losing or mounting the current transaction twice.") {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto timeline = AnimationTimeline(harness);
    auto followUp = snapshot({
        view({.tag = 2, .frame = {.x = 80, .y = 20, .width = 120, .height = 80}}),
        view({.tag = 3, .frame = {.x = 0, .y = 0, .width = 50, .height = 50}}),
    });
    auto onMount = mutationCallback([&] { harness.platform().commitFromMount(followUp); });

    timeline.configureAnimations({
        .at = 0ms,
        .animations =
            {
                animation({.tag = 2, .type = LayoutAnimationType::ENTERING, .name = "mount-enter"}),
                animation({.tag = 2, .type = LayoutAnimationType::LAYOUT, .name = "mount-layout"}),
                animation({.tag = 3, .type = LayoutAnimationType::ENTERING, .name = "follow-up-enter"}),
            },
    });
    timeline.render({
        .at = 0ms,
        .tree = snapshot({view({
            .tag = 2,
            .frame = {.x = 0, .y = 0, .width = 100, .height = 100},
            .effects = {.onMount = onMount},
        })}),
    });

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

    timeline.onUI({.at = 2ms, .task = {}});
    EXPECT_TRUE(harness.platform().hostTree().hasTag(3));
    expectHostView(harness, {.tag = 3, .opacity = 0});

    timeline.progress({.at = 4ms, .tag = 2, .style = finalStyle(*layoutStart)});
    settleStarts(harness, timeline, {.at = 6ms});
    const auto &frame = harness.platform().hostTree().getStubView(2).layoutMetrics.frame;
    EXPECT_EQ(frame.origin.x, 80);
    EXPECT_EQ(frame.origin.y, 20);
    EXPECT_EQ(frame.size.width, 120);
    EXPECT_EQ(frame.size.height, 80);
  }
}

HARNESS_TEST(
    LayoutAnimationScenariosTest,
    RapidReordersRetargetEveryMountedItem,
    .description =
        "Repeated list reorders retarget layout animations that are already running. "
        "Every mounted item must start from its current visual position, or spammy updates produce jumps and missed animations.") {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto timeline = AnimationTimeline(harness);
    auto tags = std::vector<Tag>{};
    for (Tag tag = 2; tag < 26; ++tag) {
      tags.push_back(tag);
    }

    timeline.configureAnimations({.at = 0ms, .animations = layoutConfigs(tags)});
    timeline.render({.at = 0ms, .tree = flatList(tags)});
    auto time = 10ms;
    for (int round = 1; round <= 100; ++round) {
      harness.clearCalls();
      std::rotate(tags.begin(), tags.begin() + (round % tags.size()), tags.end());
      if (round % 3 == 0) {
        std::reverse(tags.begin(), tags.end());
      }
      timeline.configureAnimations({.at = time, .animations = layoutConfigs(tags, "rapid-layout")});
      timeline.render({.at = time, .tree = flatList(tags, round)});
      ASSERT_EQ(harness.starts().size(), tags.size()) << "round " << round;
      auto startedTags = std::set<Tag>{};
      for (const auto &start : harness.starts()) {
        EXPECT_EQ(start.type, LayoutAnimationType::LAYOUT) << "round " << round;
        EXPECT_EQ(start.config, "rapid-layout") << "round " << round;
        startedTags.insert(start.tag);
      }
      EXPECT_EQ(startedTags, std::set<Tag>(tags.begin(), tags.end())) << "round " << round;
      settleStarts(harness, timeline, {.at = time + 2ms});
      time += 4ms;
    }

    const auto &children = harness.platform().hostTree().getRootStubView().children;
    ASSERT_EQ(children.size(), tags.size());
    for (size_t index = 0; index < tags.size(); ++index) {
      EXPECT_EQ(children[index]->tag, tags[index]);
    }
  }
}

HARNESS_TEST(
    LayoutAnimationStressTest,
    MixedListChurnOverlapsEnteringLayoutAndExiting,
    .description =
        "Real lists overlap insertions, moves, and removals before prior animations settle. "
        "The proxy must start every requested type and converge to the exact host order without stale views.") {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto timeline = AnimationTimeline(harness);
    auto tags = std::vector<Tag>{};
    for (Tag tag = 2; tag < 20; ++tag) {
      tags.push_back(tag);
    }

    timeline.render({.at = 0ms, .tree = flatList(tags)});
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
        configs.push_back(animation({.tag = tag, .type = LayoutAnimationType::EXITING, .name = "list-exit"}));
      }
      for (auto tag : added) {
        configs.push_back(animation({.tag = tag, .type = LayoutAnimationType::ENTERING, .name = "list-enter"}));
      }
      auto expectedFirstLayout = std::set<Tag>{};
      for (size_t index = 0; index < tags.size(); ++index) {
        if (harness.platform().hostTree().hasTag(tags[index]) &&
            hostGeometry(harness, tags[index]) != flatListFrame(index, round)) {
          expectedFirstLayout.insert(tags[index]);
        }
      }

      harness.clearCalls();
      timeline.configureAnimations({.at = time, .animations = std::move(configs)});
      timeline.render({.at = time, .tree = flatList(tags, round)});
      for (auto tag : removed) {
        ASSERT_NE(findStart(harness, tag, LayoutAnimationType::EXITING), nullptr) << "round " << round;
        EXPECT_TRUE(harness.platform().hostTree().hasTag(tag)) << "round " << round;
      }
      for (auto tag : added) {
        ASSERT_NE(findStart(harness, tag, LayoutAnimationType::ENTERING), nullptr) << "round " << round;
        expectHostView(harness, {.tag = tag, .opacity = 0});
      }
      EXPECT_EQ(startTags(harness, LayoutAnimationType::LAYOUT), expectedFirstLayout) << "round " << round;
      EXPECT_EQ(harness.starts().size(), expectedFirstLayout.size() + removed.size() + added.size())
          << "round " << round;

      auto firstStarts = harness.starts();
      timeline.onUI({
          .at = time + 2ms,
          .task =
              [&] {
                for (const auto &start : firstStarts) {
                  harness.progress(start.tag, finalStyle(start));
                }
              },
      });

      std::reverse(tags.begin(), tags.end());
      auto expectedSecondLayout = std::set<Tag>{};
      for (size_t index = 0; index < tags.size(); ++index) {
        if (hostGeometry(harness, tags[index]) != flatListFrame(index, round + 1)) {
          expectedSecondLayout.insert(tags[index]);
        }
      }
      const auto secondStartIndex = harness.starts().size();
      timeline.configureAnimations({.at = time + 4ms, .animations = layoutConfigs(tags, "list-retarget")});
      timeline.render({.at = time + 4ms, .tree = flatList(tags, round + 1)});
      EXPECT_EQ(startTags(harness, LayoutAnimationType::LAYOUT, secondStartIndex), expectedSecondLayout)
          << "round " << round;
      EXPECT_EQ(harness.starts().size() - secondStartIndex, expectedSecondLayout.size()) << "round " << round;
      settleStarts(harness, timeline, {.at = time + 6ms});

      const auto &children = harness.platform().hostTree().getRootStubView().children;
      ASSERT_EQ(children.size(), tags.size()) << "round " << round;
      for (size_t index = 0; index < tags.size(); ++index) {
        EXPECT_EQ(children[index]->tag, tags[index]) << "round " << round;
        expectHostView(
            harness,
            {
                .tag = tags[index],
                .frame = flatListFrame(index, round + 1),
                .opacity = 1,
            });
      }
      time += 10ms;
    }
  }
}

HARNESS_TEST(
    LayoutAnimationStressTest,
    RecycledTagsReplaceStillExitingInstances,
    .description =
        "Virtualized lists can reuse native tags before old exits finish. "
        "Each ShadowNodeFamily must replace old ownership cleanly so stale cleanup cannot delete the new cell.") {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto timeline = AnimationTimeline(harness);
    timeline.render({
        .at = 0ms,
        .tree = snapshot({view({
            .tag = 2,
            .frame = {.x = 0, .y = 0, .width = 100, .height = 100},
            .generation = 0,
        })}),
    });

    auto time = 10ms;
    for (uint32_t generation = 1; generation <= 150; ++generation) {
      harness.clearCalls();
      timeline.configureAnimations({
          .at = time,
          .animations = {animation({
              .tag = 2,
              .type = LayoutAnimationType::EXITING,
              .name = "recycled-exit",
          })},
      });
      timeline.render({.at = time, .tree = {}});
      ASSERT_NE(findStart(harness, 2, LayoutAnimationType::EXITING), nullptr) << generation;

      harness.clearCalls();
      timeline.configureAnimations({
          .at = time + 2ms,
          .animations = {animation({
              .tag = 2,
              .type = LayoutAnimationType::ENTERING,
              .name = "recycled-enter",
          })},
      });
      timeline.render({
          .at = time + 2ms,
          .tree = snapshot({view({
              .tag = 2,
              .frame =
                  {
                      .x = static_cast<float>(generation % 30),
                      .y = 0,
                      .width = 100,
                      .height = 100,
                  },
              .generation = generation,
          })}),
      });

      const auto *start = findStart(harness, 2, LayoutAnimationType::ENTERING);
      ASSERT_NE(start, nullptr) << generation;
      EXPECT_EQ(start->config, "recycled-enter") << generation;
      EXPECT_TRUE(harness.platform().hostTree().hasTag(2)) << generation;
      EXPECT_EQ(harness.platform().hostTree().getRootStubView().children.size(), 1) << generation;
      expectHostView(
          harness,
          {.tag = 2,
           .frame = Frame{.x = static_cast<float>(generation % 30), .y = 0, .width = 100, .height = 100},
           .opacity = 0});
      settleStarts(harness, timeline, {.at = time + 4ms});
      expectHostView(
          harness,
          {.tag = 2,
           .frame = Frame{.x = static_cast<float>(generation % 30), .y = 0, .width = 100, .height = 100},
           .opacity = 1});
      time += 7ms;
    }
  }
}

HARNESS_TEST(
    LayoutAnimationCrashRegressionTest,
    InterruptedExitsAreCancelledBeforeBlockedUIWorkRuns,
    .description =
        "Android can queue an animation start while the UI lane is blocked and React removes the same view. "
        "The cancelled start must not revive the removed view or access stale native state when the lane resumes.") {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto timeline = AnimationTimeline(harness);
    auto time = 0ms;

    for (uint32_t generation = 0; generation < 60; ++generation) {
      timeline.setShouldAnimateExiting({.at = time, .tag = 2, .animate = false});
      timeline.configureAnimations({
          .at = time,
          .animations = {animation({
              .tag = 3,
              .type = LayoutAnimationType::EXITING,
              .name = "blocked-exit",
          })},
      });
      timeline.render({
          .at = time,
          .tree = snapshot({view({
              .tag = 2,
              .frame = {.x = 0, .y = 0, .width = 200, .height = 120},
              .children = {view({
                  .tag = 3,
                  .frame = {.x = 50, .y = 10, .width = 90, .height = 90},
                  .generation = generation,
              })},
              .generation = generation,
          })}),
      });
      harness.clearCalls();

      auto release = time + 10ms;
      harness.timeline().busyUntil(Lane::UI, release);
      harness.timeline().at(time + 2ms, Lane::JS, [&, generation] {
        harness.render(snapshot({view({
            .tag = 2,
            .frame = {.x = 0, .y = 0, .width = 200, .height = 120},
            .generation = generation,
        })}));
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
HARNESS_TEST(
    LayoutAnimationCrashRegressionTest,
    UICleanupCannotOvertakeAPausedJSMountSchedule,
    .description =
        "Android can pull cleanup on the UI thread before a paused JavaScript mount reaches Java. "
        "Structural cleanup must wait, or the host receives removal before the earlier insert and crashes, as fixed by GitHub #10372.",
    .githubIssues = {10372}) {
  auto harness = AnimationHarness(DriverMode::AndroidPush);
  auto timeline = AnimationTimeline(harness);
  auto tags = std::vector<Tag>{};
  for (Tag tag = 10; tag < 22; ++tag) {
    tags.push_back(tag);
  }
  timeline.render({.at = 0ms, .tree = flatList(tags)});

  tags.erase(tags.begin(), tags.begin() + 2);
  tags.push_back(22);
  tags.push_back(23);
  timeline.configureAnimations({
      .at = 10ms,
      .animations =
          {
              animation({.tag = 10, .type = LayoutAnimationType::EXITING, .name = "short-exit"}),
              animation({.tag = 11, .type = LayoutAnimationType::EXITING, .name = "short-exit"}),
          },
  });
  timeline.render({.at = 10ms, .tree = flatList(tags)});
  ASSERT_NE(findStart(harness, 10, LayoutAnimationType::EXITING), nullptr);
  ASSERT_NE(findStart(harness, 11, LayoutAnimationType::EXITING), nullptr);
  harness.clearCalls();

  tags.erase(tags.begin(), tags.begin() + 2);
  tags.push_back(24);
  tags.push_back(25);
  harness.timeline().at(20ms, Lane::JS, [&] {
    harness.platform().pauseNextAndroidMountSchedule();
    harness.configureAnimations({
        animation({.tag = 12, .type = LayoutAnimationType::EXITING, .name = "short-exit"}),
        animation({.tag = 13, .type = LayoutAnimationType::EXITING, .name = "short-exit"}),
    });
    harness.render(flatList(tags));
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

HARNESS_TEST(
    LayoutAnimationStressTest,
    BusyMainLanePreservesPlatformSpecificPullAccumulation,
    .description =
        "Busy UI periods cause many JavaScript commits to accumulate differently on each platform. "
        "The driver must preserve real pull and mount boundaries so stress results represent device behavior.") {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto timeline = AnimationTimeline(harness);
    auto tags = std::vector<Tag>{};
    for (Tag tag = 2; tag < 18; ++tag) {
      tags.push_back(tag);
    }
    timeline.render({.at = 0ms, .tree = flatList(tags)});
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
          [&, snapshot = std::move(snapshot), configs = std::move(configs)] {
            harness.configureAnimations(configs);
            harness.render(snapshot);
          });
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
    settleStarts(harness, timeline, {.at = 251ms});

    const auto &children = harness.platform().hostTree().getRootStubView().children;
    ASSERT_EQ(children.size(), tags.size());
    for (size_t index = 0; index < tags.size(); ++index) {
      EXPECT_EQ(children[index]->tag, tags[index]);
    }
  }
}

HARNESS_TEST(
    LayoutAnimationStressTest,
    SixtyViewBurstsInterruptEnteringWithExiting,
    .description =
        "Large mount-and-remove bursts can interrupt entering animations before their first frame. "
        "The proxy must cancel every start and remove every view without leaking host nodes or active animations.") {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto timeline = AnimationTimeline(harness);
    auto time = 0ms;

    for (uint32_t burst = 0; burst < 20; ++burst) {
      auto children = std::vector<ViewSpec>{};
      auto entering = std::vector<AnimationConfig>{};
      auto exiting = std::vector<AnimationConfig>{};
      for (Tag index = 0; index < 60; ++index) {
        auto tag = 100 + index;
        children.push_back(view({
            .tag = tag,
            .frame =
                {
                    .x = static_cast<float>((index % 15) * 6),
                    .y = static_cast<float>((index / 15) * 6),
                    .width = 4,
                    .height = 4,
                },
            .generation = burst,
        }));
        entering.push_back(animation({.tag = tag, .type = LayoutAnimationType::ENTERING, .name = "spike-enter"}));
        exiting.push_back(animation({.tag = tag, .type = LayoutAnimationType::EXITING, .name = "spike-exit"}));
      }

      timeline.configureAnimations({.at = time, .animations = std::move(entering)});
      timeline.render({.at = time, .tree = snapshot(std::move(children))});
      ASSERT_EQ(harness.starts().size(), 60) << burst;
      auto startedTags = std::set<Tag>{};
      for (const auto &start : harness.starts()) {
        EXPECT_EQ(start.type, LayoutAnimationType::ENTERING) << burst;
        EXPECT_EQ(start.config, "spike-enter") << burst;
        startedTags.insert(start.tag);
        expectHostView(harness, {.tag = start.tag, .opacity = 0});
      }
      EXPECT_EQ(startedTags.size(), 60) << burst;
      harness.clearCalls();
      timeline.configureAnimations({.at = time + 2ms, .animations = std::move(exiting)});
      timeline.render({.at = time + 2ms, .tree = {}});
      ASSERT_EQ(harness.starts().size(), 60) << burst;
      startedTags.clear();
      for (const auto &start : harness.starts()) {
        EXPECT_EQ(start.type, LayoutAnimationType::EXITING) << burst;
        EXPECT_EQ(start.config, "spike-exit") << burst;
        startedTags.insert(start.tag);
        EXPECT_TRUE(harness.platform().hostTree().hasTag(start.tag)) << burst;
      }
      EXPECT_EQ(startedTags.size(), 60) << burst;
      settleStarts(harness, timeline, {.at = time + 4ms});

      EXPECT_EQ(harness.platform().hostTree().size(), 1) << burst;
      time += 7ms;
    }
  }
}

HARNESS_TEST(
    LayoutAnimationStressTest,
    ManySharedTagsToggleBetweenBoundaries,
    .description =
        "Screens can switch many shared elements at once. "
        "Pairing, opacity, and container cleanup must remain correct for every tag across repeated boundary changes.") {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto timeline = AnimationTimeline(harness);
    timeline.configureAnimations({.at = 0ms, .animations = sharedConfigs(24)});
    timeline.render({.at = 0ms, .tree = sharedScreens(true, 24)});

    auto firstActive = true;
    auto time = 10ms;
    for (int round = 1; round <= 40; ++round) {
      firstActive = !firstActive;
      harness.clearCalls();
      timeline.render({.at = time, .tree = sharedScreens(firstActive, 24, round)});

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
      settleStarts(harness, timeline, {.at = time + 2ms});
      EXPECT_TRUE(syntheticRootTags(harness).empty()) << round;
      for (int index = 0; index < 24; ++index) {
        ASSERT_FLOAT_EQ(hostOpacity(harness, firstActive ? 200 + index : 100 + index), 0) << round;
        ASSERT_FLOAT_EQ(hostOpacity(harness, firstActive ? 100 + index : 200 + index), 1) << round;
      }
      time += 5ms;
    }
  }
}

HARNESS_TEST(
    LayoutAnimationStressTest,
    SharedTransitionRetargetsBeforeItSettles,
    .description =
        "Navigation can reverse while a shared transition remains active. "
        "Retargeting must replace container state without exposing original views or leaving synthetic containers behind.") {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto timeline = AnimationTimeline(harness);
    timeline.configureAnimations({.at = 0ms, .animations = sharedConfigs(1)});
    timeline.render({.at = 0ms, .tree = sharedScreens(true, 1)});

    auto firstActive = true;
    auto time = 10ms;
    Tag containerTag = 0;
    std::optional<Frame> mountedFrame;
    for (int round = 1; round <= 80; ++round) {
      firstActive = !firstActive;
      harness.clearCalls();
      timeline.render({.at = time, .tree = sharedScreens(firstActive, 1, round)});
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
      timeline.progress({
          .at = time + 2ms,
          .tag = containerTag,
          .style =
              {
                  .x = mountedFrame->x,
                  .y = mountedFrame->y,
                  .width = mountedFrame->width,
                  .height = mountedFrame->height,
                  .opacity = 1,
              },
      });
      expectHostView(harness, {.tag = containerTag, .frame = *mountedFrame, .opacity = 1});
      time += 5ms;
    }

    settleStarts(harness, timeline, {.at = time});
    EXPECT_FALSE(harness.platform().hostTree().hasTag(containerTag));
    EXPECT_TRUE(syntheticRootTags(harness).empty());
    expectHostView(harness, {.tag = firstActive ? 200 : 100, .opacity = 0});
    expectHostView(harness, {.tag = firstActive ? 100 : 200, .opacity = 1});
  }
}

HARNESS_TEST(
    LayoutAnimationStressTest,
    NestedChurnChangesFlatteningWhileChildrenEnterAndExit,
    .description =
        "Flattening and nested enter, exit, and layout changes can overlap under rapid renders. "
        "Mutation ordering must keep the host hierarchy valid while every requested animation starts.") {
  for (auto mode : platformModes()) {
    SCOPED_TRACE(static_cast<int>(mode));
    auto harness = AnimationHarness(mode);
    auto timeline = AnimationTimeline(harness);
    auto visible = std::array<bool, 24>{};
    visible.fill(true);
    auto generations = std::array<uint32_t, 24>{};

    auto treeAtRound = [&](int round) {
      auto groups = std::vector<ViewSpec>{};
      for (int group = 0; group < 3; ++group) {
        auto children = std::vector<ViewSpec>{};
        for (int index = 0; index < 8; ++index) {
          auto item = group * 8 + index;
          if (!visible[item]) {
            continue;
          }
          children.push_back(view({
              .tag = 100 + item,
              .frame =
                  {
                      .x = static_cast<float>((index % 4) * 35 + round % 9),
                      .y = static_cast<float>((index / 4) * 35),
                      .width = static_cast<float>(28 + round % 4),
                      .height = 28,
                  },
              .generation = generations[item],
          }));
        }
        groups.push_back(view({
            .tag = 10 + group,
            .frame =
                {
                    .x = static_cast<float>(group * 260),
                    .y = 0,
                    .width = 240,
                    .height = 100,
                },
            .children = std::move(children),
            .collapsable = (round + group) % 2 == 0,
            .hasNativeId = false,
        }));
      }
      return snapshot(std::move(groups));
    };

    timeline.render({.at = 0ms, .tree = treeAtRound(0)});
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
          configs.push_back(
              animation({.tag = 100 + item, .type = LayoutAnimationType::EXITING, .name = "nested-exit"}));
        } else {
          ++generations[item];
          configs.push_back(
              animation({.tag = 100 + item, .type = LayoutAnimationType::ENTERING, .name = "nested-enter"}));
        }
        visible[item] = !visible[item];
      }
      for (int item = 0; item < 24; ++item) {
        if (visible[item] && std::find(changed.begin(), changed.end(), item) == changed.end()) {
          configs.push_back(
              animation({.tag = 100 + item, .type = LayoutAnimationType::LAYOUT, .name = "nested-layout"}));
        }
      }

      harness.clearCalls();
      timeline.configureAnimations({.at = time, .animations = std::move(configs)});
      timeline.render({.at = time, .tree = treeAtRound(round)});
      auto expectedLayoutTags = std::set<Tag>{};
      for (int item = 0; item < 24; ++item) {
        if (visible[item] && std::find(changed.begin(), changed.end(), item) == changed.end()) {
          expectedLayoutTags.insert(100 + item);
        }
      }
      EXPECT_EQ(startTags(harness, LayoutAnimationType::LAYOUT), expectedLayoutTags) << round;
      EXPECT_EQ(harness.starts().size(), expectedLayoutTags.size() + changed.size()) << round;
      for (int group = 0; group < 3; ++group) {
        const auto tag = 100 + changed[group];
        const auto type = wasVisible[group] ? LayoutAnimationType::EXITING : LayoutAnimationType::ENTERING;
        const auto *start = findStart(harness, tag, type);
        ASSERT_NE(start, nullptr) << round << ':' << tag;
        EXPECT_EQ(start->config, wasVisible[group] ? "nested-exit" : "nested-enter");
        if (wasVisible[group]) {
          EXPECT_TRUE(harness.platform().hostTree().hasTag(tag)) << round << ':' << tag;
        } else {
          expectHostView(harness, {.tag = tag, .opacity = 0});
        }
      }
      settleStarts(harness, timeline, {.at = time + 2ms});

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
        expectHostView(
            harness,
            {
                .tag = 100 + item,
                .frame =
                    Frame{
                        .x = static_cast<float>((flattened ? group * 260 : 0) + (index % 4) * 35 + round % 9),
                        .y = static_cast<float>((index / 4) * 35),
                        .width = static_cast<float>(28 + round % 4),
                        .height = 28,
                    },
            });
      }
      time += 5ms;
    }
  }
}

} // namespace reanimated::layout_animation::test
