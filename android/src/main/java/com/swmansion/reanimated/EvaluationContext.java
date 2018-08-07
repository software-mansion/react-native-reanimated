package com.swmansion.reanimated;

import android.util.SparseArray;
import android.util.SparseLongArray;

import com.swmansion.reanimated.nodes.Node;
import com.swmansion.reanimated.nodes.ProceduralNode;

public class EvaluationContext {
  private static int nextContextID = 0;
  public final int contextID = EvaluationContext.nextContextID++;
  public final SparseArray<Object> memoizedValues = new SparseArray<>();
  public final SparseArray<Node> updatedNodes = new SparseArray<>();
  public final SparseArray<Long> lastLoopsIDs = new SparseArray<>();
  public final ProceduralNode.PerformNode parent;
  public EvaluationContext(ProceduralNode.PerformNode parent) {
    this.parent = parent;
  }
}
