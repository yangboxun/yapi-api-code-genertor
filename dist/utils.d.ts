import { JSONSchema4 } from 'json-schema';
import { ReqBodyForm, ReqQuery, ReqParams } from './types';
export declare const isGetMethod: (method: string) => method is "GET" | "OPTIONS" | "HEAD";
export declare const isPostMethod: (method: string) => boolean;
export declare function jsonSchemaToTypes(schema: string | undefined, typeName: string): Promise<string>;
export declare function formatCode(code: string): Promise<string>;
export declare const convertToJsonSchema: (reqBodyForm: ReqBodyForm[] | ReqQuery[] | ReqParams[]) => JSONSchema4;
