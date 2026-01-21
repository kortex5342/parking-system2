import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Trash2, Settings, CreditCard, Smartphone, Train } from "lucide-react";
import { toast } from "sonner";

type PaymentMethod = "paypay" | "rakuten_pay" | "line_pay" | "apple_pay" | "ic_card" | "credit_card";

interface PaymentMethodInfo {
  name: string;
  color: string;
  icon: "smartphone" | "credit_card" | "train";
  description: string;
}

const PAYMENT_METHODS: Record<PaymentMethod, PaymentMethodInfo> = {
  paypay: { name: "PayPay", color: "#FF0033", icon: "smartphone", description: "QRコード決済" },
  rakuten_pay: { name: "楽天ペイ", color: "#BF0000", icon: "smartphone", description: "QRコード決済" },
  line_pay: { name: "LINE Pay", color: "#00C300", icon: "smartphone", description: "QRコード決済" },
  apple_pay: { name: "Apple Pay", color: "#000000", icon: "smartphone", description: "NFC決済" },
  ic_card: { name: "交通系IC", color: "#0066CC", icon: "train", description: "Suica/PASMO等" },
  credit_card: { name: "クレジットカード", color: "#374151", icon: "credit_card", description: "VISA/Mastercard/JCB/AMEX" },
};

export function GlobalPaymentSettingsTab() {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [formData, setFormData] = useState<{
    enabled: boolean;
    feePercentage: number;
    feeFixed: number;
    apiKey: string;
    apiSecret: string;
    merchantId: string;
  }>({
    enabled: true,
    feePercentage: 0,
    feeFixed: 0,
    apiKey: "",
    apiSecret: "",
    merchantId: "",
  });

  const { data: settings, isLoading } = trpc.operator.getGlobalPaymentSettings.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.operator.createGlobalPaymentSetting.useMutation({
    onSuccess: () => {
      toast.success("決済方法を追加しました");
      setSelectedMethod(null);
      setFormData({ enabled: true, feePercentage: 0, feeFixed: 0, apiKey: "", apiSecret: "", merchantId: "" });
      utils.operator.getGlobalPaymentSettings.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = trpc.operator.updateGlobalPaymentSetting.useMutation({
    onSuccess: () => {
      toast.success("決済方法を更新しました");
      utils.operator.getGlobalPaymentSettings.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.operator.deleteGlobalPaymentSetting.useMutation({
    onSuccess: () => {
      toast.success("決済方法を削除しました");
      utils.operator.getGlobalPaymentSettings.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleToggleEnabled = (id: number, enabled: boolean) => {
    updateMutation.mutate({ id, enabled });
  };

  const handleDelete = (id: number) => {
    if (confirm("この決済方法を削除しますか？")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleAddMethod = () => {
    if (!selectedMethod) return;
    createMutation.mutate({
      method: selectedMethod,
      enabled: formData.enabled,
      feePercentage: formData.feePercentage,
      feeFixed: formData.feeFixed,
      apiKey: formData.apiKey || undefined,
      apiSecret: formData.apiSecret || undefined,
      merchantId: formData.merchantId || undefined,
    });
  };

  const getIcon = (iconType: "smartphone" | "credit_card" | "train") => {
    switch (iconType) {
      case "smartphone":
        return <Smartphone className="w-5 h-5 text-white" />;
      case "credit_card":
        return <CreditCard className="w-5 h-5 text-white" />;
      case "train":
        return <Train className="w-5 h-5 text-white" />;
    }
  };

  // 既に設定済みの決済方法を除外
  const availableMethods = Object.keys(PAYMENT_METHODS).filter(
    (method) => !settings?.some((s: any) => s.method === method)
  ) as PaymentMethod[];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            グローバル決済設定
          </CardTitle>
          <CardDescription>
            全オーナーの駐車場で利用可能な決済方法を設定します。
            ここで有効化した決済方法が顧客の決済画面に表示されます。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 設定済み決済方法一覧 */}
          <div>
            <h3 className="font-semibold mb-4">設定済み決済方法</h3>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : settings && settings.length > 0 ? (
              <div className="space-y-3">
                {settings.map((setting: any) => {
                  const info = PAYMENT_METHODS[setting.method as PaymentMethod];
                  if (!info) return null;
                  return (
                    <div
                      key={setting.id}
                      className="flex items-center justify-between p-4 border rounded-lg bg-card"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: info.color }}
                        >
                          {getIcon(info.icon)}
                        </div>
                        <div>
                          <p className="font-medium">{info.name}</p>
                          <p className="text-sm text-muted-foreground">
                            手数料: {setting.feePercentage}% + ¥{setting.feeFixed}
                          </p>
                          {setting.apiKey && (
                            <p className="text-xs text-muted-foreground">
                              APIキー設定済み
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {setting.enabled ? "有効" : "無効"}
                          </span>
                          <Switch
                            checked={setting.enabled}
                            onCheckedChange={(checked) =>
                              handleToggleEnabled(setting.id, checked)
                            }
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(setting.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                決済方法が設定されていません
              </p>
            )}
          </div>

          {/* 新規決済方法追加 */}
          {availableMethods.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="font-semibold mb-4">決済方法を追加</h3>
              
              {!selectedMethod ? (
                <Select
                  value={selectedMethod || ""}
                  onValueChange={(v) => setSelectedMethod(v as PaymentMethod)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="決済方法を選択..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMethods.map((method) => {
                      const info = PAYMENT_METHODS[method];
                      return (
                        <SelectItem key={method} value={method}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: info.color }}
                            />
                            {info.name} - {info.description}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              ) : (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">
                      {PAYMENT_METHODS[selectedMethod].name}を設定
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedMethod(null);
                        setFormData({ enabled: true, feePercentage: 0, feeFixed: 0, apiKey: "", apiSecret: "", merchantId: "" });
                      }}
                    >
                      キャンセル
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>手数料率 (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.feePercentage}
                        onChange={(e) =>
                          setFormData((prev) => ({
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
                        value={formData.feeFixed}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            feeFixed: parseInt(e.target.value) || 0,
                          }))
                        }
                        placeholder="例: 10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input
                      type="password"
                      value={formData.apiKey}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, apiKey: e.target.value }))
                      }
                      placeholder="APIキーを入力（任意）"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>API Secret</Label>
                    <Input
                      type="password"
                      value={formData.apiSecret}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, apiSecret: e.target.value }))
                      }
                      placeholder="APIシークレットを入力（任意）"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Merchant ID</Label>
                    <Input
                      value={formData.merchantId}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, merchantId: e.target.value }))
                      }
                      placeholder="マーチャントIDを入力（任意）"
                    />
                  </div>

                  <Button
                    onClick={handleAddMethod}
                    disabled={createMutation.isPending}
                    className="w-full"
                  >
                    {createMutation.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    追加
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
