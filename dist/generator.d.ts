import { ApiInterface, Category } from './types';
interface YapiGeneratorOptions {
    baseUrl: string;
    token: string;
    targetLanguage: string;
    apiTemplate?: string;
}
declare class YapiGenerator {
    private opts;
    constructor(opts: YapiGeneratorOptions);
    fetchApiList(): Promise<any>;
    generateApiMethods(apiList: ApiInterface[]): Promise<{
        codes: string;
        tsTypes: string;
    }>;
    generateCode(): Promise<Category[] | undefined>;
}
export default YapiGenerator;
