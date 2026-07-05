import { useState, useEffect } from 'react';

export function useViewport(): number {
  const [vw, setVw] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1440
  );
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return vw;
}
