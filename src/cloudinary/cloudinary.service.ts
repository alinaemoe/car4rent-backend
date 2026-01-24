import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import toStream from 'buffer-to-stream';

@Injectable()
export class CloudinaryService {
  uploadImage(file: Express.Multer.File): Promise<string> {
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        { folder: 'car4rent_cars' },
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
}
