import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Car, LogOut, RefreshCw, QrCode, Clock, CreditCard, Loader2, ArrowLeft, LayoutDashboard, History, Printer, Settings, CheckCircle, AlertCircle, ExternalLink, Smartphone, X, Check } from "lucide-react";
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
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              設定
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

          <TabsContent value="settings">
            <SettingsTab />
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
  const { data, isLoading, refetch } = trpc.admin.getPaymentHistory.useQuery();

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
          <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-bold mb-2">決済履歴がありません</h3>
          <p className="text-muted-foreground">
            決済が完了すると、ここに履歴が表示されます
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
                  {Math.floor(payment.durationMinutes / 60)}時間{payment.durationMinutes % 60}分
                </TableCell>
                <TableCell className="font-bold">¥{payment.amount.toLocaleString()}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                    payment.paymentMethod === "paypay" 
                      ? "bg-red-100 text-red-700" 
                      : payment.paymentMethod === "stripe"
                      ? "bg-purple-100 text-purple-700"
                      : payment.paymentMethod === "square"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-blue-100 text-blue-700"
                  }`}>
                    {payment.paymentMethod === "paypay" ? (
                      <>
                        <Smartphone className="w-3 h-3" />
                        PayPay
                      </>
                    ) : payment.paymentMethod === "stripe" ? (
                      <>
                        <CreditCard className="w-3 h-3" />
                        Stripe
                      </>
                    ) : payment.paymentMethod === "square" ? (
                      <>
                        <CreditCard className="w-3 h-3" />
                        Square
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-3 h-3" />
                        カード
                      </>
                    )}
                  </span>
                  {payment.isDemo && (
                    <span className="ml-2 text-xs text-muted-foreground">(デモ)</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                    payment.paymentStatus === "completed"
                      ? "bg-green-100 text-green-700"
                      : payment.paymentStatus === "pending"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                  }`}>
                    {payment.paymentStatus === "completed" ? "完了" : payment.paymentStatus === "pending" ? "処理中" : "失敗"}
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
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>QRコード一覧</CardTitle>
            <CardDescription>各駐車スペースのQRコード</CardDescription>
          </div>
          <Link href="/print-qr">
            <Button>
              <Printer className="w-4 h-4 mr-2" />
              印刷用ページ
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {data.map((space) => (
              <div key={space.id} className="p-4 border rounded-xl text-center">
                <p className="font-bold mb-2">スペース {space.spaceNumber}</p>
                <div className="bg-white p-2 rounded-lg inline-block">
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

// 設定タブ
function SettingsTab() {
  const { data: allStatus, isLoading, refetch } = trpc.paymentSettings.getAllStatus.useQuery();
  const utils = trpc.useUtils();
  
  // Stripe
  const startStripeOnboarding = trpc.stripe.startOnboarding.useMutation({
    onSuccess: (data) => {
      window.open(data.url, '_blank');
      toast.info('Stripeの設定ページを開きました');
    },
    onError: (error) => toast.error(error.message),
  });
  
  const disconnectStripe = trpc.paymentSettings.disconnectStripe.useMutation({
    onSuccess: () => {
      toast.success('Stripeの接続を解除しました');
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  
  // Square
  const getSquareOAuthUrl = trpc.square.getOAuthUrl.useMutation({
    onSuccess: (data) => {
      window.open(data.url, '_blank');
      toast.info('Squareの認証ページを開きました');
    },
    onError: (error) => toast.error(error.message),
  });
  
  const disconnectSquare = trpc.square.disconnect.useMutation({
    onSuccess: () => {
      toast.success('Squareの接続を解除しました');
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const handleSquareCallback = trpc.square.handleCallback.useMutation({
    onSuccess: () => {
      toast.success('Squareアカウントを接続しました');
      refetch();
      window.history.replaceState({}, '', '/admin');
    },
    onError: (error) => {
      toast.error(error.message || 'Square接続に失敗しました');
      window.history.replaceState({}, '', '/admin');
    },
  });
  
  // PayPay
  const [paypayForm, setPaypayForm] = useState({ apiKey: '', apiSecret: '', merchantId: '' });
  const [showPaypayForm, setShowPaypayForm] = useState(false);
  
  const savePaypayCredentials = trpc.paypay.saveCredentials.useMutation({
    onSuccess: () => {
      toast.success('PayPayの接続情報を保存しました');
      setShowPaypayForm(false);
      setPaypayForm({ apiKey: '', apiSecret: '', merchantId: '' });
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const disconnectPaypay = trpc.paypay.disconnect.useMutation({
    onSuccess: () => {
      toast.success('PayPayの接続を解除しました');
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  
  // カード決済プロバイダー切り替え
  const setCardProvider = trpc.paymentSettings.setCardProvider.useMutation({
    onSuccess: () => {
      toast.success('カード決済プロバイダーを変更しました');
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  // URLパラメータをチェック
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const stripeParam = params.get('stripe');
      const squareParam = params.get('square');
      const squareCode = params.get('code');
      
      if (stripeParam === 'complete') {
        toast.success('Stripeアカウントの設定が完了しました');
        refetch();
        window.history.replaceState({}, '', '/admin');
      } else if (stripeParam === 'refresh') {
        toast.info('Stripeの設定を続行してください');
        startStripeOnboarding.mutate();
      }
      
      if (squareParam === 'callback' && squareCode) {
        // Square OAuthコールバック処理
        handleSquareCallback.mutate({ code: squareCode });
      }
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stripeConnected = allStatus?.stripe?.connected && allStatus?.stripe?.onboardingComplete;
  const squareConnected = allStatus?.square?.connected;
  const paypayConnected = allStatus?.paypay?.connected;
  const currentCardProvider = allStatus?.cardPaymentProvider;

  return (
    <div className="space-y-6">
      {/* クレジットカード決済設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            クレジットカード決済
          </CardTitle>
          <CardDescription>
            StripeまたはSquareのどちらか一方を選択して接続できます
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stripe */}
          <div className={`p-4 rounded-lg border-2 ${currentCardProvider === 'stripe' ? 'border-purple-500 bg-purple-50' : 'border-border'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stripeConnected ? 'bg-purple-100' : 'bg-secondary'}`}>
                  <CreditCard className={`w-6 h-6 ${stripeConnected ? 'text-purple-600' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">Stripe</p>
                    {stripeConnected && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                        <CheckCircle className="w-3 h-3" />
                        接続済み
                      </span>
                    )}
                    {currentCardProvider === 'stripe' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">
                        <Check className="w-3 h-3" />
                        使用中
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {stripeConnected ? 'クレジットカード決済が有効です' : 'Stripeアカウントを接続してください'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {stripeConnected ? (
                  <>
                    {currentCardProvider !== 'stripe' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setCardProvider.mutate({ provider: 'stripe' })}
                        disabled={setCardProvider.isPending}
                      >
                        使用する
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => disconnectStripe.mutate()}
                      disabled={disconnectStripe.isPending}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <Button 
                    onClick={() => startStripeOnboarding.mutate()} 
                    disabled={startStripeOnboarding.isPending}
                  >
                    {startStripeOnboarding.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <ExternalLink className="w-4 h-4 mr-2" />
                    接続する
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Square */}
          <div className={`p-4 rounded-lg border-2 ${currentCardProvider === 'square' ? 'border-blue-500 bg-blue-50' : 'border-border'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${squareConnected ? 'bg-blue-100' : 'bg-secondary'}`}>
                  <CreditCard className={`w-6 h-6 ${squareConnected ? 'text-blue-600' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">Square</p>
                    {squareConnected && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                        <CheckCircle className="w-3 h-3" />
                        接続済み
                      </span>
                    )}
                    {currentCardProvider === 'square' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                        <Check className="w-3 h-3" />
                        使用中
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {squareConnected ? 'クレジットカード決済が有効です' : 'Squareアカウントを接続してください'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {squareConnected ? (
                  <>
                    {currentCardProvider !== 'square' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setCardProvider.mutate({ provider: 'square' })}
                        disabled={setCardProvider.isPending}
                      >
                        使用する
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => disconnectSquare.mutate()}
                      disabled={disconnectSquare.isPending}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <Button 
                    onClick={() => getSquareOAuthUrl.mutate()} 
                    disabled={getSquareOAuthUrl.isPending}
                  >
                    {getSquareOAuthUrl.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <ExternalLink className="w-4 h-4 mr-2" />
                    接続する
                  </Button>
                )}
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            ※ クレジットカード決済はStripeまたはSquareのどちらか一方のみ使用できます
          </p>
        </CardContent>
      </Card>

      {/* PayPay決済設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            PayPay決済
          </CardTitle>
          <CardDescription>
            PayPay for DevelopersのAPI情報を設定してPayPay決済を有効にします
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`p-4 rounded-lg border-2 ${paypayConnected ? 'border-red-500 bg-red-50' : 'border-border'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${paypayConnected ? 'bg-red-100' : 'bg-secondary'}`}>
                  <Smartphone className={`w-6 h-6 ${paypayConnected ? 'text-red-600' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">PayPay</p>
                    {paypayConnected && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                        <CheckCircle className="w-3 h-3" />
                        接続済み
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {paypayConnected 
                      ? `Merchant ID: ${allStatus?.paypay?.merchantId}` 
                      : 'PayPay API情報を設定してください'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {paypayConnected ? (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => disconnectPaypay.mutate()}
                    disabled={disconnectPaypay.isPending}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button 
                    onClick={() => setShowPaypayForm(true)}
                  >
                    設定する
                  </Button>
                )}
              </div>
            </div>
          </div>

          {showPaypayForm && (
            <div className="p-4 rounded-lg border bg-secondary/30 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="paypay-api-key">API Key</Label>
                <Input
                  id="paypay-api-key"
                  type="password"
                  placeholder="PayPay API Key"
                  value={paypayForm.apiKey}
                  onChange={(e) => setPaypayForm({ ...paypayForm, apiKey: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paypay-api-secret">API Secret</Label>
                <Input
                  id="paypay-api-secret"
                  type="password"
                  placeholder="PayPay API Secret"
                  value={paypayForm.apiSecret}
                  onChange={(e) => setPaypayForm({ ...paypayForm, apiSecret: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paypay-merchant-id">Merchant ID</Label>
                <Input
                  id="paypay-merchant-id"
                  placeholder="PayPay Merchant ID"
                  value={paypayForm.merchantId}
                  onChange={(e) => setPaypayForm({ ...paypayForm, merchantId: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => savePaypayCredentials.mutate(paypayForm)}
                  disabled={savePaypayCredentials.isPending || !paypayForm.apiKey || !paypayForm.apiSecret || !paypayForm.merchantId}
                >
                  {savePaypayCredentials.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  保存
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setShowPaypayForm(false);
                    setPaypayForm({ apiKey: '', apiSecret: '', merchantId: '' });
                  }}
                >
                  キャンセル
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                PayPay for Developersでアカウントを作成し、API情報を取得してください。
                <a href="https://developer.paypay.ne.jp/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">
                  PayPay for Developers →
                </a>
              </p>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            ※ PayPayはクレジットカード決済とは独立して設定できます
          </p>
        </CardContent>
      </Card>

      {/* 料金設定 */}
      <Card>
        <CardHeader>
          <CardTitle>料金設定</CardTitle>
          <CardDescription>駐車料金の設定</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">基本料金</p>
                <p className="text-sm text-muted-foreground">1時間あたりの料金</p>
              </div>
              <p className="text-2xl font-bold">¥300</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            ※ 料金設定の変更は現在開発中です
          </p>
        </CardContent>
      </Card>

      {/* 決済モード説明 */}
      <Card>
        <CardHeader>
          <CardTitle>決済モードについて</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg bg-secondary/50">
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• <strong>デモモード</strong>: 決済サービス未接続時はデモ決済（実際の課金なし）が使用されます</li>
              <li>• <strong>本番モード</strong>: 決済サービス接続後は実際の決済が有効になります</li>
              <li>• クレジットカード決済とPayPay決済は両方同時に有効にできます</li>
              <li>• 決済金額は直接あなたの決済サービスアカウントに入金されます</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// QRコード表示コンポーネント
function QRCodeDisplay({ value, size }: { value: string; size: number }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    import("qrcode").then((QRCode) => {
      QRCode.toDataURL(value, { width: size, margin: 1 }).then(setQrDataUrl);
    });
  }, [value, size]);

  if (!qrDataUrl) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <img src={qrDataUrl} alt="QR Code" width={size} height={size} />;
}
