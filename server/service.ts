import * as Path from "path";
import * as fs from "fs";
import { GitFile, FsFile, PerlPackage, PerlCriticResult } from "./service-spec";
import * as fs2 from "./fs3";
import * as ChildProcess from "child_process"
import { isNullOrEmpty, isNotNullOrEmpty } from "./utils";

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
        console.log("mapPathBack", { path, x, y });
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

        //TODO:
        //let output:string[] = [];

        //let process = ChildProcess.exec(cmd, (err, stdout, stderr) => {
        //    console.log("exec", {err,stdout, stderr});
        //    output.push(stdout);
        //    output.push(stderr);
            
        //});
        

        try {
            console.log("execSync", cmd);
            let res = ChildProcess.execSync(cmd, { encoding: "utf8" });
            return Promise.resolve(res);
        }
        catch (e) {
            return Promise.reject("perldoc failed");
        }
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

    perl_get_dependencies(req: { name: string, depth?: number }): Promise<PerlPackage> {
        return null;
    }
    perl_critic(req: { path: string, critic_config_filename?: string }): Promise<PerlCriticResult> {
        return null;
    }
    perl_doc(req: { name: string, type?: string }): Promise<PerlCriticResult> {
        return null;
    }

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
