export type LogBoxLogLevel = 'warn' | 'error' | 'fatal' | 'syntax';
type Message = {
    content: string;
    substitutions: {
        length: number;
        offset: number;
    }[];
};
type Category = string;
interface Location {
    row: number;
    column: number;
}
interface CodeFrame {
    content: string;
    location?: Location | null;
    fileName: string;
    collapse?: boolean;
}
type ComponentStack = CodeFrame[];
type ComponentStackType = 'legacy' | 'stack';
export type LogData = {
    level: LogBoxLogLevel;
    message: Message;
    category: Category;
    componentStack: ComponentStack;
    componentStackType: ComponentStackType | null;
    stack?: string;
};
export declare const addLogBoxLog: (data: LogData) => void;
export {};
//# sourceMappingURL=LogBox.d.ts.map