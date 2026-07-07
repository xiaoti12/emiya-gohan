import type { ReactNode } from "react";
import styles from "./AppShell.module.css";

type AppShellProps = {
  children: ReactNode;
  bottomSlot?: ReactNode;
  overlaySlot?: ReactNode;
};

export function AppShell({ children, bottomSlot, overlaySlot }: AppShellProps) {
  return (
    <div className={styles.stage}>
      <main className={styles.shell} aria-label="厨房助手">
        <div className={`${styles.paperLayer} ${styles.blobA}`} aria-hidden="true" />
        <div className={`${styles.paperLayer} ${styles.blobB}`} aria-hidden="true" />
        <div className={`${styles.paperLayer} ${styles.blobC}`} aria-hidden="true" />
        <div className={styles.content}>{children}</div>
        {bottomSlot}
        {overlaySlot}
      </main>
    </div>
  );
}
