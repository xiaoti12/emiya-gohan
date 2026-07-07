import styles from "./Toast.module.css";

type ToastProps = {
  message?: string;
  bottom?: "low" | "high";
};

export function Toast({ message, bottom = "low" }: ToastProps) {
  return (
    <div className={`${styles.toast} ${message ? styles.show : ""} ${styles[bottom]}`} role="status" aria-live="polite">
      {message}
    </div>
  );
}
