export interface SFTPConfig {
  stackName: string;
  stackDescription: string;
  bucketName: string;
  vpcId: string;
  privateSubnetIds: string;
  publicSubnetIds: string;
  sftpServiceEnabled: boolean;
}
// users:
//   company:
//     allowedIps:
//       - "10.0.0.0"
//       - "10.0.0.2"
//       - "10.0.0.3"
//     dirStructure:
//       company:
//         dir1:
//           nestedB:
//             - "A"
//         dir2:
//           - "B"
//           - "C"

export interface DirItem {
  [key: string]: string | DirItem[] | string[];
}

export interface User {
  name: string;
  publicKeyPath: string;
  allowedIps: string[];
  dirStructure: {
    [key: string]: DirItem[]
  }
}

export interface Users {
  users: User[]
}

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