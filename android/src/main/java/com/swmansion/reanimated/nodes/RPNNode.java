package com.swmansion.reanimated.nodes;

import android.util.Log;

import com.facebook.react.bridge.JSApplicationIllegalArgumentException;
import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.NodesManager;

import java.util.ArrayList;

public class RPNNode extends Node {
  private static final Double [] stack = new Double[300];
  private final int[] mOperation;
  private final boolean[] mIsOperator;
  public RPNNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
    super(nodeID, config, nodesManager);
    ArrayList<Object> operations = config.getArray("expression").toArrayList();
    ArrayList<Object> isOperators = config.getArray("isOperator").toArrayList();
    mOperation = new int[operations.size()];
    mIsOperator = new boolean[isOperators.size()];
    for (int i = 0; i < operations.size(); i++) {
      Object o = isOperators.get(i);
      mIsOperator[i] = (boolean)o;
      mOperation[i] = ((Double)operations.get(i)).intValue();
    }
  }

  @Override
  protected Object evaluate() {
    int hI = 0;
    for (int i = 0; i < mOperation.length; i++) {
      if (!mIsOperator[i]) {
        Double v = (Double) mNodesManager.findNodeById((mOperation[i]), Node.class).value();
        stack[hI++] = v;
      } else {
        if (mOperation[i] == 0) {
          hI--;
          stack[hI - 1] = stack[hI - 1] + stack[hI];
        } else if (mOperation[i] == 1) {
          hI--;
          stack[hI - 1] = stack[hI - 1] - stack[hI];
        } else if (mOperation[i] == 2) {
          hI--;
          stack[hI - 1] = stack[hI - 1] * stack[hI];
        } else if (mOperation[i] == 3) {
          hI--;
          stack[hI - 1] = stack[hI - 1] / stack[hI];
        } else if (mOperation[i] == 4) {
          hI--;
          stack[hI - 1] = Math.pow(stack[hI - 1], stack[hI]);
        } else if (mOperation[i] == 5) {
          hI--;
          stack[hI - 1] = stack[hI - 1] % stack[hI];
        } else if (mOperation[i] == 6) {
          stack[hI - 1] = Math.sin(stack[hI - 1]);
        } else if (mOperation[i] == 7) {
          stack[hI - 1] = Math.cos(stack[hI - 1]);
        } else if (mOperation[i] == 8) {
          stack[hI - 1] = Math.exp(stack[hI - 1]);
        } else if (mOperation[i] == 9) {
          stack[hI - 1] = (double) Math.round(stack[hI - 1]);
        } else if (mOperation[i] == 10) {
          stack[hI - 1] = Math.sqrt(stack[hI - 1]);
        } else if (mOperation[i] == 11) {
          Log.d("REANIMATED RPN", Double.toString(stack[hI - 1]));
        }
      }
    }
    if (hI != 1) {
      throw new JSApplicationIllegalArgumentException("Bad RPN statement");
    }
    return stack[0];
  }
}
