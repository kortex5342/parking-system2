/**
 * LPR (License Plate Recognition) API連携モジュール
 * https://lpr.sensing-api.com/ のAPIを利用してナンバープレート認識を行う
 */

import { storagePut } from "./storage";
import { createVehicleNumberRecord, updateCameraSetting } from "./db";

// LPR APIのベースURL
const LPR_API_BASE_URL = "https://lpr.sensing-api.com";

// LPR APIレスポンスの型定義
interface LPRResponse {
  result: {
    area?: string;        // 地域名（例：練馬）
    class?: string;       // 分類番号（例：300）
    kana?: string;        // かな文字（例：あ）
    number?: string;      // 一連番号（例：1234）
    type?: string;        // 種類（大板/中板/外交/自衛）
    use?: string;         // 用途（自家/事業）
    color?: string;       // 色（白/緑/黄/黒）
  };
  success: boolean;
  message?: string;
}

/**
 * 画像をLPR APIに送信してナンバープレートを認識する
 * @param imageBuffer 画像データ（Buffer）
 * @param apiToken LPR APIトークン
 * @param apiUrl LPR APIエンドポイント（オプション）
 * @returns 認識結果
 */
export async function recognizeLicensePlate(
  imageBuffer: Buffer,
  apiToken: string,
  apiUrl: string = LPR_API_BASE_URL
): Promise<LPRResponse> {
  try {
    // multipart/form-dataで画像を送信
    const formData = new FormData();
    const uint8Array = new Uint8Array(imageBuffer);
    const blob = new Blob([uint8Array], { type: "image/jpeg" });
    formData.append("image", blob, "capture.jpg");

    const response = await fetch(`${apiUrl}/api/v1/recognize`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[LPR] API error:", response.status, errorText);
      return {
        result: {},
        success: false,
        message: `API error: ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      result: data.result || {},
      success: data.success ?? true,
      message: data.message,
    };
  } catch (error: any) {
    console.error("[LPR] Recognition failed:", error);
    return {
      result: {},
      success: false,
      message: error.message || "Recognition failed",
    };
  }
}

/**
 * カメラから画像を取得する
 * @param ipAddress カメラのIPアドレス
 * @param port ポート番号
 * @param snapshotPath スナップショットパス
 * @param username 認証ユーザー名（オプション）
 * @param password 認証パスワード（オプション）
 * @returns 画像データ（Buffer）
 */
export async function captureImageFromCamera(
  ipAddress: string,
  port: number = 80,
  snapshotPath: string = "/snapshot.jpg",
  username?: string,
  password?: string
): Promise<Buffer | null> {
  try {
    const url = `http://${ipAddress}:${port}${snapshotPath}`;
    const headers: Record<string, string> = {};

    // Basic認証が必要な場合
    if (username && password) {
      const auth = Buffer.from(`${username}:${password}`).toString("base64");
      headers["Authorization"] = `Basic ${auth}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      console.error("[Camera] Failed to capture image:", response.status);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error: any) {
    console.error("[Camera] Capture failed:", error);
    return null;
  }
}

/**
 * 車両ナンバー認識の完全なフローを実行
 * カメラから画像取得 → S3に保存 → LPR APIで認識 → DBに保存
 */
export async function processVehicleRecognition(
  cameraId: number,
  parkingLotId: number,
  ipAddress: string,
  port: number,
  snapshotPath: string,
  username: string | undefined,
  password: string | undefined,
  lprApiToken: string,
  lprApiUrl?: string
): Promise<{ success: boolean; recordId?: number; error?: string }> {
  try {
    // 1. カメラから画像を取得
    const imageBuffer = await captureImageFromCamera(
      ipAddress,
      port,
      snapshotPath,
      username,
      password
    );

    if (!imageBuffer) {
      return { success: false, error: "Failed to capture image from camera" };
    }

    // 2. 画像をS3に保存
    const timestamp = Date.now();
    const fileKey = `vehicle-captures/${parkingLotId}/${timestamp}.jpg`;
    const { url: imageUrl } = await storagePut(fileKey, imageBuffer, "image/jpeg");

    // 3. LPR APIで認識
    const lprResult = await recognizeLicensePlate(
      imageBuffer,
      lprApiToken,
      lprApiUrl
    );

    // 4. フルナンバーを生成
    let fullNumber = "";
    if (lprResult.success && lprResult.result) {
      const { area, class: classNum, kana, number } = lprResult.result;
      if (area || classNum || kana || number) {
        fullNumber = [area, classNum, kana, number].filter(Boolean).join(" ");
      }
    }

    // 5. DBに保存
    const recordId = await createVehicleNumberRecord({
      parkingLotId,
      area: lprResult.result.area,
      classNumber: lprResult.result.class,
      kana: lprResult.result.kana,
      digits: lprResult.result.number,
      fullNumber: fullNumber || undefined,
      plateType: lprResult.result.type,
      plateUse: lprResult.result.use,
      plateColor: lprResult.result.color,
      imageUrl,
      recognitionSuccess: lprResult.success,
      rawResponse: JSON.stringify(lprResult),
      capturedAt: timestamp,
    });

    // 6. カメラの最終撮影日時を更新
    await updateCameraSetting(cameraId, { lastCaptureAt: timestamp });

    return { success: true, recordId };
  } catch (error: any) {
    console.error("[VehicleRecognition] Process failed:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 外部から画像を受信してナンバー認識を行う（Webhook用）
 * カメラがHTTP POSTで画像を送信してくる場合に使用
 */
export async function processExternalImage(
  parkingLotId: number,
  imageBuffer: Buffer,
  lprApiToken: string,
  lprApiUrl?: string
): Promise<{ success: boolean; recordId?: number; error?: string }> {
  try {
    // 1. 画像をS3に保存
    const timestamp = Date.now();
    const fileKey = `vehicle-captures/${parkingLotId}/${timestamp}.jpg`;
    const { url: imageUrl } = await storagePut(fileKey, imageBuffer, "image/jpeg");

    // 2. LPR APIで認識
    const lprResult = await recognizeLicensePlate(
      imageBuffer,
      lprApiToken,
      lprApiUrl
    );

    // 3. フルナンバーを生成
    let fullNumber = "";
    if (lprResult.success && lprResult.result) {
      const { area, class: classNum, kana, number } = lprResult.result;
      if (area || classNum || kana || number) {
        fullNumber = [area, classNum, kana, number].filter(Boolean).join(" ");
      }
    }

    // 4. DBに保存
    const recordId = await createVehicleNumberRecord({
      parkingLotId,
      area: lprResult.result.area,
      classNumber: lprResult.result.class,
      kana: lprResult.result.kana,
      digits: lprResult.result.number,
      fullNumber: fullNumber || undefined,
      plateType: lprResult.result.type,
      plateUse: lprResult.result.use,
      plateColor: lprResult.result.color,
      imageUrl,
      recognitionSuccess: lprResult.success,
      rawResponse: JSON.stringify(lprResult),
      capturedAt: timestamp,
    });

    return { success: true, recordId };
  } catch (error: any) {
    console.error("[VehicleRecognition] External image process failed:", error);
    return { success: false, error: error.message };
  }
}
