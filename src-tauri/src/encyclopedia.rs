//! 百科事典的な一般知識データベース。
//!
//! 問題バンク(`learning_drill.rs`)がカリキュラム単元に沿った知識なのに対し、
//! こちらは「子供が雑談で聞いてくる可能性のある、カリキュラム外の一般知識・
//! 史実」をカバーする。オンラインAPI(Wikipedia等)へは接続せず、
//! **手作業で検証した内容だけ**をこの配列に追加していく方針。
//!
//! ## 新しい項目の追加方法
//! `ENCYCLOPEDIA` 配列の末尾に `EncyclopediaEntry { keywords, title, body }` を
//! 追加するだけでよい。
//!
//! - `keywords`: この項目がヒットすべき単語。ユーザーの発言にこの単語が
//!   1つでも部分一致で含まれていれば候補になる(正規表現ではなく単純な
//!   文字列一致)。表記ゆれ(「1900年」「西暦1900年」等)もできるだけ
//!   複数入れておくと拾いやすくなる。
//! - `title` / `body`: 生成AIに渡す「事実」。ここに書いた内容以外を
//!   AIに創作させないよう、呼び出し側(`prompts.rs`)で
//!   「参考情報の範囲を超えて答えない」旨の指示を添えて渡す設計になっている。
//!   **誤った内容を追加すると、そのままAIの回答の誤りとして子供に伝わる**ため、
//!   追加前に必ず内容を確認すること。
//!
//! 検索はキーワードの部分一致本数でスコアリングする単純なヒューリスティックで、
//! 埋め込みベクトル等の高度な検索は行っていない(このアプリはオフライン動作が
//! 前提であり、追加のモデルを持ち込むコストに見合わないと判断した)。

use crate::knowledge::KnowledgeSnippet;

struct EncyclopediaEntry {
    keywords: &'static [&'static str],
    title: &'static str,
    body: &'static str,
}

