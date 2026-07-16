import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { BottomSheet } from "../components/BottomSheet";
import { Chip } from "../components/Chip";
import { EmptyState } from "../components/EmptyState";
import { PaperCard } from "../components/PaperCard";
import { Toast } from "../components/Toast";
import { getRecommendations } from "../features/recommendations/api";
import { recommendationTags } from "../features/recipes/constants";
import type { Recipe } from "../features/recipes/types";
import { createRecipeRecord } from "../features/recipeRecords/api";
import { formatFamilyTitle } from "../features/family/familyName";
import { loadStoredFamily } from "../features/family/familyStore";
import { nearestWeekendISO, todayISO, tomorrowISO } from "../lib/date";
import styles from "./HomePage.module.css";

type PlanDateOption = "今天" | "明天" | "周末";

const quickEntries = [
  { title: "菜谱\n浏览", desc: "搜索家常菜、汤羹、主食", icon: "谱", to: "/recipes", tone: "white" },
  { title: "推荐\n菜品", desc: "随机来点今晚灵感", icon: "荐", tone: "warm" },
  { title: "要做\n什么", desc: "把想吃的先记下来", icon: "做", tone: "green" },
  { title: "食材\n管理", desc: "快速维护冰箱库存", icon: "材", to: "/ingredients", tone: "blue" },
] as const;

const dateMap: Record<PlanDateOption, string> = {
  今天: todayISO(),
  明天: tomorrowISO(),
  周末: nearestWeekendISO(),
};

export function HomePage() {
  const navigate = useNavigate();
  const family = loadStoredFamily();
  const [recommendOpen, setRecommendOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState("全部");
  const [recommendations, setRecommendations] = useState<Recipe[]>([]);
  const [seed, setSeed] = useState(Date.now());
  const [planOpen, setPlanOpen] = useState(false);
  const [dishName, setDishName] = useState("");
  const [planDate, setPlanDate] = useState<PlanDateOption>("今天");
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!recommendOpen) return;
    void getRecommendations(selectedTag, 3, seed).then(setRecommendations);
  }, [recommendOpen, selectedTag, seed]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 1900);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function toggleRecommend() {
    setRecommendOpen((open) => !open);
  }

  async function submitPlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const finalDishName = dishName.trim() || "一道好菜";
    await createRecipeRecord({
      dishName: finalDishName,
      recordType: "planned",
      planDate: dateMap[planDate],
    });
    setPlanOpen(false);
    setToast(`已添加：${finalDishName}（${planDate}）`);
    setDishName("");
    setPlanDate("今天");
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
              <button className={styles.primaryButton} type="button" onClick={() => setSeed(Date.now())}>
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
            {recommendations.length > 0 ? (
              <div className={styles.dishList}>
                {recommendations.map((recipe) => (
                  <Link key={recipe.id} className={styles.dishCard} to={`/recipes/${recipe.id}`} onClick={() => setRecommendOpen(false)}>
                    <span className={styles.dishThumb} aria-hidden="true">
                      {recipe.name.slice(0, 1)}
                    </span>
                    <span>
                      <h3 className={styles.dishName}>{recipe.name}</h3>
                      <p className={styles.dishMeta}>{recipe.ingredients.map((item) => item.name).slice(0, 3).join(" · ")}</p>
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState title="这个标签暂时没有菜谱" description="换个标签试试，或先去菜谱库添加一道新菜。" />
            )}
          </BottomSheet>
          <BottomSheet title="要做什么" open={planOpen} onClose={() => setPlanOpen(false)} variant="edge">
            <form onSubmit={submitPlan}>
              <div className={styles.field}>
                <label htmlFor="dishInput">菜品</label>
                <input
                  id="dishInput"
                  value={dishName}
                  onChange={(event) => setDishName(event.target.value)}
                  placeholder="例如：番茄炒蛋、冬瓜排骨汤"
                  autoComplete="off"
                />
              </div>
              <div className={styles.field}>
                <label>日期</label>
                <div className={styles.dateRow} role="group" aria-label="快捷日期">
                  {(["今天", "明天", "周末"] as PlanDateOption[]).map((item) => (
                    <button
                      key={item}
                      className={`${styles.dateButton} ${planDate === item ? styles.dateButtonActive : ""}`}
                      type="button"
                      onClick={() => setPlanDate(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <button className={styles.submitButton} type="submit">
                添加到计划
              </button>
            </form>
          </BottomSheet>
          <Toast message={toast} bottom="high" />
        </>
      }
    >
      <div className={styles.contentWithChat}>
        <header className={styles.hero}>
          <div className={styles.heroCard}>
            <p className={styles.eyebrow}>家庭厨房</p>
            <h1>{formatFamilyTitle(family?.displayName ?? "")}</h1>
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
                onClick={entry.title.startsWith("推荐") ? toggleRecommend : entry.title.startsWith("要做") ? () => setPlanOpen(true) : undefined}
              >
                <span className={styles.quickIcon}>{entry.icon}</span>
                <span className={styles.quickTitle}>{entry.title.split("\n").map((line) => <span key={line}>{line}<br /></span>)}</span>
                <span className={styles.quickDesc}>{entry.desc}</span>
              </PaperCard>
            );

            return "to" in entry && entry.to ? (
              <Link key={entry.title} to={entry.to} aria-label={entry.title.replace("\n", "")}>
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
