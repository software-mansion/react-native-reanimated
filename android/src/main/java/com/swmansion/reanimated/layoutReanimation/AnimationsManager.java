package com.swmansion.reanimated.layoutReanimation;

import android.app.Activity;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewParent;
import com.facebook.react.bridge.JavaOnlyMap;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.uimanager.IViewManagerWithChildren;
import com.facebook.react.uimanager.IllegalViewOperationException;
import com.facebook.react.uimanager.PixelUtil;
import com.facebook.react.uimanager.ReactStylesDiffMap;
import com.facebook.react.uimanager.RootView;
import com.facebook.react.uimanager.UIManagerModule;
import com.facebook.react.uimanager.ViewManager;
import com.swmansion.reanimated.Scheduler;
import java.lang.ref.WeakReference;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;

public class AnimationsManager implements ViewHierarchyObserver {
  private WeakReference<Scheduler> mScheduler;
  private ReactContext mContext;
  private UIManagerModule mUIManager;
  private NativeMethodsHolder mNativeMethodsHolder;

  private HashMap<Integer, View> mExitingViews = new HashMap<>();
  private HashMap<Integer, Integer> mExitingSubviewCountMap = new HashMap<>();
  private HashSet<Integer> mAncestorsToRemove = new HashSet<>();
  private HashMap<Integer, Runnable> mCallbacks = new HashMap<>();
  private ReanimatedNativeHierarchyManager mReanimatedNativeHierarchyManager;
  private boolean isCatalystInstanceDestroyed;

  public void setReanimatedNativeHierarchyManager(
      ReanimatedNativeHierarchyManager reanimatedNativeHierarchyManager) {
    this.mReanimatedNativeHierarchyManager = reanimatedNativeHierarchyManager;
  }

  public ReanimatedNativeHierarchyManager getReanimatedNativeHierarchyManager() {
    return mReanimatedNativeHierarchyManager;
  }

  public void setScheduler(Scheduler scheduler) {
    mScheduler = new WeakReference<>(scheduler);
  }

  public AnimationsManager(ReactContext context, UIManagerModule uiManagerModule) {
    mContext = context;
    mUIManager = uiManagerModule;
    isCatalystInstanceDestroyed = false;
  }

  public void onCatalystInstanceDestroy() {
    isCatalystInstanceDestroyed = true;
    mNativeMethodsHolder = null;
    mContext = null;
    mUIManager = null;
    mExitingViews = null;
    mExitingSubviewCountMap = null;
    mAncestorsToRemove = null;
    mCallbacks = null;
  }

  @Override
  public void onViewRemoval(View view, ViewGroup parent, Runnable callback) {
    if (isCatalystInstanceDestroyed) {
      return;
    }
    Integer tag = view.getId();
    mCallbacks.put(tag, callback);

    if (!removeOrAnimateExitRecursive(view, parent, true)) {
      removeView(view, parent);
    }
  }

  @Override
  public void onViewCreate(View view, ViewGroup parent, Snapshot after) {
    if (isCatalystInstanceDestroyed) {
      return;
    }

    if (!hasAnimationForTag(view.getId(), "entering")) {
      return;
    }

    Scheduler strongScheduler = mScheduler.get();
    if (strongScheduler != null) {
      strongScheduler.triggerUI();
    }
    int tag = view.getId();
    HashMap<String, Object> targetValues = after.toTargetMap();

    if (targetValues != null) {
      HashMap<String, Float> preparedValues = prepareDataForAnimationWorklet(targetValues, true);
      mNativeMethodsHolder.startAnimation(tag, "entering", preparedValues);
    }
  }

  @Override
  public void onViewUpdate(View view, Snapshot before, Snapshot after) {
    if (isCatalystInstanceDestroyed) {
      return;
    }
    int tag = view.getId();

    if (!hasAnimationForTag(tag, "layout")) {
      return;
    }

    HashMap<String, Object> targetValues = after.toTargetMap();
    HashMap<String, Object> startValues = before.toCurrentMap();

    // If startValues are equal to targetValues it means that there was no UI Operation changing
    // layout of the View. So dirtiness of that View is false positive
    boolean doNotStartLayout = true;
    for (int i = 0; i < Snapshot.targetKeysToTransform.size(); ++i) {
      double startV =
          ((Number) startValues.get(Snapshot.currentKeysToTransform.get(i))).doubleValue();
      double targetV =
          ((Number) targetValues.get(Snapshot.targetKeysToTransform.get(i))).doubleValue();
      if (startV != targetV) {
        doNotStartLayout = false;
      }
    }
    if (doNotStartLayout) {
      return;
    }

    // View must be in Layout state
    HashMap<String, Float> preparedStartValues = prepareDataForAnimationWorklet(startValues, false);
    HashMap<String, Float> preparedTargetValues =
        prepareDataForAnimationWorklet(targetValues, true);
    HashMap<String, Float> preparedValues = new HashMap<>(preparedTargetValues);
    for (String key : preparedStartValues.keySet()) {
      preparedValues.put(key, preparedStartValues.get(key));
    }
    mNativeMethodsHolder.startAnimation(tag, "layout", preparedValues);
  }

