type Readable<T> = {
    readFile(path: string): object;
};
export declare function readAnyFile<T>(path: string, reader: Readable<T>): object;
export declare class JsonReader implements Readable<object> {
    readFile(path: string): object;
}
export declare class IniReader implements Readable<object> {
    readFile(path: string): object;
}
export declare class YamlReader implements Readable<object> {
    readFile(path: string): object;
}
export declare class TextReader implements Readable<object> {
    readFile(path: string): object;
}
export declare function getPath(stack: string): string;
export declare function getModulePath(stack: string): string;
export declare function yamlCfgFileReader(path: string): object;
export declare function iniCfgFileReader(path: string): object;
export declare function jsonCfgFileReader(path: string): object;
export {};
