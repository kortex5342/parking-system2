import { useState } from 'react';
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Building2, 
  Users, 
  TrendingUp,
  Clock,
  CircleDollarSign,
  Loader2,
  CheckCircle,
  XCircle,
  Eye,
  ShieldCheck,
  ShieldX,
  UserCheck,
  UserX,
} from "lucide-react";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Plus } from "lucide-react";

export default function OperatorDashboard() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>ログインが必要です</CardTitle>
            <CardDescription>運営管理画面にアクセスするにはログインしてください</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <a href={getLoginUrl()}>ログイン</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 管理者でない場合
  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <ShieldX className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle>アクセス権限がありません</CardTitle>
            <CardDescription>
              この画面は運営者専用です。
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild variant="outline">
              <Link href="/">ホームに戻る</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
              <Badge variant="destructive">運営管理</Badge>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">{user?.name || user?.email}</span>
              <Button variant="outline" size="sm" asChild>
                <Link href="/owner">オーナーダッシュボード</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">概要</span>
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">承認待ち</span>
            </TabsTrigger>
            <TabsTrigger value="owners" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">オーナー</span>
            </TabsTrigger>
            <TabsTrigger value="parking-lots" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">駐車場</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="overview">
              <OverviewTab />
            </TabsContent>
            <TabsContent value="pending">
              <PendingTab />
            </TabsContent>
            <TabsContent value="owners">
              <OwnersTab />
            </TabsContent>
            <TabsContent value="parking-lots">
              <ParkingLotsTab />
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
}

