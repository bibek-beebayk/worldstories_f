import { useCallback } from "react";
import { API_BASE_URL, getAccessToken } from "@/api/client";

export interface BlogImageUploadResult {
  id: number;
  url: string;
  width: number;
  height: number;
  size_bytes: number;
}

export interface BlogImageUploadProgress {
  percent: number;
  loaded: number;
  total: number;
}

export function uploadBlogImageFile(
  file: File,
  onProgress?: (progress: BlogImageUploadProgress) => void,
): Promise<BlogImageUploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}/admin/blog-images/`, true);
    xhr.setRequestHeader("Accept", "application/json");
    const token = getAccessToken();
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    xhr.upload.onprogress = (event) => {
      if (!onProgress) return;
      const total = event.lengthComputable && event.total > 0 ? event.total : file.size || 1;
      const loaded = Math.min(event.loaded, total);
      const percent = Math.min(99, Math.max(0, Math.round((loaded / total) * 100)));
      onProgress({ percent, loaded, total });
    };

    xhr.onload = () => {
      let data: Record<string, unknown> | null = null;
      try {
        data = xhr.responseText ? (JSON.parse(xhr.responseText) as Record<string, unknown>) : null;
      } catch {
        data = null;
      }

      if (xhr.status >= 200 && xhr.status < 300 && data && typeof data.url === "string") {
        onProgress?.({ percent: 100, loaded: file.size, total: file.size });
        resolve({
          id: Number(data.id ?? 0),
          url: data.url,
          width: Number(data.width ?? 0),
          height: Number(data.height ?? 0),
          size_bytes: Number(data.size_bytes ?? file.size),
        });
        return;
      }

      const serverMsg =
        (typeof data?.error === "string" && data.error) ||
        (typeof data?.detail === "string" && data.detail) ||
        `Upload failed (${xhr.status || "network error"}).`;
      reject(new Error(serverMsg));
    };

    xhr.onerror = () => {
      reject(new Error("Network error while uploading image. Please try again."));
    };

    xhr.onabort = () => {
      reject(new Error("Upload was cancelled."));
    };

    const formData = new FormData();
    formData.append("image", file);
    xhr.send(formData);
  });
}

export function useBlogImageUpload() {
  const upload = useCallback(
    (file: File, onProgress?: (progress: BlogImageUploadProgress) => void) => uploadBlogImageFile(file, onProgress),
    [],
  );
  return { upload };
}
