/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.react.runtime;

import static com.facebook.infer.annotation.Assertions.assertNotNull;
import static com.facebook.infer.annotation.Assertions.nullsafeFIXME;
import static com.facebook.infer.annotation.ThreadConfined.UI;
import static java.lang.Boolean.FALSE;
import static java.lang.Boolean.TRUE;

import android.app.Activity;
import android.content.Context;
import android.os.Bundle;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import com.facebook.common.logging.FLog;
import com.facebook.infer.annotation.Assertions;
import com.facebook.infer.annotation.Nullsafe;
import com.facebook.infer.annotation.ThreadConfined;
import com.facebook.infer.annotation.ThreadSafe;
import com.facebook.react.JSEngineResolutionAlgorithm;
import com.facebook.react.MemoryPressureRouter;
import com.facebook.react.ReactHost;
import com.facebook.react.ReactInstanceEventListener;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.JSBundleLoader;
import com.facebook.react.bridge.MemoryPressureListener;
import com.facebook.react.bridge.NativeArray;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactMarker;
import com.facebook.react.bridge.ReactMarkerConstants;
import com.facebook.react.bridge.ReactNoCrashBridgeNotAllowedSoftException;
import com.facebook.react.bridge.ReactNoCrashSoftException;
import com.facebook.react.bridge.ReactSoftExceptionLogger;
import com.facebook.react.bridge.UiThreadUtil;
import com.facebook.react.bridge.queue.QueueThreadExceptionHandler;
import com.facebook.react.bridge.queue.ReactQueueConfiguration;
import com.facebook.react.common.LifecycleState;
import com.facebook.react.common.build.ReactBuildConfig;
import com.facebook.react.config.ReactFeatureFlags;
import com.facebook.react.devsupport.DevSupportManagerBase;
import com.facebook.react.devsupport.DisabledDevSupportManager;
import com.facebook.react.devsupport.interfaces.DevSupportManager;
import com.facebook.react.fabric.ComponentFactory;
import com.facebook.react.fabric.FabricUIManager;
import com.facebook.react.interfaces.TaskInterface;
import com.facebook.react.interfaces.exceptionmanager.ReactJsExceptionHandler;
import com.facebook.react.interfaces.fabric.ReactSurface;
import com.facebook.react.modules.core.DefaultHardwareBackBtnHandler;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.react.runtime.internal.bolts.Continuation;
import com.facebook.react.runtime.internal.bolts.Task;
import com.facebook.react.runtime.internal.bolts.TaskCompletionSource;
import com.facebook.react.uimanager.UIManagerModule;
import com.facebook.react.uimanager.events.BlackHoleEventDispatcher;
import com.facebook.react.uimanager.events.EventDispatcher;
import com.facebook.react.views.imagehelper.ResourceDrawableIdHelper;
import java.lang.ref.WeakReference;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import kotlin.Unit;
import kotlin.jvm.functions.Function0;

/**
 * A ReactHost is an object that manages a single {@link ReactInstance}. A ReactHost can be
 * constructed without initializing the ReactInstance, and it will continue to exist after the
 * instance is destroyed. This class ensures safe access to the ReactInstance and the JS runtime;
 * methods that operate on the instance use Bolts Tasks to defer the operation until the instance
 * has been initialized. They also return a Task so the caller can be notified of completion.
 *
 * @see <a href="https://github.com/BoltsFramework/Bolts-Android#tasks">Bolts Android</a>
 */
@ThreadSafe
@Nullsafe(Nullsafe.Mode.LOCAL)
public class ReactHostImpl implements ReactHost {

  // TODO T61403233 Make this configurable by product code
  private static final boolean DEV = ReactBuildConfig.DEBUG;
  private static final String TAG = "ReactHost";
  private static final int BRIDGELESS_MARKER_INSTANCE_KEY = 1;
  private static final AtomicInteger mCounter = new AtomicInteger(0);

  private final Context mContext;
  private final ReactHostDelegate mReactHostDelegate;
  private final ComponentFactory mComponentFactory;
  private final ReactJsExceptionHandler mReactJsExceptionHandler;
  private final DevSupportManager mDevSupportManager;
  private final Executor mBGExecutor;
  private final Executor mUIExecutor;
  private final QueueThreadExceptionHandler mQueueThreadExceptionHandler;
  private final Set<ReactSurfaceImpl> mAttachedSurfaces =
      Collections.synchronizedSet(new HashSet<>());
  private final MemoryPressureRouter mMemoryPressureRouter;
  private final boolean mAllowPackagerServerAccess;
  private final boolean mUseDevSupport;
  private final Collection<ReactInstanceEventListener> mReactInstanceEventListeners =
      Collections.synchronizedList(new ArrayList<>());

  private final BridgelessAtomicRef<Task<ReactInstance>> mReactInstanceTaskRef =
      new BridgelessAtomicRef<>(
          Task.forResult(
              nullsafeFIXME(
                  null, "forResult parameter supports null, but is not annotated as @Nullable")));

  private final BridgelessAtomicRef<BridgelessReactContext> mBridgelessReactContextRef =
      new BridgelessAtomicRef<>();

  private final AtomicReference<Activity> mActivity = new AtomicReference<>();
  private final AtomicReference<WeakReference<Activity>> mLastUsedActivity =
      new AtomicReference<>(new WeakReference<>(null));
  private final BridgelessReactStateTracker mBridgelessReactStateTracker =
      new BridgelessReactStateTracker(DEV);
  private final ReactLifecycleStateManager mReactLifecycleStateManager =
      new ReactLifecycleStateManager(mBridgelessReactStateTracker);
  private final int mId = mCounter.getAndIncrement();
  private @Nullable JSEngineResolutionAlgorithm mJSEngineResolutionAlgorithm = null;
  private MemoryPressureListener mMemoryPressureListener;
  private @Nullable DefaultHardwareBackBtnHandler mDefaultHardwareBackBtnHandler;

  private final Set<Function0<Unit>> mBeforeDestroyListeners =
      Collections.synchronizedSet(new HashSet<>());

  public ReactHostImpl(
      Context context,
      ReactHostDelegate delegate,
      ComponentFactory componentFactory,
      boolean allowPackagerServerAccess,
      ReactJsExceptionHandler reactJsExceptionHandler,
      boolean useDevSupport) {
    this(
        context,
        delegate,
        componentFactory,
        Executors.newSingleThreadExecutor(),
        Task.UI_THREAD_EXECUTOR,
        reactJsExceptionHandler,
        allowPackagerServerAccess,
        useDevSupport);
  }

  public ReactHostImpl(
      Context context,
      ReactHostDelegate delegate,
      ComponentFactory componentFactory,
      Executor bgExecutor,
      Executor uiExecutor,
      ReactJsExceptionHandler reactJsExceptionHandler,
      boolean allowPackagerServerAccess,
      boolean useDevSupport) {
    mContext = context;
    mReactHostDelegate = delegate;
    mComponentFactory = componentFactory;
    mBGExecutor = bgExecutor;
    mUIExecutor = uiExecutor;
    mReactJsExceptionHandler = reactJsExceptionHandler;
    mQueueThreadExceptionHandler = ReactHostImpl.this::handleHostException;
    mMemoryPressureRouter = new MemoryPressureRouter(context);
    mMemoryPressureListener =
        level ->
            callWithExistingReactInstance(
                "handleMemoryPressure(" + level + ")",
                reactInstance -> reactInstance.handleMemoryPressure(level));
    mAllowPackagerServerAccess = allowPackagerServerAccess;
    if (DEV) {
      mDevSupportManager =
          new BridgelessDevSupportManager(
              ReactHostImpl.this, mContext, mReactHostDelegate.getJsMainModulePath());
    } else {
      mDevSupportManager = new DisabledDevSupportManager();
    }
    mUseDevSupport = useDevSupport;
  }

