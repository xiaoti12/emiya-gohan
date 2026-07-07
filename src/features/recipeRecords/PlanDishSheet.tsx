type PlanDishSheetProps = {
  open: boolean;
};

export function PlanDishSheet({ open }: PlanDishSheetProps) {
  if (!open) return null;

  return <div>要做什么表单将在页面中逐步抽取复用。</div>;
}
