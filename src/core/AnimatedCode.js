import useCode from '../derived/useCode';

function Code({ exec, children, dependencies = [] }) {
  useCode(children || exec, dependencies);

  return null;
}

export default Code;
