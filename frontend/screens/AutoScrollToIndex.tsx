import { useEffect } from 'react';

export default function AutoScrollToIndex({ flatRef, index }: { flatRef: any; index: number }) {
  useEffect(() => {
    if (flatRef.current && typeof flatRef.current.scrollToIndex === 'function') {
      flatRef.current.scrollToIndex({ index, animated: false });
    }
  }, [index, flatRef]);
  return null;
}