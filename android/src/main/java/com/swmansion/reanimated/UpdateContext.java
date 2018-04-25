package com.swmansion.reanimated;

import android.util.SparseArray;

import com.swmansion.reanimated.nodes.Node;

public class UpdateContext {

  public long updateLoopID = 0;
  public final SparseArray<Node> updatedNodes = new SparseArray<>();



//    boolean hasFinishedAnimations = false;
//
//    for (int i = 0; i < mUpdatedNodes.size(); i++) {
//      AnimatedNode node = mUpdatedNodes.valueAt(i);
//      mRunUpdateNodeList.add(node);
//    }
//
//    // Clean mUpdatedNodes queue
//    mUpdatedNodes.clear();
//
//    for (int i = 0; i < mActiveAnimations.size(); i++) {
//      AnimationDriver animation = mActiveAnimations.valueAt(i);
//      animation.runAnimationStep(frameTimeNanos);
//      AnimatedNode valueNode = animation.mAnimatedValue;
//      mRunUpdateNodeList.add(valueNode);
//      if (animation.mHasFinished) {
//        hasFinishedAnimations = true;
//      }
//    }
//
//    updateNodes(mRunUpdateNodeList);
//    mRunUpdateNodeList.clear();
//
//    // Cleanup finished animations. Iterate over the array of animations and override ones that has
//    // finished, then resize `mActiveAnimations`.
//    if (hasFinishedAnimations) {
//      for (int i = mActiveAnimations.size() - 1; i >= 0; i--) {
//        AnimationDriver animation = mActiveAnimations.valueAt(i);
//        if (animation.mHasFinished) {
//          if (animation.mEndCallback != null) {
//            WritableMap endCallbackResponse = Arguments.createMap();
//            endCallbackResponse.putBoolean("finished", true);
//            animation.mEndCallback.invoke(endCallbackResponse);
//          }
//          mActiveAnimations.removeAt(i);
//        }
//      }
//    }

}