  public void progressLayoutAnimation(int tag, Map<String, Object> newStyle) {
    View view = resolveView(tag);

    if (view == null) {
      return;
    }

    ViewGroup parent = (ViewGroup) view.getParent();

    if (parent == null) {
      return;
    }

    ViewManager viewManager = resolveViewManager(tag);
    ViewManager parentViewManager = resolveViewManager(parent.getId());

    setNewProps(newStyle, view, viewManager, parentViewManager, parent.getId());
  }

  public void endLayoutAnimation(int tag, boolean cancelled, boolean removeView) {
    View exitingView = mExitingViews.get(tag);
    if (exitingView != null && removeView) {
      if (exitingView instanceof ViewGroup && mAncestorsToRemove.contains(tag)) {
        cancelAnimationsInSubviews((ViewGroup) exitingView);
      }

      mExitingViews.remove(tag);
      maybeDropAncestors(exitingView);

      ViewGroup parent = (ViewGroup) exitingView.getParent();
      if (parent != null) {
        removeView(exitingView, parent);
      }
    }
  }

  public void printSubTree(View view, int level) {
    if (level == 0) {
      Log.v("rea", "----------------------");
    }
    if (view == null) {
      return;
    }
    StringBuilder out = new StringBuilder();
    for (int i = 0; i < level; ++i) {
      out.append("+");
    }
    out.append(" TAG:");
    out.append(view.getId());
    out.append(" CLASS:");
    out.append(view.getClass().getSimpleName());
    Log.v("rea", out.toString());

    if (view instanceof ViewGroup) {
      for (int i = 0; i < ((ViewGroup) view).getChildCount(); ++i) {
        printSubTree(((ViewGroup) view).getChildAt(i), level + 1);
      }
    }
  }

  public HashMap<String, Float> prepareDataForAnimationWorklet(
      HashMap<String, Object> values, boolean isTargetValues) {
    HashMap<String, Float> preparedValues = new HashMap<>();
    ArrayList<String> keys;
    if (isTargetValues) {
      keys = Snapshot.targetKeysToTransform;
    } else {
      keys = Snapshot.currentKeysToTransform;
    }
    for (String key : keys) {
      preparedValues.put(key, PixelUtil.toDIPFromPixel((int) values.get(key)));
    }

    DisplayMetrics displayMetrics = new DisplayMetrics();
    Activity currentActivity = mContext.getCurrentActivity();
    if (currentActivity != null) {
      currentActivity.getWindowManager().getDefaultDisplay().getMetrics(displayMetrics);
      int height = displayMetrics.heightPixels;
      int width = displayMetrics.widthPixels;
      preparedValues.put("windowWidth", PixelUtil.toDIPFromPixel(width));
      preparedValues.put("windowHeight", PixelUtil.toDIPFromPixel(height));
    } else {
      preparedValues.put("windowWidth", PixelUtil.toDIPFromPixel(0));
      preparedValues.put("windowHeight", PixelUtil.toDIPFromPixel(0));
    }
    return preparedValues;
  }

  public void setNativeMethods(NativeMethodsHolder nativeMethods) {
    mNativeMethodsHolder = nativeMethods;
  }

  public void setNewProps(
      Map<String, Object> props,
      View view,
      ViewManager viewManager,
      ViewManager parentViewManager,
      Integer parentTag) {
    float x =
        (props.get(Snapshot.ORIGIN_X) != null)
            ? ((Double) props.get(Snapshot.ORIGIN_X)).floatValue()
            : PixelUtil.toDIPFromPixel(view.getLeft());
    float y =
        (props.get(Snapshot.ORIGIN_Y) != null)
            ? ((Double) props.get(Snapshot.ORIGIN_Y)).floatValue()
            : PixelUtil.toDIPFromPixel(view.getTop());
    float width =
        (props.get(Snapshot.WIDTH) != null)
            ? ((Double) props.get(Snapshot.WIDTH)).floatValue()
            : PixelUtil.toDIPFromPixel(view.getWidth());
    float height =
        (props.get(Snapshot.HEIGHT) != null)
            ? ((Double) props.get(Snapshot.HEIGHT)).floatValue()
            : PixelUtil.toDIPFromPixel(view.getHeight());
    updateLayout(view, parentViewManager, parentTag, view.getId(), x, y, width, height);
    props.remove(Snapshot.ORIGIN_X);
    props.remove(Snapshot.ORIGIN_Y);
    props.remove(Snapshot.WIDTH);
    props.remove(Snapshot.HEIGHT);

    if (props.size() == 0) {
      return;
    }

    JavaOnlyMap javaOnlyMap = new JavaOnlyMap();
    for (String key : props.keySet()) {
      addProp(javaOnlyMap, key, props.get(key));
    }

    viewManager.updateProperties(view, new ReactStylesDiffMap(javaOnlyMap));
  }

