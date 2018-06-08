package com.swmansion.reanimated.nodes;

import android.content.Context;
import android.os.Vibrator;

import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.NodesManager;

import java.util.LinkedList;
import java.util.List;

public class FeedbackNode extends Node<Double> {
  private static final Double ZERO = Double.valueOf(0);
  private long[]  mPattern;
  private int mRepeat = 1;
  private Vibrator mVibrator;

  public FeedbackNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
    super(nodeID, config, nodesManager);
    mVibrator = (Vibrator) nodesManager.mCtx.getSystemService(Context.VIBRATOR_SERVICE);

    List<Long> listPattern = new LinkedList<>();
    for (Object p : config.getArray("pattern").toArrayList().toArray()) {
      listPattern.add(Math.round((Double) p));
    }
    mPattern = new long[listPattern.size()];
    for (int i = 0; i < listPattern.size(); i++)
      mPattern[i] = listPattern.get(i);
    if (config.hasKey("repeat")) {
      mRepeat = config.getInt("repeat");
    }
  }

  @Override
  protected Double evaluate() {
     mVibrator.vibrate(mPattern, mRepeat);
    return ZERO;
  }
}
