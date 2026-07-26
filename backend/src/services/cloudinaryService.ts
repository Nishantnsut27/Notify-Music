import { cloudinary } from '../config/config.js';

export interface CloudinaryUploadResult {
  url: string;
  public_id: string;
}

export class CloudinaryService {
  /**
   * Upload buffer directly to Cloudinary using upload_stream
   */
  public static async uploadAvatarBuffer(
    fileBuffer: Buffer,
    folder = 'notify_avatars'
  ): Promise<CloudinaryUploadResult> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error || !result) {
            console.error('❌ Cloudinary Upload Error:', error);
            return reject(new Error(error?.message || 'Failed to upload avatar image to Cloudinary.'));
          }

          resolve({
            url: result.secure_url,
            public_id: result.public_id,
          });
        }
      );

      uploadStream.end(fileBuffer);
    });
  }

  /**
   * Delete asset from Cloudinary by public ID
   */
  public static async deleteAvatar(publicId: string): Promise<void> {
    if (!publicId) return;
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      console.log(`🗑️ [Cloudinary] Deleted avatar asset: ${publicId} (result: ${result.result})`);
    } catch (error) {
      console.error(`⚠️ [Cloudinary] Failed to delete avatar asset ${publicId}:`, error);
    }
  }
}
