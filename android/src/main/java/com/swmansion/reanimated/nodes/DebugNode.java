package com.swmansion.reanimated.nodes;

import android.util.Log;

import com.facebook.react.ReactApplication;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.swmansion.reanimated.NodesManager;

public class DebugNode extends Node {

  private final String mMessage;
  private final int mValueID;
  private final boolean mIsChromeDebugging;

  public DebugNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
    super(nodeID, config, nodesManager);
    mMessage = config.getString("message");
    mValueID = config.getInt("value");
    mIsChromeDebugging = ((ReactApplication) mNodesManager.mContext.getApplicationContext())
            .getReactNativeHost()
            .getReactInstanceManager()
            .getDevSupportManager()
            .getDevSettings()
            .isRemoteJSDebugEnabled();
  }

  @Override
  protected Object evaluate() {
    Object value = mNodesManager.findNodeById(mValueID, Node.class).value();
    if (mIsChromeDebugging) {
      WritableMap eventData = Arguments.createMap();
      eventData.putInt("id", mNodeID);
      eventData.putDouble("val", (Double) value);
      mNodesManager.sendEvent("onDebugJS", eventData);
    } else {
      Log.d("REANIMATED", String.format("%s %s", mMessage, value));
    }
    return value;
  }
}
