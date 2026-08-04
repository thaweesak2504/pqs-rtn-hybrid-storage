import { useState, useEffect } from 'react';

type Listener = (activeId: string | null) => void;

let activeEditorId: string | null = null;
const listeners = new Set<Listener>();

export const EditorLock = {
  get: () => activeEditorId,
  set: (id: string | null) => {
    activeEditorId = id;
    listeners.forEach((l) => l(activeEditorId));
  },
  subscribe: (l: Listener) => {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

export const useEditorLock = () => {
  const [activeId, setActiveId] = useState<string | null>(EditorLock.get());

  useEffect(() => {
    return EditorLock.subscribe(setActiveId);
  }, []);

  return {
    activeId,
    lock: (id: string) => EditorLock.set(id),
    unlock: (id?: string) => {
      // Optional safety: only unlock if we are the current lock holder, or force unlock if id not provided
      if (!id || EditorLock.get() === id) {
        EditorLock.set(null);
      }
    },
  };
};
