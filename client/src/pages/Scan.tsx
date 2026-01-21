import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Car, QrCode, Camera, ArrowLeft, CheckCircle2, Clock, Loader2, CreditCard, ExternalLink, Smartphone } from "lucide-react";
import { Link, useLocation, useParams } from "wouter";
import { Html5QrcodeScanner } from "html5-qrcode";
import { toast } from "sonner";

type ViewState = "scan" | "space-info" | "entry-success" | "exit-confirm" | "payment" | "payment-success";

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
      // 新しいQRコードをスキャンした場合は、既存のセッションをクリア
      localStorage.removeItem("parkingSessionToken");
      setSessionToken(null);
      return;
    }
    
    const searchParams = new URLSearchParams(window.location.search);
    const qr = searchParams.get("qr");
    if (qr) {
      setQrCode(qr);
      setView("space-info");
      // 新しいQRコードをスキャンした場合は、既存のセッションをクリア
      localStorage.removeItem("parkingSessionToken");
      setSessionToken(null);
      return;
    }
    
    // 決済完了時の処理
    const paymentStatus = searchParams.get("payment");
    const token = searchParams.get("token");
    if (paymentStatus === "success" && token) {
      localStorage.removeItem("parkingSessionToken");
      setSessionToken(null);
      setView("payment-success");
      toast.success("決済が完了しました");
      window.history.replaceState({}, '', '/scan');
      return;
    } else if (paymentStatus === "cancel" && token) {
      setSessionToken(token);
      setView("exit-confirm");
      toast.info("決済がキャンセルされました");
      window.history.replaceState({}, '', '/scan');
      return;
    }
    
    // QRコードが指定されていない場合のみ、ローカルストレージからセッショントークンを復元
    const savedToken = localStorage.getItem("parkingSessionToken");
    if (savedToken) {
      setSessionToken(savedToken);
      // 保存されたセッションがある場合は、出庫確認画面に自動遷移
      setView("exit-confirm");
    }
  }, [params.lotId, params.spaceNumber]);

  // QRコードスキャナーの初期化
  useEffect(() => {
    if (showCamera && !scannerRef.current) {
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );
      
      scanner.render(
        (decodedText) => {
          setQrCode(decodedText);
          setShowCamera(false);
          setView("space-info");
          // 新しいQRコードをスキャンした場合は、既存のセッションをクリア
          localStorage.removeItem("parkingSessionToken");
          setSessionToken(null);
          scanner.clear();
        },
        (error) => {
          // スキャンエラーは無視（継続的にスキャン）
        }
      );
      
      scannerRef.current = scanner;
    }
    
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [showCamera]);

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      setQrCode(manualInput.trim());
      setView("space-info");
      // 新しいQRコードを入力した場合は、既存のセッションをクリア
      localStorage.removeItem("parkingSessionToken");
      setSessionToken(null);
    }
  };

  const handleBackToScan = () => {
    setView("scan");
    setQrCode("");
    setManualInput("");
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* 幾何学図形（装飾） */}
      <div className="geometric-shape w-64 h-64 bg-accent top-10 -right-32" />
      <div className="geometric-shape w-48 h-48 bottom-20 -left-24" style={{ backgroundColor: 'var(--blush)' }} />

      {/* ヘッダー */}
      <header className="relative z-10 container py-6">
        <nav className="flex items-center justify-end">
          <div className="flex items-center gap-2">
            <Car className="w-6 h-6 text-foreground" />
            <span className="font-bold">ParkEase</span>
          </div>
        </nav>
      </header>

      <main className="relative z-10 container py-8">
        <div className="max-w-md mx-auto">
          {view === "scan" && (
            <ScanView
              showCamera={showCamera}
              setShowCamera={setShowCamera}
              manualInput={manualInput}
              setManualInput={setManualInput}
              onManualSubmit={handleManualSubmit}
              sessionToken={sessionToken}
              onContinueExit={() => {
                if (sessionToken) {
                  setView("exit-confirm");
                }
              }}
            />
          )}
          
          {view === "space-info" && (
            <SpaceInfoView
              qrCode={qrCode}
              onBack={handleBackToScan}
              onEntrySuccess={(token) => {
                setSessionToken(token);
                localStorage.setItem("parkingSessionToken", token);
                setView("entry-success");
              }}
              onExitConfirm={(token) => {
                setSessionToken(token);
                localStorage.setItem("parkingSessionToken", token);
                setView("exit-confirm");
              }}
            />
          )}
          
          {view === "entry-success" && (
            <EntrySuccessView
              sessionToken={sessionToken!}
              onExit={() => setView("exit-confirm")}
              onHome={() => setLocation("/")}
            />
          )}
          
          {view === "exit-confirm" && sessionToken && (
            <ExitConfirmView
              sessionToken={sessionToken}
              onBack={() => setView("scan")}
              onProceedPayment={() => setView("payment")}
            />
          )}
          
          {view === "payment" && sessionToken && (
            <PaymentView
              sessionToken={sessionToken}
              onSuccess={() => {
                localStorage.removeItem("parkingSessionToken");
                setSessionToken(null);
                setView("payment-success");
              }}
              onBack={() => setView("exit-confirm")}
            />
          )}
          
          {view === "payment-success" && (
            <PaymentSuccessView onHome={() => setLocation("/")} />
          )}
        </div>
      </main>
    </div>
  );
}