// ここから下に項目を追加していく。日付・固有名詞は特にハルシネーションが
// 起きやすい領域(実際にアプリ内で誤答が確認された)ため、優先的に埋めたい。
const ENCYCLOPEDIA: &[EncyclopediaEntry] = &[
    EncyclopediaEntry {
        keywords: &["9年", "西暦9年"],
        title: "9年",
        body: "中国で王莽が新を建国。ローマでアウグストゥス治世。中国では王莽の台頭につながる政治的変動が進む。",
    },
    EncyclopediaEntry {
        keywords: &["14年", "西暦14年"],
        title: "14年",
        body: "ローマ皇帝アウグストゥス死去、ティベリウス即位。",
    },
    EncyclopediaEntry {
        keywords: &["29年", "西暦29年"],
        title: "29年",
        body: "イエス・キリストが処刑されたとされる時期。",
    },
    EncyclopediaEntry {
        keywords: &["43年", "西暦43年"],
        title: "43年",
        body: "ローマ帝国がブリタニアへ侵攻。",
    },
    EncyclopediaEntry {
        keywords: &["57年", "西暦57年"],
        title: "57年",
        body: "倭の奴国王が後漢へ使者を送り、金印を授かる。後漢の光武帝が倭の奴国王に金印を授けたとされる（『後漢書』）。",
    },
    EncyclopediaEntry {
        keywords: &["64年", "西暦64年"],
        title: "64年",
        body: "ローマ大火。ネロ帝によるキリスト教徒迫害。",
    },
    EncyclopediaEntry {
        keywords: &["70年", "西暦70年"],
        title: "70年",
        body: "ローマ軍がエルサレムを破壊。エルサレム神殿がローマ軍により破壊される。",
    },
    EncyclopediaEntry {
        keywords: &["79年", "西暦79年"],
        title: "79年",
        body: "ヴェスヴィウス火山噴火でポンペイが埋没。",
    },
    EncyclopediaEntry {
        keywords: &["96年", "西暦96年"],
        title: "96年",
        body: "ローマ皇帝ネルウァ即位。五賢帝時代へ。ネルウァ即位。五賢帝時代の始まりとされる。",
    },
    EncyclopediaEntry {
        keywords: &["105年", "西暦105年"],
        title: "105年",
        body: "中国の蔡倫が紙を改良したとされる。蔡倫が製紙法を改良したと『後漢書』に記される（紙自体の起源はこれ以前）。",
    },
    EncyclopediaEntry {
        keywords: &["117年", "西暦117年"],
        title: "117年",
        body: "トラヤヌス帝死去。ローマ帝国の領土が最大規模に。",
    },
    EncyclopediaEntry {
        keywords: &["121年", "西暦121年"],
        title: "121年",
        body: "『漢書』が成立した時期。班固らによって編纂され、章帝・和帝期から後漢末にかけて完成したとされる。121年は成立年として断定しない。",
    },
    EncyclopediaEntry {
        keywords: &["166年", "西暦166年"],
        title: "166年",
        body: "ローマ帝国で疫病(アントニヌスの疫病)が流行した時期。165年ごろから流行し始めたとされ、166年を厳密な開始年と断定するのは避けた方がよい。",
    },
    EncyclopediaEntry {
        keywords: &["184年", "西暦184年"],
        title: "184年",
        body: "中国で黄巾の乱。黄巾の乱。後漢衰退の大きな契機。",
    },
    EncyclopediaEntry {
        keywords: &["189年", "西暦189年"],
        title: "189年",
        body: "董卓が洛陽を支配。董卓が洛陽を掌握。後漢末の群雄割拠が進む。",
    },
    EncyclopediaEntry {
        keywords: &["192年", "西暦192年"],
        title: "192年",
        body: "卑弥呼の活動時期は3世紀前半〜中頃とされる（192年と特定するのは不適切）。『魏志倭人伝』では239年に卑弥呼が魏へ使者を送ったと記される。",
    },
    EncyclopediaEntry {
        keywords: &["200年", "西暦200年"],
        title: "200年",
        body: "官渡の戦い。曹操が袁紹を破る。",
    },
    EncyclopediaEntry {
        keywords: &["208年", "西暦208年"],
        title: "208年",
        body: "赤壁の戦い。曹操軍が劉備・孫権連合軍に敗れる。",
    },
    EncyclopediaEntry {
        keywords: &["220年", "西暦220年"],
        title: "220年",
        body: "魏成立。後漢滅亡。曹丕が後漢から禅譲を受け魏を建国。後漢滅亡。",
    },
    EncyclopediaEntry {
        keywords: &["221年", "西暦221年"],
        title: "221年",
        body: "蜀成立。劉備が蜀（蜀漢）を建国。",
    },
    EncyclopediaEntry {
        keywords: &["229年", "西暦229年"],
        title: "229年",
        body: "呉成立。三国時代が本格化。孫権が皇帝を称し呉成立。",
    },
    EncyclopediaEntry {
        keywords: &["235年", "西暦235年"],
        title: "235年",
        body: "魏の明帝死去。三国間の抗争が続く。",
    },
    EncyclopediaEntry {
        keywords: &["249年", "西暦249年"],
        title: "249年",
        body: "司馬懿が政権を掌握。高平陵の変。司馬懿が曹爽一派を排除し魏の実権を掌握。",
    },
    EncyclopediaEntry {
        keywords: &["280年", "西暦280年"],
        title: "280年",
        body: "西晋が呉を滅ぼし、中国を再統一。西晋が呉を滅ぼし三国時代終結。",
    },
    EncyclopediaEntry {
        keywords: &["284年", "西暦284年"],
        title: "284年",
        body: "ディオクレティアヌスがローマ皇帝に即位。",
    },
    EncyclopediaEntry {
        keywords: &["303年", "西暦303年"],
        title: "303年",
        body: "ローマ帝国でキリスト教大迫害が始まる。",
    },
    EncyclopediaEntry {
        keywords: &["313年", "西暦313年"],
        title: "313年",
        body: "ミラノ勅令。キリスト教を公認。ミラノ勅令。コンスタンティヌス帝とリキニウス帝がキリスト教を公認。",
    },
    EncyclopediaEntry {
        keywords: &["325年", "西暦325年"],
        title: "325年",
        body: "ニケーア公会議。アリウス派問題などを議論し、ニカイア信条を採択。",
    },
    EncyclopediaEntry {
        keywords: &["330年", "西暦330年"],
        title: "330年",
        body: "コンスタンティヌス帝が330年にコンスタンティノープル(現イスタンブール)を都として奉献し、ローマ帝国東方の重要な都市となった。",
    },
    EncyclopediaEntry {
        keywords: &["337年", "西暦337年"],
        title: "337年",
        body: "コンスタンティヌス帝死去。",
    },
    EncyclopediaEntry {
        keywords: &["372年", "西暦372年"],
        title: "372年",
        body: "フン族の西進が本格化し、民族移動が進む。",
    },
    EncyclopediaEntry {
        keywords: &["376年", "西暦376年"],
        title: "376年",
        body: "ゴート族がローマ帝国内へ移住。",
    },
    EncyclopediaEntry {
        keywords: &["380年", "西暦380年"],
        title: "380年",
        body: "テオドシウス帝がキリスト教を国教化。",
    },
    EncyclopediaEntry {
        keywords: &["395年", "西暦395年"],
        title: "395年",
        body: "ローマ帝国が東西に分裂。テオドシウス1世死去後、東西両帝国の分離が固定化。",
    },
    EncyclopediaEntry {
        keywords: &["410年", "西暦410年"],
        title: "410年",
        body: "西ゴート族がローマを略奪。",
    },
    EncyclopediaEntry {
        keywords: &["451年", "西暦451年"],
        title: "451年",
        body: "カタラウヌムの戦い。アッティラが敗退。",
    },
    EncyclopediaEntry {
        keywords: &["476年", "西暦476年"],
        title: "476年",
        body: "西ローマ帝国滅亡。一般に古代の終わりとされる。オドアケルが西ローマ皇帝ロムルス・アウグストゥルスを退位させる。",
    },
    EncyclopediaEntry {
        keywords: &["486年", "西暦486年"],
        title: "486年",
        body: "クローヴィスがフランク王国を拡大。496年頃にカトリック（ニカイア派）へ改宗したとされる。",
    },
    EncyclopediaEntry {
        keywords: &["507年", "西暦507年"],
        title: "507年",
        body: "継体天皇即位。クローヴィスの改宗は一般に496年頃とされるため、旧記載を修正。",
    },
    EncyclopediaEntry {
        keywords: &["527年", "西暦527年"],
        title: "527年",
        body: "ユスティニアヌス帝が東ローマ皇帝に即位。",
    },
    EncyclopediaEntry {
        keywords: &["529年", "西暦529年"],
        title: "529年",
        body: "ベネディクトゥスがモンテ・カッシーノ修道院を創設したとされる。ユスティニアヌス帝が『ローマ法大全』の編纂を開始。ベネディクトゥスの修道院規則も6世紀前半に成立。",
    },
    EncyclopediaEntry {
        keywords: &["538年", "西暦538年"],
        title: "538年",
        body: "日本への仏教公伝。538年説（552年説もある）。仏教公伝は538年説と552年説がある。日本書紀は552年説。",
    },
    EncyclopediaEntry {
        keywords: &["552年", "西暦552年"],
        title: "552年",
        body: "日本への仏教公伝。552年説。",
    },
    EncyclopediaEntry {
        keywords: &["589年", "西暦589年"],
        title: "589年",
        body: "隋が南北朝を統一。隋の文帝が陳を滅ぼし中国を統一。南北朝時代終結。",
    },
    EncyclopediaEntry {
        keywords: &["593年", "西暦593年"],
        title: "593年",
        body: "聖徳太子（厩戸王）が摂政となったとされる。",
    },
    EncyclopediaEntry {
        keywords: &["603年", "西暦603年"],
        title: "603年",
        body: "冠位十二階（603年説）。※604年説もある。",
    },
    EncyclopediaEntry {
        keywords: &["604年", "西暦604年"],
        title: "604年",
        body: "十七条憲法制定とされる。※604年は伝統的な通説。",
    },
    EncyclopediaEntry {
        keywords: &["607年", "西暦607年"],
        title: "607年",
        body: "遣隋使。小野妹子らが隋へ。",
    },
    EncyclopediaEntry {
        keywords: &["618年", "西暦618年"],
        title: "618年",
        body: "中国で唐成立。李淵が唐を建国。",
    },
    EncyclopediaEntry {
        keywords: &["622年", "西暦622年"],
        title: "622年",
        body: "ムハンマドがメッカからメディナへ移住（ヒジュラ）。ヒジュラ。イスラム暦（ヒジュラ暦）の起点。",
    },
    EncyclopediaEntry {
        keywords: &["622年", "622年頃", "西暦622年"],
        title: "622年頃",
        body: "イスラム勢力の拡大。ヒジュラ後、正統カリフ時代を経てイスラム世界が急速に拡大。",
    },
    EncyclopediaEntry {
        keywords: &["630年", "西暦630年"],
        title: "630年",
        body: "ムハンマドがメッカを征服。",
    },
    EncyclopediaEntry {
        keywords: &["645年", "西暦645年", "大化の改新", "乙巳の変"],
        title: "645年",
        body: "乙巳の変。中大兄皇子・中臣鎌足らが蘇我入鹿を暗殺。「大化の改新」は645年の政変から646年以降の改革までを含めて用いることが多い。",
    },
    EncyclopediaEntry {
        keywords: &["661年", "西暦661年"],
        title: "661年",
        body: "ウマイヤ朝成立。イスラム帝国が大きく拡大。",
    },
    EncyclopediaEntry {
        keywords: &["663年", "西暦663年"],
        title: "663年",
        body: "白村江の戦い。日本・百済連合軍が唐・新羅軍に敗北。白村江の戦い。敗戦後、日本は防衛体制を強化。",
    },
    EncyclopediaEntry {
        keywords: &["672年", "西暦672年"],
        title: "672年",
        body: "壬申の乱。",
    },
    EncyclopediaEntry {
        keywords: &["694年", "西暦694年"],
        title: "694年",
        body: "藤原京へ遷都。",
    },
    EncyclopediaEntry {
        keywords: &["701年", "西暦701年"],
        title: "701年",
        body: "大宝律令制定。大宝律令完成。律令国家体制を整備。",
    },
    EncyclopediaEntry {
        keywords: &["710年", "西暦710年"],
        title: "710年",
        body: "平城京へ遷都。奈良時代開始。",
    },
    EncyclopediaEntry {
        keywords: &["712年", "西暦712年"],
        title: "712年",
        body: "『古事記』成立。",
    },
    EncyclopediaEntry {
        keywords: &["720年", "西暦720年"],
        title: "720年",
        body: "『日本書紀』成立。",
    },
    EncyclopediaEntry {
        keywords: &["724年", "西暦724年"],
        title: "724年",
        body: "聖武天皇即位。",
    },
    EncyclopediaEntry {
        keywords: &["741年", "西暦741年"],
        title: "741年",
        body: "国分寺・国分尼寺建立の詔。国分寺建立の詔。聖武天皇による国家的仏教政策。",
    },
    EncyclopediaEntry {
        keywords: &["752年", "西暦752年"],
        title: "752年",
        body: "東大寺大仏開眼供養。東大寺盧舎那仏像の開眼供養。",
    },
    EncyclopediaEntry {
        keywords: &["755年", "西暦755年"],
        title: "755年",
        body: "安史の乱開始。",
    },
    EncyclopediaEntry {
        keywords: &["762年", "西暦762年"],
        title: "762年",
        body: "李白死去。",
    },
    EncyclopediaEntry {
        keywords: &["774年", "西暦774年"],
        title: "774年",
        body: "カール大帝がランゴバルド王国を征服し、フランク王国の勢力をイタリアへ拡大。",
    },
    EncyclopediaEntry {
        keywords: &["794年", "西暦794年"],
        title: "794年",
        body: "平安京へ遷都。",
    },
    EncyclopediaEntry {
        keywords: &["800年", "西暦800年"],
        title: "800年",
        body: "カール大帝がローマ皇帝として戴冠。西ヨーロッパの政治秩序に大きな影響。",
    },
    EncyclopediaEntry {
        keywords: &["805年", "西暦805年"],
        title: "805年",
        body: "最澄が唐から帰国後、天台教学を広める。天台宗の年表上の重要な公認は806年。",
    },
    EncyclopediaEntry {
        keywords: &["806年", "西暦806年"],
        title: "806年",
        body: "空海が唐から帰国。真言密教を日本で広め、後に真言宗を開く。",
    },
    EncyclopediaEntry {
        keywords: &["843年", "西暦843年"],
        title: "843年",
        body: "ヴェルダン条約。フランク王国が三分割。ヴェルダン条約でフランク王国が西・中・東フランクに分割。後のフランス・ドイツ形成につながる。",
    },
    EncyclopediaEntry {
        keywords: &["894年", "西暦894年"],
        title: "894年",
        body: "遣唐使廃止。菅原道真の建議により遣唐使停止。",
    },
    EncyclopediaEntry {
        keywords: &["907年", "西暦907年"],
        title: "907年",
        body: "唐滅亡。五代十国時代へ。唐滅亡。中国は五代十国時代へ。",
    },
    EncyclopediaEntry {
        keywords: &["960年", "西暦960年"],
        title: "960年",
        body: "中国で宋成立。趙匡胤が宋を建国。",
    },
    EncyclopediaEntry {
        keywords: &["962年", "西暦962年"],
        title: "962年",
        body: "オットー1世が戴冠し神聖ローマ帝国成立へ。オットー1世が皇帝戴冠。後の神聖ローマ帝国につながる。962年を神聖ローマ帝国成立年とするのは後世の呼称・制度史を踏まえた整理。",
    },
    EncyclopediaEntry {
        keywords: &["1000年", "西暦1000年"],
        title: "1000年",
        body: "北欧人の北米到達が行われた時期。",
    },
    EncyclopediaEntry {
        keywords: &["1010年", "西暦1010年"],
        title: "1010年",
        body: "紫式部『源氏物語』成立期。1008年頃の記録が有力で、完成年は確定していない。",
    },
    EncyclopediaEntry {
        keywords: &["1016年", "西暦1016年"],
        title: "1016年",
        body: "藤原道長が摂政。藤原北家の摂関政治が最盛期へ。",
    },
    EncyclopediaEntry {
        keywords: &["1038年", "西暦1038年"],
        title: "1038年",
        body: "西夏成立。",
    },
    EncyclopediaEntry {
        keywords: &["1051年", "西暦1051年"],
        title: "1051年",
        body: "前九年の役開始。",
    },
    EncyclopediaEntry {
        keywords: &["1053年", "西暦1053年"],
        title: "1053年",
        body: "平等院鳳凰堂建立。",
    },
    EncyclopediaEntry {
        keywords: &["1054年", "西暦1054年"],
        title: "1054年",
        body: "東西教会の分裂（大シスマ）。ローマ教会とコンスタンティノープル教会の対立が決定的となる象徴的年。",
    },
    EncyclopediaEntry {
        keywords: &["1066年", "西暦1066年"],
        title: "1066年",
        body: "ノルマン・コンクエスト。ウィリアム1世がイングランド王に。",
    },
    EncyclopediaEntry {
        keywords: &["1077年", "西暦1077年"],
        title: "1077年",
        body: "カノッサの屈辱。",
    },
    EncyclopediaEntry {
        keywords: &["1086年", "西暦1086年"],
        title: "1086年",
        body: "白河上皇が院政開始。白河上皇が院政を開始。",
    },
    EncyclopediaEntry {
        keywords: &["1096年", "西暦1096年"],
        title: "1096年",
        body: "第1回十字軍開始。",
    },
    EncyclopediaEntry {
        keywords: &["1099年", "西暦1099年"],
        title: "1099年",
        body: "十字軍がエルサレムを占領。エルサレム王国など十字軍国家が成立。",
    },
    EncyclopediaEntry {
        keywords: &["1127年", "西暦1127年"],
        title: "1127年",
        body: "靖康の変。北宋滅亡、南宋成立。靖康の変。金が北宋の都開封を攻略。宋は南宋へ。",
    },
    EncyclopediaEntry {
        keywords: &["1156年", "西暦1156年"],
        title: "1156年",
        body: "保元の乱。武士の政治的台頭が進む。",
    },
    EncyclopediaEntry {
        keywords: &["1159年", "西暦1159年"],
        title: "1159年",
        body: "平治の乱。平清盛が勝利し、平氏政権への道が開かれる。",
    },
    EncyclopediaEntry {
        keywords: &["1167年", "西暦1167年"],
        title: "1167年",
        body: "平清盛が太政大臣。",
    },
    EncyclopediaEntry {
        keywords: &["1180年", "西暦1180年"],
        title: "1180年",
        body: "源頼朝が挙兵。源頼朝挙兵。治承・寿永の内乱開始。",
    },
    EncyclopediaEntry {
        keywords: &["1185年", "西暦1185年"],
        title: "1185年",
        body: "壇ノ浦の戦い。平氏滅亡。鎌倉幕府成立を1185年と見る説もある。壇ノ浦の戦いで平氏滅亡。守護・地頭設置の勅許。鎌倉幕府成立年を1185年とする説もある。",
    },
    EncyclopediaEntry {
        keywords: &["1192年", "西暦1192年", "鎌倉幕府"],
        title: "1192年",
        body: "源頼朝が征夷大将軍に任官。従来の鎌倉幕府成立年として長く教えられた。",
    },
    EncyclopediaEntry {
        keywords: &["1206年", "西暦1206年"],
        title: "1206年",
        body: "チンギス・ハンがモンゴル帝国を建国。チンギス・ハンがモンゴル高原の諸部族を統一。",
    },
    EncyclopediaEntry {
        keywords: &["1215年", "西暦1215年"],
        title: "1215年",
        body: "イングランドでマグナ・カルタ。マグナ・カルタ。イングランド王権に対する貴族の権利保障の象徴。",
    },
    EncyclopediaEntry {
        keywords: &["1221年", "西暦1221年"],
        title: "1221年",
        body: "承久の乱。鎌倉幕府の支配拡大。承久の乱。後鳥羽上皇が鎌倉幕府打倒を試みるが敗北。",
    },
    EncyclopediaEntry {
        keywords: &["1232年", "西暦1232年"],
        title: "1232年",
        body: "御成敗式目制定。御成敗式目（貞永式目）。北条泰時が制定。",
    },
    EncyclopediaEntry {
        keywords: &["1258年", "西暦1258年"],
        title: "1258年",
        body: "モンゴル軍がバグダードを攻略。アッバース朝カリフの政治的権威が大きく低下。",
    },
    EncyclopediaEntry {
        keywords: &["1271年", "西暦1271年"],
        title: "1271年",
        body: "元成立。フビライが国号を大元とする。元の成立年として1271年が一般的。",
    },
    EncyclopediaEntry {
        keywords: &["1274年", "西暦1274年"],
        title: "1274年",
        body: "文永の役。元軍が日本へ侵攻。文永の役。元・高麗連合軍が北部九州へ侵攻。",
    },
    EncyclopediaEntry {
        keywords: &["1281年", "西暦1281年"],
        title: "1281年",
        body: "弘安の役。元軍が再び日本へ侵攻。弘安の役。元軍が再度侵攻。暴風雨による大被害もあり撤退。",
    },
    EncyclopediaEntry {
        keywords: &["1299年", "西暦1299年"],
        title: "1299年",
        body: "オスマン帝国成立の起点とされる。",
    },
    EncyclopediaEntry {
        keywords: &["1333年", "西暦1333年"],
        title: "1333年",
        body: "鎌倉幕府滅亡。後醍醐天皇による建武政権へ。",
    },
    EncyclopediaEntry {
        keywords: &["1334年", "西暦1334年"],
        title: "1334年",
        body: "建武の新政の時期。ただしこれは1334年単年の出来事ではなく、1333年の鎌倉幕府滅亡後から1336年ごろまで続いた後醍醐天皇による建武政権・改革を指す。",
    },
    EncyclopediaEntry {
        keywords: &["1336年", "西暦1336年"],
        title: "1336年",
        body: "湊川の戦い。足利尊氏が京都を制圧し、室町幕府の基礎を築く。尊氏の征夷大将軍任官は1338年。足利尊氏が京都を制圧。南北朝時代が本格化。",
    },
    EncyclopediaEntry {
        keywords: &["1347年", "西暦1347年"],
        title: "1347年",
        body: "黒死病がヨーロッパで大流行（1347年頃から）。人口・社会・経済に甚大な影響。",
    },
    EncyclopediaEntry {
        keywords: &["1348年", "西暦1348年"],
        title: "1348年",
        body: "黒死病がヨーロッパ各地へ拡大。人口減少と社会・経済の変化をもたらす。",
    },
    EncyclopediaEntry {
        keywords: &["1368年", "西暦1368年"],
        title: "1368年",
        body: "中国で明成立。朱元璋が明を建国。元を北へ追う。",
    },
    EncyclopediaEntry {
        keywords: &["1378年", "西暦1378年"],
        title: "1378年",
        body: "西方教会大分裂。",
    },
    EncyclopediaEntry {
        keywords: &["1392年", "西暦1392年"],
        title: "1392年",
        body: "南北朝統一。足利義満が南朝と北朝を統合。",
    },
    EncyclopediaEntry {
        keywords: &["1397年", "西暦1397年"],
        title: "1397年",
        body: "金閣（鹿苑寺）建立。",
    },
    EncyclopediaEntry {
        keywords: &["1404年", "西暦1404年"],
        title: "1404年",
        body: "日明勘合貿易が始まる。日明勘合貿易開始。",
    },
    EncyclopediaEntry {
        keywords: &["1414年", "西暦1414年"],
        title: "1414年",
        body: "コンスタンツ公会議が始まった年(1414年11月、神聖ローマ皇帝ジギスムントの支援を受け招集)。西方教会の大分裂(3人の教皇が並び立つ状態)を解消するための会議で、1418年まで続いた。",
    },
    EncyclopediaEntry {
        keywords: &["1415年", "西暦1415年"],
        title: "1415年",
        body: "コンスタンツ公会議の重要な出来事があった年。会議自体は1414年11月に開始し1418年4月まで続いたが、1415年には教会分裂を巡る重要な決議(Haec Sancta)が採択され、宗教改革の先駆者とされるヤン・フスが異端として処刑された。",
    },
    EncyclopediaEntry {
        keywords: &["1431年", "西暦1431年"],
        title: "1431年",
        body: "ジャンヌ・ダルク処刑。",
    },
    EncyclopediaEntry {
        keywords: &["1453年", "西暦1453年"],
        title: "1453年",
        body: "コンスタンティノープル陥落。東ローマ帝国滅亡。コンスタンティノープル陥落。オスマン帝国が東ローマ帝国を滅ぼす。",
    },
    EncyclopediaEntry {
        keywords: &["1455年", "西暦1455年"],
        title: "1455年",
        body: "グーテンベルク聖書が完成したとされる時期。活版印刷術そのものは1450年代に普及。",
    },
    EncyclopediaEntry {
        keywords: &["1467年", "西暦1467年"],
        title: "1467年",
        body: "応仁の乱開始。戦国時代への転換点。",
    },
    EncyclopediaEntry {
        keywords: &["1492年", "西暦1492年"],
        title: "1492年",
        body: "コロンブスがアメリカ大陸へ到達。コロンブスがカリブ海地域に到達。ヨーロッパの大航海時代を加速。",
    },
    EncyclopediaEntry {
        keywords: &["1498年", "西暦1498年"],
        title: "1498年",
        body: "ヴァスコ・ダ・ガマがインド到達。ヴァスコ・ダ・ガマがインド西岸に到達。",
    },
    EncyclopediaEntry {
        keywords: &["1501年", "西暦1501年"],
        title: "1501年",
        body: "サファヴィー朝成立。",
    },
    EncyclopediaEntry {
        keywords: &["1517年", "西暦1517年"],
        title: "1517年",
        body: "マルティン・ルターの宗教改革開始。ルターが『95か条の論題』を公表。宗教改革の象徴的開始年。",
    },
    EncyclopediaEntry {
        keywords: &["1519年", "西暦1519年"],
        title: "1519年",
        body: "マゼラン艦隊が世界周航を開始。1522年に残存船が帰還し、史上初の世界一周航海となる。",
    },
    EncyclopediaEntry {
        keywords: &["1521年", "西暦1521年"],
        title: "1521年",
        body: "ルターが帝国追放。マゼラン艦隊が世界周航中。ヴォルムス帝国議会でルターが帝国追放。",
    },
    EncyclopediaEntry {
        keywords: &["1534年", "西暦1534年"],
        title: "1534年",
        body: "イギリス国教会成立。イギリス国王ヘンリー8世の首長令。イングランド国教会成立。",
    },
    EncyclopediaEntry {
        keywords: &["1543年", "西暦1543年"],
        title: "1543年",
        body: "鉄砲伝来。ポルトガル人が種子島へ。鉄砲伝来。種子島にポルトガル人が来航したとされる。",
    },
    EncyclopediaEntry {
        keywords: &["1549年", "西暦1549年"],
        title: "1549年",
        body: "フランシスコ・ザビエル来日。ザビエル来日。キリスト教の本格的布教開始。",
    },
    EncyclopediaEntry {
        keywords: &["1555年", "西暦1555年"],
        title: "1555年",
        body: "アウクスブルクの宗教和議。",
    },
    EncyclopediaEntry {
        keywords: &["1568年", "西暦1568年"],
        title: "1568年",
        body: "織田信長が京都へ進出。織田信長が足利義昭を奉じて上洛。",
    },
    EncyclopediaEntry {
        keywords: &["1573年", "西暦1573年"],
        title: "1573年",
        body: "信長が足利義昭を京都から追放。室町幕府滅亡。",
    },
    EncyclopediaEntry {
        keywords: &["1582年", "西暦1582年", "本能寺の変"],
        title: "1582年",
        body: "本能寺の変。織田信長が明智光秀に討たれる。",
    },
    EncyclopediaEntry {
        keywords: &["1588年", "西暦1588年"],
        title: "1588年",
        body: "アルマダの海戦。アルマダ海戦。スペイン無敵艦隊がイングランド遠征に失敗。",
    },
    EncyclopediaEntry {
        keywords: &["1590年", "西暦1590年"],
        title: "1590年",
        body: "小田原征伐。豊臣秀吉が全国統一をほぼ達成。",
    },
    EncyclopediaEntry {
        keywords: &["1600年", "西暦1600年", "関ヶ原の戦い"],
        title: "1600年",
        body: "関ヶ原の戦い。徳川家康が勝利。",
    },
    EncyclopediaEntry {
        keywords: &["1603年", "西暦1603年"],
        title: "1603年",
        body: "徳川家康が征夷大将軍。江戸幕府成立。徳川家康が征夷大将軍に就任。江戸幕府成立。",
    },
    EncyclopediaEntry {
        keywords: &["1615年", "西暦1615年"],
        title: "1615年",
        body: "大坂夏の陣。豊臣氏滅亡。大坂夏の陣。豊臣秀頼・淀殿らが自害し豊臣氏滅亡。武家諸法度も制定。",
    },
    EncyclopediaEntry {
        keywords: &["1618年", "西暦1618年"],
        title: "1618年",
        body: "三十年戦争開始。宗教・国際政治をめぐる大戦争へ。",
    },
    EncyclopediaEntry {
        keywords: &["1637年", "西暦1637年"],
        title: "1637年",
        body: "島原の乱。島原・天草一揆。幕府の禁教政策と年貢負担などを背景に発生。",
    },
    EncyclopediaEntry {
        keywords: &["1639年", "西暦1639年"],
        title: "1639年",
        body: "江戸幕府がポルトガル船の来航を禁止。いわゆる鎖国体制が完成へ向かう。",
    },
    EncyclopediaEntry {
        keywords: &["1642年", "西暦1642年"],
        title: "1642年",
        body: "イギリス清教徒革命開始。",
    },
    EncyclopediaEntry {
        keywords: &["1648年", "西暦1648年"],
        title: "1648年",
        body: "ウェストファリア条約。三十年戦争終結。主権国家体制の象徴とされる。",
    },
    EncyclopediaEntry {
        keywords: &["1660年", "西暦1660年"],
        title: "1660年",
        body: "イギリス王政復古。チャールズ2世即位。",
    },
    EncyclopediaEntry {
        keywords: &["1687年", "西暦1687年"],
        title: "1687年",
        body: "ニュートン『プリンキピア』刊行。",
    },
    EncyclopediaEntry {
        keywords: &["1688年", "西暦1688年"],
        title: "1688年",
        body: "イギリス名誉革命。",
    },
    EncyclopediaEntry {
        keywords: &["1689年", "西暦1689年"],
        title: "1689年",
        body: "イギリス権利章典。権利章典。イギリス立憲政治の重要文書。",
    },
    EncyclopediaEntry {
        keywords: &["1701年", "西暦1701年"],
        title: "1701年",
        body: "赤穂事件が始まる。赤穂事件の発端。1702年に討ち入り、1703年に切腹。",
    },
    EncyclopediaEntry {
        keywords: &["1707年", "西暦1707年"],
        title: "1707年",
        body: "富士山宝永大噴火。江戸・関東にも降灰。",
    },
    EncyclopediaEntry {
        keywords: &["1716年", "西暦1716年"],
        title: "1716年",
        body: "徳川吉宗が将軍となり、享保の改革へ。",
    },
    EncyclopediaEntry {
        keywords: &["1756年", "西暦1756年"],
        title: "1756年",
        body: "七年戦争開始。ヨーロッパだけでなく北米・インドなどにも拡大。",
    },
    EncyclopediaEntry {
        keywords: &["1760年", "西暦1760年"],
        title: "1760年",
        body: "産業革命の開始時期には諸説ある。18世紀後半のイギリスで機械工業・工場制が本格化。産業革命の開始時期は諸説あるが、18世紀後半のイギリスで本格化。",
    },
    EncyclopediaEntry {
        keywords: &["1773年", "西暦1773年"],
        title: "1773年",
        body: "ボストン茶会事件。イギリスの植民地政策への北米植民地の反発が強まる。",
    },
    EncyclopediaEntry {
        keywords: &["1776年", "西暦1776年", "アメリカ独立", "独立宣言", "独立記念日"],
        title: "1776年",
        body: "アメリカ独立宣言。",
    },
    EncyclopediaEntry {
        keywords: &["1787年", "西暦1787年"],
        title: "1787年",
        body: "アメリカ合衆国憲法制定。",
    },
    EncyclopediaEntry {
        keywords: &["1789年", "西暦1789年", "フランス革命"],
        title: "1789年",
        body: "フランス革命開始。バスティーユ襲撃、人権宣言など。",
    },
    EncyclopediaEntry {
        keywords: &["1791年", "西暦1791年"],
        title: "1791年",
        body: "フランス憲法成立。立憲君主制へ。",
    },
    EncyclopediaEntry {
        keywords: &["1793年", "西暦1793年"],
        title: "1793年",
        body: "ルイ16世処刑。恐怖政治へ。",
    },
    EncyclopediaEntry {
        keywords: &["1799年", "西暦1799年"],
        title: "1799年",
        body: "ナポレオンがクーデターで政権掌握。ナポレオンがブリュメール18日のクーデター。統領政府成立。",
    },
    EncyclopediaEntry {
        keywords: &["1800年", "西暦1800年"],
        title: "1800年",
        body: "1800年は西暦の年です。18世紀の最後の年にあたります(19世紀は1801年からという数え方が一般的です)。日本の元号では寛政12年です。",
    },
    EncyclopediaEntry {
        keywords: &["1804年", "西暦1804年"],
        title: "1804年",
        body: "ナポレオンがフランス皇帝に即位。ナポレオン皇帝即位。ナポレオン法典公布。",
    },
    EncyclopediaEntry {
        keywords: &["1808年", "西暦1808年"],
        title: "1808年",
        body: "スペイン独立戦争。",
    },
    EncyclopediaEntry {
        keywords: &["1814年", "西暦1814年"],
        title: "1814年",
        body: "ウィーン会議開始。ナポレオン戦争後のヨーロッパ秩序再編を協議。",
    },
    EncyclopediaEntry {
        keywords: &["1815年", "西暦1815年"],
        title: "1815年",
        body: "ワーテルローの戦い。ナポレオン失脚。ウィーン体制が成立。",
    },
    EncyclopediaEntry {
        keywords: &["1825年", "西暦1825年"],
        title: "1825年",
        body: "日本で異国船打払令。異国船打払令。幕府の対外政策が強硬化。",
    },
    EncyclopediaEntry {
        keywords: &["1830年", "西暦1830年"],
        title: "1830年",
        body: "フランス七月革命。立憲君主制へ。",
    },
    EncyclopediaEntry {
        keywords: &["1837年", "西暦1837年"],
        title: "1837年",
        body: "大塩平八郎の乱。天保の飢饉を背景に発生。",
    },
    EncyclopediaEntry {
        keywords: &["1840年", "西暦1840年"],
        title: "1840年",
        body: "アヘン戦争開始。清がイギリスに敗北し、不平等条約体制へ。",
    },
    EncyclopediaEntry {
        keywords: &["1848年", "西暦1848年"],
        title: "1848年",
        body: "ヨーロッパ各地で革命。『共産党宣言』刊行。ヨーロッパ諸国で二月革命など。マルクス・エンゲルス『共産党宣言』刊行。ヨーロッパ各地で1848年革命。フランスで二月革命、第二共和政成立。",
    },
    EncyclopediaEntry {
        keywords: &["1853年", "西暦1853年"],
        title: "1853年",
        body: "ペリーが浦賀に来航。ペリー来航。幕府の鎖国的対外政策が大きく揺らぐ。",
    },
    EncyclopediaEntry {
        keywords: &["1854年", "西暦1854年"],
        title: "1854年",
        body: "日米和親条約締結。下田・箱館を開港し、日米間の外交関係を整える。",
    },
    EncyclopediaEntry {
        keywords: &["1858年", "西暦1858年"],
        title: "1858年",
        body: "日米修好通商条約。安政の大獄。清と列強の天津条約（第二次アヘン戦争期）。",
    },
    EncyclopediaEntry {
        keywords: &["1859年", "西暦1859年"],
        title: "1859年",
        body: "ダーウィン『種の起源』刊行。",
    },
    EncyclopediaEntry {
        keywords: &["1860年", "西暦1860年"],
        title: "1860年",
        body: "イタリア統一運動が進展。ガリバルディが両シチリア王国を征服し、統一王国成立へ。",
    },
    EncyclopediaEntry {
        keywords: &["1861年", "西暦1861年"],
        title: "1861年",
        body: "アメリカ南北戦争開始。イタリア王国成立。",
    },
    EncyclopediaEntry {
        keywords: &["1863年", "西暦1863年"],
        title: "1863年",
        body: "リンカーンによる奴隷解放宣言が1863年1月1日に発効した(1862年9月22日に出されたのは予備宣言)。アメリカ南部連合の支配地域の奴隷を解放対象とし、南北戦争の性格を大きく転換させた。",
    },
    EncyclopediaEntry {
        keywords: &["1865年", "西暦1865年"],
        title: "1865年",
        body: "アメリカ南北戦争終結。リンカーン暗殺。",
    },
    EncyclopediaEntry {
        keywords: &["1868年", "西暦1868年", "明治維新"],
        title: "1868年",
        body: "明治維新。明治政府成立。明治維新。五箇条の御誓文。戊辰戦争開始。",
    },
    EncyclopediaEntry {
        keywords: &["1870年", "西暦1870年"],
        title: "1870年",
        body: "普仏戦争開始。フランス敗北後、ドイツ帝国成立とフランス第三共和政成立につながる。",
    },
    EncyclopediaEntry {
        keywords: &["1871年", "西暦1871年"],
        title: "1871年",
        body: "ドイツ帝国成立。パリ・コミューン。廃藩置県。日本で廃藩置県。",
    },
    EncyclopediaEntry {
        keywords: &["1877年", "西暦1877年"],
        title: "1877年",
        body: "西南戦争。西郷隆盛ら旧士族の最後の大規模反乱。",
    },
    EncyclopediaEntry {
        keywords: &["1889年", "西暦1889年"],
        title: "1889年",
        body: "大日本帝国憲法発布。パリ万国博覧会、エッフェル塔完成。",
    },
    EncyclopediaEntry {
        keywords: &["1890年", "西暦1890年"],
        title: "1890年",
        body: "第1回帝国議会。教育勅語発布。",
    },
    EncyclopediaEntry {
        keywords: &["1894年", "西暦1894年"],
        title: "1894年",
        body: "日清戦争開始。朝鮮で甲午農民戦争（東学農民運動）。イギリス・フランスなどの帝国主義的対外進出が進む時期。",
    },
    EncyclopediaEntry {
        keywords: &["1895年", "西暦1895年"],
        title: "1895年",
        body: "下関条約。台湾・澎湖諸島を日本へ割譲。三国干渉。",
    },
    EncyclopediaEntry {
        keywords: &["1898年", "西暦1898年"],
        title: "1898年",
        body: "米西戦争。米国が海外進出を強める。米西戦争。スペインがキューバ・フィリピンなどでの支配を失う。",
    },
    EncyclopediaEntry {
        keywords: &["1900年", "西暦1900年"],
        title: "1900年",
        body: "義和団事件（北清事変）。列強の連合軍が北京を占領。",
    },
    EncyclopediaEntry {
        keywords: &["1904年", "西暦1904年"],
        title: "1904年",
        body: "日露戦争開始。",
    },
    EncyclopediaEntry {
        keywords: &["1905年", "西暦1905年"],
        title: "1905年",
        body: "日露戦争終結。ポーツマス条約。ロシア第一革命。血の日曜日事件などを背景にロシアの革命運動が拡大。",
    },
    EncyclopediaEntry {
        keywords: &["1910年", "西暦1910年"],
        title: "1910年",
        body: "韓国併合。メキシコ革命開始。",
    },
    EncyclopediaEntry {
        keywords: &["1911年", "西暦1911年"],
        title: "1911年",
        body: "中国で辛亥革命。辛亥革命開始。清朝打倒へ。",
    },
    EncyclopediaEntry {
        keywords: &["1912年", "西暦1912年"],
        title: "1912年",
        body: "中華民国成立。大正時代開始。中華民国成立。日本では大正時代開始。",
    },
    EncyclopediaEntry {
        keywords: &["1914年", "西暦1914年", "第一次世界大戦"],
        title: "1914年",
        body: "第一次世界大戦開始。",
    },
    EncyclopediaEntry {
        keywords: &["1917年", "西暦1917年"],
        title: "1917年",
        body: "ロシア革命。ロシア二月革命・十月革命。アメリカが参戦。ロシア二月革命、十月革命。アメリカ参戦。ウィルソンの「十四か条」につながる国際秩序構想。",
    },
    EncyclopediaEntry {
        keywords: &["1918年", "西暦1918年"],
        title: "1918年",
        body: "第一次世界大戦が1918年11月11日に休戦した。正式な講和条約(ヴェルサイユ条約)や戦後処理は1919年以降に行われたため、「1918年に戦争が完全に終結した」わけではない。ドイツ革命も起きた。",
    },
    EncyclopediaEntry {
        keywords: &["1919年", "西暦1919年"],
        title: "1919年",
        body: "ヴェルサイユ条約調印。国際連盟規約が条約に組み込まれる。五・四運動も発生。国際連盟の正式発足は1920年。ドイツでワイマール憲法制定。",
    },
    EncyclopediaEntry {
        keywords: &["1920年", "西暦1920年"],
        title: "1920年",
        body: "国際連盟正式発足。インドでガンディーの非協力運動が展開。",
    },
    EncyclopediaEntry {
        keywords: &["1922年", "西暦1922年"],
        title: "1922年",
        body: "ソビエト社会主義共和国連邦（ソ連）成立。ムッソリーニがイタリア首相に。",
    },
    EncyclopediaEntry {
        keywords: &["1923年", "西暦1923年"],
        title: "1923年",
        body: "関東大震災。トルコ共和国成立への動きが進み、ローザンヌ条約が調印。",
    },
    EncyclopediaEntry {
        keywords: &["1929年", "西暦1929年"],
        title: "1929年",
        body: "世界恐慌。ニューヨーク株式市場の大暴落を契機に世界へ波及。",
    },
    EncyclopediaEntry {
        keywords: &["1933年", "西暦1933年"],
        title: "1933年",
        body: "ヒトラーがドイツ首相に就任。ナチ政権成立。日本が国際連盟脱退を通告。ヒトラー首相就任。ドイツが国際連盟脱退を表明。ニューディール政策開始（ルーズベルト）。",
    },
    EncyclopediaEntry {
        keywords: &["1936年", "西暦1936年"],
        title: "1936年",
        body: "二・二六事件。日独防共協定。スペイン内戦開始。ソ連でスターリン憲法。",
    },
    EncyclopediaEntry {
        keywords: &["1937年", "西暦1937年"],
        title: "1937年",
        body: "日中戦争開始。盧溝橋事件。日中戦争が全面化。",
    },
    EncyclopediaEntry {
        keywords: &["1939年", "西暦1939年", "第二次世界大戦"],
        title: "1939年",
        body: "第二次世界大戦開始。ドイツがポーランド侵攻。独ソ不可侵条約。",
    },
    EncyclopediaEntry {
        keywords: &["1940年", "西暦1940年"],
        title: "1940年",
        body: "日独伊三国同盟。フランス降伏。日本で大政翼賛会発足。",
    },
    EncyclopediaEntry {
        keywords: &["1941年", "西暦1941年", "太平洋戦争", "真珠湾攻撃"],
        title: "1941年",
        body: "真珠湾攻撃。太平洋戦争開始。独ソ戦開始。大西洋憲章。",
    },
    EncyclopediaEntry {
        keywords: &["1942年", "西暦1942年"],
        title: "1942年",
        body: "ミッドウェー海戦。連合軍の反攻が始まる転機。スターリングラード攻防戦開始。エル・アラメインの戦い。",
    },
    EncyclopediaEntry {
        keywords: &["1943年", "西暦1943年"],
        title: "1943年",
        body: "イタリア降伏。スターリングラード戦などを経て枢軸国が劣勢化。カイロ会談。テヘラン会談。",
    },
    EncyclopediaEntry {
        keywords: &["1944年", "西暦1944年"],
        title: "1944年",
        body: "ノルマンディー上陸作戦。連合軍が西ヨーロッパへ進攻。ブレトン・ウッズ会議。",
    },
    EncyclopediaEntry {
        keywords: &["1945年", "西暦1945年", "終戦記念日", "原爆投下"],
        title: "1945年",
        body: "国際連合について、国連憲章自体は1945年6月26日にサンフランシスコで署名されたが、正式に発足したのは必要な国の批准がそろった1945年10月24日である。",
    },
    EncyclopediaEntry {
        keywords: &["1946年", "西暦1946年"],
        title: "1946年",
        body: "日本国憲法公布。戦後改革・極東国際軍事裁判などが進む。日本国憲法公布。極東国際軍事裁判（東京裁判）開廷。",
    },
    EncyclopediaEntry {
        keywords: &["1947年", "西暦1947年"],
        title: "1947年",
        body: "日本国憲法施行。インド・パキスタンが独立。冷戦の初期構造が形成される。日本国憲法施行。インド・パキスタン独立。トルーマン・ドクトリン。トルーマン＝ドクトリン。マーシャル・プラン発表。",
    },
    EncyclopediaEntry {
        keywords: &["1948年", "西暦1948年"],
        title: "1948年",
        body: "世界人権宣言採択。イスラエル建国。第一次中東戦争。ベルリン封鎖開始。",
    },
    EncyclopediaEntry {
        keywords: &["1949年", "西暦1949年"],
        title: "1949年",
        body: "中華人民共和国成立。NATO発足。西ドイツ・東ドイツ成立。西ドイツ、東ドイツ成立。",
    },
    EncyclopediaEntry {
        keywords: &["1950年", "西暦1950年"],
        title: "1950年",
        body: "朝鮮戦争開始。日本で警察予備隊創設。",
    },
    EncyclopediaEntry {
        keywords: &["1951年", "西暦1951年"],
        title: "1951年",
        body: "サンフランシスコ平和条約と日米安全保障条約は、いずれも1951年9月8日に調印された。ただし両条約が実際に発効したのは1952年4月28日であり、調印と発効の年を混同しないよう注意。",
    },
    EncyclopediaEntry {
        keywords: &["1953年", "西暦1953年"],
        title: "1953年",
        body: "朝鮮戦争休戦。スターリン死去。エリザベス2世戴冠。",
    },
    EncyclopediaEntry {
        keywords: &["1955年", "西暦1955年"],
        title: "1955年",
        body: "バンドン会議（アジア・アフリカ会議）。ワルシャワ条約機構成立。日本では55年体制成立。バンドン会議。ワルシャワ条約機構成立。日本で55年体制成立。",
    },
    EncyclopediaEntry {
        keywords: &["1956年", "西暦1956年"],
        title: "1956年",
        body: "スエズ危機。ハンガリー動乱。日本が国際連合加盟。",
    },
    EncyclopediaEntry {
        keywords: &["1957年", "西暦1957年"],
        title: "1957年",
        body: "ソ連がスプートニク1号を打ち上げ。ローマ条約調印。欧州経済共同体（EEC）と欧州原子力共同体（EURATOM）の設立につながる。条約発効は1958年。",
    },
    EncyclopediaEntry {
        keywords: &["1958年", "西暦1958年"],
        title: "1958年",
        body: "東京タワー完成。中国で大躍進政策開始。",
    },
    EncyclopediaEntry {
        keywords: &["1959年", "西暦1959年"],
        title: "1959年",
        body: "キューバ革命。",
    },
    EncyclopediaEntry {
        keywords: &["1960年", "西暦1960年"],
        title: "1960年",
        body: "「アフリカの年」。アフリカで17か国が独立。日米安全保障条約改定。",
    },
    EncyclopediaEntry {
        keywords: &["1961年", "西暦1961年"],
        title: "1961年",
        body: "ガガーリンが人類初の宇宙飛行。ベルリンの壁建設。ガガーリン宇宙飛行。ベルリンの壁建設。ガガーリン、人類初の宇宙飛行。非同盟運動の第一回首脳会議。",
    },
    EncyclopediaEntry {
        keywords: &["1962年", "西暦1962年"],
        title: "1962年",
        body: "キューバ危機。アルジェリア独立。",
    },
    EncyclopediaEntry {
        keywords: &["1963年", "西暦1963年"],
        title: "1963年",
        body: "ケネディ大統領暗殺。ケネディ暗殺。部分的核実験禁止条約。",
    },
    EncyclopediaEntry {
        keywords: &["1964年", "西暦1964年"],
        title: "1964年",
        body: "東京オリンピック。東海道新幹線開業。中国が初の核実験。",
    },
    EncyclopediaEntry {
        keywords: &["1965年", "西暦1965年"],
        title: "1965年",
        body: "ベトナム戦争への米国介入が拡大。ベトナム戦争で米軍の本格介入が拡大。日韓基本条約。",
    },
    EncyclopediaEntry {
        keywords: &["1966年", "西暦1966年"],
        title: "1966年",
        body: "中国で文化大革命開始。",
    },
    EncyclopediaEntry {
        keywords: &["1967年", "西暦1967年"],
        title: "1967年",
        body: "第三次中東戦争。東南アジア諸国連合（ASEAN）設立。EC統合の進展（EC諸共同体の統合機構が形成）。",
    },
    EncyclopediaEntry {
        keywords: &["1968年", "西暦1968年"],
        title: "1968年",
        body: "プラハの春。世界各地で学生運動。プラハの春。フランス五月革命など世界的な学生運動。フランス五月革命など学生運動。核兵器不拡散条約（NPT）署名。",
    },
    EncyclopediaEntry {
        keywords: &["1969年", "西暦1969年"],
        title: "1969年",
        body: "アポロ11号が月面着陸。アポロ11号月面着陸。",
    },
    EncyclopediaEntry {
        keywords: &["1970年", "西暦1970年"],
        title: "1970年",
        body: "大阪万博開催。",
    },
    EncyclopediaEntry {
        keywords: &["1971年", "西暦1971年"],
        title: "1971年",
        body: "ニクソン・ショック。米ドルと金の交換停止。第三次印パ戦争を経てバングラデシュが独立。バングラデシュ独立。中国の国連代表権が中華人民共和国へ移行。",
    },
    EncyclopediaEntry {
        keywords: &["1972年", "西暦1972年"],
        title: "1972年",
        body: "沖縄返還。日中国交正常化。米中接近（ニクソン訪中）。SALT I・ABM条約。",
    },
    EncyclopediaEntry {
        keywords: &["1973年", "西暦1973年"],
        title: "1973年",
        body: "第一次オイルショック。第四次中東戦争。",
    },
    EncyclopediaEntry {
        keywords: &["1974年", "西暦1974年"],
        title: "1974年",
        body: "ウォーターゲート事件を受けニクソン辞任。",
    },
    EncyclopediaEntry {
        keywords: &["1975年", "西暦1975年"],
        title: "1975年",
        body: "ベトナム戦争終結。サイゴン陥落。ヘルシンキ最終文書。",
    },
    EncyclopediaEntry {
        keywords: &["1976年", "西暦1976年"],
        title: "1976年",
        body: "中国で毛沢東死去。毛沢東死去。文化大革命終結へ。",
    },
    EncyclopediaEntry {
        keywords: &["1977年", "西暦1977年"],
        title: "1977年",
        body: "パーソナルコンピューターが一般向け市場で本格的に普及し始める時期。Apple IIなどが登場。",
    },
    EncyclopediaEntry {
        keywords: &["1978年", "西暦1978年"],
        title: "1978年",
        body: "日中平和友好条約。中国で鄧小平の改革開放路線が本格化。中国で改革開放路線が本格化。キャンプ・デービッド合意。",
    },
    EncyclopediaEntry {
        keywords: &["1979年", "西暦1979年"],
        title: "1979年",
        body: "イラン革命。第二次オイルショック。ソ連のアフガニスタン侵攻。",
    },
    EncyclopediaEntry {
        keywords: &["1980年", "西暦1980年"],
        title: "1980年",
        body: "イラン・イラク戦争開始。",
    },
    EncyclopediaEntry {
        keywords: &["1981年", "西暦1981年"],
        title: "1981年",
        body: "IBM PC発表。スペースシャトル初飛行。レーガン大統領就任。",
    },
    EncyclopediaEntry {
        keywords: &["1982年", "西暦1982年"],
        title: "1982年",
        body: "フォークランド紛争。",
    },
    EncyclopediaEntry {
        keywords: &["1983年", "西暦1983年"],
        title: "1983年",
        body: "ARPANETがTCP/IPへ移行。インターネットの標準プロトコルとしてTCP/IPが定着する重要年。ARPANETがTCP/IPを標準採用。",
    },
    EncyclopediaEntry {
        keywords: &["1984年", "西暦1984年"],
        title: "1984年",
        body: "Apple Macintosh発売。",
    },
    EncyclopediaEntry {
        keywords: &["1985年", "西暦1985年"],
        title: "1985年",
        body: "プラザ合意。ゴルバチョフがソ連共産党書記長就任。",
    },
    EncyclopediaEntry {
        keywords: &["1986年", "西暦1986年"],
        title: "1986年",
        body: "チェルノブイリ原発事故。ソ連でペレストロイカが進展。",
    },
    EncyclopediaEntry {
        keywords: &["1987年", "西暦1987年"],
        title: "1987年",
        body: "INF全廃条約調印。",
    },
    EncyclopediaEntry {
        keywords: &["1988年", "西暦1988年"],
        title: "1988年",
        body: "ソウルオリンピック。",
    },
    EncyclopediaEntry {
        keywords: &["1989年", "西暦1989年", "ベルリンの壁"],
        title: "1989年",
        body: "ベルリンの壁崩壊。平成時代開始。ベルリンの壁崩壊。昭和天皇死去、平成開始。中国で天安門事件。",
    },
    EncyclopediaEntry {
        keywords: &["1990年", "西暦1990年"],
        title: "1990年",
        body: "東西ドイツ統一。イラクがクウェート侵攻。",
    },
    EncyclopediaEntry {
        keywords: &["1991年", "西暦1991年", "ソ連崩壊"],
        title: "1991年",
        body: "ソ連崩壊。湾岸戦争。湾岸戦争。ソ連崩壊。ユーゴスラビア解体が進む。",
    },
    EncyclopediaEntry {
        keywords: &["1992年", "西暦1992年"],
        title: "1992年",
        body: "マーストリヒト条約調印。欧州連合（EU）創設を定め、1993年に発効。ユーゴスラビア紛争が本格化。",
    },
    EncyclopediaEntry {
        keywords: &["1993年", "西暦1993年"],
        title: "1993年",
        body: "欧州連合（EU）発足（マーストリヒト条約が11月1日に発効）。EU発足。マーストリヒト条約発効により11月1日に発足。オスロ合意。",
    },
    EncyclopediaEntry {
        keywords: &["1994年", "西暦1994年"],
        title: "1994年",
        body: "ルワンダ虐殺。南アフリカで初の全人種参加選挙、マンデラ大統領就任。",
    },
    EncyclopediaEntry {
        keywords: &["1995年", "西暦1995年"],
        title: "1995年",
        body: "阪神・淡路大震災。Windows 95発売。WTO発足。デイトン合意。",
    },
    EncyclopediaEntry {
        keywords: &["1996年", "西暦1996年"],
        title: "1996年",
        body: "クローン羊ドリー誕生。",
    },
    EncyclopediaEntry {
        keywords: &["1997年", "西暦1997年"],
        title: "1997年",
        body: "香港返還。アジア通貨危機。京都議定書採択。",
    },
    EncyclopediaEntry {
        keywords: &["1998年", "西暦1998年"],
        title: "1998年",
        body: "Google創業。北アイルランド和平の「聖金曜日合意」。",
    },
    EncyclopediaEntry {
        keywords: &["1999年", "西暦1999年"],
        title: "1999年",
        body: "ユーロが導入された年。ただし1999年に導入されたのは銀行間取引などで使う非現金の共通通貨としてで、実際に紙幣・硬貨が流通し始めたのは2002年から。",
    },
    EncyclopediaEntry {
        keywords: &["2000年", "西暦2000年"],
        title: "2000年",
        body: "国際宇宙ステーション（ISS）の長期滞在運用が開始。初の長期滞在クルーは2000年11月に到着。ISSで長期滞在運用開始。",
    },
    EncyclopediaEntry {
        keywords: &["2001年", "西暦2001年"],
        title: "2001年",
        body: "9.11同時多発テロ。中国がWTO加盟。9.11同時多発テロ。中国WTO加盟。9・11同時多発テロ。アフガニスタン戦争開始。",
    },
    EncyclopediaEntry {
        keywords: &["2002年", "西暦2002年"],
        title: "2002年",
        body: "ユーロ紙幣・硬貨流通開始。",
    },
    EncyclopediaEntry {
        keywords: &["2003年", "西暦2003年"],
        title: "2003年",
        body: "イラク戦争。ヒトゲノム計画完了。SARS流行。",
    },
    EncyclopediaEntry {
        keywords: &["2004年", "西暦2004年"],
        title: "2004年",
        body: "インド洋大津波。Facebook創業。EUが東方拡大。EU東方拡大。",
    },
    EncyclopediaEntry {
        keywords: &["2005年", "西暦2005年"],
        title: "2005年",
        body: "YouTube創業。京都議定書発効。",
    },
    EncyclopediaEntry {
        keywords: &["2006年", "西暦2006年"],
        title: "2006年",
        body: "Twitter開始。冥王星が準惑星に分類。Twitter開始。冥王星が準惑星に再分類。北朝鮮が初の核実験。",
    },
    EncyclopediaEntry {
        keywords: &["2007年", "西暦2007年"],
        title: "2007年",
        body: "iPhone発売。EUでリスボン条約署名。",
    },
    EncyclopediaEntry {
        keywords: &["2008年", "西暦2008年"],
        title: "2008年",
        body: "リーマン・ショック。世界金融危機。北京オリンピック。",
    },
    EncyclopediaEntry {
        keywords: &["2009年", "西暦2009年"],
        title: "2009年",
        body: "新型インフルエンザが世界的流行。新型インフルエンザ（H1N1）世界的流行。",
    },
    EncyclopediaEntry {
        keywords: &["2010年", "西暦2010年"],
        title: "2010年",
        body: "チュニジア革命。アラブの春のきっかけ。チュニジア革命。アラブの春の起点。",
    },
    EncyclopediaEntry {
        keywords: &["2011年", "西暦2011年"],
        title: "2011年",
        body: "東日本大震災。アラブの春拡大。南スーダン独立。ビンラディン殺害。",
    },
    EncyclopediaEntry {
        keywords: &["2012年", "西暦2012年"],
        title: "2012年",
        body: "山中伸弥らのiPS細胞研究がノーベル賞受賞。山中伸弥らのiPS細胞研究がノーベル生理学・医学賞。",
    },
    EncyclopediaEntry {
        keywords: &["2013年", "西暦2013年"],
        title: "2013年",
        body: "中国が一帯一路構想を発表。中国が一帯一路構想を提唱。一帯一路構想提唱。スノーデン事件。",
    },
    EncyclopediaEntry {
        keywords: &["2014年", "西暦2014年"],
        title: "2014年",
        body: "ロシアがクリミアを併合。エボラ出血熱流行。ロシアによるクリミア併合。エボラ出血熱流行。イスラム国（IS）が勢力拡大。",
    },
    EncyclopediaEntry {
        keywords: &["2015年", "西暦2015年"],
        title: "2015年",
        body: "パリ協定採択。欧州難民危機。",
    },
    EncyclopediaEntry {
        keywords: &["2016年", "西暦2016年"],
        title: "2016年",
        body: "英国がEU離脱を決定。米国大統領選でトランプ勝利。",
    },
    EncyclopediaEntry {
        keywords: &["2017年", "西暦2017年"],
        title: "2017年",
        body: "北朝鮮の核・ミサイル問題が国際的緊張を高める。北朝鮮の核・ミサイル問題が緊迫化。",
    },
    EncyclopediaEntry {
        keywords: &["2018年", "西暦2018年"],
        title: "2018年",
        body: "米中貿易摩擦が激化。米中貿易摩擦激化。EU一般データ保護規則（GDPR）適用開始。",
    },
    EncyclopediaEntry {
        keywords: &["2019年", "西暦2019年"],
        title: "2019年",
        body: "中国で新型コロナウイルス感染症が確認される。中国・武漢で原因不明の肺炎が報告され、後に新型コロナウイルス感染症（COVID-19）と確認された。世界的大流行は2020年に拡大。",
    },
    EncyclopediaEntry {
        keywords: &["2020年", "西暦2020年"],
        title: "2020年",
        body: "COVID-19が世界的大流行。東京五輪は翌年へ延期。COVID-19世界的大流行。東京2020大会延期。",
    },
    EncyclopediaEntry {
        keywords: &["2021年", "西暦2021年"],
        title: "2021年",
        body: "新型コロナワクチン接種が世界で拡大。東京2020大会開催。新型コロナワクチン接種拡大。東京2020大会開催。",
    },
    EncyclopediaEntry {
        keywords: &["2022年", "西暦2022年"],
        title: "2022年",
        body: "ロシアがウクライナへ大規模侵攻。ChatGPTは2022年11月に一般公開。ロシアのウクライナ大規模侵攻。ChatGPT一般公開。ChatGPT一般公開（11月）。世界的なエネルギー・食料価格への影響。",
    },
    EncyclopediaEntry {
        keywords: &["2023年", "西暦2023年"],
        title: "2023年",
        body: "生成AIの社会的普及が急速に進展。10月7日のハマスらによるイスラエルへの大規模攻撃を契機に、イスラエルとハマスの戦闘が拡大。生成AIの急速な普及。イスラエルとハマスの戦闘が継続・拡大。10月7日のハマスらによる大規模攻撃を契機に、イスラエルとハマスの戦闘が拡大。",
    },
    EncyclopediaEntry {
        keywords: &["2024年", "西暦2024年"],
        title: "2024年",
        body: "能登半島地震。生成AIの社会実装が加速。パリ五輪開催。能登半島地震。パリ五輪。生成AIの社会実装加速。",
    },
    EncyclopediaEntry {
        keywords: &["2025年", "西暦2025年"],
        title: "2025年",
        body: "生成AI・AIエージェントの実用化が進展。世界各国でAI開発競争が激化。生成AI・AIエージェントの実用化競争が進展。※評価が定まっていない進行中の事項は今後更新が必要。",
    },
    EncyclopediaEntry {
        keywords: &["2026年", "西暦2026年"],
        title: "2026年",
        body: "現在（2026年8月）。AI・ロボット・宇宙開発などの技術競争が継続中。※進行中の出来事は今後変化するため固定的な歴史事項とは区別する。現在（2026年8月）。AI・ロボット・宇宙開発などの技術競争が継続。※現時点の状況であり、将来更新する前提。",
    },
];


