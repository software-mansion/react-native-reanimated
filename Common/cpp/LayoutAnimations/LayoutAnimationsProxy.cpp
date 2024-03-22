#include "LayoutAnimationsProxy.h"
#include <react/renderer/mounting/ShadowViewMutation.h>
#include "NativeReanimatedModule.h"

namespace reanimated {

void LayoutAnimationsProxy::startAnimation(
    const int tag,
    const LayoutAnimationType type,
    Values values) const {
  printf(
      "start aniamtion %f %f %f %f",
      values.x,
      values.y,
      values.width,
      values.height);
  nativeReanimatedModule_->uiScheduler_->scheduleOnUI(
      [values, this, tag, type]() {
        jsi::Runtime &rt = nativeReanimatedModule_->getUIRuntime();
        jsi::Object yogaValues(rt);
        yogaValues.setProperty(rt, "originX", values.x);
        yogaValues.setProperty(rt, "originY", values.y);
        yogaValues.setProperty(rt, "width", values.width);
        yogaValues.setProperty(rt, "height", values.height);
        nativeReanimatedModule_->layoutAnimationsManager().startLayoutAnimation(
            rt, tag, type, yogaValues);
      });
}

void LayoutAnimationsProxy::startLayoutLayoutAnimation(
    const int tag,
    Values currentValues,
    Values targetValues) const {
  nativeReanimatedModule_->uiScheduler_->scheduleOnUI(
      [currentValues, targetValues, this, tag]() {
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
        nativeReanimatedModule_->layoutAnimationsManager().startLayoutAnimation(
            rt, tag, LayoutAnimationType::LAYOUT, yogaValues);
      });
}

void LayoutAnimationsProxy::transferConfigFromNativeTag(const int tag) {
  if (!tagToNativeID_->contains(tag)) {
    return;
  }
  auto nativeIDString = tagToNativeID_->at(tag);
  if (nativeIDString.empty()) {
    return;
  }
  auto nativeID = stoi(nativeIDString);
  std::shared_ptr<Shareable> config = nullptr;
  {
    auto lock = std::unique_lock<std::mutex>(
        nativeReanimatedModule_->layoutAnimationsManager_->animationsMutex_);
    config = layoutAnimationsManager_->enteringAnimations_[nativeID];
  }
  auto s = "";
  if (config) {
    nativeReanimatedModule_->layoutAnimationsManager_->configureAnimation(
        tag, LayoutAnimationType::ENTERING, s, config);
  }
}

void LayoutAnimationsProxy::progressLayoutAnimation(
    int tag,
    const jsi::Object &newStyle) {
  //  auto newProps = RawProps(nativeReanimatedModule_->getUIRuntime(),
  //  jsi::Value(nativeReanimatedModule_->getUIRuntime(), newStyle));
  auto newProps = std::make_shared<RawProps>(
      nativeReanimatedModule_->getUIRuntime(),
      jsi::Value(nativeReanimatedModule_->getUIRuntime(), newStyle));
  X x;
  x.rawProps = newProps;
  LayoutMetrics lm;

  lm.frame.origin.x =
      newStyle.hasProperty(nativeReanimatedModule_->getUIRuntime(), "originX")
      ? newStyle.getProperty(nativeReanimatedModule_->getUIRuntime(), "originX")
            .asNumber()
      : -1;
  lm.frame.origin.y =
      newStyle.hasProperty(nativeReanimatedModule_->getUIRuntime(), "originY")
      ? newStyle.getProperty(nativeReanimatedModule_->getUIRuntime(), "originY")
            .asNumber()
      : -1;
  lm.frame.size.width =
      newStyle.hasProperty(nativeReanimatedModule_->getUIRuntime(), "width")
      ? newStyle.getProperty(nativeReanimatedModule_->getUIRuntime(), "width")
            .asNumber()
      : -1;
  lm.frame.size.height =
      newStyle.hasProperty(nativeReanimatedModule_->getUIRuntime(), "height")
      ? newStyle.getProperty(nativeReanimatedModule_->getUIRuntime(), "height")
            .asNumber()
      : -1;

  x.layoutMetrics = lm;
  layoutAnimationsRegistry_.props_.insert_or_assign(tag, x);
}

void LayoutAnimationsProxy::endLayoutAniamtion(int tag, bool shouldRemove) {
  auto &la = layoutAnimations_.at(tag);
  if (shouldRemove) {
    auto mutation =
        ShadowViewMutation::RemoveMutation(la.parent, *la.current, la.index);
    cleanupMutations.push_back(mutation);
    cleanupMutations.insert(
        cleanupMutations.end(),
        la.cleanupMutations.begin(),
        la.cleanupMutations.end());
    dropIndex(la.parent.tag, la.index);
    updateIndices(mutation);
  }
  layoutAnimations_.erase(tag);
  layoutAnimationsRegistry_.props_.erase(tag);
  layoutAnimationsRegistry_.removedViews_.insert(tag);
}

// bool LayoutAnimationKeyFrameManager::hasComponentDescriptorForShadowView(
//     const ShadowView& shadowView) const {
//   return componentDescriptorRegistry_->hasComponentDescriptorAt(
//       shadowView.componentHandle);
// }

const ComponentDescriptor &
LayoutAnimationsProxy::getComponentDescriptorForShadowView(
    const ShadowView &shadowView) const {
  return componentDescriptorRegistry_->at(shadowView.componentHandle);
}

// static inline bool shouldFirstComeBeforeSecondRemovesOnly(
//     const ShadowViewMutation& lhs,
//     const ShadowViewMutation& rhs) noexcept {
//   // Make sure that removes on the same level are sorted - highest indices
//   must
//   // come first.
//   return (lhs.type == ShadowViewMutation::Type::Remove &&
//           lhs.type == rhs.type) &&
//       (lhs.parentShadowView.tag == rhs.parentShadowView.tag) &&
//       (lhs.index > rhs.index);
// }

static inline bool shouldFirstComeBeforeSecondMutation(
    const ShadowViewMutation &lhs,
    const ShadowViewMutation &rhs) noexcept {
  if (lhs.type != rhs.type) {
    // Deletes always come last
    if (lhs.type == ShadowViewMutation::Type::Delete) {
      return false;
    }
    if (rhs.type == ShadowViewMutation::Type::Delete) {
      return true;
    }

    // Remove comes before insert
    if (lhs.type == ShadowViewMutation::Type::Remove &&
        rhs.type == ShadowViewMutation::Type::Insert) {
      return true;
    }
    if (rhs.type == ShadowViewMutation::Type::Remove &&
        lhs.type == ShadowViewMutation::Type::Insert) {
      return false;
    }

    // Create comes before insert
    if (lhs.type == ShadowViewMutation::Type::Create &&
        rhs.type == ShadowViewMutation::Type::Insert) {
      return true;
    }
    if (rhs.type == ShadowViewMutation::Type::Create &&
        lhs.type == ShadowViewMutation::Type::Insert) {
      return false;
    }
  } else {
    // Make sure that removes on the same level are sorted - highest indices
    // must come first.
    if (lhs.type == ShadowViewMutation::Type::Remove &&
        lhs.parentShadowView.tag == rhs.parentShadowView.tag) {
      if (lhs.index > rhs.index) {
        return true;
      } else {
        return false;
      }
    }
  }

  return false;
}

void LayoutAnimationsProxy::addOngoingAnimations(
    SurfaceId surfaceId,
    ShadowViewMutationList &mutations) const {
  PropsParserContext propsParserContext{surfaceId, *contextContainer_};
  for (auto &[tag, x] : layoutAnimationsRegistry_.props_) {
    auto rawProps = x.rawProps;
    if (!layoutAnimations_.contains(tag)) {
      continue;
    }
    auto &la = layoutAnimations_.at(tag);
    auto &previous = la.current;
    auto &finalView = la.end;
    auto parent = la.parent;
    auto newView = std::make_shared<ShadowView>(*finalView);
    const auto &viewProps = static_cast<const ViewProps &>(*newView->props);
    const_cast<ViewProps &>(viewProps).opacity = 1;
    auto newProps = getComponentDescriptorForShadowView(*newView).cloneProps(
        propsParserContext, newView->props, *rawProps);
    newView->props = newProps;
    auto f = x.layoutMetrics.frame;
    if (f.size.width != -1) {
      newView->layoutMetrics.frame.size.width = f.size.width;
    }
    if (f.size.height != -1) {
      newView->layoutMetrics.frame.size.height = f.size.height;
    }
    if (f.origin.x != -1) {
      newView->layoutMetrics.frame.origin.x = f.origin.x;
    }
    if (f.origin.y != -1) {
      newView->layoutMetrics.frame.origin.y = f.origin.y;
    }

    if (!la.initialMutations.empty()) {
      for (auto mutation : la.initialMutations) {
        mutation.newChildShadowView = *newView;
        mutations.push_back(mutation);
      }
      la.initialMutations.clear();
    } else {
      mutations.push_back(
          ShadowViewMutation::UpdateMutation(*previous, *newView, parent));
    }
    la.current = newView;
  }
  layoutAnimationsRegistry_.props_.clear();
  mutations.insert(
      mutations.end(), cleanupMutations.begin(), cleanupMutations.end());
  cleanupMutations.clear();
  std::stable_sort(
      mutations.begin(), mutations.end(), &shouldFirstComeBeforeSecondMutation);
}

std::optional<MountingTransaction> LayoutAnimationsProxy::pullTransaction(
    SurfaceId surfaceId,
    MountingTransaction::Number transactionNumber,
    const TransactionTelemetry &telemetry,
    ShadowViewMutationList mutations) const {
  //  std::unordered_map<Tag, const RawProps*> propsMap =
  //  layoutAnimationsRegistry_.props_;
  ShadowViewMutationList filteredMutations;
  std::unordered_map<Tag, Tag> descendantToAnimated;

  for (auto it = mutations.rbegin(); it != mutations.rend(); it++) {
    auto &mutation = *it;
    if (mutation.type == ShadowViewMutation::Delete) {
      if (descendantToAnimated.contains(mutation.parentShadowView.tag)) {
        descendantToAnimated[mutation.oldChildShadowView.tag] =
            descendantToAnimated[mutation.parentShadowView.tag];
      } else if (layoutAnimationsManager_->hasLayoutAnimation(
                     mutation.oldChildShadowView.tag,
                     LayoutAnimationType::EXITING)) {
        descendantToAnimated[mutation.oldChildShadowView.tag] =
            mutation.oldChildShadowView.tag;
      }
    }
  }

  //  for (auto& mutation: mutations){
  //    switch (mutation.type) {
  //      case ShadowViewMutation::Type::Create: {
  //        if
  //        (!layoutAnimationsManager_->hasLayoutAnimation(mutation.newChildShadowView.tag,
  //        LayoutAnimationType::ENTERING)){
  //          filteredMutations.push_back(mutation);
  //          continue;
  //        }
  //        startAnimation(mutation.newChildShadowView.tag,
  //        LayoutAnimationType::ENTERING, Values(mutation.newChildShadowView));
  //        auto finalView =
  //        std::make_shared<ShadowView>(mutation.newChildShadowView); auto
  //        current = std::make_shared<ShadowView>(mutation.oldChildShadowView);
  //        LayoutAnimation la{finalView, current, mutation.oldChildShadowView,
  //        mutation.parentShadowView, {mutation}, {}};
  //        layoutAnimations_.insert_or_assign(mutation.newChildShadowView.tag,
  //        la); break;
  //      }
  //
  //      case ShadowViewMutation::Type::Insert:{
  //        if (layoutAnimations_.contains(mutation.newChildShadowView.tag)){
  //          layoutAnimations_.at(mutation.newChildShadowView.tag).initialMutations.push_back(mutation);
  //        } else {
  //          filteredMutations.push_back(mutation);
  //        }
  //        break;
  //      }
  //
  //      case ShadowViewMutation::Type::Update:{
  //        if
  //        (!layoutAnimationsManager_->hasLayoutAnimation(mutation.newChildShadowView.tag,
  //        LayoutAnimationType::LAYOUT)){
  //          filteredMutations.push_back(mutation);
  //          continue;
  //        }
  ////        mutation.parentShadowView.
  //        startLayoutLayoutAnimation(mutation.newChildShadowView.tag,
  //        Values(mutation.oldChildShadowView),
  //        Values(mutation.newChildShadowView)); auto finalView =
  //        std::make_shared<ShadowView>(mutation.newChildShadowView); auto
  //        current = std::make_shared<ShadowView>(mutation.oldChildShadowView);
  //        LayoutAnimation la{finalView, current, mutation.oldChildShadowView,
  //        mutation.parentShadowView, {}, {}};
  //        layoutAnimations_.insert_or_assign(mutation.newChildShadowView.tag,
  //        la); break;
  //      }
  //
  //      case ShadowViewMutation::Type::Remove: {
  //        if
  //        (!descendantToAnimated.contains(mutation.oldChildShadowView.tag)){
  //          filteredMutations.push_back(mutation);
  //          continue;
  //        }
  //        auto targetTag =
  //        descendantToAnimated[mutation.oldChildShadowView.tag]; if (targetTag
  //        == mutation.oldChildShadowView.tag){
  //          startAnimation(mutation.oldChildShadowView.tag,
  //          LayoutAnimationType::EXITING,
  //          Values(mutation.oldChildShadowView)); auto finalView =
  //          std::make_shared<ShadowView>(mutation.oldChildShadowView); auto
  //          current =
  //          std::make_shared<ShadowView>(mutation.oldChildShadowView);
  //          LayoutAnimation la{finalView, current,
  //          mutation.oldChildShadowView, mutation.parentShadowView, {},
  //          {mutation}};
  //          layoutAnimations_.insert_or_assign(mutation.oldChildShadowView.tag,
  //          la);
  //        }
  //        else {
  //          layoutAnimations_.at(targetTag).cleanupMutations.push_back(mutation);
  //        }
  //        break;
  //      }
  //
  //      case ShadowViewMutation::Type::Delete: {
  //        if (descendantToAnimated.contains(mutation.oldChildShadowView.tag)){
  //          auto targetTag =
  //          descendantToAnimated[mutation.oldChildShadowView.tag];
  //          layoutAnimations_.at(targetTag).cleanupMutations.push_back(mutation);
  //        } else {
  //          filteredMutations.push_back(mutation);
  //        }
  //        break;
  //      }
  //
  //      default:
  //        filteredMutations.push_back(mutation);
  //    }

  // current assumptions -- collapsable false on exiting

  // filter DELETE+CREATE -- (ignore - reparent) (probably view flattening?) |
  // keep mutations
  std::unordered_set<Tag> reparentedTags;

  // filter REMOVE+INSERT -- treat as update (probably reordering) | keep
  // mutations and animate update
  std::unordered_set<Tag> reorderedTags;

  // loop
  for (auto &mutation : mutations) {
    updateIndexForMutation(mutation);
    switch (mutation.type) {
        // INSERT (w/o REMOVE) -- animate entering | override mutation - opacity
        // 0
      case ShadowViewMutation::Type::Insert: {
        updateIndices(mutation);
        if (!layoutAnimationsManager_->hasLayoutAnimation(
                mutation.newChildShadowView.tag,
                LayoutAnimationType::ENTERING)) {
          filteredMutations.push_back(mutation);
          continue;
        }
        startAnimation(
            mutation.newChildShadowView.tag,
            LayoutAnimationType::ENTERING,
            Values(mutation.newChildShadowView));
        auto finalView =
            std::make_shared<ShadowView>(mutation.newChildShadowView);
        auto current =
            std::make_shared<ShadowView>(mutation.oldChildShadowView);
        LayoutAnimation la{
            finalView,
            current,
            mutation.oldChildShadowView,
            mutation.parentShadowView,
            {},
            {}};
        layoutAnimations_.insert_or_assign(mutation.newChildShadowView.tag, la);
        auto newView =
            std::make_shared<ShadowView>(mutation.newChildShadowView);
        const auto &viewProps = static_cast<const ViewProps &>(*newView->props);
        const_cast<ViewProps &>(viewProps).opacity = 0;
        filteredMutations.push_back(mutation);
        break;
      }

        // UPDATE -- animate layout | ignore mutation
      case ShadowViewMutation::Type::Update: {
        if (!layoutAnimationsManager_->hasLayoutAnimation(
                mutation.newChildShadowView.tag, LayoutAnimationType::LAYOUT)) {
          filteredMutations.push_back(mutation);
          continue;
        }
        auto &oldChild = mutation.oldChildShadowView;
        if (layoutAnimations_.contains(mutation.newChildShadowView.tag)) {
          oldChild =
              *layoutAnimations_.at(mutation.newChildShadowView.tag).current;
        }
        startLayoutLayoutAnimation(
            mutation.newChildShadowView.tag,
            Values(oldChild),
            Values(mutation.newChildShadowView));
        auto finalView =
            std::make_shared<ShadowView>(mutation.newChildShadowView);
        auto current = std::make_shared<ShadowView>(oldChild);
        LayoutAnimation la{
            finalView, current, oldChild, mutation.parentShadowView, {}, {}};
        layoutAnimations_.insert_or_assign(mutation.newChildShadowView.tag, la);
        break;
      }

        // REMOVE (w/o INSERT) -- animated exiting | delay mutation, mark the
        // index as used by us
      case ShadowViewMutation::Type::Remove: {
        if (!descendantToAnimated.contains(mutation.oldChildShadowView.tag)) {
          updateIndices(mutation);
          filteredMutations.push_back(mutation);
          continue;
        }
        auto targetTag = descendantToAnimated[mutation.oldChildShadowView.tag];
        if (targetTag == mutation.oldChildShadowView.tag) {
          startAnimation(
              mutation.oldChildShadowView.tag,
              LayoutAnimationType::EXITING,
              Values(mutation.oldChildShadowView));
          updateIndices(mutation);
          takeIndex(mutation.parentShadowView.tag, mutation.index);
          auto finalView =
              std::make_shared<ShadowView>(mutation.oldChildShadowView);
          auto current =
              std::make_shared<ShadowView>(mutation.oldChildShadowView);
          LayoutAnimation la{
              finalView,
              current,
              mutation.oldChildShadowView,
              mutation.parentShadowView,
              {},
              {}};
          la.index = mutation.index;
          layoutAnimations_.insert_or_assign(
              mutation.oldChildShadowView.tag, la);
        } else {
          layoutAnimations_.at(targetTag).cleanupMutations.push_back(mutation);
        }
        break;
      }

      case ShadowViewMutation::Type::Delete: {
        if (descendantToAnimated.contains(mutation.oldChildShadowView.tag)) {
          auto targetTag =
              descendantToAnimated[mutation.oldChildShadowView.tag];
          layoutAnimations_.at(targetTag).cleanupMutations.push_back(mutation);
        } else {
          filteredMutations.push_back(mutation);
        }
        break;
      }

        // CREATE, REMOVEDRELETETREE
      default:
        filteredMutations.push_back(mutation);
    }

    // REMOVE (w/o INSERT) -- animated exiting | delay mutation, mark the index
    // as used by us
  }
  // fix indices in mutations

  // add ongoing updates
  //  }

  addOngoingAnimations(surfaceId, filteredMutations);

  //  layoutAnimationsRegistry_.props_.clear();
  return MountingTransaction{
      surfaceId, transactionNumber, std::move(filteredMutations), telemetry};
}

void LayoutAnimationsProxy::updateIndexForMutation(
    ShadowViewMutation &mutation) const {
  if (mutation.index == -1) {
    return;
  }
  int k = mutation.index, i = 0;

  if (!indices.contains(mutation.parentShadowView.tag)) {
    return;
  }

  // !!!
  while (true) {
    if (indices.at(mutation.parentShadowView.tag)->contains(i)) {
      i++;
      continue;
    }
    if (!k) {
      break;
    }
    k--;
    i++;
  }

  mutation.index = i;
}

void LayoutAnimationsProxy::updateIndices(ShadowViewMutation &mutation) const {
  int delta = mutation.type == ShadowViewMutation::Insert ? 1 : -1;
  if (!indices.contains(mutation.parentShadowView.tag)) {
    return;
  }

  auto &s = *indices.at(mutation.parentShadowView.tag);
  auto newS = std::make_shared<std::unordered_set<int>>();
  for (auto i : s) {
    if (i < mutation.index) {
      newS->insert(i);
    } else {
      for (auto &[tag, la] : layoutAnimations_) {
        if (tag == mutation.parentShadowView.tag && la.index == i) {
          // !!!
          la.index += delta;
        }
      }
      newS->insert(i + delta);
    }
  }
  indices.insert_or_assign(mutation.parentShadowView.tag, newS);
}

void LayoutAnimationsProxy::takeIndex(Tag parentTag, int index) const {
  if (!indices.contains(parentTag)) {
    indices.insert_or_assign(
        parentTag, std::make_shared<std::unordered_set<int>>());
  }

  indices.at(parentTag)->insert(index);
}

void LayoutAnimationsProxy::dropIndex(Tag parentTag, int index) const {
  if (!indices.contains(parentTag)) {
    return;
  }

  indices.at(parentTag)->erase(index);
}

bool LayoutAnimationsProxy::shouldOverridePullTransaction() const {
  return true;
}

} // namespace reanimated