  @Override
  public LifecycleState getLifecycleState() {
    return mReactLifecycleStateManager.getLifecycleState();
  }

  /**
   * This function can be used to initialize the ReactInstance in a background thread before a
   * surface needs to be rendered. It is not necessary to call this function; startSurface() will
   * initialize the ReactInstance if it hasn't been preloaded.
   *
   * @return A Task that completes when the instance is initialized. The task will be faulted if any
   *     errors occur during initialization, and will be cancelled if ReactHost.destroy() is called
   *     before it completes.
   */
  @Override
  public TaskInterface<Void> start() {
    if (ReactFeatureFlags.enableBridgelessArchitectureNewCreateReloadDestroy) {
      return newStart();
    }

    return oldStart();
  }

  /** Initialize and run a React Native surface in a background without mounting real views. */
  /* package */
  TaskInterface<Void> prerenderSurface(final ReactSurfaceImpl surface) {
    final String method = "prerenderSurface(surfaceId = " + surface.getSurfaceID() + ")";
    log(method, "Schedule");

    attachSurface(surface);
    return callAfterGetOrCreateReactInstance(
        method,
        reactInstance -> {
          log(method, "Execute");
          reactInstance.prerenderSurface(surface);
        });
  }

  /**
   * Start rendering a React Native surface on screen.
   *
   * @param surface The ReactSurface to render
   * @return A Task that will complete when startSurface has been called.
   */
  /** package */
  TaskInterface<Void> startSurface(final ReactSurfaceImpl surface) {
    final String method = "startSurface(surfaceId = " + surface.getSurfaceID() + ")";
    log(method, "Schedule");

    attachSurface(surface);
    return callAfterGetOrCreateReactInstance(
        method,
        reactInstance -> {
          log(method, "Execute");
          reactInstance.startSurface(surface);
        });
  }

  /**
   * Stop rendering a React Native surface.
   *
   * @param surface The surface to stop
   * @return A Task that will complete when stopSurface has been called.
   */
  /** package */
  TaskInterface<Void> stopSurface(final ReactSurfaceImpl surface) {
    final String method = "stopSurface(surfaceId = " + surface.getSurfaceID() + ")";
    log(method, "Schedule");

    detachSurface(surface);
    return callWithExistingReactInstance(
            method,
            reactInstance -> {
              log(method, "Execute");
              reactInstance.stopSurface(surface);
            })
        .makeVoid();
  }

  /**
   * To be called when the host activity is resumed.
   *
   * @param activity The host activity
   */
  @ThreadConfined(UI)
  @Override
  public void onHostResume(
      final @Nullable Activity activity,
      @Nullable DefaultHardwareBackBtnHandler defaultBackButtonImpl) {
    mDefaultHardwareBackBtnHandler = defaultBackButtonImpl;
    onHostResume(activity);
  }

  @ThreadConfined(UI)
  @Override
  public void onHostResume(final @Nullable Activity activity) {
    final String method = "onHostResume(activity)";
    log(method);

    setCurrentActivity(activity);
    ReactContext currentContext = getCurrentReactContext();

    // TODO(T137233065): Enable DevSupportManager here
    mReactLifecycleStateManager.moveToOnHostResume(currentContext, getCurrentActivity());
  }

  @ThreadConfined(UI)
  @Override
  public void onHostPause(final @Nullable Activity activity) {
    final String method = "onHostPause(activity)";
    log(method);

    ReactContext currentContext = getCurrentReactContext();

    Activity currentActivity = getCurrentActivity();
    if (currentActivity != null) {
      String currentActivityClass = currentActivity.getClass().getSimpleName();
      String activityClass = activity == null ? "null" : activity.getClass().getSimpleName();
      Assertions.assertCondition(
          activity == currentActivity,
          "Pausing an activity that is not the current activity, this is incorrect! "
              + "Current activity: "
              + currentActivityClass
              + " "
              + "Paused activity: "
              + activityClass);
    }

    // TODO(T137233065): Disable DevSupportManager here
    mDefaultHardwareBackBtnHandler = null;
    mReactLifecycleStateManager.moveToOnHostPause(currentContext, currentActivity);
  }

  /** To be called when the host activity is paused. */
  @ThreadConfined(UI)
  @Override
  public void onHostPause() {
    final String method = "onHostPause()";
    log(method);

    ReactContext currentContext = getCurrentReactContext();

    // TODO(T137233065): Disable DevSupportManager here
    mDefaultHardwareBackBtnHandler = null;
    mReactLifecycleStateManager.moveToOnHostPause(currentContext, getCurrentActivity());
  }

  /** To be called when the host activity is destroyed. */
  @ThreadConfined(UI)
  @Override
  public void onHostDestroy() {
    final String method = "onHostDestroy()";
    log(method);

    // TODO(T137233065): Disable DevSupportManager here
    moveToHostDestroy(getCurrentReactContext());
  }

  @ThreadConfined(UI)
  @Override
  public void onHostDestroy(@Nullable Activity activity) {
    final String method = "onHostDestroy(activity)";
    log(method);

    Activity currentActivity = getCurrentActivity();

    // TODO(T137233065): Disable DevSupportManager here
    if (currentActivity == activity) {
      moveToHostDestroy(getCurrentReactContext());
    }
  }

  /**
   * Returns current ReactContext which could be nullable if ReactInstance hasn't been created.
   *
   * @return The {@link BridgelessReactContext} associated with ReactInstance.
   */
  @Override
  public @Nullable ReactContext getCurrentReactContext() {
    return mBridgelessReactContextRef.getNullable();
  }

  @Override
  public DevSupportManager getDevSupportManager() {
    return assertNotNull(mDevSupportManager);
  }

  @Override
  public ReactSurface createSurface(
      Context context, String moduleName, @Nullable Bundle initialProps) {
    ReactSurfaceImpl surface = new ReactSurfaceImpl(context, moduleName, initialProps);
    surface.attachView(new ReactSurfaceView(context, surface));
    surface.attach(this);
    return surface;
  }

  public MemoryPressureRouter getMemoryPressureRouter() {
    return mMemoryPressureRouter;
  }

  /* package */ boolean isInstanceInitialized() {
    final ReactInstance reactInstance = mReactInstanceTaskRef.get().getResult();
    return reactInstance != null;
  }

  @ThreadConfined(UI)
  @Override
  public boolean onBackPressed() {
    UiThreadUtil.assertOnUiThread();
    final ReactInstance reactInstance = mReactInstanceTaskRef.get().getResult();
    if (reactInstance == null) {
      return false;
    }

    DeviceEventManagerModule deviceEventManagerModule =
        reactInstance.getNativeModule(DeviceEventManagerModule.class);
    if (deviceEventManagerModule == null) {
      return false;
    }

    deviceEventManagerModule.emitHardwareBackPressed();
    return true;
  }

  public @Nullable ReactQueueConfiguration getReactQueueConfiguration() {
    synchronized (mReactInstanceTaskRef) {
      Task<ReactInstance> task = mReactInstanceTaskRef.get();
      if (!task.isFaulted() && !task.isCancelled() && task.getResult() != null) {
        return task.getResult().getReactQueueConfiguration();
      }
    }
    return null;
  }

