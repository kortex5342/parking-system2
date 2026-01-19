import { useState } from 'react';
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function OperatorDashboard() {
  const [selectedOwnerId, setSelectedOwnerId] = useState<number | null>(null);
  const [selectedLotId, setSelectedLotId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: owners, isLoading: ownersLoading } = trpc.operator.getAllOwners.useQuery();
  const { data: parkingLots, isLoading: lotsLoading } = trpc.operator.getAllParkingLots.useQuery();
  const { data: selectedLot } = trpc.operator.getParkingLot.useQuery(
    { lotId: selectedLotId || 0 },
    { enabled: !!selectedLotId }
  );

  const deleteMutation = trpc.owner.deleteParkingLot.useMutation({
    onSuccess: () => {
      toast.success('駐車場を削除しました');
      setShowDeleteConfirm(false);
      setSelectedLotId(null);
      // Invalidate queries to refresh data
      const utils = trpc.useUtils();
      utils.operator.getAllParkingLots.invalidate();
    },
    onError: (error) => {
      toast.error(`削除に失敗しました: ${error.message}`);
    },
  });

  const handleDeleteParkingLot = () => {
    if (selectedLotId) {
      deleteMutation.mutate({ lotId: selectedLotId });
    }
  };

  if (ownersLoading || lotsLoading) {
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
                <CardTitle>オーナー一覧</CardTitle>
                <CardDescription>{owners?.length || 0}件</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {owners?.map((owner) => (
                  <Card
                    key={owner.id}
                    className="cursor-pointer hover:bg-muted/50"
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
            <Card>
              <CardHeader>
                <CardTitle>駐車場一覧</CardTitle>
                <CardDescription>{parkingLots?.length || 0}件</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {parkingLots?.map((lot) => (
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
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

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
    </div>
  );
}
