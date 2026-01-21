import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import OwnerDashboard from "./OwnerDashboard";
import NotFound from "./NotFound";

export default function OwnerByIdPage() {
  const [match, params] = useRoute("/owner/id/:openId");

  if (!match || !params?.openId) {
    return <NotFound />;
  }

  const openId = params.openId as string;

  // openIdでオーナー情報を取得
  const { data: owner, isLoading, error } = trpc.operator.getOwnerByOpenId.useQuery(
    { openId },
    { enabled: !!openId }
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

  // openId経由でアクセスした場合、OwnerDashboardを表示
  // OwnerDashboardはuseRouteでopenIdを取得するので、propsは不要
  return <OwnerDashboard />;
}
