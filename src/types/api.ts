export interface APIResponseWrapper {
    data?: {
        success: boolean;
        data: any;
    };
    error?: boolean;
    message?: string;
}

export interface HealthCheckResponse {
    status: 'ok' | 'error';
    timestamp: string;
}

export interface PaginationParams {
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
}

export interface APIErrorResponse {
    error: true;
    message: string;
    code?: string;
    details?: any;
}