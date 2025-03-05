'use strict';

var axios = require('axios');
var ejs = require('ejs');
var jsonSchemaToTypescript = require('json-schema-to-typescript');
var prettier = require('prettier');

// Regexps involved with splitting words in various case formats.
const SPLIT_LOWER_UPPER_RE = /([\p{Ll}\d])(\p{Lu})/gu;
const SPLIT_UPPER_UPPER_RE = /(\p{Lu})([\p{Lu}][\p{Ll}])/gu;
// Used to iterate over the initial split result and separate numbers.
const SPLIT_SEPARATE_NUMBER_RE = /(\d)\p{Ll}|(\p{L})\d/u;
// Regexp involved with stripping non-word characters from the result.
const DEFAULT_STRIP_REGEXP = /[^\p{L}\d]+/giu;
// The replacement value for splits.
const SPLIT_REPLACE_VALUE = "$1\0$2";
// The default characters to keep after transforming case.
const DEFAULT_PREFIX_SUFFIX_CHARACTERS = "";
/**
 * Split any cased input strings into an array of words.
 */
function split(value) {
    let result = value.trim();
    result = result
        .replace(SPLIT_LOWER_UPPER_RE, SPLIT_REPLACE_VALUE)
        .replace(SPLIT_UPPER_UPPER_RE, SPLIT_REPLACE_VALUE);
    result = result.replace(DEFAULT_STRIP_REGEXP, "\0");
    let start = 0;
    let end = result.length;
    // Trim the delimiter from around the output string.
    while (result.charAt(start) === "\0")
        start++;
    if (start === end)
        return [];
    while (result.charAt(end - 1) === "\0")
        end--;
    return result.slice(start, end).split(/\0/g);
}
/**
 * Split the input string into an array of words, separating numbers.
 */
function splitSeparateNumbers(value) {
    const words = split(value);
    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const match = SPLIT_SEPARATE_NUMBER_RE.exec(word);
        if (match) {
            const offset = match.index + (match[1] ?? match[2]).length;
            words.splice(i, 1, word.slice(0, offset), word.slice(offset));
        }
    }
    return words;
}
/**
 * Convert a string to pascal case (`FooBar`).
 */
function pascalCase(input, options) {
    const [prefix, words, suffix] = splitPrefixSuffix(input, options);
    const lower = lowerFactory(options?.locale);
    const upper = upperFactory(options?.locale);
    const transform = pascalCaseTransformFactory(lower, upper);
    return prefix + words.map(transform).join("") + suffix;
}
function lowerFactory(locale) {
    return (input) => input.toLocaleLowerCase(locale);
}
function upperFactory(locale) {
    return (input) => input.toLocaleUpperCase(locale);
}
function pascalCaseTransformFactory(lower, upper) {
    return (word, index) => {
        const char0 = word[0];
        const initial = index > 0 && char0 >= "0" && char0 <= "9" ? "_" + char0 : upper(char0);
        return initial + lower(word.slice(1));
    };
}
function splitPrefixSuffix(input, options = {}) {
    const splitFn = options.split ?? (options.separateNumbers ? splitSeparateNumbers : split);
    const prefixCharacters = options.prefixCharacters ?? DEFAULT_PREFIX_SUFFIX_CHARACTERS;
    const suffixCharacters = options.suffixCharacters ?? DEFAULT_PREFIX_SUFFIX_CHARACTERS;
    let prefixIndex = 0;
    let suffixIndex = input.length;
    while (prefixIndex < input.length) {
        const char = input.charAt(prefixIndex);
        if (!prefixCharacters.includes(char))
            break;
        prefixIndex++;
    }
    while (suffixIndex > prefixIndex) {
        const index = suffixIndex - 1;
        const char = input.charAt(index);
        if (!suffixCharacters.includes(char))
            break;
        suffixIndex = index;
    }
    return [
        input.slice(0, prefixIndex),
        splitFn(input.slice(prefixIndex, suffixIndex)),
        input.slice(suffixIndex),
    ];
}

const isGetMethod = (method) => {
    return (method === 'GET' || method === 'OPTIONS' || method === 'HEAD');
};
const isPostMethod = (method) => {
    return !isGetMethod(method);
};
// JSON Schema 转 TypeScript 类型
async function jsonSchemaToTypes(schema, typeName) {
    if (!schema)
        return '';
    try {
        const parsedSchema = JSON.parse(schema);
        // 去除 title 和 id，防止 json-schema-to-typescript 提取它们作为接口名
        delete parsedSchema.title;
        delete parsedSchema.id;
        // 忽略数组长度限制
        delete parsedSchema.minItems;
        delete parsedSchema.maxItems;
        if (parsedSchema.type === 'object') {
            // 将 additionalProperties 设为 false
            parsedSchema.additionalProperties = false;
        }
        // 删除 default，防止 json-schema-to-typescript 根据它推测类型
        delete parsedSchema.default;
        const fields = await jsonSchemaToTypescript.compile(parsedSchema, typeName, { bannerComment: '', });
        return fields;
    }
    catch (error) {
        console.warn(`无法解析 JSON Schema: ${schema}`);
        return '';
    }
}
// 格式化生成的代码
function formatCode(code) {
    const options = {
        parser: 'typescript',
        singleQuote: true,
        semi: true,
    };
    return prettier.format(code, options);
}
const convertToJsonSchema = (reqBodyForm) => {
    const schema = {
        type: 'object',
        properties: {},
        required: []
    };
    reqBodyForm.forEach(field => {
        // 默认字段类型映射
        let fieldType;
        // 根据不同的字段类型映射到 JSON Schema 的类型
        switch (field.type) {
            case 'text':
                fieldType = 'string';
                break;
            case 'file':
                fieldType = 'any';
                break;
            default:
                fieldType = 'string';
        }
        // 构建属性对象
        const fieldSchema = {
            type: fieldType,
            description: field.desc || '',
        };
        // 如果该字段是必填项，则添加到 required 数组中
        if (field.required === '1') {
            (schema?.required).push(field.name);
        }
        // 将字段添加到 JSON Schema 的 properties 中
        if (schema.properties)
            schema.properties[field.name] = fieldSchema;
    });
    return schema;
};

