export function isNullOrEmpty(x: string | Array<any>): boolean {
    return x == null || x.length == 0;
}
export function isNotNullOrEmpty(x: string | Array<any>): boolean {
    return x != null && x.length > 0;
}
