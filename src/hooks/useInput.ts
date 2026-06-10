import { useEffect, useRef } from 'react';

export function useInput() {
  const keys = useRef(new Set<string>());

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      keys.current.add(e.code);
      // 스페이스바 페이지 스크롤 방지
      if (e.code === 'Space') e.preventDefault();
    };
    const onUp = (e: KeyboardEvent) => keys.current.delete(e.code);

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  return keys;
}
