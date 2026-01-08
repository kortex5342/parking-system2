import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Car, QrCode, Camera, ArrowLeft, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";
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

  // URLパラメータからQRコードを取得
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qr = params.get("qr");
    if (qr) {
      setQrCode(qr);
      setView("space-info");
    }
    
    // ローカルストレージからセッショントークンを復元
    const savedToken = localStorage.getItem("parkingSessionToken");
    if (savedToken) {
      setSessionToken(savedToken);
    }
  }, []);

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
        <nav className="flex items-center justify-between">
          <Link href="/">
            <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span>戻る</span>
            </button>
          </Link>
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
              onExitConfirm={() => setView("exit-confirm")}
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
  onExitConfirm: () => void;
}) {
  const { data, isLoading, error } = trpc.parking.getSpaceByQrCode.useQuery({ qrCode });
  const enterMutation = trpc.parking.enter.useMutation({
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

  const { space, canEnter, canExit } = data;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="text-center">
          <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl font-bold">{space.spaceNumber}</span>
          </div>
          <CardTitle>駐車スペース {space.spaceNumber}番</CardTitle>
          <CardDescription>
            {canEnter ? "このスペースは空いています" : "このスペースは使用中です"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <span className={canEnter ? "status-available" : "status-occupied"}>
              {canEnter ? "空き" : "使用中"}
            </span>
          </div>

          {canEnter && (
            <Button
              onClick={() => enterMutation.mutate({ qrCode })}
              disabled={enterMutation.isPending}
              className="w-full"
              size="lg"
            >
              {enterMutation.isPending ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Car className="w-5 h-5 mr-2" />
              )}
              入庫する
            </Button>
          )}

          {canExit && (
            <Button onClick={onExitConfirm} className="w-full" size="lg">
              出庫手続きへ
            </Button>
          )}

          <Button variant="outline" onClick={onBack} className="w-full">
            戻る
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// 入庫成功画面
function EntrySuccessView({
  sessionToken,
  onExit,
  onHome,
}: {
  sessionToken: string;
  onExit: () => void;
  onHome: () => void;
}) {
  const { data } = trpc.parking.getRecordByToken.useQuery({ sessionToken });

  return (
    <div className="space-y-6">
      <Card className="border-[var(--success)] bg-[var(--success)]/10">
        <CardContent className="pt-6 text-center">
          <CheckCircle2 className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--success)' }} />
          <h2 className="text-2xl font-bold mb-2">入庫完了</h2>
          <p className="text-muted-foreground mb-6">
            スペース{data?.spaceNumber}番に入庫しました
          </p>
          
          {data && (
            <div className="scandi-card mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground">入庫時刻</span>
                <span className="font-medium">
                  {new Date(data.entryTime).toLocaleString("ja-JP")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">料金</span>
                <span className="font-medium">¥300 / 1時間</span>
              </div>
            </div>
          )}

          <p className="text-sm text-muted-foreground mb-6">
            出庫時は再度このページにアクセスしてください
          </p>

          <div className="space-y-3">
            <Button onClick={onExit} variant="outline" className="w-full">
              今すぐ出庫する
            </Button>
            <Button onClick={onHome} className="w-full">
              ホームへ戻る
            </Button>
          </div>
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
  const { data, isLoading, error } = trpc.parking.calculateExit.useQuery({ sessionToken });

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

  const hours = Math.ceil(data.durationMinutes / 60);
  const minutes = data.durationMinutes % 60;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">出庫確認</h1>
        <p className="subtitle">料金をご確認ください</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl font-bold">{data.record.spaceNumber}</span>
            </div>
            <p className="text-muted-foreground">駐車スペース {data.record.spaceNumber}番</p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center py-3 border-b border-border">
              <span className="text-muted-foreground">入庫時刻</span>
              <span className="font-medium">
                {new Date(data.record.entryTime).toLocaleString("ja-JP")}
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-border">
              <span className="text-muted-foreground">出庫時刻</span>
              <span className="font-medium">
                {new Date(data.exitTime).toLocaleString("ja-JP")}
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-border">
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
  const [paymentMethod, setPaymentMethod] = useState<"paypay" | "credit_card" | null>(null);
  const { data } = trpc.parking.calculateExit.useQuery({ sessionToken });
  
  const paymentMutation = trpc.parking.processPayment.useMutation({
    onSuccess: () => {
      toast.success("決済が完了しました");
      onSuccess();
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
    paymentMutation.mutate({ sessionToken, paymentMethod });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">お支払い</h1>
        <p className="subtitle">決済方法を選択してください</p>
      </div>

      {data && (
        <Card className="bg-secondary/50">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-2">お支払い金額</p>
            <p className="text-4xl font-bold">¥{data.amount.toLocaleString()}</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
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
              <span className="text-white font-bold text-sm">Pay</span>
            </div>
            <div className="text-left">
              <p className="font-bold">PayPay</p>
              <p className="text-sm text-muted-foreground">デモ決済</p>
            </div>
            {paymentMethod === "paypay" && (
              <CheckCircle2 className="w-6 h-6 ml-auto" style={{ color: 'var(--success)' }} />
            )}
          </div>
        </button>

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
              <span className="text-white font-bold text-xs">CARD</span>
            </div>
            <div className="text-left">
              <p className="font-bold">クレジットカード</p>
              <p className="text-sm text-muted-foreground">デモ決済</p>
            </div>
            {paymentMethod === "credit_card" && (
              <CheckCircle2 className="w-6 h-6 ml-auto" style={{ color: 'var(--success)' }} />
            )}
          </div>
        </button>
      </div>

      <div className="space-y-3">
        <Button
          onClick={handlePayment}
          disabled={!paymentMethod || paymentMutation.isPending}
          className="w-full"
          size="lg"
        >
          {paymentMutation.isPending ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : null}
          決済する
        </Button>
        <Button variant="outline" onClick={onBack} className="w-full">
          戻る
        </Button>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        ※これはデモ決済です。実際の課金は発生しません。
      </p>
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
          <h2 className="text-3xl font-bold mb-2">決済完了</h2>
          <p className="text-muted-foreground mb-6">
            ご利用ありがとうございました
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            お気をつけてお帰りください
          </p>
          <Button onClick={onHome} className="w-full" size="lg">
            ホームへ戻る
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
