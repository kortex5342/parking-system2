import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Car,
  Clock,
  CreditCard,
  History,
  Loader2,
  QrCode,
  Settings,
  CheckCircle2,
  XCircle,
  Wallet,
  RefreshCw,
  Edit,
} from "lucide-react";
import { Link } from "wouter";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import QRCode from "qrcode";
import { PaymentSettingsTab } from "@/components/PaymentSettingsTab";
import { OwnerManagementTab } from "@/components/OwnerManagementTab";

export default function Admin() {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>管理者ログイン</CardTitle>
            <CardDescription>管理画面にアクセスするにはログインが必要です</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>ログイン</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>アクセス権限がありません</CardTitle>
            <CardDescription>この画面は管理者のみアクセスできます</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/">ホームへ戻る</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 幾何学図形の背景 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-32 h-32 bg-[var(--accent-blue)]/30 rounded-full blur-2xl" />
        <div className="absolute bottom-40 left-10 w-24 h-24 bg-[var(--accent-pink)]/30 rounded-full blur-xl" />
      </div>

      <div className="relative z-10">
        {/* ヘッダー */}
        <header className="border-b border-border bg-background/80 backdrop-blur-sm">
          <div className="container py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/">
                  <Button variant="ghost" size="sm">
                    ← ホーム
                  </Button>
                </Link>
                <h1 className="text-2xl font-bold">管理ダッシュボード</h1>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{user?.name || user?.email}</span>
                <Badge variant="secondary">管理者</Badge>
              </div>
            </div>
          </div>
        </header>

        {/* メインコンテンツ */}
        <main className="container py-8">
          <Tabs defaultValue="status" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
              <TabsTrigger value="status" className="gap-2">
                <Car className="w-4 h-4" />
                <span className="hidden sm:inline">入庫状況</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">決済履歴</span>
              </TabsTrigger>
              <TabsTrigger value="qr" className="gap-2">
                <QrCode className="w-4 h-4" />
                <span className="hidden sm:inline">QRコード</span>
              </TabsTrigger>
              <TabsTrigger value="parking" className="gap-2">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">駐車場管理</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Wallet className="w-4 h-4" />
                <span className="hidden sm:inline">決済設定</span>
              </TabsTrigger>
              <TabsTrigger value="owners" className="gap-2">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">オーナー管理</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="status">
              <StatusTab />
            </TabsContent>

            <TabsContent value="history">
              <HistoryTab />
            </TabsContent>

            <TabsContent value="qr">
              <QRTab />
            </TabsContent>

            <TabsContent value="parking">
              <ParkingManagementTab />
            </TabsContent>

            <TabsContent value="settings">
              <PaymentSettingsTab />
            </TabsContent>

            <TabsContent value="owners">
              <OwnerManagementTab />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}

