"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jsonCfgFileReader = exports.iniCfgFileReader = exports.yamlCfgFileReader = exports.getPath = exports.TextReader = exports.YamlReader = exports.IniReader = exports.JsonReader = exports.readAnyFile = void 0;
const ini = __importStar(require("ini"));
const path = require('path');
function readAnyFile(path, reader) {
    return reader.readFile(path);
}
exports.readAnyFile = readAnyFile;
class JsonReader {
    readFile(path) {
        const fs = require('fs');
        const file = fs.readFileSync(path, 'utf8');
        return JSON.parse(file);
    }
}
exports.JsonReader = JsonReader;
class IniReader {
    readFile(path) {
        const fs = require('fs');
        const file = fs.readFileSync(path, 'utf8');
        return ini.parse(file);
    }
}
exports.IniReader = IniReader;
class YamlReader {
    readFile(path) {
        const fs = require('fs');
        const yaml = require('js-yaml');
        const file = fs.readFileSync(path, 'utf8');
        return yaml.load(file);
    }
}
exports.YamlReader = YamlReader;
class TextReader {
    readFile(path) {
        const fs = require('fs');
        return fs.readFileSync(path, 'utf8');
    }
}
exports.TextReader = TextReader;
function getPath(stack) {
    return path.join(__dirname, `../config/${process.env.ACCOUNT_NAME}/${stack}`);
}
exports.getPath = getPath;
function yamlCfgFileReader(path) {
    return readAnyFile(getPath(path), new YamlReader());
}
exports.yamlCfgFileReader = yamlCfgFileReader;
function iniCfgFileReader(path) {
    return readAnyFile(getPath(path), new IniReader());
}
exports.iniCfgFileReader = iniCfgFileReader;
function jsonCfgFileReader(path) {
    return readAnyFile(getPath(path), new JsonReader());
}
exports.jsonCfgFileReader = jsonCfgFileReader;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZS1yZWFkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJmaWxlLXJlYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHlDQUEyQjtBQUUzQixNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFNN0IsU0FBZ0IsV0FBVyxDQUFJLElBQVksRUFBRSxNQUFtQjtJQUM5RCxPQUFPLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDL0IsQ0FBQztBQUZELGtDQUVDO0FBRUQsTUFBYSxVQUFVO0lBQ3JCLFFBQVEsQ0FBQyxJQUFZO1FBQ25CLE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN6QixNQUFNLElBQUksR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztRQUMzQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDMUIsQ0FBQztDQUNGO0FBTkQsZ0NBTUM7QUFFRCxNQUFhLFNBQVM7SUFDcEIsUUFBUSxDQUFDLElBQVk7UUFDbkIsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3pCLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQzNDLE9BQU8sR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN6QixDQUFDO0NBQ0Y7QUFORCw4QkFNQztBQUVELE1BQWEsVUFBVTtJQUNyQixRQUFRLENBQUMsSUFBWTtRQUNuQixNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDekIsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ2hDLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRTNDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN6QixDQUFDO0NBQ0Y7QUFSRCxnQ0FRQztBQUVELE1BQWEsVUFBVTtJQUNyQixRQUFRLENBQUMsSUFBWTtRQUNuQixNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDekIsT0FBTyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztJQUN2QyxDQUFDO0NBQ0Y7QUFMRCxnQ0FLQztBQUVELFNBQWdCLE9BQU8sQ0FBQyxLQUFhO0lBQ25DLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsYUFBYSxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksSUFBSSxLQUFLLEVBQUUsQ0FBQyxDQUFDO0FBQ2hGLENBQUM7QUFGRCwwQkFFQztBQUVELFNBQWdCLGlCQUFpQixDQUFDLElBQVk7SUFDNUMsT0FBTyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksVUFBVSxFQUFFLENBQUMsQ0FBQTtBQUNyRCxDQUFDO0FBRkQsOENBRUM7QUFFRCxTQUFnQixnQkFBZ0IsQ0FBQyxJQUFZO0lBQzNDLE9BQU8sV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLFNBQVMsRUFBRSxDQUFDLENBQUE7QUFDcEQsQ0FBQztBQUZELDRDQUVDO0FBRUQsU0FBZ0IsaUJBQWlCLENBQUMsSUFBWTtJQUM1QyxPQUFPLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxVQUFVLEVBQUUsQ0FBQyxDQUFBO0FBQ3JELENBQUM7QUFGRCw4Q0FFQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGluaSBmcm9tICdpbmknO1xuXG5jb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xuXG50eXBlIFJlYWRhYmxlPFQ+ID0ge1xuICByZWFkRmlsZShwYXRoOiBzdHJpbmcpOiBvYmplY3Q7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWFkQW55RmlsZTxUPihwYXRoOiBzdHJpbmcsIHJlYWRlcjogUmVhZGFibGU8VD4pOiBvYmplY3Qge1xuICByZXR1cm4gcmVhZGVyLnJlYWRGaWxlKHBhdGgpO1xufVxuXG5leHBvcnQgY2xhc3MgSnNvblJlYWRlciBpbXBsZW1lbnRzIFJlYWRhYmxlPG9iamVjdD4ge1xuICByZWFkRmlsZShwYXRoOiBzdHJpbmcpOiBvYmplY3Qge1xuICAgIGNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKTtcbiAgICBjb25zdCBmaWxlID0gZnMucmVhZEZpbGVTeW5jKHBhdGgsICd1dGY4Jyk7XG4gICAgcmV0dXJuIEpTT04ucGFyc2UoZmlsZSk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEluaVJlYWRlciBpbXBsZW1lbnRzIFJlYWRhYmxlPG9iamVjdD4ge1xuICByZWFkRmlsZShwYXRoOiBzdHJpbmcpOiBvYmplY3Qge1xuICAgIGNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKTtcbiAgICBjb25zdCBmaWxlID0gZnMucmVhZEZpbGVTeW5jKHBhdGgsICd1dGY4Jyk7XG4gICAgcmV0dXJuIGluaS5wYXJzZShmaWxlKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgWWFtbFJlYWRlciBpbXBsZW1lbnRzIFJlYWRhYmxlPG9iamVjdD4ge1xuICByZWFkRmlsZShwYXRoOiBzdHJpbmcpOiBvYmplY3Qge1xuICAgIGNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKTtcbiAgICBjb25zdCB5YW1sID0gcmVxdWlyZSgnanMteWFtbCcpO1xuICAgIGNvbnN0IGZpbGUgPSBmcy5yZWFkRmlsZVN5bmMocGF0aCwgJ3V0ZjgnKTtcblxuICAgIHJldHVybiB5YW1sLmxvYWQoZmlsZSk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIFRleHRSZWFkZXIgaW1wbGVtZW50cyBSZWFkYWJsZTxvYmplY3Q+IHtcbiAgcmVhZEZpbGUocGF0aDogc3RyaW5nKTogb2JqZWN0IHtcbiAgICBjb25zdCBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG4gICAgcmV0dXJuIGZzLnJlYWRGaWxlU3luYyhwYXRoLCAndXRmOCcpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRQYXRoKHN0YWNrOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gcGF0aC5qb2luKF9fZGlybmFtZSwgYC4uL2NvbmZpZy8ke3Byb2Nlc3MuZW52LkFDQ09VTlRfTkFNRX0vJHtzdGFja31gKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHlhbWxDZmdGaWxlUmVhZGVyKHBhdGg6IHN0cmluZyk6IG9iamVjdCB7XG4gIHJldHVybiByZWFkQW55RmlsZShnZXRQYXRoKHBhdGgpLCBuZXcgWWFtbFJlYWRlcigpKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gaW5pQ2ZnRmlsZVJlYWRlcihwYXRoOiBzdHJpbmcpOiBvYmplY3Qge1xuICByZXR1cm4gcmVhZEFueUZpbGUoZ2V0UGF0aChwYXRoKSwgbmV3IEluaVJlYWRlcigpKVxufVxuXG5leHBvcnQgZnVuY3Rpb24ganNvbkNmZ0ZpbGVSZWFkZXIocGF0aDogc3RyaW5nKTogb2JqZWN0IHtcbiAgcmV0dXJuIHJlYWRBbnlGaWxlKGdldFBhdGgocGF0aCksIG5ldyBKc29uUmVhZGVyKCkpXG59XG5cblxuIl19