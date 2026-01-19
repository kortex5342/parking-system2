import React, { useState } from 'react';
import { useRoute } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Copy, Check } from 'lucide-react';

export default function OperatorDashboard() {
  const { user } = useAuth();
  const [match] = useRoute('/operator');

  if (!match) return null;
  if (!user || user.role !== 'admin') {
    return <div className="p-4 text-red-600">管理者のみアクセス可能です</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">運営者ダッシュボード</h1>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">概要</TabsTrigger>
            <TabsTrigger value="pending">承認待ち</TabsTrigger>
            <TabsTrigger value="owners">オーナー</TabsTrigger>
            <TabsTrigger value="parking">駐車場</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab />
          </TabsContent>

          <TabsContent value="pending">
            <PendingTab />
          </TabsContent>

          <TabsContent value="owners">
            <OwnersTab />
          </TabsContent>

          <TabsContent value="parking">
            <ParkingTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// 概要タブ
function OverviewTab() {
  const { data: owners } = trpc.operator.getAllOwners.useQuery();
  const { data: parkingLots } = trpc.operator.getAllParkingLots.useQuery();

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">登録オーナー数</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{owners?.length || 0}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">駐車場数</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{parkingLots?.length || 0}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">本日の売上</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">¥0</div>
        </CardContent>
      </Card>
    </div>
  );
}

// 承認待ちタブ
function PendingTab() {
  const { data: pendingUsers } = trpc.operator.getPendingOwners.useQuery();

  if (!pendingUsers?.length) {
    return <div className="text-center py-8 text-muted-foreground">承認待ちのユーザーはいません</div>;
  }

  const approveMutation = trpc.operator.approveOwner.useMutation({
    onSuccess: () => {
      toast.success('承認しました');
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
          {pendingUsers.map((user: any) => (
            <div key={user.id} className="flex justify-between items-center p-4 border rounded">
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

  if (isLoading || !data) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{data.user?.name}の詳細</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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
      </DialogContent>
    </Dialog>
  );
}

// 駐車場タブ
function ParkingTab() {
  const { data: parkingLots } = trpc.operator.getAllParkingLots.useQuery();

  if (!parkingLots?.length) {
    return <div className="text-center py-8 text-muted-foreground">駐車場はまだ登録されていません</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {parkingLots.map((lot: any) => (
        <Card key={lot.id}>
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
  );
}

// 新規オーナー追加セクション
function AddOwnerSection() {
  const [isOpen, setIsOpen] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successData, setSuccessData] = useState<{ name: string; customUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    customUrl: '',
  });
  const utils = trpc.useUtils();

  const addOwnerMutation = trpc.operator.addOwner.useMutation({
    onSuccess: (data: any) => {
      setSuccessData({ name: formData.name, customUrl: data.customUrl });
      setShowSuccessDialog(true);
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

  const copyToClipboard = () => {
    if (successData) {
      const url = `${window.location.origin}/owner/${successData.customUrl}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('URLをコピーしました');
      setTimeout(() => setCopied(false), 2000);
    }
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

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>オーナーを追加しました</DialogTitle>
            <DialogDescription>
              {successData?.name}のオーナーページURLを以下に示します。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>オーナーページURL</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={successData ? `${window.location.origin}/owner/${successData.customUrl}` : ''}
                  className="bg-muted"
                />
                <Button onClick={copyToClipboard} variant="outline" size="sm">
                  {copied ? 'コピー済み' : 'コピー'}
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              このURLをオーナーに送信してください。
            </p>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowSuccessDialog(false)}>
              完了
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

