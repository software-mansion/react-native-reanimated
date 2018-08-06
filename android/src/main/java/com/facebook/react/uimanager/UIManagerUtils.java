package com.facebook.react.uimanager;

/**
 * This class provides a workaround that makes it possible to access UIViewOperationQueue.
 * In react-native core UIViewOperationQueue#getUIViewOperationQueue has limited visibility
 * to package only. We rely on that method to check if queue is empty or not. If the queue is
 * empty we want to trigger "onBatchComplete" in the code responsible for updating native props.
 * Otherwise, if it is not empty it means that there is an active batch and so we can rely on
 * "onBatchComplete" being triggered once the active batch is finished.
 */
public class UIManagerUtils {
  public static UIViewOperationQueue getUIViewOperationQueue(UIImplementation uiImplementation) {
    return uiImplementation.getUIViewOperationQueue();
  }
}
