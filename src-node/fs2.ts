import * as fs from "fs";

exports.readFile = function () {
    var args = Array.from(arguments);
    return new Promise((resolve, reject) => {
        args.push((err, data) => resolve({ err, data }));
        fs.readFile.apply(fs, args);
    });
}

exports.writeFile = function () {
    var args = Array.from(arguments);
    return new Promise((resolve, reject) => {
        args.push(err => resolve({ err }));
        fs.writeFile.apply(fs, args);
    });
}

exports.appendFile = function () {
    var args = Array.from(arguments);
    return new Promise((resolve, reject) => {
        args.push(err => resolve({ err }));
        fs.appendFile.apply(fs, args);
    });
}


/*
 * Asynchronous unlink - deletes the file specified in {path}
 *
 * @param path
 * @param callback No arguments other than a possible exception are given to the completion callback.
 */
export function unlink(path: string): Promise<{ err?: NodeJS.ErrnoException }> {
    return new Promise((resolve, reject) => fs.unlink(path, err => resolve({err})));
}

///**
// * Asynchronous rename.
// * @param oldPath
// * @param newPath
// * @param callback No arguments other than a possible exception are given to the completion callback.
// */
//export declare function rename(oldPath: string, newPath: string, callback?: (err?: NodeJS.ErrnoException) => void): void;
///**
// * Synchronous rename
// * @param oldPath
// * @param newPath
// */
//export declare function renameSync(oldPath: string, newPath: string): void;
//export declare function truncate(path: string, callback?: (err?: NodeJS.ErrnoException) => void): void;
//export declare function truncate(path: string, len: number, callback?: (err?: NodeJS.ErrnoException) => void): void;
//export declare function truncateSync(path: string, len?: number): void;
//export declare function ftruncate(fd: number, callback?: (err?: NodeJS.ErrnoException) => void): void;
//export declare function ftruncate(fd: number, len: number, callback?: (err?: NodeJS.ErrnoException) => void): void;
//export declare function ftruncateSync(fd: number, len?: number): void;
//export declare function chown(path: string, uid: number, gid: number, callback?: (err?: NodeJS.ErrnoException) => void): void;
//export declare function chownSync(path: string, uid: number, gid: number): void;
//export declare function fchown(fd: number, uid: number, gid: number, callback?: (err?: NodeJS.ErrnoException) => void): void;
//export declare function fchownSync(fd: number, uid: number, gid: number): void;
//export declare function lchown(path: string, uid: number, gid: number, callback?: (err?: NodeJS.ErrnoException) => void): void;
//export declare function lchownSync(path: string, uid: number, gid: number): void;
//export declare function chmod(path: string, mode: number, callback?: (err?: NodeJS.ErrnoException) => void): void;
//export declare function chmod(path: string, mode: string, callback?: (err?: NodeJS.ErrnoException) => void): void;
//export declare function chmodSync(path: string, mode: number): void;
//export declare function chmodSync(path: string, mode: string): void;
//export declare function fchmod(fd: number, mode: number, callback?: (err?: NodeJS.ErrnoException) => void): void;
//export declare function fchmod(fd: number, mode: string, callback?: (err?: NodeJS.ErrnoException) => void): void;
//export declare function fchmodSync(fd: number, mode: number): void;
//export declare function fchmodSync(fd: number, mode: string): void;
//export declare function lchmod(path: string, mode: number, callback?: (err?: NodeJS.ErrnoException) => void): void;
//export declare function lchmod(path: string, mode: string, callback?: (err?: NodeJS.ErrnoException) => void): void;
//export declare function lchmodSync(path: string, mode: number): void;
//export declare function lchmodSync(path: string, mode: string): void;
//export declare function stat(path: string, callback?: (err: NodeJS.ErrnoException, stats: Stats) => any): void;
//export declare function lstat(path: string, callback?: (err: NodeJS.ErrnoException, stats: Stats) => any): void;
//export declare function fstat(fd: number, callback?: (err: NodeJS.ErrnoException, stats: Stats) => any): void;
//export declare function statSync(path: string): Stats;
//export declare function lstatSync(path: string): Stats;
//export declare function fstatSync(fd: number): Stats;
//export declare function link(srcpath: string, dstpath: string, callback?: (err?: NodeJS.ErrnoException) => void): void;
//export declare function linkSync(srcpath: string, dstpath: string): void;
//export declare function symlink(srcpath: string, dstpath: string, type?: string, callback?: (err?: NodeJS.ErrnoException) => void): void;
//export declare function symlinkSync(srcpath: string, dstpath: string, type?: string): void;
//export declare function readlink(path: string, callback?: (err: NodeJS.ErrnoException, linkString: string) => any): void;
//export declare function readlinkSync(path: string): string;
//export declare function realpath(path: string, callback?: (err: NodeJS.ErrnoException, resolvedPath: string) => any): void;
//export declare function realpath(path: string, cache: { [path: string]: string }, callback: (err: NodeJS.ErrnoException, resolvedPath: string) => any): void;
//export declare function realpathSync(path: string, cache?: { [path: string]: string }): string;
///*
// * Asynchronous unlink - deletes the file specified in {path}
// *
// * @param path
// * @param callback No arguments other than a possible exception are given to the completion callback.
// */
//export declare function unlink(path: string, callback?: (err?: NodeJS.ErrnoException) => void): void;
///*
// * Synchronous unlink - deletes the file specified in {path}
// *
// * @param path
// */
//export declare function unlinkSync(path: string): void;
///*
// * Asynchronous rmdir - removes the directory specified in {path}
// *
// * @param path
// * @param callback No arguments other than a possible exception are given to the completion callback.
// */
//export declare function rmdir(path: string, callback?: (err?: NodeJS.ErrnoException) => void): void;
///*
// * Synchronous rmdir - removes the directory specified in {path}
// *
// * @param path
// */
//export declare function rmdirSync(path: string): void;
///*
// * Asynchronous mkdir - creates the directory specified in {path}.  Parameter {mode} defaults to 0777.
// *
// * @param path
// * @param callback No arguments other than a possible exception are given to the completion callback.
// */
//export declare function mkdir(path: string, callback?: (err?: NodeJS.ErrnoException) => void): void;
///*
// * Asynchronous mkdir - creates the directory specified in {path}.  Parameter {mode} defaults to 0777.
// *
// * @param path
// * @param mode
// * @param callback No arguments other than a possible exception are given to the completion callback.
// */
//export declare function mkdir(path: string, mode: number, callback?: (err?: NodeJS.ErrnoException) => void): void;
///*
// * Asynchronous mkdir - creates the directory specified in {path}.  Parameter {mode} defaults to 0777.
// *
// * @param path
// * @param mode
// * @param callback No arguments other than a possible exception are given to the completion callback.
// */
//export declare function mkdir(path: string, mode: string, callback?: (err?: NodeJS.ErrnoException) => void): void;
///*
// * Synchronous mkdir - creates the directory specified in {path}.  Parameter {mode} defaults to 0777.
// *
// * @param path
// * @param mode
// * @param callback No arguments other than a possible exception are given to the completion callback.
// */
//export declare function mkdirSync(path: string, mode?: number): void;
///*
// * Synchronous mkdir - creates the directory specified in {path}.  Parameter {mode} defaults to 0777.
// *
// * @param path
// * @param mode
// * @param callback No arguments other than a possible exception are given to the completion callback.
// */
//export declare function mkdirSync(path: string, mode?: string): void;
//export declare function readdir(path: string, callback?: (err: NodeJS.ErrnoException, files: string[]) => void): void;
//export declare function readdirSync(path: string): string[];
//export declare function close(fd: number, callback?: (err?: NodeJS.ErrnoException) => void): void;
//export declare function closeSync(fd: number): void;
//export declare function open(path: string, flags: string, callback?: (err: NodeJS.ErrnoException, fd: number) => any): void;
//export declare function open(path: string, flags: string, mode: number, callback?: (err: NodeJS.ErrnoException, fd: number) => any): void;
//export declare function open(path: string, flags: string, mode: string, callback?: (err: NodeJS.ErrnoException, fd: number) => any): void;
//export declare function openSync(path: string, flags: string, mode?: number): number;
//export declare function openSync(path: string, flags: string, mode?: string): number;
//export declare function utimes(path: string, atime: number, mtime: number, callback?: (err?: NodeJS.ErrnoException) => void): void;
//export declare function utimes(path: string, atime: Date, mtime: Date, callback?: (err?: NodeJS.ErrnoException) => void): void;
//export declare function utimesSync(path: string, atime: number, mtime: number): void;
//export declare function utimesSync(path: string, atime: Date, mtime: Date): void;
//export declare function futimes(fd: number, atime: number, mtime: number, callback?: (err?: NodeJS.ErrnoException) => void): void;
//export declare function futimes(fd: number, atime: Date, mtime: Date, callback?: (err?: NodeJS.ErrnoException) => void): void;
//export declare function futimesSync(fd: number, atime: number, mtime: number): void;
//export declare function futimesSync(fd: number, atime: Date, mtime: Date): void;
//export declare function fsync(fd: number, callback?: (err?: NodeJS.ErrnoException) => void): void;
//export declare function fsyncSync(fd: number): void;
//export declare function write(fd: number, buffer: Buffer, offset: number, length: number, position: number, callback?: (err: NodeJS.ErrnoException, written: number, buffer: Buffer) => void): void;
//export declare function write(fd: number, buffer: Buffer, offset: number, length: number, callback?: (err: NodeJS.ErrnoException, written: number, buffer: Buffer) => void): void;
//export declare function write(fd: number, data: any, callback?: (err: NodeJS.ErrnoException, written: number, str: string) => void): void;
//export declare function write(fd: number, data: any, offset: number, callback?: (err: NodeJS.ErrnoException, written: number, str: string) => void): void;
//export declare function write(fd: number, data: any, offset: number, encoding: string, callback?: (err: NodeJS.ErrnoException, written: number, str: string) => void): void;
//export declare function writeSync(fd: number, buffer: Buffer, offset: number, length: number, position: number): number;
//export declare function read(fd: number, buffer: Buffer, offset: number, length: number, position: number, callback?: (err: NodeJS.ErrnoException, bytesRead: number, buffer: Buffer) => void): void;
//export declare function readSync(fd: number, buffer: Buffer, offset: number, length: number, position: number): number;

