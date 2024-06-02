/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.react.uimanager.debug;

import com.facebook.react.uimanager.UIManagerModule;

/**
 * A listener that is notified about view hierarchy update events. This listener should only be used
 * for debug purposes and should not affect application state.
 *
 * <p>NB: while onViewHierarchyUpdateFinished will always be called from the UI thread, there are no
 * guarantees what thread onViewHierarchyUpdateEnqueued is called on.
 */
public interface NotThreadSafeViewHierarchyUpdateDebugListener {

  /**
   * Called when {@link UIManagerModule} enqueues a UI batch to be dispatched to the main thread.
   */
  void onViewHierarchyUpdateEnqueued();

  /** Called from the main thread after a UI batch has been applied to all root views. */
  void onViewHierarchyUpdateFinished();
}
