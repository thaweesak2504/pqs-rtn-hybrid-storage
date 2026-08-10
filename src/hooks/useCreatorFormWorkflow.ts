import { useCallback } from "react";

export type CreatorFormTransitionRequest = (proceed: () => void) => void;

type CreatorFormOwner = {
  id: string;
  requestTransition: CreatorFormTransitionRequest;
};

let activeOwner: CreatorFormOwner | null = null;

export const CreatorFormWorkflow = {
  requestOpen(id: string, open: () => void) {
    if (!activeOwner || activeOwner.id === id) {
      open();
      return;
    }

    activeOwner.requestTransition(() => {
      activeOwner = null;
      open();
    });
  },
  register(id: string, requestTransition: CreatorFormTransitionRequest) {
    activeOwner = { id, requestTransition };
  },
  update(id: string, requestTransition: CreatorFormTransitionRequest) {
    if (activeOwner?.id === id) activeOwner.requestTransition = requestTransition;
  },
  release(id: string) {
    if (activeOwner?.id === id) activeOwner = null;
  },
  reset() {
    activeOwner = null;
  },
};

export const useCreatorFormWorkflow = () => {
  const requestOpen = useCallback((id: string, open: () => void) => {
    CreatorFormWorkflow.requestOpen(id, open);
  }, []);

  const register = useCallback((id: string, requestTransition: CreatorFormTransitionRequest) => {
    CreatorFormWorkflow.register(id, requestTransition);
  }, []);

  const update = useCallback((id: string, requestTransition: CreatorFormTransitionRequest) => {
    CreatorFormWorkflow.update(id, requestTransition);
  }, []);

  const release = useCallback((id: string) => {
    CreatorFormWorkflow.release(id);
  }, []);

  return { requestOpen, register, update, release };
};
