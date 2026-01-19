import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, Loader2 } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // ログイン済みの場合はオーナーダッシュボードへリダイレクト
  useEffect(() => {
    if (!loading && isAuthenticated) {
      setLocation("/owner");
    }
  }, [loading, isAuthenticated, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center">
      {/* 幾何学図形（装飾） */}
      <div className="geometric-shape w-96 h-96 bg-accent top-20 -left-48" />
      <div className="geometric-shape w-64 h-64 top-40 right-10" style={{ backgroundColor: 'var(--blush)' }} />
      <div className="geometric-shape w-48 h-48 bg-accent bottom-20 left-1/3" />

      <Card className="w-full max-w-md relative z-10 shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Car className="w-10 h-10 text-foreground" />
            <span className="text-3xl font-bold tracking-tight">ParkEase</span>
          </div>
          <div>
            <CardTitle className="text-xl">駐車場管理システム</CardTitle>
            <CardDescription className="mt-2">
              オーナー様専用の管理画面です
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Button asChild size="lg" className="w-full">
            <a href={getLoginUrl()}>ログイン</a>
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            ご契約済みのオーナー様はログインしてください
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
