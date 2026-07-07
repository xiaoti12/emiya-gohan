import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import styles from "./PaperCard.module.css";

type PaperTone = "white" | "warm" | "green" | "blue" | "pink" | "kraft";

type PaperCardProps<T extends ElementType> = {
  as?: T;
  tone?: PaperTone;
  tilt?: "left" | "right" | "none";
  interactive?: boolean;
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

export function PaperCard<T extends ElementType = "article">({
  as,
  tone = "white",
  tilt = "none",
  interactive = false,
  children,
  className = "",
  ...props
}: PaperCardProps<T>) {
  const Component = as ?? "article";

  return (
    <Component
      className={`${styles.card} ${styles[tone]} ${styles[tilt]} ${interactive ? styles.interactive : ""} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
