'use client';

import { useState, createContext, useContext } from 'react';
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  TrendingUp,
  CircleDollarSign,
  User,
  Phone,
  Mail,
  Edit,
  Loader2,
  Clock,
  Building2,
  Car,
} from "lucide-react";
import { Link, useRoute } from "wouter";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// カスタムURLコンテキスト
const CustomUrlContext = createContext<string | null>(null);

function useCustomUrl() {
  return useContext(CustomUrlContext);
}

export default function OwnerDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [match, params] = useRoute("/owner/:customUrl");
  
  // カスタムURL経由でアクセスした場合、そのオーナーのデータを取得
  const customUrl = match && params?.customUrl ? (params.customUrl as string) : null;
  const { data: ownerData } = trpc.operator.getOwnerByCustomUrl.useQuery(
    { customUrl: customUrl || '' },
    { enabled: !!customUrl }
  );

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <header className="border-b bg-card">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/">
                <span className="text-2xl font-bold tracking-tight cursor-pointer">ParkEase</span>
              </Link>
              <Badge variant="outline">オーナー</Badge>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary">デモ版</Badge>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container py-8">
        <CustomUrlContext.Provider value={customUrl}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 lg:w-[450px]">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">売上</span>
              </TabsTrigger>
              <TabsTrigger value="vehicles" className="flex items-center gap-2">
                <Car className="h-4 w-4" />
                <span className="hidden sm:inline">車両</span>
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">設定</span>
              </TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="overview">
                <OverviewTab />
              </TabsContent>
              <TabsContent value="profile">
                <ProfileTab />
              </TabsContent>
              <TabsContent value="vehicles">
                <VehiclesTab />
              </TabsContent>
            </div>
          </Tabs>
        </CustomUrlContext.Provider>
      </main>
    </div>
  );
}

