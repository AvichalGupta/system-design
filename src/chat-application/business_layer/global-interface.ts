import { HttpStatusCode } from "axios";

export interface IStandardSuccessResponse {
    statusCode: HttpStatusCode;
    message: string;
    data: object;
}

export interface IStandardErrorResponse {
    statusCode: HttpStatusCode;
    message: string;
    error: object;
}

export type IGenericControllerResponse = IStandardSuccessResponse | IStandardErrorResponse;