# 駐車場システム 本番環境アップデートガイド

このドキュメントでは、デモ版から最新版へアップデートするために必要な変更ファイルと、その具体的な変更内容を説明します。

---

## 目次

1. [概要](#概要)
2. [データベーススキーマの変更](#データベーススキーマの変更)
3. [サーバー側の変更](#サーバー側の変更)
4. [クライアント側の変更](#クライアント側の変更)
5. [新規ファイル](#新規ファイル)
6. [適用手順](#適用手順)

---

## 概要

今回のアップデートで追加された主な機能は以下の通りです：

| 機能 | 説明 |
|------|------|
| グローバル決済設定 | オペレーターが一元管理する決済設定（PayPay、楽天ペイ、LINE Pay、Apple Pay、交通系IC、クレジットカード） |
| オーナー別売上集計 | 各オーナーの売上を分離して管理・表示 |
| CSVエクスポート | オーナー別売上データをCSV形式でダウンロード |
| オーナーページリンク | オペレーター画面から各オーナーの管理ページへ直接アクセス |

---

## データベーススキーマの変更

### ファイル: `drizzle/schema.ts`

**追加するテーブル定義（ファイル末尾に追加）:**

```typescript
// ========== グローバル決済設定 ==========
export const globalPaymentSettings = mysqlTable("global_payment_settings", {
  id: int("id").primaryKey().autoincrement(),
  method: mysqlEnum("method", ["paypay", "rakuten_pay", "line_pay", "apple_pay", "ic_card", "credit_card"]).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  apiKey: varchar("api_key", { length: 500 }),
  apiSecret: varchar("api_secret", { length: 500 }),
  merchantId: varchar("merchant_id", { length: 255 }),
  stripeSecretKey: varchar("stripe_secret_key", { length: 500 }),
  stripePublishableKey: varchar("stripe_publishable_key", { length: 500 }),
  feePercentage: decimal("fee_percentage", { precision: 5, scale: 2 }).default("0"),
  feeFixed: int("fee_fixed").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type GlobalPaymentSetting = typeof globalPaymentSettings.$inferSelect;
export type InsertGlobalPaymentSetting = typeof globalPaymentSettings.$inferInsert;
```

**データベースマイグレーション用SQL:**

```sql
CREATE TABLE IF NOT EXISTS global_payment_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  method ENUM('paypay', 'rakuten_pay', 'line_pay', 'apple_pay', 'ic_card', 'credit_card') NOT NULL,
  enabled BOOLEAN DEFAULT TRUE NOT NULL,
  api_key VARCHAR(500),
  api_secret VARCHAR(500),
  merchant_id VARCHAR(255),
  stripe_secret_key VARCHAR(500),
  stripe_publishable_key VARCHAR(500),
  fee_percentage DECIMAL(5, 2) DEFAULT 0,
  fee_fixed INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
);
```

---

## サーバー側の変更

### ファイル: `server/db.ts`

#### 1. インポートの追加（ファイル先頭）

```typescript
import { 
  // 既存のインポートに追加
  globalPaymentSettings, 
  InsertGlobalPaymentSetting 
} from "../drizzle/schema";
```

#### 2. グローバル決済設定関連の関数を追加（ファイル末尾）

```typescript
// ========== Global Payment Settings ==========

// 全てのグローバル決済設定を取得
export async function getAllGlobalPaymentSettings() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(globalPaymentSettings).orderBy(globalPaymentSettings.id);
}

// 有効なグローバル決済設定のみ取得
export async function getEnabledGlobalPaymentSettings() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(globalPaymentSettings).where(eq(globalPaymentSettings.enabled, true));
}

// 決済方法でグローバル決済設定を取得
export async function getGlobalPaymentSettingByMethod(method: string) {
  const db = await getDb();
  if (!db) return null;
  
  const results = await db.select().from(globalPaymentSettings).where(eq(globalPaymentSettings.method, method as any));
  return results[0] || null;
}

// グローバル決済設定を作成または更新（upsert）
export async function upsertGlobalPaymentSetting(data: Partial<InsertGlobalPaymentSetting> & { method: InsertGlobalPaymentSetting['method'] }) {
  const db = await getDb();
  if (!db) return;
  
  const existing = await getGlobalPaymentSettingByMethod(data.method);
  
  if (existing) {
    // 更新
    const updateData: Record<string, any> = {};
    if (data.enabled !== undefined) updateData.enabled = data.enabled;
    if (data.apiKey !== undefined) updateData.apiKey = data.apiKey;
    if (data.apiSecret !== undefined) updateData.apiSecret = data.apiSecret;
    if (data.merchantId !== undefined) updateData.merchantId = data.merchantId;
    if (data.stripeSecretKey !== undefined) updateData.stripeSecretKey = data.stripeSecretKey;
    if (data.stripePublishableKey !== undefined) updateData.stripePublishableKey = data.stripePublishableKey;
    if (data.feePercentage !== undefined) updateData.feePercentage = data.feePercentage;
    if (data.feeFixed !== undefined) updateData.feeFixed = data.feeFixed;
    
    await db.update(globalPaymentSettings)
      .set(updateData)
      .where(eq(globalPaymentSettings.method, data.method));
  } else {
    // 新規作成
    await db.insert(globalPaymentSettings).values({
      method: data.method,
      enabled: data.enabled ?? true,
      apiKey: data.apiKey,
      apiSecret: data.apiSecret,
      merchantId: data.merchantId,
      stripeSecretKey: data.stripeSecretKey,
      stripePublishableKey: data.stripePublishableKey,
      feePercentage: data.feePercentage ?? "0",
      feeFixed: data.feeFixed ?? 0,
    });
  }
}

// グローバル決済設定を削除
export async function deleteGlobalPaymentSetting(id: number) {
  const db = await getDb();
  if (!db) return;
  
  await db.delete(globalPaymentSettings).where(eq(globalPaymentSettings.id, id));
}


// ========== CSVエクスポート用売上データ取得 ==========

// オーナーの売上データをCSVエクスポート用に取得（期間指定対応）
export async function getOwnerSalesDataForExport(ownerId: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select({
    id: paymentRecords.id,
    parkingLotId: paymentRecords.parkingLotId,
    spaceNumber: paymentRecords.spaceNumber,
    entryTime: paymentRecords.entryTime,
    exitTime: paymentRecords.exitTime,
    durationMinutes: paymentRecords.durationMinutes,
    amount: paymentRecords.amount,
    paymentMethod: paymentRecords.paymentMethod,
    paymentStatus: paymentRecords.paymentStatus,
    transactionId: paymentRecords.transactionId,
    isDemo: paymentRecords.isDemo,
    createdAt: paymentRecords.createdAt,
  }).from(paymentRecords)
    .where(eq(paymentRecords.ownerId, ownerId))
    .orderBy(desc(paymentRecords.createdAt));

  const results = await query;

  // 期間フィルタリング（createdAtベース）
  let filteredResults = results;
  if (startDate || endDate) {
    filteredResults = results.filter(record => {
      const recordDate = new Date(record.createdAt);
      if (startDate && recordDate < startDate) return false;
      if (endDate && recordDate > endDate) return false;
      return true;
    });
  }

  return filteredResults;
}

// 全オーナーの売上データをCSVエクスポート用に取得（期間指定対応）
export async function getAllSalesDataForExport(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return [];

  const results = await db.select({
    id: paymentRecords.id,
    ownerId: paymentRecords.ownerId,
    parkingLotId: paymentRecords.parkingLotId,
    spaceNumber: paymentRecords.spaceNumber,
    entryTime: paymentRecords.entryTime,
    exitTime: paymentRecords.exitTime,
    durationMinutes: paymentRecords.durationMinutes,
    amount: paymentRecords.amount,
    paymentMethod: paymentRecords.paymentMethod,
    paymentStatus: paymentRecords.paymentStatus,
    transactionId: paymentRecords.transactionId,
    isDemo: paymentRecords.isDemo,
    createdAt: paymentRecords.createdAt,
  }).from(paymentRecords)
    .orderBy(desc(paymentRecords.createdAt));

  // 期間フィルタリング
  let filteredResults = results;
  if (startDate || endDate) {
    filteredResults = results.filter(record => {
      const recordDate = new Date(record.createdAt);
      if (startDate && recordDate < startDate) return false;
      if (endDate && recordDate > endDate) return false;
      return true;
    });
  }

  return filteredResults;
}
```

---

### ファイル: `server/routers.ts`

#### 1. インポートの追加（ファイル先頭のインポート部分）

```typescript
import {
  // 既存のインポートに追加
  getAllGlobalPaymentSettings,
  getEnabledGlobalPaymentSettings,
  getGlobalPaymentSettingByMethod,
  upsertGlobalPaymentSetting,
  deleteGlobalPaymentSetting,
  getOwnerSalesDataForExport,
  getAllSalesDataForExport,
} from "./db";
```

#### 2. parkingルーターに追加（parkingルーター内）

```typescript
// グローバル決済設定取得（有効な決済方法のみ）
getEnabledPaymentMethods: publicProcedure.query(async () => {
  const settings = await getEnabledGlobalPaymentSettings();
  return settings.map(s => ({
    method: s.method,
    enabled: s.enabled,
    // APIキーなどの機密情報は除外
  }));
}),
```

#### 3. operatorルーターに追加（operatorルーター内）

```typescript
// ========== グローバル決済設定 ==========
// 全グローバル決済設定取得
getGlobalPaymentSettings: adminProcedure.query(async () => {
  return await getAllGlobalPaymentSettings();
}),

// グローバル決済設定追加
createGlobalPaymentSetting: adminProcedure
  .input(z.object({
    method: z.enum(['paypay', 'rakuten_pay', 'line_pay', 'apple_pay', 'ic_card', 'credit_card']),
    enabled: z.boolean().default(true),
    feePercentage: z.number().min(0).max(100).default(0),
    feeFixed: z.number().min(0).default(0),
    apiKey: z.string().optional(),
    apiSecret: z.string().optional(),
    merchantId: z.string().optional(),
  }))
  .mutation(async ({ input }) => {
    const existing = await getGlobalPaymentSettingByMethod(input.method);
    if (existing) {
      throw new TRPCError({ code: 'CONFLICT', message: 'この決済方法は既に設定されています' });
    }
    const id = await upsertGlobalPaymentSetting({
      ...input,
      feePercentage: input.feePercentage.toString(),
    });
    return { success: true, id };
  }),

// グローバル決済設定更新
updateGlobalPaymentSetting: adminProcedure
  .input(z.object({
    id: z.number(),
    enabled: z.boolean().optional(),
    feePercentage: z.number().min(0).max(100).optional(),
    feeFixed: z.number().min(0).optional(),
    apiKey: z.string().optional(),
    apiSecret: z.string().optional(),
    merchantId: z.string().optional(),
  }))
  .mutation(async ({ input }) => {
    const { id, ...updateData } = input;
    // 既存の設定を取得して更新
    const settings = await getAllGlobalPaymentSettings();
    const existing = settings.find((s: any) => s.id === id);
    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: '決済設定が見つかりません' });
    }
    await upsertGlobalPaymentSetting({
      method: existing.method,
      enabled: updateData.enabled ?? existing.enabled,
      feePercentage: (updateData.feePercentage ?? parseFloat(existing.feePercentage)).toString(),
      feeFixed: updateData.feeFixed ?? existing.feeFixed,
      apiKey: updateData.apiKey ?? existing.apiKey,
      apiSecret: updateData.apiSecret ?? existing.apiSecret,
      merchantId: updateData.merchantId ?? existing.merchantId,
    });
    return { success: true };
  }),

// グローバル決済設定削除
deleteGlobalPaymentSetting: adminProcedure
  .input(z.object({ id: z.number() }))
  .mutation(async ({ input }) => {
    await deleteGlobalPaymentSetting(input.id);
    return { success: true };
  }),

// ========== CSVエクスポート ==========
// オーナー別売上データCSVエクスポート
exportOwnerSalesCSV: adminProcedure
  .input(z.object({
    ownerId: z.number(),
    startDate: z.string().optional(), // ISO形式
    endDate: z.string().optional(),
  }))
  .query(async ({ input }) => {
    const startDate = input.startDate ? new Date(input.startDate) : undefined;
    const endDate = input.endDate ? new Date(input.endDate) : undefined;
    
    const data = await getOwnerSalesDataForExport(input.ownerId, startDate, endDate);
    const owner = await getUserById(input.ownerId);
    
    // CSVヘッダー
    const headers = [
      'ID',
      '取引日時',
      '駐車場ID',
      'スペース番号',
      '入庫時刻',
      '出庫時刻',
      '駐車時間(分)',
      '金額(円)',
      '決済方法',
      '決済ステータス',
      'トランザクションID',
      'デモ決済',
    ];
    
    const paymentMethodLabels: Record<string, string> = {
      'paypay': 'PayPay',
      'credit_card': 'クレジットカード',
      'stripe': 'Stripe',
      'square': 'Square',
      'line_pay': 'LINE Pay',
      'rakuten_pay': '楽天ペイ',
      'apple_pay': 'Apple Pay',
    };
    
    const rows = data.map(record => [
      record.id,
      new Date(record.createdAt).toLocaleString('ja-JP'),
      record.parkingLotId || '',
      record.spaceNumber,
      new Date(record.entryTime).toLocaleString('ja-JP'),
      new Date(record.exitTime).toLocaleString('ja-JP'),
      record.durationMinutes,
      record.amount,
      paymentMethodLabels[record.paymentMethod] || record.paymentMethod,
      record.paymentStatus === 'completed' ? '完了' : record.paymentStatus === 'pending' ? '保留' : '失敗',
      record.transactionId || '',
      record.isDemo ? 'はい' : 'いいえ',
    ]);
    
    // CSV文字列を生成
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    // 集計情報
    const totalAmount = data.filter(r => r.paymentStatus === 'completed').reduce((sum, r) => sum + r.amount, 0);
    const totalTransactions = data.filter(r => r.paymentStatus === 'completed').length;
    
    return {
      csv: csvContent,
      filename: `sales_${owner?.name || 'owner'}_${new Date().toISOString().split('T')[0]}.csv`,
      summary: {
        totalRecords: data.length,
        completedTransactions: totalTransactions,
        totalAmount,
      }
    };
  }),
```

---

## クライアント側の変更

### ファイル: `client/src/pages/OperatorDashboard.tsx`

#### 1. インポートの追加（ファイル先頭）

```typescript
import { Loader2, Trash2, X, Plus, Download, QrCode, CreditCard, Users, ExternalLink, FileDown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GlobalPaymentSettingsTab } from "@/components/GlobalPaymentSettingsTab";
```

#### 2. ステートの追加（コンポーネント内）

```typescript
// CSVエクスポート用のステート
const [showExportDialog, setShowExportDialog] = useState(false);
const [exportStartDate, setExportStartDate] = useState('');
const [exportEndDate, setExportEndDate] = useState('');
const [isExporting, setIsExporting] = useState(false);
```

#### 3. オーナーカードにリンクボタンを追加

オーナー一覧のカード部分に以下を追加：

```tsx
{owner.customUrl && (
  <Button
    variant="ghost"
    size="sm"
    onClick={(e) => {
      e.stopPropagation();
      window.open(`/owner/${owner.customUrl}`, '_blank');
    }}
    title="オーナーページを開く"
  >
    <ExternalLink className="h-4 w-4" />
  </Button>
)}
```

#### 4. 売上情報カードにCSVエクスポートボタンを追加

売上情報カードのヘッダー部分に以下を追加：

```tsx
<Button
  variant="outline"
  size="sm"
  onClick={() => setShowExportDialog(true)}
>
  <FileDown className="h-4 w-4 mr-2" />
  CSVエクスポート
</Button>
```

#### 5. CSVエクスポートダイアログを追加（コンポーネント末尾）

```tsx
{/* CSVエクスポートダイアログ */}
<Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>売上データCSVエクスポート</DialogTitle>
      <DialogDescription>
        {selectedOwnerDetail?.user.name}の売上データをCSV形式でダウンロードします
      </DialogDescription>
    </DialogHeader>
    <div className="space-y-4">
      <div>
        <Label>開始日（任意）</Label>
        <Input
          type="date"
          value={exportStartDate}
          onChange={(e) => setExportStartDate(e.target.value)}
        />
      </div>
      <div>
        <Label>終了日（任意）</Label>
        <Input
          type="date"
          value={exportEndDate}
          onChange={(e) => setExportEndDate(e.target.value)}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        日付を指定しない場合は全期間のデータをエクスポートします
      </p>
    </div>
    <div className="flex gap-2 justify-end">
      <Button
        variant="outline"
        onClick={() => {
          setShowExportDialog(false);
          setExportStartDate('');
          setExportEndDate('');
        }}
      >
        キャンセル
      </Button>
      <Button
        onClick={async () => {
          if (!selectedOwnerId) return;
          setIsExporting(true);
          try {
            const response = await fetch(`/api/trpc/operator.exportOwnerSalesCSV?input=${encodeURIComponent(JSON.stringify({
              ownerId: selectedOwnerId,
              startDate: exportStartDate || undefined,
              endDate: exportEndDate || undefined,
            }))}`);
            const data = await response.json();
            const result = data.result.data;
            
            // CSVダウンロード
            const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = result.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            toast.success(`エクスポート完了: ${result.summary.completedTransactions}件の取引、合計¥${result.summary.totalAmount.toLocaleString()}`);
            setShowExportDialog(false);
            setExportStartDate('');
            setExportEndDate('');
          } catch (error) {
            toast.error('エクスポートに失敗しました');
          } finally {
            setIsExporting(false);
          }
        }}
        disabled={isExporting}
      >
        {isExporting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            エクスポート中...
          </>
        ) : (
          <>
            <FileDown className="h-4 w-4 mr-2" />
            ダウンロード
          </>
        )}
      </Button>
    </div>
  </DialogContent>
</Dialog>
```

#### 6. タブ構造の追加（メインコンテンツ部分）

OperatorDashboard全体をTabsで囲み、「オーナー管理」と「決済設定」の2つのタブを追加：

```tsx
<Tabs defaultValue="owners" className="w-full">
  <TabsList className="grid w-full grid-cols-2 mb-6">
    <TabsTrigger value="owners">オーナー管理</TabsTrigger>
    <TabsTrigger value="payment">決済設定</TabsTrigger>
  </TabsList>
  
  <TabsContent value="owners">
    {/* 既存のオーナー管理コンテンツ */}
  </TabsContent>
  
  <TabsContent value="payment">
    <GlobalPaymentSettingsTab />
  </TabsContent>
</Tabs>
```

---

### ファイル: `client/src/pages/Scan.tsx`

#### 1. 型定義の追加（ファイル先頭）

```typescript
// 決済方法の型定義
type PaymentMethodType = "paypay" | "credit_card" | "stripe" | "square" | "line_pay" | "rakuten_pay" | "apple_pay" | "ic_card";

// グローバル決済方法の型定義
type GlobalPaymentMethod = "paypay" | "rakuten_pay" | "line_pay" | "apple_pay" | "ic_card" | "credit_card";

// 決済方法の表示情報
const PAYMENT_METHOD_INFO: Record<GlobalPaymentMethod, { name: string; color: string; icon: "smartphone" | "credit_card" | "train" }> = {
  paypay: { name: "PayPay", color: "#FF0033", icon: "smartphone" },
  rakuten_pay: { name: "楽天ペイ", color: "#BF0000", icon: "smartphone" },
  line_pay: { name: "LINE Pay", color: "#00C300", icon: "smartphone" },
  apple_pay: { name: "Apple Pay", color: "#000000", icon: "smartphone" },
  ic_card: { name: "交通系IC", color: "#0066CC", icon: "train" },
  credit_card: { name: "クレジットカード", color: "#374151", icon: "credit_card" },
};
```

#### 2. インポートの追加

```typescript
import { Car, QrCode, Camera, ArrowLeft, CheckCircle2, Clock, Loader2, CreditCard, ExternalLink, Smartphone, Train } from "lucide-react";
```

#### 3. PaymentViewコンポーネント内にグローバル決済設定取得を追加

```typescript
// グローバル決済設定を取得
const { data: globalPaymentMethods } = trpc.parking.getEnabledPaymentMethods.useQuery();

// グローバル決済設定から有効な決済方法を取得
const enabledGlobalMethods = globalPaymentMethods?.map(m => m.method) || [];
const hasGlobalPaymentMethods = enabledGlobalMethods.length > 0;
```

#### 4. 決済方法選択UIにグローバル決済方法を表示

```tsx
{/* グローバル決済設定による決済方法 */}
{hasGlobalPaymentMethods && (
  <>
    {!hasRealCardPayment && !hasRealPayPay && (
      <div className="text-xs text-muted-foreground text-center py-2 border-t mt-4 pt-4">
        利用可能な決済方法
      </div>
    )}
    
    {enabledGlobalMethods.map((method) => {
      const info = PAYMENT_METHOD_INFO[method as GlobalPaymentMethod];
      if (!info) return null;
      
      // 既に実決済で表示されている場合はスキップ
      if (method === "paypay" && hasRealPayPay) return null;
      if (method === "credit_card" && hasRealCardPayment) return null;
      
      const methodKey = method as PaymentMethodType;
      
      return (
        <button
          key={method}
          onClick={() => setPaymentMethod(methodKey)}
          className={`w-full p-4 rounded-xl border-2 transition-all ${
            paymentMethod === methodKey
              ? "border-[var(--success)] bg-[var(--success)]/10"
              : "border-border hover:border-muted-foreground"
          }`}
        >
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: info.color }}
            >
              {getIcon(info.icon)}
            </div>
            <div className="text-left flex-1">
              <p className="font-bold">{info.name}</p>
              <p className="text-sm text-muted-foreground">
                {info.icon === "smartphone" ? "QRコード決済" : 
                 info.icon === "train" ? "タッチ決済" : "カード決済"}
              </p>
            </div>
            {paymentMethod === methodKey && (
              <CheckCircle2 className="w-6 h-6" style={{ color: 'var(--success)' }} />
            )}
          </div>
        </button>
      );
    })}
  </>
)}
```

---

## 新規ファイル

### ファイル: `client/src/components/GlobalPaymentSettingsTab.tsx`

このファイルは新規作成が必要です。完全なコードは管理UIの「Code」パネルからダウンロードしてください。

主な機能：
- 決済方法の選択（PayPay、楽天ペイ、LINE Pay、Apple Pay、交通系IC、クレジットカード）
- APIキー、APIシークレット、マーチャントIDの入力
- 手数料率と固定手数料の設定
- 設定済み決済方法の一覧表示と管理（有効/無効切り替え、削除）

---

## 適用手順

### 1. データベースの更新

```bash
# マイグレーションを実行（または直接SQLを実行）
pnpm db:push
```

または、上記のSQLを直接データベースで実行してください。

### 2. サーバー側ファイルの更新

1. `drizzle/schema.ts` にテーブル定義を追加
2. `server/db.ts` にインポートと関数を追加
3. `server/routers.ts` にインポートとAPIエンドポイントを追加

### 3. クライアント側ファイルの更新

1. `client/src/components/GlobalPaymentSettingsTab.tsx` を新規作成
2. `client/src/pages/OperatorDashboard.tsx` を更新
3. `client/src/pages/Scan.tsx` を更新

### 4. 依存関係の確認

新しい依存関係は追加されていません。既存のパッケージで動作します。

### 5. サーバーの再起動

```bash
pnpm dev
```

---

## 注意事項

- 本番環境で独自にカスタマイズした部分がある場合は、マージ時に注意してください
- データベーススキーマの変更は、既存データに影響を与えないように設計されています
- APIキーなどの機密情報は、環境変数または安全な方法で管理してください

---

**作成日**: 2026年1月21日  
**作成者**: Manus AI