// スキャン画面
function ScanView({
  showCamera,
  setShowCamera,
  manualInput,
  setManualInput,
  onManualSubmit,
  sessionToken,
  onContinueExit,
}: {
  showCamera: boolean;
  setShowCamera: (show: boolean) => void;
  manualInput: string;
  setManualInput: (value: string) => void;
  onManualSubmit: () => void;
  sessionToken: string | null;
  onContinueExit: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">入庫・出庫</h1>
        <p className="subtitle">駐車スペースのQRコードをスキャンしてください</p>
      </div>

      {/* 継続中のセッションがある場合 */}
      {sessionToken && (
        <Card className="border-accent bg-accent/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-5 h-5 text-accent-foreground" />
              <span className="font-medium">入庫中の車両があります</span>
            </div>
            <Button onClick={onContinueExit} className="w-full">
              出庫手続きへ進む
            </Button>
          </CardContent>
        </Card>
      )}

      {/* カメラスキャン */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            カメラでスキャン
          </CardTitle>
          <CardDescription>
            駐車スペースに設置されたQRコードを読み取ります
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showCamera ? (
            <div className="space-y-4">
              <div id="qr-reader" className="rounded-lg overflow-hidden" />
              <Button variant="outline" onClick={() => setShowCamera(false)} className="w-full">
                キャンセル
              </Button>
            </div>
          ) : (
            <Button onClick={() => setShowCamera(true)} className="w-full">
              <QrCode className="w-5 h-5 mr-2" />
              カメラを起動
            </Button>
          )}
        </CardContent>
      </Card>

      {/* 手動入力 */}
      <Card>
        <CardHeader>
          <CardTitle>QRコードを手動入力</CardTitle>
          <CardDescription>
            QRコードの文字列を直接入力することもできます
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="例: PARK-01-xxxxxxxx"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onManualSubmit()}
            />
            <Button onClick={onManualSubmit}>確認</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// スペース情報画面
function SpaceInfoView({
  qrCode,
  onBack,
  onEntrySuccess,
  onExitConfirm,
}: {
  qrCode: string;
  onBack: () => void;
  onEntrySuccess: (token: string) => void;
  onExitConfirm: (sessionToken: string) => void;
}) {
  const { data, isLoading, error } = trpc.parking.getSpaceByQrCode.useQuery({ qrCode });
  const enterMutation = trpc.parking.checkIn.useMutation({
    onSuccess: (result) => {
      toast.success(`スペース${result.spaceNumber}番に入庫しました`);
      onEntrySuccess(result.sessionToken);
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

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-destructive mb-4">{error.message}</p>
          <Button onClick={onBack}>戻る</Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { space, activeRecord, pricing } = data;
  const canEnter = space.status === 'available';
  const canExit = space.status === 'occupied' && activeRecord;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="text-center">
          <div className={`w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
            space.status === "available" 
              ? "bg-[var(--success)]/20" 
              : "bg-destructive/20"
          }`}>
            <Car className={`w-10 h-10 ${
              space.status === "available" 
                ? "text-[var(--success)]" 
                : "text-destructive"
            }`} />
          </div>
          <CardTitle className="text-4xl">スペース {space.spaceNumber}</CardTitle>
          <CardDescription>
            {space.status === "available" ? "空き" : "使用中"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {canEnter && (
            <>
              <p className="text-center text-muted-foreground">
                このスペースに入庫しますか？
              </p>
              <Button 
                onClick={() => enterMutation.mutate({ qrCode })}
                disabled={enterMutation.isPending}
                className="w-full"
                size="lg"
              >
                {enterMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                入庫する
              </Button>
            </>
          )}
          
          {canExit && activeRecord && (
            <>
              <p className="text-center text-muted-foreground">
                出庫手続きを行いますか？
              </p>
              <Button 
                onClick={() => onExitConfirm(activeRecord.sessionToken)}
                className="w-full"
                size="lg"
              >
                今すぐ出庫する
              </Button>
            </>
          )}
          
          <Button variant="outline" onClick={onBack} className="w-full">
            戻る
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// 入庫完了画面
function EntrySuccessView({
  sessionToken,
  onExit,
  onHome,
}: {
  sessionToken: string;
  onExit: () => void;
  onHome: () => void;
}) {
  const { data } = trpc.parking.getCheckoutInfo.useQuery({ sessionToken });

  return (
    <div className="space-y-6">
      <Card className="border-[var(--success)] bg-[var(--success)]/10">
        <CardContent className="pt-6 text-center">
          <CheckCircle2 className="w-20 h-20 mx-auto mb-4" style={{ color: 'var(--success)' }} />
          <h2 className="text-3xl font-bold mb-2">入庫完了</h2>
          {data && (
            <>
              <p className="text-muted-foreground mb-4">
                スペース {data.record.spaceNumber}番
              </p>
              <div className="bg-background rounded-lg p-4 mb-6">
                <p className="text-sm text-muted-foreground mb-1">入庫時刻</p>
                <p className="text-2xl font-bold">
                  {new Date(data.record.entryTime).toLocaleTimeString("ja-JP", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </>
          )}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm font-medium text-blue-800">
              出庫時は再度QRコードをスキャンしてください
            </p>
          </div>
          <Button onClick={onExit} variant="outline" className="w-full">
            今すぐ出庫する
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// 出庫確認画面
function ExitConfirmView({
  sessionToken,
  onBack,
  onProceedPayment,
}: {
  sessionToken: string;
  onBack: () => void;
  onProceedPayment: () => void;
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
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-destructive mb-4">セッション情報が見つかりません</p>
          <Button onClick={onBack}>戻る</Button>
        </CardContent>
      </Card>
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
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <p className="text-muted-foreground mb-1">スペース</p>
            <p className="text-4xl font-bold">{data.record.spaceNumber}番</p>
          </div>

          <div className="divide-y">
            <div className="flex justify-between items-center py-3">
              <span className="text-muted-foreground">入庫時刻</span>
              <span className="font-medium">
                {new Date(data.record.entryTime).toLocaleTimeString("ja-JP", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-muted-foreground">現在時刻</span>
              <span className="font-medium">
                {new Date().toLocaleTimeString("ja-JP", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-muted-foreground">駐車時間</span>
              <span className="font-medium">
                {hours > 0 && `${hours}時間`}
                {minutes > 0 && `${minutes}分`}
                {hours === 0 && minutes === 0 && "1分未満"}
              </span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-lg font-bold">お支払い金額</span>
              <span className="text-3xl font-bold">¥{data.amount.toLocaleString()}</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button onClick={onProceedPayment} className="w-full" size="lg">
              決済へ進む
            </Button>
            <Button variant="outline" onClick={onBack} className="w-full">
              キャンセル
            </Button>
          </div>
        </CardContent>
      </Card>
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
  const [paymentMethod, setPaymentMethod] = useState<"paypay" | "credit_card" | "stripe" | "square" | "line_pay" | "rakuten_pay" | "apple_pay" | null>(null);
  const { data } = trpc.parking.getCheckoutInfo.useQuery({ sessionToken });
  const { data: availableMethods } = trpc.paymentSettings.getAvailableMethods.useQuery();
  
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
      paymentMutation.mutate({ sessionToken, paymentMethod });
    }
  };

  const isProcessing = paymentMutation.isPending || stripeCheckoutMutation.isPending || squareCheckoutMutation.isPending || paypayCheckoutMutation.isPending;

  // 利用可能な決済方法を取得
  const hasRealCardPayment = availableMethods?.card !== null && availableMethods?.card !== undefined;
  const hasRealPayPay = availableMethods?.paypay === true;
  const cardProvider = availableMethods?.card || null;

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
        {/* クレジットカード決済（実決済） */}
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
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
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

        {/* PayPay決済（実決済） */}
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

        {/* デモ決済セクション */}
        {(!hasRealCardPayment || !hasRealPayPay) && (
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

      {paymentMethod && paymentMethod !== "stripe" && paymentMethod !== "square" && !(paymentMethod === "paypay" && hasRealPayPay) && (
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
          </div>
          <p className="text-sm text-muted-foreground mt-6">
            ご利用ありがとうございました
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