  private static void addProp(WritableMap propMap, String key, Object value) {
    if (value == null) {
      propMap.putNull(key);
    } else if (value instanceof Double) {
      propMap.putDouble(key, (Double) value);
    } else if (value instanceof Integer) {
      propMap.putInt(key, (Integer) value);
    } else if (value instanceof Number) {
      propMap.putDouble(key, ((Number) value).doubleValue());
    } else if (value instanceof Boolean) {
      propMap.putBoolean(key, (Boolean) value);
    } else if (value instanceof String) {
      propMap.putString(key, (String) value);
    } else if (value instanceof ReadableArray) {
      propMap.putArray(key, (ReadableArray) value);
    } else if (value instanceof ReadableMap) {
      propMap.putMap(key, (ReadableMap) value);
    } else {
      throw new IllegalStateException("Unknown type of animated value [Layout Animations]");
    }
  }

  public void updateLayout(
      View viewToUpdate,
      ViewManager parentViewManager,
      int parentTag,
      int tag,
      float xf,
      float yf,
      float widthf,
      float heightf) {

    int x = Math.round(PixelUtil.toPixelFromDIP(xf));
    int y = Math.round(PixelUtil.toPixelFromDIP(yf));
    int width = Math.round(PixelUtil.toPixelFromDIP(widthf));
    int height = Math.round(PixelUtil.toPixelFromDIP(heightf));
    // Even though we have exact dimensions, we still call measure because some platform views
    // (e.g.
    // Switch) assume that method will always be called before onLayout and onDraw. They use it to
    // calculate and cache information used in the draw pass. For most views, onMeasure can be
    // stubbed out to only call setMeasuredDimensions. For ViewGroups, onLayout should be stubbed
    // out to not recursively call layout on its children: React Native already handles doing
    // that.
    //
    // Also, note measure and layout need to be called *after* all View properties have been
    // updated
    // because of caching and calculation that may occur in onMeasure and onLayout. Layout
    // operations should also follow the native view hierarchy and go top to bottom for
    // consistency
    // with standard layout passes (some views may depend on this).

    viewToUpdate.measure(
        View.MeasureSpec.makeMeasureSpec(width, View.MeasureSpec.EXACTLY),
        View.MeasureSpec.makeMeasureSpec(height, View.MeasureSpec.EXACTLY));

    // We update the layout of the ReactRootView when there is a change in the layout of its
    // child.
    // This is required to re-measure the size of the native View container (usually a
    // FrameLayout) that is configured with layout_height = WRAP_CONTENT or layout_width =
    // WRAP_CONTENT
    //
    // This code is going to be executed ONLY when there is a change in the size of the Root
    // View defined in the js side. Changes in the layout of inner views will not trigger an
    // update
    // on the layout of the Root View.
    ViewParent parent = viewToUpdate.getParent();
    if (parent instanceof RootView) {
      parent.requestLayout();
    }

    // Check if the parent of the view has to layout the view, or the child has to lay itself out.
    if (parentTag % 10 == 1) { // ParentIsARoot
      IViewManagerWithChildren parentViewManagerWithChildren;
      if (parentViewManager instanceof IViewManagerWithChildren) {
        parentViewManagerWithChildren = (IViewManagerWithChildren) parentViewManager;
      } else {
        throw new IllegalViewOperationException(
            "Trying to use view with tag "
                + parentTag
                + " as a parent, but its Manager doesn't implement IViewManagerWithChildren");
      }
      if (!parentViewManagerWithChildren.needsCustomLayoutForChildren()) {
        viewToUpdate.layout(x, y, x + width, y + height);
      }
    } else {
      viewToUpdate.layout(x, y, x + width, y + height);
    }
  }

  public boolean hasAnimationForTag(int tag, String type) {
    return mNativeMethodsHolder.hasAnimation(tag, type);
  }

  public boolean isLayoutAnimationEnabled() {
    return mNativeMethodsHolder != null && mNativeMethodsHolder.isLayoutAnimationEnabled();
  }