// 概要タブ
function OverviewTab() {
  const customUrl = useCustomUrl();
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  
  const { data: salesSummary, isLoading: summaryLoading } = trpc.owner.getSalesSummary.useQuery(
    customUrl ? { customUrl } : undefined
  );
  const { data: dailyData, isLoading: dailyLoading } = trpc.owner.getDailySalesData.useQuery(
    customUrl ? { customUrl } : undefined
  );
  const { data: monthlyData, isLoading: monthlyLoading } = trpc.owner.getMonthlySalesData.useQuery(
    customUrl ? { customUrl } : undefined
  );
  const { data: bankInfo } = trpc.owner.getBankInfo.useQuery(
    customUrl ? { customUrl } : undefined
  );
  const { data: payoutSchedules, isLoading: payoutLoading } = trpc.owner.getPayoutSchedules.useQuery(
    customUrl ? { customUrl } : undefined
  );
  const { data: availableYearMonths } = trpc.owner.getAvailableYearMonths.useQuery();
  const { data: selectedMonthSales, isLoading: selectedMonthLoading } = trpc.owner.getMonthlySalesByYearMonth.useQuery(
    { year: selectedYear, month: selectedMonth, customUrl: customUrl || undefined },
    { enabled: !!selectedYear && !!selectedMonth }
  );

  if (summaryLoading || dailyLoading || monthlyLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* サマリーカード */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">総売上</CardTitle>
          <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">¥{(salesSummary?.totalAmount || 0).toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            {salesSummary?.totalTransactions || 0}件の取引
          </p>
        </CardContent>
      </Card>

      {/* 月別売上選択 */}
      <Card>
        <CardHeader>
          <CardTitle>月別売上</CardTitle>
          <CardDescription>年月を選択して売上を確認</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <Label htmlFor="year-select">年</Label>
              <select
                id="year-select"
                className="w-full mt-1 p-2 border rounded-md bg-background"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              >
                {(() => {
                  const years: number[] = availableYearMonths?.map((ym: { year: number; month: number; label: string }) => ym.year) || [];
                  const uniqueYears: number[] = Array.from(new Set(years));
                  return uniqueYears.map((year: number) => (
                    <option key={year} value={year}>{year}年</option>
                  ));
                })()}
              </select>
            </div>
            <div className="flex-1">
              <Label htmlFor="month-select">月</Label>
              <select
                id="month-select"
                className="w-full mt-1 p-2 border rounded-md bg-background"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => (
                  <option key={month} value={month}>{month}月</option>
                ))}
              </select>
            </div>
          </div>
          
          {selectedMonthLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="bg-muted/50 rounded-lg p-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  {selectedYear}年{selectedMonth}月の売上
                </p>
                <div className="text-4xl font-bold text-primary">
                  ¥{(selectedMonthSales?.totalAmount || 0).toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {selectedMonthSales?.totalTransactions || 0}件の取引
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 日ごとの売上グラフ */}
      <Card>
        <CardHeader>
          <CardTitle>日ごとの売上</CardTitle>
          <CardDescription>過去30日間の売上推移</CardDescription>
        </CardHeader>
        <CardContent>
          {dailyData && dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  interval={Math.floor(dailyData.length / 7)}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value) => `¥${value.toLocaleString()}`}
                  labelFormatter={(label) => `${label}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#3b82f6" 
                  dot={false}
                  name="売上"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">売上データがありません</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 月ごとの売上グラフ */}
      <Card>
        <CardHeader>
          <CardTitle>月ごとの売上</CardTitle>
          <CardDescription>過去12ヶ月間の売上推移</CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyData && monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  interval={Math.floor(monthlyData.length / 6)}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value) => `¥${value.toLocaleString()}`}
                  labelFormatter={(label) => `${label}`}
                />
                <Legend />
                <Bar 
                  dataKey="amount" 
                  fill="#10b981"
                  name="売上"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">売上データがありません</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 振込スケジュール */}
      <PayoutScheduleCard payoutSchedules={payoutSchedules} isLoading={payoutLoading} />

      {/* 振込先設定 */}
      <BankInfoCard bankInfo={bankInfo} />
    </div>
  );
}

// 振込先設定カード
function BankInfoCard({ bankInfo }: any) {
  const customUrl = useCustomUrl();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    bankName: bankInfo?.bankName || '',
    branchName: bankInfo?.branchName || '',
    accountType: bankInfo?.accountType || 'savings',
    accountNumber: bankInfo?.accountNumber || '',
    accountHolder: bankInfo?.accountHolder || '',
  });

  const utils = trpc.useUtils();
  const updateMutation = trpc.owner.updateBankInfo.useMutation({
    onSuccess: () => {
      toast.success('振込先情報を更新しました');
      setIsEditing(false);
      utils.owner.getBankInfo.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>振込先設定</CardTitle>
        <CardDescription>売上の振込先銀行口座を設定してください</CardDescription>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bankName">銀行名 *</Label>
              <Input
                id="bankName"
                value={editData.bankName}
                onChange={(e) => setEditData({ ...editData, bankName: e.target.value })}
                placeholder="例: 〇〇銀行"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branchName">支店名</Label>
              <Input
                id="branchName"
                value={editData.branchName}
                onChange={(e) => setEditData({ ...editData, branchName: e.target.value })}
                placeholder="例: 〇〇支店"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountType">口座種別 *</Label>
              <select
                id="accountType"
                value={editData.accountType}
                onChange={(e) => setEditData({ ...editData, accountType: e.target.value as 'checking' | 'savings' })}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="savings">普通預金</option>
                <option value="checking">当座預金</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountNumber">口座番号 *</Label>
              <Input
                id="accountNumber"
                value={editData.accountNumber}
                onChange={(e) => setEditData({ ...editData, accountNumber: e.target.value })}
                placeholder="例: 1234567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountHolder">口座名義人 *</Label>
              <Input
                id="accountHolder"
                value={editData.accountHolder}
                onChange={(e) => setEditData({ ...editData, accountHolder: e.target.value })}
                placeholder="例: ヤマダ タロウ"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => updateMutation.mutate({ ...editData, customUrl: customUrl || undefined })}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? '保存中...' : '保存'}
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                キャンセル
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {bankInfo?.bankName ? (
              <>
                <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">銀行名</p>
                    <p className="font-medium">{bankInfo.bankName}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">支店名</p>
                    <p className="font-medium">{bankInfo.branchName || '-'}</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">口座種別</p>
                    <p className="font-medium">
                      {bankInfo.accountType === 'savings' ? '普通預金' : '当座預金'}
                    </p>
                  </div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">口座番号</p>
                  <p className="font-medium">{bankInfo.accountNumber}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">口座名義人</p>
                  <p className="font-medium">{bankInfo.accountHolder}</p>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">振込先情報がまだ設定されていません</p>
              </div>
            )}
            <Button 
              variant="outline"
              onClick={() => {
                setEditData({
                  bankName: bankInfo?.bankName || '',
                  branchName: bankInfo?.branchName || '',
                  accountType: bankInfo?.accountType || 'savings',
                  accountNumber: bankInfo?.accountNumber || '',
                  accountHolder: bankInfo?.accountHolder || '',
                });
                setIsEditing(true);
              }}
            >
              <Edit className="mr-2 h-4 w-4" />
              {bankInfo?.bankName ? '編集' : '設定'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 振込スケジュールカード
function PayoutScheduleCard({ payoutSchedules, isLoading }: { payoutSchedules: any; isLoading: boolean }) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>振込スケジュール</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // 次回振込予定日を計算（毎月15日と仮定）
  const getNextPayoutDate = () => {
    const now = new Date();
    const currentDay = now.getDate();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    if (currentDay < 15) {
      return new Date(year, month, 15);
    } else {
      return new Date(year, month + 1, 15);
    }
  };

  const nextPayoutDate = getNextPayoutDate();
  const pendingAmount = payoutSchedules?.pendingAmount || 0;
  const lastPayoutDate = payoutSchedules?.lastPayoutDate;
  const lastPayoutAmount = payoutSchedules?.lastPayoutAmount || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          振込スケジュール
        </CardTitle>
        <CardDescription>毎月15日に前月分の売上を振込みます</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 次回振込予定 */}
        <div className="p-4 bg-primary/10 rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">次回振込予定日</p>
          <p className="text-2xl font-bold text-primary">
            {nextPayoutDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <p className="text-sm text-muted-foreground mt-2">振込予定額</p>
          <p className="text-xl font-semibold">¥{pendingAmount.toLocaleString()}</p>
        </div>

        {/* 前回振込実績 */}
        {lastPayoutDate && (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">前回振込実績</p>
            <p className="font-medium">
              {new Date(lastPayoutDate).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <p className="text-lg font-semibold mt-1">¥{lastPayoutAmount.toLocaleString()}</p>
          </div>
        )}

        <Separator />

        <div className="text-sm text-muted-foreground">
          <p>※ 振込は登録された銀行口座に行われます</p>
          <p>※ 振込手数料は運営者が負担します</p>
        </div>
      </CardContent>
    </Card>
  );
}

// プロフィールタブ
function ProfileTab() {
  const customUrl = useCustomUrl();
  const { data, isLoading } = trpc.owner.getMyPage.useQuery(
    customUrl ? { customUrl } : undefined
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  const utils = trpc.useUtils();
  const updateMutation = trpc.owner.updateProfile.useMutation({
    onSuccess: () => {
      toast.success('プロフィールを更新しました');
      setIsEditing(false);
      utils.owner.getMyPage.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  const { user } = data;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">アカウント設定</h2>
        <p className="text-sm text-muted-foreground">プロフィール情報の管理</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>プロフィール</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>名前</Label>
                <Input
                  value={editData?.name || ''}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>メールアドレス</Label>
                <Input
                  type="email"
                  value={editData?.email || ''}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>電話番号</Label>
                <Input
                  value={editData?.phone || ''}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => updateMutation.mutate({ ...editData, customUrl: customUrl || undefined })}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? '保存中...' : '保存'}
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  キャンセル
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">名前</p>
                  <p>{user.name || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">メールアドレス</p>
                  <p>{user.email || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">電話番号</p>
                  <p>{user.phone || '-'}</p>
                </div>
              </div>
              <Button 
                variant="outline"
                onClick={() => {
                  setEditData({
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                  });
                  setIsEditing(true);
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                編集
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>アカウント情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">アカウントタイプ</p>
            <Badge>{user.role === 'admin' ? '管理者' : 'オーナー'}</Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">ステータス</p>
            <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
              {user.status === 'active' ? '有効' : user.status === 'pending' ? '承認待ち' : '停止中'}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">登録日</p>
            <p>{new Date(user.createdAt).toLocaleDateString('ja-JP')}</p>
          </div>
        </CardContent>
      </Card>

      <ParkingLotSettingsCard />
    </div>
  );
}

// 駐車場設定カード（読み取り専用）
function ParkingLotSettingsCard() {
  const customUrl = useCustomUrl();
  
  const { data: parkingLots, isLoading, error } = customUrl 
    ? trpc.parking.getParkingLotsByCustomUrl.useQuery({ customUrl })
    : trpc.owner.getParkingLots.useQuery();

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>駐車場設定</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">エラーが発生しました: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>駐車場設定</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!parkingLots || parkingLots.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>駐車場設定</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">駐車場情報が見つかりません</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {parkingLots.map((parkingLot: any) => (
        <Card key={parkingLot.id}>
          <CardHeader>
            <CardTitle>{parkingLot.name}</CardTitle>
            <CardDescription>管理者が設定した駐車場の仕様（読み取り専用）</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 駐車台数と入庫状況 */}
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">駐車台数・入庫状況</p>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-2xl font-semibold">{parkingLot.totalSpaces}台</p>
                {parkingLot.spaces && (() => {
                  const occupied = parkingLot.spaces.filter((s: { status: string }) => s.status === 'occupied').length;
                  const available = parkingLot.spaces.filter((s: { status: string }) => s.status === 'available').length;
                  return (
                    <div className="flex gap-2">
                      <Badge variant="destructive">使用中 {occupied}</Badge>
                      <Badge className="bg-green-500">空き {available}</Badge>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* 入庫状況詳細 */}
            {parkingLot.spaces && parkingLot.spaces.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-muted-foreground" />
                  <p className="font-semibold">入庫状況詳細</p>
                </div>
                <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
                  {parkingLot.spaces.map((space: { id: number; spaceNumber: number; status: string }) => (
                    <div
                      key={space.id}
                      className={`p-2 rounded text-center text-xs font-medium ${
                        space.status === 'occupied'
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : 'bg-green-100 text-green-700 border border-green-200'
                      }`}
                    >
                      {space.spaceNumber}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  • 緑: 空き • 赤: 使用中
                </p>
              </div>
            )}

            {/* 料金設定 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <p className="font-semibold">料金設定</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">計算単位</p>
                  <p className="font-medium">{parkingLot.pricingUnitMinutes}分</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">料金</p>
                  <p className="font-medium">¥{parkingLot.pricingAmount}</p>
                </div>
              </div>
            </div>

            {/* 最大駐車料金 */}
            {parkingLot.maxDailyAmountEnabled && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                  <p className="font-semibold">1日の最大駐車料金</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium text-lg">¥{parkingLot.maxDailyAmount}</p>
                </div>
              </div>
            )}

            {/* 時間帯ごとの最大料金 */}
            {parkingLot.timePeriods && parkingLot.timePeriods.length > 0 && (
              <div className="space-y-3">
                <p className="font-semibold">時間帯ごとの最大料金</p>
                <div className="space-y-2">
                  {parkingLot.timePeriods.map((period: any, index: number) => (
                    <div key={index} className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        {period.startHour}:00 ～ {period.endHour}:00
                      </p>
                      <p className="font-medium">¥{period.maxAmount}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />
            <p className="text-xs text-muted-foreground">
              ※ 駐車場の設定は管理者により管理されています。変更が必要な場合は、管理者にお問い合わせください。
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}


// 車両ナンバータブ
function VehiclesTab() {
  const customUrl = useCustomUrl();
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: records, isLoading, refetch } = trpc.owner.getVehicleNumberRecords.useQuery({
    customUrl: customUrl || undefined,
    limit: 100,
  });

  interface VehicleRecord {
    id: number;
    parkingLotId: number;
    area: string | null;
    classNumber: string | null;
    kana: string | null;
    digits: string | null;
    fullNumber: string | null;
    plateType: string | null;
    plateUse: string | null;
    plateColor: string | null;
    imageUrl: string | null;
    recognitionSuccess: boolean;
    capturedAt: number;
    createdAt: Date;
  }

  // フィルタリング
  const filteredRecords = records?.filter((record: VehicleRecord) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      record.fullNumber?.toLowerCase().includes(query) ||
      record.area?.toLowerCase().includes(query) ||
      record.digits?.toLowerCase().includes(query)
    );
  }) || [];

  // 日時フォーマット
  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // プレートカラーのバッジ色
  const getPlateColorBadge = (color: string | null) => {
    switch (color) {
      case '白':
        return <Badge variant="outline" className="bg-white text-black border-gray-300">白</Badge>;
      case '緑':
        return <Badge className="bg-green-600">緑</Badge>;
      case '黄':
        return <Badge className="bg-yellow-400 text-black">黄</Badge>;
      case '黒':
        return <Badge className="bg-black text-white">黒</Badge>;
      default:
        return <Badge variant="secondary">{color || '不明'}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 統計サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">総記録数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{records?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              認識成功
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {records?.filter((r: VehicleRecord) => r.recognitionSuccess).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">認識失敗</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {records?.filter((r: VehicleRecord) => !r.recognitionSuccess).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 検索 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">車両ナンバー検索</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="ナンバーで検索（例：練馬、1234）"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={() => refetch()}>
              更新
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 記録一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>認識履歴</CardTitle>
          <CardDescription>
            監視カメラで撮影された車両ナンバーの認識結果（最新100件）
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Car className="h-12 w-12 mb-4 opacity-50" />
              <p>車両ナンバーの記録がありません</p>
              <p className="text-sm mt-2">カメラから画像が送信されると、ここに表示されます</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRecords.map((record: VehicleRecord) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${record.recognitionSuccess ? 'bg-green-100' : 'bg-red-100'}`}>
                      <Car className={`h-5 w-5 ${record.recognitionSuccess ? 'text-green-600' : 'text-red-600'}`} />
                    </div>
                    <div>
                      {record.recognitionSuccess && record.fullNumber ? (
                        <div className="font-bold text-lg">{record.fullNumber}</div>
                      ) : (
                        <div className="text-muted-foreground">認識失敗</div>
                      )}
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(record.capturedAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {record.plateColor && getPlateColorBadge(record.plateColor)}
                    {record.imageUrl && (
                      <a
                        href={record.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        画像
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
