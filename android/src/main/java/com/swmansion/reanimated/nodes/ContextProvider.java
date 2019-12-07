package com.swmansion.reanimated.nodes;

import androidx.annotation.NonNull;

import java.util.ArrayList;

class ContextProvider {
    final ArrayList<CallFuncNode> mContext;

    ContextProvider(final @NonNull ArrayList<CallFuncNode> context) {
        mContext = new ArrayList<>();
        mContext.addAll(context);
    }

    protected void runInContext(final Runnable action) {
        for (int i = 0; i < mContext.size(); i++) {
            mContext.get(i).beginContext();
        }

        action.run();

        for (int i = mContext.size() - 1; i >= 0; i--) {
            mContext.get(i).endContext();
        }
    }

    static class ValueManagingContextProvider extends ContextProvider implements ValueManagingNode {

        final ValueManagingNode mEvaluator;

        ValueManagingContextProvider(ValueManagingNode evaluator, final ArrayList<CallFuncNode> context) {
            super(context);
            mEvaluator = evaluator;
        }

        @Override
        public void setValue(final Object value) {
            runInContext(new Runnable() {
                @Override
                public void run() {
                    mEvaluator.setValue(value);
                }
            });
        }
    }
}
