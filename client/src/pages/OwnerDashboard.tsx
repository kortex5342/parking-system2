'use client';

import { useState } from 'react';
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
} from "lucide-react";
import { Link } from "wouter";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function OwnerDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

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
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 lg:w-[300px]">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">売上</span>
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
          </div>
        </Tabs>
      </main>
    </div>
  );
}

// 概要タブ
function OverviewTab() {
  const { data: salesSummary, isLoading: summaryLoading } = trpc.owner.getSalesSummary.useQuery();
  const { data: dailyData, isLoading: dailyLoading } = trpc.owner.getDailySalesData.useQuery();
  const { data: monthlyData, isLoading: monthlyLoading } = trpc.owner.getMonthlySalesData.useQuery();
  const { data: bankInfo } = trpc.owner.getBankInfo.useQuery();

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

      {/* 振込先設定 */}
      <BankInfoCard bankInfo={bankInfo} />
    </div>
  );
}

// 振込先設定カード
function BankInfoCard({ bankInfo }: any) {
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
                onClick={() => updateMutation.mutate(editData)}
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

// プロフィールタブ
function ProfileTab() {
  const { data, isLoading } = trpc.owner.getMyPage.useQuery();
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
                  onClick={() => updateMutation.mutate(editData)}
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
    </div>
  );
}
