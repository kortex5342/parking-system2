import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Car, LogOut, RefreshCw, QrCode, Clock, CreditCard, Loader2, ArrowLeft, LayoutDashboard, History, Printer } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function Admin() {
  const { user, loading, isAuthenticated, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        <div className="geometric-shape w-64 h-64 bg-accent top-10 -right-32" />
        <div className="geometric-shape w-48 h-48 bottom-20 -left-24" style={{ backgroundColor: 'var(--blush)' }} />
        
        <div className="relative z-10 container py-20">
          <div className="max-w-md mx-auto text-center">
            <Car className="w-16 h-16 mx-auto mb-6 text-muted-foreground" />
            <h1 className="text-3xl font-bold mb-4">管理者ログイン</h1>
            <p className="text-muted-foreground mb-8">
              管理画面にアクセスするにはログインが必要です
            </p>
            <Button asChild size="lg" className="w-full">
              <a href={getLoginUrl()}>ログイン</a>
            </Button>
            <Link href="/">
              <Button variant="link" className="mt-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                ホームへ戻る
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        <div className="geometric-shape w-64 h-64 bg-accent top-10 -right-32" />
        
        <div className="relative z-10 container py-20">
          <div className="max-w-md mx-auto text-center">
            <Car className="w-16 h-16 mx-auto mb-6 text-destructive" />
            <h1 className="text-3xl font-bold mb-4">アクセス権限がありません</h1>
            <p className="text-muted-foreground mb-8">
              この画面は管理者のみアクセスできます
            </p>
            <Link href="/">
              <Button size="lg">
                <ArrowLeft className="w-4 h-4 mr-2" />
                ホームへ戻る
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <AdminDashboard user={user} onLogout={logout} />;
}

function AdminDashboard({ user, onLogout }: { user: any; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <header className="border-b border-border bg-card">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </Link>
              <div className="flex items-center gap-2">
                <Car className="w-6 h-6" />
                <span className="font-bold text-lg">ParkEase 管理</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">{user.name || user.email}</span>
              <Button variant="outline" size="sm" onClick={onLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                ログアウト
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-8">
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="w-4 h-4" />
              入庫状況
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              決済履歴
            </TabsTrigger>
            <TabsTrigger value="qrcodes" className="gap-2">
              <QrCode className="w-4 h-4" />
              QRコード
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <DashboardTab />
          </TabsContent>

          <TabsContent value="history">
            <PaymentHistoryTab />
          </TabsContent>

          <TabsContent value="qrcodes">
            <QRCodesTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ダッシュボードタブ
function DashboardTab() {
  const { data, isLoading, refetch } = trpc.admin.getDashboard.useQuery();
  const initMutation = trpc.admin.initializeSpaces.useMutation({
    onSuccess: () => {
      toast.success("駐車スペースを初期化しました");
      refetch();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || data.spaces.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Car className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-bold mb-2">駐車スペースがありません</h3>
          <p className="text-muted-foreground mb-4">
            10台分の駐車スペースを初期化してください
          </p>
          <Button onClick={() => initMutation.mutate()} disabled={initMutation.isPending}>
            {initMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            初期化する
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center">
                <Car className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">総スペース数</p>
                <p className="text-3xl font-bold">{data.summary.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--success)', opacity: 0.2 }}>
                <Car className="w-6 h-6" style={{ color: 'var(--success)' }} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">空きスペース</p>
                <p className="text-3xl font-bold" style={{ color: 'var(--success)' }}>{data.summary.available}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-destructive/20 rounded-lg flex items-center justify-center">
                <Car className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">使用中</p>
                <p className="text-3xl font-bold text-destructive">{data.summary.occupied}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* スペース一覧 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>駐車スペース一覧</CardTitle>
            <CardDescription>現在の入庫状況</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            更新
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {data.spaces.map((space) => (
              <div
                key={space.id}
                className={`p-4 rounded-xl border-2 ${
                  space.status === "available"
                    ? "border-[var(--success)] bg-[var(--success)]/5"
                    : "border-destructive bg-destructive/5"
                }`}
              >
                <div className="text-center">
                  <p className="text-3xl font-bold mb-2">{space.spaceNumber}</p>
                  <span className={space.status === "available" ? "status-available" : "status-occupied"}>
                    {space.status === "available" ? "空き" : "使用中"}
                  </span>
                  {space.activeRecord && (
                    <div className="mt-3 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {new Date(space.activeRecord.entryTime).toLocaleTimeString("ja-JP", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      〜
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 決済履歴タブ
function PaymentHistoryTab() {
  const { data, isLoading, refetch } = trpc.admin.getPaymentHistory.useQuery({ limit: 100 });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <CreditCard className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-bold mb-2">決済履歴がありません</h3>
          <p className="text-muted-foreground">
            まだ決済が行われていません
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>決済履歴</CardTitle>
          <CardDescription>過去の決済一覧</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          更新
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>スペース</TableHead>
              <TableHead>入庫時刻</TableHead>
              <TableHead>出庫時刻</TableHead>
              <TableHead>駐車時間</TableHead>
              <TableHead>金額</TableHead>
              <TableHead>決済方法</TableHead>
              <TableHead>ステータス</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell className="font-medium">{payment.spaceNumber}番</TableCell>
                <TableCell>
                  {new Date(payment.entryTime).toLocaleString("ja-JP", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </TableCell>
                <TableCell>
                  {new Date(payment.exitTime).toLocaleString("ja-JP", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </TableCell>
                <TableCell>
                  {Math.ceil(payment.durationMinutes / 60)}時間
                  {payment.durationMinutes % 60 > 0 && `${payment.durationMinutes % 60}分`}
                </TableCell>
                <TableCell className="font-medium">¥{payment.amount.toLocaleString()}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                    payment.paymentMethod === "paypay"
                      ? "bg-[#FF0033]/10 text-[#FF0033]"
                      : "bg-gray-100 text-gray-700"
                  }`}>
                    {payment.paymentMethod === "paypay" ? "PayPay" : "クレジット"}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                    payment.paymentStatus === "completed"
                      ? "bg-[var(--success)]/10 text-[var(--success)]"
                      : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {payment.paymentStatus === "completed" ? "完了" : "処理中"}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// QRコードタブ
function QRCodesTab() {
  const { data, isLoading } = trpc.parking.getAllSpaces.useQuery();
  const [baseUrl, setBaseUrl] = useState("");

  // クライアントサイドでURLを取得
  useState(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <QrCode className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-bold mb-2">QRコードがありません</h3>
          <p className="text-muted-foreground">
            まず駐車スペースを初期化してください
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>QRコード一覧</CardTitle>
          <CardDescription>
            各駐車スペースのQRコードです。印刷して設置してください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/admin/print-qr">
            <Button className="mb-6">
              <Printer className="w-4 h-4 mr-2" />
              印刷用ページを開く
            </Button>
          </Link>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {data.map((space) => (
              <div key={space.id} className="scandi-card text-center">
                <p className="text-2xl font-bold mb-2">{space.spaceNumber}番</p>
                <div className="bg-white p-2 rounded-lg mb-2">
                  <QRCodeDisplay value={`${baseUrl}/scan?qr=${space.qrCode}`} size={120} />
                </div>
                <p className="text-xs text-muted-foreground break-all">{space.qrCode}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// QRコード表示コンポーネント
function QRCodeDisplay({ value, size }: { value: string; size: number }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useState(() => {
    import("qrcode").then((QRCode) => {
      QRCode.toDataURL(value, { width: size, margin: 1 }).then(setQrDataUrl);
    });
  });

  if (!qrDataUrl) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <img src={qrDataUrl} alt="QR Code" width={size} height={size} />;
}
