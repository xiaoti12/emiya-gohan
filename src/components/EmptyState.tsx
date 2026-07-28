import { PaperCard } from "./PaperCard";
import styles from "./EmptyState.module.css";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: React.ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <PaperCard className={styles.empty} tone="white">
      <span className={styles.mark} aria-hidden="true">
        空
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action ? <div className={styles.action}>{action}</div> : null}
    </PaperCard>
  );
}
