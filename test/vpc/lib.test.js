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
const cdk = __importStar(require("aws-cdk-lib"));
test('VPC Dummy test', () => {
    const app = new cdk.App();
    // WHEN
    // const stack = new Lib.AnzVPCStack(app, 'MyTestStack',);
    // THEN
    // const actual = JSON.stringify(app.synth().getStackArtifact(stack.artifactId).template);
    // expect(actual).toContain('AWS::SQS::Queue');
    // expect(actual).toContain('AWS::SNS::Topic');
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGliLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJsaWIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFHbkMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtJQUN4QixNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUMxQixPQUFPO0lBQ1AsMERBQTBEO0lBQzFELE9BQU87SUFDUCwwRkFBMEY7SUFDMUYsK0NBQStDO0lBQy9DLCtDQUErQztBQUNuRCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBMaWIgZnJvbSAnLi4vLi4vbGliL3ZwYy92cGMnO1xuXG50ZXN0KCdWUEMgRHVtbXkgdGVzdCcsICgpID0+IHtcbiAgICBjb25zdCBhcHAgPSBuZXcgY2RrLkFwcCgpO1xuICAgIC8vIFdIRU5cbiAgICAvLyBjb25zdCBzdGFjayA9IG5ldyBMaWIuQW56VlBDU3RhY2soYXBwLCAnTXlUZXN0U3RhY2snLCk7XG4gICAgLy8gVEhFTlxuICAgIC8vIGNvbnN0IGFjdHVhbCA9IEpTT04uc3RyaW5naWZ5KGFwcC5zeW50aCgpLmdldFN0YWNrQXJ0aWZhY3Qoc3RhY2suYXJ0aWZhY3RJZCkudGVtcGxhdGUpO1xuICAgIC8vIGV4cGVjdChhY3R1YWwpLnRvQ29udGFpbignQVdTOjpTUVM6OlF1ZXVlJyk7XG4gICAgLy8gZXhwZWN0KGFjdHVhbCkudG9Db250YWluKCdBV1M6OlNOUzo6VG9waWMnKTtcbn0pO1xuIl19