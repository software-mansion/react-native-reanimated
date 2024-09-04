// TODO: Maybe replace with react-native-live-markdown with custom parser
// to add text highlighting

import { useMemo } from 'react';
import { TextInput } from 'react-native';

type CodeBlockProps = {
  code: string;
};

export default function CodeBlock({ code }: CodeBlockProps) {
  const formattedCode = useMemo(() => {
    // Remove empty lines at the beginning and end
    const result = code.replace(/^\s*\n/, '').replace(/\n\s*$/, '');
    // trim whitespace from the left to the first character (in any line)
    const firstChar = result.search(/\S|$/);
    return result.replace(new RegExp(`^ {${firstChar}}`, 'gm'), '');
  }, [code]);

  return (
    <TextInput multiline editable={false} scrollEnabled={false}>
      {formattedCode}
    </TextInput>
  );
}
