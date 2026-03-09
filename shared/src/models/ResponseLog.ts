export interface ResponseLog {
    status: number;
    headers: Record<string, string | number | string[]>;
    body: string;
}