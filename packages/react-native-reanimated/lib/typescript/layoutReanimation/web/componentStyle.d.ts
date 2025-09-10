export interface ReanimatedSnapshot {
    top: number;
    left: number;
    width: number;
    height: number;
    scrollOffsets: ScrollOffsets;
}
export interface ScrollOffsets {
    scrollTopOffset: number;
    scrollLeftOffset: number;
}
export declare const snapshots: WeakMap<HTMLElement, ReanimatedSnapshot>;
export declare function makeElementVisible(element: HTMLElement, delay: number): void;
export declare function setElementPosition(element: HTMLElement, snapshot: ReanimatedSnapshot): void;
//# sourceMappingURL=componentStyle.d.ts.map