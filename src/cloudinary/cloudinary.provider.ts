import { v2 as cloudinary } from 'cloudinary';

export const CloudinaryProvider = {
  provide: 'CLOUDINARY',
  useFactory: () => {
    return cloudinary.config({
      cloud_name: 'dgtor0hhj', // Замени на свои данные из Dashboard
      api_key: 'REMOVED',
      api_secret: 'REMOVED',
    });
  },
};
