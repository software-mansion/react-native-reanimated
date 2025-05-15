import type { SharedValue } from './commonTypes';
import type { Descriptor } from './hook/commonTypes';
export interface ViewDescriptorsSet {
    shareableViewDescriptors: SharedValue<Descriptor[]>;
    add: (item: Descriptor) => void;
    remove: (viewTag: number) => void;
}
export declare function makeViewDescriptorsSet(): ViewDescriptorsSet;
//# sourceMappingURL=ViewDescriptorsSet.d.ts.map