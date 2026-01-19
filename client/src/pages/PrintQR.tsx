import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Loader2 } from "lucide-react";
import { Link } from "wouter";
import QRCode from "qrcode";

export default function PrintQR() {
  const { data, isLoading } = trpc.parking.getSpaces.useQuery();
  const [baseUrl, setBaseUrl] = useState("");
  const [qrCodes, setQrCodes] = useState<Record<number, string>>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (data && baseUrl) {
      data.forEach(async (space: { id: number; qrCode: string; spaceNumber: number }) => {
        const url = `${baseUrl}/scan?qr=${space.qrCode}`;
        const dataUrl = await QRCode.toDataURL(url, { width: 200, margin: 2 });
        setQrCodes((prev) => ({ ...prev, [space.id]: dataUrl }));
      });
    }
  }, [data, baseUrl]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">駐車スペースがありません</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 印刷時に非表示になるヘッダー */}
      <header className="print:hidden bg-background border-b border-border p-4">
        <div className="container flex items-center justify-between">
          <Link href="/admin">
            <Button variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-2" />
              管理画面へ戻る
            </Button>
          </Link>
          <Button onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            印刷する
          </Button>
        </div>
      </header>

      {/* QRコードグリッド */}
      <main className="p-8">
        <div className="grid grid-cols-2 gap-8 print:gap-4">
          {data.map((space: { id: number; qrCode: string; spaceNumber: number }) => (
            <div
              key={space.id}
              className="border-2 border-black rounded-lg p-6 text-center break-inside-avoid"
            >
              <h2 className="text-4xl font-bold mb-4">
                駐車スペース {space.spaceNumber}番
              </h2>
              <div className="flex justify-center mb-4">
                {qrCodes[space.id] ? (
                  <img
                    src={qrCodes[space.id]}
                    alt={`スペース${space.spaceNumber}のQRコード`}
                    width={200}
                    height={200}
                  />
                ) : (
                  <div className="w-[200px] h-[200px] bg-gray-100 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                )}
              </div>
              <p className="text-lg font-medium mb-2">
                このQRコードをスキャンして入庫
              </p>
              <p className="text-sm text-gray-600">
                料金: ¥300 / 1時間
              </p>
            </div>
          ))}
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
