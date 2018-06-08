package com.swmansion.reanimated.nodes;

import android.content.Context;
import android.os.VibrationEffect;
import android.os.Vibrator;

import com.facebook.react.bridge.JSApplicationIllegalArgumentException;
import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.NodesManager;

import java.util.LinkedList;
import java.util.List;


public class FeedbackNode extends Node<Double> {
  private static final boolean HAS_NEW_VIBRATION_API = android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O;
  private static final Double ZERO = Double.valueOf(0);
  private long[] mPattern;
  private int[] mAmplitudes;
  private int mRepeat = -1;
  private long mTime = -1;
  private boolean mUsePattern = false;
  private int mAmplitude = -1; //VibrationEffect.DEFAULT_AMPLITUDE
  private Vibrator mVibrator;

  public FeedbackNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
    super(nodeID, config, nodesManager);
    mVibrator = (Vibrator) nodesManager.mCtx.getSystemService(Context.VIBRATOR_SERVICE);
    if (config.hasKey("pattern")) {
      List<Long> listPattern = new LinkedList<>();
      for (Object p : config.getArray("pattern").toArrayList().toArray()) {
        listPattern.add(Math.round((Double) p));
      }

      mPattern = new long[listPattern.size()];
      for (int i = 0; i < listPattern.size(); i++) {
        mPattern[i] = listPattern.get(i);
      }
      mUsePattern = true;
    }
    if (config.hasKey("repeat")) {
      mRepeat = config.getInt("repeat");
    }
    if (HAS_NEW_VIBRATION_API) {
      mAmplitude = (config.hasKey("amplitude")) ? config.getInt("amplitude") : VibrationEffect.DEFAULT_AMPLITUDE;
      if (config.hasKey("amplitudes")) {
        List<Integer> listAmplitudes = new LinkedList<>();
        for (Object p : config.getArray("amplitudes").toArrayList().toArray()) {
          listAmplitudes.add(((int)Math.round((Double) p)));
        }
        mAmplitudes = new int[listAmplitudes.size()];
        for (int i = 0; i < listAmplitudes.size(); i++) {
          mAmplitudes[i] = listAmplitudes.get(i);
        }
      } else {
        mAmplitudes = new int[mPattern.length];
        for (int i = 0; i < (mPattern.length / 2); i++) {
          mAmplitudes[i * 2 + 1] = VibrationEffect.DEFAULT_AMPLITUDE;
        }
      }
    }
    if (config.hasKey("time")) {
      if (mUsePattern) {
        throw new JSApplicationIllegalArgumentException("Time and pattern shouldn't be defined in the same time");
      }
      mTime = config.getInt("time");
    }
  }

  @Override
  protected Double evaluate() {
    if (HAS_NEW_VIBRATION_API) {
      if (mUsePattern) {
        mVibrator.vibrate(VibrationEffect.createWaveform(mPattern, mAmplitudes, mRepeat));
      } else {
        mVibrator.vibrate(VibrationEffect.createOneShot(mTime, mAmplitude));
      }
    } else {
      if (mUsePattern) {
        mVibrator.vibrate(mPattern ,mRepeat);
      } else {
        mVibrator.vibrate(mTime);
      }
    }
    mVibrator.vibrate(mPattern, mRepeat);

    return ZERO;
  }
}
