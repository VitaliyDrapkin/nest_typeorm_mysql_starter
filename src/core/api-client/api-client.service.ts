import { Injectable } from '@nestjs/common';
import axios, { AxiosRequestConfig, AxiosResponse, Method } from 'axios';
import { LogService } from '../logger/log-service';

export interface ApiClientOptions {
  baseURL?: string;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

@Injectable()
export class ApiClientService {
  private readonly defaultTimeout = 10000;
  private readonly defaultRetries = 0;
  private readonly options: ApiClientOptions;

  constructor(private readonly logger: LogService) {
    this.logger.setContext(ApiClientService.name);
    this.options = {};
  }

  /**
   * Configure API client options
   */
  configure(options: ApiClientOptions): void {
    Object.assign(this.options, options);
  }

  private async executeRequest<T>(
    config: AxiosRequestConfig,
    retriesLeft: number,
  ): Promise<AxiosResponse<T>> {
    const startTime = Date.now();

    try {
      const response = await axios.request<T>({
        baseURL: this.options.baseURL,
        timeout: this.options.timeout ?? this.defaultTimeout,
        headers: { ...this.options.headers, ...config.headers },
        ...config,
      });

      this.logger.log(`HTTP request completed`, {
        method: config.method?.toUpperCase() ?? 'GET',
        url: config.url,
        duration: `${Date.now() - startTime}ms`,
      });

      return response;
    } catch (error: any) {
      this.logger.error(`HTTP request failed`, {
        method: config.method?.toUpperCase() ?? 'GET',
        url: config.url,
        error: error.message,
      });

      if (retriesLeft > 0) {
        this.logger.log(`Retrying HTTP request`, { attemptsLeft: retriesLeft });
        return this.executeRequest<T>(config, retriesLeft - 1);
      }

      throw error;
    }
  }

  async request<T = any>(
    config: AxiosRequestConfig,
    options?: Partial<ApiClientOptions>,
  ): Promise<T> {
    const retries =
      options?.retries ?? this.options.retries ?? this.defaultRetries;
    const response = await this.executeRequest<T>(config, retries);
    return response.data;
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig) {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.request<T>({ ...config, method: 'PATCH', url, data });
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig) {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }
}
