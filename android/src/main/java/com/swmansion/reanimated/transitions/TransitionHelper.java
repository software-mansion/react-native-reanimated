package com.swmansion.reanimated.transitions;

import android.util.Log;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.transition.Transition;
import androidx.transition.TransitionManager;
import androidx.transition.TransitionValues;

import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.uimanager.UIManagerModule;
import com.facebook.react.uimanager.events.EventDispatcher;

import java.util.ArrayList;

import javax.annotation.Nullable;

public class TransitionHelper implements Transition.TransitionListener {
    private EventDispatcher mEventDispatcher;
    private ArrayList<Transition> mTransitions;
    private @Nullable
    Callback mCallback;
    private ViewGroup mRootView;
    private Boolean mBegan;
    private int mInvocations;

    public TransitionHelper(final ReactContext context, View rootView, final ReadableMap config, final @Nullable Callback callback) {
        mEventDispatcher = context.getNativeModule(UIManagerModule.class).getEventDispatcher();
        mCallback = callback;
        init(rootView, config.getArray("transitions"));
    }

    public void init(View rootView, ReadableArray transitions){
        mTransitions = new ArrayList<>();
        mBegan = false;
        mInvocations = 0;

        if (rootView instanceof ViewGroup) {
            mRootView = ((ViewGroup) rootView);
            for (int i = 0, size = transitions.size(); i < size; i++) {
                Transition transition = TransitionUtils.inflate(transitions.getMap(i));
                transition.addListener(this);
                mTransitions.add(transition);
            }
        }
    }

    public void beginDelayedTransition() {
        for (int i = 0; i < mTransitions.size(); i++) {
            TransitionManager.beginDelayedTransition(
                    (ViewGroup) mRootView,
                    mTransitions.get(i));
        }
    }

    private void dispatch(@TransitionEvent.State int nextState) {
        if (mRootView != null){
            mEventDispatcher.dispatchEvent(TransitionEvent.obtain(mRootView.getId(), nextState));
        }
    }

    private void began() {
        if (!mBegan){
            dispatch(TransitionEvent.State.BEGAN);
            mBegan = true;
        }
    }

    private void end() {
        mInvocations++;
        if(mTransitions.size() == mInvocations) {
            if (mCallback != null) mCallback.invoke();
            dispatch(TransitionEvent.State.END);
        }
    }

    @Override
    public void onTransitionStart(@NonNull Transition transition) {
        began();
    }

    @Override
    public void onTransitionEnd(@NonNull Transition transition) {
        mTransitions.remove(transition);
        transition.removeListener(this);
        end();
    }

    @Override
    public void onTransitionCancel(@NonNull Transition transition) {

    }

    @Override
    public void onTransitionPause(@NonNull Transition transition) {

    }

    @Override
    public void onTransitionResume(@NonNull Transition transition) {

    }
}