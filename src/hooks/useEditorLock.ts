import { useState, useEffect } from 'react';

type Listener = (activeId: string | null) => void;
type LockOwner = { id: string; onRequestSwitch?: () => boolean };

let activeEditorId: string | null = null;
let activeOwner: LockOwner | null = null;
const listeners = new Set<Listener>();

export const EditorLock = {
  get: () => activeEditorId,
  set: (id: string | null) => {
    activeEditorId = id;
    if (!id) activeOwner = null;
    listeners.forEach((l) => l(activeEditorId));
  },
  tryAcquire: (id: string, onRequestSwitch?: () => boolean) => {
    if (activeEditorId && activeEditorId !== id) {
      if (!activeOwner?.onRequestSwitch?.()) return false;
      if (activeEditorId) return false;
    }
    activeEditorId = id;
    activeOwner = { id, onRequestSwitch };
    listeners.forEach((l) => l(activeEditorId));
    return true;
  },
  updateOwner: (id: string, onRequestSwitch?: () => boolean) => {
    if (activeOwner?.id === id) activeOwner.onRequestSwitch = onRequestSwitch;
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
    lock: (id: string, onRequestSwitch?: () => boolean) => EditorLock.tryAcquire(id, onRequestSwitch),
    updateLock: (id: string, onRequestSwitch?: () => boolean) => EditorLock.updateOwner(id, onRequestSwitch),
    unlock: (id?: string) => {
      // Optional safety: only unlock if we are the current lock holder, or force unlock if id not provided
      if (!id || EditorLock.get() === id) {
        EditorLock.set(null);
      }
    },
  };
};
