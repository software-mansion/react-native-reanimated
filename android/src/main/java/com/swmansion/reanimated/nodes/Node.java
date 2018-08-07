package com.swmansion.reanimated.nodes;

import android.util.SparseArray;

import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.UiThreadUtil;
import com.swmansion.reanimated.EvalContext;
import com.swmansion.reanimated.NodesManager;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.Stack;

import javax.annotation.Nullable;

public abstract class Node<T> {

  public static final Double ZERO = Double.valueOf(0);
  public static final Double ONE = Double.valueOf(1);

  protected final int mNodeID;
  protected final NodesManager mNodesManager;

  protected @Nullable List<Node<?>> mChildren; /* lazy-initialized when a child is added */

  public Node(int nodeID, @Nullable ReadableMap config, NodesManager nodesManager) {
    mNodeID = nodeID;
    mNodesManager = nodesManager;
  }


  protected abstract @Nullable T evaluate(EvalContext evalContext);

  public final @Nullable T value(EvalContext evalContext) {
    if (evalContext.lastLoopsIDs.indexOfKey(mNodeID) < 0) {
      evalContext.lastLoopsIDs.put(mNodeID, (long) -1);
    }
    long lastLoopID = evalContext.lastLoopsIDs.get(mNodeID);
    if (lastLoopID < mNodesManager.updateLoopID) {
      evalContext.lastLoopsIDs.put(mNodeID, mNodesManager.updateLoopID);
      evalContext.memoizedValues.put(mNodeID,  evaluate(evalContext));
    }
    return (T) evalContext.memoizedValues.get(mNodeID);
  }

  /**
   * This method will never return null. If value is null or of a different type we try to cast and
   * return 0 if we fail to properly cast the value. This is to match iOS behavior where the node
   * would not throw even if the value was not set.
   */
  public final Double doubleValue(EvalContext evalContext) {
    T value = value(evalContext);
    if (value == null) {
      return ZERO;
    } else if (value instanceof Double) {
      return (Double) value;
    } else if (value instanceof Number) {
      return Double.valueOf(((Number) value).doubleValue());
    } else if (value instanceof Boolean) {
      return ((Boolean) value).booleanValue() ? ONE : ZERO;
    }
    throw new IllegalStateException("Value of node " + this + " cannot be cast to a number");
  }

  public void addChild(Node child) {
    if (mChildren == null) {
      mChildren = new ArrayList<>();
    }
    mChildren.add(child);
    dangerouslyRescheduleEvaluate(mNodesManager.mGlobalEvalContext);
  }

  public void removeChild(Node child) {
    if (mChildren != null) {
      mChildren.remove(child);
    }
  }

  public void onDrop() {
    // no-op
  }

  public @Nullable List<Node<?>> getChildrenInContext(EvalContext context) {
    return mChildren;
  }

  public EvalContext switchContextWhileUpdatingIfNeeded(EvalContext context, Node lastVisited) {
    return context;
  }

  protected void markUpdated(EvalContext context) {
    UiThreadUtil.assertOnUiThread();
    context.updatedNodes.put(mNodeID, this);
    mNodesManager.postRunUpdatesAfterAnimation();
  }

  protected final void dangerouslyRescheduleEvaluate(EvalContext context) {
    context.lastLoopsIDs.put(mNodeID, (long) -1);
    markUpdated(context);
  }

  protected final void forceUpdateMemoizedValue(T value, EvalContext context) {
    context.memoizedValues.put(mNodeID, value);
    markUpdated(context);
  }

  private static void findAndUpdateNodes(Node node, Set<Node> visitedNodes, Stack<FinalNode> finalNodes, Stack<EvalContext> contexts, Node lastVisited) {
    if (visitedNodes.contains(node)) {
      return;
    } else {
      visitedNodes.add(node);
    }


    EvalContext currentContext = contexts.peek();
    List<Node> children = node.getChildrenInContext(currentContext);
    EvalContext newContext = node.switchContextWhileUpdatingIfNeeded(currentContext, lastVisited);
    boolean pushedNewContext = false;
    EvalContext contextPopped = null;


    if (newContext != currentContext && newContext != null) {
      contexts.push(newContext);
      pushedNewContext = true;
    }

    if (node instanceof ProceduralNode.PerformNode && contexts.size() > 1) {
      contextPopped = contexts.pop();
    }

    if (children != null) {
      for (Node child : children) {
        findAndUpdateNodes(child, visitedNodes, finalNodes, contexts, node);
      }
    }
    if (node instanceof FinalNode) {
      finalNodes.push((FinalNode) node);
    }

    if (pushedNewContext) {
      contexts.pop();
    }

    if (contextPopped != null) {
      contexts.push(contextPopped);
    }
  }

  public static void runUpdates(EvalContext evalContext, NodesManager nodesManager) {
    UiThreadUtil.assertOnUiThread();
    SparseArray<Node> updatedNodes = evalContext.updatedNodes;
    Stack<FinalNode> finalNodes = new Stack<>();
    Stack<EvalContext> contexts = new Stack<>();
    contexts.push(nodesManager.mGlobalEvalContext);
    for (int i = 0; i < updatedNodes.size(); i++) {
      findAndUpdateNodes(updatedNodes.valueAt(i), new HashSet<Node>(), finalNodes, contexts, null);
      if (contexts.size() != 1) {
        throw new IllegalArgumentException("Stacking of contexts was not performed correctly");
      }
    }
    while (!finalNodes.isEmpty()) {
      finalNodes.pop().update();
    }
    updatedNodes.clear();
    nodesManager.updateLoopID++;
  }
}
