import * as Path from "path";
import * as fs from "fs";
import { GitFile, FsFile, PerlPackage, PerlCriticResult } from "./service-spec";
import * as fs2 from "./fs3";
import * as ChildProcess from "child_process"
import { isNullOrEmpty, isNotNullOrEmpty } from "./utils";
import { GitBlameParser } from "./git-blame-parser"

export class P5Service {
    constructor() {
        this.rootDir = process.cwd();// Path.join(__dirname, "../..")
        console.log(this.rootDir);
    }
    rootDir: string;
    mapPath(path: string): string {
        if (path == null)
            return null;
        return Path.join(this.rootDir, path);
    }
    mapPathBack(path: string): string {
        if (path == null)
            return null;
        let x = Path.relative(this.rootDir, path);
        let y = this.normalize(x);
        //console.log("mapPathBack", { path, x, y });
        return y;
    }
    normalize(path: string): string {
        if ([undefined, null, "", "."].contains(path))
            return "/";
        return path.replaceAll("\\", "/");
    }

    ls(req: PathRequest): Promise<FsFile> {
        let userPath = this.normalize(req.path);
        let path = this.mapPath(userPath);
        console.log("ls", { userPath, path });
        let stat = fs.statSync(path);
        let file: FsFile = { path: userPath, is_dir: stat.isDirectory() };
        if (stat.isFile())
            return Promise.resolve(file);
        let childNames = fs.readdirSync(path);
        let childPaths = childNames.map(t => Path.join(path, t));
        let childStats = childPaths.map(t => fs.statSync(t));
        file.children = childNames.map((name, i) => <FsFile>{ path: name, is_dir: childStats[i].isDirectory(), });
        return Promise.resolve(file);
    }
    cat(req: PathRequest): Promise<Buffer> {
        let path = this.mapPath(req.path);
        let contents = fs.readFileSync(path);
        return Promise.resolve(contents);
    }

    perldocs(reqs: PerlDocRequest[]): Promise<string[]> {
        return Promise.resolve(Promise.all(reqs.map(t => this.perldoc(t).catch(err => { }))));
    }

