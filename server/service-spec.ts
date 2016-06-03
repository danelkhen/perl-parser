export interface P5Service {
    
    fs_list_files(req: { path: string }): FsFile[];
    fs_get_file(req: { path: string, contents?: boolean }): FsFile;

    git_list_files(req: { treeId: string, path: string }): GitFile;

    perl_resolve_packages(req: { packageNames: string[] }): PerlPackage[];
    perl_get_dependencies(req: { name: string, depth?: number }): PerlPackage;
    perl_critic(req: { path: string, critic_config_filename?: string }): PerlCriticResult;
    perl_doc(req: { name: string, type?: string }): PerlCriticResult;

}

export interface GitFile {
    id: string;
    path: string;
}

export interface FsFile {
    path: string;
    is_dir:boolean;
    children?:FsFile[];
}
export interface PerlPackage {
    name: string;
    dependencies: PerlPackage[];
}
export interface PerlCriticResult {
}