// 入庫状況タブ
function StatusTab() {
  const { data, isLoading, refetch } = trpc.admin.getDashboard.useQuery();
  const initMutation = trpc.admin.initializeSpaces.useMutation({
    onSuccess: () => {
      toast.success("駐車スペースを初期化しました");
      refetch();
    },
    onError: (err) => toast.error(err.message),
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
          <p className="text-muted-foreground mb-4">駐車スペースがまだ初期化されていません</p>
          <Button onClick={() => initMutation.mutate()} disabled={initMutation.isPending}>
            {initMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            駐車スペースを初期化
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* サマリー */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-4xl font-bold">{data.summary.total}</p>
            <p className="text-sm text-muted-foreground">総スペース</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-4xl font-bold text-[var(--success)]">{data.summary.available}</p>
            <p className="text-sm text-muted-foreground">空き</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-4xl font-bold text-destructive">{data.summary.occupied}</p>
            <p className="text-sm text-muted-foreground">使用中</p>
          </CardContent>
        </Card>
      </div>

      {/* スペース一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>駐車スペース一覧</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {data.spaces.map((space) => (
              <div
                key={space.id}
                className={`p-4 rounded-lg border-2 text-center ${
                  space.status === "available"
                    ? "border-[var(--success)] bg-[var(--success)]/10"
                    : "border-destructive bg-destructive/10"
                }`}
              >
                <Car
                  className={`w-8 h-8 mx-auto mb-2 ${
                    space.status === "available" ? "text-[var(--success)]" : "text-destructive"
                  }`}
                />
                <p className="font-bold text-lg">{space.spaceNumber}番</p>
                <Badge variant={space.status === "available" ? "outline" : "destructive"}>
                  {space.status === "available" ? "空き" : "使用中"}
                </Badge>
                {space.activeRecord && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {new Date(space.activeRecord.entryTime).toLocaleTimeString("ja-JP", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    〜
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 決済履歴タブ
function HistoryTab() {
  const { data, isLoading } = trpc.admin.getPaymentHistory.useQuery();

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
          <p className="text-muted-foreground">決済履歴がありません</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>決済履歴</CardTitle>
        <CardDescription>過去の決済記録一覧</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2">スペース</th>
                <th className="text-left py-3 px-2">入庫時刻</th>
                <th className="text-left py-3 px-2">出庫時刻</th>
                <th className="text-left py-3 px-2">時間</th>
                <th className="text-left py-3 px-2">金額</th>
                <th className="text-left py-3 px-2">決済方法</th>
                <th className="text-left py-3 px-2">状態</th>
              </tr>
            </thead>
            <tbody>
              {data.map((payment) => (
                <tr key={payment.id} className="border-b">
                  <td className="py-3 px-2">{payment.spaceNumber}番</td>
                  <td className="py-3 px-2">
                    {new Date(payment.entryTime).toLocaleString("ja-JP", {
                      month: "numeric",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="py-3 px-2">
                    {new Date(payment.exitTime).toLocaleString("ja-JP", {
                      month: "numeric",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="py-3 px-2">
                    {Math.floor(payment.durationMinutes / 60)}時間{payment.durationMinutes % 60}分
                  </td>
                  <td className="py-3 px-2 font-bold">¥{payment.amount.toLocaleString()}</td>
                  <td className="py-3 px-2">
                    <Badge variant="outline">
                      {payment.paymentMethod === "paypay" ? "PayPay" : 
                       payment.paymentMethod === "stripe" ? "Stripe" :
                       payment.paymentMethod === "square" ? "Square" : "クレジットカード"}
                    </Badge>
                  </td>
                  <td className="py-3 px-2">
                    <Badge variant={payment.paymentStatus === "completed" ? "default" : "secondary"}>
                      {payment.paymentStatus === "completed" ? "完了" : "処理中"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// QRコード表示コンポーネント
function QRCodeDisplay({ value, size = 150 }: { value: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    QRCode.toDataURL(value, { width: size, margin: 2 }).then(setDataUrl);
  }, [value, size]);

  if (!dataUrl) return <div className="w-[150px] h-[150px] bg-muted animate-pulse rounded" />;

  return <img src={dataUrl} alt="QR Code" className="mx-auto" />;
}

// QRコードタブ
function QRTab() {
  const { data, isLoading } = trpc.parking.getSpaces.useQuery();
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }
  }, []);

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
          <p className="text-muted-foreground">駐車スペースがありません</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>QRコード一覧</CardTitle>
              <CardDescription>各駐車スペースに設置するQRコード</CardDescription>
            </div>
            <Button asChild>
              <Link href="/print-qr">印刷用ページ</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {data.map((space) => (
              <div key={space.id} className="text-center p-4 border rounded-lg">
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
  
  // Stripe
  const [stripeForm, setStripeForm] = useState({ secretKey: '', publishableKey: '' });
  const [showStripeForm, setShowStripeForm] = useState(false);
  
  const saveStripeKeys = trpc.stripe.saveApiKeys.useMutation({
    onSuccess: () => {
      toast.success('Stripeに接続しました');
      setShowStripeForm(false);
      setStripeForm({ secretKey: '', publishableKey: '' });
      refetch();
    },
    onError: (error: any) => toast.error(error.message),
  });
  
  const disconnectStripe = trpc.stripe.disconnect.useMutation({
    onSuccess: () => {
      toast.success('Stripeの接続を解除しました');
      refetch();
    },
    onError: (error: any) => toast.error(error.message),
  });
  
  // Square
  const [squareForm, setSquareForm] = useState({ accessToken: '' });
  const [showSquareForm, setShowSquareForm] = useState(false);
  
  const saveSquareToken = trpc.square.saveAccessToken.useMutation({
    onSuccess: () => {
      toast.success('Squareに接続しました');
      setShowSquareForm(false);
      setSquareForm({ accessToken: '' });
      refetch();
    },
    onError: (error: any) => toast.error(error.message),
  });
  
  const disconnectSquare = trpc.square.disconnect.useMutation({
    onSuccess: () => {
      toast.success('Squareの接続を解除しました');
      refetch();
    },
    onError: (error: any) => toast.error(error.message),
  });
  
  // PayPay
  const [paypayForm, setPaypayForm] = useState({ apiKey: '', apiSecret: '', merchantId: '' });
  const [showPaypayForm, setShowPaypayForm] = useState(false);
  
  const savePaypayCredentials = trpc.paypay.saveCredentials.useMutation({
    onSuccess: () => {
      toast.success('PayPayに接続しました');
      setShowPaypayForm(false);
      setPaypayForm({ apiKey: '', apiSecret: '', merchantId: '' });
      refetch();
    },
    onError: (error: any) => toast.error(error.message),
  });
  
  const disconnectPaypay = trpc.paypay.disconnect.useMutation({
    onSuccess: () => {
      toast.success('PayPayの接続を解除しました');
      refetch();
    },
    onError: (error: any) => toast.error(error.message),
  });
  
  // カード決済プロバイダー切り替え
  const setCardProvider = trpc.paymentSettings.setCardProvider.useMutation({
    onSuccess: () => {
      toast.success('カード決済プロバイダーを変更しました');
      refetch();
    },
    onError: (error: any) => toast.error(error.message),
  });

  // 料金設定
  const [pricingForm, setPricingForm] = useState({ unitMinutes: 60, amount: 300 });
  
  useEffect(() => {
    if (allStatus?.pricing) {
      setPricingForm({
        unitMinutes: allStatus.pricing.unitMinutes,
        amount: allStatus.pricing.amount,
      });
    }
  }, [allStatus?.pricing]);
  
  const updatePricing = trpc.paymentSettings.updatePricing.useMutation({
    onSuccess: () => {
      toast.success('料金設定を更新しました');
      refetch();
    },
    onError: (error: any) => toast.error(error.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stripeConnected = allStatus?.stripe?.connected;
  const squareConnected = allStatus?.square?.connected;
  const paypayConnected = allStatus?.paypay?.connected;
  const currentCardProvider = allStatus?.cardPaymentProvider;

  return (
    <div className="space-y-6">
      {/* 料金設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            料金設定
          </CardTitle>
          <CardDescription>駐車料金の計算方法を設定します</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>課金単位</Label>
              <Select
                value={pricingForm.unitMinutes.toString()}
                onValueChange={(v) => setPricingForm(prev => ({ ...prev, unitMinutes: parseInt(v) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10分ごと</SelectItem>
                  <SelectItem value="15">15分ごと</SelectItem>
                  <SelectItem value="20">20分ごと</SelectItem>
                  <SelectItem value="30">30分ごと</SelectItem>
                  <SelectItem value="60">60分ごと</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>料金（円）</Label>
              <Input
                type="number"
                min={1}
                value={pricingForm.amount}
                onChange={(e) => setPricingForm(prev => ({ ...prev, amount: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            現在の設定: {pricingForm.unitMinutes}分ごとに{pricingForm.amount}円
          </p>
          <Button 
            onClick={() => updatePricing.mutate(pricingForm)}
            disabled={updatePricing.isPending}
          >
            {updatePricing.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            料金設定を保存
          </Button>
        </CardContent>
      </Card>

      {/* クレジットカード決済設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            クレジットカード決済
          </CardTitle>
          <CardDescription>StripeまたはSquareのどちらか一方を選択して接続できます</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stripe */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#635BFF] rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">S</span>
                </div>
                <div>
                  <h4 className="font-semibold">Stripe</h4>
                  <p className="text-sm text-muted-foreground">クレジットカード決済</p>
                </div>
              </div>
              {stripeConnected ? (
                <Badge className="bg-[var(--success)]">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  接続済み
                </Badge>
              ) : (
                <Badge variant="outline">
                  <XCircle className="w-3 h-3 mr-1" />
                  未接続
                </Badge>
              )}
            </div>
            
            {showStripeForm ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Secret Key</Label>
                  <Input
                    type="password"
                    placeholder="sk_..."
                    value={stripeForm.secretKey}
                    onChange={(e) => setStripeForm(prev => ({ ...prev, secretKey: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Publishable Key</Label>
                  <Input
                    type="password"
                    placeholder="pk_..."
                    value={stripeForm.publishableKey}
                    onChange={(e) => setStripeForm(prev => ({ ...prev, publishableKey: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => saveStripeKeys.mutate(stripeForm)}
                    disabled={saveStripeKeys.isPending || !stripeForm.secretKey || !stripeForm.publishableKey}
                  >
                    {saveStripeKeys.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    接続テスト＆保存
                  </Button>
                  <Button variant="outline" onClick={() => setShowStripeForm(false)}>
                    キャンセル
                  </Button>
                </div>
              </div>
            ) : stripeConnected ? (
              <div className="flex gap-2">
                {currentCardProvider === 'stripe' ? (
                  <Badge variant="secondary">使用中</Badge>
                ) : (
                  <Button 
                    size="sm" 
                    onClick={() => setCardProvider.mutate({ provider: 'stripe' })}
                    disabled={setCardProvider.isPending}
                  >
                    使用する
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="destructive" 
                  onClick={() => disconnectStripe.mutate()}
                  disabled={disconnectStripe.isPending}
                >
                  接続解除
                </Button>
              </div>
            ) : (
              <Button onClick={() => setShowStripeForm(true)} disabled={squareConnected}>
                Stripeを接続
              </Button>
            )}
          </div>

          {/* Square */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">□</span>
                </div>
                <div>
                  <h4 className="font-semibold">Square</h4>
                  <p className="text-sm text-muted-foreground">クレジットカード決済</p>
                </div>
              </div>
              {squareConnected ? (
                <Badge className="bg-[var(--success)]">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  接続済み
                </Badge>
              ) : (
                <Badge variant="outline">
                  <XCircle className="w-3 h-3 mr-1" />
                  未接続
                </Badge>
              )}
            </div>
            
            {showSquareForm ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Access Token</Label>
                  <Input
                    type="password"
                    placeholder="EAAAl..."
                    value={squareForm.accessToken}
                    onChange={(e) => setSquareForm({ accessToken: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Square Developer Dashboardで取得できます
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => saveSquareToken.mutate(squareForm)}
                    disabled={saveSquareToken.isPending || !squareForm.accessToken}
                  >
                    {saveSquareToken.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    接続テスト＆保存
                  </Button>
                  <Button variant="outline" onClick={() => setShowSquareForm(false)}>
                    キャンセル
                  </Button>
                </div>
              </div>
            ) : squareConnected ? (
              <div className="flex gap-2">
                {currentCardProvider === 'square' ? (
                  <Badge variant="secondary">使用中</Badge>
                ) : (
                  <Button 
                    size="sm" 
                    onClick={() => setCardProvider.mutate({ provider: 'square' })}
                    disabled={setCardProvider.isPending}
                  >
                    使用する
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="destructive" 
                  onClick={() => disconnectSquare.mutate()}
                  disabled={disconnectSquare.isPending}
                >
                  接続解除
                </Button>
              </div>
            ) : (
              <Button onClick={() => setShowSquareForm(true)} disabled={stripeConnected}>
                Squareを接続
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* PayPay決済設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            PayPay決済
          </CardTitle>
          <CardDescription>PayPay APIを使用したQRコード決済</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FF0033] rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">P</span>
                </div>
                <div>
                  <h4 className="font-semibold">PayPay</h4>
                  <p className="text-sm text-muted-foreground">QRコード決済</p>
                </div>
              </div>
              {paypayConnected ? (
                <Badge className="bg-[var(--success)]">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  接続済み
                </Badge>
              ) : (
                <Badge variant="outline">
                  <XCircle className="w-3 h-3 mr-1" />
                  未接続
                </Badge>
              )}
            </div>
            
            {showPaypayForm ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    value={paypayForm.apiKey}
                    onChange={(e) => setPaypayForm(prev => ({ ...prev, apiKey: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>API Secret</Label>
                  <Input
                    type="password"
                    value={paypayForm.apiSecret}
                    onChange={(e) => setPaypayForm(prev => ({ ...prev, apiSecret: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Merchant ID</Label>
                  <Input
                    value={paypayForm.merchantId}
                    onChange={(e) => setPaypayForm(prev => ({ ...prev, merchantId: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => savePaypayCredentials.mutate(paypayForm)}
                    disabled={savePaypayCredentials.isPending || !paypayForm.apiKey || !paypayForm.apiSecret || !paypayForm.merchantId}
                  >
                    {savePaypayCredentials.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    接続テスト＆保存
                  </Button>
                  <Button variant="outline" onClick={() => setShowPaypayForm(false)}>
                    キャンセル
                  </Button>
                </div>
              </div>
            ) : paypayConnected ? (
              <Button 
                size="sm" 
                variant="destructive" 
                onClick={() => disconnectPaypay.mutate()}
                disabled={disconnectPaypay.isPending}
              >
                接続解除
              </Button>
            ) : (
              <Button onClick={() => setShowPaypayForm(true)}>
                PayPayを接続
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


// 駐車場管理タブ
function ParkingManagementTab() {
  const [selectedOwnerId, setSelectedOwnerId] = useState<number | null>(null);
  const [selectedLotId, setSelectedLotId] = useState<number | null>(null);
  const [editingLotId, setEditingLotId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});

  const { data: owners, isLoading: ownersLoading } = trpc.operator.getAllOwners.useQuery();
  const { data: lots, isLoading: lotsLoading } = trpc.operator.getParkingLotsByOwner.useQuery(
    { ownerId: selectedOwnerId || 0 },
    { enabled: !!selectedOwnerId }
  );
  const { data: lotDetail, isLoading: lotDetailLoading } = trpc.operator.getParkingLot.useQuery(
    { lotId: selectedLotId || 0 },
    { enabled: !!selectedLotId }
  );

  const utils = trpc.useUtils();
  const updateLotMutation = trpc.operator.updateParkingLot.useMutation({
    onSuccess: () => {
      toast.success('駐車場情報を更新しました');
      setEditingLotId(null);
      utils.operator.getParkingLot.invalidate({ lotId: selectedLotId || 0 });
      utils.operator.getParkingLotsByOwner.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (ownersLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">駐車場管理</h2>
        <p className="text-sm text-muted-foreground">オーナーの駐車場設定を管理</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* オーナー一覧 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">オーナー一覧</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {owners && owners.length > 0 ? (
                owners.map((owner: any) => (
                  <button
                    key={owner.id}
                    onClick={() => {
                      setSelectedOwnerId(owner.id);
                      setSelectedLotId(null);
                      setEditingLotId(null);
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedOwnerId === owner.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'hover:bg-muted border-border'
                    }`}
                  >
                    <p className="font-medium">{owner.name || `ユーザー${owner.id}`}</p>
                    <p className="text-sm opacity-75">{owner.email}</p>
                  </button>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">オーナーがいません</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 駐車場一覧 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">駐車場一覧</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedOwnerId ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {lotsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : lots && lots.length > 0 ? (
                  lots.map((lot: any) => (
                    <button
                      key={lot.id}
                      onClick={() => {
                        setSelectedLotId(lot.id);
                        setEditingLotId(null);
                      }}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedLotId === lot.id
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'hover:bg-muted border-border'
                      }`}
                    >
                      <p className="font-medium">{lot.name}</p>
                      <p className="text-sm opacity-75">{lot.totalSpaces}台 • ¥{lot.pricingAmount}/{lot.pricingUnitMinutes}分</p>
                    </button>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-8">駐車場がありません</p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">オーナーを選択してください</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 駐車場詳細設定 */}
      {selectedLotId && lotDetail && (
        <Card>
          <CardHeader>
            <CardTitle>駐車場設定</CardTitle>
            <CardDescription>{lotDetail.lot.name}</CardDescription>
          </CardHeader>
          <CardContent>
            {editingLotId === selectedLotId ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">駐車場名</Label>
                  <Input
                    id="name"
                    value={editFormData.name || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">住所</Label>
                  <Input
                    id="address"
                    value={editFormData.address || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalSpaces">駐車スペース数</Label>
                  <Input
                    id="totalSpaces"
                    type="number"
                    min="1"
                    max="100"
                    value={editFormData.totalSpaces || 0}
                    onChange={(e) => setEditFormData({ ...editFormData, totalSpaces: parseInt(e.target.value) })}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pricingAmount">料金（円）</Label>
                    <Input
                      id="pricingAmount"
                      type="number"
                      min="0"
                      value={editFormData.pricingAmount || 0}
                      onChange={(e) => setEditFormData({ ...editFormData, pricingAmount: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pricingUnitMinutes">料金単位（分）</Label>
                    <Input
                      id="pricingUnitMinutes"
                      type="number"
                      min="1"
                      value={editFormData.pricingUnitMinutes || 0}
                      onChange={(e) => setEditFormData({ ...editFormData, pricingUnitMinutes: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxDailyAmount">1日最大料金（円、オプション）</Label>
                  <Input
                    id="maxDailyAmount"
                    type="number"
                    min="0"
                    value={editFormData.maxDailyAmount || 0}
                    onChange={(e) => setEditFormData({ ...editFormData, maxDailyAmount: parseInt(e.target.value) || null })}
                    placeholder="設定しない場合は空白"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => updateLotMutation.mutate({
                      lotId: selectedLotId,
                      ...editFormData,
                    })}
                    disabled={updateLotMutation.isPending}
                  >
                    {updateLotMutation.isPending ? '保存中...' : '保存'}
                  </Button>
                  <Button variant="outline" onClick={() => setEditingLotId(null)}>
                    キャンセル
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">駐車場名</p>
                    <p className="font-medium">{lotDetail.lot.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">住所</p>
                    <p className="font-medium">{lotDetail.lot.address || '-'}</p>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">駐車スペース数</p>
                    <p className="font-medium">{lotDetail.lot.totalSpaces}台</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ステータス</p>
                    <Badge variant={lotDetail.lot.status === 'active' ? 'default' : 'secondary'}>
                      {lotDetail.lot.status === 'active' ? '稼働中' : '停止中'}
                    </Badge>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm text-muted-foreground">料金</p>
                    <p className="font-medium">¥{lotDetail.lot.pricingAmount || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">料金単位</p>
                    <p className="font-medium">{lotDetail.lot.pricingUnitMinutes || 60}分</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">1日最大料金</p>
                    <p className="font-medium">{lotDetail.lot.maxDailyAmount ? `¥${lotDetail.lot.maxDailyAmount}` : '無制限'}</p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    setEditFormData({
                      name: lotDetail.lot.name,
                      address: lotDetail.lot.address,
                      totalSpaces: lotDetail.lot.totalSpaces,
                      pricingAmount: lotDetail.lot.pricingAmount,
                      pricingUnitMinutes: lotDetail.lot.pricingUnitMinutes,
                      maxDailyAmount: lotDetail.lot.maxDailyAmount,
                    });
                    setEditingLotId(selectedLotId);
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  編集
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
