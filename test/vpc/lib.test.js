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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGliLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJsaWIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBR25DLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7SUFDeEIsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDMUIsT0FBTztJQUNQLDBEQUEwRDtJQUMxRCxPQUFPO0lBQ1AsMEZBQTBGO0lBQzFGLCtDQUErQztJQUMvQywrQ0FBK0M7QUFDbkQsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgTGliIGZyb20gJy4uLy4uL2xpYi92cGMvdnBjJztcblxudGVzdCgnVlBDIER1bW15IHRlc3QnLCAoKSA9PiB7XG4gICAgY29uc3QgYXBwID0gbmV3IGNkay5BcHAoKTtcbiAgICAvLyBXSEVOXG4gICAgLy8gY29uc3Qgc3RhY2sgPSBuZXcgTGliLkFuelZQQ1N0YWNrKGFwcCwgJ015VGVzdFN0YWNrJywpO1xuICAgIC8vIFRIRU5cbiAgICAvLyBjb25zdCBhY3R1YWwgPSBKU09OLnN0cmluZ2lmeShhcHAuc3ludGgoKS5nZXRTdGFja0FydGlmYWN0KHN0YWNrLmFydGlmYWN0SWQpLnRlbXBsYXRlKTtcbiAgICAvLyBleHBlY3QoYWN0dWFsKS50b0NvbnRhaW4oJ0FXUzo6U1FTOjpRdWV1ZScpO1xuICAgIC8vIGV4cGVjdChhY3R1YWwpLnRvQ29udGFpbignQVdTOjpTTlM6OlRvcGljJyk7XG59KTtcbiJdfQ==