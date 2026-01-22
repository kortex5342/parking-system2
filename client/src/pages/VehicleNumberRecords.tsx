'use client';

import { useState } from 'react';
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  Car,
  Camera,
  Clock,
  Search,
  Filter,
  Loader2,
  CheckCircle,
  XCircle,
  Image as ImageIcon,
  ChevronLeft,
  RefreshCw,
} from "lucide-react";
import { Link, useRoute } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface VehicleRecord {
  id: number;
  parkingLotId: number;
  area: string | null;
  classNumber: string | null;
  kana: string | null;
  digits: string | null;
  fullNumber: string | null;
  plateType: string | null;
  plateUse: string | null;
  plateColor: string | null;
  imageUrl: string | null;
  recognitionSuccess: boolean;
  capturedAt: number;
  createdAt: Date;
}

export default function VehicleNumberRecords() {
  const [match, params] = useRoute("/owner/:customUrl/vehicles");
  const customUrl = match && params?.customUrl ? (params.customUrl as string) : null;
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: records, isLoading, refetch } = trpc.owner.getVehicleNumberRecords.useQuery({
    customUrl: customUrl || undefined,
    limit: 200,
  });
  
  const { data: parkingLots } = trpc.owner.getParkingLots.useQuery(
    customUrl ? { customUrl } : undefined
  );

  // フィルタリング
  const filteredRecords = records?.filter((record: VehicleRecord) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      record.fullNumber?.toLowerCase().includes(query) ||
      record.area?.toLowerCase().includes(query) ||
      record.digits?.toLowerCase().includes(query)
    );
  }) || [];

  // 日時フォーマット
  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // プレートカラーのバッジ色
  const getPlateColorBadge = (color: string | null) => {
    switch (color) {
      case '白':
        return <Badge variant="outline" className="bg-white text-black border-gray-300">白</Badge>;
      case '緑':
        return <Badge className="bg-green-600">緑</Badge>;
      case '黄':
        return <Badge className="bg-yellow-400 text-black">黄</Badge>;
      case '黒':
        return <Badge className="bg-black text-white">黒</Badge>;
      default:
        return <Badge variant="secondary">{color || '不明'}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <header className="border-b bg-card">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href={customUrl ? `/owner/${customUrl}` : "/owner"}>
                <Button variant="ghost" size="sm">
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  戻る
                </Button>
              </Link>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                <span className="text-lg font-semibold">車両ナンバー履歴</span>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              更新
            </Button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container py-8">
        {/* 検索・フィルター */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5" />
              検索
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="ナンバーで検索（例：練馬、1234）"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 統計サマリー */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">総記録数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{records?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">認識成功</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {records?.filter((r: VehicleRecord) => r.recognitionSuccess).length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">認識失敗</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {records?.filter((r: VehicleRecord) => !r.recognitionSuccess).length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 記録一覧 */}
        <Card>
          <CardHeader>
            <CardTitle>認識履歴</CardTitle>
            <CardDescription>
              監視カメラで撮影された車両ナンバーの認識結果
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Car className="h-12 w-12 mb-4 opacity-50" />
                <p>車両ナンバーの記録がありません</p>
                <p className="text-sm mt-2">カメラから画像が送信されると、ここに表示されます</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">撮影日時</TableHead>
                      <TableHead>ナンバー</TableHead>
                      <TableHead>プレート</TableHead>
                      <TableHead>認識</TableHead>
                      <TableHead className="text-right">画像</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record: VehicleRecord) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-mono text-sm">
                          {formatDateTime(record.capturedAt)}
                        </TableCell>
                        <TableCell>
                          {record.recognitionSuccess && record.fullNumber ? (
                            <div>
                              <div className="font-bold text-lg">{record.fullNumber}</div>
                              <div className="text-xs text-muted-foreground">
                                {record.area && <span className="mr-2">{record.area}</span>}
                                {record.classNumber && <span className="mr-2">{record.classNumber}</span>}
                                {record.kana && <span className="mr-2">{record.kana}</span>}
                                {record.digits && <span>{record.digits}</span>}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">認識失敗</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {record.plateColor && getPlateColorBadge(record.plateColor)}
                            {record.plateUse && (
                              <Badge variant="outline" className="text-xs">
                                {record.plateUse}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {record.recognitionSuccess ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {record.imageUrl ? (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <ImageIcon className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-3xl">
                                <DialogHeader>
                                  <DialogTitle>撮影画像</DialogTitle>
                                  <DialogDescription>
                                    {formatDateTime(record.capturedAt)} に撮影
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="mt-4">
                                  <img
                                    src={record.imageUrl}
                                    alt="撮影画像"
                                    className="w-full rounded-lg"
                                  />
                                </div>
                              </DialogContent>
                            </Dialog>
                          ) : (
                            <span className="text-muted-foreground text-sm">なし</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
