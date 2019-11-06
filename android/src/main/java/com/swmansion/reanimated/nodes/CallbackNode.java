package com.swmansion.reanimated.nodes;

import android.util.Log;

import androidx.annotation.IntDef;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.common.ReactConstants;
import com.swmansion.reanimated.BuildConfig;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.Utils;

import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;

public class CallbackNode extends MapNode implements Callback, Promise {

    @IntDef({
            CallbackState.READY,
            CallbackState.PENDING,
            CallbackState.RESOLVED,
            CallbackState.REJECTED,
    })
    @Retention(RetentionPolicy.SOURCE)
    public @interface CallbackState {
        int READY = -1;
        int PENDING = 0;
        int RESOLVED = 1;
        int REJECTED = 2;
    }

    private @CallbackState int mState = CallbackState.READY;

    public CallbackNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
        super(nodeID, config, nodesManager);
    }

    @Override
    protected Double evaluate() {
        return Utils.castToDouble(mState);
    }

    @Override
    public WritableMap getValue() {
        updateState(CallbackState.PENDING);
        return super.getValue();
    }

    @Override
    public void setValue(@Nullable WritableMap data) {
        super.setValue(data);
        updateState(CallbackState.RESOLVED);
    }

    public void reject() {
        updateState(CallbackState.REJECTED);
    }

    private void updateState(@CallbackState int state) {
        mState = state;
        value();
    }

    @Override
    public void invoke(Object... args) {
        setValue(Utils.toFakeWritableArray(args));
    }

    @Override
    public void resolve(@Nullable Object value) {
        setValue(Utils.toFakeWritableArray(value));
    }

    @Override
    public void reject(Throwable throwable) {
        reject();
        RejectionWarning.getInstance()
                .put(throwable)
                .log();
    }

    @Override
    public void reject(String code, String message) {
        reject();
        RejectionWarning.getInstance()
                .putCode(code)
                .putMessage(message)
                .log();
    }

    @Override
    public void reject(String code, Throwable throwable) {
        reject();
        RejectionWarning.getInstance()
                .putCode(code)
                .put(throwable)
                .log();
    }

    @Override
    public void reject(String code, @NonNull WritableMap userInfo) {
        reject();
        RejectionWarning.getInstance()
                .putCode(code)
                .put(userInfo)
                .log();
    }

    @Override
    public void reject(Throwable throwable, WritableMap userInfo) {
        reject();
        RejectionWarning.getInstance()
                .put(throwable)
                .put(userInfo)
                .log();
    }

    @Override
    public void reject(String code, String message, Throwable throwable) {
        reject();
        RejectionWarning.getInstance()
                .putCode(code)
                .putMessage(message)
                .put(throwable)
                .log();
    }

    @Override
    public void reject(String code, String message, @NonNull WritableMap userInfo) {
        reject();
        RejectionWarning.getInstance()
                .putCode(code)
                .putMessage(message)
                .put(userInfo)
                .log();
    }

    @Override
    public void reject(String code, Throwable throwable, WritableMap userInfo) {
        reject();
        RejectionWarning.getInstance()
                .putCode(code)
                .put(throwable)
                .put(userInfo)
                .log();
    }

    @Override
    public void reject(String code, String message, Throwable throwable, WritableMap userInfo) {
        reject();
        RejectionWarning.getInstance()
                .putCode(code)
                .putMessage(message)
                .put(throwable)
                .put(userInfo)
                .log();
    }

    @Override
    public void reject(String message) {
        reject();
        RejectionWarning.getInstance()
                .putMessage(message)
                .log();
    }

    private static class RejectionWarning {
        Throwable throwable;
        String code;
        String message;
        WritableMap useInfo;

        public static RejectionWarning getInstance() {
            return new RejectionWarning();
        }

        RejectionWarning() {

        }

        public RejectionWarning put(Throwable throwable) {
            this.throwable = throwable;
            return this;
        }

        public RejectionWarning putCode(String code) {
            this.code = code;
            return this;
        }

        public RejectionWarning putMessage(String message) {
            this.message = message;
            return this;
        }

        public RejectionWarning put(String code, String message) {
            this.code = code;
            this.message = message;
            return this;
        }

        public RejectionWarning put(WritableMap useInfo){
            this.useInfo = useInfo;
            return this;
        }

        public void log(){
            if(BuildConfig.DEBUG) {
                Log.w(ReactConstants.TAG, "Reanimated callback was rejected, see details:\n" +
                        (code != null ? "code: " + code + ",\n" : "") +
                        (message != null ? "message: " + message + ",\n" : "") +
                        (throwable != null ? "throwable: " + throwable.getMessage() + ",\n" : "") +
                        (useInfo != null ? "useInfo: " + useInfo.toString() : "")
                );
            }
        }
    }
}
