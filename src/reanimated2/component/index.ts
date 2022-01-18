import ReanimatedFlatlist from './FlatList';
import WrappedComponents from './WrappedComponents';

const ReanimatedComponents = {
  ...WrappedComponents,
  FlatList: ReanimatedFlatlist,
};

export default ReanimatedComponents;
