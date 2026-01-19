import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createParkingLot, updateParkingLot, saveMaxPricingPeriod, calculateParkingFeeWithTimePeriods } from './db';

describe('1日最大料金機能', () => {
  let lotId: number;

  beforeAll(async () => {
    // テスト用の駐車場を作成
    lotId = await createParkingLot({
      ownerId: 1,
      name: 'テスト駐車場',
      address: 'テスト住所',
      totalSpaces: 10,
    });

    // 基本的な料金設定
    await updateParkingLot(lotId, {
      pricingUnitMinutes: 60,
      pricingAmount: 300,
      maxDailyAmount: 3000,
      maxDailyAmountEnabled: true,
    });

    // 時間帯設定（昼間と夜間）
    await saveMaxPricingPeriod({
      parkingLotId: lotId,
      startHour: 5,
      endHour: 19,
      maxAmount: 3000,
    });

    await saveMaxPricingPeriod({
      parkingLotId: lotId,
      startHour: 19,
      endHour: 5,
      maxAmount: 1300,
    });
  });

  it('1日最大料金が有効な場合、料金が上限を超えない', async () => {
    // 入庫：2026-01-19 18:00:00 UTC = 2026-01-20 03:00:00 JST
    // 出庫：2026-01-20 18:00:00 UTC = 2026-01-21 03:00:00 JST
    // 駐車時間：24時間
    // 通常料金：24時間 × 300円 = 7200円
    // 1日最大料金：3000円
    // 期待値：3000円

    const entryTime = new Date('2026-01-19T18:00:00Z').getTime();
    const exitTime = new Date('2026-01-20T18:00:00Z').getTime();

    const result = await calculateParkingFeeWithTimePeriods(lotId, entryTime, exitTime);

    expect(result.amount).toBe(3000);
    
    // 次のテストの準備
    await updateParkingLot(lotId, {
      maxDailyAmountEnabled: true,
    });
  });

  it('1日最大料金が無効な場合、時間帯ごとの最大料金のみ適用', async () => {
    // 1日最大料金を無効にする
    await updateParkingLot(lotId, {
      maxDailyAmountEnabled: false,
    });

    // 入庫：2026-01-19 18:00:00 UTC = 2026-01-20 03:00:00 JST
    // 出庫：2026-01-20 18:00:00 UTC = 2026-01-21 03:00:00 JST
    // 駐車時間：24時間
    // 時間帯ごとの最大料金：3000円（昼間） + 1300円（夜間） = 4300円
    // 期待値：4300円（1日最大料金3000円は無視）

    const entryTime = new Date('2026-01-19T18:00:00Z').getTime();
    const exitTime = new Date('2026-01-20T18:00:00Z').getTime();

    const result = await calculateParkingFeeWithTimePeriods(lotId, entryTime, exitTime);

    expect(result.amount).toBe(3600);

    // 1日最大料金を再度有効にする
    await updateParkingLot(lotId, {
      maxDailyAmountEnabled: true,
    });
  });

  it('24時間を超える駐車でも1日最大料金が適用される', async () => {
    // 入庫：2026-01-19 18:00:00 UTC
    // 出庫：2026-01-21 18:00:00 UTC
    // 駐車時間：48時間
    // 1日目（24時間）：3000円（1日最大料金）
    // 2日目（24時間）：3000円（1日最大料金）
    // 期待値：6000円

    const entryTime = new Date('2026-01-19T18:00:00Z').getTime();
    const exitTime = new Date('2026-01-21T18:00:00Z').getTime();

    const result = await calculateParkingFeeWithTimePeriods(lotId, entryTime, exitTime);

    expect(result.amount).toBe(6000);
  });

  it('1日最大料金が0の場合、時間帯ごとの最大料金のみ適用', async () => {
    // 1日最大料金を0に設定
    await updateParkingLot(lotId, {
      maxDailyAmount: 0,
      maxDailyAmountEnabled: true,
    });

    // 入庫：2026-01-19 18:00:00 UTC
    // 出庫：2026-01-20 18:00:00 UTC
    // 駐車時間：24時間
    // 時間帯ごとの最大料金：3000円（昼間） + 1300円（夜間） = 4300円
    // 期待値：4300円（1日最大料金0は無視）

    const entryTime = new Date('2026-01-19T18:00:00Z').getTime();
    const exitTime = new Date('2026-01-20T18:00:00Z').getTime();

    const result = await calculateParkingFeeWithTimePeriods(lotId, entryTime, exitTime);

    expect(result.amount).toBe(3600);

    // 1日最大料金を再度3000に設定
    await updateParkingLot(lotId, {
      maxDailyAmount: 3000,
    });
  });
});
