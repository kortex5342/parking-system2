import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  getAllGlobalPaymentSettings,
  getGlobalPaymentSettingByMethod,
  getEnabledGlobalPaymentSettings,
  upsertGlobalPaymentSetting,
  deleteGlobalPaymentSetting,
} from './db';

describe('Global Payment Settings', () => {
  const testMethod = 'line_pay' as const;
  
  afterAll(async () => {
    // クリーンアップ: テストで作成した設定を削除
    try {
      await deleteGlobalPaymentSetting(testMethod);
    } catch (e) {
      // 無視
    }
  });

  it('should create a new global payment setting', async () => {
    await upsertGlobalPaymentSetting({
      method: testMethod,
      enabled: true,
      apiKey: 'test-api-key',
      apiSecret: 'test-api-secret',
      merchantId: 'test-merchant-id',
      feePercentage: '3.5',
      feeFixed: 10,
    });

    const setting = await getGlobalPaymentSettingByMethod(testMethod);
    expect(setting).not.toBeNull();
    expect(setting?.method).toBe(testMethod);
    expect(setting?.enabled).toBe(true);
    expect(setting?.apiKey).toBe('test-api-key');
    expect(setting?.feePercentage).toBe('3.50');
    expect(setting?.feeFixed).toBe(10);
  });

  it('should update an existing global payment setting', async () => {
    await upsertGlobalPaymentSetting({
      method: testMethod,
      enabled: false,
      feePercentage: '5.0',
      feeFixed: 20,
    });

    const setting = await getGlobalPaymentSettingByMethod(testMethod);
    expect(setting).not.toBeNull();
    expect(setting?.enabled).toBe(false);
    expect(setting?.feePercentage).toBe('5.00');
    expect(setting?.feeFixed).toBe(20);
    // 既存の値は保持される
    expect(setting?.apiKey).toBe('test-api-key');
  });

  it('should get all global payment settings', async () => {
    const settings = await getAllGlobalPaymentSettings();
    expect(Array.isArray(settings)).toBe(true);
    const found = settings.find(s => s.method === testMethod);
    expect(found).toBeDefined();
  });

  it('should get enabled global payment settings', async () => {
    // まず有効にする
    await upsertGlobalPaymentSetting({
      method: testMethod,
      enabled: true,
    });

    const enabledSettings = await getEnabledGlobalPaymentSettings();
    expect(Array.isArray(enabledSettings)).toBe(true);
    const found = enabledSettings.find(s => s.method === testMethod);
    expect(found).toBeDefined();
    expect(found?.enabled).toBe(true);
  });

  it('should delete a global payment setting', async () => {
    await deleteGlobalPaymentSetting(testMethod);
    const setting = await getGlobalPaymentSettingByMethod(testMethod);
    expect(setting).toBeNull();
  });
});
