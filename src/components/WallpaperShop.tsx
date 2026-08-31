import type { PointsWallet } from "../hooks/usePointsWallet";

interface Props {
  wallet: PointsWallet;
  onBack: () => void;
}

/**
 * 壁紙ショップ。設定ページ(SettingsPage)とは別の独立した画面にしている
 * (壁紙交換は「学習のごほうび」という色合いが強く、文字色などの環境設定とは
 * 性質が違うため)。AgeGate画面右上のポイントバッジ、およびチャット画面
 * ヘッダーのポイントバッジから開ける。
 *
 * 「開放型」: 一度必要ポイントに到達したら、その壁紙はポイントを消費せず
 * ずっと使える。開放済みの壁紙同士は何度でも自由に選び直せる。
 */
export function WallpaperShop({ wallet, onBack }: Props) {
  const { totalPoints, wallpapers, activeWallpaper, isUnlocked, selectWallpaper } = wallet;

  return (
    <div className="wallpaper-shop">
      <div className="wallpaper-shop__header">
        <button className="btn btn--ghost btn--small" onClick={onBack}>
          ← もどる
        </button>
        <p className="wallpaper-shop__title">🖼️ 壁紙ショップ</p>
      </div>

      <div className="wallpaper-shop__points-banner">
        <span className="wallpaper-shop__points-value">🌟 {totalPoints}</span>
        <span className="wallpaper-shop__points-label">
          学習ドリル・プラスチャレンジで正解するとポイントがたまるよ。ためたポイントは減らないから、安心して使ってね。
        </span>
      </div>

      <div className="wallpaper-shop__grid">
        {wallpapers.map((wallpaper) => {
          const unlocked = isUnlocked(wallpaper);
          const isActive = wallpaper.id === activeWallpaper.id;
          const remaining = Math.max(0, wallpaper.cost - totalPoints);

          return (
            <button
              key={wallpaper.id}
              className={`wallpaper-shop__card${isActive ? " is-active" : ""}${
                unlocked ? "" : " is-locked"
              }`}
              onClick={() => unlocked && selectWallpaper(wallpaper.id)}
              disabled={!unlocked}
            >
              <span className="wallpaper-shop__thumb-wrap">
                {wallpaper.src ? (
                  <img className="wallpaper-shop__thumb" src={wallpaper.src} alt={wallpaper.label} />
                ) : (
                  <span className="wallpaper-shop__thumb wallpaper-shop__thumb--none">
                    背景なし
                  </span>
                )}
                {!unlocked && (
                  <span className="wallpaper-shop__lock" aria-hidden="true">
                    🔒
                  </span>
                )}
              </span>

              <span className="wallpaper-shop__label">{wallpaper.label}</span>

              {isActive ? (
                <span className="wallpaper-shop__status wallpaper-shop__status--active">
                  ✅ つかっている
                </span>
              ) : unlocked ? (
                <span className="wallpaper-shop__status">タップして使う</span>
              ) : (
                <span className="wallpaper-shop__status wallpaper-shop__status--locked">
                  あと {remaining}p で開放
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
