import * as ini from 'ini';

const path = require('path');

type Readable<T> = {
  readFile(path: string): object;
}

export function readAnyFile<T>(path: string, reader: Readable<T>): object {
  return reader.readFile(path);
}

export class JsonReader implements Readable<object> {
  readFile(path: string): object {
    const fs = require('fs');
    const file = fs.readFileSync(path, 'utf8');
    return JSON.parse(file);
  }
}

export class IniReader implements Readable<object> {
  readFile(path: string): object {
    const fs = require('fs');
    const file = fs.readFileSync(path, 'utf8');
    return ini.parse(file);
  }
}

export class YamlReader implements Readable<object> {
  readFile(path: string): object {
    const fs = require('fs');
    const yaml = require('js-yaml');
    const file = fs.readFileSync(path, 'utf8');

    return yaml.load(file);
  }
}

export class TextReader implements Readable<object> {
  readFile(path: string): object {
    const fs = require('fs');
    return fs.readFileSync(path, 'utf8');
  }
}

export function getPath(stack: string): string {
  return path.join(__dirname, `../config/${process.env.ACCOUNT_NAME}/${stack}`);
}

export function yamlCfgFileReader(path: string): object {
  return readAnyFile(getPath(path), new YamlReader())
}

export function iniCfgFileReader(path: string): object {
  return readAnyFile(getPath(path), new IniReader())
}

export function jsonCfgFileReader(path: string): object {
  return readAnyFile(getPath(path), new JsonReader())
}