  /** Add a listener to be notified of ReactInstance events. */
  public void addReactInstanceEventListener(ReactInstanceEventListener listener) {
    mReactInstanceEventListeners.add(listener);
  }

  /** Remove a listener previously added with {@link #addReactInstanceEventListener}. */
  public void removeReactInstanceEventListener(ReactInstanceEventListener listener) {
    mReactInstanceEventListeners.remove(listener);
  }

  /**
   * Entrypoint to reload the ReactInstance. If the ReactInstance is destroying, will wait until
   * destroy is finished, before reloading.
   *
   * @param reason {@link String} describing why ReactHost is being reloaded (e.g. js error, user
   *     tap on reload button)
   * @return A task that completes when React Native reloads
   */
  @Override
  public TaskInterface<Void> reload(String reason) {
    final String method = "reload()";
    if (ReactFeatureFlags.enableBridgelessArchitectureNewCreateReloadDestroy) {
      return Task.call(
              () -> {
                Task<Void> reloadTask = null;
                if (mDestroyTask != null) {
                  log(method, "Waiting for destroy to finish, before reloading React Native.");
                  reloadTask =
                      mDestroyTask
                          .continueWithTask(task -> newGetOrCreateReloadTask(reason), mBGExecutor)
                          .makeVoid();
                } else {
                  reloadTask = newGetOrCreateReloadTask(reason).makeVoid();
                }

                return reloadTask.continueWithTask(
                    task -> {
                      if (task.isFaulted()) {
                        mReactHostDelegate.handleInstanceException(task.getError());
                        return newGetOrCreateDestroyTask("Reload failed", task.getError());
                      }

                      return task;
                    },
                    mBGExecutor);
              },
              mBGExecutor)
          .continueWithTask(Task::getResult);
    }

    return oldReload(reason);
  }

  /**
   * Entrypoint to destroy the ReactInstance. If the ReactInstance is reloading, will wait until
   * reload is finished, before destroying.
   *
   * @param reason {@link String} describing why ReactHost is being destroyed (e.g. memmory
   *     pressure)
   * @param ex {@link Exception} exception that caused the trigger to destroy ReactHost (or null)
   *     This exception will be used to log properly the cause of destroy operation.
   * @return A task that completes when React Native gets destroyed.
   */
  @Override
  public TaskInterface<Void> destroy(String reason, @Nullable Exception ex) {
    final String method = "destroy()";
    if (ReactFeatureFlags.enableBridgelessArchitectureNewCreateReloadDestroy) {
      return Task.call(
              () -> {
                if (mReloadTask != null) {
                  log(
                      method,
                      "Reloading React Native. Waiting for reload to finish before destroying React Native.");
                  return mReloadTask.continueWithTask(
                      task -> newGetOrCreateDestroyTask(reason, ex), mBGExecutor);
                }
                return newGetOrCreateDestroyTask(reason, ex);
              },
              mBGExecutor)
          .continueWithTask(Task::getResult);
    }

    oldDestroy(reason, ex);
    return Task.forResult(nullsafeFIXME(null, "Empty Destroy Task"));
  }

  private MemoryPressureListener createMemoryPressureListener(ReactInstance reactInstance) {
    WeakReference<ReactInstance> weakReactInstance = new WeakReference<>(reactInstance);
    return (level) -> {
      mBGExecutor.execute(
          () -> {
            @Nullable ReactInstance strongReactInstance = weakReactInstance.get();
            if (strongReactInstance != null) {
              strongReactInstance.handleMemoryPressure(level);
            }
          });
    };
  }

  @Nullable
  /* package */ Activity getCurrentActivity() {
    return mActivity.get();
  }

  @Nullable
  /* package */ Activity getLastUsedActivity() {
    @Nullable WeakReference<Activity> lastUsedActivityWeakRef = mLastUsedActivity.get();
    if (lastUsedActivityWeakRef != null) {
      return lastUsedActivityWeakRef.get();
    }
    return null;
  }

  private void setCurrentActivity(@Nullable Activity activity) {
    mActivity.set(activity);
    if (activity != null) {
      mLastUsedActivity.set(new WeakReference<>(activity));
    }
  }

  /**
   * Get the {@link EventDispatcher} from the {@link FabricUIManager}. This always returns an
   * EventDispatcher, even if the instance isn't alive; in that case, it returns a {@link
   * BlackHoleEventDispatcher} which no-ops.
   *
   * @return The real {@link EventDispatcher} if the instance is alive; otherwise, a {@link
   *     BlackHoleEventDispatcher}.
   */
  /* package */ EventDispatcher getEventDispatcher() {
    final ReactInstance reactInstance = mReactInstanceTaskRef.get().getResult();
    if (reactInstance == null) {
      return BlackHoleEventDispatcher.get();
    }

    return reactInstance.getEventDispatcher();
  }

  /* package */ @Nullable
  FabricUIManager getUIManager() {
    final ReactInstance reactInstance = mReactInstanceTaskRef.get().getResult();
    if (reactInstance == null) {
      return null;
    }
    return reactInstance.getUIManager();
  }

  /* package */ <T extends NativeModule> boolean hasNativeModule(Class<T> nativeModuleInterface) {
    final ReactInstance reactInstance = mReactInstanceTaskRef.get().getResult();
    if (reactInstance != null) {
      return reactInstance.hasNativeModule(nativeModuleInterface);
    }
    return false;
  }

  /* package */ Collection<NativeModule> getNativeModules() {
    final ReactInstance reactInstance = mReactInstanceTaskRef.get().getResult();
    if (reactInstance != null) {
      return reactInstance.getNativeModules();
    }
    return new ArrayList<>();
  }

  /* package */ @Nullable
  <T extends NativeModule> T getNativeModule(Class<T> nativeModuleInterface) {
    if (nativeModuleInterface == UIManagerModule.class) {
      ReactSoftExceptionLogger.logSoftExceptionVerbose(
          TAG,
          new ReactNoCrashBridgeNotAllowedSoftException(
              "getNativeModule(UIManagerModule.class) cannot be called when the bridge is disabled"));
    }

    final ReactInstance reactInstance = mReactInstanceTaskRef.get().getResult();
    if (reactInstance != null) {
      return reactInstance.getNativeModule(nativeModuleInterface);
    }
    return null;
  }

  /* package */
  DefaultHardwareBackBtnHandler getDefaultBackButtonHandler() {
    return () -> {
      UiThreadUtil.assertOnUiThread();
      if (mDefaultHardwareBackBtnHandler != null) {
        mDefaultHardwareBackBtnHandler.invokeDefaultOnBackPressed();
      }
    };
  }

  /* package */ Task<Boolean> loadBundle(final JSBundleLoader bundleLoader) {
    final String method = "loadBundle()";
    log(method, "Schedule");

    return callWithExistingReactInstance(
        method,
        reactInstance -> {
          log(method, "Execute");
          reactInstance.loadJSBundle(bundleLoader);
        });
  }

  /* package */ Task<Boolean> registerSegment(
      final int segmentId, final String path, final Callback callback) {
    final String method =
        "registerSegment(segmentId = \"" + segmentId + "\", path = \"" + path + "\")";
    log(method, "Schedule");

    return callWithExistingReactInstance(
        method,
        reactInstance -> {
          log(method, "Execute");
          reactInstance.registerSegment(segmentId, path);
          assertNotNull(callback).invoke();
        });
  }

