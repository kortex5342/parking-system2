import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import OwnerDashboard from "./OwnerDashboard";
import NotFound from "./NotFound";

export default function OwnerPage() {
  const [match, params] = useRoute("/owner/:customUrl");

  if (!match || !params?.customUrl) {
    return <NotFound />;
  }

  const customUrl = params.customUrl as string;

  // カスタムURLでオーナー情報を取得
  const { data: owner, isLoading, error } = trpc.operator.getOwnerByCustomUrl.useQuery(
    { customUrl },
    { enabled: !!customUrl }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !owner) {
    return <NotFound />;
  }

  // カスタムURL経由でアクセスした場合、OwnerDashboardを表示
  // (オーナー情報は取得済みなので、そのまま表示で正常動作)
  return <OwnerDashboard />;
}
