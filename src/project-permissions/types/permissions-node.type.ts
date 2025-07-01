export interface PermissionNode {
  [key: string]: boolean | PermissionNode;
}
