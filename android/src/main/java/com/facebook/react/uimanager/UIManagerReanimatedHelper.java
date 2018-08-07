package com.facebook.react.uimanager;

// This class has been made
/**
 * This class provides a workaround that makes it possible to access UIViewOperationQueue.
 * In react-native core UIViewOperationQueue#getUIViewOperationQueue has limited visibility
 * to package only. We rely on that method to check if queue is empty or not. If the queue is
 * empty we want to trigger "dispatchViewUpdates" in the code responsible for updating native props.
 * Otherwise, if it is not empty it means that there is an active batch and so we can rely on
 * "dispatchViewUpdates" being triggered once the active batch is finished.
 */
public class UIManagerReanimatedHelper {
  public static boolean isOperationQueueEmpty(UIImplementation uiImplementation) {
    return uiImplementation.getUIViewOperationQueue().isEmpty();
  }
}
