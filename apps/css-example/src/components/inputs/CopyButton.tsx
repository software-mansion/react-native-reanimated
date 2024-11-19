import { faCheck } from '@fortawesome/free-solid-svg-icons';
import Clipboard from '@react-native-clipboard/clipboard';
import { useRef, useState } from 'react';

import type { ButtonProps } from './Button';
import Button from './Button';

type CopyButtonProps = {
  copyText: string;
} & Omit<ButtonProps, 'onPress'>;

export default function CopyButton({ copyText, ...props }: CopyButtonProps) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showCopied, setShowCopied] = useState(false);

  const handlePress = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    Clipboard.setString(copyText);
    setShowCopied(true);

    timeoutRef.current = setTimeout(() => {
      setShowCopied(false);
    }, 1000);
  };

  return (
    <Button
      {...props}
      activeOpacity={1}
      icon={showCopied ? faCheck : undefined}
      title={showCopied ? 'Copied!' : 'Copy'}
      onPress={handlePress}
    />
  );
}
