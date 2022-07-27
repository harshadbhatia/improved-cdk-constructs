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
exports.ArgoCD = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const fs = __importStar(require("fs"));
const yaml = __importStar(require("js-yaml"));
class ArgoCD extends aws_cdk_lib_1.NestedStack {
    constructor(scope, id, props) {
        super(scope, id, props);
        this.config = props;
        this.deployManifest();
    }
    deployManifest() {
        // yaml
        let dataResult = [];
        try {
            const path = require('path');
            let valuesYaml = fs.readFileSync(path.join(__dirname, `./manifests/argocd-2-4-7.yaml`));
            // Replace Domain and load YAML
            let valuesParsed = yaml.loadAll(valuesYaml.toString());
            if (typeof valuesParsed === 'object' && valuesParsed !== null) {
                dataResult = valuesParsed;
            }
        }
        catch (exception) {
            // pass
            console.error(" > Failed to load 'argocd.yaml' for 'argo-cd' deploy...");
            console.error(exception);
            return;
        }
        let bodies = [];
        // Install ARGO CD
        dataResult.forEach((val, idx) => {
            bodies.push(this.config.eksCluster.addManifest('argo-cd' + idx, val));
        });
        this.bodies = bodies;
    }
}
exports.ArgoCD = ArgoCD;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJnby1jZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFyZ28tY2QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSw2Q0FBNEQ7QUFJNUQsdUNBQXlCO0FBRXpCLDhDQUFnQztBQU9oQyxNQUFhLE1BQU8sU0FBUSx5QkFBVztJQUtyQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQW1CO1FBQzNELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBTSxDQUFDO1FBRXJCLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQTtJQUV2QixDQUFDO0lBRUQsY0FBYztRQUNaLE9BQU87UUFDUCxJQUFJLFVBQVUsR0FBNkIsRUFBRSxDQUFDO1FBRTlDLElBQUk7WUFFRixNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFN0IsSUFBSSxVQUFVLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSwrQkFBK0IsQ0FBQyxDQUFDLENBQUM7WUFDeEYsK0JBQStCO1lBQy9CLElBQUksWUFBWSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUNwRCxDQUFDO1lBQ0YsSUFBSSxPQUFPLFlBQVksS0FBSyxRQUFRLElBQUksWUFBWSxLQUFLLElBQUksRUFBRTtnQkFDN0QsVUFBVSxHQUFHLFlBQXdDLENBQUM7YUFDdkQ7U0FDRjtRQUFDLE9BQU8sU0FBUyxFQUFFO1lBQ2xCLE9BQU87WUFDUCxPQUFPLENBQUMsS0FBSyxDQUFDLHlEQUF5RCxDQUFDLENBQUM7WUFDekUsT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUN6QixPQUFPO1NBQ1I7UUFFRCxJQUFJLE1BQU0sR0FBZ0IsRUFBRSxDQUFDO1FBRTdCLGtCQUFrQjtRQUNsQixVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFO1lBQzlCLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLFNBQVMsR0FBRyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUN4RSxDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0lBQ3ZCLENBQUM7Q0FFRjtBQTlDRCx3QkE4Q0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBOZXN0ZWRTdGFjaywgTmVzdGVkU3RhY2tQcm9wcyB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IENsdXN0ZXIgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWtzJztcbmltcG9ydCB7IFBvbGljeSwgUG9saWN5RG9jdW1lbnQgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5cbmltcG9ydCAqIGFzIHlhbWwgZnJvbSAnanMteWFtbCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXJnb0NEUHJvcHMgZXh0ZW5kcyBOZXN0ZWRTdGFja1Byb3BzIHtcbiAgZWtzQ2x1c3RlcjogQ2x1c3RlclxuICBjbHVzdGVyTmFtZTogc3RyaW5nXG59XG5cbmV4cG9ydCBjbGFzcyBBcmdvQ0QgZXh0ZW5kcyBOZXN0ZWRTdGFjayB7XG4gIGJvZHk6IENvbnN0cnVjdDtcbiAgYm9kaWVzOiBDb25zdHJ1Y3RbXTtcbiAgY29uZmlnOiBBcmdvQ0RQcm9wcztcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IEFyZ29DRFByb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICB0aGlzLmNvbmZpZyA9IHByb3BzITtcblxuICAgIHRoaXMuZGVwbG95TWFuaWZlc3QoKVxuXG4gIH1cblxuICBkZXBsb3lNYW5pZmVzdCgpIHtcbiAgICAvLyB5YW1sXG4gICAgbGV0IGRhdGFSZXN1bHQ6IFJlY29yZDxzdHJpbmcsIG9iamVjdD5bXSA9IFtdO1xuXG4gICAgdHJ5IHtcblxuICAgICAgY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcblxuICAgICAgbGV0IHZhbHVlc1lhbWwgPSBmcy5yZWFkRmlsZVN5bmMocGF0aC5qb2luKF9fZGlybmFtZSwgYC4vbWFuaWZlc3RzL2FyZ29jZC0yLTQtNy55YW1sYCkpO1xuICAgICAgLy8gUmVwbGFjZSBEb21haW4gYW5kIGxvYWQgWUFNTFxuICAgICAgbGV0IHZhbHVlc1BhcnNlZCA9IHlhbWwubG9hZEFsbCh2YWx1ZXNZYW1sLnRvU3RyaW5nKClcbiAgICAgICk7XG4gICAgICBpZiAodHlwZW9mIHZhbHVlc1BhcnNlZCA9PT0gJ29iamVjdCcgJiYgdmFsdWVzUGFyc2VkICE9PSBudWxsKSB7XG4gICAgICAgIGRhdGFSZXN1bHQgPSB2YWx1ZXNQYXJzZWQgYXMgUmVjb3JkPHN0cmluZywgb2JqZWN0PltdO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge1xuICAgICAgLy8gcGFzc1xuICAgICAgY29uc29sZS5lcnJvcihcIiA+IEZhaWxlZCB0byBsb2FkICdhcmdvY2QueWFtbCcgZm9yICdhcmdvLWNkJyBkZXBsb3kuLi5cIik7XG4gICAgICBjb25zb2xlLmVycm9yKGV4Y2VwdGlvbik7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbGV0IGJvZGllczogQ29uc3RydWN0W10gPSBbXTtcblxuICAgIC8vIEluc3RhbGwgQVJHTyBDRFxuICAgIGRhdGFSZXN1bHQuZm9yRWFjaCgodmFsLCBpZHgpID0+IHtcbiAgICAgIGJvZGllcy5wdXNoKHRoaXMuY29uZmlnLmVrc0NsdXN0ZXIuYWRkTWFuaWZlc3QoJ2FyZ28tY2QnICsgaWR4LCB2YWwpKTtcbiAgICB9KVxuXG4gICAgdGhpcy5ib2RpZXMgPSBib2RpZXM7XG4gIH1cblxufSJdfQ==