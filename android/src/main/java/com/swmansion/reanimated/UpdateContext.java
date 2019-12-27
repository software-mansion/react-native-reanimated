package com.swmansion.reanimated;

import androidx.annotation.NonNull;

import com.swmansion.reanimated.nodes.Node;

import java.util.ArrayList;
import java.util.Locale;

public class UpdateContext {

  public long updateLoopID = 0;
  public String callID = "";
  public final ArrayList<Node> updatedNodes = new ArrayList<>();

  @NonNull
  @Override
  public String toString() {
    return String.format(Locale.ENGLISH,"UpdateContext: updateLoopID = %d, callID = %s", updateLoopID, callID);
  }
}
