#include <reanimated/LayoutAnimations/ActiveNativeLayoutCommands.h>

#include <cassert>
#include <functional>
#include <iostream>
#include <vector>

using namespace reanimated;
using namespace reanimated::native_animation;

namespace {

struct TestCommand {
  AnimationHandle handle;
  std::vector<AnimationTarget> targets;
  bool admissionGranted{false};
};

using Commands = ActiveNativeLayoutCommands<TestCommand>;

void testOneViewKeepsEveryHandle() {
  Commands commands;
  const AnimationHandle first{1, 10, AnimationOwner::Layout, 1};
  const AnimationHandle second{1, 10, AnimationOwner::Layout, 2};
  commands.insert({first, {{AnimationTargetKind::PositionX}, {AnimationTargetKind::Opacity}}});
  commands.insert({second, {{AnimationTargetKind::PositionX}}});

  // A record claims a target only after the service admitted it.
  assert(!commands.claims(1, 10, {AnimationTargetKind::Opacity}));
  commands.find(first)->admissionGranted = true;
  assert(commands.find(first) != nullptr);
  assert(commands.find(second) != nullptr);
  assert(commands.claims(1, 10, {AnimationTargetKind::Opacity}));
  assert(commands.claims(1, 10, {AnimationTargetKind::Position}));
  assert(!commands.claims(1, 10, {AnimationTargetKind::Width}));
  assert(!commands.claims(2, 10, {AnimationTargetKind::Opacity}));

  const auto taken = commands.take(second);
  assert(taken && taken->handle == second);
  assert(commands.find(second) == nullptr);
  assert(commands.find(first) != nullptr);
  assert(!commands.take(second));
}

void testHandlesForTagSurviveErasureDuringCancel() {
  Commands commands;
  const AnimationHandle first{1, 10, AnimationOwner::Layout, 1};
  const AnimationHandle second{1, 10, AnimationOwner::Layout, 2};
  const AnimationHandle other{1, 11, AnimationOwner::Layout, 3};
  commands.insert({first, {{AnimationTargetKind::Opacity}}});
  commands.insert({second, {{AnimationTargetKind::PositionX}}});
  commands.insert({other, {{AnimationTargetKind::Opacity}}});

  // An inline terminal result erases the record of the handle it cancels.
  std::vector<AnimationHandle> cancelled;
  const auto cancel = [&](const AnimationHandle &handle) {
    cancelled.push_back(handle);
    commands.take(handle);
  };
  for (const auto &handle : commands.handlesForTag(10)) {
    cancel(handle);
  }
  assert(cancelled.size() == 2);
  assert(commands.find(first) == nullptr && commands.find(second) == nullptr);
  assert(commands.find(other) != nullptr);
  assert(commands.handlesForTag(10).empty());
}

void testFindGivesMutableAccess() {
  Commands commands;
  const AnimationHandle handle{1, 10, AnimationOwner::Layout, 1};
  commands.insert({handle, {{AnimationTargetKind::Opacity}}});
  commands.find(handle)->admissionGranted = true;
  assert(commands.take(handle)->admissionGranted);
  assert(commands.empty());
}

} // namespace

void runActiveNativeLayoutCommandsTests() {
  testOneViewKeepsEveryHandle();
  testHandlesForTagSurviveErasureDuringCancel();
  testFindGivesMutableAccess();
  std::cout << "ActiveNativeLayoutCommandsTest passed\n";
}
