"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPath = exports.TextReader = exports.YamlReader = exports.IniReader = exports.JsonReader = exports.readAnyFile = void 0;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZS1yZWFkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJmaWxlLXJlYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEseUNBQTJCO0FBRTNCLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQU03QixTQUFnQixXQUFXLENBQUksSUFBWSxFQUFFLE1BQW1CO0lBQzlELE9BQU8sTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMvQixDQUFDO0FBRkQsa0NBRUM7QUFFRCxNQUFhLFVBQVU7SUFDckIsUUFBUSxDQUFDLElBQVk7UUFDbkIsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3pCLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQzNDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMxQixDQUFDO0NBQ0Y7QUFORCxnQ0FNQztBQUVELE1BQWEsU0FBUztJQUNwQixRQUFRLENBQUMsSUFBWTtRQUNuQixNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDekIsTUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDM0MsT0FBTyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3pCLENBQUM7Q0FDRjtBQU5ELDhCQU1DO0FBRUQsTUFBYSxVQUFVO0lBQ3JCLFFBQVEsQ0FBQyxJQUFZO1FBQ25CLE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN6QixNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDaEMsTUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFM0MsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3pCLENBQUM7Q0FDRjtBQVJELGdDQVFDO0FBRUQsTUFBYSxVQUFVO0lBQ3JCLFFBQVEsQ0FBQyxJQUFZO1FBQ25CLE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN6QixPQUFPLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7Q0FDRjtBQUxELGdDQUtDO0FBRUQsU0FBZ0IsT0FBTyxDQUFDLEtBQWE7SUFDbkMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxhQUFhLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxJQUFJLEtBQUssRUFBRSxDQUFDLENBQUM7QUFDaEYsQ0FBQztBQUZELDBCQUVDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgaW5pIGZyb20gJ2luaSc7XG5cbmNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG5cbnR5cGUgUmVhZGFibGU8VD4gPSB7XG4gIHJlYWRGaWxlKHBhdGg6IHN0cmluZyk6IG9iamVjdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRBbnlGaWxlPFQ+KHBhdGg6IHN0cmluZywgcmVhZGVyOiBSZWFkYWJsZTxUPik6IG9iamVjdCB7XG4gIHJldHVybiByZWFkZXIucmVhZEZpbGUocGF0aCk7XG59XG5cbmV4cG9ydCBjbGFzcyBKc29uUmVhZGVyIGltcGxlbWVudHMgUmVhZGFibGU8b2JqZWN0PiB7XG4gIHJlYWRGaWxlKHBhdGg6IHN0cmluZyk6IG9iamVjdCB7XG4gICAgY29uc3QgZnMgPSByZXF1aXJlKCdmcycpO1xuICAgIGNvbnN0IGZpbGUgPSBmcy5yZWFkRmlsZVN5bmMocGF0aCwgJ3V0ZjgnKTtcbiAgICByZXR1cm4gSlNPTi5wYXJzZShmaWxlKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgSW5pUmVhZGVyIGltcGxlbWVudHMgUmVhZGFibGU8b2JqZWN0PiB7XG4gIHJlYWRGaWxlKHBhdGg6IHN0cmluZyk6IG9iamVjdCB7XG4gICAgY29uc3QgZnMgPSByZXF1aXJlKCdmcycpO1xuICAgIGNvbnN0IGZpbGUgPSBmcy5yZWFkRmlsZVN5bmMocGF0aCwgJ3V0ZjgnKTtcbiAgICByZXR1cm4gaW5pLnBhcnNlKGZpbGUpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBZYW1sUmVhZGVyIGltcGxlbWVudHMgUmVhZGFibGU8b2JqZWN0PiB7XG4gIHJlYWRGaWxlKHBhdGg6IHN0cmluZyk6IG9iamVjdCB7XG4gICAgY29uc3QgZnMgPSByZXF1aXJlKCdmcycpO1xuICAgIGNvbnN0IHlhbWwgPSByZXF1aXJlKCdqcy15YW1sJyk7XG4gICAgY29uc3QgZmlsZSA9IGZzLnJlYWRGaWxlU3luYyhwYXRoLCAndXRmOCcpO1xuXG4gICAgcmV0dXJuIHlhbWwubG9hZChmaWxlKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgVGV4dFJlYWRlciBpbXBsZW1lbnRzIFJlYWRhYmxlPG9iamVjdD4ge1xuICByZWFkRmlsZShwYXRoOiBzdHJpbmcpOiBvYmplY3Qge1xuICAgIGNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKTtcbiAgICByZXR1cm4gZnMucmVhZEZpbGVTeW5jKHBhdGgsICd1dGY4Jyk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFBhdGgoc3RhY2s6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBwYXRoLmpvaW4oX19kaXJuYW1lLCBgLi4vY29uZmlnLyR7cHJvY2Vzcy5lbnYuQUNDT1VOVF9OQU1FfS8ke3N0YWNrfWApO1xufVxuXG4iXX0=