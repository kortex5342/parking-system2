import { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

export default function OperatorDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">運営者ダッシュボード</h1>

        {/* タブナビゲーション */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'overview'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            概要
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'pending'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            承認待ち
          </button>
          <button
            onClick={() => setActiveTab('owners')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'owners'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            オーナー
          </button>
          <button
            onClick={() => setActiveTab('parking')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'parking'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            駐車場
          </button>
        </div>

        {/* タブコンテンツ */}
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'pending' && <PendingTab />}
        {activeTab === 'owners' && <OwnersTab />}
        {activeTab === 'parking' && <ParkingTab />}
      </div>
    </div>
  );
}

// 概要タブ
function OverviewTab() {
  const { data: stats } = trpc.operator.getAllOwners.useQuery();

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">登録オーナー数</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{stats?.length || 0}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">駐車場数</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">1</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">本日の売上</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">¥0</p>
        </CardContent>
      </Card>
    </div>
  );
}

// 承認待ちタブ
function PendingTab() {
  const { data: pendingUsers } = trpc.operator.getPendingOwners.useQuery();
  const approveMutation = trpc.operator.approveOwner.useMutation({
    onSuccess: () => {
      toast.success('ユーザーを承認しました');
      trpc.useUtils().operator.getPendingOwners.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const handleApproveUser = (userId: number) => {
    approveMutation.mutate({ userId });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>承認待ちユーザー</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {pendingUsers?.map((user: any) => (
            <div key={user.id} className="flex items-center justify-between border-b pb-4">
              <div>
                <p className="font-medium">{user.name}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
              <Button onClick={() => handleApproveUser(user.id)} disabled={approveMutation.isPending}>承認</Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// オーナータブ
function OwnersTab() {
  const { data: owners } = trpc.operator.getAllOwners.useQuery();
  const [selectedOwner, setSelectedOwner] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      {owners?.map((owner: any) => (
        <Card key={owner.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedOwner(owner.id)}>
          <CardHeader>
            <CardTitle>{owner.name}</CardTitle>
            <CardDescription>{owner.email}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">カスタムURL: {owner.customUrl ? `/owner/${owner.customUrl}` : '未設定'}</p>
          </CardContent>
        </Card>
      ))}

      <OwnerDetailDialog userId={selectedOwner} open={selectedOwner !== null} onOpenChange={(open) => !open && setSelectedOwner(null)} />

      <AddOwnerSection />
    </div>
  );
}

// オーナー詳細ダイアログ
function OwnerDetailDialog({ userId, open, onOpenChange }: { userId: number | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data, isLoading } = trpc.operator.getOwnerDetail.useQuery(
    { userId: userId || 0 },
    { enabled: !!userId }
  );
  const [selectedLot, setSelectedLot] = useState<number | null>(null);
  const [showAddParkingLot, setShowAddParkingLot] = useState(false);

  if (isLoading || !data) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{data.user?.name}の詳細</DialogTitle>
            <DialogDescription>オーナー情報と駐車場一覧</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* オーナー情報 */}
            <div className="space-y-4 border-b pb-4">
              <h3 className="font-semibold">オーナー情報</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>メール</Label>
                  <p className="text-sm">{data.user?.email}</p>
                </div>
                <div>
                  <Label>カスタムURL</Label>
                  <p className="text-sm">/owner/{data.user?.customUrl}</p>
                </div>
                <div>
                  <Label>登録日</Label>
                  <p className="text-sm">{data.user?.createdAt ? new Date(data.user.createdAt).toLocaleDateString('ja-JP') : '-'}</p>
                </div>
              </div>
            </div>

            {/* 駐車場一覧 */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">駐車場一覧</h3>
                <Button size="sm" onClick={() => setShowAddParkingLot(true)}>駐車場を追加</Button>
              </div>
              {data.parkingLots && data.parkingLots.length > 0 ? (
                <div className="space-y-3">
                  {data.parkingLots.map((lot: any) => (
                    <div
                      key={lot.id}
                      className="border rounded-lg p-4 cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => setSelectedLot(lot.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{lot.name}</h4>
                          <p className="text-sm text-muted-foreground">住所: {lot.address || '未設定'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">スペース数: <span className="font-semibold">{lot.totalSpaces}</span>台</p>
                          <p className="text-sm">料金: <span className="font-semibold">¥{lot.pricingAmount}</span>/{lot.pricingUnitMinutes === 60 ? '1時間' : lot.pricingUnitMinutes === 1440 ? '1日' : lot.pricingUnitMinutes + '分'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">駐車場が登録されていません</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 駐車場詳細設定ダイアログ */}
      <ParkingLotDetailDialog lotId={selectedLot} open={selectedLot !== null} onOpenChange={(open) => !open && setSelectedLot(null)} />

      {/* 駐車場追加ダイアログ */}
      <AddParkingLotDialog ownerId={userId} open={showAddParkingLot} onOpenChange={setShowAddParkingLot} />
    </>
  );
}

// 駐車場タブ
function ParkingTab() {
  const { data: parkingLots } = trpc.operator.getAllParkingLots.useQuery();
  const [selectedLot, setSelectedLot] = useState<number | null>(null);

  if (!parkingLots?.length) {
    return <div className="text-center py-8 text-muted-foreground">駐車場はまだ登録されていません</div>;
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {parkingLots.map((lot: any) => (
          <Card key={lot.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedLot(lot.id)}>
            <CardHeader>
              <CardTitle>{lot.name}</CardTitle>
              <CardDescription>オーナー: {lot.ownerName}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p>スペース数: {lot.totalSpaces}</p>
                <p>料金: ¥{lot.pricePerHour}/時間</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <ParkingLotDetailDialog lotId={selectedLot} open={selectedLot !== null} onOpenChange={(open) => !open && setSelectedLot(null)} />
    </>
  );
}

// 駐車場詳細設定ダイアログ
function ParkingLotDetailDialog({ lotId, open, onOpenChange }: { lotId: number | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data, isLoading } = trpc.operator.getParkingLotsByOwner.useQuery(
    { ownerId: 0 },
    { enabled: false }
  );
  const utils = trpc.useUtils();
  const [formData, setFormData] = useState({
    totalSpaces: 10,
    pricingUnitMinutes: 60,
    pricingAmount: 300,
    maxDailyAmount: 3000,
    maxDailyAmountEnabled: true,
  });

  const updateMutation = trpc.operator.updateParkingLot.useMutation({
    onSuccess: () => {
      toast.success('駐車場設定を更新しました');
      onOpenChange(false);
      utils.operator.getAllParkingLots.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lotId) {
      updateMutation.mutate({
        lotId,
        totalSpaces: formData.totalSpaces,
        pricingUnitMinutes: formData.pricingUnitMinutes,
        pricingAmount: formData.pricingAmount,
        maxDailyAmount: formData.maxDailyAmountEnabled ? formData.maxDailyAmount : undefined,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>駐車場設定</DialogTitle>
          <DialogDescription>
            駐車台数、料金設定、最大駐車料金を設定します。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="totalSpaces">駐車台数（スペース数）</Label>
            <Input
              id="totalSpaces"
              type="number"
              min="1"
              max="1000"
              value={formData.totalSpaces}
              onChange={(e) => setFormData({ ...formData, totalSpaces: parseInt(e.target.value) })}
            />
          </div>

          <div>
            <Label htmlFor="pricingUnitMinutes">料金計算単位（分、10分単位）</Label>
            <Input
              id="pricingUnitMinutes"
              type="number"
              min="10"
              step="10"
              value={formData.pricingUnitMinutes}
              onChange={(e) => setFormData({ ...formData, pricingUnitMinutes: parseInt(e.target.value) })}
              placeholder="例：30、60、120"
            />
          </div>

          <div>
            <Label htmlFor="pricingAmount">料金金額（円）</Label>
            <Input
              id="pricingAmount"
              type="number"
              min="0"
              step="10"
              value={formData.pricingAmount}
              onChange={(e) => setFormData({ ...formData, pricingAmount: parseInt(e.target.value) })}
            />
          </div>

          <div>
            <Label htmlFor="maxDailyAmount">最大駐車料金（1日の上限、円）</Label>
            <Input
              id="maxDailyAmount"
              type="number"
              min="0"
              step="100"
              value={formData.maxDailyAmount}
              onChange={(e) => setFormData({ ...formData, maxDailyAmount: parseInt(e.target.value) })}
              disabled={!formData.maxDailyAmountEnabled}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="maxDailyAmountEnabled"
              type="checkbox"
              checked={formData.maxDailyAmountEnabled}
              onChange={(e) => setFormData({ ...formData, maxDailyAmountEnabled: e.target.checked })}
              className="w-4 h-4"
            />
            <Label htmlFor="maxDailyAmountEnabled" className="font-normal">最大駐車料金を有効にする</Label>
          </div>

          {/* 時間帯ごとの最大料金セクション */}
          <div className="border-t pt-4 mt-4">
            <h3 className="font-semibold mb-4">時間帯ごとの最大料金設定</h3>
            
            {/* 昼間設定 */}
            <div className="space-y-3 mb-4 p-3 border rounded-md bg-muted/50">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">昼間：</span>
                <select className="px-2 py-1 border rounded text-sm" defaultValue="9">
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{i}時</option>
                  ))}
                </select>
                <span className="text-sm">から</span>
                <select className="px-2 py-1 border rounded text-sm" defaultValue="18">
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{i}時</option>
                  ))}
                </select>
                <span className="text-sm">まで、最大料金</span>
                <select className="px-2 py-1 border rounded text-sm" defaultValue="3000">
                  {Array.from({ length: 100 }, (_, i) => (
                    <option key={i} value={(i + 1) * 100}>¥{(i + 1) * 100}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* 夜間設定 */}
            <div className="space-y-3 p-3 border rounded-md bg-muted/50">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">夜間：</span>
                <select className="px-2 py-1 border rounded text-sm" defaultValue="18">
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{i}時</option>
                  ))}
                </select>
                <span className="text-sm">から</span>
                <select className="px-2 py-1 border rounded text-sm" defaultValue="9">
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{i}時</option>
                  ))}
                </select>
                <span className="text-sm">まで、最大料金</span>
                <select className="px-2 py-1 border rounded text-sm" defaultValue="1300">
                  {Array.from({ length: 100 }, (_, i) => (
                    <option key={i} value={(i + 1) * 100}>¥{(i + 1) * 100}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// 新規オーナー追加セクション
function AddOwnerSection() {
  const [isOpen, setIsOpen] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successUrl, setSuccessUrl] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    customUrl: '',
  });

  const addOwnerMutation = trpc.operator.addOwner.useMutation({
    onSuccess: (data: any) => {
      const baseUrl = window.location.origin;
      const fullUrl = `${baseUrl}/owner/${data.customUrl}`;
      setSuccessUrl(fullUrl);
      setShowSuccessDialog(true);
      setFormData({ name: '', email: '', customUrl: '' });
      setIsOpen(false);
      trpc.useUtils().operator.getAllOwners.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addOwnerMutation.mutate(formData);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(successUrl);
      toast.success('URLをコピーしました');
    } catch (error) {
      toast.error('コピーに失敗しました');
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="w-full">
        新規オーナーを追加
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新規オーナーを追加</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">オーナー名</Label>
              <Input
                id="name"
                placeholder="例：山田太郎"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
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
                required
              />
            </div>

            <div>
              <Label htmlFor="customUrl">カスタムURL</Label>
              <Input
                id="customUrl"
                placeholder="parking-lot-a"
                value={formData.customUrl}
                onChange={(e) => setFormData({ ...formData, customUrl: e.target.value })}
                required
              />
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

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>オーナーを追加しました</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">以下のURLをオーナーに共有してください：</p>
            <div className="flex gap-2">
              <Input type="text" value={successUrl} readOnly />
              <Button onClick={handleCopyUrl}>コピー</Button>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowSuccessDialog(false)}>完了</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


// 駐車場追加ダイアログ
function AddParkingLotDialog({ ownerId, open, onOpenChange }: { ownerId: number | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    description: '',
    totalSpaces: 10,
    pricingUnitMinutes: 60,
    pricingAmount: 300,
    maxDailyAmount: 3000,
    maxDailyAmountEnabled: true,
  });

  const [timePeriods, setTimePeriods] = useState([
    { startHour: 5, endHour: 19, maxAmount: 3000 },
    { startHour: 19, endHour: 5, maxAmount: 1300 },
  ]);

  const utils = trpc.useUtils();
  const saveMaxPricingPeriodMutation = trpc.operator.saveMaxPricingPeriod.useMutation();
  const createMutation = trpc.operator.createParkingLotForOwner.useMutation({
    onSuccess: (response) => {
      if (response && response.lotId) {
        // 時間帯設定を並列並列で保存
        Promise.all(timePeriods.map(period =>
          saveMaxPricingPeriodMutation.mutateAsync({
            parkingLotId: response.lotId,
            startHour: period.startHour,
            endHour: period.endHour,
            maxAmount: period.maxAmount,
          })
        )).then(() => {
          toast.success('駐車場を追加しました');
          setFormData({
            name: '',
            address: '',
            description: '',
            totalSpaces: 10,
            pricingUnitMinutes: 60,
            pricingAmount: 300,
            maxDailyAmount: 3000,
            maxDailyAmountEnabled: true,
          });
          setTimePeriods([
            { startHour: 5, endHour: 19, maxAmount: 3000 },
            { startHour: 19, endHour: 5, maxAmount: 1300 },
          ]);
          onOpenChange(false);
          utils.operator.getOwnerDetail.invalidate();
        }).catch((error) => {
          toast.error('時間帯設定の保存に失敗しました');
          console.error('Error saving periods:', error);
        });
      } else {
        toast.success('駐車場を追加しました');
        setFormData({
          name: '',
          address: '',
          description: '',
          totalSpaces: 10,
          pricingUnitMinutes: 60,
          pricingAmount: 300,
          maxDailyAmount: 3000,
          maxDailyAmountEnabled: true,
        });
        setTimePeriods([
          { startHour: 5, endHour: 19, maxAmount: 3000 },
          { startHour: 19, endHour: 5, maxAmount: 1300 },
        ]);
        onOpenChange(false);
        utils.operator.getOwnerDetail.invalidate();
      }
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerId) return;
    
    createMutation.mutate({
      ownerId,
      ...formData,
      maxDailyAmount: formData.maxDailyAmountEnabled ? formData.maxDailyAmount : 0,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>駐車場を追加</DialogTitle>
          <DialogDescription>新しい駐車場を登録します</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">駐車場名</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例：渋谷駅前駐車場"
              required
            />
          </div>

          <div>
            <Label htmlFor="address">住所</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="例：東京都渋谷区道玄坂1-1-1"
            />
          </div>

          <div>
            <Label htmlFor="description">説明</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="駐車場の説明"
            />
          </div>

          <div>
            <Label htmlFor="totalSpaces">駐車台数</Label>
            <Input
              id="totalSpaces"
              type="number"
              min="1"
              max="1000"
              value={formData.totalSpaces}
              onChange={(e) => setFormData({ ...formData, totalSpaces: parseInt(e.target.value) })}
            />
          </div>

          <div>
            <Label htmlFor="pricingUnitMinutes">料金計算単位（分、10分単位）</Label>
            <Input
              id="pricingUnitMinutes"
              type="number"
              min="10"
              step="10"
              value={formData.pricingUnitMinutes}
              onChange={(e) => setFormData({ ...formData, pricingUnitMinutes: parseInt(e.target.value) })}
              placeholder="例：30、60、120"
            />
          </div>

          <div>
            <Label htmlFor="pricingAmount">料金金額（円）</Label>
            <Input
              id="pricingAmount"
              type="number"
              min="0"
              step="10"
              value={formData.pricingAmount}
              onChange={(e) => setFormData({ ...formData, pricingAmount: parseInt(e.target.value) })}
            />
          </div>

          <div>
            <Label htmlFor="maxDailyAmount">最大駐車料金（1日の上限、円）</Label>
            <Input
              id="maxDailyAmount"
              type="number"
              min="0"
              step="100"
              value={formData.maxDailyAmount}
              onChange={(e) => setFormData({ ...formData, maxDailyAmount: parseInt(e.target.value) })}
              disabled={!formData.maxDailyAmountEnabled}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="maxDailyAmountEnabled"
              type="checkbox"
              checked={formData.maxDailyAmountEnabled}
              onChange={(e) => setFormData({ ...formData, maxDailyAmountEnabled: e.target.checked })}
              className="w-4 h-4"
            />
            <Label htmlFor="maxDailyAmountEnabled" className="font-normal">最大駐車料金を有効にする</Label>
          </div>

          {/* 時間帯ごとの最大料金セクション */}
          <div className="border-t pt-4 mt-4">
            <h3 className="font-semibold mb-4">時間帯ごとの最大料金設定</h3>
            
            {/* 昼間設定 */}
            <div className="space-y-3 mb-4 p-3 border rounded-md bg-muted/50">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">昼間：</span>
                <select 
                  className="px-2 py-1 border rounded text-sm" 
                  value={timePeriods[0].startHour}
                  onChange={(e) => setTimePeriods([{ ...timePeriods[0], startHour: parseInt(e.target.value) }, timePeriods[1]])}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{i}時</option>
                  ))}
                </select>
                <span className="text-sm">から</span>
                <select 
                  className="px-2 py-1 border rounded text-sm" 
                  value={timePeriods[0].endHour}
                  onChange={(e) => setTimePeriods([{ ...timePeriods[0], endHour: parseInt(e.target.value) }, timePeriods[1]])}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{i}時</option>
                  ))}
                </select>
                <span className="text-sm">まで、最大料金</span>
                <select 
                  className="px-2 py-1 border rounded text-sm" 
                  value={timePeriods[0].maxAmount}
                  onChange={(e) => setTimePeriods([{ ...timePeriods[0], maxAmount: parseInt(e.target.value) }, timePeriods[1]])}
                >
                  {Array.from({ length: 100 }, (_, i) => (
                    <option key={i} value={(i + 1) * 100}>¥{(i + 1) * 100}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* 夜間設定 */}
            <div className="space-y-3 p-3 border rounded-md bg-muted/50">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">夜間：</span>
                <select 
                  className="px-2 py-1 border rounded text-sm" 
                  value={timePeriods[1].startHour}
                  onChange={(e) => setTimePeriods([timePeriods[0], { ...timePeriods[1], startHour: parseInt(e.target.value) }])}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{i}時</option>
                  ))}
                </select>
                <span className="text-sm">から</span>
                <select 
                  className="px-2 py-1 border rounded text-sm" 
                  value={timePeriods[1].endHour}
                  onChange={(e) => setTimePeriods([timePeriods[0], { ...timePeriods[1], endHour: parseInt(e.target.value) }])}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{i}時</option>
                  ))}
                </select>
                <span className="text-sm">まで、最大料金</span>
                <select 
                  className="px-2 py-1 border rounded text-sm" 
                  value={timePeriods[1].maxAmount}
                  onChange={(e) => setTimePeriods([timePeriods[0], { ...timePeriods[1], maxAmount: parseInt(e.target.value) }])}
                >
                  {Array.from({ length: 100 }, (_, i) => (
                    <option key={i} value={(i + 1) * 100}>¥{(i + 1) * 100}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? '追加中...' : '追加'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


// 時間帯ごとの最大料金テーブルコンポーネント
function MaxPricingPeriodsTable({ lotId }: { lotId: number | null }) {
  const [periods, setPeriods] = useState<Array<{ id: number; startHour: number; endHour: number; maxAmount: number }>>([]);
  const [isAddingPeriod, setIsAddingPeriod] = useState(false);
  const [newPeriod, setNewPeriod] = useState({ startHour: 19, endHour: 5, maxAmount: 1300 });

  const { data: maxPricingPeriods } = trpc.operator.getMaxPricingPeriods.useQuery(
    { parkingLotId: lotId || 0 },
    { enabled: !!lotId }
  );

  useEffect(() => {
    if (maxPricingPeriods) {
      setPeriods(maxPricingPeriods);
    }
  }, [maxPricingPeriods]);

  const saveMutation = trpc.operator.saveMaxPricingPeriod.useMutation({
    onSuccess: () => {
      toast.success('時間帯ごとの最大料金を追加しました');
      setIsAddingPeriod(false);
      setNewPeriod({ startHour: 19, endHour: 5, maxAmount: 1300 });
      if (lotId) {
        trpc.useUtils().operator.getMaxPricingPeriods.invalidate({ parkingLotId: lotId });
      }
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.operator.deleteMaxPricingPeriod.useMutation({
    onSuccess: () => {
      toast.success('時間帯ごとの最大料金を削除しました');
      if (lotId) {
        trpc.useUtils().operator.getMaxPricingPeriods.invalidate({ parkingLotId: lotId });
      }
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const handleAddPeriod = () => {
    if (!lotId) return;
    saveMutation.mutate({
      parkingLotId: lotId,
      startHour: newPeriod.startHour,
      endHour: newPeriod.endHour,
      maxAmount: newPeriod.maxAmount,
    });
  };

  const handleDeletePeriod = (periodId: number) => {
    deleteMutation.mutate({ periodId });
  };

  if (!lotId) return null;

  return (
    <div className="space-y-3">
      {periods.length === 0 ? (
        <p className="text-sm text-muted-foreground">時間帯ごとの最大料金が設定されていません</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-3 py-2 text-left">開始時間</th>
                <th className="px-3 py-2 text-left">終了時間</th>
                <th className="px-3 py-2 text-left">最大料金</th>
                <th className="px-3 py-2 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((period) => (
                <tr key={period.id} className="border-t">
                  <td className="px-3 py-2">{period.startHour}:00</td>
                  <td className="px-3 py-2">{period.endHour}:00</td>
                  <td className="px-3 py-2">¥{period.maxAmount}</td>
                  <td className="px-3 py-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePeriod(period.id)}
                      disabled={deleteMutation.isPending}
                    >
                      削除
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isAddingPeriod && (
        <div className="border rounded-lg p-3 space-y-3 bg-muted/50">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">開始時間</Label>
              <select
                className="w-full px-2 py-1 border border-input rounded text-sm bg-background"
                value={newPeriod.startHour}
                onChange={(e) => setNewPeriod({ ...newPeriod, startHour: parseInt(e.target.value) })}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{i}:00</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">終了時間</Label>
              <select
                className="w-full px-2 py-1 border border-input rounded text-sm bg-background"
                value={newPeriod.endHour}
                onChange={(e) => setNewPeriod({ ...newPeriod, endHour: parseInt(e.target.value) })}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{i}:00</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">最大料金（円）</Label>
              <Input
                type="number"
                min="0"
                step="100"
                value={newPeriod.maxAmount}
                onChange={(e) => setNewPeriod({ ...newPeriod, maxAmount: parseInt(e.target.value) })}
                className="text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddingPeriod(false)}
            >
              キャンセル
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAddPeriod}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? '追加中...' : '追加'}
            </Button>
          </div>
        </div>
      )}

      {!isAddingPeriod && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsAddingPeriod(true)}
          className="w-full"
        >
          新しい時間帯を追加
        </Button>
      )}
    </div>
  );
}
