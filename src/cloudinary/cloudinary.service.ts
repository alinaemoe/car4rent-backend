import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import toStream from 'buffer-to-stream';

@Injectable()
export class CloudinaryService {
  uploadImage(
    file: Express.Multer.File,
    folder: string = 'car4rent_cars',
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        { folder: folder },
        (error, result) => {
          if (error instanceof Error) {
            reject(error);
            return;
          }

          if (!result || !result.secure_url) {
            reject(new Error('Cloudinary upload failed'));
            return;
          }

          resolve(result.secure_url);
        },
      );

      toStream(file.buffer).pipe(upload);
    });
  }

  async deleteImage(publicId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) {
          // eslint рекомендует reject(new Error(...)), чтобы всегда передавать Error
          reject(new Error(error.message || 'Unknown error'));
          return;
        }
        resolve(result);
      });
    });
  }
}
