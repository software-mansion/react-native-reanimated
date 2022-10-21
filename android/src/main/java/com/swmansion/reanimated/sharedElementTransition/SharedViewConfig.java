package com.swmansion.reanimated.sharedElementTransition;

import android.view.View;

public class SharedViewConfig {

  public Integer viewTag;
  public boolean toRemove;
  public View parentScreen;
  public View view;
  public View parentBackup;

  SharedViewConfig(Integer viewTag) {
    this.viewTag = viewTag;
  }

  public void setView(View view) {
    this.view = view;
  }

  public void setParent(View parent) {
    parentBackup = parent;
  }

  public View getView() {
    View viewTmpReference = view;
    view = null;
    return viewTmpReference;
  }

  public View getParent() {
    View viewTmpReference = parentBackup;
    parentBackup = null;
    return viewTmpReference;
  }
}