  /* package */ void handleHostException(Exception e) {
    final String method = "handleHostException(message = \"" + e.getMessage() + "\")";
    log(method);

    if (DEV) {
      mDevSupportManager.handleException(e);
    }
    destroy(method, e);
    mReactHostDelegate.handleInstanceException(e);
  }

  /**
   * Call a function on a JS module that has been registered as callable.
   *
   * @param moduleName The name of the JS module
   * @param methodName The function to call
   * @param args Arguments to be passed to the function
   * @return A Task that will complete when the function call has been enqueued on the JS thread.
   */
  /* package */ Task<Boolean> callFunctionOnModule(
      final String moduleName, final String methodName, final NativeArray args) {
    final String method = "callFunctionOnModule(\"" + moduleName + "\", \"" + methodName + "\")";
    return callWithExistingReactInstance(
        method,
        reactInstance -> {
          reactInstance.callFunctionOnModule(moduleName, methodName, args);
        });
  }

  /* package */ void attachSurface(ReactSurfaceImpl surface) {
    final String method = "attachSurface(surfaceId = " + surface.getSurfaceID() + ")";
    log(method);

    synchronized (mAttachedSurfaces) {
      mAttachedSurfaces.add(surface);
    }
  }

  /* package */ void detachSurface(ReactSurfaceImpl surface) {
    final String method = "detachSurface(surfaceId = " + surface.getSurfaceID() + ")";
    log(method);

    synchronized (mAttachedSurfaces) {
      mAttachedSurfaces.remove(surface);
    }
  }

  /* package */ boolean isSurfaceAttached(ReactSurfaceImpl surface) {
    synchronized (mAttachedSurfaces) {
      return mAttachedSurfaces.contains(surface);
    }
  }

  /* package */ boolean isSurfaceWithModuleNameAttached(String moduleName) {
    synchronized (mAttachedSurfaces) {
      for (ReactSurfaceImpl surface : mAttachedSurfaces) {
        if (surface.getModuleName().equals(moduleName)) {
          return true;
        }
      }
      return false;
    }
  }

  @Override
  public void addBeforeDestroyListener(@NonNull Function0<Unit> onBeforeDestroy) {
    synchronized (mBeforeDestroyListeners) {
      mBeforeDestroyListeners.add(onBeforeDestroy);
    }
  }

  @Override
  public void removeBeforeDestroyListener(@NonNull Function0<Unit> onBeforeDestroy) {
    synchronized (mBeforeDestroyListeners) {
      mBeforeDestroyListeners.remove(onBeforeDestroy);
    }
  }

  /* package */ interface VeniceThenable<T> {
    void then(T t);
  }

  @ThreadConfined("ReactHost")
  private @Nullable Task<Void> mStartTask = null;

  private Task<Void> oldStart() {
    final String method = "oldStart()";
    return Task.call(
            () -> {
              if (mStartTask == null) {
                log(method, "Schedule");
                mStartTask =
                    getOrCreateReactInstanceTask()
                        .continueWithTask(
                            task -> {
                              if (task.isFaulted()) {
                                destroy(
                                    "oldStart() failure: " + task.getError().getMessage(),
                                    task.getError());
                                mReactHostDelegate.handleInstanceException(task.getError());
                              }

                              return task;
                            },
                            mBGExecutor)
                        .makeVoid();
              }
              return mStartTask;
            },
            mBGExecutor)
        .continueWithTask(Task::getResult);
  }

  private Task<Void> newStart() {
    final String method = "newStart()";
    return Task.call(
            () -> {
              if (mStartTask == null) {
                log(method, "Schedule");
                mStartTask =
                    waitThenCallNewGetOrCreateReactInstanceTask()
                        .continueWithTask(
                            (task) -> {
                              if (task.isFaulted()) {
                                mReactHostDelegate.handleInstanceException(task.getError());
                                // Wait for destroy to finish
                                return newGetOrCreateDestroyTask(
                                        "newStart() failure: " + task.getError().getMessage(),
                                        task.getError())
                                    .continueWithTask(destroyTask -> Task.forError(task.getError()))
                                    .makeVoid();
                              }
                              return task.makeVoid();
                            },
                            mBGExecutor);
              }
              return mStartTask;
            },
            mBGExecutor)
        .continueWithTask(Task::getResult);
  }

  @ThreadConfined(UI)
  private void moveToHostDestroy(@Nullable ReactContext currentContext) {
    mReactLifecycleStateManager.moveToOnHostDestroy(currentContext);
    setCurrentActivity(null);
  }

  private void raiseSoftException(String method, String message) {
    raiseSoftException(method, message, null);
  }

  private void raiseSoftException(String method, String message, @Nullable Throwable throwable) {
    log(method, message);
    if (ReactFeatureFlags.enableBridgelessArchitectureSoftExceptions) {
      if (throwable != null) {
        ReactSoftExceptionLogger.logSoftException(
            TAG, new ReactNoCrashSoftException(method + ": " + message, throwable));
        return;
      }

      ReactSoftExceptionLogger.logSoftException(
          TAG, new ReactNoCrashSoftException(method + ": " + message));
    }
  }

  private Task<Boolean> callWithExistingReactInstance(
      final String callingMethod, final VeniceThenable<ReactInstance> continuation) {
    final String method = "callWithExistingReactInstance(" + callingMethod + ")";

    return mReactInstanceTaskRef
        .get()
        .onSuccess(
            task -> {
              final ReactInstance reactInstance = task.getResult();
              if (reactInstance == null) {
                raiseSoftException(method, "Execute: ReactInstance null. Dropping work.");
                return FALSE;
              }

              continuation.then(reactInstance);
              return TRUE;
            },
            mBGExecutor);
  }

  private Task<Void> callAfterGetOrCreateReactInstance(
      final String callingMethod, final VeniceThenable<ReactInstance> runnable) {
    final String method = "callAfterGetOrCreateReactInstance(" + callingMethod + ")";

    return getOrCreateReactInstanceTask()
        .onSuccess(
            (Continuation<ReactInstance, Void>)
                task -> {
                  final ReactInstance reactInstance = task.getResult();
                  if (reactInstance == null) {
                    raiseSoftException(method, "Execute: ReactInstance is null");
                    return null;
                  }

                  runnable.then(reactInstance);
                  return null;
                },
            mBGExecutor)
        .continueWith(
            task -> {
              if (task.isFaulted()) {
                handleHostException(task.getError());
              }
              return null;
            },
            mBGExecutor);
  }

  private BridgelessReactContext getOrCreateReactContext() {
    final String method = "getOrCreateReactContext()";
    return mBridgelessReactContextRef.getOrCreate(
        () -> {
          log(method, "Creating BridgelessReactContext");
          return new BridgelessReactContext(mContext, ReactHostImpl.this);
        });
  }

  /**
   * Entrypoint to create the ReactInstance.
   *
   * <p>If the ReactInstance is reloading, will return the reload task. If the ReactInstance is
   * destroying, will wait until destroy is finished, before creating.
   */
  private Task<ReactInstance> getOrCreateReactInstanceTask() {
    if (ReactFeatureFlags.enableBridgelessArchitectureNewCreateReloadDestroy) {
      return Task.call(this::waitThenCallNewGetOrCreateReactInstanceTask, mBGExecutor)
          .continueWithTask(Task::getResult);
    }

    return oldGetOrCreateReactInstanceTask();
  }

