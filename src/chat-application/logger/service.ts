import { HttpStatusCode } from "axios";

export interface BaseLog {
    methodName: string;
    className: string;
    message: string;
    data?: Record<any, any>;
}

export interface ErrorLog extends BaseLog {
    error?: any;
    statusCode?: HttpStatusCode;
}

export class Logger {
    info(payload: BaseLog): void {
        console.log(
            `
                Level: info,
                Method: ${payload.message},
                Class: ${payload.className},
                Message: ${payload.message},
                AdditionalInfo: ${payload.data ?? {}},
            `
        )
    }

    warn(payload: BaseLog): void {
        console.warn(
            `
                Level: warn,
                Method: ${payload.message},
                Class: ${payload.className},
                Message: ${payload.message},
                AdditionalInfo: ${payload.data ?? {}},
            `
        )
    }

    error(payload: ErrorLog): void {
        console.error(
            `
                Level: error,
                Method: ${payload.message},
                Class: ${payload.className},
                Message: ${payload.message},
                ErrorMessage: ${payload.error.message},
                AdditionalInfo: ${payload.data ?? {}},
                ErrorStack: ${payload.error?.stack ?? ''},
                StatusCode: ${
                    payload?.statusCode ??
                    payload.error?.response?.status ?? 
                    payload.error?.response?.statusCode ?? 
                    payload.error?.response?.status_code ?? 
                    HttpStatusCode.BadRequest
                }
            `
        )
    }
}