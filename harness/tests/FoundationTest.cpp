#include <gtest/gtest.h>

#include <algorithm>
#include <chrono>
#include <string>
#include <vector>

#include <harness/Choreographer.h>
#include <harness/PlatformDriver.h>
#include <harness/TestMetadata.h>
#include <harness/Tree.h>

namespace reanimated::layout_animation::test {

using namespace std::chrono_literals;

namespace {

Snapshot firstSnapshot(MutationEffects effects = {}) {
  return snapshot({
      view({
          .tag = 2,
          .frame = {.x = 0, .y = 0, .width = 100, .height = 100},
          .effects = std::move(effects),
      }),
  });
}

Snapshot secondSnapshot() {
  return snapshot({
      view({.tag = 2, .frame = {.x = 10, .y = 20, .width = 120, .height = 80}}),
      view({.tag = 3, .frame = {.x = 150, .y = 0, .width = 50, .height = 50}}),
  });
}

std::vector<facebook::react::Tag> updatedTagsSince(const PlatformDriver &driver, size_t frameIndex) {
  auto tags = std::vector<facebook::react::Tag>{};
  const auto &frames = driver.mountedFrames();
  for (; frameIndex < frames.size(); ++frameIndex) {
    for (const auto &mutation : frames[frameIndex].mutations) {
      if (mutation.type == "update") {
        tags.push_back(mutation.tag);
      }
    }
  }
  return tags;
}

} // namespace

HARNESS_TEST(
    ChoreographerTest,
    DelaysOnlyTheBusyLane,
    .description =
        "Virtual lanes must preserve independent availability. "
        "A blocked UI lane must not delay JavaScript work, or timing tests would model false interleavings.") {
  auto choreographer = Choreographer{};
  auto order = std::vector<Lane>{};

  choreographer.busyUntil(Lane::UI, 10ms);
  choreographer.at(0ms, Lane::UI, [&] { order.push_back(Lane::UI); });
  choreographer.at(5ms, Lane::JS, [&] { order.push_back(Lane::JS); });
  choreographer.advanceTo(10ms);

  EXPECT_EQ(order, (std::vector{Lane::JS, Lane::UI}));
  EXPECT_EQ(choreographer.now(), 10ms);
  EXPECT_EQ(choreographer.pendingTaskCount(), 0);
}

HARNESS_TEST(
    PlatformDriverTest,
    AndroidModesAccumulateUntilAFrame,
    .description =
        "Android does not mount every React revision immediately. "
        "The driver must coalesce pending work until a frame, or race tests would use mount orders that devices cannot produce.") {
  for (auto mode : {DriverMode::AndroidPush, DriverMode::AndroidPull}) {
    SCOPED_TRACE(mode == DriverMode::AndroidPush ? "push" : "pull");
    auto choreographer = Choreographer{};
    auto driver = PlatformDriver(choreographer, mode);

    choreographer.at(0ms, Lane::JS, [&] { driver.render(firstSnapshot()); });
    choreographer.at(5ms, Lane::JS, [&] { driver.render(secondSnapshot()); });
    choreographer.at(16ms, Lane::UI, [&] { driver.frame(); });
    choreographer.advanceTo(16ms);

    EXPECT_TRUE(driver.hostTree().hasTag(2));
    EXPECT_TRUE(driver.hostTree().hasTag(3));
    EXPECT_EQ(driver.hostTree().size(), 3);
    EXPECT_EQ(driver.mountedTransactionNumbers().size(), 1);

    auto logs = driver.takeMountingLogs();
    auto creates =
        std::count_if(logs.begin(), logs.end(), [](const std::string &log) { return log.starts_with("Create"); });
    auto deletes =
        std::count_if(logs.begin(), logs.end(), [](const std::string &log) { return log.starts_with("Delete"); });
    EXPECT_EQ(creates, 2);
    EXPECT_EQ(deletes, 0);
  }
}

HARNESS_TEST(
    PlatformDriverTest,
    IOSCoalescesWhileTheMainLaneIsBusy,
    .description =
        "iOS pulls transactions on the main thread after JavaScript commits. "
        "A busy main lane must coalesce revisions, or the harness would expose intermediate transactions that devices do not mount.") {
  auto choreographer = Choreographer{};
  auto driver = PlatformDriver(choreographer, DriverMode::IOS);

  choreographer.busyUntil(Lane::UI, 10ms);
  choreographer.at(0ms, Lane::JS, [&] { driver.render(firstSnapshot()); });
  choreographer.at(5ms, Lane::JS, [&] { driver.render(secondSnapshot()); });
  choreographer.advanceTo(10ms);

  EXPECT_TRUE(driver.hostTree().hasTag(2));
  EXPECT_TRUE(driver.hostTree().hasTag(3));
  EXPECT_EQ(driver.hostTree().size(), 3);
  EXPECT_EQ(driver.mountedTransactionNumbers().size(), 1);
}

HARNESS_TEST(
    PlatformDriverTest,
    AndroidDefersAReentrantMountUntilTheNextFrame,
    .description =
        "A mount callback can synchronously commit on Android. "
        "The nested mount item must wait for the next dispatcher pass, or the simulated host order would differ from Fabric.") {
  auto choreographer = Choreographer{};
  auto driver = PlatformDriver(choreographer, DriverMode::AndroidPush);
  auto nestedSnapshot = secondSnapshot();
  auto onMount = mutationCallback([&] { driver.commitFromMount(nestedSnapshot); });

  choreographer.at(0ms, Lane::JS, [&] { driver.render(firstSnapshot({.onMount = onMount})); });
  choreographer.at(16ms, Lane::UI, [&] { driver.frame(); });
  choreographer.advanceTo(16ms);

  EXPECT_TRUE(driver.hostTree().hasTag(2));
  EXPECT_FALSE(driver.hostTree().hasTag(3));
  EXPECT_EQ(driver.mountedTransactionNumbers().size(), 1);

  choreographer.at(32ms, Lane::UI, [&] { driver.frame(); });
  choreographer.advanceTo(32ms);

  EXPECT_TRUE(driver.hostTree().hasTag(3));
  EXPECT_EQ(driver.mountedTransactionNumbers().size(), 2);
}

HARNESS_TEST(
    PlatformDriverTest,
    IOSMountsAReentrantCommitInTheFollowUpLoop,
    .description =
        "iOS handles a commit raised during mounting in the same transaction loop. "
        "The driver must perform the follow-up pull before returning, or its reentrancy model would be invalid.") {
  auto choreographer = Choreographer{};
  auto driver = PlatformDriver(choreographer, DriverMode::IOS);
  auto nestedSnapshot = secondSnapshot();
  auto onMount = mutationCallback([&] { driver.commitFromMount(nestedSnapshot); });

  choreographer.at(0ms, Lane::JS, [&] { driver.render(firstSnapshot({.onMount = onMount})); });
  choreographer.advanceTo(0ms);

  EXPECT_TRUE(driver.hostTree().hasTag(2));
  EXPECT_TRUE(driver.hostTree().hasTag(3));
  EXPECT_EQ(driver.mountedTransactionNumbers().size(), 2);
}

HARNESS_TEST(
    PlatformDriverTest,
    RecordsMountedHostFrames,
    .description =
        "Dashboard traces must describe the host tree after a mounted transaction. "
        "Missing geometry, properties, or mutations would make visual inspection misleading.") {
  auto choreographer = Choreographer{};
  auto driver = PlatformDriver(choreographer, DriverMode::IOS);

  choreographer.at(12ms, Lane::JS, [&] { driver.render(secondSnapshot()); });
  choreographer.advanceTo(12ms);

  ASSERT_EQ(driver.mountedFrames().size(), 1);
  const auto &frame = driver.mountedFrames().front();
  EXPECT_EQ(frame.time, 12);
  ASSERT_EQ(frame.root.children.size(), 2);
  EXPECT_EQ(frame.root.children[0].tag, 2);
  EXPECT_EQ(frame.root.children[0].frame.x, 10);
  EXPECT_EQ(frame.root.children[0].frame.y, 20);
  EXPECT_EQ(frame.root.children[0].frame.width, 120);
  EXPECT_EQ(frame.root.children[0].frame.height, 80);
  EXPECT_EQ(frame.root.children[0].opacity, 1);
  EXPECT_EQ(frame.root.children[0].display, "flex");
  EXPECT_FALSE(frame.mutations.empty());
}

HARNESS_TEST(
    PlatformDriverTest,
    ReusesUnchangedNodesAndAncestorProps,
    .description =
        "React preserves node and property identity when a view's own data is unchanged. "
        "Synthetic ancestor updates would start animations that a production render would not start.") {
  auto choreographer = Choreographer{};
  auto driver = PlatformDriver(choreographer, DriverMode::IOS);
  auto initial = snapshot({view({
      .tag = 2,
      .frame = {.x = 0, .y = 0, .width = 200, .height = 200},
      .children = {view({
          .tag = 3,
          .frame = {.x = 10, .y = 10, .width = 50, .height = 50},
      })},
  })});

  choreographer.at(0ms, Lane::JS, [&] { driver.render(initial); });
  choreographer.advanceTo(0ms);
  auto frameIndex = driver.mountedFrames().size();

  choreographer.at(1ms, Lane::JS, [&] { driver.render(initial); });
  choreographer.advanceTo(1ms);
  EXPECT_TRUE(updatedTagsSince(driver, frameIndex).empty());
  frameIndex = driver.mountedFrames().size();

  choreographer.at(2ms, Lane::JS, [&] {
    driver.render(snapshot({view({
        .tag = 2,
        .frame = {.x = 0, .y = 0, .width = 200, .height = 200},
        .children = {view({
            .tag = 3,
            .frame = {.x = 20, .y = 10, .width = 50, .height = 50},
        })},
    })}));
  });
  choreographer.advanceTo(2ms);
  EXPECT_EQ(updatedTagsSince(driver, frameIndex), (std::vector<facebook::react::Tag>{3}));
  const auto &mutations = driver.mountedFrames().back().mutations;
  const auto update = std::find_if(mutations.begin(), mutations.end(), [](const auto &mutation) {
    return mutation.type == "update" && mutation.tag == 3;
  });
  ASSERT_NE(update, mutations.end());
  ASSERT_TRUE(update->before);
  ASSERT_TRUE(update->after);
  EXPECT_EQ(update->before->frame.x, 10);
  EXPECT_EQ(update->after->frame.x, 20);
}

HARNESS_TEST(
    PlatformDriverTest,
    BoundaryUpdatesDoNotUpdateUnchangedDescendants,
    .description =
        "Changing a shared-transition boundary must not replace unchanged descendants. "
        "A synthetic descendant update can overwrite hidden opacity and conceal a proxy regression.") {
  auto choreographer = Choreographer{};
  auto driver = PlatformDriver(choreographer, DriverMode::IOS);

  choreographer.at(0ms, Lane::JS, [&] {
    driver.render(snapshot({sharedTransitionBoundary({
        .tag = 2,
        .children = {view({
            .tag = 3,
            .frame = {.x = 10, .y = 10, .width = 50, .height = 50},
        })},
        .boundaryActive = true,
    })}));
  });
  choreographer.advanceTo(0ms);
  const auto frameIndex = driver.mountedFrames().size();

  choreographer.at(1ms, Lane::JS, [&] {
    driver.render(snapshot({sharedTransitionBoundary({
        .tag = 2,
        .children = {view({
            .tag = 3,
            .frame = {.x = 10, .y = 10, .width = 50, .height = 50},
        })},
        .boundaryActive = false,
    })}));
  });
  choreographer.advanceTo(1ms);

  const auto updates = updatedTagsSince(driver, frameIndex);
  EXPECT_NE(std::find(updates.begin(), updates.end(), 2), updates.end());
  EXPECT_EQ(std::find(updates.begin(), updates.end(), 3), updates.end());
}

} // namespace reanimated::layout_animation::test
