// import * as ini from 'npm:ini';
import yaml from 'https://esm.sh/js-yaml';

import * as path from "https://deno.land/std@0.161.0/path/mod.ts";

const __filename = path.fromFileUrl(import.meta.url);
// Without trailing slash
const __dirname = path.dirname(path.fromFileUrl(import.meta.url));

type Readable<T> = {
  readFile(path: string): T;
}

export function readAnyFile<T>(path: string, reader: Readable<T>): T {
  return reader.readFile(path);
}

// export class JsonReader implements Readable<object> {
//   readFile(path: string): object {
//     const fs = require('fs');
//     const file = fs.readFileSync(path, 'utf8');
//     return JSON.parse(file);
//   }
// }

// export class IniReader implements Readable<object> {
//   readFile(path: string): object {
//     const fs = require('fs');
//     const file = fs.readFileSync(path, 'utf8');
//     return ini.parse(file);
//   }
// }

export class YamlReader implements Readable<object> {
  readFile(path: string): object {
    const decoder = new TextDecoder("utf-8");
    const file = Deno.readFileSync(path);
    const t = decoder.decode(file)

    return yaml.load(t) as object;
  }
}

export class TextReader implements Readable<object> {
  readFile(path: string): object {
    return Deno.readFileSync(path);
  }
}

export function getPath(stack: string): string {
  return path.join(__dirname, `../config/${Deno.env.get("ACCOUNT_NAME")}/${stack}`);
}

export function getModulePath(stack: string): string {
  return path.join(__dirname, `../../../../../config/${Deno.env.get("ACCOUNT_NAME")}/${stack}`);
}

export function yamlCfgFileReader(filePath: string, configPath?: string): object {
  if (configPath) {
    const p = path.join(__dirname, `${configPath}/config/${Deno.env.get("ACCOUNT_NAME")}/${filePath}`);
    return readAnyFile(p, new YamlReader())
  }

  return readAnyFile(getModulePath(filePath), new YamlReader())
}

// export function iniCfgFileReader(path: string): object {
//   return readAnyFile(getModulePath(path), new IniReader())
// }

// export function jsonCfgFileReader(path: string): object {
//   return readAnyFile(getModulePath(path), new JsonReader())
// }


