/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.react.uimanager;

import androidx.annotation.Nullable;
import com.facebook.common.logging.FLog;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;

/**
 * This is a helper base class for ViewGroups that use Fabric State.
 *
 * <p>Reason to use this: UpdateState calls from the View layer to the Fabric core can fail, and
 * optionally Fabric will call a "failure callback" if that happens. This class abstracts that and
 * makes it easier ensure that State in Fabric is always up-to-date.
 *
 * <p>1. Whenever ViewManager.updateState is called, call View.setStateWrapper. 2. Instead of
 * calling StateWrapper.updateState directly, call View.setState and it will automatically keep
 * retrying the UpdateState call until it succeeds; or you call setState again; or the View layer is
 * updated with a newer StateWrapper.
 */
@Deprecated(
    since =
        "Deprecated class since v0.73.0, please use com.facebook.react.uimanager.StateWrapper instead.",
    forRemoval = true)
public class FabricViewStateManager {
  private static final String TAG = "FabricViewStateManager";

  @Deprecated
  public interface HasFabricViewStateManager {
    FabricViewStateManager getFabricViewStateManager();
  }

  @Deprecated
  public interface StateUpdateCallback {
    WritableMap getStateUpdate();
  }

  @Nullable private StateWrapper mStateWrapper = null;

  @Deprecated
  public void setStateWrapper(StateWrapper stateWrapper) {
    mStateWrapper = stateWrapper;
  }

  @Deprecated
  public boolean hasStateWrapper() {
    return mStateWrapper != null;
  }

  private void setState(
      @Nullable final StateWrapper stateWrapper,
      final StateUpdateCallback stateUpdateCallback,
      final int numTries) {
    // The StateWrapper will change, breaking the async loop, whenever the UpdateState MountItem
    // is executed.
    // The caller is responsible for detecting if data is up-to-date, and doing nothing, or
    // detecting if state is stale and calling setState again.
    if (stateWrapper == null) {
      FLog.e(TAG, "setState called without a StateWrapper");
      return;
    }
    if (stateWrapper != mStateWrapper) {
      return;
    }
    // We bail out after an arbitrary number of tries. In practice this should never go higher
    // than 2 or 3, but there's nothing guaranteeing that.
    if (numTries > 60) {
      return;
    }

    @Nullable WritableMap stateUpdate = stateUpdateCallback.getStateUpdate();
    if (stateUpdate == null) {
      return;
    }

    // TODO: State update cannot fail; remove `failureRunnable` and custom retrying logic.
    stateWrapper.updateState(stateUpdate);
  }

  @Deprecated
  public void setState(final StateUpdateCallback stateUpdateCallback) {
    setState(mStateWrapper, stateUpdateCallback, 0);
  }

  @Deprecated
  public @Nullable ReadableMap getStateData() {
    return mStateWrapper != null ? mStateWrapper.getStateData() : null;
  }
}
