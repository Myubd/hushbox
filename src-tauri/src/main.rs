// このファイルはWindows向けに追加のコンソールウィンドウを抑制するため
// cfg_attrで属性を付与しつつ、実処理はlib.rsのrun()に委譲する
// (Tauri v2の標準的なプロジェクト構成)
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    hushbox_lib::run();
}