class ApiGenerator {
    constructor(opts) {
        this.opts = opts;
    }
    async fetchApiList() {
        try {
            const { data } = await axios.get(`${this.opts.baseUrl}/api/plugin/export`, {
                params: {
                    type: 'json',
                    status: 'all',
                    isWiki: 'false',
                    token: this.opts.token
                },
            });
            return data || [];
        }
        catch (error) {
            console.error('获取接口数据时出错:', error);
            throw error;
        }
    }
    // 生成 API 方法代码
    async generateApiMethods(apiList) {
        let apiMethods = [], tsTypes = [];
        let defaultApiTemplate = `
      /**
      * <%= title %>
      * @method <%= method %>
      * @path <%= path %>
      */
      export async function <%= methodName %>_<%= method.toLowerCase() %>(params){
        return request({
          url: '<%= path %>',
          method: '<%= method.toLowerCase() %>',
          data: params
        })
      }
    `;
        if (this.opts.targetLanguage === 'typescript') {
            defaultApiTemplate = `
        /**
        * <%= title %>
        * @method <%= method %>
        * @path <%= path %>
        */
        <%= requestTypeDef %>
        <%= responseTypeDef %>
        export async function <%= methodName %>_<%= method.toLowerCase() %>(params:<%= requestType %>){
          return request<<%= responseType %>>({
            url: '<%= path %>',
            method: '<%= method.toLowerCase() %>',
            data: params
          })
        }
      `;
        }
        for (let api of apiList) {
            let requestJsonSchema;
            const { path, method, title, req_body_other, res_body, req_body_type, req_body_form, req_query, req_params } = api;
            const methodName = path
                .replace(/[^a-zA-Z0-9]/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_|_$/g, '');
            if (isPostMethod(method)) {
                switch (req_body_type) {
                    case 'form':
                        requestJsonSchema = convertToJsonSchema(req_body_form);
                        break;
                    case 'json':
                        if (req_body_other) {
                            requestJsonSchema = JSON.parse(req_body_other);
                            if (requestJsonSchema.type === 'object') {
                                // 将 additionalProperties 设为 false
                                requestJsonSchema.additionalProperties = false;
                            }
                        }
                        break;
                }
            }
            // 处理查询数据
            if (req_query && req_query.length > 0) {
                const queryJsonSchema = convertToJsonSchema(req_query);
                if (requestJsonSchema) {
                    requestJsonSchema.properties = {
                        ...requestJsonSchema.properties,
                        ...queryJsonSchema.properties,
                    };
                    requestJsonSchema.required = [
                        ...(Array.isArray(requestJsonSchema.required) ? requestJsonSchema.required : []),
                        ...(Array.isArray(queryJsonSchema.required)
                            ? queryJsonSchema.required
                            : []),
                    ];
                }
                else {
                    requestJsonSchema = queryJsonSchema;
                }
            }
            // 处理路径参数
            if (req_params && req_params.length) {
                const paramsJsonSchema = convertToJsonSchema(req_params);
                if (requestJsonSchema) {
                    requestJsonSchema.properties = {
                        ...requestJsonSchema.properties,
                        ...paramsJsonSchema.properties,
                    };
                    requestJsonSchema.required = [
                        ...(Array.isArray(requestJsonSchema.required) ? requestJsonSchema.required : []),
                        ...(Array.isArray(paramsJsonSchema.required)
                            ? paramsJsonSchema.required
                            : []),
                    ];
                }
                else {
                    requestJsonSchema = paramsJsonSchema;
                }
            }
            const requestType = pascalCase(`Request_${methodName}`);
            const responseType = pascalCase(`Response_${methodName}`);
            const requestTypeDef = await jsonSchemaToTypes(JSON.stringify(requestJsonSchema), requestType);
            const responseTypeDef = await jsonSchemaToTypes(res_body, responseType);
            const apiCode = ejs.render(this.opts?.apiTemplate || defaultApiTemplate, {
                title,
                method,
                path,
                methodName,
                requestTypeDef,
                responseTypeDef,
                requestType,
                responseType,
            });
            const tsTypesCode = `
        ${requestTypeDef}
        ${responseTypeDef}
      `;
            apiMethods.push(apiCode);
            if (this.opts.targetLanguage === 'typescript') {
                tsTypes.push(tsTypesCode);
            }
        }
        const apiFormatCode = await formatCode(apiMethods.join('\n'));
        const typesFormatCode = await formatCode(tsTypes.join('\n'));
        return {
            codes: apiFormatCode,
            tsTypes: typesFormatCode
        };
    }
    async generateCode() {
        const apiList = await this.fetchApiList();
        if (apiList.length === 0) {
            console.error('未找到 API 数据');
            return;
        }
        for (let apis of apiList) {
            apis._apiCodes = await this.generateApiMethods(apis.list);
        }
        return apiList;
    }
}

exports.ApiGenerator = ApiGenerator;
