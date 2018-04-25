package com.swmansion.reanimated;

import android.util.SparseArray;

import com.swmansion.reanimated.nodes.Node;

public class UpdateContext {

  public long updateLoopID = 0;
  public final SparseArray<Node> updatedNodes = new SparseArray<>();

}
