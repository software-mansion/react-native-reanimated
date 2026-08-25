#include <gtest/gtest.h>

#include <algorithm>
#include <chrono>
#include <string>
#include <vector>

#include <harness/Choreographer.h>
#include <harness/PlatformDriver.h>
#include <harness/Tree.h>

namespace reanimated::layout_animation::test {

using namespace std::chrono_literals;

namespace {

Snapshot firstSnapshot(MutationEffects effects = {}) {
  return Snapshot{{
      view(2, {0, 0, 100, 100}, {}, std::move(effects)),
  }};
}

Snapshot secondSnapshot() {
  return Snapshot{{
      view(2, {10, 20, 120, 80}),
      view(3, {150, 0, 50, 50}),
  }};
}

} // namespace

TEST(ChoreographerTest, DelaysOnlyTheBusyLane) {
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

TEST(PlatformDriverTest, AndroidModesAccumulateUntilAFrame) {
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

TEST(PlatformDriverTest, IOSCoalescesWhileTheMainLaneIsBusy) {
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

TEST(PlatformDriverTest, AndroidDefersAReentrantMountUntilTheNextFrame) {
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

TEST(PlatformDriverTest, IOSMountsAReentrantCommitInTheFollowUpLoop) {
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

} // namespace reanimated::layout_animation::test
