import React from 'react';

export const LayoutConfigContext = { value: false };

interface LayoutConfigProps {
  config: boolean;
  children?: React.ReactNode | undefined;
}

export class LayoutConfig extends React.Component<LayoutConfigProps> {
  _cache: boolean;
  constructor(props: LayoutConfigProps) {
    super(props);
    this._cache = LayoutConfigContext.value;
    LayoutConfigContext.value = props.config;
  }

  render(): React.ReactNode {
    return this.props.children;
  }

  componentDidMount(): void {
    LayoutConfigContext.value = this._cache;
  }
}

// export function LayoutConfig(props: {
//   config: boolean;
//   children?: React.ReactNode | undefined;
// }) {
//   const [state, setState] = useState(props.config);

//   useEffect(() => {
//     setState(false);
//   }, []);

//   return (
//      <LayoutConfigContext.Provider value={state}>
//        {props.children}
//      </LayoutConfigContext.Provider>
//   );
// }
