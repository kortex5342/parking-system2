import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Car, QrCode, Camera, ArrowLeft, CheckCircle2, Clock, Loader2, CreditCard, ExternalLink, Smartphone, Train } from "lucide-react";
import { Link, useLocation, useParams } from "wouter";
import { Html5QrcodeScanner } from "html5-qrcode";
import { toast } from "sonner";

type ViewState = "scan" | "space-info" | "entry-success" | "exit-confirm" | "payment" | "payment-success";

// 決済方法の型定義
type PaymentMethodType = "paypay" | "credit_card" | "stripe" | "square" | "line_pay" | "rakuten_pay" | "apple_pay" | "ic_card";

// グローバル決済方法の型定義
type GlobalPaymentMethod = "paypay" | "rakuten_pay" | "line_pay" | "apple_pay" | "ic_card" | "credit_card";

// 決済方法の表示情報
const PAYMENT_METHOD_INFO: Record<GlobalPaymentMethod, { name: string; color: string; icon: "smartphone" | "credit_card" | "train" }> = {
  paypay: { name: "PayPay", color: "#FF0033", icon: "smartphone" },
  rakuten_pay: { name: "楽天ペイ", color: "#BF0000", icon: "smartphone" },
  line_pay: { name: "LINE Pay", color: "#00C300", icon: "smartphone" },
  apple_pay: { name: "Apple Pay", color: "#000000", icon: "smartphone" },
  ic_card: { name: "交通系IC", color: "#0066CC", icon: "train" },
  credit_card: { name: "クレジットカード", color: "#374151", icon: "credit_card" },
};

export default function Scan() {
  const [view, setView] = useState<ViewState>("scan");
  const [qrCode, setQrCode] = useState("");
  const [manualInput, setManualInput] = useState("");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [, setLocation] = useLocation();
  const params = useParams<{ lotId?: string; spaceNumber?: string }>();

  // URLパラメータからQRコードを取得
  useEffect(() => {
    // パスパラメータからlotIdとspaceNumberを取得
    if (params.lotId && params.spaceNumber) {
      // lotIdとspaceNumberからQRコードを構築
      const generatedQr = `LOT-${params.lotId}-SPACE-${params.spaceNumber}`;
      setQrCode(generatedQr);
      setView("space-info");
    }
    
    // 決済完了時の処理
    const searchParams = new URLSearchParams(window.location.search);
    const paymentStatus = searchParams.get("payment");
    const token = searchParams.get("token");
    if (paymentStatus === "success" && token) {
      localStorage.removeItem("parkingSessionToken");
      setSessionToken(null);
      setView("payment-success");
      toast.success("決済が完了しました");
      window.history.replaceState({}, '', '/scan');
    } else if (paymentStatus === "cancel" && token) {
      setSessionToken(token);
      setView("exit-confirm");
      toast.info("決済がキャンセルされました");
      window.history.replaceState({}, '', '/scan');
    }
    
    // ローカルストレージからセッショントークンを復元
    const savedToken = localStorage.getItem("parkingSessionToken");
    if (savedToken) {
      setSessionToken(savedToken);
    }
  }, [params.lotId, params.spaceNumber]);

  // カメラスキャナーの初期化
  useEffect(() => {
    if (showCamera && !scannerRef.current) {
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scannerRef.current.render(
        (decodedText) => {
          setQrCode(decodedText);
          setShowCamera(false);
          setView("space-info");
          if (scannerRef.current) {
            scannerRef.current.clear();
            scannerRef.current = null;
          }
        },
        (error) => {
          // スキャンエラーは無視（継続的にスキャン）
        }
      );
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, [showCamera]);

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      setQrCode(manualInput.trim());
      setView("space-info");
    }
  };

  const handleBack = () => {
    setView("scan");
    setQrCode("");
    setManualInput("");
  };

  const handleEntrySuccess = (token: string) => {
    setSessionToken(token);
    localStorage.setItem("parkingSessionToken", token);
    setView("entry-success");
  };

  const handleExitConfirm = () => {
    setView("exit-confirm");
  };

  const handleProceedPayment = () => {
    setView("payment");
  };

  const handlePaymentSuccess = () => {
    localStorage.removeItem("parkingSessionToken");
    setSessionToken(null);
    setView("payment-success");
  };

  const handleHome = () => {
    setView("scan");
    setQrCode("");
    setManualInput("");
    setSessionToken(null);
    setLocation("/scan");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="container max-w-md mx-auto px-4 py-8">
        {view === "scan" && (
          <ScanView
            manualInput={manualInput}
            setManualInput={setManualInput}
            onManualSubmit={handleManualSubmit}
            showCamera={showCamera}
            setShowCamera={setShowCamera}
            sessionToken={sessionToken}
            onExitConfirm={handleExitConfirm}
          />
        )}
        {view === "space-info" && (
          <SpaceInfoView
            qrCode={qrCode}
            onBack={handleBack}
            onEntrySuccess={handleEntrySuccess}
            onExitConfirm={handleExitConfirm}
            sessionToken={sessionToken}
          />
        )}
        {view === "entry-success" && (
          <EntrySuccessView onHome={handleHome} />
        )}
        {view === "exit-confirm" && sessionToken && (
          <ExitConfirmView
            sessionToken={sessionToken}
            onProceedPayment={handleProceedPayment}
            onBack={handleBack}
          />
        )}
        {view === "payment" && sessionToken && (
          <PaymentView
            sessionToken={sessionToken}
            onSuccess={handlePaymentSuccess}
            onBack={() => setView("exit-confirm")}
          />
        )}
        {view === "payment-success" && (
          <PaymentSuccessView onHome={handleHome} />
        )}
      </div>
    </div>
  );
}

