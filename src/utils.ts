import { compile } from 'json-schema-to-typescript';
import { JSONSchema4, JSONSchema4TypeName } from 'json-schema'
import prettier from 'prettier';
import {
  ReqBodyForm,
  ReqQuery,
  ReqParams
} from './types'


export const isGetMethod = (method:string)=>{
  return (
      method === 'GET' || method === 'OPTIONS' || method === 'HEAD'
  )
}

export const isPostMethod = (method:string) => {
  return !isGetMethod(method)
}

// JSON Schema 转 TypeScript 类型
export async function jsonSchemaToTypes(schema: string | undefined, typeName: string) {
  if (!schema) return '';
  try {
    const parsedSchema = JSON.parse(schema);
    // 去除 title 和 id，防止 json-schema-to-typescript 提取它们作为接口名
    delete parsedSchema.title
    delete parsedSchema.id

    // 忽略数组长度限制
    delete parsedSchema.minItems
    delete parsedSchema.maxItems
    if (parsedSchema.type === 'object') {
      // 将 additionalProperties 设为 false
      parsedSchema.additionalProperties = false
    }

    // 删除 default，防止 json-schema-to-typescript 根据它推测类型
    delete parsedSchema.default
    const fields = await compile(parsedSchema,typeName, {  bannerComment: '', })

    return fields as string
  } catch (error) {
    console.warn(`无法解析 JSON Schema: ${schema}`);
    return '';
  }
}

// 格式化生成的代码
export function formatCode(code: string): Promise<string> {
  const options = {
    parser: 'typescript',
    singleQuote: true,
    semi: true,
  };
  return prettier.format(code, options);
}

export const convertToJsonSchema = (reqBodyForm:ReqBodyForm[] | ReqQuery[] | ReqParams[]) => {
  const schema: JSONSchema4 = {
    type: 'object',
    properties: {},
    required: []
  };

  reqBodyForm.forEach(field => {
    // 默认字段类型映射
    let fieldType: JSONSchema4TypeName;

    // 根据不同的字段类型映射到 JSON Schema 的类型
    switch (field.type) {
      case 'text':
        fieldType = 'string';
        break;
      case 'file':
        fieldType = 'any';
        break;
      default:
        fieldType = 'string'
    }

    // 构建属性对象
    const fieldSchema = {
      type: fieldType,
      description: field.desc || '',
    };

    // 如果该字段是必填项，则添加到 required 数组中
    if (field.required === '1') {
      (schema?.required as string[]).push(field.name);
    }

    // 将字段添加到 JSON Schema 的 properties 中
    if(schema.properties) schema.properties[field.name] = fieldSchema;
  });

  return schema;
}