#include "LayoutAnimationsProxy.h"
#include "NativeReanimatedModule.h"
#include <react/renderer/mounting/ShadowViewMutation.h>

namespace reanimated {

void LayoutAnimationsProxy::startAnimation(const int tag, const LayoutAnimationType type, Values values) const{
  printf("start aniamtion %f %f %f %f", values.x, values.y, values.width, values.height);
  // czemu to sie psuje bez schedulowania???
  nativeReanimatedModule_->uiScheduler_->scheduleOnUI([values, this, tag, type](){
    jsi::Runtime &rt = nativeReanimatedModule_->getUIRuntime();
    jsi::Object yogaValues(rt);
    yogaValues.setProperty(rt, "originX", values.x);
    yogaValues.setProperty(rt, "originY", values.y);
    yogaValues.setProperty(rt, "width", values.width);
    yogaValues.setProperty(rt, "height", values.height);
    nativeReanimatedModule_->layoutAnimationsManager().startLayoutAnimation(rt, tag, type, yogaValues);
  });
}

//void LayoutAnimationsProxy::startAnimationWithWrapper(ShadowNode::Shared node, const int tag, const LayoutAnimationType type, Values values){
//  printf("start aniamtion %f %f %f %f", values.x, values.y, values.width, values.height);
//  nativeReanimatedModule_->uiScheduler_->scheduleOnUI([values, this, tag, type, node](){
//    jsi::Runtime &rt = nativeReanimatedModule_->getUIRuntime();
//    jsi::Object yogaValues(rt);
//    yogaValues.setProperty(rt, "originX", values.x);
//    yogaValues.setProperty(rt, "originY", values.y);
//    yogaValues.setProperty(rt, "width", values.width);
//    yogaValues.setProperty(rt, "height", values.height);
//    nativeReanimatedModule_->layoutAnimationsManager().startLayoutAnimationWithWrapper(rt, node, tag, type, yogaValues);
//  });
//}

void LayoutAnimationsProxy::startLayoutLayoutAnimation(const int tag, Values currentValues, Values targetValues){
  nativeReanimatedModule_->uiScheduler_->scheduleOnUI([currentValues, targetValues, this, tag](){
    jsi::Runtime &rt = nativeReanimatedModule_->getUIRuntime();
    jsi::Object yogaValues(rt);
    yogaValues.setProperty(rt, "currentOriginX", currentValues.x);
    yogaValues.setProperty(rt, "currentOriginY", currentValues.y);
    yogaValues.setProperty(rt, "currentWidth", currentValues.width);
    yogaValues.setProperty(rt, "currentHeight", currentValues.height);
    yogaValues.setProperty(rt, "targetOriginX", targetValues.x);
    yogaValues.setProperty(rt, "targetOriginY", targetValues.y);
    yogaValues.setProperty(rt, "targetWidth", targetValues.width);
    yogaValues.setProperty(rt, "targetHeight", targetValues.height);
    nativeReanimatedModule_->layoutAnimationsManager().startLayoutAnimation(rt, tag, LayoutAnimationType::LAYOUT, yogaValues);
  });
}

//void LayoutAnimationsProxy::startLayoutLayoutAnimationWithWrapper(ShadowNode::Shared node, const int tag, const LayoutAnimationType type, Values currentValues, Values targetValues){
//  nativeReanimatedModule_->uiScheduler_->scheduleOnUI([currentValues, targetValues, this, tag, type, node](){
//    jsi::Runtime &rt = nativeReanimatedModule_->getUIRuntime();
//    jsi::Object yogaValues(rt);
//    yogaValues.setProperty(rt, "currentOriginX", currentValues.x);
//    yogaValues.setProperty(rt, "currentOriginY", currentValues.y);
//    yogaValues.setProperty(rt, "currentWidth", currentValues.width);
//    yogaValues.setProperty(rt, "currentHeight", currentValues.height);
//    yogaValues.setProperty(rt, "targetOriginX", targetValues.x);
//    yogaValues.setProperty(rt, "targetOriginY", targetValues.y);
//    yogaValues.setProperty(rt, "targetWidth", targetValues.width);
//    yogaValues.setProperty(rt, "targetHeight", targetValues.height);
//    nativeReanimatedModule_->layoutAnimationsManager().startLayoutAnimationWithWrapper(rt, node, tag, type, yogaValues);
//  });
//}

void LayoutAnimationsProxy::transferConfigFromNativeTag(const int tag){
  if (!tagToNativeID_->contains(tag)){
    return;
  }
  auto nativeIDString = tagToNativeID_->at(tag);
  if (nativeIDString.empty()){
    return;
  }
  auto nativeID = stoi(nativeIDString);
  std::shared_ptr<Shareable> config = nullptr;
  {
    auto lock = std::unique_lock<std::mutex>(nativeReanimatedModule_->layoutAnimationsManager_->animationsMutex_);
    config = layoutAnimationsManager_->enteringAnimations_[nativeID];
  }
  auto s = "";
  if (config){
    nativeReanimatedModule_->layoutAnimationsManager_->configureAnimation(tag, LayoutAnimationType::ENTERING, s, config);
  }
}

void LayoutAnimationsProxy::progressLayoutAnimation(int tag, const jsi::Object &newStyle){
//  auto newProps = RawProps(nativeReanimatedModule_->getUIRuntime(), jsi::Value(nativeReanimatedModule_->getUIRuntime(), newStyle));
  auto newProps = std::make_shared<RawProps>(nativeReanimatedModule_->getUIRuntime(), jsi::Value(nativeReanimatedModule_->getUIRuntime(), newStyle));
  layoutAnimationsRegistry_.props_.insert_or_assign(tag, newProps);
}

void LayoutAnimationsProxy::endLayoutAniamtion(int tag, bool shouldRemove){
  layoutAnimationsRegistry_.props_.erase(tag);
  layoutAnimationsRegistry_.removedViews_.insert(tag);
}

//bool LayoutAnimationKeyFrameManager::hasComponentDescriptorForShadowView(
//    const ShadowView& shadowView) const {
//  return componentDescriptorRegistry_->hasComponentDescriptorAt(
//      shadowView.componentHandle);
//}

const ComponentDescriptor&
LayoutAnimationsProxy::getComponentDescriptorForShadowView(
    const ShadowView& shadowView) const {
  return componentDescriptorRegistry_->at(shadowView.componentHandle);
}

std::optional<MountingTransaction> LayoutAnimationsProxy::pullTransaction(SurfaceId surfaceId, MountingTransaction::Number transactionNumber, const TransactionTelemetry& telemetry, ShadowViewMutationList mutations) const {
  PropsParserContext propsParserContext{surfaceId, *contextContainer_};
//  std::unordered_map<Tag, const RawProps*> propsMap = layoutAnimationsRegistry_.props_;
  for (auto& mutation: mutations){
    switch (mutation.type) {
      case ShadowViewMutation::Type::Insert: {
        if (!layoutAnimationsManager_->hasLayoutAnimation(mutation.newChildShadowView.tag, LayoutAnimationType::ENTERING)){
          continue;
        }
        startAnimation(mutation.newChildShadowView.tag, LayoutAnimationType::ENTERING, Values(mutation.newChildShadowView));
        auto rawProps = layoutAnimationsRegistry_.props_.at(mutation.newChildShadowView.tag);
//        if (mutation.type == ShadowViewMutation::Type::Insert){
        layoutAnimationsRegistry_.props_.erase(mutation.newChildShadowView.tag);
//        }
        ShadowView finalView = ShadowView(mutation.newChildShadowView);
        ShadowView current = ShadowView(finalView);
        auto newProps = getComponentDescriptorForShadowView(mutation.newChildShadowView).cloneProps(propsParserContext, current.props, *rawProps);
        current.props = newProps;
        mutation.newChildShadowView = current;
        layoutAnimationsRegistry_.previousShadowViews_.insert_or_assign(mutation.newChildShadowView.tag, current);
        layoutAnimationsRegistry_.shadowViews_.insert_or_assign(mutation.newChildShadowView.tag, finalView);
        layoutAnimationsRegistry_.parentShadowViews_.insert_or_assign(mutation.newChildShadowView.tag, mutation.parentShadowView);
        break;
      }
        
      default:
        break;
    }
  }
  for (auto& [tag, rawProps]: layoutAnimationsRegistry_.props_){
    auto& previous = layoutAnimationsRegistry_.previousShadowViews_.at(tag);
    auto& finalView = layoutAnimationsRegistry_.shadowViews_.at(tag);
    auto& parent = layoutAnimationsRegistry_.parentShadowViews_.at(tag);

    auto newView = ShadowView(finalView);
    auto newProps = getComponentDescriptorForShadowView(finalView).cloneProps(propsParserContext, finalView.props, *rawProps);
    newView.props = newProps;

    mutations.push_back(ShadowViewMutation::UpdateMutation(previous, newView, parent));
  }
  layoutAnimationsRegistry_.props_.clear();
  return MountingTransaction{surfaceId, transactionNumber, std::move(mutations), telemetry};
}

bool LayoutAnimationsProxy::shouldOverridePullTransaction() const {
  return true;
}


}
