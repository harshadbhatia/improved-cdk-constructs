"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// const a: User = {
//   allowedIps: ["1", "2"],
//   name: "company",
//   dirStructure: {
//     "company": [
//       {
//         "dir1": []
//       },
//     ],
//     "cash": [
//       {
//         "dir2": "",
//         "dir3": ["subdir", "subdir2"],
//         "dir4": ["sub4",],
//         "dir5": [
//           {
//             "sub5": [],
//           }
//         ]
//       }
//     ],
//     "push": [],
//     "pull": []
//   }
// }
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZXJmYWNlcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImludGVyZmFjZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUF5Q0Esb0JBQW9CO0FBQ3BCLDRCQUE0QjtBQUM1QixxQkFBcUI7QUFDckIsb0JBQW9CO0FBQ3BCLG1CQUFtQjtBQUNuQixVQUFVO0FBQ1YscUJBQXFCO0FBQ3JCLFdBQVc7QUFDWCxTQUFTO0FBQ1QsZ0JBQWdCO0FBQ2hCLFVBQVU7QUFDVixzQkFBc0I7QUFDdEIseUNBQXlDO0FBQ3pDLDZCQUE2QjtBQUM3QixvQkFBb0I7QUFDcEIsY0FBYztBQUNkLDBCQUEwQjtBQUMxQixjQUFjO0FBQ2QsWUFBWTtBQUNaLFVBQVU7QUFDVixTQUFTO0FBQ1Qsa0JBQWtCO0FBQ2xCLGlCQUFpQjtBQUNqQixNQUFNO0FBQ04sSUFBSSIsInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBpbnRlcmZhY2UgU0ZUUENvbmZpZyB7XG4gIHN0YWNrTmFtZTogc3RyaW5nO1xuICBzdGFja0Rlc2NyaXB0aW9uOiBzdHJpbmc7XG4gIGJ1Y2tldE5hbWU6IHN0cmluZztcbiAgdnBjSWQ6IHN0cmluZztcbiAgcHJpdmF0ZVN1Ym5ldElkczogc3RyaW5nO1xuICBwdWJsaWNTdWJuZXRJZHM6IHN0cmluZztcbiAgc2Z0cFNlcnZpY2VFbmFibGVkOiBib29sZWFuO1xufVxuLy8gdXNlcnM6XG4vLyAgIGNvbXBhbnk6XG4vLyAgICAgYWxsb3dlZElwczpcbi8vICAgICAgIC0gXCIxMC4wLjAuMFwiXG4vLyAgICAgICAtIFwiMTAuMC4wLjJcIlxuLy8gICAgICAgLSBcIjEwLjAuMC4zXCJcbi8vICAgICBkaXJTdHJ1Y3R1cmU6XG4vLyAgICAgICBjb21wYW55OlxuLy8gICAgICAgICBkaXIxOlxuLy8gICAgICAgICAgIG5lc3RlZEI6XG4vLyAgICAgICAgICAgICAtIFwiQVwiXG4vLyAgICAgICAgIGRpcjI6XG4vLyAgICAgICAgICAgLSBcIkJcIlxuLy8gICAgICAgICAgIC0gXCJDXCJcblxuZXhwb3J0IGludGVyZmFjZSBEaXJJdGVtIHtcbiAgW2tleTogc3RyaW5nXTogc3RyaW5nIHwgRGlySXRlbVtdIHwgc3RyaW5nW107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVXNlciB7XG4gIG5hbWU6IHN0cmluZztcbiAgcHVibGljS2V5UGF0aDogc3RyaW5nO1xuICBhbGxvd2VkSXBzOiBzdHJpbmdbXTtcbiAgZGlyU3RydWN0dXJlOiB7XG4gICAgW2tleTogc3RyaW5nXTogRGlySXRlbVtdXG4gIH1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBVc2VycyB7XG4gIHVzZXJzOiBVc2VyW11cbn1cblxuLy8gY29uc3QgYTogVXNlciA9IHtcbi8vICAgYWxsb3dlZElwczogW1wiMVwiLCBcIjJcIl0sXG4vLyAgIG5hbWU6IFwiY29tcGFueVwiLFxuLy8gICBkaXJTdHJ1Y3R1cmU6IHtcbi8vICAgICBcImNvbXBhbnlcIjogW1xuLy8gICAgICAge1xuLy8gICAgICAgICBcImRpcjFcIjogW11cbi8vICAgICAgIH0sXG4vLyAgICAgXSxcbi8vICAgICBcImNhc2hcIjogW1xuLy8gICAgICAge1xuLy8gICAgICAgICBcImRpcjJcIjogXCJcIixcbi8vICAgICAgICAgXCJkaXIzXCI6IFtcInN1YmRpclwiLCBcInN1YmRpcjJcIl0sXG4vLyAgICAgICAgIFwiZGlyNFwiOiBbXCJzdWI0XCIsXSxcbi8vICAgICAgICAgXCJkaXI1XCI6IFtcbi8vICAgICAgICAgICB7XG4vLyAgICAgICAgICAgICBcInN1YjVcIjogW10sXG4vLyAgICAgICAgICAgfVxuLy8gICAgICAgICBdXG4vLyAgICAgICB9XG4vLyAgICAgXSxcbi8vICAgICBcInB1c2hcIjogW10sXG4vLyAgICAgXCJwdWxsXCI6IFtdXG4vLyAgIH1cbi8vIH0iXX0=