import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { BottomSheet } from "../components/BottomSheet";
import { Chip } from "../components/Chip";
import { EmptyState } from "../components/EmptyState";
import { PaperCard } from "../components/PaperCard";
import { Toast } from "../components/Toast";
import {
  getRecommendations,
  RECENT_COOKED_EXCLUDE_DAYS,
} from "../features/recommendations/api";
import { daysAgoISO } from "../lib/date";
import { recommendationTags } from "../features/recipes/constants";
import type { RecipeListItem } from "../features/recipes/types";
import { PlanSheet } from "../features/recipeRecords/PlanSheet";
import { formatFamilyTitleParts } from "../features/family/familyName";
import { loadStoredFamily } from "../features/family/familyStore";
import { getErrorMessage } from "../lib/errors";
import styles from "./HomePage.module.css";

const quickEntries = [
  {
    title: "菜谱浏览",
    desc: "搜索家常菜、汤羹、主食",
    iconSrc: "/home_card/book.svg",
    to: "/recipes",
    tone: "white",
  },
  {
    title: "推荐菜品",
    desc: "随机来点今晚灵感",
    iconSrc: "/home_card/dice.svg",
    tone: "warm",
  },
  {
    title: "要做什么",
    desc: "把想吃的先记下来",
    iconSrc: "/home_card/list.svg",
    tone: "green",
  },
  {
    title: "食材管理",
    desc: "快速维护冰箱库存",
    iconSrc: "/home_card/basket.svg",
    to: "/ingredients",
    tone: "blue",
  },
] as const;

export function HomePage() {
  const navigate = useNavigate();
  const family = loadStoredFamily();
  const familyName = family?.displayName ?? "";
  const titleParts = formatFamilyTitleParts(familyName);
  const isLongTitle = Array.from(familyName.trim()).length > 6;
  const [recommendOpen, setRecommendOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState("全部");
  const [recommendations, setRecommendations] = useState<RecipeListItem[]>([]);
  const [seed, setSeed] = useState(Date.now());
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [planOpen, setPlanOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!recommendOpen) return;

    const controller = new AbortController();
    setLoading(true);
    setLoadError("");

    void getRecommendations(
      {
        category: selectedTag,
        limit: 3,
        seed,
        // 最近 7 个日历日（含今天）= 今天往前 6 天起
        excludeSince: daysAgoISO(RECENT_COOKED_EXCLUDE_DAYS - 1),
      },
      controller.signal,
    )
      .then((result) => {
        setRecommendations(result.items);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setRecommendations([]);
        setLoadError(getErrorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [recommendOpen, selectedTag, seed, reloadToken]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 1900);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function toggleRecommend() {
    setRecommendOpen((open) => !open);
  }

  function renderRecommendationBody() {
    if (loading) {
      return <p className={styles.loadingText}>正在想今晚吃什么…</p>;
    }

    if (loadError) {
      return (
        <EmptyState
          title="推荐暂时没出来"
          description={loadError}
          action={
            <button
              className={styles.retryButton}
              type="button"
              onClick={() => setReloadToken((token) => token + 1)}
            >
              重新推荐
            </button>
          }
        />
      );
    }

    if (recommendations.length === 0) {
      return (
        <EmptyState
          title="这个分类暂时没有菜谱"
          description="换个分类试试，或先去菜谱库添加一道新菜。"
        />
      );
    }

    return (
      <div className={styles.dishList}>
        {recommendations.map((recipe) => (
          <Link
            key={recipe.id}
            className={styles.dishCard}
            to={`/recipes/${recipe.id}`}
            onClick={() => setRecommendOpen(false)}
          >
            <span className={styles.dishThumb} aria-hidden="true">
              {recipe.name.slice(0, 1)}
            </span>
            <span>
              <h3 className={styles.dishName}>{recipe.name}</h3>
              <p className={styles.dishMeta}>
                {recipe.ingredients
                  .map((item) => item.name)
                  .filter(Boolean)
                  .slice(0, 3)
                  .join(" · ") || recipe.summary}
              </p>
            </span>
          </Link>
        ))}
      </div>
    );
  }

  return (
    <AppShell
      bottomSlot={
        <button className={styles.chatBar} type="button" aria-label="打开聊天入口" onClick={() => navigate("/chat")}>
          <span className={styles.chatIcon}>问</span>
          <span className={styles.chatCopy}>想问什么菜？试试问我...</span>
          <span className={styles.sendDot}>↗</span>
        </button>
      }
      overlaySlot={
        <>
          <BottomSheet title="推荐菜品" open={recommendOpen} onClose={() => setRecommendOpen(false)} variant="edge">
            <div className={`${styles.panelHead} ${styles.compactHead}`}>
              <h3 className={styles.panelTitle}>今晚可以做</h3>
              <button
                className={styles.primaryButton}
                type="button"
                disabled={loading}
                onClick={() => setSeed(Date.now())}
              >
                换一批
              </button>
            </div>
            <div className={styles.chips} aria-label="推荐筛选">
              {recommendationTags.map((tag) => (
                <Chip key={tag} active={selectedTag === tag} onClick={() => setSelectedTag(tag)}>
                  {tag}
                </Chip>
              ))}
            </div>
            {renderRecommendationBody()}
          </BottomSheet>
          <PlanSheet
            open={planOpen}
            onClose={() => setPlanOpen(false)}
            onToast={setToast}
          />
          <Toast message={toast} bottom="high" />
        </>
      }
    >
      <div className={styles.contentWithChat}>
        <header className={styles.hero}>
          <div className={styles.heroCard}>
            <p className={styles.eyebrow}>家庭厨房</p>
            <h1 className={isLongTitle ? styles.heroTitleLong : undefined}>
              {titleParts.prefix}
              <span className={styles.heroTitleSuffix}>{titleParts.suffix}</span>
            </h1>
            <p>看看冰箱里有什么，今天就少纠结一点。</p>
          </div>
          <div className={styles.cutoutPot} aria-hidden="true">
            <span className={styles.steam} />
            <div className={styles.potBody}>
              <span className={styles.potLid} />
            </div>
          </div>
        </header>

        <section className={styles.quickGrid} aria-label="快捷入口">
          {quickEntries.map((entry) => {
            const card = (
              <PaperCard
                as="button"
                className={styles.quickCard}
                tone={entry.tone}
                tilt={entry.tone === "warm" || entry.tone === "green" ? "right" : "left"}
                interactive
                type="button"
                onClick={
                  entry.title === "推荐菜品"
                    ? toggleRecommend
                    : entry.title === "要做什么"
                      ? () => setPlanOpen(true)
                      : undefined
                }
              >
                <span className={styles.quickIcon} aria-hidden="true">
                  <span
                    className={styles.quickIconGlyph}
                    style={{ maskImage: `url(${entry.iconSrc})`, WebkitMaskImage: `url(${entry.iconSrc})` }}
                  />
                </span>
                <span className={styles.quickTitle}>{entry.title}</span>
                <span className={styles.quickDesc}>{entry.desc}</span>
              </PaperCard>
            );

            return "to" in entry && entry.to ? (
              <Link key={entry.title} to={entry.to} aria-label={entry.title}>
                {card}
              </Link>
            ) : (
              <div key={entry.title}>{card}</div>
            );
          })}
        </section>

        <section className={styles.tipCard} aria-label="今日提示">
          <h2>今日小提示</h2>
          <p>先点“推荐菜品”看看灵感；决定想吃什么后，用“要做什么”记到计划里。</p>
        </section>
      </div>
    </AppShell>
  );
}
