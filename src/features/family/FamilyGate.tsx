import type { ReactNode } from "react";

type FamilyGateProps = {
  children: ReactNode;
};

export function FamilyGate({ children }: FamilyGateProps) {
  // Phase1 先默认使用 mock family，空间创建 / 校验留到后续接入 Worker。
  return children;
}
