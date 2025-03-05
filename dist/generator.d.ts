import { ApiInterface, Category } from './types';
interface ApiGeneratorOptions {
    baseUrl: string;
    token: string;
    targetLanguage: string;
    apiTemplate?: string;
}
declare class ApiGenerator {
    private opts;
    constructor(opts: ApiGeneratorOptions);
    fetchApiList(): Promise<any>;
    generateApiMethods(apiList: ApiInterface[]): Promise<{
        codes: string;
        tsTypes: string;
    }>;
    generateCode(): Promise<Category[] | undefined>;
}
export default ApiGenerator;