/// クエリ文字列に含まれるキーワード数でスコアリングし、上位`limit`件を返す。
pub fn search(query: &str, limit: usize) -> Vec<KnowledgeSnippet> {
    let mut scored: Vec<(usize, &EncyclopediaEntry)> = ENCYCLOPEDIA
        .iter()
        .map(|e| {
            let score = e.keywords.iter().filter(|k| query.contains(**k)).count();
            (score, e)
        })
        .filter(|(score, _)| *score > 0)
        .collect();
    // スコア降順。同点の場合は元の並び順を保つ(sort_byは安定ソート)
    scored.sort_by(|a, b| b.0.cmp(&a.0));

    scored
        .into_iter()
        .take(limit)
        .map(|(_, e)| KnowledgeSnippet {
            source: "encyclopedia",
            title: e.title.to_string(),
            body: e.body.to_string(),
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn finds_matching_entry_by_keyword() {
        let results = search("1900年に何があったか教えて", 3);
        assert!(results.iter().any(|r| r.title == "1900年"));
    }

    #[test]
    fn does_not_confuse_1800_and_1900() {
        let results = search("1800年に起こったことを教えて", 3);
        assert!(results.iter().any(|r| r.title == "1800年"));
        assert!(!results.iter().any(|r| r.title == "1900年"));
    }

    #[test]
    fn returns_empty_when_no_keyword_matches() {
        let results = search("好きな食べ物は何?", 3);
        assert!(results.is_empty());
    }

    #[test]
    fn respects_limit() {
        let results = search(
            "1900年と1800年とアメリカ独立と明治維新とフランス革命について教えて",
            2,
        );
        assert!(results.len() <= 2);
    }

    #[test]
    fn all_entries_have_at_least_one_keyword() {
        for e in ENCYCLOPEDIA {
            assert!(
                !e.keywords.is_empty(),
                "keywordsが空の項目があります: {}",
                e.title
            );
        }
    }

    #[test]
    fn snippet_source_is_tagged_as_encyclopedia() {
        let results = search("明治維新について", 1);
        assert_eq!(results[0].source, "encyclopedia");
    }

    /// 年表ドキュメント自身の「1415年=公会議開始年」という訂正が、複数の一次資料
    /// (EWTN, Wikipedia, Encyclopedia.com等)による裏取りの結果、実際には誤りだった
    /// ケース。コンスタンツ公会議の開始は1414年11月であり、1415年ではない。
    /// 誤りをそのまま実装しないよう、正しい年に正しい情報が入っていることを固定する。
    #[test]
    fn council_of_constance_start_year_is_1414_not_1415() {
        let results_1414 = search("1414年に何があった?", 3);
        assert!(
            results_1414
                .iter()
                .any(|r| r.body.contains("コンスタンツ公会議") && r.body.contains("始まった")),
            "1414年の項目に公会議開始の記述が無い"
        );

        let results_1415 = search("1415年に何があった?", 3);
        assert!(
            !results_1415.iter().any(|r| r.body.contains("開始した")),
            "1415年の項目が誤って公会議の開始年と記述している"
        );
    }

    #[test]
    fn total_entry_count_matches_generated_dataset() {
        // 年表ファイルから自動生成した件数(1800年の手動追加分を含む)の見張り番。
        // 大幅に増減した場合は、生成スクリプトやマージ処理を見直すサイン。
        assert_eq!(ENCYCLOPEDIA.len(), 289);
    }

    #[test]
    fn no_duplicate_titles() {
        let mut titles: Vec<&str> = ENCYCLOPEDIA.iter().map(|e| e.title).collect();
        let original_len = titles.len();
        titles.sort();
        titles.dedup();
        assert_eq!(titles.len(), original_len, "titleが重複している項目がある");
    }
}
