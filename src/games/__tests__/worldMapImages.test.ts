import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { WORLD_MAP_TIME_TRAVEL_QUESTIONS } from "../worldMapTimeTravel/data";

/**
 * 世界地図タイムトラベルの画像存在チェック。
 *
 * `imageSrc` は "/plus-challenge/maps/xxx.png" のように `public/` 以下のパスを指す。
 * このテストは、そのパスに対応するファイルが実際に存在することを確認する。
 *
 * `sample: true` が付いた問題(まだファクトチェック・画像用意が済んでいない
 * プレースホルダー問題)は、意図的にこのチェックから除外している。
 * ファクトチェックが完了し、実際の地図画像を配置してこのフラグを外したら、
 * 自動的にこのテストの対象になる(=画像の配置忘れをCIで検知できるようになる)。
 */
describe("worldMapTimeTravel の画像存在チェック", () => {
  const readyEntries = WORLD_MAP_TIME_TRAVEL_QUESTIONS.filter((item) => !item.sample);

  if (readyEntries.length === 0) {
    // 実データがまだ無い間(全問題がsample:true)は、空のdescribeで
    // テストスイートごと失敗扱いになるのを避けるためスキップ扱いにしておく。
    // sample:trueを外した問題が1件でもできたら、下のit.eachが自動的に有効になる。
    it.skip("実データ画像が追加されたら、ここに存在チェックが並ぶ", () => {});
  }

  it.each(readyEntries.map((item) => [item.id, item] as const))(
    "[%s] imageSrcに対応する画像ファイルがpublic/以下に存在する",
    (_id, item) => {
      const filePath = resolve(process.cwd(), "public", item.imageSrc.replace(/^\//, ""));
      expect(existsSync(filePath), `${filePath} が見つかりません`).toBe(true);
    }
  );
});
