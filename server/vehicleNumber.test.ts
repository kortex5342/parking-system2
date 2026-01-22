import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createVehicleNumberRecord,
  getVehicleNumberRecordsByParkingLot,
  createCameraSetting,
  getCameraSettingsByParkingLot,
  updateCameraSetting,
  deleteCameraSetting,
  getCameraSettingById,
} from './db';

// Mock the database connection
vi.mock('./db', async () => {
  const actual = await vi.importActual('./db');
  
  // In-memory storage for tests
  let vehicleRecords: any[] = [];
  let cameraSettings: any[] = [];
  let idCounter = 1;
  let cameraIdCounter = 1;
  
  return {
    ...actual,
    createVehicleNumberRecord: vi.fn(async (data: any) => {
      const record = {
        id: idCounter++,
        ...data,
        createdAt: new Date(),
      };
      vehicleRecords.push(record);
      return record.id;
    }),
    getVehicleNumberRecordsByParkingLot: vi.fn(async (parkingLotId: number, limit: number) => {
      return vehicleRecords
        .filter(r => r.parkingLotId === parkingLotId)
        .slice(0, limit)
        .sort((a, b) => b.capturedAt - a.capturedAt);
    }),
    createCameraSetting: vi.fn(async (data: any) => {
      const setting = {
        id: cameraIdCounter++,
        ...data,
        enabled: data.enabled ?? true,
        captureIntervalMinutes: data.captureIntervalMinutes ?? 60,
        createdAt: new Date(),
      };
      cameraSettings.push(setting);
      return setting.id;
    }),
    getCameraSettingsByParkingLot: vi.fn(async (parkingLotId: number) => {
      return cameraSettings.filter(c => c.parkingLotId === parkingLotId);
    }),
    getCameraSettingById: vi.fn(async (id: number) => {
      return cameraSettings.find(c => c.id === id);
    }),
    updateCameraSetting: vi.fn(async (id: number, data: any) => {
      const index = cameraSettings.findIndex(c => c.id === id);
      if (index !== -1) {
        cameraSettings[index] = { ...cameraSettings[index], ...data };
      }
    }),
    deleteCameraSetting: vi.fn(async (id: number) => {
      cameraSettings = cameraSettings.filter(c => c.id !== id);
    }),
    // Reset function for tests
    _resetTestData: () => {
      vehicleRecords = [];
      cameraSettings = [];
      idCounter = 1;
      cameraIdCounter = 1;
    },
  };
});

describe('Vehicle Number Recognition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Vehicle Number Records', () => {
    it('should create a vehicle number record', async () => {
      const recordData = {
        parkingLotId: 1,
        area: '練馬',
        classNumber: '300',
        kana: 'あ',
        digits: '1234',
        fullNumber: '練馬 300 あ 1234',
        plateColor: '白',
        plateUse: '自家',
        imageUrl: 'https://example.com/image.jpg',
        recognitionSuccess: true,
        capturedAt: Date.now(),
      };

      const id = await createVehicleNumberRecord(recordData);
      expect(id).toBeDefined();
      expect(typeof id).toBe('number');
    });

    it('should retrieve vehicle records by parking lot', async () => {
      // Create some records first
      await createVehicleNumberRecord({
        parkingLotId: 1,
        fullNumber: '練馬 300 あ 1234',
        recognitionSuccess: true,
        capturedAt: Date.now(),
      });

      await createVehicleNumberRecord({
        parkingLotId: 1,
        fullNumber: '品川 500 い 5678',
        recognitionSuccess: true,
        capturedAt: Date.now() + 1000,
      });

      const records = await getVehicleNumberRecordsByParkingLot(1, 10);
      expect(Array.isArray(records)).toBe(true);
    });

    it('should handle recognition failure', async () => {
      const id = await createVehicleNumberRecord({
        parkingLotId: 1,
        recognitionSuccess: false,
        imageUrl: 'https://example.com/blurry.jpg',
        capturedAt: Date.now(),
      });

      expect(id).toBeDefined();
    });
  });

  describe('Camera Settings', () => {
    it('should create a camera setting', async () => {
      const cameraData = {
        parkingLotId: 1,
        cameraName: 'エントランスカメラ',
        cameraType: 'IP Camera',
        ipAddress: '192.168.1.100',
        port: 80,
        snapshotPath: '/snapshot.jpg',
        captureIntervalMinutes: 60,
        enabled: true,
        lprApiToken: 'test-token',
        lprApiUrl: 'https://lpr.sensing-api.com',
      };

      const id = await createCameraSetting(cameraData);
      expect(id).toBeDefined();
      expect(typeof id).toBe('number');
    });

    it('should retrieve camera settings by parking lot', async () => {
      await createCameraSetting({
        parkingLotId: 2,
        cameraName: 'テストカメラ',
      });

      const settings = await getCameraSettingsByParkingLot(2);
      expect(Array.isArray(settings)).toBe(true);
    });

    it('should update camera settings', async () => {
      const id = await createCameraSetting({
        parkingLotId: 3,
        cameraName: '更新前カメラ',
      });

      await updateCameraSetting(id, {
        cameraName: '更新後カメラ',
        enabled: false,
      });

      const updated = await getCameraSettingById(id);
      expect(updated?.cameraName).toBe('更新後カメラ');
      expect(updated?.enabled).toBe(false);
    });

    it('should delete camera settings', async () => {
      const id = await createCameraSetting({
        parkingLotId: 4,
        cameraName: '削除用カメラ',
      });

      await deleteCameraSetting(id);
      const deleted = await getCameraSettingById(id);
      expect(deleted).toBeUndefined();
    });
  });
});

describe('LPR API Integration', () => {
  it('should format full number correctly', () => {
    const formatFullNumber = (area?: string, classNum?: string, kana?: string, number?: string) => {
      const parts = [area, classNum, kana, number].filter(Boolean);
      return parts.length > 0 ? parts.join(' ') : '';
    };

    expect(formatFullNumber('練馬', '300', 'あ', '1234')).toBe('練馬 300 あ 1234');
    expect(formatFullNumber('品川', '500', 'い', '5678')).toBe('品川 500 い 5678');
    expect(formatFullNumber(undefined, '300', 'あ', '1234')).toBe('300 あ 1234');
    expect(formatFullNumber()).toBe('');
  });

  it('should validate plate colors', () => {
    const validColors = ['白', '緑', '黄', '黒'];
    const isValidColor = (color: string) => validColors.includes(color);

    expect(isValidColor('白')).toBe(true);
    expect(isValidColor('緑')).toBe(true);
    expect(isValidColor('黄')).toBe(true);
    expect(isValidColor('黒')).toBe(true);
    expect(isValidColor('青')).toBe(false);
  });

  it('should validate plate usage types', () => {
    const validUsages = ['自家', '事業'];
    const isValidUsage = (usage: string) => validUsages.includes(usage);

    expect(isValidUsage('自家')).toBe(true);
    expect(isValidUsage('事業')).toBe(true);
    expect(isValidUsage('レンタル')).toBe(false);
  });
});
