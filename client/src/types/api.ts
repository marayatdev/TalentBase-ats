export interface ApiSuccess<T> {
  success: true;
  status: number;
  message: string;
  data: T;
  timestamp: string;
}

export interface ApiError {
  success: false;
  status: number;
  message: string;
  errors?: Record<string, string[] | string>;
  timestamp: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ListParams {
  page?: number;
  page_size?: number;
  search?: string;
  [key: string]: string | number | undefined;
}
