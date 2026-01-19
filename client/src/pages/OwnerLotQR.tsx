import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Building2, 
  QrCode,
  Loader2,
  Printer,
  ArrowLeft,
} from "lucide-react";
import { Link, useParams } from "wouter";
import { getLoginUrl } from "@/const";

export default function OwnerLotQR() {
  const { lotId } = useParams<{ lotId: string }>();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const { data, isLoading } = trpc.owner.getParkingLot.useQuery(
    { lotId: parseInt(lotId || '0') },
    { enabled: !!lotId && isAuthenticated }
  );

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>ログインが必要です</CardTitle>
            <CardDescription>QRコードを表示するにはログインしてください</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <a href={getLoginUrl()}>ログイン</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>駐車場が見つかりません</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild variant="outline">
              <Link href="/owner">戻る</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { lot, spaces } = data;
  const baseUrl = window.location.origin;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー（印刷時は非表示） */}
      <header className="border-b bg-card print:hidden">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/owner">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  戻る
                </Link>
              </Button>
              <span className="text-xl font-bold">{lot.name}</span>
            </div>
            <Button onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              印刷
            </Button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container py-8">
        <div className="mb-6 print:hidden">
          <h1 className="text-2xl font-bold mb-2">QRコード一覧</h1>
          <p className="text-muted-foreground">
            各駐車スペースに設置するQRコードです。印刷してご利用ください。
          </p>
        </div>

        {/* QRコードグリッド */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 print:grid-cols-2 print:gap-4">
          {spaces.map((space: any) => {
            const scanUrl = `${baseUrl}/scan/${lot.id}/${space.spaceNumber}`;
            const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(scanUrl)}`;
            
            return (
              <Card key={space.id} className="print:break-inside-avoid print:shadow-none print:border-2">
                <CardContent className="p-6 flex flex-col items-center">
                  <div className="text-center mb-4">
                    <p className="text-sm text-muted-foreground">{lot.name}</p>
                    <p className="text-3xl font-bold">{space.spaceNumber}番</p>
                  </div>
                  
                  <div className="bg-white p-2 rounded-lg border">
                    <img 
                      src={qrCodeUrl} 
                      alt={`スペース${space.spaceNumber}のQRコード`}
                      className="w-40 h-40"
                    />
                  </div>

                  <div className="mt-4 text-center">
                    <p className="text-xs text-muted-foreground">
                      このQRコードをスキャンして
                    </p>
                    <p className="text-xs text-muted-foreground">
                      入出庫手続きを行ってください
                    </p>
                  </div>

                  <div className="mt-2 text-center print:hidden">
                    <Badge variant={space.status === 'occupied' ? 'destructive' : 'default'}>
                      {space.status === 'occupied' ? '使用中' : '空き'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* 印刷用フッター */}
        <div className="hidden print:block mt-8 text-center text-sm text-muted-foreground">
          <p>ParkEase - {lot.name}</p>
          <p>料金: ¥{lot.pricingAmount} / {lot.pricingUnitMinutes}分</p>
        </div>
      </main>

      {/* 印刷用スタイル */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 1cm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
