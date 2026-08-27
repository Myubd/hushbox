# 世界地図タイムトラベル: 地図画像フォルダ

このフォルダに地図の画像ファイル(.png / .jpg など)を置くと、
「世界地図タイムトラベル」ゲームで表示できます。

## 使い方

1. このフォルダに画像を追加する
   例: `public/plus-challenge/maps/1700s.png`

2. `src/games/worldMapTimeTravel/data.ts` の配列に問題を追加し、
   `imageSrc` にそのパスを指定する

   ```ts
   {
     id: "1700s-europe",
     imageSrc: "/plus-challenge/maps/1700s.png",
     correctChoice: "1700年代",
     choices: ["1700年代", "1500年代", "1900年代", "2020年代"],
     explanation: "...",
   }
   ```

画像が見つからない場合は、ゲーム画面に自動でプレースホルダーが表示されます。

※ 地図画像は著作権に配慮し、パブリックドメインまたは自分で作成したものを
   使ってください(このプロジェクトには実際の地図画像は同梱していません)。
