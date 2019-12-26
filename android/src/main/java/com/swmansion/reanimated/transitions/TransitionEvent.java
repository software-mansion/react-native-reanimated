package com.swmansion.reanimated.transitions;

import androidx.annotation.IntDef;
import androidx.core.util.Pools;

import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeMap;
import com.facebook.react.uimanager.events.Event;
import com.facebook.react.uimanager.events.RCTEventEmitter;

public class TransitionEvent extends Event<TransitionEvent> {

    public static final String EVENT_NAME = "onTransitionStateChange";

    @IntDef({
            State.BEGAN,
            State.END
    })
    public @interface State {
        int BEGAN = 0;
        int END = 1;
    }

    private static final int TOUCH_EVENTS_POOL_SIZE = 7; // magic

    private static final Pools.SynchronizedPool<TransitionEvent> EVENTS_POOL =
            new Pools.SynchronizedPool<>(TOUCH_EVENTS_POOL_SIZE);

    public static TransitionEvent obtain(int viewTag, @State int nextState) {
        TransitionEvent event = EVENTS_POOL.acquire();
        if (event == null) {
            event = new TransitionEvent();
        }
        event.init(viewTag, nextState);
        return event;
    }

    private WritableMap mExtraData;

    private TransitionEvent() {
    }

    protected void init(int viewTag, @State int nextState) {
        super.init(viewTag);
        mExtraData = new WritableNativeMap();
        mExtraData.putInt("target", viewTag);
        mExtraData.putInt("state", nextState);
    }

    @Override
    public void onDispose() {
        mExtraData = null;
        EVENTS_POOL.release(this);
    }

    @Override
    public String getEventName() {
        return EVENT_NAME;
    }

    @Override
    public boolean canCoalesce() {
        // TODO: coalescing
        return false;
    }

    @Override
    public short getCoalescingKey() {
        // TODO: coalescing
        return 0;
    }

    @Override
    public void dispatch(RCTEventEmitter rctEventEmitter) {
        rctEventEmitter.receiveEvent(getViewTag(), EVENT_NAME, mExtraData);
    }
}