  @ThreadConfined("ReactHost")
  private Task<ReactInstance> waitThenCallNewGetOrCreateReactInstanceTask() {
    return waitThenCallNewGetOrCreateReactInstanceTaskWithRetries(0, 4);
  }

  @ThreadConfined("ReactHost")
  private Task<ReactInstance> waitThenCallNewGetOrCreateReactInstanceTaskWithRetries(
      int tryNum, int maxTries) {
    final String method = "waitThenCallNewGetOrCreateReactInstanceTaskWithRetries";
    if (mReloadTask != null) {
      log(method, "React Native is reloading. Return reload task.");
      return mReloadTask;
    }

    if (mDestroyTask != null) {
      boolean shouldTryAgain = tryNum < maxTries;
      if (shouldTryAgain) {
        log(
            method,
            "React Native is tearing down."
                + "Wait for teardown to finish, before trying again (try count = "
                + tryNum
                + ").");
        return mDestroyTask.onSuccessTask(
            (task) -> waitThenCallNewGetOrCreateReactInstanceTaskWithRetries(tryNum + 1, maxTries),
            mBGExecutor);
      }

      raiseSoftException(
          method,
          "React Native is tearing down. Not wait for teardown to finish: reached max retries.");
    }

    return newGetOrCreateReactInstanceTask();
  }

  @ThreadConfined("ReactHost")
  private Task<ReactInstance> newGetOrCreateReactInstanceTask() {
    final String method = "newGetOrCreateReactInstanceTask()";
    log(method);

    return mReactInstanceTaskRef.getOrCreate(
        () -> {
          log(method, "Start");
          ReactMarker.logMarker(
              ReactMarkerConstants.REACT_BRIDGELESS_LOADING_START, BRIDGELESS_MARKER_INSTANCE_KEY);

          return getJsBundleLoader()
              .onSuccess(
                  task -> {
                    final JSBundleLoader bundleLoader = task.getResult();
                    final BridgelessReactContext reactContext = getOrCreateReactContext();
                    final DevSupportManager devSupportManager = getDevSupportManager();
                    reactContext.setJSExceptionHandler(devSupportManager);

                    log(method, "Creating ReactInstance");
                    final ReactInstance instance =
                        new ReactInstance(
                            reactContext,
                            mReactHostDelegate,
                            mComponentFactory,
                            devSupportManager,
                            mQueueThreadExceptionHandler,
                            mReactJsExceptionHandler,
                            mUseDevSupport);

                    if (ReactFeatureFlags
                        .unstable_bridgelessArchitectureMemoryPressureHackyBoltsFix) {
                      mMemoryPressureListener = createMemoryPressureListener(instance);
                    }
                    mMemoryPressureRouter.addMemoryPressureListener(mMemoryPressureListener);

                    log(method, "Loading JS Bundle");
                    instance.loadJSBundle(bundleLoader);

                    log(
                        method,
                        "Calling DevSupportManagerBase.onNewReactContextCreated(reactContext)");
                    devSupportManager.onNewReactContextCreated(reactContext);

                    reactContext.runOnJSQueueThread(
                        () -> {
                          // Executing on the JS thread to ensurethat we're done
                          // loading the JS bundle.
                          // TODO T76081936 Move this if we switch to a sync RTE
                          ReactMarker.logMarker(
                              ReactMarkerConstants.REACT_BRIDGELESS_LOADING_END,
                              BRIDGELESS_MARKER_INSTANCE_KEY);
                        });

                    class Result {
                      final ReactInstance mInstance = instance;
                      final ReactContext mContext = reactContext;
                      final boolean mIsReloading = mReloadTask != null;
                    }

                    return new Result();
                  },
                  mBGExecutor)
              .onSuccess(
                  task -> {
                    final ReactInstance reactInstance = task.getResult().mInstance;
                    final ReactContext reactContext = task.getResult().mContext;
                    final boolean isReloading = task.getResult().mIsReloading;
                    final boolean isManagerResumed =
                        mReactLifecycleStateManager.getLifecycleState() == LifecycleState.RESUMED;

                    /**
                     * ReactContext.onHostResume() should only be called when the user navigates to
                     * the first React Native screen.
                     *
                     * <p>During init: The application puts the React manager in a resumed state,
                     * when the user navigates to a React Native screen. Two types of init: (1) If
                     * React Native init happens when the user navigates to a React Native screen,
                     * the React manager will get resumed on init start, so
                     * ReactContext.onHostResume() will be executed here. (2) If React Native init
                     * happens before the user navigates to a React Native screen (i.e: React Native
                     * is preloaded), the React manager won't be in a resumed state here. So
                     * ReactContext.onHostResume() won't be executed here. But, when the user
                     * navigates to their first React Native screen, the application will call
                     * ReactHost.onHostResume(). That will call ReactContext.onHostResume().
                     *
                     * <p>During reloads, if the manager isn't resumed, call
                     * ReactContext.onHostResume(). If React Native is reloading, it seems
                     * reasonable to assume that: (1) We must have navigated to a React Native
                     * screen in the past, or (2) We must be on a React Native screen.
                     */
                    if (isReloading && !isManagerResumed) {
                      mReactLifecycleStateManager.moveToOnHostResume(
                          reactContext, getCurrentActivity());
                    } else {
                      /**
                       * Call ReactContext.onHostResume() only when already in the resumed state
                       * which aligns with the bridge https://fburl.com/diffusion/2qhxmudv.
                       */
                      mReactLifecycleStateManager.resumeReactContextIfHostResumed(
                          reactContext, getCurrentActivity());
                    }

                    ReactInstanceEventListener[] listeners =
                        new ReactInstanceEventListener[mReactInstanceEventListeners.size()];
                    final ReactInstanceEventListener[] finalListeners =
                        mReactInstanceEventListeners.toArray(listeners);

                    log(method, "Executing ReactInstanceEventListeners");
                    for (ReactInstanceEventListener listener : finalListeners) {
                      if (listener != null) {
                        listener.onReactContextInitialized(reactContext);
                      }
                    }
                    return reactInstance;
                  },
                  mUIExecutor);
        });
  }

