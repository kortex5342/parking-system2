import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  Building2, 
  Car, 
  CreditCard, 
  Plus, 
  Settings, 
  TrendingUp,
  MapPin,
  Clock,
  CircleDollarSign,
  QrCode,
  Loader2,
  User,
  Phone,
  Mail,
  Edit,
  Trash2,
  Eye,
} from "lucide-react";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";

export default function OwnerDashboard() {
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
            <CardDescription>オーナーダッシュボードにアクセスするにはログインしてください</CardDescription>
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

  // オーナーまたは管理者でない場合
  if (user?.role !== 'owner' && user?.role !== 'admin') {
    return <OwnerRegistration />;
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
              <Badge variant="outline">オーナー</Badge>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">{user?.name || user?.email}</span>
              {user?.role === 'admin' && (
                <Button variant="outline" size="sm" asChild>
                  <Link href="/operator">運営管理</Link>
                </Button>
              )}
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
            <TabsTrigger value="parking-lots" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">駐車場</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">決済</span>
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
            <TabsContent value="parking-lots">
              <ParkingLotsTab />
            </TabsContent>
            <TabsContent value="payments">
              <PaymentsTab />
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

// オーナー登録画面
function OwnerRegistration() {
  const registerMutation = trpc.owner.register.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      window.location.reload();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">駐車場オーナーになる</CardTitle>
          <CardDescription>
            ParkEaseで駐車場を管理し、収益を得ましょう。
            オーナー登録を申請すると、運営者の承認後にダッシュボードにアクセスできます。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium">1</span>
              </div>
              <div>
                <p className="font-medium">オーナー登録を申請</p>
                <p className="text-sm text-muted-foreground">下のボタンから申請を送信します</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium">2</span>
              </div>
              <div>
                <p className="font-medium">運営者による承認</p>
                <p className="text-sm text-muted-foreground">申請内容を確認後、承認されます</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium">3</span>
              </div>
              <div>
                <p className="font-medium">駐車場を登録</p>
                <p className="text-sm text-muted-foreground">承認後、駐車場を追加して運営開始</p>
              </div>
            </div>
          </div>

          <Separator />

          <Button 
            className="w-full" 
            size="lg"
            onClick={() => registerMutation.mutate()}
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                申請中...
              </>
            ) : (
              'オーナー登録を申請する'
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            申請後、運営者による承認をお待ちください。
            通常1〜2営業日以内に審査が完了します。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// 概要タブ
function OverviewTab() {
  const { data, isLoading } = trpc.owner.getMyPage.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  const { user, parkingLots, salesSummary } = data;

  // アカウントが承認待ちの場合
  if (user.status === 'pending') {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
          <CardTitle>承認待ち</CardTitle>
          <CardDescription>
            オーナー登録申請が承認待ちです。
            運営者による承認後、駐車場を登録できるようになります。
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // アカウントが停止されている場合
  if (user.status === 'suspended') {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Building2 className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle>アカウント停止中</CardTitle>
          <CardDescription>
            アカウントが停止されています。
            詳細については運営者にお問い合わせください。
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* サマリーカード */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総売上</CardTitle>
            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{salesSummary.totalAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {salesSummary.totalTransactions}件の取引
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">登録駐車場</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{parkingLots.length}</div>
            <p className="text-xs text-muted-foreground">
              {parkingLots.filter(l => l.status === 'active').length}件が稼働中
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総駐車スペース</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {parkingLots.reduce((sum, lot) => sum + lot.totalSpaces, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              全駐車場合計
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 駐車場一覧（簡易） */}
      <Card>
        <CardHeader>
          <CardTitle>登録駐車場</CardTitle>
          <CardDescription>管理中の駐車場一覧</CardDescription>
        </CardHeader>
        <CardContent>
          {parkingLots.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">まだ駐車場が登録されていません</p>
              <Button asChild>
                <Link href="/owner?tab=parking-lots">駐車場を追加</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {parkingLots.slice(0, 5).map((lot) => (
                <div key={lot.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{lot.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {lot.totalSpaces}台 • ¥{lot.pricingAmount}/{lot.pricingUnitMinutes}分
                      </p>
                    </div>
                  </div>
                  <Badge variant={lot.status === 'active' ? 'default' : 'secondary'}>
                    {lot.status === 'active' ? '稼働中' : '停止中'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// 駐車場タブ
function ParkingLotsTab() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newLot, setNewLot] = useState({
    name: '',
    address: '',
    description: '',
    totalSpaces: 10,
  });

  const utils = trpc.useUtils();
  const { data: parkingLots, isLoading } = trpc.owner.getParkingLots.useQuery();
  
  const createMutation = trpc.owner.createParkingLot.useMutation({
    onSuccess: () => {
      toast.success('駐車場を作成しました');
      setIsCreateDialogOpen(false);
      setNewLot({ name: '', address: '', description: '', totalSpaces: 10 });
      utils.owner.getParkingLots.invalidate();
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">駐車場管理</h2>
          <p className="text-sm text-muted-foreground">駐車場の追加・編集・管理</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              駐車場を追加
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新しい駐車場を追加</DialogTitle>
              <DialogDescription>
                駐車場の基本情報を入力してください。作成後に料金設定などを変更できます。
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">駐車場名 *</Label>
                <Input
                  id="name"
                  value={newLot.name}
                  onChange={(e) => setNewLot({ ...newLot, name: e.target.value })}
                  placeholder="例: 〇〇駅前駐車場"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">住所</Label>
                <Input
                  id="address"
                  value={newLot.address}
                  onChange={(e) => setNewLot({ ...newLot, address: e.target.value })}
                  placeholder="例: 東京都渋谷区..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">説明</Label>
                <Input
                  id="description"
                  value={newLot.description}
                  onChange={(e) => setNewLot({ ...newLot, description: e.target.value })}
                  placeholder="例: 24時間営業、屋根付き"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalSpaces">駐車スペース数</Label>
                <Input
                  id="totalSpaces"
                  type="number"
                  min={1}
                  max={100}
                  value={newLot.totalSpaces}
                  onChange={(e) => setNewLot({ ...newLot, totalSpaces: parseInt(e.target.value) || 10 })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                キャンセル
              </Button>
              <Button 
                onClick={() => createMutation.mutate(newLot)}
                disabled={!newLot.name || createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    作成中...
                  </>
                ) : (
                  '作成'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!parkingLots || parkingLots.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">駐車場がありません</p>
            <p className="text-sm text-muted-foreground mb-4">
              「駐車場を追加」ボタンから最初の駐車場を登録しましょう
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {parkingLots.map((lot) => (
            <ParkingLotCard key={lot.id} lot={lot} />
          ))}
        </div>
      )}
    </div>
  );
}

// 駐車場カード
function ParkingLotCard({ lot }: { lot: any }) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{lot.name}</CardTitle>
              {lot.address && (
                <CardDescription className="flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" />
                  {lot.address}
                </CardDescription>
              )}
            </div>
            <Badge variant={lot.status === 'active' ? 'default' : 'secondary'}>
              {lot.status === 'active' ? '稼働中' : '停止中'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">駐車スペース</p>
              <p className="font-medium">{lot.totalSpaces}台</p>
            </div>
            <div>
              <p className="text-muted-foreground">料金</p>
              <p className="font-medium">¥{lot.pricingAmount}/{lot.pricingUnitMinutes}分</p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => setIsDetailOpen(true)}>
              <Eye className="mr-2 h-4 w-4" />
              詳細
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/owner/lot/${lot.id}/qr`}>
                <QrCode className="mr-2 h-4 w-4" />
                QR
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <ParkingLotDetailDialog 
        lotId={lot.id} 
        open={isDetailOpen} 
        onOpenChange={setIsDetailOpen} 
      />
    </>
  );
}

// 駐車場詳細ダイアログ
function ParkingLotDetailDialog({ lotId, open, onOpenChange }: { lotId: number; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data, isLoading } = trpc.owner.getParkingLot.useQuery({ lotId }, { enabled: open });
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  const utils = trpc.useUtils();
  const updateMutation = trpc.owner.updateParkingLot.useMutation({
    onSuccess: () => {
      toast.success('駐車場を更新しました');
      setIsEditing(false);
      utils.owner.getParkingLot.invalidate({ lotId });
      utils.owner.getParkingLots.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.owner.deleteParkingLot.useMutation({
    onSuccess: () => {
      toast.success('駐車場を削除しました');
      onOpenChange(false);
      utils.owner.getParkingLots.invalidate();
      utils.owner.getMyPage.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{data?.lot?.name || '駐車場詳細'}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* 基本情報 */}
            <div className="space-y-4">
              <h3 className="font-medium">基本情報</h3>
              {isEditing ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>駐車場名</Label>
                    <Input
                      value={editData?.name || ''}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>住所</Label>
                    <Input
                      value={editData?.address || ''}
                      onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>課金単位（分）</Label>
                      <Input
                        type="number"
                        min={10}
                        max={60}
                        value={editData?.pricingUnitMinutes || 60}
                        onChange={(e) => setEditData({ ...editData, pricingUnitMinutes: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>料金（円）</Label>
                      <Input
                        type="number"
                        min={1}
                        value={editData?.pricingAmount || 300}
                        onChange={(e) => setEditData({ ...editData, pricingAmount: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => updateMutation.mutate({ lotId, ...editData })}
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">住所</p>
                    <p>{data.lot.address || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">駐車スペース</p>
                    <p>{data.lot.totalSpaces}台</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">料金</p>
                    <p>¥{data.lot.pricingAmount}/{data.lot.pricingUnitMinutes}分</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ステータス</p>
                    <Badge variant={data.lot.status === 'active' ? 'default' : 'secondary'}>
                      {data.lot.status === 'active' ? '稼働中' : '停止中'}
                    </Badge>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* 現在の入庫状況 */}
            <div className="space-y-4">
              <h3 className="font-medium">現在の入庫状況</h3>
              <div className="grid grid-cols-5 gap-2">
                {data.spaces.map((space: any) => (
                  <div
                    key={space.id}
                    className={`p-3 rounded-lg text-center ${
                      space.status === 'occupied' 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    <p className="text-lg font-bold">{space.spaceNumber}</p>
                    <p className="text-xs">{space.status === 'occupied' ? '使用中' : '空き'}</p>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* 操作ボタン */}
            {!isEditing && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditData({
                      name: data.lot.name,
                      address: data.lot.address,
                      pricingUnitMinutes: data.lot.pricingUnitMinutes,
                      pricingAmount: data.lot.pricingAmount,
                    });
                    setIsEditing(true);
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  編集
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    if (confirm('この駐車場を削除しますか？')) {
                      deleteMutation.mutate({ lotId });
                    }
                  }}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  削除
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// 決済タブ
function PaymentsTab() {
  const { data: payments, isLoading } = trpc.owner.getPayments.useQuery({ limit: 100 });

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
        <h2 className="text-xl font-semibold">決済履歴</h2>
        <p className="text-sm text-muted-foreground">すべての決済記録</p>
      </div>

      {!payments || payments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">決済履歴がありません</p>
            <p className="text-sm text-muted-foreground">
              駐車場の利用があると、ここに決済履歴が表示されます
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
                    <th className="text-left p-4 font-medium">日時</th>
                    <th className="text-left p-4 font-medium">スペース</th>
                    <th className="text-left p-4 font-medium">時間</th>
                    <th className="text-left p-4 font-medium">金額</th>
                    <th className="text-left p-4 font-medium">決済方法</th>
                    <th className="text-left p-4 font-medium">ステータス</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment: any) => (
                    <tr key={payment.id} className="border-b">
                      <td className="p-4 text-sm">
                        {new Date(payment.createdAt).toLocaleString('ja-JP')}
                      </td>
                      <td className="p-4">{payment.spaceNumber}番</td>
                      <td className="p-4 text-sm">{payment.durationMinutes}分</td>
                      <td className="p-4 font-medium">¥{payment.amount.toLocaleString()}</td>
                      <td className="p-4">
                        <Badge variant="outline">
                          {payment.paymentMethod === 'paypay' ? 'PayPay' : 
                           payment.paymentMethod === 'credit_card' ? 'クレジット' :
                           payment.paymentMethod === 'stripe' ? 'Stripe' : 'Square'}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge variant={payment.paymentStatus === 'completed' ? 'default' : 'secondary'}>
                          {payment.paymentStatus === 'completed' ? '完了' : '保留'}
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
