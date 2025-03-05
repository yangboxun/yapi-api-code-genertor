export interface Category {
    /** ID */
    _id: number;
    /** 分类名称 */
    name: string;
    /** 分类备注 */
    desc: string;
    /** 分类接口列表 */
    list: ApiInterface[];
    /** 创建时间（unix时间戳） */
    add_time: number;
    /** 更新时间（unix时间戳） */
    up_time: number;
    /** 生成的APICode */
    _apiCodes: {
        codes: string;
        tsTypes: string;
    };
}
/** 请求方式 */
export declare enum Method {
    GET = "GET",
    POST = "POST",
    PUT = "PUT",
    DELETE = "DELETE",
    HEAD = "HEAD",
    OPTIONS = "OPTIONS",
    PATCH = "PATCH"
}
/** 是否必需 */
export declare enum Required {
    /** 不必需 */
    false = "0",
    /** 必需 */
    true = "1"
}
/** 请求数据类型 */
export declare enum RequestBodyType {
    /** 查询字符串 */
    query = "query",
    /** 表单 */
    form = "form",
    /** JSON */
    json = "json",
    /** 纯文本 */
    text = "text",
    /** 文件 */
    file = "file",
    /** 原始数据 */
    raw = "raw",
    /** 无请求数据 */
    none = "none"
}
/** 请求路径参数类型 */
export declare enum RequestParamType {
    /** 字符串 */
    string = "string",
    /** 数字 */
    number = "number"
}
/** 请求查询参数类型 */
export declare enum RequestQueryType {
    /** 字符串 */
    string = "string",
    /** 数字 */
    number = "number"
}
/** 请求表单条目类型 */
export declare enum RequestFormItemType {
    /** 纯文本 */
    text = "text",
    /** 文件 */
    file = "file"
}
/** 返回数据类型 */
export declare enum ResponseBodyType {
    /** JSON */
    json = "json",
    /** 纯文本 */
    text = "text",
    /** XML */
    xml = "xml",
    /** 原始数据 */
    raw = "raw"
}
/** 查询字符串数组格式化方式 */
export declare enum QueryStringArrayFormat {
    /** 示例: `a[]=b&a[]=c` */
    'brackets' = "brackets",
    /** 示例: `a[0]=b&a[1]=c` */
    'indices' = "indices",
    /** 示例: `a=b&a=c` */
    'repeat' = "repeat",
    /** 示例: `a=b,c` */
    'comma' = "comma",
    /** 示例: `a=["b","c"]` */
    'json' = "json"
}
export interface ReqBodyForm {
    /** 名称 */
    name: string;
    /** 类型 */
    type: RequestFormItemType;
    /** 备注 */
    desc: string;
    /** 示例 */
    example: string;
    /** 是否必需 */
    required: Required;
}
export interface ReqQuery {
    /** 名称 */
    name: string;
    /** 备注 */
    desc: string;
    /** 示例 */
    example: string;
    /** 是否必需 */
    required: Required;
    /** 类型（YApi-X） */
    type?: RequestQueryType;
}
export interface ReqParams {
    /** 名称 */
    name: string;
    /** 备注 */
    desc: string;
    /** 示例 */
    example: string;
    /** 类型（YApi-X） */
    type?: RequestParamType;
    /** 是否必需 */
    required: Required;
}
export interface ApiInterface {
    /** 接口 ID */
    _id: number;
    /** 接口名称 */
    title: string;
    /** 状态 */
    status: string;
    /** 接口备注 */
    markdown: string;
    /** 请求路径 */
    path: string;
    /** 请求方式，HEAD、OPTIONS 处理与 GET 相似，其余处理与 POST 相似 */
    method: Method;
    /** 所属项目 id */
    project_id: number;
    /** 所属分类 id */
    catid: number;
    /** 标签列表 */
    tag: string[];
    /** 请求头 */
    req_headers: Array<{
        /** 名称 */
        name: string;
        /** 值 */
        value: string;
        /** 备注 */
        desc: string;
        /** 示例 */
        example: string;
        /** 是否必需 */
        required: Required;
    }>;
    /** 路径参数 */
    req_params: Array<ReqParams>;
    /** 仅 GET：请求串 */
    req_query: Array<ReqQuery>;
    /** 仅 POST：请求内容类型。为 text, file, raw 时不必特殊处理。 */
    req_body_type: RequestBodyType;
    /** `req_body_type = json` 时是否为 json schema */
    req_body_is_json_schema: boolean;
    /** `req_body_type = form` 时的请求内容 */
    req_body_form: Array<ReqBodyForm>;
    /** `req_body_type = json` 时的请求内容 */
    req_body_other: string;
    /** 返回数据类型 */
    res_body_type: ResponseBodyType;
    /** `res_body_type = json` 时是否为 json schema */
    res_body_is_json_schema: boolean;
    /** 返回数据 */
    res_body: string;
    /** 创建时间（unix时间戳） */
    add_time: number;
    /** 更新时间（unix时间戳） */
    up_time: number;
    /** 创建人 ID */
    uid: number;
    [key: string]: any;
}
