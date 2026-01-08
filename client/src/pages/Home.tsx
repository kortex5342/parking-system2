import { Button } from "@/components/ui/button";
import { Car, QrCode, CreditCard, Shield } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* 幾何学図形（装飾） */}
      <div className="geometric-shape w-96 h-96 bg-accent top-20 -left-48" />
      <div className="geometric-shape w-64 h-64 top-40 right-10" style={{ backgroundColor: 'var(--blush)' }} />
      <div className="geometric-shape w-48 h-48 bg-accent bottom-20 left-1/3" />

      {/* ヘッダー */}
      <header className="relative z-10 container py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car className="w-8 h-8 text-foreground" />
            <span className="text-xl font-bold tracking-tight">ParkEase</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/scan">
              <Button variant="outline" className="bg-transparent">入庫・出庫</Button>
            </Link>
            <Link href="/admin">
              <Button variant="default">管理者</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* ヒーローセクション */}
      <main className="relative z-10 container">
        <section className="py-20 md:py-32">
          <div className="max-w-3xl">
            <p className="subtitle text-lg mb-4">シンプルな駐車場管理</p>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
              スマートな
              <br />
              <span className="text-accent-foreground bg-accent px-2 rounded">入出庫体験</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-xl mb-8 leading-relaxed">
              QRコードをスキャンするだけで入庫完了。
              出庫時は経過時間に応じた料金を自動計算し、
              スムーズに決済できます。
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/scan">
                <Button size="lg" className="text-lg px-8">
                  <QrCode className="w-5 h-5 mr-2" />
                  QRスキャンで入庫
                </Button>
              </Link>
              <Link href="/admin">
                <Button size="lg" variant="outline" className="text-lg px-8 bg-transparent">
                  管理画面へ
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* 特徴セクション */}
        <section className="py-20">
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<QrCode className="w-8 h-8" />}
              title="QRコードで簡単入庫"
              description="各駐車スペースのQRコードをスキャンするだけ。面倒な手続きは一切不要です。"
              accentColor="bg-accent"
            />
            <FeatureCard
              icon={<CreditCard className="w-8 h-8" />}
              title="選べる決済方法"
              description="PayPayまたはクレジットカードで、出庫時にスムーズに精算できます。"
              accentColor="bg-[var(--blush)]"
            />
            <FeatureCard
              icon={<Shield className="w-8 h-8" />}
              title="リアルタイム管理"
              description="管理者は入庫状況と決済履歴をリアルタイムで確認できます。"
              accentColor="bg-accent"
            />
          </div>
        </section>

        {/* 料金案内 */}
        <section className="py-20">
          <div className="scandi-card max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">シンプルな料金体系</h2>
            <p className="subtitle mb-8">わかりやすい時間制料金</p>
            <div className="flex items-baseline justify-center gap-2 mb-4">
              <span className="text-6xl font-bold">¥300</span>
              <span className="text-2xl text-muted-foreground">/ 1時間</span>
            </div>
            <p className="text-muted-foreground">
              端数は切り上げ計算。入庫から出庫までの時間で料金が決まります。
            </p>
          </div>
        </section>
      </main>

      {/* フッター */}
      <footer className="relative z-10 container py-12 border-t border-border">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Car className="w-6 h-6 text-muted-foreground" />
            <span className="text-muted-foreground">ParkEase</span>
          </div>
          <p className="text-sm text-muted-foreground">
            駐車場入出庫管理システム
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  accentColor,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accentColor: string;
}) {
  return (
    <div className="scandi-card group hover:shadow-md transition-shadow">
      <div className={`w-16 h-16 ${accentColor} rounded-xl flex items-center justify-center mb-6`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
