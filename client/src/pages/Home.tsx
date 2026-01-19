import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Car, QrCode, CreditCard, Shield, Building2 } from "lucide-react";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";

export default function Home() {
  const { user, isAuthenticated } = useAuth();

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
            {isAuthenticated ? (
              <>
                {(user?.role === 'owner' || user?.role === 'admin') && (
                  <Link href="/owner">
                    <Button variant="outline" className="bg-transparent">
                      <Building2 className="w-4 h-4 mr-2" />
                      オーナー
                    </Button>
                  </Link>
                )}

                {user?.role === 'user' && (
                  <Link href="/owner">
                    <Button variant="default">オーナー登録</Button>
                  </Link>
                )}
              </>
            ) : (
              <Button asChild variant="default">
                <a href={getLoginUrl()}>ログイン</a>
              </Button>
            )}
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
              <Link href="/owner">
                <Button size="lg" variant="outline" className="text-lg px-8 bg-transparent">
                  <Building2 className="w-5 h-5 mr-2" />
                  駐車場オーナーになる
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

        {/* オーナー向けセクション */}
        <section className="py-20">
          <div className="scandi-card max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-4">駐車場オーナーの方へ</h2>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  ParkEaseを使えば、あなたの駐車場をスマートに管理できます。
                  QRコードによる入出庫管理、複数の決済方法への対応、
                  リアルタイムの売上確認など、必要な機能がすべて揃っています。
                </p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-accent rounded-full" />
                    <span>複数の駐車場を一元管理</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-accent rounded-full" />
                    <span>Stripe・Square・PayPayに対応</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-accent rounded-full" />
                    <span>料金設定を自由にカスタマイズ</span>
                  </li>
                </ul>
                <Link href="/owner">
                  <Button size="lg">
                    <Building2 className="w-5 h-5 mr-2" />
                    オーナー登録する
                  </Button>
                </Link>
              </div>
              <div className="flex justify-center">
                <div className="w-64 h-64 bg-accent rounded-3xl flex items-center justify-center">
                  <Building2 className="w-24 h-24 text-accent-foreground" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 料金案内 */}
        <section className="py-20">
          <div className="scandi-card max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">柔軟な料金設定</h2>
            <p className="subtitle mb-8">オーナーが自由に設定可能</p>
            <div className="flex items-baseline justify-center gap-2 mb-4">
              <span className="text-4xl font-bold">10分〜60分</span>
              <span className="text-xl text-muted-foreground">単位で</span>
            </div>
            <p className="text-muted-foreground">
              課金単位と料金をオーナーが自由に設定できます。
              最大料金の設定も可能です。
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
