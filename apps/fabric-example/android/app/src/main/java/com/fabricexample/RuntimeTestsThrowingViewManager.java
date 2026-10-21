package com.fabricexample;

import android.view.View;
import androidx.annotation.Nullable;
import com.facebook.react.bridge.ReactIgnorableMountingException;
import com.facebook.react.module.annotations.ReactModule;
import com.facebook.react.uimanager.SimpleViewManager;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.annotations.ReactProp;

/**
 * Runtime tests only: a view whose mount item throws when its `throwOnMount` prop is `ignorable` (a
 * `ReactIgnorableMountingException`, internal to React Native, so the class is Java) or `fatal` (a
 * `RuntimeException`).
 */
@ReactModule(name = RuntimeTestsThrowingViewManager.NAME)
public class RuntimeTestsThrowingViewManager extends SimpleViewManager<View> {
  static final String NAME = "RuntimeTestsThrowingView";

  @Override
  public String getName() {
    return NAME;
  }

  @Override
  protected View createViewInstance(ThemedReactContext reactContext) {
    return new View(reactContext);
  }

  @ReactProp(name = "throwOnMount")
  public void setThrowOnMount(View view, @Nullable String throwOnMount) {
    if ("ignorable".equals(throwOnMount)) {
      throw new ReactIgnorableMountingException("RuntimeTestsThrowingView: an ignorable mount throw");
    }
    if ("fatal".equals(throwOnMount)) {
      throw new RuntimeException("RuntimeTestsThrowingView: a mount throw");
    }
  }
}
