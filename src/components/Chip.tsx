import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Chip.module.css";

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  children: ReactNode;
};

export function Chip({ active = false, children, className = "", ...props }: ChipProps) {
  return (
    <button className={`${styles.chip} ${active ? styles.active : ""} ${className}`} type="button" {...props}>
      {children}
    </button>
  );
}
