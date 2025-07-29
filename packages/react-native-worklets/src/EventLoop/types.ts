type Callback = () => void;
export type Queue = {
  normal: Array<Callback>,
  priority: Array<Callback>,
  isMicroTasksProcessing: boolean,
};