/**
 * Integration with the MBG Flask API (mbg_api/server.py)
 * Base URL: http://localhost:5000 (or MBG_API_URL env var)
 */

export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width?: number;
  height?: number;
  area?: number;
}

export interface DetectionResult {
  class: string;
  class_id: number;
  confidence: number;
  bbox: BoundingBox;
}

export interface ApiDetectResponse {
  success: boolean;
  timestamp: string | null;
  image_info: {
    width: number;
    height: number;
    mode: string;
  };
  foodtray: {
    detected: boolean;
    count: number;
    detections: DetectionResult[];
  };
  menu: {
    detected: boolean;
    count: number;
    detections: DetectionResult[];
  };
  summary: {
    total_detections: number;
    foodtray_types: string[];
    food_items: string[];
  };
  error?: string;
}

function getApiUrl(): string {
  return process.env.MBG_API_URL ?? import.meta.env?.MBG_API_URL ?? 'http://localhost:5000';
}

/**
 * Call /api/detect — returns JSON with bounding boxes and class names.
 */
export async function detectFood(imageFile: File | Blob, filename = 'image.jpg'): Promise<ApiDetectResponse> {
  const formData = new FormData();
  formData.append('image', imageFile, filename);

  const baseUrl = getApiUrl();
  const response = await fetch(`${baseUrl}/api/detect`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error ${response.status}: ${errorText}`);
  }

  const json = await response.json();
  return json as ApiDetectResponse;
}

/**
 * Call /api/detect/preview — returns annotated JPEG image as Blob.
 */
export async function detectFoodPreview(imageFile: File | Blob, filename = 'image.jpg'): Promise<Blob> {
  const formData = new FormData();
  formData.append('image', imageFile, filename);

  const baseUrl = getApiUrl();
  const response = await fetch(`${baseUrl}/api/detect/preview`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Preview API error ${response.status}`);
  }

  return response.blob();
}

/**
 * Check API health.
 */
export async function checkApiHealth(): Promise<{ healthy: boolean; details: unknown }> {
  try {
    const baseUrl = getApiUrl();
    const response = await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(5000) });
    const details = await response.json();
    return { healthy: response.ok, details };
  } catch {
    return { healthy: false, details: null };
  }
}