// 概要タブ
function OverviewTab() {
  const { data, isLoading } = trpc.operator.getTotalSummary.useQuery();
  const { data: pendingOwners } = trpc.operator.getPendingOwners.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* サマリーカード */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総売上</CardTitle>
            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{data.totalAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {data.totalTransactions}件の取引
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">オーナー数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalOwners}</div>
            <p className="text-xs text-muted-foreground">
              登録オーナー
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">駐車場数</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalParkingLots}</div>
            <p className="text-xs text-muted-foreground">
              登録駐車場
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">承認待ち</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingOwners?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              オーナー申請
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 承認待ちがある場合のアラート */}
      {pendingOwners && pendingOwners.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              承認待ちのオーナー申請があります
            </CardTitle>
            <CardDescription className="text-yellow-700">
              {pendingOwners.length}件の申請が承認を待っています
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link href="/operator?tab=pending">承認画面へ</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// 承認待ちタブ
function PendingTab() {
  const { data: pendingOwners, isLoading } = trpc.operator.getPendingOwners.useQuery();
  const utils = trpc.useUtils();

  const approveMutation = trpc.operator.approveOwner.useMutation({
    onSuccess: () => {
      toast.success('オーナーを承認しました');
      utils.operator.getPendingOwners.invalidate();
      utils.operator.getAllOwners.invalidate();
      utils.operator.getTotalSummary.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const suspendMutation = trpc.operator.suspendOwner.useMutation({
    onSuccess: () => {
      toast.success('申請を却下しました');
      utils.operator.getPendingOwners.invalidate();
    },
    onError: (error: any) => {
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">承認待ちオーナー</h2>
        <p className="text-sm text-muted-foreground">オーナー登録申請の承認・却下</p>
      </div>

      {!pendingOwners || pendingOwners.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <p className="text-lg font-medium mb-2">承認待ちの申請はありません</p>
            <p className="text-sm text-muted-foreground">
              新しい申請があるとここに表示されます
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingOwners.map((owner: any) => (
            <Card key={owner.id}>
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-medium">{owner.name || '名前未設定'}</p>
                    <p className="text-sm text-muted-foreground">{owner.email || 'メール未設定'}</p>
                    <p className="text-xs text-muted-foreground">
                      申請日: {new Date(owner.createdAt).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="default"
                    onClick={() => approveMutation.mutate({ userId: owner.id })}
                    disabled={approveMutation.isPending}
                  >
                    <UserCheck className="mr-2 h-4 w-4" />
                    承認
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => {
                      if (confirm('この申請を却下しますか？')) {
                        suspendMutation.mutate({ userId: owner.id });
                      }
                    }}
                    disabled={suspendMutation.isPending}
                  >
                    <UserX className="mr-2 h-4 w-4" />
                    却下
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// オーナータブ
function OwnersTab() {
  const { data: owners, isLoading } = trpc.operator.getAllOwners.useQuery();
  const [selectedOwner, setSelectedOwner] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const activateMutation = trpc.operator.activateOwner.useMutation({
    onSuccess: () => {
      toast.success('オーナーを有効化しました');
      utils.operator.getAllOwners.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const suspendMutation = trpc.operator.suspendOwner.useMutation({
    onSuccess: () => {
      toast.success('オーナーを停止しました');
      utils.operator.getAllOwners.invalidate();
    },
    onError: (error: any) => {
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">オーナー管理</h2>
        <p className="text-sm text-muted-foreground">登録オーナーの一覧と管理</p>
      </div>

      {!owners || owners.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">オーナーがいません</p>
            <p className="text-sm text-muted-foreground">
              オーナー登録があるとここに表示されます
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">オーナー</th>
                    <th className="text-left p-4 font-medium">連絡先</th>
                    <th className="text-left p-4 font-medium">登録日</th>
                    <th className="text-left p-4 font-medium">ステータス</th>
                    <th className="text-left p-4 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {owners.map((owner: any) => (
                    <tr key={owner.id} className="border-b">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">{owner.name || '名前未設定'}</p>
                            <p className="text-xs text-muted-foreground">ID: {owner.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm">{owner.email || '-'}</p>
                        <p className="text-xs text-muted-foreground">{owner.phone || '-'}</p>
                      </td>
                      <td className="p-4 text-sm">
                        {new Date(owner.createdAt).toLocaleDateString('ja-JP')}
                      </td>
                      <td className="p-4">
                        <Badge variant={
                          owner.status === 'active' ? 'default' : 
                          owner.status === 'pending' ? 'secondary' : 'destructive'
                        }>
                          {owner.status === 'active' ? '有効' : 
                           owner.status === 'pending' ? '承認待ち' : '停止中'}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedOwner(owner.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {owner.status === 'suspended' ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => activateMutation.mutate({ userId: owner.id })}
                              disabled={activateMutation.isPending}
                            >
                              <ShieldCheck className="h-4 w-4" />
                            </Button>
                          ) : owner.status === 'active' ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                if (confirm('このオーナーを停止しますか？')) {
                                  suspendMutation.mutate({ userId: owner.id });
                                }
                              }}
                              disabled={suspendMutation.isPending}
                            >
                              <ShieldX className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <OwnerDetailDialog 
        userId={selectedOwner} 
        open={selectedOwner !== null} 
        onOpenChange={(open) => !open && setSelectedOwner(null)} 
      />
    </div>
  );
}

// オーナー詳細ダイアログ
function OwnerDetailDialog({ userId, open, onOpenChange }: { userId: number | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data, isLoading } = trpc.operator.getOwnerDetail.useQuery(
    { userId: userId! }, 
    { enabled: open && userId !== null }
  );

  if (!open || userId === null) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>オーナー詳細</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* 基本情報 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">名前</p>
                <p className="font-medium">{data.user.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">メール</p>
                <p className="font-medium">{data.user.email || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">電話番号</p>
                <p className="font-medium">{data.user.phone || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ステータス</p>
                <Badge variant={
                  data.user.status === 'active' ? 'default' : 
                  data.user.status === 'pending' ? 'secondary' : 'destructive'
                }>
                  {data.user.status === 'active' ? '有効' : 
                   data.user.status === 'pending' ? '承認待ち' : '停止中'}
                </Badge>
              </div>
            </div>

            {/* 売上サマリー */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">総売上</p>
                <p className="text-xl font-bold">¥{data.salesSummary.totalAmount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">取引数</p>
                <p className="text-xl font-bold">{data.salesSummary.totalTransactions}</p>
              </div>
            </div>

            {/* 駐車場一覧 */}
            <div>
              <p className="text-sm font-medium mb-2">登録駐車場 ({data.parkingLots.length}件)</p>
              {data.parkingLots.length === 0 ? (
                <p className="text-sm text-muted-foreground">駐車場が登録されていません</p>
              ) : (
                <div className="space-y-2">
                  {data.parkingLots.map((lot: any) => (
                    <div key={lot.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{lot.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {lot.totalSpaces}台 • ¥{lot.pricingAmount}/{lot.pricingUnitMinutes}分
                        </p>
                      </div>
                      <Badge variant={lot.status === 'active' ? 'default' : 'secondary'}>
                        {lot.status === 'active' ? '稼働中' : '停止中'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// 駐車場タブ
function ParkingLotsTab() {
  const { data: parkingLots, isLoading } = trpc.operator.getAllParkingLots.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">全駐車場一覧</h2>
        <p className="text-sm text-muted-foreground">システム内の全駐車場</p>
      </div>

      {!parkingLots || parkingLots.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">駐車場がありません</p>
            <p className="text-sm text-muted-foreground">
              オーナーが駐車場を登録するとここに表示されます
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">駐車場名</th>
                    <th className="text-left p-4 font-medium">住所</th>
                    <th className="text-left p-4 font-medium">スペース</th>
                    <th className="text-left p-4 font-medium">料金</th>
                    <th className="text-left p-4 font-medium">ステータス</th>
                  </tr>
                </thead>
                <tbody>
                  {parkingLots.map((lot: any) => (
                    <tr key={lot.id} className="border-b">
                      <td className="p-4">
                        <p className="font-medium">{lot.name}</p>
                        <p className="text-xs text-muted-foreground">オーナーID: {lot.ownerId}</p>
                      </td>
                      <td className="p-4 text-sm">{lot.address || '-'}</td>
                      <td className="p-4">{lot.totalSpaces}台</td>
                      <td className="p-4">¥{lot.pricingAmount}/{lot.pricingUnitMinutes}分</td>
                      <td className="p-4">
                        <Badge variant={lot.status === 'active' ? 'default' : 'secondary'}>
                          {lot.status === 'active' ? '稼働中' : '停止中'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


// 新規オーナー追加セクション
function AddOwnerSection() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    customUrl: '',
  });
  const utils = trpc.useUtils();

  const addOwnerMutation = trpc.operator.addOwner.useMutation({
    onSuccess: () => {
      toast.success('オーナーを追加しました');
      setFormData({ name: '', email: '', customUrl: '' });
      setIsOpen(false);
      utils.operator.getAllOwners.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.customUrl) {
      toast.error('すべてのフィールドを入力してください');
      return;
    }
    addOwnerMutation.mutate(formData);
  };

  return (
    <div className="mt-8">
      <Button onClick={() => setIsOpen(true)} size="lg" className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        新規オーナーを追加
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新規オーナーを追加</DialogTitle>
            <DialogDescription>
              新しいオーナーを登録します。カスタムURLは一意である必要があります。
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">オーナー名</Label>
              <Input
                id="name"
                placeholder="例：山田太郎"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="customUrl">カスタムURL</Label>
              <div className="flex gap-2">
                <span className="text-sm text-muted-foreground pt-2">/owner/</span>
                <Input
                  id="customUrl"
                  placeholder="parking-lot-a"
                  value={formData.customUrl}
                  onChange={(e) => setFormData({ ...formData, customUrl: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                キャンセル
              </Button>
              <Button type="submit" disabled={addOwnerMutation.isPending}>
                {addOwnerMutation.isPending ? '追加中...' : '追加'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
