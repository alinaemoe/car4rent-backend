import { Car, CarStatus } from '../../entities/car.entity';
export interface GetCatalogDto {
  page?: number;
  limit?: number;
  status?: CarStatus;
  sort_by?: string;
  ids?: string | number[]; // "1,2,3" или [1,2,3]

  // Массивы фильтров (строки, разделенные запятой от фронта, или готовые массивы)
  brands?: string | string[];
  body_types?: string | string[];
  transmissions?: string | string[];
  fuel_types?: string | string[];
  drive_types?: string | string[];
  feature_ids?: string | number[]; // ID доп. опций
  colors?: string | string[];

  // Диапазоны (Range Sliders)
  min_price?: number;
  max_price?: number;
  min_year?: number;
  max_year?: number;
  min_mileage?: number;
  max_mileage?: number;
  min_power?: number;
  max_power?: number;
  min_consumption?: number;
  max_consumption?: number;
  min_rating?: number; // 4.0, 4.5 и т.д.

  // Даты аренды
  start_date?: string; // ISO string (YYYY-MM-DD)
  end_date?: string; // ISO string
}