    exec(req: ExecRequest): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            let cmd = req.cmd;
            let output: string[] = [];
            let process = ChildProcess.exec(cmd, { cwd: req.cwd }, (err, stdout, stderr) => {
                output.push(stdout);
                output.push(stderr);
            });
            process.on("close", e => {
                resolve(output.join(""));
            });
        });
    }
    perldoc(req: PerlDocRequest): Promise<string> {
        console.log("perldoc", { req });
        let cmd = "perldoc";
        if (req.format != null)
            cmd += " -o" + req.format;
        if (isNotNullOrEmpty(req.filename))
            cmd += " " + req.filename;
        else if (isNotNullOrEmpty(req.moduleName))
            cmd += " " + req.moduleName;
        else if (isNotNullOrEmpty(req.funcName))
            cmd += " -f " + req.funcName;
        return this.exec({ cmd });
    }

    git_list_files(req: { treeId: string, path: string }): Promise<GitFile> {
        return null;
    }

    /**
     * resolve perl module
     * @param req
     */
    perlres(req: PerlResRequest): Promise<PerlModuleClassify[]> {
        let path = this.mapPath(req.path);
        let perlRoot = this.determinePerlRoot(path); //use PERL5LIB
        console.log("perlres", { path, perlRoot });
        let res = req.packageNames.map(t => {
            let x: PerlModuleClassify = {
                name: t,
                url: null,
                path: this.mapPathBack(this.resolvePerlModuleFilename(perlRoot, t)),
                is_core: null,
                is_local: true,
            };
            return x;
        });
        return Promise.resolve(res);
    }

    /**
     *  
     * @param path
     * @param name
     */
    closest(path2: string, name: string): string {
        let i = 0;
        let path = path2;
        while (path.length > 0 && i < 100) {
            console.log("closest", { path, name, path2 });
            let expectedDir = Path.join(path, name);
            if (fs.existsSync(expectedDir))
                return expectedDir;
            let path3 = Path.dirname(path);
            if (path == path3)
                break;
            path = path3;
            i++;
        }
        return null;
    }

    determineGitRoot(path: string): string {
        if (!fs.existsSync(path))
            return null;
        let gitRoot = this.closest(path, ".git");
        if (gitRoot == null)
            return null;
        return Path.dirname(gitRoot);
    }
    determinePerlRoot(path: string): string {
        console.log("determinePerlRoot", { path });
        if (!fs.existsSync(path))
            return null;
        let gitRoot = this.determineGitRoot(path);
        console.log("determinePerlRoot", { path, gitRoot });
        if (gitRoot == null)
            return null;
        let root = Path.join(gitRoot, "lib")
        console.log("determinePerlRoot", { path, gitRoot, root });
        if (fs.existsSync(root))
            return root;
        return null;
    }

    flatten(list: any[]): any[] {
        let list2 = [];
        list.forEach(t => {
            if (t instanceof Array)
                list2.addRange(this.flatten(t));
            else
                list2.add(t);
        });
        return list2;
    }
    pathJoin(list: any[]): string {
        let list2: string[] = this.flatten(list);
        console.log("pathJoin", { list, list2 });
        return Path.join.apply(Path, list2);
    }
    resolvePerlModuleFilename(rootDir: string, name: string): string {
        let filename = this.pathJoin([rootDir, name.split("::")]) + ".pm";
        console.log("resolvePerlModuleFilename", { rootDir, name, filename });
        if (!fs.existsSync(filename))
            return null;
        return filename;
    }

    git_blame(req: GitBlameRequest): Promise<GitBlameItem[]> {
        let path = this.mapPath(req.path);
        let cmd = `git blame --porcelain ${Path.basename(path)}`;
        let cwd = Path.dirname(path);
        console.log(cwd, cmd);
        return this.exec({ cmd, cwd }).then(res => {
            let x = new GitBlameParser()
            if (!x.parse(res))
                return null;
            return Object.keys(x.infoByFinalLine).map(key => {
                let li = x.infoByFinalLine[key];
                let commit = x.commitBySha1[li.sha1];
                let item: GitBlameItem = {
                    sha: li.sha1,
                    line_num: li.finalLine,
                    author: commit.author,
                    date: Date.fromUnix(parseInt(commit.committerTime)).format("yyyy-MM-dd HH:mm:ss"),
                };
                return item;
            });
        });
    }

    git_show(req: GitShowRequest): Promise<GitShow> {
        //>git show --date=iso --raw 0789bd3eddbd7531fa3e4b3f43083cdf636519c8
        //:100644 100644 19c843c... f3d4b91... M  typings.json
        let path = this.mapPath(req.path);
        let cmd = `git show --date=iso --raw ${req.sha}`;
        let cwd = Path.dirname(path);
        console.log(cwd, cmd);
        return this.exec({ cmd, cwd }).then(res => {
            let item: GitShow = null;
            let msg: string[] = [];
            res.lines().forEach(line => {
                if (line.startsWith("commit ")) {
                    item = {
                        sha: line.split(' ')[1],
                        files: [],
                        date: '',
                        author: { name: '', email: '' },
                        message: '',
                    };
                }
                else if (line.startsWith("Author: ")) {
                    item.author.name = line.split(' ')[1];
                    item.author.email = line.substringBetween("<", ">");
                }
                else if (line.startsWith("Date: ")) {
                    item.date = line.split(' ').skip(1).join(" ");
                    item.author.email = line.substringBetween("<", ">");
                }
                else if (line.startsWith("    ")) {
                    if (item.message == null)
                        item.message = line.trim();
                    else
                        item.message += "\n" + line.trim();
                }
                else if (line.startsWith(":")) {
                    let tokens = line.split(" ");
                    let actionAndFilename = tokens[4].split('\t');
                    let filename = actionAndFilename[1];
                    item.files.push({ path: filename, action: actionAndFilename[0] });
                }
            });
            if (item != null)
                item.message = msg.join("\n");
            return item;
        }).then(res => {
            let gitRoot = this.determineGitRoot(path);
            res.files.forEach(t => t.path = this.gitPathToUserPath(gitRoot, t.path));
            return res;
        });
    }

    gitPathToUserPath(gitRoot: string, gitPath: string): string {
        let filename2 = Path.join(gitRoot, gitPath);
        let filename3 = this.normalize(Path.relative(this.rootDir, filename2));
        return filename3;
    }

    git_log(req: GitLogRequest): Promise<GitLogItem[]> {
        let path = this.mapPath(req.path);
        let cmd = `git log --date=iso ${Path.basename(path)}`;
        let cwd = Path.dirname(path);
        console.log(cwd, cmd);
        return this.exec({ cmd, cwd }).then(res => {
            let item: GitLogItem = null;
            let list: GitLogItem[] = [];
            let msg: string[] = [];
            res.lines().forEach(line => {
                if (line.startsWith("commit ")) {
                    if (item != null) {
                        item.message = msg.join("\n");
                        msg = [];
                    }
                    item = {
                        sha: line.split(' ')[1],
                        author: { email: '', name: '' },
                        date: '',
                        message: '',
                    };
                    list.add(item);
                }
                else if (line.startsWith("Author: ")) {
                    item.author.name = line.split(' ')[1];
                    item.author.email = line.substringBetween("<", ">");
                }
                else if (line.startsWith("Date: ")) {
                    item.date = line.split(' ').skip(1).join(" ");
                    item.author.email = line.substringBetween("<", ">");
                }
                else {
                    msg.push(line.trim());
                }
            });
            if (item != null)
                item.message = msg.join("\n");
            return list;
        });
    }

    git_grep(req: GitGrepRequest): Promise<GitGrepItem[]> {
        let path = this.mapPath(req.path);
        let cmd = `git grep ${quote(req.search)}`;
        let cwd = path.endsWith("/") ? path : Path.dirname(path);
        console.log(cwd, cmd);
        return this.exec({ cmd, cwd }).then(res => {
            let item: GitGrepItem = null;
            let list: GitGrepItem[] = [];
            res.lines().forEach(line => {
                if (line.length == 0)
                    return;
                let parts = line.splitAt(line.indexOf(":"));
                let filename = parts[0];
                if (item == null || item.path != filename) {
                    item = { path: filename, matches: [], }
                    list.add(item);
                }
                item.matches.add({
                    line: parts[1].substr(1),
                    line_num: null, //TODO:
                });
            });
            return list;
        }).then(list => {
            let gitRoot = this.determineGitRoot(path);
            list.forEach(t => t.path = this.gitPathToUserPath(gitRoot, t.path));
            return list;
        });
    }


}