  private Task<ReactInstance> oldGetOrCreateReactInstanceTask() {
    final String method = "oldGetOrCreateReactInstanceTask()";
    log(method);

    return mReactInstanceTaskRef.getOrCreate(
        () -> {
          log(method, "Start");
          ReactMarker.logMarker(
              ReactMarkerConstants.REACT_BRIDGELESS_LOADING_START, BRIDGELESS_MARKER_INSTANCE_KEY);

          final BridgelessReactContext reactContext = getOrCreateReactContext();
          final DevSupportManager devSupportManager = getDevSupportManager();
          reactContext.setJSExceptionHandler(devSupportManager);

          return getJsBundleLoader()
              .onSuccess(
                  task -> {
                    final JSBundleLoader bundleLoader = task.getResult();
                    log(method, "Creating ReactInstance");
                    final ReactInstance instance =
                        new ReactInstance(
                            reactContext,
                            mReactHostDelegate,
                            mComponentFactory,
                            devSupportManager,
                            mQueueThreadExceptionHandler,
                            mReactJsExceptionHandler,
                            mUseDevSupport);

                    if (ReactFeatureFlags
                        .unstable_bridgelessArchitectureMemoryPressureHackyBoltsFix) {
                      mMemoryPressureListener = createMemoryPressureListener(instance);
                    }
                    mMemoryPressureRouter.addMemoryPressureListener(mMemoryPressureListener);

                    log(method, "Loading JS Bundle");
                    instance.loadJSBundle(bundleLoader);

                    log(
                        method,
                        "Calling DevSupportManagerBase.onNewReactContextCreated(reactContext)");
                    devSupportManager.onNewReactContextCreated(reactContext);
                    reactContext.runOnJSQueueThread(
                        () -> {
                          // Executing on the JS thread to ensurethat we're done
                          // loading the JS bundle.
                          // TODO T76081936 Move this if we switchto a sync RTE
                          ReactMarker.logMarker(
                              ReactMarkerConstants.REACT_BRIDGELESS_LOADING_END,
                              BRIDGELESS_MARKER_INSTANCE_KEY);
                        });
                    return instance;
                  },
                  mBGExecutor)
              .onSuccess(
                  task -> {
                    /*
                     Call ReactContext.onHostResume() only when already in the resumed state which
                     aligns with the bridge https://fburl.com/diffusion/2qhxmudv.
                    */
                    mReactLifecycleStateManager.resumeReactContextIfHostResumed(
                        reactContext, getCurrentActivity());

                    ReactInstanceEventListener[] listeners =
                        new ReactInstanceEventListener[mReactInstanceEventListeners.size()];
                    final ReactInstanceEventListener[] finalListeners =
                        mReactInstanceEventListeners.toArray(listeners);

                    log(method, "Executing ReactInstanceEventListeners");
                    for (ReactInstanceEventListener listener : finalListeners) {
                      if (listener != null) {
                        listener.onReactContextInitialized(reactContext);
                      }
                    }

                    return task.getResult();
                  },
                  mUIExecutor);
        });
  }

  private Task<JSBundleLoader> getJsBundleLoader() {
    final String method = "getJSBundleLoader()";
    log(method);

    if (DEV && mAllowPackagerServerAccess) {
      return isMetroRunning()
          .onSuccessTask(
              task -> {
                boolean isMetroRunning = task.getResult();
                if (isMetroRunning) {
                  // Since metro is running, fetch the JS bundle from the server
                  return loadJSBundleFromMetro();
                }
                return Task.forResult(mReactHostDelegate.getJsBundleLoader());
              },
              mBGExecutor);
    } else {
      if (DEV) {
        FLog.d(TAG, "Packager server access is disabled in this environment");
      }

      /**
       * In prod mode: fall back to the JS bundle loader from the delegate.
       *
       * <p>Note: Create the prod JSBundleLoader inside a Task.call. Why: If JSBundleLoader creation
       * throws an exception, the task will fault, and we'll go through the ReactHost error
       * reporting pipeline.
       */
      return Task.call(() -> mReactHostDelegate.getJsBundleLoader());
    }
  }

  private Task<Boolean> isMetroRunning() {
    final String method = "isMetroRunning()";
    log(method);

    final TaskCompletionSource<Boolean> taskCompletionSource = new TaskCompletionSource<>();
    final DevSupportManager asyncDevSupportManager = getDevSupportManager();

    asyncDevSupportManager.isPackagerRunning(
        packagerIsRunning -> {
          log(method, "Async result = " + packagerIsRunning);
          taskCompletionSource.setResult(packagerIsRunning);
        });

    return taskCompletionSource.getTask();
  }

  /**
   * TODO(T104078367): Ensure that if creating this JSBundleLoader fails, we route the errors
   * through ReactHost's error reporting pipeline
   */
  private Task<JSBundleLoader> loadJSBundleFromMetro() {
    final String method = "loadJSBundleFromMetro()";
    log(method);

    final TaskCompletionSource<JSBundleLoader> taskCompletionSource = new TaskCompletionSource<>();
    final DevSupportManagerBase asyncDevSupportManager =
        ((DevSupportManagerBase) getDevSupportManager());
    String bundleURL =
        asyncDevSupportManager
            .getDevServerHelper()
            .getDevServerBundleURL(
                Assertions.assertNotNull(asyncDevSupportManager.getJSAppBundleName()));

    asyncDevSupportManager.reloadJSFromServer(
        bundleURL,
        () -> {
          log(method, "Creating BundleLoader");
          JSBundleLoader bundleLoader =
              JSBundleLoader.createCachedBundleFromNetworkLoader(
                  bundleURL, asyncDevSupportManager.getDownloadedJSBundleFile());
          taskCompletionSource.setResult(bundleLoader);
        });

    return taskCompletionSource.getTask();
  }

  private void log(String method, String message) {
    mBridgelessReactStateTracker.enterState("ReactHost{" + mId + "}." + method + ": " + message);
  }

  private void log(String method) {
    mBridgelessReactStateTracker.enterState("ReactHost{" + mId + "}." + method);
  }

  private void stopAttachedSurfaces(String method, ReactInstance reactInstance) {
    log(method, "Stopping all React Native surfaces");
    synchronized (mAttachedSurfaces) {
      for (ReactSurfaceImpl surface : mAttachedSurfaces) {
        reactInstance.stopSurface(surface);
        surface.clear();
      }
    }
  }

  private void startAttachedSurfaces(String method, ReactInstance reactInstance) {
    log(method, "Restarting previously running React Native Surfaces");
    synchronized (mAttachedSurfaces) {
      for (ReactSurfaceImpl surface : mAttachedSurfaces) {
        reactInstance.startSurface(surface);
      }
    }
  }

  @ThreadConfined("ReactHost")
  private @Nullable Task<ReactInstance> mReloadTask = null;

  private interface ReactInstanceTaskUnwrapper {
    @Nullable
    ReactInstance unwrap(Task<ReactInstance> task, String stage);
  }

  private ReactInstanceTaskUnwrapper createReactInstanceUnwraper(
      String tag, String method, String reason) {

    return (task, stage) -> {
      final ReactInstance reactInstance = task.getResult();
      final ReactInstance currentReactInstance = mReactInstanceTaskRef.get().getResult();

      final String stageLabel = "Stage: " + stage;
      final String reasonLabel = tag + " reason: " + reason;
      if (task.isFaulted()) {
        final Exception ex = task.getError();
        final String faultLabel = "Fault reason: " + ex.getMessage();
        raiseSoftException(
            method,
            tag
                + ": ReactInstance task faulted. "
                + stageLabel
                + ". "
                + faultLabel
                + ". "
                + reasonLabel);
        return currentReactInstance;
      }

      if (task.isCancelled()) {
        raiseSoftException(
            method, tag + ": ReactInstance task cancelled. " + stageLabel + ". " + reasonLabel);
        return currentReactInstance;
      }

      if (reactInstance == null) {
        raiseSoftException(
            method, tag + ": ReactInstance task returned null. " + stageLabel + ". " + reasonLabel);
        return currentReactInstance;
      }

      if (currentReactInstance != null && reactInstance != currentReactInstance) {
        raiseSoftException(
            method,
            tag
                + ": Detected two different ReactInstances. Returning old. "
                + stageLabel
                + ". "
                + reasonLabel);
      }

      return reactInstance;
    };
  }