// スキャン画面
function ScanView({
  manualInput,
  setManualInput,
  onManualSubmit,
  showCamera,
  setShowCamera,
  sessionToken,
  onExitConfirm,
}: {
  manualInput: string;
  setManualInput: (value: string) => void;
  onManualSubmit: () => void;
  showCamera: boolean;
  setShowCamera: (value: boolean) => void;
  sessionToken: string | null;
  onExitConfirm: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Car className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-3xl font-bold mb-2">駐車場システム</h1>
        <p className="subtitle">QRコードをスキャンして入出庫</p>
      </div>

      {sessionToken && (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="w-5 h-5 text-amber-600" />
              <p className="font-medium text-amber-800 dark:text-amber-200">駐車中です</p>
            </div>
            <Button onClick={onExitConfirm} className="w-full" variant="outline">
              出庫手続きへ
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            QRコードスキャン
          </CardTitle>
          <CardDescription>
            駐車スペースのQRコードをスキャンしてください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {showCamera ? (
            <div className="space-y-4">
              <div id="qr-reader" className="w-full rounded-lg overflow-hidden" />
              <Button
                variant="outline"
                onClick={() => setShowCamera(false)}
                className="w-full"
              >
                キャンセル
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setShowCamera(true)}
              className="w-full"
              size="lg"
            >
              <Camera className="w-5 h-5 mr-2" />
              カメラでスキャン
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>手動入力</CardTitle>
          <CardDescription>
            QRコードの番号を直接入力することもできます
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="例: SPACE-001"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onManualSubmit()}
          />
          <Button
            onClick={onManualSubmit}
            variant="secondary"
            className="w-full"
            disabled={!manualInput.trim()}
          >
            確認
          </Button>
        </CardContent>
      </Card>

      <div className="text-center">
        <Link href="/" className="text-sm text-muted-foreground hover:text-primary">
          ホームに戻る
        </Link>
      </div>
    </div>
  );
}

// 駐車スペース情報画面
function SpaceInfoView({
  qrCode,
  onBack,
  onEntrySuccess,
  onExitConfirm,
  sessionToken,
}: {
  qrCode: string;
  onBack: () => void;
  onEntrySuccess: (token: string) => void;
  onExitConfirm: () => void;
  sessionToken: string | null;
}) {
  const { data, isLoading, error } = trpc.parking.getSpaceByQrCode.useQuery({ qrCode });
  const checkInMutation = trpc.parking.checkIn.useMutation({
    onSuccess: (data) => {
      toast.success(`入庫完了: スペース ${data.spaceNumber}`);
      onEntrySuccess(data.sessionToken);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <Card className="border-destructive">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive font-medium">
              {error?.message || "駐車スペースが見つかりません"}
            </p>
          </CardContent>
        </Card>
        <Button onClick={onBack} variant="outline" className="w-full">
          <ArrowLeft className="w-4 h-4 mr-2" />
          戻る
        </Button>
      </div>
    );
  }

  const { space, activeRecord, pricing } = data;
  const isOccupied = space.status === "occupied";

  return (
    <div className="space-y-6">
      <Button onClick={onBack} variant="ghost" className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        戻る
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">スペース {space.spaceNumber}</CardTitle>
          <CardDescription>
            {isOccupied ? "使用中" : "空き"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`p-4 rounded-lg ${isOccupied ? "bg-amber-100 dark:bg-amber-950/30" : "bg-green-100 dark:bg-green-950/30"}`}>
            <p className={`font-medium ${isOccupied ? "text-amber-800 dark:text-amber-200" : "text-green-800 dark:text-green-200"}`}>
              {isOccupied ? "このスペースは現在使用中です" : "このスペースは利用可能です"}
            </p>
          </div>

          {!isOccupied && (
            <div className="bg-secondary/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">料金</p>
              <p className="font-bold">
                {pricing.unitMinutes}分 ¥{pricing.amount}
              </p>
            </div>
          )}

          {isOccupied && sessionToken ? (
            <Button onClick={onExitConfirm} className="w-full" size="lg">
              出庫手続きへ
            </Button>
          ) : !isOccupied ? (
            <Button
              onClick={() => checkInMutation.mutate({ qrCode })}
              disabled={checkInMutation.isPending}
              className="w-full"
              size="lg"
            >
              {checkInMutation.isPending ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Car className="w-5 h-5 mr-2" />
              )}
              入庫する
            </Button>
          ) : (
            <p className="text-center text-muted-foreground">
              このスペースは他の車両が使用中です
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// 入庫完了画面
function EntrySuccessView({ onHome }: { onHome: () => void }) {
  return (
    <div className="space-y-6">
      <Card className="border-green-500 bg-green-50 dark:bg-green-950/20">
        <CardContent className="pt-6 text-center">
          <CheckCircle2 className="w-20 h-20 mx-auto mb-4 text-green-600" />
          <h2 className="text-2xl font-bold mb-2">入庫完了</h2>
          <p className="text-muted-foreground">
            駐車を開始しました。出庫時は再度QRコードをスキャンしてください。
          </p>
        </CardContent>
      </Card>
      <Button onClick={onHome} className="w-full" size="lg">
        ホームに戻る
      </Button>
    </div>
  );
}

// 出庫確認画面
function ExitConfirmView({
  sessionToken,
  onProceedPayment,
  onBack,
}: {
  sessionToken: string;
  onProceedPayment: () => void;
  onBack: () => void;
}) {
  const { data, isLoading } = trpc.parking.getCheckoutInfo.useQuery({ sessionToken });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <Card className="border-destructive">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive font-medium">
              入庫記録が見つかりません
            </p>
          </CardContent>
        </Card>
        <Button onClick={onBack} variant="outline" className="w-full">
          戻る
        </Button>
      </div>
    );
  }

  const hours = Math.floor(data.durationMinutes / 60);
  const minutes = data.durationMinutes % 60;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">出庫確認</h1>
        <p className="subtitle">駐車料金をご確認ください</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-muted-foreground">スペース番号</span>
            <span className="font-medium">{data.record.spaceNumber}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-muted-foreground">入庫時刻</span>
            <span className="font-medium">
              {new Date(data.record.entryTime).toLocaleString("ja-JP")}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-muted-foreground">駐車時間</span>
            <span className="font-medium">
              {hours > 0 ? `${hours}時間` : ""}{minutes}分
            </span>
          </div>
          <div className="flex justify-between items-center py-4 bg-primary/5 rounded-lg px-4 -mx-4">
            <span className="text-lg font-medium">お支払い金額</span>
            <span className="text-2xl font-bold text-primary">
              ¥{data.amount.toLocaleString()}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Button onClick={onProceedPayment} className="w-full" size="lg">
          決済へ進む
        </Button>
        <Button variant="outline" onClick={onBack} className="w-full">
          キャンセル
        </Button>
      </div>
    </div>
  );
}

// 決済画面
function PaymentView({
  sessionToken,
  onSuccess,
  onBack,
}: {
  sessionToken: string;
  onSuccess: () => void;
  onBack: () => void;
}) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType | null>(null);
  const { data } = trpc.parking.getCheckoutInfo.useQuery({ sessionToken });
  const { data: availableMethods } = trpc.paymentSettings.getAvailableMethods.useQuery();
  // グローバル決済設定を取得
  const { data: globalPaymentMethods } = trpc.parking.getEnabledPaymentMethods.useQuery();
  
  const paymentMutation = trpc.parking.checkOut.useMutation({
    onSuccess: () => {
      toast.success("決済が完了しました");
      onSuccess();
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const stripeCheckoutMutation = trpc.stripe.createCheckout.useMutation({
    onSuccess: (data) => {
      toast.info("Stripeの決済ページへ移動します");
      window.open(data.checkoutUrl, '_blank');
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const squareCheckoutMutation = trpc.square.createCheckout.useMutation({
    onSuccess: (data) => {
      toast.info("Squareの決済ページへ移動します");
      window.open(data.checkoutUrl, '_blank');
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const paypayCheckoutMutation = trpc.paypay.createPayment.useMutation({
    onSuccess: (data) => {
      toast.info("PayPayの決済ページへ移動します");
      window.open(data.deeplink || data.qrCodeUrl, '_blank');
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handlePayment = () => {
    if (!paymentMethod) {
      toast.error("決済方法を選択してください");
      return;
    }
    
    if (paymentMethod === "stripe") {
      stripeCheckoutMutation.mutate({ sessionToken });
    } else if (paymentMethod === "square") {
      squareCheckoutMutation.mutate({ sessionToken });
    } else if (paymentMethod === "paypay" && availableMethods?.paypay) {
      paypayCheckoutMutation.mutate({ sessionToken });
    } else {
      // デモ決済
      paymentMutation.mutate({ sessionToken, paymentMethod: paymentMethod as any });
    }
  };

  const isProcessing = paymentMutation.isPending || stripeCheckoutMutation.isPending || squareCheckoutMutation.isPending || paypayCheckoutMutation.isPending;

  // 利用可能な決済方法を取得（従来のオーナー設定）
  const hasRealCardPayment = availableMethods?.card !== null && availableMethods?.card !== undefined;
  const hasRealPayPay = availableMethods?.paypay === true;
  const cardProvider = availableMethods?.card || null;

  // グローバル決済設定から有効な決済方法を取得
  const enabledGlobalMethods = globalPaymentMethods?.map(m => m.method) || [];
  const hasGlobalPaymentMethods = enabledGlobalMethods.length > 0;

  // アイコンコンポーネントを取得
  const getIcon = (iconType: "smartphone" | "credit_card" | "train") => {
    switch (iconType) {
      case "smartphone":
        return <Smartphone className="w-6 h-6 text-white" />;
      case "credit_card":
        return <CreditCard className="w-6 h-6 text-white" />;
      case "train":
        return <Train className="w-6 h-6 text-white" />;
    }
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">お支払い</h1>
        <p className="subtitle">決済方法を選択してください</p>
      </div>

      <Card className="bg-secondary/50">
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground mb-2">お支払い金額</p>
          <p className="text-4xl font-bold">¥{data.amount.toLocaleString()}</p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {/* 従来のオーナー設定による実決済（Stripe） */}
        {hasRealCardPayment && cardProvider === 'stripe' && (
          <button
            onClick={() => setPaymentMethod("stripe")}
            className={`w-full p-4 rounded-xl border-2 transition-all ${
              paymentMethod === "stripe"
                ? "border-[var(--success)] bg-[var(--success)]/10"
                : "border-border hover:border-muted-foreground"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div className="text-left flex-1">
                <p className="font-bold">クレジットカード</p>
                <p className="text-sm text-muted-foreground">Stripe決済</p>
              </div>
              {paymentMethod === "stripe" ? (
                <CheckCircle2 className="w-6 h-6" style={{ color: 'var(--success)' }} />
              ) : (
                <span className="text-xs px-2 py-1 bg-[var(--success)]/20 text-[var(--success)] rounded">おすすめ</span>
              )}
            </div>
          </button>
        )}

        {/* 従来のオーナー設定による実決済（Square） */}
        {hasRealCardPayment && cardProvider === 'square' && (
          <button
            onClick={() => setPaymentMethod("square")}
            className={`w-full p-4 rounded-xl border-2 transition-all ${
              paymentMethod === "square"
                ? "border-[var(--success)] bg-[var(--success)]/10"
                : "border-border hover:border-muted-foreground"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div className="text-left flex-1">
                <p className="font-bold">クレジットカード</p>
                <p className="text-sm text-muted-foreground">Square決済</p>
              </div>
              {paymentMethod === "square" ? (
                <CheckCircle2 className="w-6 h-6" style={{ color: 'var(--success)' }} />
              ) : (
                <span className="text-xs px-2 py-1 bg-[var(--success)]/20 text-[var(--success)] rounded">おすすめ</span>
              )}
            </div>
          </button>
        )}

        {/* 従来のオーナー設定による実決済（PayPay） */}
        {hasRealPayPay && (
          <button
            onClick={() => setPaymentMethod("paypay")}
            className={`w-full p-4 rounded-xl border-2 transition-all ${
              paymentMethod === "paypay"
                ? "border-[var(--success)] bg-[var(--success)]/10"
                : "border-border hover:border-muted-foreground"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#FF0033] rounded-lg flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div className="text-left flex-1">
                <p className="font-bold">PayPay</p>
                <p className="text-sm text-muted-foreground">QRコード決済</p>
              </div>
              {paymentMethod === "paypay" && (
                <CheckCircle2 className="w-6 h-6" style={{ color: 'var(--success)' }} />
              )}
            </div>
          </button>
        )}

        {/* グローバル決済設定による決済方法 */}
        {hasGlobalPaymentMethods && (
          <>
            {!hasRealCardPayment && !hasRealPayPay && (
              <div className="text-xs text-muted-foreground text-center py-2 border-t mt-4 pt-4">
                利用可能な決済方法
              </div>
            )}
            
            {enabledGlobalMethods.map((method) => {
              const info = PAYMENT_METHOD_INFO[method as GlobalPaymentMethod];
              if (!info) return null;
              
              // 既に実決済で表示されている場合はスキップ
              if (method === "paypay" && hasRealPayPay) return null;
              if (method === "credit_card" && hasRealCardPayment) return null;
              
              const methodKey = method as PaymentMethodType;
              
              return (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(methodKey)}
                  className={`w-full p-4 rounded-xl border-2 transition-all ${
                    paymentMethod === methodKey
                      ? "border-[var(--success)] bg-[var(--success)]/10"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: info.color }}
                    >
                      {getIcon(info.icon)}
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-bold">{info.name}</p>
                      <p className="text-sm text-muted-foreground">決済</p>
                    </div>
                    {paymentMethod === methodKey && (
                      <CheckCircle2 className="w-6 h-6" style={{ color: 'var(--success)' }} />
                    )}
                  </div>
                </button>
              );
            })}
          </>
        )}

        {/* グローバル決済設定がない場合のデモ決済 */}
        {!hasGlobalPaymentMethods && (!hasRealCardPayment || !hasRealPayPay) && (
          <>
            <div className="text-xs text-muted-foreground text-center py-2 border-t mt-4 pt-4">
              ※ デモモード（実際の課金は発生しません）
            </div>

            {/* PayPayデモ */}
            {!hasRealPayPay && (
              <button
                onClick={() => setPaymentMethod("paypay")}
                className={`w-full p-4 rounded-xl border-2 transition-all ${
                  paymentMethod === "paypay"
                    ? "border-[var(--success)] bg-[var(--success)]/10"
                    : "border-border hover:border-muted-foreground"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#FF0033] rounded-lg flex items-center justify-center">
                    <Smartphone className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-bold">PayPay</p>
                    <p className="text-sm text-muted-foreground">デモ決済</p>
                  </div>
                  {paymentMethod === "paypay" && (
                    <CheckCircle2 className="w-6 h-6" style={{ color: 'var(--success)' }} />
                  )}
                </div>
              </button>
            )}

            {/* クレジットカードデモ */}
            {!hasRealCardPayment && (
              <button
                onClick={() => setPaymentMethod("credit_card")}
                className={`w-full p-4 rounded-xl border-2 transition-all ${
                  paymentMethod === "credit_card"
                    ? "border-[var(--success)] bg-[var(--success)]/10"
                    : "border-border hover:border-muted-foreground"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-bold">クレジットカード</p>
                    <p className="text-sm text-muted-foreground">デモ決済</p>
                  </div>
                  {paymentMethod === "credit_card" && (
                    <CheckCircle2 className="w-6 h-6" style={{ color: 'var(--success)' }} />
                  )}
                </div>
              </button>
            )}

            {/* LINE Payデモ */}
            <button
              onClick={() => setPaymentMethod("line_pay")}
              className={`w-full p-4 rounded-xl border-2 transition-all ${
                paymentMethod === "line_pay"
                  ? "border-[var(--success)] bg-[var(--success)]/10"
                  : "border-border hover:border-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#00C300] rounded-lg flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-white" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-bold">LINE Pay</p>
                  <p className="text-sm text-muted-foreground">デモ決済</p>
                </div>
                {paymentMethod === "line_pay" && (
                  <CheckCircle2 className="w-6 h-6" style={{ color: 'var(--success)' }} />
                )}
              </div>
            </button>

            {/* 楽天ペイデモ */}
            <button
              onClick={() => setPaymentMethod("rakuten_pay")}
              className={`w-full p-4 rounded-xl border-2 transition-all ${
                paymentMethod === "rakuten_pay"
                  ? "border-[var(--success)] bg-[var(--success)]/10"
                  : "border-border hover:border-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#BF0000] rounded-lg flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-white" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-bold">楽天ペイ</p>
                  <p className="text-sm text-muted-foreground">デモ決済</p>
                </div>
                {paymentMethod === "rakuten_pay" && (
                  <CheckCircle2 className="w-6 h-6" style={{ color: 'var(--success)' }} />
                )}
              </div>
            </button>

            {/* Apple Payデモ */}
            <button
              onClick={() => setPaymentMethod("apple_pay")}
              className={`w-full p-4 rounded-xl border-2 transition-all ${
                paymentMethod === "apple_pay"
                  ? "border-[var(--success)] bg-[var(--success)]/10"
                  : "border-border hover:border-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-white" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-bold">Apple Pay</p>
                  <p className="text-sm text-muted-foreground">デモ決済</p>
                </div>
                {paymentMethod === "apple_pay" && (
                  <CheckCircle2 className="w-6 h-6" style={{ color: 'var(--success)' }} />
                )}
              </div>
            </button>
          </>
        )}
      </div>

      <div className="space-y-3">
        <Button
          onClick={handlePayment}
          disabled={!paymentMethod || isProcessing}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (paymentMethod === "stripe" || paymentMethod === "square" || (paymentMethod === "paypay" && hasRealPayPay)) ? (
            <ExternalLink className="w-5 h-5 mr-2" />
          ) : null}
          {paymentMethod === "stripe" ? "Stripeで決済" : 
           paymentMethod === "square" ? "Squareで決済" : 
           paymentMethod === "paypay" && hasRealPayPay ? "PayPayで決済" :
           "決済する"}
        </Button>
        <Button variant="outline" onClick={onBack} className="w-full">
          戻る
        </Button>
      </div>

      {paymentMethod && paymentMethod !== "stripe" && paymentMethod !== "square" && !(paymentMethod === "paypay" && hasRealPayPay) && !hasGlobalPaymentMethods && (
        <p className="text-xs text-center text-muted-foreground">
          ※これはデモ決済です。実際の課金は発生しません。
        </p>
      )}
    </div>
  );
}

// 決済完了画面
function PaymentSuccessView({ onHome }: { onHome: () => void }) {
  return (
    <div className="space-y-6">
      <Card className="border-[var(--success)] bg-[var(--success)]/10">
        <CardContent className="pt-6 text-center">
          <CheckCircle2 className="w-20 h-20 mx-auto mb-4" style={{ color: 'var(--success)' }} />
          <h2 className="text-3xl font-bold mb-2">決済が完了しました</h2>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
            <p className="text-lg font-semibold text-amber-800">
              5分以内に出庫してください
            </p>
            <p className="text-sm text-amber-600 mt-1">
              時間を過ぎると追加料金が発生する場合があります
            </p>
          </div>
        </CardContent>
      </Card>
      <Button onClick={onHome} className="w-full" size="lg">
        ホームに戻る
      </Button>
    </div>
  );
}
