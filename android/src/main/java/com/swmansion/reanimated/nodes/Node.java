package com.swmansion.reanimated.nodes;

import android.util.SparseArray;

import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.UiThreadUtil;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.UpdateContext;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Queue;
import java.util.Set;

import javax.annotation.Nullable;

public abstract class Node<T> {

  protected final int mNodeID;
  protected final NodesManager mNodesManager;

  private final UpdateContext mUpdateContext;

  private long mLastLoopID = -1;
  private T mMemoizedValue;
  private @Nullable List<Node<?>> mChildren; /* lazy-initialized when a child is added */

  public Node(int nodeID, ReadableMap config, NodesManager nodesManager) {
    mNodeID = nodeID;
    mNodesManager = nodesManager;
    mUpdateContext = nodesManager.updateContext;
  }

  protected abstract T evaluate();

  public final T value() {
    if (mLastLoopID < mUpdateContext.updateLoopID) {
      mLastLoopID = mUpdateContext.updateLoopID;
      return (mMemoizedValue = evaluate());
    }
    return mMemoizedValue;
  }

  public void addChild(Node child) {
    if (mChildren == null) {
      mChildren = new ArrayList<>();
    }
    mChildren.add(child);
    dangerouslyRescheduleEvaluate();
  }

  public void removeChild(Node child) {
    if (mChildren != null) {
      mChildren.remove(child);
    }
  }

  protected void markUpdated() {
    UiThreadUtil.assertOnUiThread();
    mUpdateContext.updatedNodes.put(mNodeID, this);
    mNodesManager.postRunUpdatesAfterAnimation();
  }

  protected final void dangerouslyRescheduleEvaluate() {
    mLastLoopID = -1;
    markUpdated();
  }

  protected final void forceUpdateMemoizedValue(T value) {
    mMemoizedValue = value;
    markUpdated();
  }

  private static void findAndUpdateNodes(Node node, Set<Node> visitedNodes, Queue<FinalNode> finals) {
    if (visitedNodes.contains(node)) {
      return;
    } else {
      visitedNodes.add(node);
    }

    List<Node> children = node.mChildren;


    if (children != null) {
      for (Node child : children) {
        findAndUpdateNodes(child, visitedNodes, finals);
      }
    }
    if (node instanceof FinalNode) {
      finals.offer((FinalNode) node);
    }
  }

  public static void runUpdates(UpdateContext updateContext) {
    UiThreadUtil.assertOnUiThread();

    SparseArray<Node> updatedNodes = updateContext.updatedNodes;
    for (int i = 0; i < updatedNodes.size(); i++) {
      Queue<FinalNode> finalsToBeUpdated = new LinkedList<>();
      findAndUpdateNodes(updatedNodes.valueAt(i), new HashSet<Node>(), finalsToBeUpdated);;
      for (FinalNode nodeIterator : finalsToBeUpdated) {
        nodeIterator.update();
      }
    }

    updatedNodes.clear();
    updateContext.updateLoopID++;
  }
}
