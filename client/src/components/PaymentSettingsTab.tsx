import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function PaymentSettingsTab() {
  const [selectedOwnerId, setSelectedOwnerId] = useState<number | null>(null);
  const [selectedLotId, setSelectedLotId] = useState<number | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [editingMethodId, setEditingMethodId] = useState<number | null>(null);
  const [formData, setFormData] = useState<any>({});

  const { data: owners, isLoading: ownersLoading } = trpc.operator.getAllOwners.useQuery();
  const { data: lots, isLoading: lotsLoading } = trpc.operator.getParkingLotsByOwner.useQuery(
    { ownerId: selectedOwnerId || 0 },
    { enabled: !!selectedOwnerId }
  );
  const { data: methods, isLoading: methodsLoading } = trpc.operator.getPaymentMethods.useQuery(
    { lotId: selectedLotId ?? 0 },
    { enabled: !!selectedLotId }
  );

  const utils = trpc.useUtils();

  const setPaymentMethod = trpc.operator.setPaymentMethod.useMutation({
    onSuccess: () => {
      toast.success("決済方法を設定しました");
      setSelectedMethod(null);
      setFormData({});
      if (selectedLotId) utils.operator.getPaymentMethods.invalidate({ lotId: selectedLotId });
    },
    onError: (error: any) => toast.error(error.message),
  });

  const updatePaymentMethod = trpc.operator.updatePaymentMethod.useMutation({
    onSuccess: () => {
      toast.success("決済方法を更新しました");
      setEditingMethodId(null);
      setFormData({});
      if (selectedLotId) utils.operator.getPaymentMethods.invalidate({ lotId: selectedLotId });
    },
    onError: (error: any) => toast.error(error.message),
  });

  const deletePaymentMethod = trpc.operator.deletePaymentMethod.useMutation({
    onSuccess: () => {
      toast.success("決済方法を削除しました");
      if (selectedLotId) utils.operator.getPaymentMethods.invalidate({ lotId: selectedLotId });
    },
    onError: (error: any) => toast.error(error.message),
  });

  const paymentMethodLabels: Record<string, string> = {
    paypay: "PayPay",
    rakuten_pay: "楽天ペイ",
    line_pay: "LINE Pay",
    apple_pay: "Apple Pay",
    ic_card: "交通系IC",
    credit_card: "クレジットカード",
  };

  const handleSaveMethod = () => {
    if (!selectedLotId) return;

    if (editingMethodId) {
      updatePaymentMethod.mutate({
        id: editingMethodId,
        ...formData,
      });
    } else if (selectedMethod) {
      setPaymentMethod.mutate({
        lotId: selectedLotId,
        method: selectedMethod,
        ...formData,
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>決済方法設定</CardTitle>
          <CardDescription>駐車場ごとの決済方法と手数料を設定します</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* オーナー選択 */}
          <div className="space-y-2">
            <Label>オーナーを選択</Label>
            <Select
              value={selectedOwnerId?.toString() || ""}
              onValueChange={(v) => {
                setSelectedOwnerId(parseInt(v));
                setSelectedLotId(null);
              }}
            >
              <SelectTrigger disabled={ownersLoading}>
                <SelectValue placeholder={ownersLoading ? "読み込み中..." : "オーナーを選択..."} />
              </SelectTrigger>
              <SelectContent>
                {owners?.map((owner) => (
                  <SelectItem key={owner.id} value={owner.id.toString()}>
                    {owner.name} ({owner.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 駐車場選択 */}
          {selectedOwnerId && (
            <div className="space-y-2">
              <Label>駐車場を選択</Label>
              <Select
                value={selectedLotId?.toString() || ""}
                onValueChange={(v) => {
                  setSelectedLotId(parseInt(v));
                  setSelectedMethod(null);
                  setEditingMethodId(null);
                }}
              >
                <SelectTrigger disabled={lotsLoading}>
                  <SelectValue placeholder={lotsLoading ? "読み込み中..." : "駐車場を選択..."} />
                </SelectTrigger>
                <SelectContent>
                  {lots?.map((lot) => (
                    <SelectItem key={lot.id} value={lot.id.toString()}>
                      {lot.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 決済方法一覧 */}
          {selectedLotId && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-3">設定済み決済方法</h3>
                {methodsLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : methods && methods.length > 0 ? (
                  <div className="space-y-2">
                    {methods.map((method: any) => (
                      <div key={method.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{paymentMethodLabels[method.method]}</p>
                          <p className="text-sm text-muted-foreground">
                            手数料: {method.feePercentage}% + ¥{method.feeFixed}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingMethodId(method.id);
                              setFormData({
                                enabled: method.enabled,
                                feePercentage: parseFloat(method.feePercentage),
                                feeFixed: method.feeFixed,
                              });
                            }}
                          >
                            編集
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deletePaymentMethod.mutate({ id: method.id })}
                            disabled={deletePaymentMethod.isPending}
                          >
                            削除
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">決済方法が設定されていません</p>
                )}
              </div>

              {/* 新規決済方法追加フォーム */}
              {!editingMethodId && !selectedMethod && (
                <div>
                  <h3 className="font-semibold mb-3">決済方法を追加</h3>
                  <Select value={selectedMethod || ""} onValueChange={setSelectedMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="決済方法を選択..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paypay">PayPay</SelectItem>
                      <SelectItem value="rakuten_pay">楽天ペイ</SelectItem>
                      <SelectItem value="line_pay">LINE Pay</SelectItem>
                      <SelectItem value="apple_pay">Apple Pay</SelectItem>
                      <SelectItem value="ic_card">交通系IC</SelectItem>
                      <SelectItem value="credit_card">クレジットカード</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* 編集・追加フォーム */}
              {(editingMethodId || selectedMethod) && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <h3 className="font-semibold">
                    {editingMethodId ? "決済方法を編集" : `${paymentMethodLabels[selectedMethod!]}を設定`}
                  </h3>

                  <div className="space-y-2">
                    <Label>手数料率 (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.feePercentage || ""}
                      onChange={(e) =>
                        setFormData((prev: any) => ({
                          ...prev,
                          feePercentage: parseFloat(e.target.value) || 0,
                        }))
                      }
                      placeholder="例: 3.5"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>固定手数料 (円)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.feeFixed || ""}
                      onChange={(e) =>
                        setFormData((prev: any) => ({
                          ...prev,
                          feeFixed: parseInt(e.target.value) || 0,
                        }))
                      }
                      placeholder="例: 10"
                    />
                  </div>

                  {!editingMethodId && selectedMethod && (
                    <>
                      <div className="space-y-2">
                        <Label>API Key</Label>
                        <Input
                          type="password"
                          value={formData.apiKey || ""}
                          onChange={(e) =>
                            setFormData((prev: any) => ({
                              ...prev,
                              apiKey: e.target.value,
                            }))
                          }
                          placeholder="APIキーを入力"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>API Secret</Label>
                        <Input
                          type="password"
                          value={formData.apiSecret || ""}
                          onChange={(e) =>
                            setFormData((prev: any) => ({
                              ...prev,
                              apiSecret: e.target.value,
                            }))
                          }
                          placeholder="APIシークレットを入力"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Merchant ID</Label>
                        <Input
                          value={formData.merchantId || ""}
                          onChange={(e) =>
                            setFormData((prev: any) => ({
                              ...prev,
                              merchantId: e.target.value,
                            }))
                          }
                          placeholder="マーチャントIDを入力"
                        />
                      </div>
                    </>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveMethod}
                      disabled={setPaymentMethod.isPending || updatePaymentMethod.isPending}
                    >
                      {(setPaymentMethod.isPending || updatePaymentMethod.isPending) && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      {editingMethodId ? "更新" : "追加"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedMethod(null);
                        setEditingMethodId(null);
                        setFormData({});
                      }}
                    >
                      キャンセル
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
