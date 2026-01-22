# 駐車場入出庫システム 仕様書

**バージョン**: 1.0  
**最終更新日**: 2026年1月23日  
**作成者**: Manus AI

---

## 1. システム概要

本システムは、QRコードを活用した駐車場の入出庫管理および決済処理を行うWebアプリケーションです。駐車場オーナー、システム運営者（オペレーター）、駐車場利用者の3つのユーザータイプに対応し、マルチテナント構成で複数の駐車場を一元管理できます。

### 1.1 主要機能

| 機能カテゴリ | 概要 |
|-------------|------|
| **入出庫管理** | QRコードスキャンによる入庫登録・出庫処理 |
| **料金計算** | 時間帯別料金設定、1日最大料金対応の柔軟な料金計算 |
| **決済処理** | PayPay、クレジットカード（Stripe/Square）、LINE Pay、楽天ペイ、Apple Pay対応 |
| **オーナー管理** | 複数オーナーの駐車場を一元管理、売上集計・振込管理 |
| **車両ナンバー認識** | 監視カメラ連携によるLPR API経由のナンバープレート認識 |

### 1.2 技術スタック

| レイヤー | 技術 |
|---------|------|
| **フロントエンド** | React 19, TypeScript, Tailwind CSS 4, shadcn/ui |
| **バックエンド** | Node.js, Express 4, tRPC 11 |
| **データベース** | MySQL/TiDB (Drizzle ORM) |
| **認証** | Manus OAuth, JWT |
| **決済** | Stripe, Square, PayPay API |
| **外部API** | LPR API (https://lpr.sensing-api.com/) |

---

## 2. ユーザーロールと権限

システムは3つのユーザーロールを定義しています。

### 2.1 ロール定義

| ロール | 説明 | 主な権限 |
|--------|------|----------|
| **user** | 駐車場利用者 | QRスキャン、入出庫、決済 |
| **owner** | 駐車場オーナー | 自身の駐車場の売上確認、設定閲覧、振込先設定 |
| **admin** | システム運営者（オペレーター） | 全オーナー・駐車場の管理、決済設定、料金設定 |

### 2.2 アクセス制御

オーナーは自身の駐車場データのみにアクセス可能であり、他のオーナーのデータや運営者ページにはアクセスできません。運営者は全データにアクセス可能で、オーナーの追加・編集・削除、駐車場の作成・設定変更を行えます。

---

## 3. データベース設計

### 3.1 ER図（概念）

```
users (ユーザー)
  ├── parkingLots (駐車場) [1:N]
  │     ├── parkingSpaces (駐車スペース) [1:N]
  │     ├── parkingRecords (入庫記録) [1:N]
  │     ├── paymentRecords (決済履歴) [1:N]
  │     ├── maxPricingPeriods (時間帯別最大料金) [1:N]
  │     ├── vehicleNumberRecords (車両ナンバー記録) [1:N]
  │     └── cameraSettings (カメラ設定) [1:N]
  └── payoutSchedules (振込スケジュール) [1:N]

globalPaymentSettings (グローバル決済設定)
paymentMethods (駐車場別決済方法) ※現在は未使用
```

### 3.2 テーブル定義

#### 3.2.1 users（ユーザー）

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | INT (PK) | ユーザーID |
| openId | VARCHAR(64) | OAuth識別子 |
| name | TEXT | 名前 |
| email | VARCHAR(320) | メールアドレス |
| phone | VARCHAR(20) | 電話番号 |
| role | ENUM | user/owner/admin |
| status | ENUM | pending/active/suspended |
| customUrl | VARCHAR(100) | オーナー用カスタムURL |
| pricingUnitMinutes | INT | 料金計算単位（分） |
| pricingAmount | INT | 単位あたり料金（円） |
| bankName | VARCHAR(100) | 振込先銀行名 |
| branchName | VARCHAR(100) | 支店名 |
| accountType | ENUM | checking/savings |
| accountNumber | VARCHAR(20) | 口座番号 |
| accountHolder | VARCHAR(100) | 口座名義 |
| stripeSecretKey | VARCHAR(256) | Stripe秘密鍵 |
| stripePublishableKey | VARCHAR(256) | Stripe公開鍵 |
| stripeConnected | BOOLEAN | Stripe接続状態 |
| squareAccessToken | VARCHAR(256) | Square Access Token |
| squareConnected | BOOLEAN | Square接続状態 |
| paypayApiKey | VARCHAR(256) | PayPay APIキー |
| paypayApiSecret | VARCHAR(256) | PayPay APIシークレット |
| paypayMerchantId | VARCHAR(64) | PayPayマーチャントID |
| paypayConnected | BOOLEAN | PayPay接続状態 |
| cardPaymentProvider | ENUM | stripe/square |

#### 3.2.2 parkingLots（駐車場）

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | INT (PK) | 駐車場ID |
| ownerId | INT (FK) | オーナーID |
| name | VARCHAR(100) | 駐車場名 |
| address | TEXT | 住所 |
| description | TEXT | 説明 |
| totalSpaces | INT | 総スペース数 |
| status | ENUM | active/inactive |
| pricingUnitMinutes | INT | 料金計算単位（分） |
| pricingAmount | INT | 単位あたり料金（円） |
| maxDailyAmount | INT | 1日最大料金 |
| maxDailyAmountEnabled | BOOLEAN | 1日最大料金の有効/無効 |

#### 3.2.3 parkingSpaces（駐車スペース）

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | INT (PK) | スペースID |
| parkingLotId | INT (FK) | 駐車場ID |
| spaceNumber | INT | スペース番号 |
| status | ENUM | available/occupied |
| qrCode | VARCHAR(64) | QRコード識別子（ユニーク） |

#### 3.2.4 parkingRecords（入庫記録）

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | INT (PK) | 記録ID |
| parkingLotId | INT (FK) | 駐車場ID |
| spaceId | INT (FK) | スペースID |
| spaceNumber | INT | スペース番号 |
| entryTime | BIGINT | 入庫時刻（Unix timestamp ms） |
| exitTime | BIGINT | 出庫時刻（Unix timestamp ms） |
| status | ENUM | active/completed |
| sessionToken | VARCHAR(64) | セッション識別子（ユニーク） |

#### 3.2.5 paymentRecords（決済履歴）

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | INT (PK) | 決済ID |
| parkingLotId | INT (FK) | 駐車場ID |
| ownerId | INT (FK) | オーナーID |
| parkingRecordId | INT (FK) | 入庫記録ID |
| spaceNumber | INT | スペース番号 |
| entryTime | BIGINT | 入庫時刻 |
| exitTime | BIGINT | 出庫時刻 |
| durationMinutes | INT | 駐車時間（分） |
| amount | INT | 料金（円） |
| paymentMethod | ENUM | paypay/credit_card/stripe/square/line_pay/rakuten_pay/apple_pay |
| paymentStatus | ENUM | pending/completed/failed |
| transactionId | VARCHAR(64) | トランザクションID |
| stripePaymentIntentId | VARCHAR(64) | Stripe Payment Intent ID |
| squarePaymentId | VARCHAR(64) | Square Payment ID |
| paypayPaymentId | VARCHAR(64) | PayPay Payment ID |
| isDemo | BOOLEAN | デモ決済フラグ |

#### 3.2.6 maxPricingPeriods（時間帯別最大料金）

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | INT (PK) | 設定ID |
| parkingLotId | INT (FK) | 駐車場ID |
| startHour | INT | 開始時刻（0-23） |
| endHour | INT | 終了時刻（0-23） |
| maxAmount | INT | 最大料金（円） |

#### 3.2.7 vehicleNumberRecords（車両ナンバー記録）

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | INT (PK) | 記録ID |
| parkingLotId | INT (FK) | 駐車場ID |
| area | VARCHAR(20) | 地域名（例：練馬） |
| classNumber | VARCHAR(10) | 分類番号（例：300） |
| kana | VARCHAR(5) | かな文字（例：あ） |
| digits | VARCHAR(10) | 一連番号（例：1234） |
| fullNumber | VARCHAR(50) | フルナンバー |
| plateType | VARCHAR(20) | 種類（大板/中板等） |
| plateUse | VARCHAR(20) | 用途（自家/事業） |
| plateColor | VARCHAR(10) | 色（白/緑/黄/黒） |
| imageUrl | TEXT | 撮影画像URL |
| recognitionSuccess | BOOLEAN | 認識成功フラグ |
| rawResponse | TEXT | LPR APIレスポンス（JSON） |
| capturedAt | BIGINT | 撮影日時（Unix timestamp ms） |

#### 3.2.8 cameraSettings（カメラ設定）

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | INT (PK) | 設定ID |
| parkingLotId | INT (FK) | 駐車場ID |
| cameraName | VARCHAR(100) | カメラ名 |
| cameraType | VARCHAR(50) | カメラ種類 |
| ipAddress | VARCHAR(45) | IPアドレス |
| port | INT | ポート番号 |
| username | VARCHAR(100) | 認証ユーザー名 |
| password | VARCHAR(256) | 認証パスワード |
| snapshotPath | VARCHAR(256) | スナップショットパス |
| captureIntervalMinutes | INT | 撮影間隔（分） |
| enabled | BOOLEAN | 有効/無効 |
| lastCaptureAt | BIGINT | 最終撮影日時 |
| lprApiToken | VARCHAR(256) | LPR APIトークン |
| lprApiUrl | VARCHAR(256) | LPR APIエンドポイント |

#### 3.2.9 globalPaymentSettings（グローバル決済設定）

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | INT (PK) | 設定ID |
| method | ENUM | 決済方法（paypay/rakuten_pay/line_pay/apple_pay/ic_card/credit_card） |
| enabled | BOOLEAN | 有効/無効 |
| apiKey | VARCHAR(256) | APIキー |
| apiSecret | VARCHAR(256) | APIシークレット |
| merchantId | VARCHAR(64) | マーチャントID |
| stripeSecretKey | VARCHAR(256) | Stripe秘密鍵 |
| stripePublishableKey | VARCHAR(256) | Stripe公開鍵 |
| feePercentage | DECIMAL(5,2) | 手数料率（%） |
| feeFixed | INT | 固定手数料（円） |

---

## 4. API設計

### 4.1 API構成

本システムはtRPCを使用しており、以下のルーターで構成されています。

| ルーター | 説明 | 認証要件 |
|---------|------|----------|
| `auth` | 認証関連 | 公開 |
| `parking` | 入出庫・料金計算 | 公開 |
| `admin` | 旧管理者機能 | 管理者 |
| `stripe` | Stripe決済 | 管理者/公開 |
| `square` | Square決済 | 管理者/公開 |
| `paypay` | PayPay決済 | 管理者/公開 |
| `owner` | オーナー機能 | オーナー |
| `operator` | 運営者機能 | 管理者 |

### 4.2 主要エンドポイント

#### 4.2.1 駐車場管理（parking）

| プロシージャ | 種別 | 説明 |
|-------------|------|------|
| `getSpaces` | Query | 全駐車スペース取得 |
| `getSpaceByQrCode` | Query | QRコードでスペース情報取得 |
| `checkIn` | Mutation | 入庫処理 |
| `getCheckoutInfo` | Query | 出庫情報・料金計算 |
| `processPayment` | Mutation | 決済処理（デモ） |
| `completeCheckout` | Mutation | 出庫完了処理 |

#### 4.2.2 オーナー機能（owner）

| プロシージャ | 種別 | 説明 |
|-------------|------|------|
| `createParkingLot` | Mutation | 駐車場作成 |
| `getParkingLots` | Query | 駐車場一覧取得 |
| `updateParkingLot` | Mutation | 駐車場更新 |
| `deleteParkingLot` | Mutation | 駐車場削除 |
| `getPayments` | Query | 決済履歴取得 |
| `getSalesSummary` | Query | 売上集計取得 |
| `getDailySalesData` | Query | 日別売上データ |
| `getMonthlySalesData` | Query | 月別売上データ |
| `getBankInfo` | Query | 振込先情報取得 |
| `updateBankInfo` | Mutation | 振込先情報更新 |
| `getVehicleNumberRecords` | Query | 車両ナンバー記録取得 |
| `getCameraSettings` | Query | カメラ設定取得 |

#### 4.2.3 運営者機能（operator）

| プロシージャ | 種別 | 説明 |
|-------------|------|------|
| `getOwners` | Query | オーナー一覧取得 |
| `addOwner` | Mutation | オーナー追加 |
| `getOwnerDetail` | Query | オーナー詳細取得 |
| `getAllParkingLots` | Query | 全駐車場一覧 |
| `createParkingLotForOwner` | Mutation | オーナー用駐車場作成 |
| `updateParkingLot` | Mutation | 駐車場更新 |
| `getTotalSummary` | Query | 全体売上集計 |
| `getGlobalPaymentSettings` | Query | グローバル決済設定取得 |
| `setGlobalPaymentSetting` | Mutation | グローバル決済設定更新 |
| `exportSalesCSV` | Query | 売上CSVエクスポート |
| `getVehicleNumberRecords` | Query | 車両ナンバー記録取得 |
| `createCameraSetting` | Mutation | カメラ設定追加 |
| `updateCameraSetting` | Mutation | カメラ設定更新 |

### 4.3 外部API連携

#### 4.3.1 カメラ画像受信エンドポイント

```
POST /api/camera/upload
Content-Type: multipart/form-data

パラメータ:
- image: 画像ファイル（JPEG/PNG）
- parkingLotId: 駐車場ID
- cameraId: カメラID（オプション）
```

このエンドポイントは監視カメラからの画像を受信し、LPR APIに送信してナンバープレートを認識します。

#### 4.3.2 LPR API連携

```
POST https://lpr.sensing-api.com/
Authorization: Bearer {token}
Content-Type: multipart/form-data

パラメータ:
- image: 画像ファイル

レスポンス:
{
  "success": true,
  "result": {
    "area": "練馬",
    "class": "300",
    "kana": "あ",
    "digits": "1234",
    "full": "練馬 300 あ 1234",
    "type": "中板",
    "use": "自家",
    "color": "白"
  }
}
```

---

## 5. 画面構成

### 5.1 ルーティング

| パス | コンポーネント | 説明 |
|------|---------------|------|
| `/` | OwnerDashboard | オーナーダッシュボード（デフォルト） |
| `/scan` | Scan | QRスキャン・入出庫画面 |
| `/scan/:lotId/:spaceNumber` | Scan | 特定スペースの入出庫画面 |
| `/owner` | OwnerDashboard | オーナーダッシュボード |
| `/owner/:customUrl` | OwnerPage | 特定オーナーのページ |
| `/owner/vehicles` | VehicleNumberRecords | 車両ナンバー履歴 |
| `/owner/lot/:lotId/qr` | OwnerLotQR | 駐車場QRコード表示 |
| `/operator` | OperatorDashboard | 運営者ダッシュボード |
| `/admin` | Admin | 旧管理者画面 |
| `/admin/print-qr` | PrintQR | QRコード印刷 |

### 5.2 主要画面

#### 5.2.1 オーナーダッシュボード

オーナーダッシュボードは以下のタブで構成されています。

| タブ | 機能 |
|------|------|
| **ダッシュボード** | 売上グラフ（日別・月別）、総売上表示 |
| **駐車場** | 駐車場一覧、入庫状況、QRコード表示 |
| **決済履歴** | 決済履歴一覧 |
| **車両** | 車両ナンバー認識履歴 |
| **設定** | 駐車場設定（読み取り専用）、振込先設定 |

#### 5.2.2 運営者ダッシュボード

運営者ダッシュボードは以下のタブで構成されています。

| タブ | 機能 |
|------|------|
| **オーナー** | オーナー一覧、追加、詳細表示、売上確認 |
| **駐車場** | 全駐車場一覧、設定編集、QRコード管理 |
| **決済設定** | グローバル決済設定（PayPay、クレジットカード等） |
| **決済履歴** | 全決済履歴、CSVエクスポート |
| **車両ナンバー** | 全車両ナンバー記録、カメラ設定 |

#### 5.2.3 QRスキャン画面

利用者向けの入出庫画面で、以下のフローを提供します。

1. **QRスキャン**: カメラまたは手動入力でQRコードを読み取り
2. **入庫確認**: スペース番号を確認して入庫登録
3. **出庫確認**: 駐車時間と料金を確認
4. **決済選択**: 決済方法を選択（PayPay、クレジットカード等）
5. **決済完了**: 決済完了メッセージを表示

---

## 6. 料金計算ロジック

### 6.1 基本料金計算

料金は以下の式で計算されます。

```
基本料金 = ceil(駐車時間(分) / 料金計算単位(分)) × 単位あたり料金(円)
```

例：料金計算単位30分、単位あたり料金200円、駐車時間75分の場合
```
ceil(75 / 30) × 200 = 3 × 200 = 600円
```

### 6.2 1日最大料金

`maxDailyAmountEnabled`が有効な場合、計算された料金が1日最大料金を超えないように制限されます。

```
最終料金 = min(基本料金, 1日最大料金)
```

### 6.3 時間帯別最大料金

`maxPricingPeriods`テーブルに設定がある場合、時間帯ごとに最大料金が適用されます。

例：
- 昼間（8:00-20:00）：最大2,000円
- 夜間（20:00-8:00）：最大1,000円

駐車時間が複数の時間帯を跨ぐ場合、各時間帯の料金を個別に計算し、それぞれの最大料金を適用した上で合算します。

---

## 7. 決済フロー

### 7.1 決済方法

| 決済方法 | 実装状況 | 備考 |
|---------|----------|------|
| **PayPay** | 実装済み | QRコード決済 |
| **クレジットカード（Stripe）** | 実装済み | Checkout Session |
| **クレジットカード（Square）** | 実装済み | Payment Links |
| **LINE Pay** | APIヘルパー実装済み | 決済画面連携未完了 |
| **楽天ペイ** | APIヘルパー実装済み | 決済画面連携未完了 |
| **Apple Pay** | Stripe経由で対応 | - |
| **デモ決済** | 実装済み | テスト用 |

### 7.2 決済フロー図

```
[利用者] → [QRスキャン] → [出庫確認] → [決済方法選択]
                                              ↓
                                    ┌─────────┴─────────┐
                                    ↓                   ↓
                              [PayPay QR]        [Stripe Checkout]
                                    ↓                   ↓
                              [PayPay App]       [カード入力画面]
                                    ↓                   ↓
                                    └─────────┬─────────┘
                                              ↓
                                       [決済完了]
                                              ↓
                                       [出庫処理]
```

### 7.3 売上管理

決済が完了すると、`paymentRecords`テーブルに記録が作成され、`ownerId`フィールドによりオーナーごとの売上が集計されます。運営者は全オーナーの売上を確認でき、CSVエクスポートも可能です。

---

## 8. 車両ナンバー認識機能

### 8.1 概要

監視カメラで撮影した画像をLPR API（https://lpr.sensing-api.com/）に送信し、車両ナンバーを認識・記録する機能です。

### 8.2 処理フロー

```
[監視カメラ] → [HTTP POST /api/camera/upload] → [サーバー]
                                                    ↓
                                            [LPR API呼び出し]
                                                    ↓
                                            [ナンバー認識]
                                                    ↓
                                            [DB保存]
                                                    ↓
                                [オーナー/運営者ダッシュボードで確認]
```

### 8.3 推奨カメラ

| 製品名 | 価格目安 | FTP/HTTP対応 | 特徴 |
|--------|----------|--------------|------|
| Viewla IPC-16LTEp | 約5万円 | ○ | 日本製、SIM対応、ソーラー対応 |
| HIKVISION DS-2CD3T23G1-I/4G | 約5-7万円 | ○ | 4G対応、FTP送信可能 |
| I-O DATA Qwatch | 約1.5-2万円 | ○ | FTP/HTTP送信対応 |
| ATOM Cam 2 | 約3,000円 | △ | Webhook対応 |

---

## 9. セキュリティ

### 9.1 認証・認可

- **認証**: Manus OAuth + JWTセッション
- **認可**: ロールベースアクセス制御（RBAC）
- **セッション**: HTTPOnly Cookie

### 9.2 データ保護

- **APIキー**: データベースに暗号化保存（推奨）
- **決済情報**: Stripe/Square/PayPayの各サービスに委託
- **パスワード**: ハッシュ化保存

### 9.3 API保護

- **CORS**: 許可されたオリジンのみ
- **Rate Limiting**: 推奨（未実装）
- **入力検証**: Zodスキーマによるバリデーション

---

## 10. デプロイ・運用

### 10.1 環境変数

| 変数名 | 説明 |
|--------|------|
| `DATABASE_URL` | データベース接続文字列 |
| `JWT_SECRET` | JWTシークレット |
| `VITE_APP_ID` | アプリケーションID |
| `OAUTH_SERVER_URL` | OAuth認証サーバーURL |
| `STRIPE_SECRET_KEY` | Stripe秘密鍵 |
| `STRIPE_PUBLISHABLE_KEY` | Stripe公開鍵 |
| `BUILT_IN_FORGE_API_KEY` | Manus API キー |

### 10.2 デプロイ手順

1. GitHubリポジトリにプッシュ
2. Manus管理画面からPublishボタンをクリック
3. 自動デプロイが実行される

### 10.3 データベースマイグレーション

```bash
pnpm db:push
```

---

## 11. 今後の拡張予定

### 11.1 未実装機能

| 機能 | 優先度 | 説明 |
|------|--------|------|
| LINE Pay決済画面連携 | 中 | APIヘルパーは実装済み |
| 楽天ペイ決済画面連携 | 中 | APIヘルパーは実装済み |
| 振込スケジュール自動生成 | 低 | 月末締め翌月10日振込 |
| 車両ナンバーと入庫記録の紐付け | 中 | 自動マッチング機能 |
| カメラ設定管理UI | 中 | オペレーターページに追加 |

### 11.2 改善候補

- Rate Limitingの実装
- APIキーの暗号化強化
- 多言語対応
- PWA対応（オフライン機能）
- プッシュ通知

---

## 12. 付録

### 12.1 ファイル構成

```
parking-system/
├── client/
│   ├── src/
│   │   ├── pages/           # ページコンポーネント
│   │   ├── components/      # 共通コンポーネント
│   │   ├── contexts/        # Reactコンテキスト
│   │   ├── hooks/           # カスタムフック
│   │   ├── lib/             # ユーティリティ
│   │   └── App.tsx          # ルーティング
│   └── index.html
├── server/
│   ├── _core/               # フレームワーク基盤
│   ├── db.ts                # データベースヘルパー
│   ├── routers.ts           # tRPCルーター
│   ├── lpr.ts               # LPR API連携
│   ├── paypay.ts            # PayPay API連携
│   └── storage.ts           # S3ストレージ
├── drizzle/
│   └── schema.ts            # データベーススキーマ
├── shared/
│   └── const.ts             # 共通定数
└── package.json
```

### 12.2 主要コンポーネント一覧

| コンポーネント | ファイル | 説明 |
|---------------|---------|------|
| OwnerDashboard | pages/OwnerDashboard.tsx | オーナーダッシュボード |
| OperatorDashboard | pages/OperatorDashboard.tsx | 運営者ダッシュボード |
| Scan | pages/Scan.tsx | QRスキャン・入出庫画面 |
| VehicleNumberRecords | pages/VehicleNumberRecords.tsx | 車両ナンバー履歴 |
| DashboardLayout | components/DashboardLayout.tsx | ダッシュボードレイアウト |

---

**以上**
