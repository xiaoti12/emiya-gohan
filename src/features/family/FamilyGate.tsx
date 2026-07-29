import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { AppShell } from "../../components/AppShell";
import { EmptyState } from "../../components/EmptyState";
import { PaperCard } from "../../components/PaperCard";
import { getErrorMessage, isApiErrorCode } from "../../lib/errors";
import { createFamily, verifyFamily } from "./api";
import {
  clearStoredFamily,
  loadStoredFamily,
  loadStoredFamilyId,
  saveStoredFamily,
} from "./familyStore";
import { formatFamilyTitle } from "./familyName";
import styles from "./FamilyGate.module.css";

const DEFAULT_DOCUMENT_TITLE = "厨房助手";

type FamilyGateProps = {
  children: ReactNode;
};

type GateState = "entry" | "verifying" | "ready" | "verifyError";
type EntryMode = "create" | "join";

export function FamilyGate({ children }: FamilyGateProps) {
  const [gateState, setGateState] = useState<GateState>(() =>
    loadStoredFamilyId() ? "verifying" : "entry",
  );
  const [mode, setMode] = useState<EntryMode>("create");
  const [displayName, setDisplayName] = useState("");
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const validateStoredFamily = useCallback(async () => {
    const familyId = loadStoredFamilyId();
    if (!familyId) {
      setGateState("entry");
      return;
    }

    setGateState("verifying");
    setVerifyError("");
    try {
      const family = await verifyFamily({ familyId });
      saveStoredFamily(family);
      setGateState("ready");
    } catch (error) {
      if (isApiErrorCode(error, "FAMILY_NOT_FOUND")) {
        clearStoredFamily();
        setNotice("原家庭已失效，请重新创建或加入家庭。");
        setGateState("entry");
        return;
      }

      setVerifyError(getErrorMessage(error));
      setGateState("verifyError");
    }
  }, []);

  useEffect(() => {
    if (loadStoredFamilyId()) {
      void validateStoredFamily();
    }
  }, [validateStoredFamily]);

  useEffect(() => {
    if (gateState === "ready") {
      const family = loadStoredFamily();
      document.title = family?.displayName
        ? formatFamilyTitle(family.displayName)
        : DEFAULT_DOCUMENT_TITLE;
      return;
    }

    if (gateState === "entry") {
      const name = displayName.trim();
      document.title = name ? formatFamilyTitle(name) : DEFAULT_DOCUMENT_TITLE;
      return;
    }

    document.title = DEFAULT_DOCUMENT_TITLE;
  }, [gateState, displayName]);

  function switchMode(nextMode: EntryMode) {
    setMode(nextMode);
    setFormError("");
  }

  async function submitFamily(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const finalName = displayName.trim();
    const length = Array.from(finalName).length;
    if (length < 2 || length > 30) {
      setFormError("家庭名称需要填写 2–30 个字符");
      return;
    }

    setSubmitting(true);
    setFormError("");
    try {
      const family =
        mode === "create"
          ? await createFamily(finalName)
          : await verifyFamily({ displayName: finalName });
      saveStoredFamily(family);
      setGateState("ready");
    } catch (error) {
      if (isApiErrorCode(error, "FAMILY_NAME_CONFLICT")) {
        setFormError("这个家庭名称已经存在，请切换到加入。");
      } else if (isApiErrorCode(error, "FAMILY_NOT_FOUND")) {
        setFormError("没有找到这个家庭，请检查名称后再试。");
      } else {
        setFormError(getErrorMessage(error));
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (gateState === "ready") {
    return children;
  }

  if (gateState === "verifying") {
    return (
      <AppShell>
        <div className={styles.centered} aria-live="polite">
          <PaperCard className={`${styles.loadingCard} ${styles.tiltLeft}`} tone="white">
            <span className={styles.loadingMark} aria-hidden="true">饭</span>
            <p className={styles.eyebrow}>正在打开家庭厨房</p>
            <h1>看看今天吃什么</h1>
            <p>正在确认你的家庭空间，请稍等一下。</p>
          </PaperCard>
        </div>
      </AppShell>
    );
  }

  if (gateState === "verifyError") {
    return (
      <AppShell>
        <div className={styles.centered}>
          <EmptyState
            title="暂时进不了厨房"
            description={verifyError || "网络不太稳定，请稍后再试。"}
            action={
              <button
                className={styles.primaryButton}
                type="button"
                onClick={() => void validateStoredFamily()}
              >
                重新验证
              </button>
            }
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className={styles.entry}>
        <header className={styles.hero}>
          <p className={styles.eyebrow}>欢迎来到家庭厨房</p>
          <h1>先找到属于你的饭桌</h1>
          <p>
            {displayName.trim()
              ? formatFamilyTitle(displayName)
              : "创建一个新家庭，或用同样的家庭名称加入已有空间。"}
          </p>
        </header>

        {notice ? <p className={styles.notice} role="status">{notice}</p> : null}

        <div className={styles.modeGrid} aria-label="选择进入方式">
          <PaperCard
            as="button"
            className={`${styles.modeCard} ${styles.tiltLeft} ${mode === "create" ? styles.activeCard : ""}`}
            tone="warm"
            interactive
            type="button"
            aria-pressed={mode === "create"}
            onClick={() => switchMode("create")}
          >
            <strong>创建家庭</strong>
            <span>第一次使用，从这里开始</span>
          </PaperCard>
          <PaperCard
            as="button"
            className={`${styles.modeCard} ${styles.tiltRight} ${mode === "join" ? styles.activeCard : ""}`}
            tone="green"
            interactive
            type="button"
            aria-pressed={mode === "join"}
            onClick={() => switchMode("join")}
          >
            <strong>加入家庭</strong>
            <span>输入家人创建时的名称</span>
          </PaperCard>
        </div>

        <PaperCard className={`${styles.formCard} ${styles.tiltLeft}`} tone="white">
          <form onSubmit={submitFamily}>
            <div className={styles.field}>
              <label htmlFor="familyDisplayName">家庭名称</label>
              <input
                id="familyDisplayName"
                value={displayName}
                onChange={(event) => {
                  setDisplayName(event.target.value);
                  setFormError("");
                }}
                placeholder="输入家庭名称"
                autoComplete="off"
                maxLength={30}
                disabled={submitting}
              />
            </div>
            <p className={styles.safetyNote}>
              家庭名称就是加入凭证，请取一个家人记得住、也不容易被猜到的名称。
            </p>
            {formError ? <p className={styles.formError} role="alert">{formError}</p> : null}
            <button className={styles.primaryButton} type="submit" disabled={submitting}>
              {submitting ? "正在处理…" : mode === "create" ? "创建并进入厨房" : "加入这个家庭"}
            </button>
          </form>
          {mode === "create" && formError.includes("切换到加入") ? (
            <button className={styles.textButton} type="button" onClick={() => switchMode("join")}>
              去加入这个家庭
            </button>
          ) : null}
        </PaperCard>
      </div>
    </AppShell>
  );
}
