import * as Path from "path";
import * as fs from "fs";
import {GitFile, FsFile, PerlPackage, PerlCriticResult} from "./service-spec";
let rootDir = Path.join(__dirname, "../..")
import * as fs2 from "./fs3";

export class P5Service {

    async  fs_list_files(req: { path: string }): Promise<FsFile> {
        let path = req.path || ".";
        let stat = await fs2.stat(path);
        let file: FsFile = { path: path, is_dir: stat.isDirectory() };
        if (stat.isFile())
            return file;
        let childNames = await fs2.readdir(file.path);
        let childPaths = childNames.map(t => Path.join(path, t));
        let childStats = await fs2.stats(childPaths);
        file.children = childNames.map((name, i) => <FsFile>{
            path: name,
            is_dir: childStats[i].isDirectory(),
        });
        return file;
    }
    fs_get_file(req: { path: string, contents?: boolean }): Promise<FsFile> {
        return null;
    }

    git_list_files(req: { treeId: string, path: string }): Promise<GitFile> {
        return null;
    }

    perl_resolve_packages(req: { packageNames: string[] }): Promise<PerlPackage[]> {
        return null;
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
