#pragma once

#include "LayoutAnimationsManager.h"
#include "PropsRegistry.h"
#include "ShadowView.h"

namespace reanimated {

class NativeReanimatedModule;

using namespace facebook;

struct Values{
  float width, x, y, height;
};

struct LayoutAnimationsProxy{
  std::mutex mutex;
  std::shared_ptr<std::map<Tag, ShadowNode::Shared>> createdNodes_ = std::make_shared<std::map<Tag, ShadowNode::Shared>>();
  std::shared_ptr<std::map<Tag, ShadowView>> createdViews_ = std::make_shared<std::map<Tag, ShadowView>>();
  std::shared_ptr<std::map<Tag, ShadowView>> removedViews_ = std::make_shared<std::map<Tag, ShadowView>>();
  std::shared_ptr<std::map<Tag, ShadowNode::Shared>> modifiedViews_ = std::make_shared<std::map<Tag, ShadowNode::Shared>>();
  std::shared_ptr<std::map<Tag,  ShadowNode::Shared>> modifiedViewsTarget_ = std::make_shared<std::map<Tag,  ShadowNode::Shared>>();
  std::shared_ptr<std::map<Tag, std::string>> tagToNativeID_ = std::make_shared<std::map<Tag, std::string>>();
  std::shared_ptr<LayoutAnimationsManager> layoutAnimationsManager_;
  NativeReanimatedModule* nativeReanimatedModule_;
  LayoutAnimationsProxy(std::shared_ptr<LayoutAnimationsManager> layoutAnimationsManager_, NativeReanimatedModule* n): layoutAnimationsManager_(layoutAnimationsManager_), nativeReanimatedModule_(n){}
  void startAnimation(const int tag,
                      const LayoutAnimationType type,
                      Values values);
  void startAnimationWithWrapper(ShadowNode::Shared sn, const int tag,
                      const LayoutAnimationType type,
                      Values values);
  void startLayoutLayoutAnimation(const int tag,
                      Values currentValues, Values targetValues);
  void startLayoutLayoutAnimationWithWrapper(ShadowNode::Shared node, const int tag, const LayoutAnimationType type, Values currentValues, Values targetValues);
  void transferConfigFromNativeTag(const int tag);
};

}
