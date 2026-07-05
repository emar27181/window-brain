import { useEffect, useState } from 'react';
import { getBackgroundColors } from '../lib/background';

interface Props {
  bgKind: string;
  dark: boolean;
}

export function Background({ bgKind, dark }: Props) {
  const [hour, setHour] = useState(() => {
    const d = new Date();
    return d.getHours() + d.getMinutes() / 60;
  });

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setHour(d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600);
    };
    const id = setInterval(tick, 30 * 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const colors = getBackgroundColors(bgKind, dark, hour);
    const [bgA, bgB, o1, o2, o3] = colors;

    const bg = document.getElementById('bg');
    if (bg) {
      bg.style.background = `radial-gradient(120% 90% at 70% 10%, ${bgB} 0%, ${bgA} 60%, ${bgA} 100%)`;
    }

    const setOrb = (id: string, color: string, x: number, y: number, size: number) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.style.background = color;
      el.style.width = el.style.height = size + 'px';
      el.style.left = `calc(${x}% - ${size / 2}px)`;
      el.style.top = `calc(${y}% - ${size / 2}px)`;
    };

    setOrb('orb1', o1, 18, 28, 520);
    setOrb('orb2', o2, 78, 18, 460);
    setOrb('orb3', o3, 60, 88, 600);
  }, [bgKind, dark, hour]);

  return null;
}