/*
 * Asynchronous readFile - Asynchronously reads the entire contents of a file.
 *
 * @param fileName
 * @param encoding
 * @param callback - The callback is passed two arguments (err, data), where data is the contents of the file.
 */
export declare function readFile(filename: string, encoding: string): Promise<{ err: NodeJS.ErrnoException, data: string }>;
/*
 * Asynchronous readFile - Asynchronously reads the entire contents of a file.
 *
 * @param fileName
 * @param options An object with optional {encoding} and {flag} properties.  If {encoding} is specified, readFile returns a string; otherwise it returns a Buffer.
 * @param callback - The callback is passed two arguments (err, data), where data is the contents of the file.
 */
export declare function readFile(filename: string, options: { encoding: string; flag?: string; }): Promise<{ err: NodeJS.ErrnoException, data: string }>;
/*
 * Asynchronous readFile - Asynchronously reads the entire contents of a file.
 *
 * @param fileName
 * @param options An object with optional {encoding} and {flag} properties.  If {encoding} is specified, readFile returns a string; otherwise it returns a Buffer.
 * @param callback - The callback is passed two arguments (err, data), where data is the contents of the file.
 */
export declare function readFile(filename: string, options: { flag?: string; }): Promise<{ err: NodeJS.ErrnoException, data: Buffer }>;//, callback: (err: NodeJS.ErrnoException, data: Buffer) => void): void;
/*
 * Asynchronous readFile - Asynchronously reads the entire contents of a file.
 *
 * @param fileName
 * @param callback - The callback is passed two arguments (err, data), where data is the contents of the file.
 */
