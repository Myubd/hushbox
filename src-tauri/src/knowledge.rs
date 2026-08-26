//! チャットへ「参照情報」として注入するための共有の型。
//!
//! 「問題バンク(カリキュラム範囲の検証済み知識)」と「百科事典(カリキュラム外の
//! 一般知識。手作業で充実させていく想定)」の両方が、この型で統一的に
//! 検索結果を返す。呼び出し側(prompts.rs)はこの型さえ知っていればよく、
//! どちらの由来かは`source`フィールドで区別できる(将来、UIに出典表示を
//! 追加する場合などに使う想定)。

#[derive(Debug, Clone, PartialEq)]
pub struct KnowledgeSnippet {
    /// 由来。"curriculum"(問題バンク) または "encyclopedia"(百科事典)
    pub source: &'static str,
    pub title: String,
    pub body: String,
}
