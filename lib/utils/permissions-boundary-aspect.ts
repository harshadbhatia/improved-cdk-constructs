import { Aws, CfnResource, CustomResource, IAspect } from "aws-cdk-lib";
import { CfnRole, Role } from "aws-cdk-lib/aws-iam";
import { Construct, IConstruct } from "constructs";

import iam = require('aws-cdk-lib/aws-iam');

export class PermissionsBoundaryAspect implements IAspect {

  readonly permissionsBoundaryArn: string;

  constructor(roleName?: string) {

    if (roleName) {
      this.permissionsBoundaryArn = `arn:aws:iam::${Aws.ACCOUNT_ID}:policy/${roleName}`;
    } else {
      this.permissionsBoundaryArn = `arn:aws:iam::${Aws.ACCOUNT_ID}:policy/RolePermissionBoundary`;
    }
  }

  visit(node: IConstruct): void {

    if (node instanceof Role) {
      const roleResource = node.node.findChild("Resource") as CfnRole;
      roleResource.addPropertyOverride("PermissionsBoundary", this.permissionsBoundaryArn);
    } if (CfnResource.isCfnResource(node) && node.cfnResourceType === 'AWS::IAM::Role') {
      node.addPropertyOverride('PermissionsBoundary', this.permissionsBoundaryArn);
    } else if (
      //  This is special bug fix as These are Custom IAM::Role which dont suceed the above statement
      node.toString().includes('AWSCDKOpenIdConnectProviderCustomResourceProvider/Role') ||
      node.toString().includes('AWSCDKCfnUtilsProviderCustomResourceProvider/Role')) {

      const x = node as CfnResource
      x.addPropertyOverride("PermissionsBoundary", this.permissionsBoundaryArn);

    }
  }

}

export function permissionBoundary(scope: Construct) {
  return iam.ManagedPolicy.fromManagedPolicyName(
    scope,
    'PermissionsBoundary',
    'RolePermissionBoundary',
  );
}