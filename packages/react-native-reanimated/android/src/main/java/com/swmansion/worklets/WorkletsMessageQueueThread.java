package com.swmansion.worklets;

import com.facebook.proguard.annotations.DoNotStrip;

@DoNotStrip
public class WorkletsMessageQueueThread extends WorkletsMessageQueueThreadBase {
  @Override
  public boolean runOnQueue(Runnable runnable) {
    return messageQueueThread.runOnQueue(runnable);
  }

  @Override
  public boolean isIdle() {
    return messageQueueThread.isIdle();
  }
}
