import useBrokenLinks from '@docusaurus/useBrokenLinks';

export function Anchor({ id }: { id: string }) {
  useBrokenLinks().collectAnchor(id);
  return <a id={id} />;
}

export default Anchor;
