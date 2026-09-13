import type { HintGameQuestion } from "./types";

/**
 * ヒントゲームの全問題データ(カテゴリ横断・全310問)。
 * 各問題は easy/normal/hard それぞれに3つのヒントを持つ(表示時は難易度に応じて選択)。
 */
export const HINT_GAME_QUESTIONS: HintGameQuestion[] = [
  {
    id: "q1",
    category: "世界史（人物）",
    answer: "ナポレオン",
    hints: {
      easy: ["仏蘭西", "皇帝", "戦争"],
      normal: ["仏", "皇帝", "遠征"],
      hard: ["仏", "帝", "戦"],
    },
  },
  {
    id: "q2",
    category: "世界史（人物）",
    answer: "アインシュタイン",
    hints: {
      easy: ["独逸", "科学者", "相対論"],
      normal: ["独", "学者", "相対"],
      hard: ["独", "学", "対"],
    },
  },
  {
    id: "q3",
    category: "世界史（人物）",
    answer: "ダーウィン",
    hints: {
      easy: ["英国", "学者", "進化論"],
      normal: ["英", "学者", "進化"],
      hard: ["英", "学", "進"],
    },
  },
  {
    id: "q4",
    category: "世界史（人物）",
    answer: "ニュートン",
    hints: {
      easy: ["英国", "物理学", "万有引力"],
      normal: ["英", "物理", "引力"],
      hard: ["英", "理", "力"],
    },
  },
  {
    id: "q5",
    category: "世界史（人物）",
    answer: "エジソン",
    hints: {
      easy: ["米国", "発明家", "電球"],
      normal: ["米", "発明", "電球"],
      hard: ["米", "発", "電"],
    },
  },
  {
    id: "q6",
    category: "世界史（人物）",
    answer: "リンカーン",
    hints: {
      easy: ["米国", "大統領", "奴隷解放"],
      normal: ["米", "大統領", "解放"],
      hard: ["米", "統", "解"],
    },
  },
  {
    id: "q7",
    category: "世界史（人物）",
    answer: "クレオパトラ",
    hints: {
      easy: ["埃及", "女王", "絶世美女"],
      normal: ["埃", "女王", "美女"],
      hard: ["埃", "女", "美"],
    },
  },
  {
    id: "q8",
    category: "世界史（人物）",
    answer: "ガリレオ",
    hints: {
      easy: ["伊太利", "天文学", "地動説"],
      normal: ["伊", "天文", "地動"],
      hard: ["伊", "天", "地"],
    },
  },
  {
    id: "q9",
    category: "世界史（人物）",
    answer: "ガンジー",
    hints: {
      easy: ["印度", "独立", "非暴力"],
      normal: ["印", "独立", "無抵抗"],
      hard: ["印", "独", "無"],
    },
  },
  {
    id: "q10",
    category: "世界史（人物）",
    answer: "チャーチル",
    hints: {
      easy: ["英国", "首相", "大戦"],
      normal: ["英", "首相", "大戦"],
      hard: ["英", "相", "戦"],
    },
  },
  {
    id: "q11",
    category: "世界史（人物）",
    answer: "ヒトラー",
    hints: {
      easy: ["独逸", "独裁者", "大戦"],
      normal: ["独", "独裁", "大戦"],
      hard: ["独", "裁", "戦"],
    },
  },
  {
    id: "q12",
    category: "世界史（人物）",
    answer: "スターリン",
    hints: {
      easy: ["露西亜", "独裁者", "共産党"],
      normal: ["露", "独裁", "共産"],
      hard: ["露", "裁", "共"],
    },
  },
  {
    id: "q13",
    category: "世界史（人物）",
    answer: "毛沢東",
    hints: {
      easy: ["中国", "主席", "共産党"],
      normal: ["中", "主席", "共産"],
      hard: ["中", "席", "共"],
    },
  },
  {
    id: "q14",
    category: "世界史（人物）",
    answer: "始皇帝",
    hints: {
      easy: ["中国", "皇帝", "万里長城"],
      normal: ["中", "始帝", "長城"],
      hard: ["中", "始", "城"],
    },
  },
  {
    id: "q15",
    category: "世界史（人物）",
    answer: "徳川家康",
    hints: {
      easy: ["江戸", "将軍", "幕府"],
      normal: ["江戸", "将軍", "幕府"],
      hard: ["江", "将", "幕"],
    },
  },
  {
    id: "q16",
    category: "世界史（人物）",
    answer: "織田信長",
    hints: {
      easy: ["戦国", "武将", "本能寺"],
      normal: ["戦国", "武将", "本能"],
      hard: ["戦", "武", "寺"],
    },
  },
  {
    id: "q17",
    category: "世界史（人物）",
    answer: "豊臣秀吉",
    hints: {
      easy: ["戦国", "天下人", "大阪城"],
      normal: ["戦国", "天下", "大阪"],
      hard: ["戦", "天", "阪"],
    },
  },
  {
    id: "q18",
    category: "世界史（人物）",
    answer: "坂本龍馬",
    hints: {
      easy: ["幕末", "志士", "薩長同盟"],
      normal: ["幕末", "志士", "薩長"],
      hard: ["幕", "志", "薩"],
    },
  },
  {
    id: "q19",
    category: "世界史（人物）",
    answer: "西郷隆盛",
    hints: {
      easy: ["薩摩", "西南戦争", "維新"],
      normal: ["薩摩", "西南", "維新"],
      hard: ["薩", "南", "維"],
    },
  },
  {
    id: "q20",
    category: "世界史（人物）",
    answer: "聖徳太子",
    hints: {
      easy: ["飛鳥", "摂政", "十七条"],
      normal: ["飛鳥", "摂政", "憲法"],
      hard: ["飛", "摂", "憲"],
    },
  },
  {
    id: "q21",
    category: "世界史（人物）",
    answer: "マリー・キュリー",
    hints: {
      easy: ["仏蘭西", "科学者", "放射能"],
      normal: ["仏", "学者", "放射"],
      hard: ["仏", "学", "放"],
    },
  },
  {
    id: "q22",
    category: "世界史（人物）",
    answer: "ライト兄弟",
    hints: {
      easy: ["米国", "発明家", "飛行機"],
      normal: ["米", "発明", "飛行"],
      hard: ["米", "発", "飛"],
    },
  },
  {
    id: "q23",
    category: "世界史（人物）",
    answer: "アレクサンダー大王",
    hints: {
      easy: ["希臘", "大王", "大帝国"],
      normal: ["希", "大王", "東征"],
      hard: ["希", "王", "東"],
    },
  },
  {
    id: "q24",
    category: "世界史（人物）",
    answer: "シーザー",
    hints: {
      easy: ["羅馬", "将軍", "独裁官"],
      normal: ["羅", "将軍", "独裁"],
      hard: ["羅", "将", "裁"],
    },
  },
  {
    id: "q25",
    category: "世界史（人物）",
    answer: "マルコ・ポーロ",
    hints: {
      easy: ["伊太利", "旅行家", "東方見聞録"],
      normal: ["伊", "旅人", "東方"],
      hard: ["伊", "旅", "東"],
    },
  },
  {
    id: "q26",
    category: "世界史（人物）",
    answer: "コロンブス",
    hints: {
      easy: ["伊太利", "探検家", "新大陸"],
      normal: ["伊", "探検", "新大陸"],
      hard: ["伊", "探", "新"],
    },
  },
  {
    id: "q27",
    category: "世界史（人物）",
    answer: "マゼラン",
    hints: {
      easy: ["葡萄牙", "航海者", "世界一周"],
      normal: ["葡", "航海", "一周"],
      hard: ["葡", "航", "周"],
    },
  },
  {
    id: "q28",
    category: "世界史（人物）",
    answer: "フローレンス・ナイチンゲール",
    hints: {
      easy: ["英国", "看護師", "白衣天使"],
      normal: ["英", "看護", "白衣"],
      hard: ["英", "看", "白"],
    },
  },
  {
    id: "q29",
    category: "世界史（人物）",
    answer: "ワシントン",
    hints: {
      easy: ["米国", "初代", "大統領"],
      normal: ["米", "初代", "大統領"],
      hard: ["米", "初", "統"],
    },
  },
  {
    id: "q30",
    category: "世界史（人物）",
    answer: "ジャンヌ・ダルク",
    hints: {
      easy: ["仏蘭西", "少女", "百年戦争"],
      normal: ["仏", "少女", "百年"],
      hard: ["仏", "女", "百"],
    },
  },
  {
    id: "q31",
    category: "日本史（人物・出来事）",
    answer: "卑弥呼",
    hints: {
      easy: ["邪馬台", "女王", "魏志倭人伝"],
      normal: ["邪馬", "女王", "魏志"],
      hard: ["邪", "女", "魏"],
    },
  },
  {
    id: "q32",
    category: "日本史（人物・出来事）",
    answer: "源頼朝",
    hints: {
      easy: ["鎌倉", "将軍", "幕府"],
      normal: ["鎌倉", "将軍", "幕府"],
      hard: ["鎌", "将", "幕"],
    },
  },
  {
    id: "q33",
    category: "日本史（人物・出来事）",
    answer: "足利義満",
    hints: {
      easy: ["室町", "将軍", "金閣寺"],
      normal: ["室町", "将軍", "金閣"],
      hard: ["室", "将", "金"],
    },
  },
  {
    id: "q34",
    category: "日本史（人物・出来事）",
    answer: "武田信玄",
    hints: {
      easy: ["甲斐", "武将", "風林火山"],
      normal: ["甲斐", "武将", "風林"],
      hard: ["甲", "武", "風"],
    },
  },
  {
    id: "q35",
    category: "日本史（人物・出来事）",
    answer: "上杉謙信",
    hints: {
      easy: ["越後", "武将", "軍神"],
      normal: ["越後", "武将", "軍神"],
      hard: ["越", "武", "軍"],
    },
  },
  {
    id: "q36",
    category: "日本史（人物・出来事）",
    answer: "伊達政宗",
    hints: {
      easy: ["仙台", "武将", "独眼竜"],
      normal: ["仙台", "武将", "独眼"],
      hard: ["仙", "武", "独"],
    },
  },
  {
    id: "q37",
    category: "日本史（人物・出来事）",
    answer: "石田三成",
    hints: {
      easy: ["戦国", "武将", "関ヶ原"],
      normal: ["戦国", "武将", "関原"],
      hard: ["戦", "武", "関"],
    },
  },
  {
    id: "q38",
    category: "日本史（人物・出来事）",
    answer: "徳川吉宗",
    hints: {
      easy: ["江戸", "将軍", "享保改革"],
      normal: ["江戸", "将軍", "享保"],
      hard: ["江", "将", "享"],
    },
  },
  {
    id: "q39",
    category: "日本史（人物・出来事）",
    answer: "勝海舟",
    hints: {
      easy: ["幕末", "幕臣", "江戸城"],
      normal: ["幕末", "幕臣", "無血"],
      hard: ["幕", "臣", "無"],
    },
  },
  {
    id: "q40",
    category: "日本史（人物・出来事）",
    answer: "新選組",
    hints: {
      easy: ["幕末", "浪士", "池田屋"],
      normal: ["幕末", "浪士", "池田"],
      hard: ["幕", "浪", "池"],
    },
  },
  {
    id: "q41",
    category: "日本史（人物・出来事）",
    answer: "明治維新",
    hints: {
      easy: ["江戸", "改革", "文明開化"],
      normal: ["明治", "改革", "開化"],
      hard: ["明", "改", "開"],
    },
  },
  {
    id: "q42",
    category: "日本史（人物・出来事）",
    answer: "大政奉還",
    hints: {
      easy: ["幕末", "将軍", "政権返上"],
      normal: ["幕末", "将軍", "返上"],
      hard: ["幕", "将", "返"],
    },
  },
  {
    id: "q43",
    category: "日本史（人物・出来事）",
    answer: "関ヶ原の戦い",
    hints: {
      easy: ["戦国", "合戦", "天下分け目"],
      normal: ["戦国", "合戦", "分目"],
      hard: ["戦", "合", "分"],
    },
  },
  {
    id: "q44",
    category: "日本史（人物・出来事）",
    answer: "本能寺の変",
    hints: {
      easy: ["戦国", "謀反", "明智光秀"],
      normal: ["戦国", "謀反", "光秀"],
      hard: ["戦", "謀", "光"],
    },
  },
  {
    id: "q45",
    category: "日本史（人物・出来事）",
    answer: "大化の改新",
    hints: {
      easy: ["飛鳥", "改革", "中臣鎌足"],
      normal: ["飛鳥", "改革", "鎌足"],
      hard: ["飛", "改", "鎌"],
    },
  },
  {
    id: "q46",
    category: "日本史（人物・出来事）",
    answer: "平安京遷都",
    hints: {
      easy: ["京都", "遷都", "桓武天皇"],
      normal: ["京都", "遷都", "桓武"],
      hard: ["京", "遷", "桓"],
    },
  },
  {
    id: "q47",
    category: "日本史（人物・出来事）",
    answer: "廃藩置県",
    hints: {
      easy: ["明治", "改革", "中央集権"],
      normal: ["明治", "改革", "集権"],
      hard: ["明", "改", "集"],
    },
  },
  {
    id: "q48",
    category: "日本史（人物・出来事）",
    answer: "日清戦争",
    hints: {
      easy: ["明治", "戦争", "清国"],
      normal: ["明治", "戦争", "清国"],
      hard: ["明", "戦", "清"],
    },
  },
  {
    id: "q49",
    category: "日本史（人物・出来事）",
    answer: "日露戦争",
    hints: {
      easy: ["明治", "戦争", "露西亜"],
      normal: ["明治", "戦争", "露国"],
      hard: ["明", "戦", "露"],
    },
  },
  {
    id: "q50",
    category: "日本史（人物・出来事）",
    answer: "太平洋戦争",
    hints: {
      easy: ["昭和", "戦争", "真珠湾"],
      normal: ["昭和", "戦争", "真珠"],
      hard: ["昭", "戦", "珠"],
    },
  },
  {
    id: "q51",
    category: "日本史（人物・出来事）",
    answer: "関東大震災",
    hints: {
      easy: ["大正", "震災", "首都圏"],
      normal: ["大正", "震災", "首都"],
      hard: ["大", "震", "首"],
    },
  },
  {
    id: "q52",
    category: "日本史（人物・出来事）",
    answer: "参勤交代",
    hints: {
      easy: ["江戸", "制度", "大名"],
      normal: ["江戸", "制度", "大名"],
      hard: ["江", "制", "大"],
    },
  },
  {
    id: "q53",
    category: "日本史（人物・出来事）",
    answer: "鎖国",
    hints: {
      easy: ["江戸", "政策", "出島"],
      normal: ["江戸", "政策", "出島"],
      hard: ["江", "策", "島"],
    },
  },
  {
    id: "q54",
    category: "日本史（人物・出来事）",
    answer: "蒸気機関車",
    hints: {
      easy: ["明治", "鉄道", "新橋横浜"],
      normal: ["明治", "鉄道", "新橋"],
      hard: ["明", "鉄", "新"],
    },
  },
  {
    id: "q55",
    category: "日本史（人物・出来事）",
    answer: "平将門",
    hints: {
      easy: ["平安", "武将", "新皇"],
      normal: ["平安", "武将", "新皇"],
      hard: ["平", "武", "新"],
    },
  },
  {
    id: "q56",
    category: "日本史（人物・出来事）",
    answer: "源義経",
    hints: {
      easy: ["平安", "武将", "壇ノ浦"],
      normal: ["平安", "武将", "壇浦"],
      hard: ["平", "武", "壇"],
    },
  },
  {
    id: "q57",
    category: "日本史（人物・出来事）",
    answer: "北条政子",
    hints: {
      easy: ["鎌倉", "尼将軍", "御家人"],
      normal: ["鎌倉", "尼将", "御家"],
      hard: ["鎌", "尼", "御"],
    },
  },
  {
    id: "q58",
    category: "日本史（人物・出来事）",
    answer: "後醍醐天皇",
    hints: {
      easy: ["鎌倉", "天皇", "建武新政"],
      normal: ["鎌倉", "天皇", "建武"],
      hard: ["鎌", "帝", "建"],
    },
  },
  {
    id: "q59",
    category: "日本史（人物・出来事）",
    answer: "井伊直弼",
    hints: {
      easy: ["幕末", "大老", "桜田門外"],
      normal: ["幕末", "大老", "桜田"],
      hard: ["幕", "老", "桜"],
    },
  },
  {
    id: "q60",
    category: "日本史（人物・出来事）",
    answer: "福沢諭吉",
    hints: {
      easy: ["明治", "思想家", "学問のすゝめ"],
      normal: ["明治", "学者", "学問"],
      hard: ["明", "学", "問"],
    },
  },
  {
    id: "q61",
    category: "世界の国・地理",
    answer: "エベレスト",
    hints: {
      easy: ["尼泊爾", "山脈", "世界一"],
      normal: ["尼", "高峰", "最高"],
      hard: ["尼", "峰", "高"],
    },
  },
  {
    id: "q62",
    category: "世界の国・地理",
    answer: "ナイル川",
    hints: {
      easy: ["埃及", "河川", "世界一長い"],
      normal: ["埃", "大河", "最長"],
      hard: ["埃", "河", "長"],
    },
  },
  {
    id: "q63",
    category: "世界の国・地理",
    answer: "アマゾン川",
    hints: {
      easy: ["南米", "河川", "熱帯雨林"],
      normal: ["南米", "大河", "密林"],
      hard: ["南", "河", "密"],
    },
  },
  {
    id: "q64",
    category: "世界の国・地理",
    answer: "サハラ砂漠",
    hints: {
      easy: ["阿弗利加", "砂漠", "世界最大級"],
      normal: ["阿", "砂漠", "最大"],
      hard: ["阿", "砂", "大"],
    },
  },
  {
    id: "q65",
    category: "世界の国・地理",
    answer: "グランドキャニオン",
    hints: {
      easy: ["米国", "渓谷", "大峡谷"],
      normal: ["米", "峡谷", "絶景"],
      hard: ["米", "峡", "絶"],
    },
  },
  {
    id: "q66",
    category: "世界の国・地理",
    answer: "ヴィクトリアの滝",
    hints: {
      easy: ["阿弗利加", "滝", "世界三大"],
      normal: ["阿", "大滝", "三大"],
      hard: ["阿", "滝", "三"],
    },
  },
  {
    id: "q67",
    category: "世界の国・地理",
    answer: "ナイアガラの滝",
    hints: {
      easy: ["米国", "滝", "観光地"],
      normal: ["米", "大滝", "観光"],
      hard: ["米", "滝", "光"],
    },
  },
  {
    id: "q68",
    category: "世界の国・地理",
    answer: "ピラミッド",
    hints: {
      easy: ["埃及", "建造物", "古代遺跡"],
      normal: ["埃", "墳墓", "遺跡"],
      hard: ["埃", "墓", "跡"],
    },
  },
  {
    id: "q69",
    category: "世界の国・地理",
    answer: "マチュピチュ",
    hints: {
      easy: ["秘露", "遺跡", "空中都市"],
      normal: ["秘", "遺跡", "空中"],
      hard: ["秘", "跡", "空"],
    },
  },
  {
    id: "q70",
    category: "世界の国・地理",
    answer: "富士山",
    hints: {
      easy: ["静岡", "霊峰", "日本一"],
      normal: ["静岡", "霊峰", "最高"],
      hard: ["静", "峰", "高"],
    },
  },
  {
    id: "q71",
    category: "世界の国・地理",
    answer: "琵琶湖",
    hints: {
      easy: ["滋賀", "湖", "日本最大"],
      normal: ["滋賀", "湖水", "最大"],
      hard: ["滋", "湖", "大"],
    },
  },
  {
    id: "q72",
    category: "世界の国・地理",
    answer: "屋久島",
    hints: {
      easy: ["鹿児島", "島", "縄文杉"],
      normal: ["鹿児", "離島", "縄文"],
      hard: ["鹿", "島", "縄"],
    },
  },
  {
    id: "q73",
    category: "世界の国・地理",
    answer: "エアーズロック",
    hints: {
      easy: ["豪州", "巨岩", "聖地"],
      normal: ["豪", "巨岩", "聖地"],
      hard: ["豪", "岩", "聖"],
    },
  },
  {
    id: "q74",
    category: "世界の国・地理",
    answer: "死海",
    hints: {
      easy: ["中東", "湖", "塩分濃度"],
      normal: ["中東", "塩湖", "浮遊"],
      hard: ["中", "塩", "浮"],
    },
  },
  {
    id: "q75",
    category: "世界の国・地理",
    answer: "氷河",
    hints: {
      easy: ["南極", "氷", "地球温暖化"],
      normal: ["極地", "氷塊", "温暖"],
      hard: ["極", "氷", "温"],
    },
  },
  {
    id: "q76",
    category: "世界の国・地理",
    answer: "赤道",
    hints: {
      easy: ["地球", "緯度", "気候"],
      normal: ["地球", "緯線", "熱帯"],
      hard: ["地", "緯", "熱"],
    },
  },
  {
    id: "q77",
    category: "世界の国・地理",
    answer: "北極点",
    hints: {
      easy: ["北極", "極地", "氷原"],
      normal: ["北極", "極点", "氷原"],
      hard: ["北", "極", "氷"],
    },
  },
  {
    id: "q78",
    category: "世界の国・地理",
    answer: "火山",
    hints: {
      easy: ["地質", "噴火", "マグマ"],
      normal: ["地質", "噴火", "溶岩"],
      hard: ["地", "噴", "岩"],
    },
  },
  {
    id: "q79",
    category: "世界の国・地理",
    answer: "地震",
    hints: {
      easy: ["地質", "揺れ", "プレート"],
      normal: ["地質", "震動", "断層"],
      hard: ["地", "震", "断"],
    },
  },
  {
    id: "q80",
    category: "世界の国・地理",
    answer: "台風",
    hints: {
      easy: ["気象", "暴風雨", "熱帯低気圧"],
      normal: ["気象", "暴風", "低気圧"],
      hard: ["気", "風", "低"],
    },
  },
  {
    id: "q81",
    category: "世界の国・地理",
    answer: "梅雨",
    hints: {
      easy: ["気象", "長雨", "季節"],
      normal: ["気象", "長雨", "季節"],
      hard: ["気", "雨", "季"],
    },
  },
  {
    id: "q82",
    category: "世界の国・地理",
    answer: "富士五湖",
    hints: {
      easy: ["山梨", "湖", "富士山麓"],
      normal: ["山梨", "湖群", "山麓"],
      hard: ["山", "湖", "麓"],
    },
  },
  {
    id: "q83",
    category: "世界の国・地理",
    answer: "北海道",
    hints: {
      easy: ["日本", "道", "流氷"],
      normal: ["北海", "広大", "流氷"],
      hard: ["北", "広", "氷"],
    },
  },
  {
    id: "q84",
    category: "世界の国・地理",
    answer: "沖縄",
    hints: {
      easy: ["日本", "県", "珊瑚礁"],
      normal: ["沖縄", "南国", "珊瑚"],
      hard: ["沖", "南", "珊"],
    },
  },
  {
    id: "q85",
    category: "世界の国・地理",
    answer: "グレートバリアリーフ",
    hints: {
      easy: ["豪州", "珊瑚礁", "世界最大"],
      normal: ["豪", "珊瑚", "最大"],
      hard: ["豪", "礁", "大"],
    },
  },
  {
    id: "q86",
    category: "化学",
    answer: "酸素",
    hints: {
      easy: ["気体", "元素", "呼吸"],
      normal: ["気体", "元素", "呼吸"],
      hard: ["気", "元", "呼"],
    },
  },
  {
    id: "q87",
    category: "化学",
    answer: "水素",
    hints: {
      easy: ["気体", "元素", "最も軽い"],
      normal: ["気体", "元素", "最軽"],
      hard: ["気", "元", "軽"],
    },
  },
  {
    id: "q88",
    category: "化学",
    answer: "炭素",
    hints: {
      easy: ["元素", "黒鉛", "ダイヤモンド"],
      normal: ["元素", "黒鉛", "宝石"],
      hard: ["元", "黒", "宝"],
    },
  },
  {
    id: "q89",
    category: "化学",
    answer: "窒素",
    hints: {
      easy: ["気体", "元素", "大気の約8割"],
      normal: ["気体", "元素", "大気"],
      hard: ["気", "元", "大"],
    },
  },
  {
    id: "q90",
    category: "化学",
    answer: "金",
    hints: {
      easy: ["金属", "元素", "貴金属"],
      normal: ["金属", "元素", "貴重"],
      hard: ["金", "元", "貴"],
    },
  },
  {
    id: "q91",
    category: "化学",
    answer: "鉄",
    hints: {
      easy: ["金属", "元素", "磁石"],
      normal: ["金属", "元素", "磁性"],
      hard: ["金", "元", "磁"],
    },
  },
  {
    id: "q92",
    category: "化学",
    answer: "水",
    hints: {
      easy: ["液体", "化合物", "生命の源"],
      normal: ["液体", "化合物", "生命"],
      hard: ["液", "化", "命"],
    },
  },
  {
    id: "q93",
    category: "化学",
    answer: "二酸化炭素",
    hints: {
      easy: ["気体", "化合物", "温室効果"],
      normal: ["気体", "化合物", "温暖"],
      hard: ["気", "化", "暖"],
    },
  },
  {
    id: "q94",
    category: "化学",
    answer: "塩",
    hints: {
      easy: ["調味料", "化合物", "塩化ナトリウム"],
      normal: ["調味", "化合", "結晶"],
      hard: ["調", "化", "結"],
    },
  },
  {
    id: "q95",
    category: "化学",
    answer: "周期表",
    hints: {
      easy: ["化学", "表", "元素一覧"],
      normal: ["化学", "表", "元素"],
      hard: ["化", "表", "元"],
    },
  },
  {
    id: "q96",
    category: "化学",
    answer: "原子",
    hints: {
      easy: ["化学", "粒子", "物質の最小単位"],
      normal: ["化学", "粒子", "最小"],
      hard: ["化", "粒", "小"],
    },
  },
  {
    id: "q97",
    category: "化学",
    answer: "分子",
    hints: {
      easy: ["化学", "粒子", "原子の集まり"],
      normal: ["化学", "粒子", "集合"],
      hard: ["化", "粒", "集"],
    },
  },
  {
    id: "q98",
    category: "化学",
    answer: "イオン",
    hints: {
      easy: ["化学", "粒子", "電気を帯びる"],
      normal: ["化学", "粒子", "帯電"],
      hard: ["化", "粒", "電"],
    },
  },
  {
    id: "q99",
    category: "化学",
    answer: "酸性",
    hints: {
      easy: ["化学", "性質", "リトマス試験紙"],
      normal: ["化学", "性質", "リトマス"],
      hard: ["化", "性", "試"],
    },
  },
  {
    id: "q100",
    category: "化学",
    answer: "アルカリ性",
    hints: {
      easy: ["化学", "性質", "石鹸"],
      normal: ["化学", "性質", "石鹸"],
      hard: ["化", "性", "鹸"],
    },
  },
  {
    id: "q101",
    category: "化学",
    answer: "触媒",
    hints: {
      easy: ["化学", "反応", "促進する物質"],
      normal: ["化学", "反応", "促進"],
      hard: ["化", "反", "促"],
    },
  },
  {
    id: "q102",
    category: "化学",
    answer: "核融合",
    hints: {
      easy: ["物理", "反応", "太陽のエネルギー"],
      normal: ["物理", "反応", "太陽"],
      hard: ["物", "反", "陽"],
    },
  },
  {
    id: "q103",
    category: "化学",
    answer: "放射能",
    hints: {
      easy: ["物理", "現象", "キュリー夫人"],
      normal: ["物理", "現象", "崩壊"],
      hard: ["物", "現", "崩"],
    },
  },
  {
    id: "q104",
    category: "化学",
    answer: "石油",
    hints: {
      easy: ["資源", "燃料", "化石燃料"],
      normal: ["資源", "燃料", "化石"],
      hard: ["資", "燃", "化"],
    },
  },
  {
    id: "q105",
    category: "化学",
    answer: "プラスチック",
    hints: {
      easy: ["化学", "製品", "高分子"],
      normal: ["化学", "製品", "合成"],
      hard: ["化", "製", "合"],
    },
  },
  {
    id: "q106",
    category: "化学",
    answer: "DNA",
    hints: {
      easy: ["生物", "物質", "遺伝情報"],
      normal: ["生物", "物質", "遺伝"],
      hard: ["生", "物", "遺"],
    },
  },
  {
    id: "q107",
    category: "化学",
    answer: "メンデレーエフ",
    hints: {
      easy: ["露西亜", "化学者", "周期表"],
      normal: ["露", "学者", "周期"],
      hard: ["露", "学", "周"],
    },
  },
  {
    id: "q108",
    category: "化学",
    answer: "ノーベル",
    hints: {
      easy: ["瑞典", "科学者", "ダイナマイト"],
      normal: ["瑞", "学者", "爆薬"],
      hard: ["瑞", "学", "爆"],
    },
  },
  {
    id: "q109",
    category: "化学",
    answer: "フラーレン",
    hints: {
      easy: ["化学", "物質", "炭素の同素体"],
      normal: ["化学", "物質", "同素体"],
      hard: ["化", "物", "炭"],
    },
  },
  {
    id: "q110",
    category: "化学",
    answer: "燃焼",
    hints: {
      easy: ["化学", "反応", "酸素と反応"],
      normal: ["化学", "反応", "酸化"],
      hard: ["化", "反", "酸"],
    },
  },
  {
    id: "q111",
    category: "物理",
    answer: "万有引力",
    hints: {
      easy: ["物理", "法則", "リンゴ"],
      normal: ["物理", "法則", "林檎"],
      hard: ["物", "則", "林"],
    },
  },
  {
    id: "q112",
    category: "物理",
    answer: "相対性理論",
    hints: {
      easy: ["物理", "理論", "時間と空間"],
      normal: ["物理", "理論", "時空"],
      hard: ["物", "論", "時"],
    },
  },
  {
    id: "q113",
    category: "物理",
    answer: "光の速さ",
    hints: {
      easy: ["物理", "速度", "秒速30万キロ"],
      normal: ["物理", "速度", "光速"],
      hard: ["物", "速", "光"],
    },
  },
  {
    id: "q114",
    category: "物理",
    answer: "重力",
    hints: {
      easy: ["物理", "力", "地球が引く力"],
      normal: ["物理", "力", "引力"],
      hard: ["物", "力", "引"],
    },
  },
  {
    id: "q115",
    category: "物理",
    answer: "電気",
    hints: {
      easy: ["物理", "エネルギー", "雷"],
      normal: ["物理", "電力", "雷"],
      hard: ["物", "電", "雷"],
    },
  },
  {
    id: "q116",
    category: "物理",
    answer: "磁石",
    hints: {
      easy: ["物理", "道具", "N極S極"],
      normal: ["物理", "磁力", "極性"],
      hard: ["物", "磁", "極"],
    },
  },
  {
    id: "q117",
    category: "物理",
    answer: "音速",
    hints: {
      easy: ["物理", "速度", "マッハ"],
      normal: ["物理", "速度", "マッハ"],
      hard: ["物", "速", "音"],
    },
  },
  {
    id: "q118",
    category: "物理",
    answer: "慣性の法則",
    hints: {
      easy: ["物理", "法則", "運動の第一法則"],
      normal: ["物理", "法則", "慣性"],
      hard: ["物", "則", "慣"],
    },
  },
  {
    id: "q119",
    category: "物理",
    answer: "摩擦",
    hints: {
      easy: ["物理", "現象", "滑りにくさ"],
      normal: ["物理", "現象", "抵抗"],
      hard: ["物", "現", "抵"],
    },
  },
  {
    id: "q120",
    category: "物理",
    answer: "浮力",
    hints: {
      easy: ["物理", "力", "水に浮く"],
      normal: ["物理", "力", "浮遊"],
      hard: ["物", "力", "浮"],
    },
  },
  {
    id: "q121",
    category: "物理",
    answer: "原子力発電",
    hints: {
      easy: ["物理", "発電", "核分裂"],
      normal: ["物理", "発電", "核分裂"],
      hard: ["物", "発", "核"],
    },
  },
  {
    id: "q122",
    category: "物理",
    answer: "量子力学",
    hints: {
      easy: ["物理", "理論", "ミクロの世界"],
      normal: ["物理", "理論", "量子"],
      hard: ["物", "論", "量"],
    },
  },
  {
    id: "q123",
    category: "物理",
    answer: "ブラックホール",
    hints: {
      easy: ["宇宙", "天体", "光も出られない"],
      normal: ["宇宙", "天体", "重力"],
      hard: ["宇", "体", "重"],
    },
  },
  {
    id: "q124",
    category: "物理",
    answer: "虹",
    hints: {
      easy: ["物理", "現象", "七色"],
      normal: ["物理", "現象", "七色"],
      hard: ["物", "現", "七"],
    },
  },
  {
    id: "q125",
    category: "物理",
    answer: "静電気",
    hints: {
      easy: ["物理", "現象", "冬にパチッ"],
      normal: ["物理", "現象", "帯電"],
      hard: ["物", "現", "帯"],
    },
  },
  {
    id: "q126",
    category: "物理",
    answer: "レーザー",
    hints: {
      easy: ["物理", "光", "直進する光"],
      normal: ["物理", "光", "直進"],
      hard: ["物", "光", "直"],
    },
  },
  {
    id: "q127",
    category: "物理",
    answer: "超伝導",
    hints: {
      easy: ["物理", "現象", "電気抵抗ゼロ"],
      normal: ["物理", "現象", "抵抗零"],
      hard: ["物", "現", "零"],
    },
  },
  {
    id: "q128",
    category: "物理",
    answer: "気圧",
    hints: {
      easy: ["物理", "圧力", "大気の重さ"],
      normal: ["物理", "圧力", "大気"],
      hard: ["物", "圧", "大"],
    },
  },
  {
    id: "q129",
    category: "物理",
    answer: "熱伝導",
    hints: {
      easy: ["物理", "現象", "熱の伝わり方"],
      normal: ["物理", "現象", "熱移動"],
      hard: ["物", "現", "熱"],
    },
  },
  {
    id: "q130",
    category: "物理",
    answer: "振り子",
    hints: {
      easy: ["物理", "運動", "等時性"],
      normal: ["物理", "運動", "等時"],
      hard: ["物", "動", "等"],
    },
  },
  {
    id: "q131",
    category: "物理",
    answer: "アルキメデスの原理",
    hints: {
      easy: ["希臘", "科学者", "浮力の原理"],
      normal: ["希", "学者", "浮力"],
      hard: ["希", "学", "浮"],
    },
  },
  {
    id: "q132",
    category: "物理",
    answer: "エジソンの電球",
    hints: {
      easy: ["米国", "発明", "フィラメント"],
      normal: ["米", "発明", "電球"],
      hard: ["米", "発", "電"],
    },
  },
  {
    id: "q133",
    category: "物理",
    answer: "テスラ",
    hints: {
      easy: ["塞尓維亜", "科学者", "交流電流"],
      normal: ["塞", "学者", "交流"],
      hard: ["塞", "学", "交"],
    },
  },
  {
    id: "q134",
    category: "物理",
    answer: "ホーキング",
    hints: {
      easy: ["英国", "物理学者", "宇宙論"],
      normal: ["英", "学者", "宇宙"],
      hard: ["英", "学", "宇"],
    },
  },
  {
    id: "q135",
    category: "物理",
    answer: "核分裂",
    hints: {
      easy: ["物理", "反応", "原子爆弾"],
      normal: ["物理", "反応", "原爆"],
      hard: ["物", "反", "爆"],
    },
  },
  {
    id: "q136",
    category: "生物",
    answer: "DNAの二重らせん",
    hints: {
      easy: ["生物", "構造", "ワトソンとクリック"],
      normal: ["生物", "構造", "二重"],
      hard: ["生", "構", "二"],
    },
  },
  {
    id: "q137",
    category: "生物",
    answer: "光合成",
    hints: {
      easy: ["植物", "作用", "二酸化炭素と水"],
      normal: ["植物", "作用", "酸素"],
      hard: ["植", "作", "酸"],
    },
  },
  {
    id: "q138",
    category: "生物",
    answer: "進化論",
    hints: {
      easy: ["生物", "理論", "自然選択"],
      normal: ["生物", "理論", "選択"],
      hard: ["生", "論", "選"],
    },
  },
  {
    id: "q139",
    category: "生物",
    answer: "細胞",
    hints: {
      easy: ["生物", "単位", "生命の基本"],
      normal: ["生物", "単位", "基本"],
      hard: ["生", "単", "基"],
    },
  },
  {
    id: "q140",
    category: "生物",
    answer: "遺伝子",
    hints: {
      easy: ["生物", "情報", "親から子へ"],
      normal: ["生物", "情報", "継承"],
      hard: ["生", "情", "継"],
    },
  },
  {
    id: "q141",
    category: "生物",
    answer: "血液型",
    hints: {
      easy: ["人体", "分類", "A型B型"],
      normal: ["人体", "分類", "型式"],
      hard: ["人", "分", "型"],
    },
  },
  {
    id: "q142",
    category: "生物",
    answer: "心臓",
    hints: {
      easy: ["人体", "臓器", "血液を送る"],
      normal: ["人体", "臓器", "循環"],
      hard: ["人", "臓", "循"],
    },
  },
  {
    id: "q143",
    category: "生物",
    answer: "脳",
    hints: {
      easy: ["人体", "臓器", "思考する"],
      normal: ["人体", "臓器", "思考"],
      hard: ["人", "臓", "思"],
    },
  },
  {
    id: "q144",
    category: "生物",
    answer: "免疫",
    hints: {
      easy: ["人体", "機能", "ウイルスと戦う"],
      normal: ["人体", "機能", "防御"],
      hard: ["人", "機", "防"],
    },
  },
  {
    id: "q145",
    category: "生物",
    answer: "酵素",
    hints: {
      easy: ["生物", "物質", "消化を助ける"],
      normal: ["生物", "物質", "消化"],
      hard: ["生", "物", "消"],
    },
  },
  {
    id: "q146",
    category: "生物",
    answer: "冬眠",
    hints: {
      easy: ["動物", "習性", "熊"],
      normal: ["動物", "習性", "越冬"],
      hard: ["動", "習", "越"],
    },
  },
  {
    id: "q147",
    category: "生物",
    answer: "擬態",
    hints: {
      easy: ["動物", "能力", "周囲に似る"],
      normal: ["動物", "能力", "擬態"],
      hard: ["動", "能", "似"],
    },
  },
  {
    id: "q148",
    category: "生物",
    answer: "共生",
    hints: {
      easy: ["生物", "関係", "助け合い"],
      normal: ["生物", "関係", "助合"],
      hard: ["生", "関", "助"],
    },
  },
  {
    id: "q149",
    category: "生物",
    answer: "絶滅",
    hints: {
      easy: ["生物", "現象", "恐竜"],
      normal: ["生物", "現象", "消滅"],
      hard: ["生", "現", "消"],
    },
  },
  {
    id: "q150",
    category: "生物",
    answer: "遺伝",
    hints: {
      easy: ["生物", "現象", "親子の特徴"],
      normal: ["生物", "現象", "継承"],
      hard: ["生", "現", "継"],
    },
  },
  {
    id: "q151",
    category: "生物",
    answer: "メンデルの法則",
    hints: {
      easy: ["墺太利", "学者", "遺伝の法則"],
      normal: ["墺", "学者", "遺伝"],
      hard: ["墺", "学", "遺"],
    },
  },
  {
    id: "q152",
    category: "生物",
    answer: "パスツール",
    hints: {
      easy: ["仏蘭西", "学者", "低温殺菌"],
      normal: ["仏", "学者", "殺菌"],
      hard: ["仏", "学", "殺"],
    },
  },
  {
    id: "q153",
    category: "生物",
    answer: "ダーウィンフィンチ",
    hints: {
      easy: ["南米", "鳥", "進化の証拠"],
      normal: ["南米", "鳥", "進化"],
      hard: ["南", "鳥", "進"],
    },
  },
  {
    id: "q154",
    category: "生物",
    answer: "光合成細菌",
    hints: {
      easy: ["微生物", "生物", "太古の地球"],
      normal: ["微生", "生物", "太古"],
      hard: ["微", "生", "古"],
    },
  },
  {
    id: "q155",
    category: "生物",
    answer: "iPS細胞",
    hints: {
      easy: ["日本", "医学", "山中伸弥"],
      normal: ["日本", "医学", "万能"],
      hard: ["日", "医", "万"],
    },
  },
  {
    id: "q156",
    category: "天文・宇宙",
    answer: "太陽",
    hints: {
      easy: ["宇宙", "恒星", "地球のエネルギー源"],
      normal: ["宇宙", "恒星", "熱源"],
      hard: ["宇", "星", "熱"],
    },
  },
  {
    id: "q157",
    category: "天文・宇宙",
    answer: "月",
    hints: {
      easy: ["宇宙", "衛星", "地球の衛星"],
      normal: ["宇宙", "衛星", "満ち欠け"],
      hard: ["宇", "星", "欠"],
    },
  },
  {
    id: "q158",
    category: "天文・宇宙",
    answer: "火星",
    hints: {
      easy: ["宇宙", "惑星", "赤い星"],
      normal: ["宇宙", "惑星", "赤色"],
      hard: ["宇", "星", "赤"],
    },
  },
  {
    id: "q159",
    category: "天文・宇宙",
    answer: "木星",
    hints: {
      easy: ["宇宙", "惑星", "太陽系最大"],
      normal: ["宇宙", "惑星", "最大"],
      hard: ["宇", "星", "大"],
    },
  },
  {
    id: "q160",
    category: "天文・宇宙",
    answer: "土星",
    hints: {
      easy: ["宇宙", "惑星", "輪がある"],
      normal: ["宇宙", "惑星", "環"],
      hard: ["宇", "星", "環"],
    },
  },
  {
    id: "q161",
    category: "天文・宇宙",
    answer: "銀河系",
    hints: {
      easy: ["宇宙", "天体", "天の川"],
      normal: ["宇宙", "天体", "天の川"],
      hard: ["宇", "体", "川"],
    },
  },
  {
    id: "q162",
    category: "天文・宇宙",
    answer: "ビッグバン",
    hints: {
      easy: ["宇宙", "理論", "宇宙の始まり"],
      normal: ["宇宙", "理論", "誕生"],
      hard: ["宇", "論", "誕"],
    },
  },
  {
    id: "q163",
    category: "天文・宇宙",
    answer: "彗星",
    hints: {
      easy: ["宇宙", "天体", "ハレー"],
      normal: ["宇宙", "天体", "尾"],
      hard: ["宇", "体", "尾"],
    },
  },
  {
    id: "q164",
    category: "天文・宇宙",
    answer: "流星",
    hints: {
      easy: ["宇宙", "現象", "流れ星"],
      normal: ["宇宙", "現象", "流星"],
      hard: ["宇", "現", "流"],
    },
  },
  {
    id: "q165",
    category: "天文・宇宙",
    answer: "日食",
    hints: {
      easy: ["天文", "現象", "太陽が隠れる"],
      normal: ["天文", "現象", "太陽隠"],
      hard: ["天", "現", "隠"],
    },
  },
  {
    id: "q166",
    category: "天文・宇宙",
    answer: "皆既月食",
    hints: {
      easy: ["天文", "現象", "赤い月"],
      normal: ["天文", "現象", "赤月"],
      hard: ["天", "現", "赤"],
    },
  },
  {
    id: "q167",
    category: "天文・宇宙",
    answer: "宇宙飛行士",
    hints: {
      easy: ["宇宙", "職業", "ロケット"],
      normal: ["宇宙", "職業", "飛行"],
      hard: ["宇", "職", "飛"],
    },
  },
  {
    id: "q168",
    category: "天文・宇宙",
    answer: "アポロ11号",
    hints: {
      easy: ["米国", "宇宙船", "月面着陸"],
      normal: ["米", "宇宙", "着陸"],
      hard: ["米", "宇", "着"],
    },
  },
  {
    id: "q169",
    category: "天文・宇宙",
    answer: "ガリレオ衛星",
    hints: {
      easy: ["木星", "衛星", "四大衛星"],
      normal: ["木星", "衛星", "四大"],
      hard: ["木", "星", "四"],
    },
  },
  {
    id: "q170",
    category: "天文・宇宙",
    answer: "北極星",
    hints: {
      easy: ["天文", "星", "方角の目印"],
      normal: ["天文", "星", "方角"],
      hard: ["天", "星", "方"],
    },
  },
  {
    id: "q171",
    category: "数学",
    answer: "円周率",
    hints: {
      easy: ["数学", "定数", "3.14"],
      normal: ["数学", "定数", "円周"],
      hard: ["数", "定", "円"],
    },
  },
  {
    id: "q172",
    category: "数学",
    answer: "ピタゴラスの定理",
    hints: {
      easy: ["希臘", "数学", "三平方の定理"],
      normal: ["希", "数学", "三平方"],
      hard: ["希", "数", "方"],
    },
  },
  {
    id: "q173",
    category: "数学",
    answer: "フィボナッチ数列",
    hints: {
      easy: ["伊太利", "数学", "自然界の法則"],
      normal: ["伊", "数列", "自然"],
      hard: ["伊", "列", "自"],
    },
  },
  {
    id: "q174",
    category: "数学",
    answer: "ゼロ",
    hints: {
      easy: ["数学", "数字", "インド起源"],
      normal: ["数学", "数字", "起源"],
      hard: ["数", "字", "起"],
    },
  },
  {
    id: "q175",
    category: "数学",
    answer: "素数",
    hints: {
      easy: ["数学", "数字", "1と自分でしか割れない"],
      normal: ["数学", "数字", "独自"],
      hard: ["数", "字", "独"],
    },
  },
  {
    id: "q176",
    category: "数学",
    answer: "方程式",
    hints: {
      easy: ["数学", "式", "未知数"],
      normal: ["数学", "式", "未知"],
      hard: ["数", "式", "未"],
    },
  },
  {
    id: "q177",
    category: "数学",
    answer: "虚数",
    hints: {
      easy: ["数学", "数字", "二乗すると負"],
      normal: ["数学", "数字", "負数"],
      hard: ["数", "字", "負"],
    },
  },
  {
    id: "q178",
    category: "数学",
    answer: "確率",
    hints: {
      easy: ["数学", "概念", "サイコロ"],
      normal: ["数学", "概念", "賭事"],
      hard: ["数", "念", "賭"],
    },
  },
  {
    id: "q179",
    category: "数学",
    answer: "フェルマーの最終定理",
    hints: {
      easy: ["仏蘭西", "数学", "360年の謎"],
      normal: ["仏", "数学", "難問"],
      hard: ["仏", "数", "謎"],
    },
  },
  {
    id: "q180",
    category: "数学",
    answer: "アルキメデス",
    hints: {
      easy: ["希臘", "数学者", "円周率"],
      normal: ["希", "数学", "円周"],
      hard: ["希", "数", "円"],
    },
  },
  {
    id: "q181",
    category: "文学作品",
    answer: "源氏物語",
    hints: {
      easy: ["平安", "小説", "紫式部"],
      normal: ["平安", "小説", "紫式部"],
      hard: ["平", "小", "紫"],
    },
  },
  {
    id: "q182",
    category: "文学作品",
    answer: "吾輩は猫である",
    hints: {
      easy: ["明治", "小説", "夏目漱石"],
      normal: ["明治", "小説", "漱石"],
      hard: ["明", "小", "漱"],
    },
  },
  {
    id: "q183",
    category: "文学作品",
    answer: "走れメロス",
    hints: {
      easy: ["昭和", "小説", "太宰治"],
      normal: ["昭和", "小説", "太宰"],
      hard: ["昭", "小", "太"],
    },
  },
  {
    id: "q184",
    category: "文学作品",
    answer: "坊っちゃん",
    hints: {
      easy: ["明治", "小説", "夏目漱石"],
      normal: ["明治", "小説", "漱石"],
      hard: ["明", "小", "漱"],
    },
  },
  {
    id: "q185",
    category: "文学作品",
    answer: "羅生門",
    hints: {
      easy: ["大正", "小説", "芥川龍之介"],
      normal: ["大正", "小説", "芥川"],
      hard: ["大", "小", "芥"],
    },
  },
  {
    id: "q186",
    category: "文学作品",
    answer: "シェイクスピア",
    hints: {
      easy: ["英国", "劇作家", "ロミオとジュリエット"],
      normal: ["英", "劇作", "恋愛"],
      hard: ["英", "劇", "恋"],
    },
  },
  {
    id: "q187",
    category: "文学作品",
    answer: "ハムレット",
    hints: {
      easy: ["英国", "戯曲", "シェイクスピア"],
      normal: ["英", "戯曲", "悲劇"],
      hard: ["英", "戯", "悲"],
    },
  },
  {
    id: "q188",
    category: "文学作品",
    answer: "罪と罰",
    hints: {
      easy: ["露西亜", "小説", "ドストエフスキー"],
      normal: ["露", "小説", "殺人"],
      hard: ["露", "小", "殺"],
    },
  },
  {
    id: "q189",
    category: "文学作品",
    answer: "レ・ミゼラブル",
    hints: {
      easy: ["仏蘭西", "小説", "ユゴー"],
      normal: ["仏", "小説", "革命"],
      hard: ["仏", "小", "革"],
    },
  },
  {
    id: "q190",
    category: "文学作品",
    answer: "星の王子さま",
    hints: {
      easy: ["仏蘭西", "童話", "サン＝テグジュペリ"],
      normal: ["仏", "童話", "王子"],
      hard: ["仏", "話", "王"],
    },
  },
  {
    id: "q191",
    category: "文学作品",
    answer: "アルプスの少女ハイジ",
    hints: {
      easy: ["瑞西", "童話", "少女"],
      normal: ["瑞", "童話", "少女"],
      hard: ["瑞", "話", "少"],
    },
  },
  {
    id: "q192",
    category: "文学作品",
    answer: "赤毛のアン",
    hints: {
      easy: ["加奈陀", "小説", "孤児の少女"],
      normal: ["加", "小説", "孤児"],
      hard: ["加", "小", "孤"],
    },
  },
  {
    id: "q193",
    category: "文学作品",
    answer: "グリム童話",
    hints: {
      easy: ["独逸", "童話", "シンデレラ"],
      normal: ["独", "童話", "魔法"],
      hard: ["独", "話", "魔"],
    },
  },
  {
    id: "q194",
    category: "文学作品",
    answer: "ドン・キホーテ",
    hints: {
      easy: ["西班牙", "小説", "騎士道"],
      normal: ["西", "小説", "騎士"],
      hard: ["西", "小", "騎"],
    },
  },
  {
    id: "q195",
    category: "文学作品",
    answer: "神曲",
    hints: {
      easy: ["伊太利", "叙事詩", "ダンテ"],
      normal: ["伊", "叙詩", "地獄"],
      hard: ["伊", "詩", "獄"],
    },
  },
  {
    id: "q196",
    category: "音楽",
    answer: "ベートーヴェン",
    hints: {
      easy: ["独逸", "作曲家", "交響曲"],
      normal: ["独", "音楽", "交響"],
      hard: ["独", "音", "響"],
    },
  },
  {
    id: "q197",
    category: "音楽",
    answer: "モーツァルト",
    hints: {
      easy: ["墺太利", "作曲家", "神童"],
      normal: ["墺", "音楽", "神童"],
      hard: ["墺", "音", "神"],
    },
  },
  {
    id: "q198",
    category: "音楽",
    answer: "バッハ",
    hints: {
      easy: ["独逸", "作曲家", "音楽の父"],
      normal: ["独", "音楽", "父"],
      hard: ["独", "音", "父"],
    },
  },
  {
    id: "q199",
    category: "音楽",
    answer: "ショパン",
    hints: {
      easy: ["波蘭", "作曲家", "ピアノの詩人"],
      normal: ["波", "音楽", "詩人"],
      hard: ["波", "音", "詩"],
    },
  },
  {
    id: "q200",
    category: "音楽",
    answer: "チャイコフスキー",
    hints: {
      easy: ["露西亜", "作曲家", "白鳥の湖"],
      normal: ["露", "音楽", "白鳥"],
      hard: ["露", "音", "白"],
    },
  },
  {
    id: "q201",
    category: "音楽",
    answer: "第九",
    hints: {
      easy: ["独逸", "交響曲", "年末に演奏"],
      normal: ["独", "楽曲", "年末"],
      hard: ["独", "楽", "末"],
    },
  },
  {
    id: "q202",
    category: "音楽",
    answer: "ピアノ",
    hints: {
      easy: ["楽器", "鍵盤", "88鍵"],
      normal: ["楽器", "鍵盤", "黒白"],
      hard: ["楽", "鍵", "黒"],
    },
  },
  {
    id: "q203",
    category: "音楽",
    answer: "バイオリン",
    hints: {
      easy: ["楽器", "弦楽器", "四本の弦"],
      normal: ["楽器", "弦楽", "四弦"],
      hard: ["楽", "弦", "四"],
    },
  },
  {
    id: "q204",
    category: "音楽",
    answer: "オペラ",
    hints: {
      easy: ["伊太利", "音楽劇", "歌う演劇"],
      normal: ["伊", "音楽", "歌劇"],
      hard: ["伊", "音", "歌"],
    },
  },
  {
    id: "q205",
    category: "音楽",
    answer: "交響曲",
    hints: {
      easy: ["音楽", "楽曲", "オーケストラ"],
      normal: ["音楽", "楽曲", "管弦"],
      hard: ["音", "楽", "管"],
    },
  },
  {
    id: "q206",
    category: "音楽",
    answer: "国歌",
    hints: {
      easy: ["音楽", "曲", "国を象徴"],
      normal: ["音楽", "楽曲", "象徴"],
      hard: ["音", "曲", "象"],
    },
  },
  {
    id: "q207",
    category: "音楽",
    answer: "ジャズ",
    hints: {
      easy: ["米国", "音楽", "即興演奏"],
      normal: ["米", "音楽", "即興"],
      hard: ["米", "音", "即"],
    },
  },
  {
    id: "q208",
    category: "音楽",
    answer: "フラメンコ",
    hints: {
      easy: ["西班牙", "音楽舞踊", "情熱的"],
      normal: ["西", "舞踊", "情熱"],
      hard: ["西", "舞", "熱"],
    },
  },
  {
    id: "q209",
    category: "音楽",
    answer: "タンゴ",
    hints: {
      easy: ["亜爾然丁", "音楽舞踊", "情熱の踊り"],
      normal: ["亜", "舞踊", "情熱"],
      hard: ["亜", "舞", "熱"],
    },
  },
  {
    id: "q210",
    category: "音楽",
    answer: "校歌",
    hints: {
      easy: ["音楽", "曲", "学校を象徴"],
      normal: ["音楽", "楽曲", "学校"],
      hard: ["音", "曲", "学"],
    },
  },
  {
    id: "q211",
    category: "美術",
    answer: "モナ・リザ",
    hints: {
      easy: ["伊太利", "絵画", "レオナルド"],
      normal: ["伊", "絵画", "微笑"],
      hard: ["伊", "絵", "笑"],
    },
  },
  {
    id: "q212",
    category: "美術",
    answer: "ひまわり",
    hints: {
      easy: ["阿蘭陀", "絵画", "ゴッホ"],
      normal: ["蘭", "絵画", "黄色"],
      hard: ["蘭", "絵", "黄"],
    },
  },
  {
    id: "q213",
    category: "美術",
    answer: "叫び",
    hints: {
      easy: ["諾威", "絵画", "ムンク"],
      normal: ["諾", "絵画", "不安"],
      hard: ["諾", "絵", "不"],
    },
  },
  {
    id: "q214",
    category: "美術",
    answer: "最後の晩餐",
    hints: {
      easy: ["伊太利", "絵画", "レオナルド"],
      normal: ["伊", "絵画", "宗教"],
      hard: ["伊", "絵", "宗"],
    },
  },
  {
    id: "q215",
    category: "美術",
    answer: "真珠の耳飾りの少女",
    hints: {
      easy: ["阿蘭陀", "絵画", "フェルメール"],
      normal: ["蘭", "絵画", "少女"],
      hard: ["蘭", "絵", "少"],
    },
  },
  {
    id: "q216",
    category: "美術",
    answer: "民衆を導く自由の女神",
    hints: {
      easy: ["仏蘭西", "絵画", "革命"],
      normal: ["仏", "絵画", "革命"],
      hard: ["仏", "絵", "革"],
    },
  },
  {
    id: "q217",
    category: "美術",
    answer: "夜警",
    hints: {
      easy: ["阿蘭陀", "絵画", "レンブラント"],
      normal: ["蘭", "絵画", "集団"],
      hard: ["蘭", "絵", "集"],
    },
  },
  {
    id: "q218",
    category: "美術",
    answer: "ミロのヴィーナス",
    hints: {
      easy: ["希臘", "彫刻", "腕がない"],
      normal: ["希", "彫刻", "美女"],
      hard: ["希", "彫", "美"],
    },
  },
  {
    id: "q219",
    category: "美術",
    answer: "考える人",
    hints: {
      easy: ["仏蘭西", "彫刻", "ロダン"],
      normal: ["仏", "彫刻", "思考"],
      hard: ["仏", "彫", "思"],
    },
  },
  {
    id: "q220",
    category: "美術",
    answer: "システィーナ礼拝堂",
    hints: {
      easy: ["伊太利", "天井画", "ミケランジェロ"],
      normal: ["伊", "天井", "宗教"],
      hard: ["伊", "画", "宗"],
    },
  },
  {
    id: "q221",
    category: "美術",
    answer: "印象派",
    hints: {
      easy: ["仏蘭西", "美術", "モネ"],
      normal: ["仏", "美術", "光"],
      hard: ["仏", "術", "光"],
    },
  },
  {
    id: "q222",
    category: "美術",
    answer: "浮世絵",
    hints: {
      easy: ["江戸", "絵画", "版画"],
      normal: ["江戸", "絵画", "版画"],
      hard: ["江", "絵", "版"],
    },
  },
  {
    id: "q223",
    category: "美術",
    answer: "葛飾北斎",
    hints: {
      easy: ["江戸", "浮世絵師", "富嶽三十六景"],
      normal: ["江戸", "絵師", "富嶽"],
      hard: ["江", "師", "富"],
    },
  },
  {
    id: "q224",
    category: "美術",
    answer: "土偶",
    hints: {
      easy: ["縄文", "彫像", "祈り"],
      normal: ["縄文", "彫像", "祈祷"],
      hard: ["縄", "像", "祈"],
    },
  },
  {
    id: "q225",
    category: "美術",
    answer: "鳥獣戯画",
    hints: {
      easy: ["平安", "絵巻", "擬人化"],
      normal: ["平安", "絵巻", "擬人"],
      hard: ["平", "絵", "擬"],
    },
  },
  {
    id: "q226",
    category: "スポーツ",
    answer: "オリンピック",
    hints: {
      easy: ["希臘", "大会", "四年に一度"],
      normal: ["希", "大会", "四年"],
      hard: ["希", "会", "四"],
    },
  },
  {
    id: "q227",
    category: "スポーツ",
    answer: "サッカーワールドカップ",
    hints: {
      easy: ["国際", "大会", "四年に一度"],
      normal: ["国際", "大会", "四年"],
      hard: ["国", "会", "四"],
    },
  },
  {
    id: "q228",
    category: "スポーツ",
    answer: "箱根駅伝",
    hints: {
      easy: ["日本", "競技", "正月の風物詩"],
      normal: ["日本", "競技", "正月"],
      hard: ["日", "技", "正"],
    },
  },
  {
    id: "q229",
    category: "スポーツ",
    answer: "甲子園",
    hints: {
      easy: ["兵庫", "野球場", "高校球児"],
      normal: ["兵庫", "球場", "高校"],
      hard: ["兵", "場", "高"],
    },
  },
  {
    id: "q230",
    category: "スポーツ",
    answer: "大相撲",
    hints: {
      easy: ["日本", "格闘技", "土俵"],
      normal: ["日本", "格闘", "土俵"],
      hard: ["日", "技", "土"],
    },
  },
  {
    id: "q231",
    category: "スポーツ",
    answer: "柔道",
    hints: {
      easy: ["日本", "武道", "一本"],
      normal: ["日本", "武道", "一本"],
      hard: ["日", "道", "本"],
    },
  },
  {
    id: "q232",
    category: "スポーツ",
    answer: "マラソン",
    hints: {
      easy: ["希臘", "競技", "42.195キロ"],
      normal: ["希", "競技", "長距離"],
      hard: ["希", "技", "長"],
    },
  },
  {
    id: "q233",
    category: "スポーツ",
    answer: "F1",
    hints: {
      easy: ["国際", "レース", "自動車"],
      normal: ["国際", "競争", "自動車"],
      hard: ["国", "争", "車"],
    },
  },
  {
    id: "q234",
    category: "スポーツ",
    answer: "テニス",
    hints: {
      easy: ["英国", "競技", "ラケット"],
      normal: ["英", "競技", "ラケ"],
      hard: ["英", "技", "打"],
    },
  },
  {
    id: "q235",
    category: "スポーツ",
    answer: "卓球",
    hints: {
      easy: ["英国", "競技", "ピンポン"],
      normal: ["英国", "競技", "小球"],
      hard: ["英", "技", "小"],
    },
  },
  {
    id: "q236",
    category: "スポーツ",
    answer: "フィギュアスケート",
    hints: {
      easy: ["氷上", "競技", "回転ジャンプ"],
      normal: ["氷上", "競技", "回転"],
      hard: ["氷", "技", "回"],
    },
  },
  {
    id: "q237",
    category: "スポーツ",
    answer: "野球",
    hints: {
      easy: ["米国", "競技", "ホームラン"],
      normal: ["米", "競技", "打球"],
      hard: ["米", "技", "打"],
    },
  },
  {
    id: "q238",
    category: "スポーツ",
    answer: "バスケットボール",
    hints: {
      easy: ["米国", "競技", "ドリブル"],
      normal: ["米", "競技", "得点"],
      hard: ["米", "技", "点"],
    },
  },
  {
    id: "q239",
    category: "スポーツ",
    answer: "駅伝",
    hints: {
      easy: ["日本", "競技", "タスキ"],
      normal: ["日本", "競技", "襷"],
      hard: ["日", "技", "襷"],
    },
  },
  {
    id: "q240",
    category: "スポーツ",
    answer: "ツール・ド・フランス",
    hints: {
      easy: ["仏蘭西", "競技", "自転車"],
      normal: ["仏", "競技", "自転車"],
      hard: ["仏", "技", "輪"],
    },
  },
  {
    id: "q241",
    category: "動物",
    answer: "パンダ",
    hints: {
      easy: ["中国", "動物", "白黒"],
      normal: ["中国", "動物", "白黒"],
      hard: ["中", "動", "白"],
    },
  },
  {
    id: "q242",
    category: "動物",
    answer: "ライオン",
    hints: {
      easy: ["阿弗利加", "動物", "百獣の王"],
      normal: ["阿", "動物", "百獣"],
      hard: ["阿", "動", "百"],
    },
  },
  {
    id: "q243",
    category: "動物",
    answer: "コアラ",
    hints: {
      easy: ["豪州", "動物", "ユーカリ"],
      normal: ["豪", "動物", "木登"],
      hard: ["豪", "動", "木"],
    },
  },
  {
    id: "q244",
    category: "動物",
    answer: "カンガルー",
    hints: {
      easy: ["豪州", "動物", "袋で子育て"],
      normal: ["豪", "動物", "袋"],
      hard: ["豪", "動", "袋"],
    },
  },
  {
    id: "q245",
    category: "動物",
    answer: "ペンギン",
    hints: {
      easy: ["南極", "鳥", "泳ぐ鳥"],
      normal: ["南極", "鳥類", "泳ぐ"],
      hard: ["南", "鳥", "泳"],
    },
  },
  {
    id: "q246",
    category: "動物",
    answer: "ホッキョクグマ",
    hints: {
      easy: ["北極", "動物", "白い毛"],
      normal: ["北極", "動物", "白毛"],
      hard: ["北", "動", "白"],
    },
  },
  {
    id: "q247",
    category: "動物",
    answer: "ラクダ",
    hints: {
      easy: ["砂漠", "動物", "こぶ"],
      normal: ["砂漠", "動物", "瘤"],
      hard: ["砂", "動", "瘤"],
    },
  },
  {
    id: "q248",
    category: "動物",
    answer: "アリクイ",
    hints: {
      easy: ["南米", "動物", "長い舌"],
      normal: ["南米", "動物", "長舌"],
      hard: ["南", "動", "舌"],
    },
  },
  {
    id: "q249",
    category: "動物",
    answer: "カメレオン",
    hints: {
      easy: ["阿弗利加", "動物", "色を変える"],
      normal: ["阿", "動物", "変色"],
      hard: ["阿", "動", "変"],
    },
  },
  {
    id: "q250",
    category: "動物",
    answer: "ゴリラ",
    hints: {
      easy: ["阿弗利加", "動物", "霊長類"],
      normal: ["阿", "動物", "霊長"],
      hard: ["阿", "動", "霊"],
    },
  },
  {
    id: "q251",
    category: "動物",
    answer: "カピバラ",
    hints: {
      easy: ["南米", "動物", "世界最大のネズミ"],
      normal: ["南米", "動物", "最大鼠"],
      hard: ["南", "動", "鼠"],
    },
  },
  {
    id: "q252",
    category: "動物",
    answer: "トキ",
    hints: {
      easy: ["日本", "鳥", "特別天然記念物"],
      normal: ["日本", "鳥類", "記念"],
      hard: ["日", "鳥", "記"],
    },
  },
  {
    id: "q253",
    category: "動物",
    answer: "クマムシ",
    hints: {
      easy: ["微生物", "生物", "驚異の耐性"],
      normal: ["微生", "生物", "耐性"],
      hard: ["微", "生", "耐"],
    },
  },
  {
    id: "q254",
    category: "動物",
    answer: "シーラカンス",
    hints: {
      easy: ["古代", "魚", "生きた化石"],
      normal: ["古代", "魚類", "化石"],
      hard: ["古", "魚", "化"],
    },
  },
  {
    id: "q255",
    category: "動物",
    answer: "カブトムシ",
    hints: {
      easy: ["昆虫", "夏", "角"],
      normal: ["昆虫", "夏虫", "角"],
      hard: ["昆", "虫", "角"],
    },
  },
  {
    id: "q256",
    category: "食べ物・料理",
    answer: "カレーライス",
    hints: {
      easy: ["印度", "料理", "国民食"],
      normal: ["印度", "料理", "国民"],
      hard: ["印", "料", "民"],
    },
  },
  {
    id: "q257",
    category: "食べ物・料理",
    answer: "寿司",
    hints: {
      easy: ["日本", "料理", "シャリ"],
      normal: ["日本", "料理", "酢飯"],
      hard: ["日", "料", "酢"],
    },
  },
  {
    id: "q258",
    category: "食べ物・料理",
    answer: "ピザ",
    hints: {
      easy: ["伊太利", "料理", "チーズ"],
      normal: ["伊", "料理", "円形"],
      hard: ["伊", "料", "円"],
    },
  },
  {
    id: "q259",
    category: "食べ物・料理",
    answer: "パスタ",
    hints: {
      easy: ["伊太利", "料理", "麺"],
      normal: ["伊", "料理", "麺"],
      hard: ["伊", "料", "麺"],
    },
  },
  {
    id: "q260",
    category: "食べ物・料理",
    answer: "フランスパン",
    hints: {
      easy: ["仏蘭西", "食品", "バゲット"],
      normal: ["仏", "食品", "棒状"],
      hard: ["仏", "食", "棒"],
    },
  },
  {
    id: "q261",
    category: "食べ物・料理",
    answer: "キムチ",
    hints: {
      easy: ["韓国", "食品", "発酵"],
      normal: ["韓国", "食品", "発酵"],
      hard: ["韓", "食", "発"],
    },
  },
  {
    id: "q262",
    category: "食べ物・料理",
    answer: "餃子",
    hints: {
      easy: ["中国", "料理", "皮と具"],
      normal: ["中国", "料理", "皮具"],
      hard: ["中", "料", "皮"],
    },
  },
  {
    id: "q263",
    category: "食べ物・料理",
    answer: "チョコレート",
    hints: {
      easy: ["中南米", "菓子", "カカオ"],
      normal: ["中南", "菓子", "カカオ"],
      hard: ["中", "菓", "甘"],
    },
  },
  {
    id: "q264",
    category: "食べ物・料理",
    answer: "ワイン",
    hints: {
      easy: ["仏蘭西", "飲料", "ぶどう酒"],
      normal: ["仏", "飲料", "葡萄"],
      hard: ["仏", "飲", "葡"],
    },
  },
  {
    id: "q265",
    category: "食べ物・料理",
    answer: "納豆",
    hints: {
      easy: ["日本", "食品", "発酵食品"],
      normal: ["日本", "食品", "発酵"],
      hard: ["日", "食", "発"],
    },
  },
  {
    id: "q266",
    category: "食べ物・料理",
    answer: "味噌",
    hints: {
      easy: ["日本", "調味料", "発酵"],
      normal: ["日本", "調味", "発酵"],
      hard: ["日", "調", "発"],
    },
  },
  {
    id: "q267",
    category: "食べ物・料理",
    answer: "フォンデュ",
    hints: {
      easy: ["瑞西", "料理", "溶かしたチーズ"],
      normal: ["瑞", "料理", "溶融"],
      hard: ["瑞", "料", "溶"],
    },
  },
  {
    id: "q268",
    category: "食べ物・料理",
    answer: "ハンバーガー",
    hints: {
      easy: ["米国", "食品", "ファストフード"],
      normal: ["米", "食品", "挟む"],
      hard: ["米", "食", "挟"],
    },
  },
  {
    id: "q269",
    category: "食べ物・料理",
    answer: "生春巻き",
    hints: {
      easy: ["越南", "料理", "ライスペーパー"],
      normal: ["越南", "料理", "巻物"],
      hard: ["越", "料", "巻"],
    },
  },
  {
    id: "q270",
    category: "食べ物・料理",
    answer: "たこ焼き",
    hints: {
      easy: ["大阪", "料理", "丸い"],
      normal: ["大阪", "料理", "丸型"],
      hard: ["大", "料", "丸"],
    },
  },
  {
    id: "q271",
    category: "企業・ブランド",
    answer: "アップル",
    hints: {
      easy: ["米国", "企業", "リンゴマーク"],
      normal: ["米", "企業", "林檎"],
      hard: ["米", "企", "林"],
    },
  },
  {
    id: "q272",
    category: "企業・ブランド",
    answer: "グーグル",
    hints: {
      easy: ["米国", "企業", "検索エンジン"],
      normal: ["米", "企業", "検索"],
      hard: ["米", "企", "検"],
    },
  },
  {
    id: "q273",
    category: "企業・ブランド",
    answer: "トヨタ",
    hints: {
      easy: ["日本", "企業", "自動車"],
      normal: ["日本", "企業", "自動車"],
      hard: ["日", "企", "車"],
    },
  },
  {
    id: "q274",
    category: "企業・ブランド",
    answer: "任天堂",
    hints: {
      easy: ["日本", "企業", "ゲーム"],
      normal: ["日本", "企業", "遊戯"],
      hard: ["日", "企", "遊"],
    },
  },
  {
    id: "q275",
    category: "企業・ブランド",
    answer: "ディズニー",
    hints: {
      easy: ["米国", "企業", "夢の国"],
      normal: ["米", "企業", "夢国"],
      hard: ["米", "企", "夢"],
    },
  },
  {
    id: "q276",
    category: "企業・ブランド",
    answer: "マクドナルド",
    hints: {
      easy: ["米国", "企業", "ハンバーガー"],
      normal: ["米", "企業", "速食"],
      hard: ["米", "企", "速"],
    },
  },
  {
    id: "q277",
    category: "企業・ブランド",
    answer: "コカ・コーラ",
    hints: {
      easy: ["米国", "企業", "炭酸飲料"],
      normal: ["米", "企業", "炭酸"],
      hard: ["米", "企", "炭"],
    },
  },
  {
    id: "q278",
    category: "企業・ブランド",
    answer: "ナイキ",
    hints: {
      easy: ["米国", "企業", "スポーツ用品"],
      normal: ["米", "企業", "運動品"],
      hard: ["米", "企", "運"],
    },
  },
  {
    id: "q279",
    category: "企業・ブランド",
    answer: "アマゾン",
    hints: {
      easy: ["米国", "企業", "通販"],
      normal: ["米", "企業", "通販"],
      hard: ["米", "企", "通"],
    },
  },
  {
    id: "q280",
    category: "企業・ブランド",
    answer: "ユニクロ",
    hints: {
      easy: ["日本", "企業", "衣料品"],
      normal: ["日本", "企業", "衣料"],
      hard: ["日", "企", "衣"],
    },
  },
  {
    id: "q281",
    category: "企業・ブランド",
    answer: "レゴ",
    hints: {
      easy: ["丁抹", "企業", "ブロック玩具"],
      normal: ["丁", "企業", "組立"],
      hard: ["丁", "企", "組"],
    },
  },
  {
    id: "q282",
    category: "企業・ブランド",
    answer: "フェラーリ",
    hints: {
      easy: ["伊太利", "企業", "高級車"],
      normal: ["伊", "企業", "高級"],
      hard: ["伊", "企", "高"],
    },
  },
  {
    id: "q283",
    category: "企業・ブランド",
    answer: "サムスン",
    hints: {
      easy: ["韓国", "企業", "電子機器"],
      normal: ["韓国", "企業", "電子"],
      hard: ["韓", "企", "電"],
    },
  },
  {
    id: "q284",
    category: "企業・ブランド",
    answer: "イケア",
    hints: {
      easy: ["瑞典", "企業", "家具"],
      normal: ["瑞", "企業", "家具"],
      hard: ["瑞", "企", "家"],
    },
  },
  {
    id: "q285",
    category: "企業・ブランド",
    answer: "メルセデス・ベンツ",
    hints: {
      easy: ["独逸", "企業", "高級車"],
      normal: ["独", "企業", "高級"],
      hard: ["独", "企", "高"],
    },
  },
  {
    id: "q286",
    category: "世界遺産・建築",
    answer: "自由の女神",
    hints: {
      easy: ["米国", "彫像", "独立百年"],
      normal: ["米", "彫像", "百年"],
      hard: ["米", "像", "百"],
    },
  },
  {
    id: "q287",
    category: "世界遺産・建築",
    answer: "エッフェル塔",
    hints: {
      easy: ["仏蘭西", "建造物", "鉄塔"],
      normal: ["仏", "建造", "鉄塔"],
      hard: ["仏", "建", "鉄"],
    },
  },
  {
    id: "q288",
    category: "世界遺産・建築",
    answer: "ビッグベン",
    hints: {
      easy: ["英国", "時計台", "国会議事堂"],
      normal: ["英", "時計", "議会"],
      hard: ["英", "時", "議"],
    },
  },
  {
    id: "q289",
    category: "世界遺産・建築",
    answer: "コロッセオ",
    hints: {
      easy: ["伊太利", "建造物", "円形闘技場"],
      normal: ["伊", "建造", "闘技"],
      hard: ["伊", "建", "闘"],
    },
  },
  {
    id: "q290",
    category: "世界遺産・建築",
    answer: "タージ・マハル",
    hints: {
      easy: ["印度", "建造物", "白い霊廟"],
      normal: ["印", "建造", "霊廟"],
      hard: ["印", "建", "霊"],
    },
  },
  {
    id: "q291",
    category: "世界遺産・建築",
    answer: "姫路城",
    hints: {
      easy: ["兵庫", "城", "白鷺城"],
      normal: ["兵庫", "城郭", "白鷺"],
      hard: ["兵", "城", "鷺"],
    },
  },
  {
    id: "q292",
    category: "世界遺産・建築",
    answer: "東京タワー",
    hints: {
      easy: ["東京", "建造物", "電波塔"],
      normal: ["東京", "建造", "電波"],
      hard: ["東", "建", "波"],
    },
  },
  {
    id: "q293",
    category: "世界遺産・建築",
    answer: "金閣寺",
    hints: {
      easy: ["京都", "寺院", "足利義満"],
      normal: ["京都", "寺院", "金箔"],
      hard: ["京", "寺", "金"],
    },
  },
  {
    id: "q294",
    category: "世界遺産・建築",
    answer: "厳島神社",
    hints: {
      easy: ["広島", "神社", "海に浮かぶ鳥居"],
      normal: ["広島", "神社", "鳥居"],
      hard: ["広", "社", "鳥"],
    },
  },
  {
    id: "q295",
    category: "世界遺産・建築",
    answer: "スフィンクス",
    hints: {
      easy: ["埃及", "彫像", "人面獅子"],
      normal: ["埃", "彫像", "獅子"],
      hard: ["埃", "像", "獅"],
    },
  },
  {
    id: "q296",
    category: "世界遺産・建築",
    answer: "サグラダ・ファミリア",
    hints: {
      easy: ["西班牙", "教会", "未完成"],
      normal: ["西", "教会", "未完"],
      hard: ["西", "教", "未"],
    },
  },
  {
    id: "q297",
    category: "世界遺産・建築",
    answer: "万里の長城",
    hints: {
      easy: ["中国", "城壁", "世界最長"],
      normal: ["中", "城壁", "最長"],
      hard: ["中", "壁", "長"],
    },
  },
  {
    id: "q298",
    category: "世界遺産・建築",
    answer: "ノイシュヴァンシュタイン城",
    hints: {
      easy: ["独逸", "城", "お伽の国"],
      normal: ["独", "城郭", "童話"],
      hard: ["独", "城", "夢"],
    },
  },
  {
    id: "q299",
    category: "世界遺産・建築",
    answer: "ペトラ遺跡",
    hints: {
      easy: ["約旦", "遺跡", "岩窟都市"],
      normal: ["約", "遺跡", "岩窟"],
      hard: ["約", "跡", "岩"],
    },
  },
  {
    id: "q300",
    category: "世界遺産・建築",
    answer: "アンコールワット",
    hints: {
      easy: ["柬埔寨", "遺跡", "密林寺院"],
      normal: ["柬", "遺跡", "密林"],
      hard: ["柬", "跡", "密"],
    },
  },
  {
    id: "q301",
    category: "ことわざ・四字熟語",
    answer: "猿も木から落ちる",
    hints: {
      easy: ["諺", "教訓", "失敗"],
      normal: ["諺語", "失敗", "油断"],
      hard: ["諺", "敗", "断"],
    },
  },
  {
    id: "q302",
    category: "ことわざ・四字熟語",
    answer: "七転び八起き",
    hints: {
      easy: ["諺", "教訓", "不屈"],
      normal: ["諺語", "不屈", "再起"],
      hard: ["諺", "屈", "起"],
    },
  },
  {
    id: "q303",
    category: "ことわざ・四字熟語",
    answer: "石の上にも三年",
    hints: {
      easy: ["諺", "教訓", "忍耐"],
      normal: ["諺語", "忍耐", "継続"],
      hard: ["諺", "忍", "続"],
    },
  },
  {
    id: "q304",
    category: "ことわざ・四字熟語",
    answer: "花より団子",
    hints: {
      easy: ["諺", "教訓", "実利"],
      normal: ["諺語", "実利", "現実"],
      hard: ["諺", "利", "現"],
    },
  },
  {
    id: "q305",
    category: "ことわざ・四字熟語",
    answer: "一石二鳥",
    hints: {
      easy: ["四字熟語", "効率", "二つの利益"],
      normal: ["熟語", "効率", "両得"],
      hard: ["熟", "効", "両"],
    },
  },
  {
    id: "q306",
    category: "ことわざ・四字熟語",
    answer: "温故知新",
    hints: {
      easy: ["四字熟語", "教え", "昔から学ぶ"],
      normal: ["熟語", "教訓", "古典"],
      hard: ["熟", "教", "古"],
    },
  },
  {
    id: "q307",
    category: "ことわざ・四字熟語",
    answer: "臥薪嘗胆",
    hints: {
      easy: ["四字熟語", "忍耐", "復讐"],
      normal: ["熟語", "忍耐", "復讐"],
      hard: ["熟", "忍", "復"],
    },
  },
  {
    id: "q308",
    category: "ことわざ・四字熟語",
    answer: "付和雷同",
    hints: {
      easy: ["四字熟語", "性格", "流されやすい"],
      normal: ["熟語", "性格", "同調"],
      hard: ["熟", "性", "同"],
    },
  },
  {
    id: "q309",
    category: "ことわざ・四字熟語",
    answer: "弱肉強食",
    hints: {
      easy: ["四字熟語", "自然界", "生存競争"],
      normal: ["熟語", "自然", "競争"],
      hard: ["熟", "自", "競"],
    },
  },
  {
    id: "q310",
    category: "ことわざ・四字熟語",
    answer: "因果応報",
    hints: {
      easy: ["四字熟語", "仏教", "原因と結果"],
      normal: ["熟語", "仏教", "結果"],
      hard: ["熟", "仏", "結"],
    },
  },
];
