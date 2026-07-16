import { Link, useNavigate } from "react-router-dom";
import styles from "./TopBar.module.css";

type TopBarProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionText?: string;
  actionTo?: string;
  onAction?: () => void;
  showBack?: boolean;
  backTo?: string;
  backLabel?: string;
};

export function TopBar({
  title,
  subtitle,
  actionLabel,
  actionText = "＋",
  actionTo,
  onAction,
  showBack = true,
  backTo,
  backLabel = "返回",
}: TopBarProps) {
  const navigate = useNavigate();
  const action = actionTo ? (
    <Link className={styles.roundButton} to={actionTo} aria-label={actionLabel}>
      {actionText}
    </Link>
  ) : onAction ? (
    <button className={styles.roundButton} type="button" aria-label={actionLabel} onClick={onAction}>
      {actionText}
    </button>
  ) : (
    <span className={styles.placeholder} aria-hidden="true" />
  );

  return (
    <header className={styles.topbar}>
      {showBack ? (
        <button
          className={styles.backButton}
          type="button"
          aria-label={backLabel}
          onClick={() => {
            if (backTo) {
              navigate(backTo);
              return;
            }
            navigate(-1);
          }}
        >
          ‹
        </button>
      ) : null}
      <div className={styles.titleWrap}>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {action}
    </header>
  );
}
