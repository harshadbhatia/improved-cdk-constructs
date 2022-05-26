"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bucketsToString = exports.fetchAPI = exports.getAccountNameFromFilename = exports.convertStringToArray = void 0;
const axios_1 = __importDefault(require("axios"));
function convertStringToArray(input) {
    return input.split(",");
}
exports.convertStringToArray = convertStringToArray;
function getAccountNameFromFilename(filename) {
    return filename.split('/').slice(-1)[0].split('.')[0];
}
exports.getAccountNameFromFilename = getAccountNameFromFilename;
function fetchAPI(url) {
    return axios_1.default.get(url).then((response) => {
        return response.data;
    }).catch((error) => {
        console.log(error);
    });
}
exports.fetchAPI = fetchAPI;
function bucketsToString(buckets) {
    if (!buckets) {
        return "";
    }
    return buckets.map((bucket) => bucket.bucketName).join(",");
}
exports.bucketsToString = bucketsToString;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY29tbW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUNBLGtEQUE2QztBQUU3QyxTQUFnQixvQkFBb0IsQ0FBQyxLQUFhO0lBQ2hELE9BQU8sS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtBQUN6QixDQUFDO0FBRkQsb0RBRUM7QUFFRCxTQUFnQiwwQkFBMEIsQ0FBQyxRQUFnQjtJQUV6RCxPQUFPLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0FBQ3ZELENBQUM7QUFIRCxnRUFHQztBQUVELFNBQWdCLFFBQVEsQ0FBQyxHQUFXO0lBQ2xDLE9BQU8sZUFBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRTtRQUN0QyxPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUE7SUFDdEIsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7UUFDakIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUNwQixDQUFDLENBQUMsQ0FBQTtBQUNKLENBQUM7QUFORCw0QkFNQztBQUdELFNBQWdCLGVBQWUsQ0FBQyxPQUFrQjtJQUNoRCxJQUFJLENBQUMsT0FBTyxFQUFFO1FBQ1osT0FBTyxFQUFFLENBQUM7S0FDWDtJQUVELE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUM5RCxDQUFDO0FBTkQsMENBTUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBCdWNrZXQgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xuaW1wb3J0IGF4aW9zLCB7IEF4aW9zUmVzcG9uc2UgfSBmcm9tICdheGlvcyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBjb252ZXJ0U3RyaW5nVG9BcnJheShpbnB1dDogc3RyaW5nKTogc3RyaW5nW10ge1xuICByZXR1cm4gaW5wdXQuc3BsaXQoXCIsXCIpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRBY2NvdW50TmFtZUZyb21GaWxlbmFtZShmaWxlbmFtZTogc3RyaW5nKTogc3RyaW5nIHtcblxuICByZXR1cm4gZmlsZW5hbWUuc3BsaXQoJy8nKS5zbGljZSgtMSlbMF0uc3BsaXQoJy4nKVswXVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZmV0Y2hBUEkodXJsOiBzdHJpbmcpOiBQcm9taXNlPEF4aW9zUmVzcG9uc2U8YW55LCBhbnk+PiB7XG4gIHJldHVybiBheGlvcy5nZXQodXJsKS50aGVuKChyZXNwb25zZSkgPT4ge1xuICAgIHJldHVybiByZXNwb25zZS5kYXRhXG4gIH0pLmNhdGNoKChlcnJvcikgPT4ge1xuICAgIGNvbnNvbGUubG9nKGVycm9yKVxuICB9KVxufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBidWNrZXRzVG9TdHJpbmcoYnVja2V0cz86IEJ1Y2tldFtdKTogc3RyaW5nIHtcbiAgaWYgKCFidWNrZXRzKSB7XG4gICAgcmV0dXJuIFwiXCI7XG4gIH1cblxuICByZXR1cm4gYnVja2V0cy5tYXAoKGJ1Y2tldCkgPT4gYnVja2V0LmJ1Y2tldE5hbWUpLmpvaW4oXCIsXCIpO1xufSJdfQ==