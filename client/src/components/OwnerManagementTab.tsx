import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy, Plus, Trash2 } from "lucide-react";

export function OwnerManagementTab() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    customUrl: "",
  });

  const { data: owners, isLoading, refetch } = trpc.operator.getOwnersList.useQuery();
  const createOwnerMutation = trpc.operator.createOwner.useMutation();
  const deleteOwnerMutation = trpc.operator.suspendOwner.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.customUrl) {
      toast.error("すべてのフィールドを入力してください");
      return;
    }

    try {
      await createOwnerMutation.mutateAsync(formData);
      toast.success("オーナーを追加しました");
      setFormData({ name: "", email: "", customUrl: "" });
      setOpen(false);
      refetch();
    } catch (error) {
      toast.error("オーナーの追加に失敗しました");
      console.error(error);
    }
  };

  const handleCopyLink = (customUrl: string) => {
    const link = `${window.location.origin}/owner/${customUrl}`;
    navigator.clipboard.writeText(link);
    toast.success("リンクをコピーしました");
  };

  const handleDeleteOwner = async (ownerId: number) => {
    if (!confirm("このオーナーを停止してもよろしいですか？")) {
      return;
    }

    try {
      await deleteOwnerMutation.mutateAsync({ userId: ownerId });
      toast.success("オーナーを停止しました");
      refetch();
    } catch (error) {
      toast.error("オーナーの停止に失敗しました");
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">オーナー管理</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              新規オーナー追加
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新規オーナー追加</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">オーナー名</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例：駐車場A"
                />
              </div>
              <div>
                <label className="text-sm font-medium">メールアドレス</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="owner@example.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium">カスタムURL</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">{window.location.origin}/owner/</span>
                  <Input
                    value={formData.customUrl}
                    onChange={(e) => setFormData({ ...formData, customUrl: e.target.value })}
                    placeholder="parking-lot-a"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createOwnerMutation.isPending}>
                {createOwnerMutation.isPending ? "追加中..." : "追加"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>登録済みオーナー</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">読み込み中...</div>
          ) : !owners || owners.length === 0 ? (
            <div className="text-center py-8 text-gray-500">オーナーが登録されていません</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>オーナー名</TableHead>
                  <TableHead>メールアドレス</TableHead>
                  <TableHead>カスタムURL</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead className="text-right">アクション</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {owners.map((owner) => (
                  <TableRow key={owner.id}>
                    <TableCell className="font-medium">{owner.name}</TableCell>
                    <TableCell>{owner.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {owner.customUrl}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyLink(owner.customUrl || "")}
                          disabled={!owner.customUrl}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded text-sm ${
                          owner.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {owner.status === "active" ? "有効" : "停止"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteOwner(owner.id)}
                        disabled={deleteOwnerMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