  /**
   * The ReactInstance is loaded. Tear it down, and re-create it.
   *
   * <p>If the ReactInstance is in an "invalid state", make a "best effort" attempt to clean up
   * React. "invalid state" means: ReactInstance task is faulted; ReactInstance is null; React
   * instance task is cancelled; BridgelessReactContext is null. This can typically happen if the
   * ReactInstance task work throws an exception.
   */
  @ThreadConfined("ReactHost")
  private Task<ReactInstance> newGetOrCreateReloadTask(String reason) {
    final String method = "newGetOrCreateReloadTask()";
    log(method);

    // Log how React Native is destroyed
    // TODO(T136397487): Remove after Venice is shipped to 100%
    raiseSoftException(method, reason);

    ReactInstanceTaskUnwrapper reactInstanceTaskUnwrapper =
        createReactInstanceUnwraper("Reload", method, reason);

    if (mReloadTask == null) {
      mReloadTask =
          mReactInstanceTaskRef
              .get()
              .continueWithTask(
                  (task) -> {
                    log(method, "Starting React Native reload");
                    final ReactInstance reactInstance =
                        reactInstanceTaskUnwrapper.unwrap(task, "1: Starting reload");

                    final ReactContext reactContext = mBridgelessReactContextRef.getNullable();
                    if (reactContext == null) {
                      raiseSoftException(method, "ReactContext is null. Reload reason: " + reason);
                    }

                    if (reactContext != null
                        && mReactLifecycleStateManager.getLifecycleState()
                            == LifecycleState.RESUMED) {
                      log(method, "Calling ReactContext.onHostPause()");
                      reactContext.onHostPause();
                    }

                    return Task.forResult(reactInstance);
                  },
                  mUIExecutor)
              .continueWithTask(
                  task -> {
                    final ReactInstance reactInstance =
                        reactInstanceTaskUnwrapper.unwrap(task, "2: Surface shutdown");

                    if (reactInstance == null) {
                      raiseSoftException(method, "Skipping surface shutdown: ReactInstance null");
                      return task;
                    }

                    stopAttachedSurfaces(method, reactInstance);
                    return task;
                  },
                  mBGExecutor)
              .continueWithTask(
                  (task) -> {
                    reactInstanceTaskUnwrapper.unwrap(
                        task, "3: Executing Before Destroy Listeners");

                    Set<Function0<Unit>> beforeDestroyListeners;
                    synchronized (mBeforeDestroyListeners) {
                      beforeDestroyListeners = new HashSet<>(mBeforeDestroyListeners);
                    }

                    for (Function0<Unit> destroyListener : beforeDestroyListeners) {
                      destroyListener.invoke();
                    }
                    return task;
                  },
                  mUIExecutor)
              .continueWithTask(
                  task -> {
                    reactInstanceTaskUnwrapper.unwrap(task, "4: Destroying ReactContext");

                    log(method, "Removing memory pressure listener");
                    mMemoryPressureRouter.removeMemoryPressureListener(mMemoryPressureListener);

                    final ReactContext reactContext = mBridgelessReactContextRef.getNullable();
                    if (reactContext != null) {
                      log(method, "Destroying ReactContext");
                      reactContext.destroy();
                    }

                    if (mUseDevSupport && reactContext != null) {
                      log(
                          method,
                          "Calling DevSupportManager.onReactInstanceDestroyed(reactContext)");
                      mDevSupportManager.onReactInstanceDestroyed(reactContext);
                    }

                    return task;
                  },
                  mUIExecutor)
              .continueWithTask(
                  task -> {
                    final ReactInstance reactInstance =
                        reactInstanceTaskUnwrapper.unwrap(task, "5: Destroying ReactInstance");

                    if (reactInstance == null) {
                      raiseSoftException(
                          method, "Skipping ReactInstance.destroy(): ReactInstance null");
                    } else {
                      log(method, "Destroying ReactInstance");
                      reactInstance.destroy();
                    }

                    log(method, "Resetting ReactContext ref");
                    mBridgelessReactContextRef.reset();

                    log(method, "Resetting ReactInstance task ref");
                    mReactInstanceTaskRef.reset();

                    log(method, "Resetting preload task ref");
                    mStartTask = null;

                    // Kickstart a new ReactInstance create
                    return newGetOrCreateReactInstanceTask();
                  },
                  mBGExecutor)
              .continueWithTask(
                  task -> {
                    final ReactInstance reactInstance =
                        reactInstanceTaskUnwrapper.unwrap(task, "7: Restarting surfaces");

                    if (reactInstance == null) {
                      raiseSoftException(method, "Skipping surface restart: ReactInstance null");
                      return task;
                    }

                    startAttachedSurfaces(method, reactInstance);

                    return task;
                  },
                  mBGExecutor)
              .continueWithTask(
                  task -> {
                    if (task.isFaulted()) {
                      Exception fault = task.getError();
                      raiseSoftException(
                          method,
                          "Error during reload. ReactInstance task faulted. Fault reason: "
                              + fault.getMessage()
                              + ". Reload reason: "
                              + reason,
                          task.getError());
                    }

                    if (task.isCancelled()) {
                      raiseSoftException(
                          method,
                          "Error during reload. ReactInstance task cancelled. Reload reason: "
                              + reason);
                    }

                    log(method, "Resetting reload task ref");
                    mReloadTask = null;
                    return task;
                  },
                  mBGExecutor);
    }

    return mReloadTask;
  }

  @ThreadConfined("ReactHost")
  private @Nullable Task<Void> mDestroyTask = null;