export declare function readFile(filename: string): Promise<{ err: NodeJS.ErrnoException, data: Buffer }>;
/*
 * Synchronous readFile - Synchronously reads the entire contents of a file.
 *
 * @param fileName
 * @param encoding
 */

//export declare function readFileSync(filename: string, encoding: string): string;
///*
// * Synchronous readFile - Synchronously reads the entire contents of a file.
// *
// * @param fileName
// * @param options An object with optional {encoding} and {flag} properties.  If {encoding} is specified, readFileSync returns a string; otherwise it returns a Buffer.
// */
//export declare function readFileSync(filename: string, options: { encoding: string; flag?: string; }): string;
///*
// * Synchronous readFile - Synchronously reads the entire contents of a file.
// *
// * @param fileName
// * @param options An object with optional {encoding} and {flag} properties.  If {encoding} is specified, readFileSync returns a string; otherwise it returns a Buffer.
// */
//export declare function readFileSync(filename: string, options?: { flag?: string; }): Buffer;
export declare function writeFile(filename: string, data: any): Promise<{ err: NodeJS.ErrnoException }>;
export declare function writeFile(filename: string, data: any, options: { encoding?: string; mode?: number; flag?: string; }): Promise<{ err: NodeJS.ErrnoException }>;
export declare function writeFile(filename: string, data: any, options: { encoding?: string; mode?: string; flag?: string; }): Promise<{ err: NodeJS.ErrnoException }>;
//export declare function writeFileSync(filename: string, data: any, options?: { encoding?: string; mode?: number; flag?: string; }): void;
//export declare function writeFileSync(filename: string, data: any, options?: { encoding?: string; mode?: string; flag?: string; }): void;
export declare function appendFile(filename: string, data: any, options: { encoding?: string; mode?: number; flag?: string; }): Promise<{ err: NodeJS.ErrnoException }>;
export declare function appendFile(filename: string, data: any, options: { encoding?: string; mode?: string; flag?: string; }): Promise<{ err: NodeJS.ErrnoException }>;
export declare function appendFile(filename: string, data: any): Promise<{ err: NodeJS.ErrnoException }>;
//export declare function appendFileSync(filename: string, data: any, options?: { encoding?: string; mode?: number; flag?: string; }): void;
//export declare function appendFileSync(filename: string, data: any, options?: { encoding?: string; mode?: string; flag?: string; }): void;
//export declare function watchFile(filename: string, listener: (curr: Stats, prev: Stats) => void): void;
//export declare function watchFile(filename: string, options: { persistent?: boolean; interval?: number; }, listener: (curr: Stats, prev: Stats) => void): void;
//export declare function unwatchFile(filename: string, listener?: (curr: Stats, prev: Stats) => void): void;
//export declare function watch(filename: string, listener?: (event: string, filename: string) => any): FSWatcher;
//export declare function watch(filename: string, options: { persistent?: boolean; }, listener?: (event: string, filename: string) => any): FSWatcher;
//export declare function exists(path: string, callback?: (exists: boolean) => void): void;
//export declare function existsSync(path: string): boolean;
///** Constant for fs.access(). File is visible to the calling process. */
//export var F_OK: number;
///** Constant for fs.access(). File can be read by the calling process. */
//export var R_OK: number;
///** Constant for fs.access(). File can be written by the calling process. */
//export var W_OK: number;
///** Constant for fs.access(). File can be executed by the calling process. */
//export var X_OK: number;
///** Tests a user's permissions for the file specified by path. */
//export declare function access(path: string, callback: (err: NodeJS.ErrnoException) => void): void;
//export declare function access(path: string, mode: number, callback: (err: NodeJS.ErrnoException) => void): void;
///** Synchronous version of fs.access. This throws if any accessibility checks fail, and does nothing otherwise. */
//export declare function accessSync(path: string, mode?: number): void;
//export declare function createReadStream(path: string, options?: {
//    flags?: string;
//    encoding?: string;
//    fd?: number;
//    mode?: number;
//    autoClose?: boolean;
//}): ReadStream;
//export declare function createWriteStream(path: string, options?: {
//    flags?: string;
//    encoding?: string;
//    fd?: number;
//    mode?: number;
//}): WriteStream;

