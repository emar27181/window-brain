import { useState, useCallback } from 'react';
import type { TweakValues } from '../types';

type SetTweakFn = (
  keyOrEdits: keyof TweakValues | Partial<TweakValues>,
  val?: TweakValues[keyof TweakValues]
) => void;

const STORAGE_KEY = 'wb.tweaks.v1';

function loadTweaks(defaults: TweakValues): TweakValues {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch {}
  return defaults;
}

export function useTweaks(defaults: TweakValues): [TweakValues, SetTweakFn] {
  const [values, setValues] = useState<TweakValues>(() => loadTweaks(defaults));

  const setTweak = useCallback<SetTweakFn>((keyOrEdits, val) => {
    const edits: Partial<TweakValues> =
      typeof keyOrEdits === 'object' && keyOrEdits !== null
        ? keyOrEdits
        : ({ [keyOrEdits]: val } as Partial<TweakValues>);

    setValues((prev) => {
      const next = { ...prev, ...edits };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });

    // Design-tool protocol (no-op in production)
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits }, '*');
    window.dispatchEvent(new CustomEvent('tweakchange', { detail: edits }));
  }, []);

  return [values, setTweak];
}
