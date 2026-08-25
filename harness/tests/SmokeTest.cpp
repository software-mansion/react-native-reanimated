#include <gtest/gtest.h>

#include <react/renderer/mounting/ShadowViewMutation.h>
#include <react/renderer/mounting/stubs/StubViewTree.h>

using namespace facebook::react;

namespace {

ShadowView makeShadowView(Tag tag, ComponentName componentName) {
  auto shadowView = ShadowView{};
  shadowView.tag = tag;
  shadowView.componentName = componentName;
  shadowView.props = std::make_shared<const Props>();
  shadowView.layoutMetrics.frame.size = {1, 1};
  return shadowView;
}

} // namespace

TEST(SmokeTest, StubViewTreeAppliesCreateAndInsert) {
  auto root = makeShadowView(1, "RootView");
  auto child = makeShadowView(2, "View");

  auto tree = StubViewTree(root);
  tree.mutate({
      ShadowViewMutation::CreateMutation(child),
      ShadowViewMutation::InsertMutation(root, child, 0),
  });

  EXPECT_EQ(tree.size(), 2);
  EXPECT_EQ(tree.getRootStubView().children.at(0)->tag, 2);
  EXPECT_TRUE(tree.hasTag(2));
}
