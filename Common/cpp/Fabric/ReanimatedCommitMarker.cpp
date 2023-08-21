#include "ReanimatedCommitMarker.h"

namespace reanimated {

thread_local bool ReanimatedCommitMarker::reanimatedCommitFlag_{false};

ReanimatedCommitMarker::ReanimatedCommitMarker() {
  reanimatedCommitFlag_ = true;
}

ReanimatedCommitMarker::~ReanimatedCommitMarker() {
  reanimatedCommitFlag_ = false;
}

bool ReanimatedCommitMarker::isReanimatedCommit() {
  return reanimatedCommitFlag_;
}

} // namespace reanimated
