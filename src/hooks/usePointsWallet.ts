import { useCallback, useState } from "react";
import { DEFAULT_WALLPAPER_ID, WALLPAPERS, type Wallpaper } from "../wallpapers";

// アプリ全体の文字色(App.tsxのTEXT_COLOR_STORAGE_KEY)と同じ考え方で、
// localStorageにそのまま保存する(Tauriのwebviewでも問題なく使える)。
// ポイントは「開放型」なので、貯まったら減らない。壁紙の開放判定は
// 「今の合計ポイント >= 壁紙のcost」で毎回計算するだけでよく、
// 開放済みIDの一覧を別途保存する必要はない。
const TOTAL_POINTS_STORAGE_KEY = "walletTotalPoints";
const ACTIVE_WALLPAPER_STORAGE_KEY = "walletActiveWallpaperId";

function loadStoredTotalPoints(): number {
  try {
    const raw = localStorage.getItem(TOTAL_POINTS_STORAGE_KEY);
    const n = raw === null ? 0 : Number(raw);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

function loadStoredActiveWallpaperId(): string {
  try {
    return localStorage.getItem(ACTIVE_WALLPAPER_STORAGE_KEY) ?? DEFAULT_WALLPAPER_ID;
  } catch {
    return DEFAULT_WALLPAPER_ID;
  }
}

export interface PointsWallet {
  /** 全期間・全科目・全プラスチャレンジ通算のポイント(一つの財布)。 */
  totalPoints: number;
  /** 正解時などに呼ぶ。ポイントを加算し、localStorageにも保存する。 */
  addPoints: (amount: number) => void;
  wallpapers: Wallpaper[];
  activeWallpaper: Wallpaper;
  /** その壁紙が今の合計ポイントで開放済みかどうか。 */
  isUnlocked: (wallpaper: Wallpaper) => boolean;
  /** 開放済みの壁紙のみ選択できる。未開放IDを渡した場合は何もしない。 */
  selectWallpaper: (id: string) => void;
}

export function usePointsWallet(): PointsWallet {
  const [totalPoints, setTotalPoints] = useState<number>(loadStoredTotalPoints);
  const [activeWallpaperId, setActiveWallpaperId] = useState<string>(loadStoredActiveWallpaperId);

  const addPoints = useCallback((amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    setTotalPoints((prev) => {
      const next = prev + Math.floor(amount);
      try {
        localStorage.setItem(TOTAL_POINTS_STORAGE_KEY, String(next));
      } catch {
        // 保存できなくても、今回のセッション中のポイント加算自体は継続する
      }
      return next;
    });
  }, []);

  const isUnlocked = useCallback(
    (wallpaper: Wallpaper) => wallpaper.cost <= 0 || totalPoints >= wallpaper.cost,
    [totalPoints]
  );

  const selectWallpaper = useCallback(
    (id: string) => {
      const wallpaper = WALLPAPERS.find((w) => w.id === id);
      if (!wallpaper) return;
      if (wallpaper.cost > 0 && totalPoints < wallpaper.cost) return; // 未開放は選べない
      setActiveWallpaperId(id);
      try {
        localStorage.setItem(ACTIVE_WALLPAPER_STORAGE_KEY, id);
      } catch {
        // 保存できなくても表示上の変更自体は継続する
      }
    },
    [totalPoints]
  );

  const activeWallpaper =
    WALLPAPERS.find((w) => w.id === activeWallpaperId) ?? WALLPAPERS[0];

  return { totalPoints, addPoints, wallpapers: WALLPAPERS, activeWallpaper, isUnlocked, selectWallpaper };
}
