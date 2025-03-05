import axios from 'axios';
import * as changeCase from 'change-case'
import { ApiInterface, Category } from './types'
import ejs from 'ejs'

import {
  isPostMethod,
  jsonSchemaToTypes,
  formatCode,
  convertToJsonSchema
} from './utils'

interface YapiGeneratorOptions {
  baseUrl: string,
  token: string,
  targetLanguage: string,
  apiTemplate?: string
}

class YapiGenerator {

  private opts: YapiGeneratorOptions

  constructor(opts: YapiGeneratorOptions){
    this.opts = opts
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
      })
      return data || []
    } catch (error) {
      console.error('获取接口数据时出错:', error)
      throw error;
    }
  }

  // 生成 API 方法代码
  async generateApiMethods(apiList: ApiInterface[]) {
    let apiMethods = [],
        tsTypes = []
    let defaultApiTemplate =  
    `
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
    `
    if(this.opts.targetLanguage === 'typescript') {
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
      `
    }
    for(let api of apiList) {
      let requestJsonSchema:any
      const { path, method, title, req_body_other, res_body, req_body_type, req_body_form, req_query,req_params } = api;
      const methodName = path
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
      if(isPostMethod(method)) {
        switch(req_body_type) {
          case 'form': 
          requestJsonSchema = convertToJsonSchema(req_body_form)
          break
          case 'json': 
          if (req_body_other) {
            requestJsonSchema = JSON.parse(req_body_other)
            if (requestJsonSchema.type === 'object') {
              // 将 additionalProperties 设为 false
              requestJsonSchema.additionalProperties = false
            }
          }
          break
          default:
            break
        }
      }
  
      // 处理查询数据
      if(req_query && req_query.length>0) {
        const queryJsonSchema = convertToJsonSchema(req_query)
        if(requestJsonSchema) {
          requestJsonSchema.properties = {
            ...requestJsonSchema.properties,
            ...queryJsonSchema.properties,
          }
          requestJsonSchema.required = [
            ...(Array.isArray(requestJsonSchema.required) ? requestJsonSchema.required : []),
            ...(Array.isArray(queryJsonSchema.required)
              ? queryJsonSchema.required
              : []),
          ]
          
        } else {
          requestJsonSchema = queryJsonSchema
        }
        
      }
  
      // 处理路径参数
      if (req_params && req_params.length) {
        const paramsJsonSchema = convertToJsonSchema(req_params)
          if(requestJsonSchema) {
            requestJsonSchema.properties = {
              ...requestJsonSchema.properties,
              ...paramsJsonSchema.properties,
            }
            requestJsonSchema.required = [
              ...(Array.isArray(requestJsonSchema.required) ? requestJsonSchema.required : []),
              ...(Array.isArray(paramsJsonSchema.required)
                ? paramsJsonSchema.required
                : []),
            ]
            
          } else {
            requestJsonSchema = paramsJsonSchema
          }
      }
  
      const requestType = changeCase.pascalCase(`Request_${methodName}`);
      const responseType = changeCase.pascalCase(`Response_${methodName}`);
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
      })
        
      const tsTypesCode = `
        ${requestTypeDef}
        ${responseTypeDef}
      `
      apiMethods.push(apiCode)
      
      if(this.opts.targetLanguage === 'typescript') {
        tsTypes.push(
          tsTypesCode
        );
      }
      
    }
    const apiFormatCode = await formatCode(apiMethods.join('\n'))
    const typesFormatCode = await formatCode(tsTypes.join('\n'))
    return {
      codes: apiFormatCode,
      tsTypes: typesFormatCode
    }
  }

  async generateCode(){
    const apiList:Category[] = await this.fetchApiList()
    
    if (apiList.length === 0) {
      console.error('未找到 API 数据')
      return;
    }

    for(let apis of apiList) {
      apis._apiCodes = await this.generateApiMethods(apis.list)
    }
    return apiList
  }
}

export default YapiGenerator