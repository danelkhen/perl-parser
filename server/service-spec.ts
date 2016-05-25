interface P5Service {
    
    fs_list_files(req: { path: string }): FsFile[];
    fs_get_file(req: { path: string, contents?: boolean }): FsFile;

    git_list_files(req: { treeId: string, path: string }): GitFile;

    perl_resolve_packages(req: { packageNames: string[] }): PerlPackage[];
    perl_get_dependencies(req: { name: string, depth?: number }): PerlPackage;
    perl_critic(req: { path: string, critic_config_filename?: string }): PerlCriticResult;
    perl_doc(req: { name: string, type?: string }): PerlCriticResult;

}

interface GitFile {
    id: string;
    path: string;
}

interface FsFile {
    path: string;
}
interface PerlPackage {
    name: string;
    dependencies: PerlPackage[];
}
interface PerlCriticResult {
}