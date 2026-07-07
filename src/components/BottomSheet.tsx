import { useEffect, type ReactNode } from "react";
import styles from "./BottomSheet.module.css";

type BottomSheetProps = {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  variant?: "floating" | "edge";
};

export function BottomSheet({ title, open, onClose, children, variant = "floating" }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  return (
    <>
      <button
        className={`${styles.scrim} ${open ? styles.showScrim : ""}`}
        type="button"
        aria-label="关闭面板"
        aria-hidden={!open}
        tabIndex={open ? 0 : -1}
        onClick={onClose}
      />
      <section className={`${styles.sheet} ${styles[variant]} ${open ? styles.showSheet : ""}`} role="dialog" aria-modal="true" aria-label={title} aria-hidden={!open}>
        <div className={styles.handle} />
        <div className={styles.head}>
          <h2>{title}</h2>
          <button className={styles.closeButton} type="button" aria-label="关闭" onClick={onClose}>
            ×
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </section>
    </>
  );
}
