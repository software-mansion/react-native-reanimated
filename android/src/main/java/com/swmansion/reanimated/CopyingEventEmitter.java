package com.swmansion.reanimated;

import androidx.annotation.Nullable;

import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.uimanager.events.Event;
import com.facebook.react.uimanager.events.RCTEventEmitter;


/* package */ class CopyingEventEmitter implements RCTEventEmitter {

    private class CopiedEvent extends Event<CopiedEvent> {
        String mEventName;
        WritableMap mEventData;

        private void init(int viewTag, String eventName, @Nullable WritableMap eventData) {
            super.init(viewTag);
            mEventName = eventName;
            mEventData = eventData == null ? null : eventData.copy();
        }

        @Override
        public String getEventName() {
            return mEventName;
        }

        @Override
        public void dispatch(RCTEventEmitter rctEventEmitter) {
            rctEventEmitter.receiveEvent(getViewTag(), getEventName(), mEventData);
        }
    }

    Event mEvent;

    public synchronized Event copyEvent(Event event) {
        event.dispatch(this);
        return mEvent;
    }

    @Override
    public void receiveEvent(int targetTag, String eventName, @Nullable WritableMap eventData) {
        CopiedEvent event = new CopiedEvent();
        event.init(targetTag, eventName, eventData);
        mEvent = event;
    }

    @Override
    public void receiveTouches(String eventName, WritableArray touches, WritableArray changedIndices) {
        throw new RuntimeException("receiveTouches is not supported by animated events");
    }
}