  /**
   * The ReactInstance is loaded. Tear it down.
   *
   * <p>If the ReactInstance is in an "invalid state", make a "best effort" attempt to clean up
   * React. "invalid state" means: ReactInstance task is faulted; ReactInstance is null; React
   * instance task is cancelled; BridgelessReactContext is null. This can typically happen if the *
   * ReactInstance task work throws an exception.
   */
  @ThreadConfined("ReactHost")
  private Task<Void> newGetOrCreateDestroyTask(final String reason, @Nullable Exception ex) {
    final String method = "newGetOrCreateDestroyTask()";
    log(method);

    // Log how React Native is destroyed
    // TODO(T136397487): Remove after Venice is shipped to 100%
    raiseSoftException(method, reason, ex);

    ReactInstanceTaskUnwrapper reactInstanceTaskUnwrapper =
        createReactInstanceUnwraper("Destroy", method, reason);

    if (mDestroyTask == null) {
      mDestroyTask =
          mReactInstanceTaskRef
              .get()
              .continueWithTask(
                  task -> {
                    log(method, "Starting React Native destruction");

                    final ReactInstance reactInstance =
                        reactInstanceTaskUnwrapper.unwrap(task, "1: Starting destroy");

                    // Step 1: Destroy DevSupportManager
                    if (mUseDevSupport) {
                      log(method, "DevSupportManager cleanup");
                      // TODO(T137233065): Disable DevSupportManager here
                      mDevSupportManager.stopInspector();
                    }

                    final ReactContext reactContext = mBridgelessReactContextRef.getNullable();

                    if (reactContext == null) {
                      raiseSoftException(method, "ReactContext is null. Destroy reason: " + reason);
                    }

                    // Step 2: Move React Native to onHostDestroy()
                    log(method, "Move ReactHost to onHostDestroy()");
                    mReactLifecycleStateManager.moveToOnHostDestroy(reactContext);

                    return Task.forResult(reactInstance);
                  },
                  mUIExecutor)
              .continueWithTask(
                  task -> {
                    final ReactInstance reactInstance =
                        reactInstanceTaskUnwrapper.unwrap(task, "2: Stopping surfaces");

                    if (reactInstance == null) {
                      raiseSoftException(method, "Skipping surface shutdown: ReactInstance null");
                      return task;
                    }

                    // Step 3: Stop all React Native surfaces
                    stopAttachedSurfaces(method, reactInstance);

                    // TODO(T161461674): Should we clear mAttachedSurfaces?
                    // Not clearing mAttachedSurfaces could lead to a memory leak.

                    return task;
                  },
                  mBGExecutor)
              .continueWithTask(
                  task -> {
                    reactInstanceTaskUnwrapper.unwrap(
                        task, "3: Executing Before Destroy Listeners");

                    Set<Function0<Unit>> beforeDestroyListeners;
                    synchronized (mBeforeDestroyListeners) {
                      beforeDestroyListeners = new HashSet<>(mBeforeDestroyListeners);
                    }

                    for (Function0<Unit> destroyListener : beforeDestroyListeners) {
                      destroyListener.invoke();
                    }
                    return task;
                  },
                  mUIExecutor)
              .continueWithTask(
                  task -> {
                    reactInstanceTaskUnwrapper.unwrap(task, "4: Destroying ReactContext");

                    final ReactContext reactContext = mBridgelessReactContextRef.getNullable();

                    if (reactContext == null) {
                      raiseSoftException(method, "ReactContext is null. Destroy reason: " + reason);
                    }

                    // Step 4: De-register the memory pressure listener
                    log(method, "Destroying MemoryPressureRouter");
                    mMemoryPressureRouter.destroy(mContext);

                    if (reactContext != null) {
                      log(method, "Destroying ReactContext");
                      reactContext.destroy();
                    }

                    // Reset current activity
                    setCurrentActivity(null);

                    // Clear ResourceIdleDrawableIdMap
                    ResourceDrawableIdHelper.getInstance().clear();

                    return task;
                  },
                  mUIExecutor)
              .continueWithTask(
                  task -> {
                    final ReactInstance reactInstance =
                        reactInstanceTaskUnwrapper.unwrap(task, "5: Destroying ReactInstance");

                    if (reactInstance == null) {
                      raiseSoftException(
                          method, "Skipping ReactInstance.destroy(): ReactInstance null");
                    } else {
                      log(method, "Destroying ReactInstance");
                      reactInstance.destroy();
                    }

                    log(method, "Resetting ReactContext ref ");
                    mBridgelessReactContextRef.reset();

                    log(method, "Resetting ReactInstance task ref");
                    mReactInstanceTaskRef.reset();

                    log(method, "Resetting Preload task ref");
                    mStartTask = null;

                    log(method, "Resetting destroy task ref");
                    mDestroyTask = null;
                    return task;
                  },
                  mBGExecutor)
              .continueWith(
                  task -> {
                    if (task.isFaulted()) {
                      Exception fault = task.getError();
                      raiseSoftException(
                          method,
                          "React destruction failed. ReactInstance task faulted. Fault reason: "
                              + fault.getMessage()
                              + ". Destroy reason: "
                              + reason,
                          task.getError());
                    }

                    if (task.isCancelled()) {
                      raiseSoftException(
                          method,
                          "React destruction failed. ReactInstance task cancelled. Destroy reason: "
                              + reason);
                    }
                    return null;
                  });
    }

    return mDestroyTask;
  }

  /** Destroy and recreate the ReactInstance and context. */
  private Task<Void> oldReload(String reason) {
    final String method = "oldReload()";
    log(method);

    // Log how React Native is destroyed
    // TODO(T136397487): Remove after Venice is shipped to 100%
    raiseSoftException(method, reason);

    synchronized (mReactInstanceTaskRef) {
      mMemoryPressureRouter.removeMemoryPressureListener(mMemoryPressureListener);
      oldDestroyReactInstanceAndContext(method, reason);

      return callAfterGetOrCreateReactInstance(
          method,
          reactInstance -> {
            // Restart any attached surfaces
            log(method, "Restarting Surfaces");
            synchronized (mAttachedSurfaces) {
              for (ReactSurfaceImpl surface : mAttachedSurfaces) {
                reactInstance.startSurface(surface);
              }
            }
          });
    }
  }

  /** Destroy the specified instance and context. */
  private void oldDestroy(String reason, @Nullable Exception ex) {
    final String method = "oldDestroy()";
    log(method);

    // Log how React Native is destroyed
    // TODO(T136397487): Remove after Venice is shipped to 100%
    raiseSoftException(method, reason, ex);

    synchronized (mReactInstanceTaskRef) {
      // Prevent re-destroy when ReactInstance has been reset already, which could happen when
      // calling destroy multiple times on the same thread
      ReactInstance reactInstance = mReactInstanceTaskRef.get().getResult();
      if (reactInstance == null) {
        return;
      }

      // Retain a reference to current ReactContext before de-referenced by mReactContextRef
      final ReactContext reactContext = getCurrentReactContext();

      if (reactContext != null) {
        mMemoryPressureRouter.destroy(reactContext);
      }

      oldDestroyReactInstanceAndContext(method, reason);

      // Remove all attached surfaces
      log(method, "Clearing attached surfaces");
      synchronized (mAttachedSurfaces) {
        mAttachedSurfaces.clear();
      }

      Task.call(
          (Callable<Void>)
              () -> {
                moveToHostDestroy(reactContext);
                return null;
              },
          mUIExecutor);
    }
  }

  private void oldDestroyReactInstanceAndContext(final String callingMethod, final String reason) {
    final String method = "oldDestroyReactInstanceAndContext(" + callingMethod + ")";
    log(method);

    synchronized (mReactInstanceTaskRef) {
      Task<ReactInstance> task = mReactInstanceTaskRef.getAndReset();
      if (!task.isFaulted() && !task.isCancelled()) {
        final ReactInstance instance = task.getResult();

        // Noop on redundant calls to destroyReactInstance()
        if (instance == null) {
          log(method, "ReactInstance is null");
          return;
        }

        /*
         * The surfaces should be stopped before the instance destroy.
         * Calling stop directly on instance ensures we keep the list of attached surfaces for restart.
         */
        log(method, "Stopping surfaces");
        synchronized (mAttachedSurfaces) {
          for (ReactSurfaceImpl surface : mAttachedSurfaces) {
            instance.stopSurface(surface);
            surface.clear();
          }
        }

        ReactContext reactContext = getCurrentReactContext();

        // Reset the ReactContext inside the DevSupportManager
        if (reactContext != null) {
          log(method, "DevSupportManager.onReactInstanceDestroyed()");
          getDevSupportManager().onReactInstanceDestroyed(reactContext);
          log(method, "Destroy ReactContext");
          mBridgelessReactContextRef.reset();
        }

        mBGExecutor.execute(
            () -> {
              // instance.destroy() is time consuming and is confined to ReactHost thread.
              log(method, "Destroy ReactInstance");
              instance.destroy();

              // Re-enable preloads
              log(method, "Resetting Preload task ref");
              mStartTask = null;
            });
      } else {
        raiseSoftException(
            method,
            ("Not cleaning up ReactInstance: task.isFaulted() = "
                    + task.isFaulted()
                    + ", task.isCancelled() = "
                    + task.isCancelled())
                + ". Reason: "
                + reason);

        mBGExecutor.execute(
            () -> {
              log(method, "Resetting Preload task ref");
              mStartTask = null;
            });
      }
    }
  }

  public void setJSEngineResolutionAlgorithm(
      @Nullable JSEngineResolutionAlgorithm jsEngineResolutionAlgorithm) {
    mJSEngineResolutionAlgorithm = jsEngineResolutionAlgorithm;
  }

  public @Nullable JSEngineResolutionAlgorithm getJSEngineResolutionAlgorithm() {
    return mJSEngineResolutionAlgorithm;
  }
}
