import type {ScrollHandlerInternal, ScrollHandlerProcessed} from "./useAnimatedScrollHandler";
import {useEvent, useHandler} from "./index";
import type {RNNativeScrollEvent} from "./commonTypes";



export function useComposedScrollHandler<Context extends Record<string, unknown>>(
    handlerList: Array<ScrollHandlerProcessed<Context> | undefined>, // <- I don't know how to correctly type this
){

    /**
     * unknown casting seems legitimate. See {@link useHandler} override
     */
    const internalHandlerList = handlerList as unknown as Array<ScrollHandlerInternal>;

    const {doDependenciesDiffer} = useHandler({}, internalHandlerList);

    const allWorklets = internalHandlerList.flatMap(handler => handler.workletEventHandler?.worklet ? handler.workletEventHandler?.worklet : []);

    return useEvent<RNNativeScrollEvent, Context>(
        (event) => {
            'worklet';
            allWorklets.forEach(it => it(event));
        },
        ['onScroll', 'onScrollBeginDrag', 'onScrollEndDrag', 'onMomentumScrollBegin', 'onMomentumScrollEnd'],
        doDependenciesDiffer,
    );
}
