import * as fs from "fs";

function handle<T>(resolve: (value?: T | PromiseLike<T>) => void, reject: (reason?: any) => void) {
    return function (err: NodeJS.ErrnoException, res: T) {
        if (err)
            reject(err);
        else
            resolve(res);
    }
}
export async function stat(path: string): Promise<fs.Stats> {
    return new Promise<fs.Stats>((resolve, reject) => fs.stat(path, handle(resolve, reject)));
}
export async function stats(paths: string[]): Promise<fs.Stats[]> {
    let stats: fs.Stats[] = [];
    for (let path of paths)
        stats.push(await this.stat(path));
    return stats;
}
export async function readdir(path: string): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => fs.readdir(path, handle(resolve, reject)));
}

export async function readFile(path: string): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => fs.readFile(path, handle(resolve, reject)));
}
