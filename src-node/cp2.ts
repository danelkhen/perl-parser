import * as cp from "child_process";

export function exec(command: string, options?: {
    cwd?: string;
    stdio?: any;
    customFds?: any;
    env?: any;
    encoding?: string;
    timeout?: number;
    maxBuffer?: number;
    killSignal?: string;
}): Promise<{ error: Error, stdout: Buffer, stderr: Buffer, childProcess: cp.ChildProcess }> {
    return new Promise((resolve, reject) => {
        let childProcess;
        childProcess = cp.exec(command, options, (error, stdout, stderr) => resolve({ error, stdout, stderr, childProcess }));
    });
}