  private boolean removeOrAnimateExitRecursive(View view, ViewGroup parent, boolean shouldRemove) {
    int tag = view.getId();
    boolean hasExitAnimation = hasAnimationForTag(tag, "exiting") || mExitingViews.containsKey(tag);
    boolean hasAnimatedChildren = false;
    shouldRemove = shouldRemove && !hasExitAnimation;

    ArrayList<View> toBeRemoved = new ArrayList<>();

    // we might want to keep this view around
    // because one of the (children's) children
    // has an exiting animation
    if (view instanceof ViewGroup) {
      ViewGroup viewGroup = (ViewGroup) view;
      for (int i = viewGroup.getChildCount() - 1; i >= 0; i--) {
        View child = viewGroup.getChildAt(i);
        if (removeOrAnimateExitRecursive(child, viewGroup, shouldRemove)) {
          hasAnimatedChildren = true;
        } else if (shouldRemove) {
          toBeRemoved.add(child);
        }
      }
    }

    boolean wantAnimateExit = hasExitAnimation || hasAnimatedChildren;

    if (hasExitAnimation) {
      Snapshot before = new Snapshot(view, mReanimatedNativeHierarchyManager);
      HashMap<String, Object> currentValues = before.toCurrentMap();
      HashMap<String, Float> preparedValues = prepareDataForAnimationWorklet(currentValues, false);
      if (!mExitingViews.containsKey(tag)) {
        mExitingViews.put(tag, view);
        registerExitingAncestors(view);
        mNativeMethodsHolder.startAnimation(tag, "exiting", preparedValues);
      }
    }

    mNativeMethodsHolder.clearAnimationConfig(tag);

    if (!wantAnimateExit) {
      return false;
    }

    if (hasAnimatedChildren) {
      mAncestorsToRemove.add(tag);
    }

    for (View child : toBeRemoved) {
      removeView(child, (ViewGroup) view);
    }

    return true;
  }

  private void registerExitingAncestors(View view) {
    View parent = (View) view.getParent();
    while (parent != null && !(parent instanceof RootView)) {
      int tag = parent.getId();
      Integer previousValue = mExitingSubviewCountMap.get(tag);
      int newValue = previousValue != null ? previousValue + 1 : 1;
      mExitingSubviewCountMap.put(tag, newValue);

      parent = (View) parent.getParent();
    }
  }

  private void maybeDropAncestors(View exitingView) {
    View parent = (View) exitingView.getParent();
    while (parent != null && !(parent instanceof RootView)) {
      View view = parent;
      parent = (View) view.getParent();
      int tag = view.getId();
      Integer ancestorOfCount = mExitingSubviewCountMap.get(tag);
      ancestorOfCount = ancestorOfCount != null ? ancestorOfCount - 1 : 0;
      if (ancestorOfCount <= 0) {
        if (mAncestorsToRemove.contains(tag)) {
          mAncestorsToRemove.remove(tag);
          if (!mExitingViews.containsKey(tag)) {
            removeView(view, (ViewGroup) parent);
          }
        }
        mExitingSubviewCountMap.remove(tag);
      } else {
        mExitingSubviewCountMap.put(tag, ancestorOfCount);
      }
    }
  }

  private void removeView(View view, ViewGroup parent) {
    int tag = view.getId();
    if (mCallbacks.containsKey(tag)) {
      Runnable callback = mCallbacks.get(tag);
      mCallbacks.remove(tag);
      if (callback != null) {
        callback.run();
      }
    } else {
      mReanimatedNativeHierarchyManager.publicDropView(view);
    }

    parent.removeView(view);
  }

  private void cancelAnimationsInSubviews(ViewGroup view) {
    for (int i = view.getChildCount() - 1; i >= 0; i--) {
      View child = view.getChildAt(i);

      if (mExitingViews.containsKey(child.getId())) {
        endLayoutAnimation(child.getId(), true, true);
      } else if (child instanceof ViewGroup && mAncestorsToRemove.contains(child.getId())) {
        cancelAnimationsInSubviews((ViewGroup) child);
      }
    }
  }

  private View resolveView(int tag) {
    if (mExitingViews.containsKey(tag)) {
      return mExitingViews.get(tag);
    }
    try {
      return mUIManager.resolveView(tag);
    } catch (IllegalViewOperationException e) {
      // view has been removed already
      e.printStackTrace();
      return null;
    }
  }

  private ViewManager resolveViewManager(int tag) {
    try {
      return mReanimatedNativeHierarchyManager.resolveViewManager(tag);
    } catch (Exception e) {
      e.printStackTrace();
      return null;
    }
  }
}
