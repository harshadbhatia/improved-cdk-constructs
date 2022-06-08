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
exports.jsonCfgFileReader = exports.iniCfgFileReader = exports.yamlCfgFileReader = exports.getModulePath = exports.getPath = exports.TextReader = exports.YamlReader = exports.IniReader = exports.JsonReader = exports.readAnyFile = void 0;
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
function getModulePath(stack) {
    return path.join(__dirname, `../../../../../config/${process.env.ACCOUNT_NAME}/${stack}`);
}
exports.getModulePath = getModulePath;
function yamlCfgFileReader(path) {
    return readAnyFile(getModulePath(path), new YamlReader());
}
exports.yamlCfgFileReader = yamlCfgFileReader;
function iniCfgFileReader(path) {
    return readAnyFile(getModulePath(path), new IniReader());
}
exports.iniCfgFileReader = iniCfgFileReader;
function jsonCfgFileReader(path) {
    return readAnyFile(getModulePath(path), new JsonReader());
}
exports.jsonCfgFileReader = jsonCfgFileReader;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZS1yZWFkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJmaWxlLXJlYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHlDQUEyQjtBQUUzQixNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFNN0IsU0FBZ0IsV0FBVyxDQUFJLElBQVksRUFBRSxNQUFtQjtJQUM5RCxPQUFPLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDL0IsQ0FBQztBQUZELGtDQUVDO0FBRUQsTUFBYSxVQUFVO0lBQ3JCLFFBQVEsQ0FBQyxJQUFZO1FBQ25CLE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN6QixNQUFNLElBQUksR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztRQUMzQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDMUIsQ0FBQztDQUNGO0FBTkQsZ0NBTUM7QUFFRCxNQUFhLFNBQVM7SUFDcEIsUUFBUSxDQUFDLElBQVk7UUFDbkIsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3pCLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQzNDLE9BQU8sR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN6QixDQUFDO0NBQ0Y7QUFORCw4QkFNQztBQUVELE1BQWEsVUFBVTtJQUNyQixRQUFRLENBQUMsSUFBWTtRQUNuQixNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDekIsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ2hDLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRTNDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN6QixDQUFDO0NBQ0Y7QUFSRCxnQ0FRQztBQUVELE1BQWEsVUFBVTtJQUNyQixRQUFRLENBQUMsSUFBWTtRQUNuQixNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDekIsT0FBTyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztJQUN2QyxDQUFDO0NBQ0Y7QUFMRCxnQ0FLQztBQUVELFNBQWdCLE9BQU8sQ0FBQyxLQUFhO0lBQ25DLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsYUFBYSxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksSUFBSSxLQUFLLEVBQUUsQ0FBQyxDQUFDO0FBQ2hGLENBQUM7QUFGRCwwQkFFQztBQUVELFNBQWdCLGFBQWEsQ0FBQyxLQUFhO0lBQ3pDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUseUJBQXlCLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxJQUFJLEtBQUssRUFBRSxDQUFDLENBQUM7QUFDNUYsQ0FBQztBQUZELHNDQUVDO0FBRUQsU0FBZ0IsaUJBQWlCLENBQUMsSUFBWTtJQUM1QyxPQUFPLFdBQVcsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxVQUFVLEVBQUUsQ0FBQyxDQUFBO0FBQzNELENBQUM7QUFGRCw4Q0FFQztBQUVELFNBQWdCLGdCQUFnQixDQUFDLElBQVk7SUFDM0MsT0FBTyxXQUFXLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksU0FBUyxFQUFFLENBQUMsQ0FBQTtBQUMxRCxDQUFDO0FBRkQsNENBRUM7QUFFRCxTQUFnQixpQkFBaUIsQ0FBQyxJQUFZO0lBQzVDLE9BQU8sV0FBVyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLFVBQVUsRUFBRSxDQUFDLENBQUE7QUFDM0QsQ0FBQztBQUZELDhDQUVDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgaW5pIGZyb20gJ2luaSc7XG5cbmNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG5cbnR5cGUgUmVhZGFibGU8VD4gPSB7XG4gIHJlYWRGaWxlKHBhdGg6IHN0cmluZyk6IG9iamVjdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRBbnlGaWxlPFQ+KHBhdGg6IHN0cmluZywgcmVhZGVyOiBSZWFkYWJsZTxUPik6IG9iamVjdCB7XG4gIHJldHVybiByZWFkZXIucmVhZEZpbGUocGF0aCk7XG59XG5cbmV4cG9ydCBjbGFzcyBKc29uUmVhZGVyIGltcGxlbWVudHMgUmVhZGFibGU8b2JqZWN0PiB7XG4gIHJlYWRGaWxlKHBhdGg6IHN0cmluZyk6IG9iamVjdCB7XG4gICAgY29uc3QgZnMgPSByZXF1aXJlKCdmcycpO1xuICAgIGNvbnN0IGZpbGUgPSBmcy5yZWFkRmlsZVN5bmMocGF0aCwgJ3V0ZjgnKTtcbiAgICByZXR1cm4gSlNPTi5wYXJzZShmaWxlKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgSW5pUmVhZGVyIGltcGxlbWVudHMgUmVhZGFibGU8b2JqZWN0PiB7XG4gIHJlYWRGaWxlKHBhdGg6IHN0cmluZyk6IG9iamVjdCB7XG4gICAgY29uc3QgZnMgPSByZXF1aXJlKCdmcycpO1xuICAgIGNvbnN0IGZpbGUgPSBmcy5yZWFkRmlsZVN5bmMocGF0aCwgJ3V0ZjgnKTtcbiAgICByZXR1cm4gaW5pLnBhcnNlKGZpbGUpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBZYW1sUmVhZGVyIGltcGxlbWVudHMgUmVhZGFibGU8b2JqZWN0PiB7XG4gIHJlYWRGaWxlKHBhdGg6IHN0cmluZyk6IG9iamVjdCB7XG4gICAgY29uc3QgZnMgPSByZXF1aXJlKCdmcycpO1xuICAgIGNvbnN0IHlhbWwgPSByZXF1aXJlKCdqcy15YW1sJyk7XG4gICAgY29uc3QgZmlsZSA9IGZzLnJlYWRGaWxlU3luYyhwYXRoLCAndXRmOCcpO1xuXG4gICAgcmV0dXJuIHlhbWwubG9hZChmaWxlKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgVGV4dFJlYWRlciBpbXBsZW1lbnRzIFJlYWRhYmxlPG9iamVjdD4ge1xuICByZWFkRmlsZShwYXRoOiBzdHJpbmcpOiBvYmplY3Qge1xuICAgIGNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKTtcbiAgICByZXR1cm4gZnMucmVhZEZpbGVTeW5jKHBhdGgsICd1dGY4Jyk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFBhdGgoc3RhY2s6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBwYXRoLmpvaW4oX19kaXJuYW1lLCBgLi4vY29uZmlnLyR7cHJvY2Vzcy5lbnYuQUNDT1VOVF9OQU1FfS8ke3N0YWNrfWApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0TW9kdWxlUGF0aChzdGFjazogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHBhdGguam9pbihfX2Rpcm5hbWUsIGAuLi8uLi8uLi8uLi8uLi9jb25maWcvJHtwcm9jZXNzLmVudi5BQ0NPVU5UX05BTUV9LyR7c3RhY2t9YCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB5YW1sQ2ZnRmlsZVJlYWRlcihwYXRoOiBzdHJpbmcpOiBvYmplY3Qge1xuICByZXR1cm4gcmVhZEFueUZpbGUoZ2V0TW9kdWxlUGF0aChwYXRoKSwgbmV3IFlhbWxSZWFkZXIoKSlcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGluaUNmZ0ZpbGVSZWFkZXIocGF0aDogc3RyaW5nKTogb2JqZWN0IHtcbiAgcmV0dXJuIHJlYWRBbnlGaWxlKGdldE1vZHVsZVBhdGgocGF0aCksIG5ldyBJbmlSZWFkZXIoKSlcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGpzb25DZmdGaWxlUmVhZGVyKHBhdGg6IHN0cmluZyk6IG9iamVjdCB7XG4gIHJldHVybiByZWFkQW55RmlsZShnZXRNb2R1bGVQYXRoKHBhdGgpLCBuZXcgSnNvblJlYWRlcigpKVxufVxuXG5cbiJdfQ==