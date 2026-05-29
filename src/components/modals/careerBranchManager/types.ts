export interface CareerBranchManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  userRole?: string;
}

export interface OccupationBranch {
  code: string;
  name: string;
}

export interface OccupationSubBranch {
  code: string;
  branch_code: string;
  name: string;
}

export interface OccupationSubQuestion {
  id: number;
  branch_code: string;
  sub_branch_code: string;
  code: string;
  text: string;
  always_checked: boolean;
  sequence: number;
}
