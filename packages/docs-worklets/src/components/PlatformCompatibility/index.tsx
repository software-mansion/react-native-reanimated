import React from 'react';

interface BooleanIconProps {
  value: boolean;
}

function BooleanIcon({ value }: BooleanIconProps) {
  return <>{value ? '✅' : '❌'}</>;
}

interface PlatformCompatibilityProps {
  android?: boolean;
  ios?: boolean;
  web?: boolean;
}

export default function PlatformCompatibility({
  android = false,
  ios = false,
  web = false,
}: PlatformCompatibilityProps) {
  return (
    <table className="platform-compatibility">
      <thead>
        <tr>
          <th>Android</th>
          <th>iOS</th>
          <th>Web</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <BooleanIcon value={android} />
          </td>
          <td>
            <BooleanIcon value={ios} />
          </td>
          <td>
            <BooleanIcon value={web} />
          </td>
        </tr>
      </tbody>
    </table>
  );
}
