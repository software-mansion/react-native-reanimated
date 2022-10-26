package com.swmansion.reanimated.sharedElementTransition;

public class SharedViewConfig {

  public Integer viewTag;
  public boolean toRemove;

  public int parentScreenTag;
  public int parentTag;

  SharedViewConfig(Integer viewTag) {
    this.viewTag = viewTag;
  }
}