export interface GitGrepRequest extends PathRequest {
    search: string;
}
export interface GitGrepItem {
    matches: GitGrepMatch[];
    path: string;
}
export interface GitGrepMatch {
    line: string;
    line_num: number;
}


export interface GitShow {
    author: GitAuthor;
    date: string;
    files: GitShowFile[];
    message: string;
    sha: string;
}

export interface GitShowFile {
    action: string;
    path: string;
    added?: number;
    removed?: number;
}


export interface GitShowRequest extends PathRequest {
    sha: string;
}

export interface GitLogRequest extends PathRequest {
}

export interface GitBlameRequest extends PathRequest {
}

export interface GitBlameItem {
    author: string;
    date: string;
    line_num: number;
    sha: string;
}

export interface PathRequest {
    path: string;
}


export interface PerlModuleClassify {
    is_core: boolean;
    is_local: boolean;
    name: string;
    path: string;
    url: string;
}
export interface PerlDocRequest {
    moduleName?: string;
    funcName?: string;
    filename?: string;
    format?: string;
}


export interface PerlResRequest {
    path: string;
    packageNames: string[];
}
export interface ExecRequest {
    cmd: string;
    cwd?: string;
}

export interface GitLogItem {
    author: GitAuthor;
    date: string;
    message: string;
    sha: string;
}
export interface GitAuthor {
    email: string;
    name: string;
}

function quote(s: string): string {
    if (s == null)
        return "";
    return "\"" + s + "\"";
}
