#!/usr/bin/env node
import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import YapiGenerator from './generator';
import fs from 'fs';
import path from 'path';

const program = new Command();

program
  .version('1.0.0')
  .description('YAPI API 生成器 CLI')
  .option('-c, --config <path>', '配置文件路径')
  .action(async (options)=>{
    const configPath = options.config || './yapi-api-generator-config.json';
    let config = null;
    // 检查配置文件是否存在
    if (fs.existsSync(configPath)) {
      console.log(chalk.green(`使用该路径下的配置文件 ${configPath}`));
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } else {
      // 如果配置文件不存在，交互式生成配置文件
      console.log(chalk.yellow(`没有找到该路径下的配置文件 ${configPath}.`));
      config = await inquirer.prompt([
        {
          type: 'input',
          name: 'baseUrl',
          message: '输入Yapi地址:',
        },
        {
          type: 'input',
          name: 'token',
          message: '输入项目token:',
        },
        {
          type: 'input',
          name: 'output',
          message: '输入输出文件路径:',
        },
        {
          type: 'list',
          name: 'targetLanguage',
          message: '输入语言:',
          choices: ['javascript', 'typescript']
        },
        
      ]);
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
      console.log(chalk.green(`文件已被创建 ${configPath}`));
    }

    // 参数验证
    if (!config.token || !config.baseUrl) {
      console.error(chalk.red('缺少必要参数：token, baseUrl'));
      process.exit(1);
    }

    // 创建输出目录
    const outputDir = path.dirname(config.output);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    try {
      const generator = new YapiGenerator({
        baseUrl: config.baseUrl,
        token: config.token,
        targetLanguage: config.targetLanguage,
        apiTemplate: config.apiTemplate
      });

      console.log(chalk.blue('开始生成API代码...'));
      const result = await generator.generateCode();
      
      if (!result || result.length === 0) {
        console.error(chalk.red('未生成任何API代码'));
        return;
      }

      // 合并所有API代码
      let apiCode = '';
      let typeCode = '';

      for (const category of result) {
        if (category._apiCodes) {
          apiCode += category._apiCodes.codes + '\n\n';
          if (config.targetLanguage === 'javascript') {
            typeCode += category._apiCodes.tsTypes + '\n\n';
          }
        }
      }

      // 写入API代码
      fs.writeFileSync(config.output, apiCode);
      if (config.targetLanguage === 'typescript') {
        const typeFilePath = path.join(outputDir, 'types.ts');
        fs.writeFileSync(typeFilePath, typeCode);
      }

      console.log(chalk.green(`API代码生成成功！`));
      console.log(chalk.green(`主文件: ${path.resolve(config.output)}`));
      if (config.targetLanguage === 'typescript') {
        console.log(chalk.green(`类型文件: ${path.resolve(outputDir, 'types.ts')}`));
      }
    } catch (error) {
      console.error(chalk.red('生成API代码时出错:'), error);
      process.exit(1);
    }
  })

program.parse(process.argv);