import { Response} from 'express';

function stringify(data: unknown): string {
    if (typeof data === 'string') {
        return data;
    }
    try {
        return JSON.stringify(data);
    } catch {
        try {
            return String(data);
        } catch {
            
        }
    }

    return '[unstringifiable data]';
}

export class ResponseWrapper {
    private responseObj: Response;
    private responseBody: string;

    constructor(response: Response) {
        this.responseObj = response;
        this.responseBody = '';
    }

    public response(): Response {
        return this.responseObj;
    }

    public status(code: number): ResponseWrapper {
        this.responseObj.status(code);
        return this;
    }

    public json(data: unknown): ResponseWrapper {
        this.responseObj.json(data);
        this.responseBody = stringify(data);
        return this;
    }

    public setHeader(name: string, value: string | number | readonly string[]): ResponseWrapper {
        this.responseObj.setHeader(name, value as any);
        return this;
    }

    public responseBodyString(): string {
        return this.responseBody;
    }

    public send(data: unknown): ResponseWrapper {
        this.responseObj.send(data);
        this.responseBody = stringify(data);
        return this;
    }
}