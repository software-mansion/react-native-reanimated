import type { SharedValue, StyleUpdaterContainer } from './commonTypes';
import type { Descriptor } from './hook/commonTypes';
export interface ViewDescriptorsSet {
    shareableViewDescriptors: SharedValue<Descriptor[]>;
    add: (item: Descriptor, updaterContainer?: StyleUpdaterContainer) => void;
    remove: (viewTag: number) => void;
}
export declare function makeViewDescriptorsSet(): ViewDescriptorsSet;
//# sourceMappingURL=ViewDescriptorsSet.d.ts.map