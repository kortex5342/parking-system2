# 駐車場入出庫システム TODO

## データベース・バックエンド
- [x] 駐車スペーステーブル（10台分）の作成
- [x] 入庫記録テーブルの作成
- [x] 決済履歴テーブルの作成
- [x] 駐車スペース一覧取得API
- [x] 入庫登録API
- [x] 出庫・料金計算API
- [x] 決済処理API（デモ）
- [x] 管理者用：入庫状況一覧API
- [x] 管理者用：決済履歴一覧API

## ユーザー向け画面
- [x] QRコードスキャン画面（カメラまたは手動入力）
- [x] 入庫登録画面
- [x] 出庫・料金確認画面
- [x] デモ決済画面（PayPay/クレジットカード選択）
- [x] 決済完了画面

## 管理者向け画面
- [x] 管理者ダッシュボードレイアウト
- [x] 入庫状況一覧表示
- [x] 決済履歴一覧表示

## QRコード・その他
- [x] 各スペース用QRコード生成機能
- [x] QRコード印刷用ページ
- [x] スカンジナビアンミニマルデザイン適用

## テスト
- [x] バックエンドAPIのVitestテスト

## Stripe Connect連携
- [x] Stripe機能の追加（webdev_add_feature）
- [x] Stripe Connect OAuth認証フロー実装
- [x] 管理者設定画面にStripe接続ボタン追加
- [x] Stripe接続状態の表示（接続済み/未接続）
- [x] 決済処理をStripe実決済に切り替え
- [x] デモ決済モードとの切り替え機能
- [x] Stripe連携のテスト

## Square決済連携
- [x] データベーススキーマにSquare関連フィールド追加
- [x] Square APIヘルパー作成
- [x] Square OAuth認証フロー実装
- [x] 管理者設定画面にSquare接続UI追加
- [x] Square Checkout Session作成API
- [x] Stripe/Square排他選択ロジック

## PayPay API連携
- [x] データベーススキーマにPayPay関連フィールド追加
- [x] PayPay APIヘルパー作成
- [x] 管理者設定画面にPayPay API設定UI追加
- [x] PayPay QRコード決済API実装
- [x] 決済画面にPayPay実決済オプション追加

## 決済設定UI
- [x] クレジットカード決済セクション（Stripe/Square排他選択）
- [x] PayPay決済セクション（独立設定）
- [x] 接続状態の表示
- [x] 決済プロバイダーテスト作成・実行

## バグ修正
- [x] Stripe接続ボタンが画面遷移しない問題を修正
- [x] Square接続ボタンが画面遷移しない問題を修正
- [x] Stripe Connect → 直接決済モードへの変更
- [x] Square APIキー設定方式への変更

## 決済サービスAPIキー直接入力方式
- [x] Stripe APIキー入力フォーム（Secret Key, Publishable Key）
- [x] Square Access Token入力フォーム
- [x] 保存時の接続テスト機能
- [x] 接続成功/失敗の表示

## 料金設定カスタマイズ
- [x] 課金単位設定（10分〜60分プルダウン）
- [x] 料金自由入力
- [x] 料金計算ロジックの動的対応
