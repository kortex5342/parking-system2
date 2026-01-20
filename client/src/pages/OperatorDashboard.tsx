import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, X, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function OperatorDashboard() {
  const [selectedOwnerId, setSelectedOwnerId] = useState<number | null>(null);
  const [selectedLotId, setSelectedLotId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddOwnerDialog, setShowAddOwnerDialog] = useState(false);
  const [showEditLotDialog, setShowEditLotDialog] = useState(false);
  const [showAddParkingLotDialog, setShowAddParkingLotDialog] = useState(false);
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [editLotData, setEditLotData] = useState<any>(null);
  // 駐車場追加用のステート
  const [newLotName, setNewLotName] = useState('');
  const [newLotAddress, setNewLotAddress] = useState('');
  const [newLotTotalSpaces, setNewLotTotalSpaces] = useState(10);
  const [newLotPricingUnit, setNewLotPricingUnit] = useState(60);
  const [newLotPricingAmount, setNewLotPricingAmount] = useState(300);
  const [newLotMaxDailyAmount, setNewLotMaxDailyAmount] = useState(3000);
  const [newLotMaxDailyEnabled, setNewLotMaxDailyEnabled] = useState(true);
  const [newLotTimePeriodEnabled, setNewLotTimePeriodEnabled] = useState(false);
  // 時間帯ごとの最大料金設定
  const [dayEnabled, setDayEnabled] = useState(true);
  const [dayStartHour, setDayStartHour] = useState(5);
  const [dayEndHour, setDayEndHour] = useState(19);
  const [dayMaxAmount, setDayMaxAmount] = useState(3000);
  const [nightEnabled, setNightEnabled] = useState(true);
  const [nightStartHour, setNightStartHour] = useState(19);
  const [nightEndHour, setNightEndHour] = useState(5);
  const [nightMaxAmount, setNightMaxAmount] = useState(1300);
  // 月別売上用のステート
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const { data: owners, isLoading: ownersLoading } = trpc.operator.getAllOwners.useQuery();
  const { data: parkingLots, isLoading: lotsLoading } = trpc.operator.getAllParkingLots.useQuery();
  const { data: selectedOwnerDetail, isLoading: ownerDetailLoading } = trpc.operator.getOwnerDetail.useQuery(
    { userId: selectedOwnerId || 0 },
    { enabled: !!selectedOwnerId }
  );
  const { data: selectedLot } = trpc.operator.getParkingLot.useQuery(
    { lotId: selectedLotId || 0 },
    { enabled: !!selectedLotId }
  );
  // 月別売上取得
  const { data: monthlySales } = trpc.operator.getOwnerMonthlySalesByYearMonth.useQuery(
    { ownerId: selectedOwnerId || 0, year: selectedYear, month: selectedMonth },
    { enabled: !!selectedOwnerId }
  );

  const deleteMutation = trpc.owner.deleteParkingLot.useMutation({
    onSuccess: () => {
      toast.success('駐車場を削除しました');
      setShowDeleteConfirm(false);
      setSelectedLotId(null);
      // Invalidate queries to refresh data
      try {
        const utils = trpc.useUtils();
        utils.operator.getAllParkingLots.invalidate();
      } catch (error) {
        console.error('Failed to invalidate queries:', error);
      }
    },
    onError: (error: any) => {
      toast.error(`削除に失敗しました: ${error.message}`);
    },
  });

  const createOwnerMutation = (trpc.admin as any).addOwner.useMutation({
    onSuccess: () => {
      toast.success('オーナーを追加しました');
      setShowAddOwnerDialog(false);
      setNewOwnerName('');
      setNewOwnerEmail('');
      // Invalidate queries to refresh data
      try {
        const utils = trpc.useUtils();
        utils.operator.getAllOwners.invalidate();
      } catch (error) {
        console.error('Failed to invalidate queries:', error);
      }
    },
    onError: (error: any) => {
      toast.error(`オーナー追加に失敗しました: ${error.message}`);
    },
  });

  const createParkingLotMutation = (trpc.admin as any).createParkingLotForOwner.useMutation({
    onSuccess: () => {
      toast.success('駐車場を追加しました');
      setShowAddParkingLotDialog(false);
      setNewLotName('');
      setNewLotAddress('');
      setNewLotTotalSpaces(10);
      setNewLotPricingUnit(60);
      setNewLotPricingAmount(300);
      setNewLotMaxDailyAmount(3000);
      setNewLotMaxDailyEnabled(true);
      setNewLotTimePeriodEnabled(false);
      setDayEnabled(true);
      setDayStartHour(5);
      setDayEndHour(19);
      setDayMaxAmount(3000);
      setNightEnabled(true);
      setNightStartHour(19);
      setNightEndHour(5);
      setNightMaxAmount(1300);
      // Invalidate queries to refresh data
      try {
        const utils = trpc.useUtils();
        utils.operator.getAllParkingLots.invalidate();
        utils.operator.getOwnerDetail.invalidate();
      } catch (error) {
        console.error('Failed to invalidate queries:', error);
      }
    },
    onError: (error: any) => {
      toast.error(`駐車場追加に失敗しました: ${error.message}`);
    },
  });

  const handleDeleteParkingLot = () => {
    if (selectedLotId) {
      deleteMutation.mutate({ lotId: selectedLotId });
    }
  };

  const handleAddOwner = () => {
    if (!newOwnerName || !newOwnerEmail) {
      toast.error('名前とメールアドレスを入力してください');
      return;
    }
    // customUrlを自動生成（メールアドレスのローカルパートを使用）
    const customUrl = newOwnerEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    createOwnerMutation.mutate({
      name: newOwnerName,
      email: newOwnerEmail,
      customUrl: customUrl,
    });
  };

  const handleAddParkingLot = () => {
    if (!selectedOwnerId) {
      toast.error('オーナーを選択してください');
      return;
    }
    if (!newLotName) {
      toast.error('駐車場名を入力してください');
      return;
    }
    createParkingLotMutation.mutate({
      ownerId: selectedOwnerId,
      name: newLotName,
      address: newLotAddress || null,
      totalSpaces: newLotTotalSpaces,
      pricingUnitMinutes: newLotPricingUnit,
      pricingAmount: newLotPricingAmount,
      maxDailyAmount: newLotMaxDailyEnabled ? newLotMaxDailyAmount : null,
      maxDailyAmountEnabled: newLotMaxDailyEnabled,
      timePeriodEnabled: newLotTimePeriodEnabled,
      timePeriods: newLotTimePeriodEnabled ? [
        ...(dayEnabled ? [{ startHour: dayStartHour, endHour: dayEndHour, maxAmount: dayMaxAmount }] : []),
        ...(nightEnabled ? [{ startHour: nightStartHour, endHour: nightEndHour, maxAmount: nightMaxAmount }] : []),
      ] : [],
    });
  };

  if (ownersLoading || lotsLoading || (selectedOwnerId && ownerDetailLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <header className="border-b bg-card">
        <div className="container py-4">
          <h1 className="text-2xl font-bold">オペレーターダッシュボード</h1>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* オーナー一覧 */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>オーナー一覧</CardTitle>
                    <CardDescription>{owners?.length || 0}件</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddOwnerDialog(true)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    {selectedOwnerId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedOwnerId(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {owners?.map((owner) => (
                  <Card
                    key={owner.id}
                    className={`cursor-pointer hover:bg-muted/50 ${
                      selectedOwnerId === owner.id ? 'border-primary border-2' : ''
                    }`}
                    onClick={() => setSelectedOwnerId(owner.id)}
                  >
                    <CardContent className="pt-4">
                      <p className="font-semibold text-sm">{owner.name}</p>
                      <p className="text-xs text-muted-foreground">{owner.openId}</p>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* 駐車場一覧 */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              {selectedOwnerId && selectedOwnerDetail && (
                <>
                  {/* 売上情報カード */}
                  <Card>
                    <CardHeader>
                      <CardTitle>{selectedOwnerDetail.user.name}の売上</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                          <p className="text-sm text-muted-foreground">総売上</p>
                          <p className="text-2xl font-bold">¥{selectedOwnerDetail.salesSummary.totalAmount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">取引件数</p>
                          <p className="text-2xl font-bold">{selectedOwnerDetail.salesSummary.totalTransactions}件</p>
                        </div>
                      </div>
                      
                      {/* 月別売上 */}
                      <div className="border-t pt-4">
                        <p className="text-sm font-medium mb-3">月別売上</p>
                        <div className="flex gap-2 mb-3">
                          <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="border rounded px-2 py-1 text-sm"
                          >
                            {Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i).map(year => (
                              <option key={year} value={year}>{year}年</option>
                            ))}
                          </select>
                          <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="border rounded px-2 py-1 text-sm"
                          >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                              <option key={month} value={month}>{month}月</option>
                            ))}
                          </select>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-4 text-center">
                          <p className="text-sm text-muted-foreground">{selectedYear}年{selectedMonth}月の売上</p>
                          <p className="text-2xl font-bold">¥{(monthlySales?.totalAmount || 0).toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">{monthlySales?.totalTransactions || 0}件の取引</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 振込先情報カード */}
                  <Card>
                    <CardHeader>
                      <CardTitle>振込先情報</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedOwnerDetail.bankInfo?.bankName ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <p className="text-muted-foreground">銀行名</p>
                            <p className="font-medium">{selectedOwnerDetail.bankInfo.bankName}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <p className="text-muted-foreground">支店名</p>
                            <p className="font-medium">{selectedOwnerDetail.bankInfo.branchName || '-'}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <p className="text-muted-foreground">口座種別</p>
                            <p className="font-medium">{selectedOwnerDetail.bankInfo.accountType === 'savings' ? '普通' : selectedOwnerDetail.bankInfo.accountType === 'checking' ? '当座' : '-'}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <p className="text-muted-foreground">口座番号</p>
                            <p className="font-medium">{selectedOwnerDetail.bankInfo.accountNumber || '-'}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <p className="text-muted-foreground">口座名義</p>
                            <p className="font-medium">{selectedOwnerDetail.bankInfo.accountHolder || '-'}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">振込先情報が設定されていません</p>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>駐車場一覧</CardTitle>
                      <CardDescription>
                        {selectedOwnerId
                          ? `${selectedOwnerDetail?.parkingLots.length || 0}件`
                          : `${parkingLots?.length || 0}件`}
                      </CardDescription>
                    </div>
                    {selectedOwnerId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddParkingLotDialog(true)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        駐車場を追加
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedOwnerId && ownerDetailLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : selectedOwnerId && selectedOwnerDetail ? (
                      selectedOwnerDetail.parkingLots.length > 0 ? (
                      selectedOwnerDetail.parkingLots.map((lot) => (
                        <Card
                          key={lot.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => {
                            setSelectedLotId(lot.id);
                            setEditLotData(lot);
                            setShowEditLotDialog(true);
                          }}
                        >
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-semibold">{lot.name}</p>
                                <p className="text-sm text-muted-foreground">{lot.address}</p>
                                <div className="flex gap-2 mt-2">
                                  <Badge variant="outline">
                                    {lot.totalSpaces}台
                                  </Badge>
                                  <Badge variant={lot.status === 'active' ? 'default' : 'secondary'}>
                                    {lot.status === 'active' ? '有効' : '無効'}
                                  </Badge>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedLotId(lot.id);
                                  setShowDeleteConfirm(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">駐車場がありません</p>
                    )
                    ) : (
                      parkingLots?.map((lot) => (
                        <Card
                          key={lot.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedLotId(lot.id)}
                        >
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-semibold">{lot.name}</p>
                                <p className="text-sm text-muted-foreground">{lot.address}</p>
                                <div className="flex gap-2 mt-2">
                                  <Badge variant="outline">
                                    {lot.totalSpaces}台
                                  </Badge>
                                  <Badge variant={lot.status === 'active' ? 'default' : 'secondary'}>
                                    {lot.status === 'active' ? '有効' : '無効'}
                                  </Badge>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedLotId(lot.id);
                                  setShowDeleteConfirm(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* 駐車場詳細編集ダイアログ */}
      <Dialog open={showEditLotDialog} onOpenChange={setShowEditLotDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>駐車場詳細編集</DialogTitle>
            <DialogDescription>
              {editLotData?.name}
            </DialogDescription>
          </DialogHeader>
          {editLotData && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>駐車場名</Label>
                  <p className="text-sm font-medium mt-1">{editLotData.name}</p>
                </div>
                <div>
                  <Label>住所</Label>
                  <p className="text-sm font-medium mt-1">{editLotData.address || '-'}</p>
                </div>
                <div>
                  <Label>駐車台数</Label>
                  <p className="text-sm font-medium mt-1">{editLotData.totalSpaces}台</p>
                </div>
                <div>
                  <Label>ステータス</Label>
                  <p className="text-sm font-medium mt-1">{editLotData.status === 'active' ? '有効' : '無効'}</p>
                </div>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">料金設定</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>計算単位</Label>
                    <p className="text-sm font-medium mt-1">{editLotData.pricingUnitMinutes}分</p>
                  </div>
                  <div>
                    <Label>料金</Label>
                    <p className="text-sm font-medium mt-1">\u00a5{editLotData.pricingAmount}</p>
                  </div>
                </div>
              </div>
              {editLotData.maxDailyAmountEnabled && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">1日の最大駐車料金</h4>
                  <p className="text-sm font-medium">\u00a5{editLotData.maxDailyAmount}</p>
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowEditLotDialog(false)}
            >
              閉じる
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>駐車場を削除</DialogTitle>
            <DialogDescription>
              「{selectedLot?.lot.name}」を削除してもよろしいですか？この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteParkingLot}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? '削除中...' : '削除'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* オーナー追加ダイアログ */}
      <Dialog open={showAddOwnerDialog} onOpenChange={setShowAddOwnerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>オーナーを追加</DialogTitle>
            <DialogDescription>
              新しいオーナーを追加します
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="owner-name">名前</Label>
              <Input
                id="owner-name"
                value={newOwnerName}
                onChange={(e) => setNewOwnerName(e.target.value)}
                placeholder="オーナー名"
              />
            </div>
            <div>
              <Label htmlFor="owner-email">メールアドレス</Label>
              <Input
                id="owner-email"
                type="email"
                value={newOwnerEmail}
                onChange={(e) => setNewOwnerEmail(e.target.value)}
                placeholder="example@example.com"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowAddOwnerDialog(false)}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleAddOwner}
              disabled={createOwnerMutation.isPending}
            >
              {createOwnerMutation.isPending ? '追加中...' : '追加'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 駐車場追加ダイアログ */}
      <Dialog open={showAddParkingLotDialog} onOpenChange={setShowAddParkingLotDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>駐車場を追加</DialogTitle>
            <DialogDescription>
              {selectedOwnerDetail?.user.name}に新しい駐車場を追加します
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="lot-name">駐車場名 *</Label>
              <Input
                id="lot-name"
                value={newLotName}
                onChange={(e) => setNewLotName(e.target.value)}
                placeholder="駐車場名を入力"
              />
            </div>
            <div>
              <Label htmlFor="lot-address">住所</Label>
              <Input
                id="lot-address"
                value={newLotAddress}
                onChange={(e) => setNewLotAddress(e.target.value)}
                placeholder="住所を入力"
              />
            </div>
            <div>
              <Label htmlFor="lot-spaces">駐車台数</Label>
              <Input
                id="lot-spaces"
                type="number"
                min={1}
                value={newLotTotalSpaces}
                onChange={(e) => setNewLotTotalSpaces(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lot-pricing-unit">計算単位（分）</Label>
                <Input
                  id="lot-pricing-unit"
                  type="number"
                  min={1}
                  value={newLotPricingUnit}
                  onChange={(e) => setNewLotPricingUnit(parseInt(e.target.value) || 60)}
                />
              </div>
              <div>
                <Label htmlFor="lot-pricing-amount">料金（円）</Label>
                <Input
                  id="lot-pricing-amount"
                  type="number"
                  min={0}
                  value={newLotPricingAmount}
                  onChange={(e) => setNewLotPricingAmount(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
            {/* 1日の最大駐車料金設定 */}
            <div className="border-t pt-4">
              <div className="flex items-center space-x-2 mb-3">
                <Checkbox
                  id="max-daily-enabled"
                  checked={newLotMaxDailyEnabled}
                  onCheckedChange={(checked) => setNewLotMaxDailyEnabled(checked === true)}
                />
                <Label htmlFor="max-daily-enabled" className="font-semibold">
                  1日の最大駐車料金を設定する
                </Label>
              </div>
              {newLotMaxDailyEnabled && (
                <div>
                  <Label htmlFor="lot-max-daily">1日の最大駐車料金（円）</Label>
                  <Input
                    id="lot-max-daily"
                    type="number"
                    min={0}
                    value={newLotMaxDailyAmount}
                    onChange={(e) => setNewLotMaxDailyAmount(parseInt(e.target.value) || 0)}
                  />
                </div>
              )}
            </div>

            {/* 時間帯ごとの最大料金設定 */}
            <div className="border-t pt-4">
              <div className="flex items-center space-x-2 mb-3">
                <Checkbox
                  id="time-period-enabled"
                  checked={newLotTimePeriodEnabled}
                  onCheckedChange={(checked) => setNewLotTimePeriodEnabled(checked === true)}
                />
                <Label htmlFor="time-period-enabled" className="font-semibold">
                  時間帯ごとの最大料金を設定する（昼/夜）
                </Label>
              </div>
              {newLotTimePeriodEnabled && (
                <div className="space-y-4">
                  {/* 昼間設定 */}
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Checkbox
                        id="day-enabled"
                        checked={dayEnabled}
                        onCheckedChange={(checked) => setDayEnabled(checked === true)}
                      />
                      <Label htmlFor="day-enabled" className="font-medium">昼間の最大料金を設定する</Label>
                    </div>
                    {dayEnabled && (
                      <>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-xs">開始時間</Label>
                            <Input
                              type="number"
                              min={0}
                              max={23}
                              value={dayStartHour}
                              onChange={(e) => setDayStartHour(parseInt(e.target.value) || 0)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">終了時間</Label>
                            <Input
                              type="number"
                              min={0}
                              max={23}
                              value={dayEndHour}
                              onChange={(e) => setDayEndHour(parseInt(e.target.value) || 0)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">最大料金（円）</Label>
                            <Input
                              type="number"
                              min={0}
                              value={dayMaxAmount}
                              onChange={(e) => setDayMaxAmount(parseInt(e.target.value) || 0)}
                            />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          例: {dayStartHour}時～{dayEndHour}時は最大￥{dayMaxAmount.toLocaleString()}
                        </p>
                      </>
                    )}
                  </div>
                  {/* 夜間設定 */}
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Checkbox
                        id="night-enabled"
                        checked={nightEnabled}
                        onCheckedChange={(checked) => setNightEnabled(checked === true)}
                      />
                      <Label htmlFor="night-enabled" className="font-medium">夜間の最大料金を設定する</Label>
                    </div>
                    {nightEnabled && (
                      <>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-xs">開始時間</Label>
                            <Input
                              type="number"
                              min={0}
                              max={23}
                              value={nightStartHour}
                              onChange={(e) => setNightStartHour(parseInt(e.target.value) || 0)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">終了時間</Label>
                            <Input
                              type="number"
                              min={0}
                              max={23}
                              value={nightEndHour}
                              onChange={(e) => setNightEndHour(parseInt(e.target.value) || 0)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">最大料金（円）</Label>
                            <Input
                              type="number"
                              min={0}
                              value={nightMaxAmount}
                              onChange={(e) => setNightMaxAmount(parseInt(e.target.value) || 0)}
                            />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          例: {nightStartHour}時～{nightEndHour}時は最大￥{nightMaxAmount.toLocaleString()}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowAddParkingLotDialog(false)}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleAddParkingLot}
              disabled={createParkingLotMutation.isPending}
            >
              {createParkingLotMutation.isPending ? '追加中...' : '追加'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
