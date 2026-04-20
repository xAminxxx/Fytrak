import * as ImageManipulator from "expo-image-manipulator";
import { appEnv } from "../config/env";

export type UploadResult = {
  secureUrl: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
};

type CloudinaryUploadResponse = {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
};

export const uploadChatImage = async (uri: string): Promise<UploadResult> => {
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1280 } }],
    {
      compress: 0.75,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: false,
    }
  );

  const uploadEndpoint = `https://api.cloudinary.com/v1_1/${appEnv.cloudinary.cloudName}/image/upload`;

  const formData = new FormData();
  formData.append("upload_preset", appEnv.cloudinary.uploadPreset);
  formData.append("folder", "fytrak/chat");
  formData.append("file", {
    uri: manipulated.uri,
    type: "image/jpeg",
    name: `chat-${Date.now()}.jpg`,
  } as unknown as Blob);

  const response = await fetch(uploadEndpoint, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Cloudinary upload failed with status ${response.status}`);
  }

  const payload = (await response.json()) as CloudinaryUploadResponse;

  return {
    secureUrl: payload.secure_url,
    publicId: payload.public_id,
    width: payload.width,
    height: payload.height,
    format: payload.format,
    bytes: payload.bytes,
  };
};

export const uploadProgressPhoto = async (uri: string): Promise<UploadResult> => {
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1440 } }], // High res for progress detail
    {
      compress: 0.8,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: false,
    }
  );

  const uploadEndpoint = `https://api.cloudinary.com/v1_1/${appEnv.cloudinary.cloudName}/image/upload`;

  const formData = new FormData();
  formData.append("upload_preset", appEnv.cloudinary.uploadPreset);
  formData.append("folder", "fytrak/progress");
  formData.append("file", {
    uri: manipulated.uri,
    type: "image/jpeg",
    name: `progress-${Date.now()}.jpg`,
  } as unknown as Blob);

  const response = await fetch(uploadEndpoint, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Cloudinary upload failed with status ${response.status}`);
  }

  const payload = (await response.json()) as CloudinaryUploadResponse;

  return {
    secureUrl: payload.secure_url,
    publicId: payload.public_id,
    width: payload.width,
    height: payload.height,
    format: payload.format,
    bytes: payload.bytes,
  };
};

export const uploadMealPhoto = async (uri: string): Promise<UploadResult> => {
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 800 } }],
    {
      compress: 0.7,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: false,
    }
  );

  const uploadEndpoint = `https://api.cloudinary.com/v1_1/${appEnv.cloudinary.cloudName}/image/upload`;

  const formData = new FormData();
  formData.append("upload_preset", appEnv.cloudinary.uploadPreset);
  formData.append("folder", "fytrak/meals");
  formData.append("file", {
    uri: manipulated.uri,
    type: "image/jpeg",
    name: `meal-${Date.now()}.jpg`,
  } as unknown as Blob);

  const response = await fetch(uploadEndpoint, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Cloudinary upload failed with status ${response.status}`);
  }

  const payload = (await response.json()) as CloudinaryUploadResponse;

  return {
    secureUrl: payload.secure_url,
    publicId: payload.public_id,
    width: payload.width,
    height: payload.height,
    format: payload.format,
    bytes: payload.bytes,
  };
};
