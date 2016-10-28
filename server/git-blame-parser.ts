export class GitBlameParser {
    
    commitBySha1: { [key: string]: CommitInfo } = {};
    infoByFinalLine: { [key: string]: LineInfo } = {};
    
    inCommitData = false;
    currentSha1 = "";
    currentFinalLine = 1;
    lines: string[];

    parse(gitBlamePorcelainOutput: string): boolean {
        this.lines = gitBlamePorcelainOutput.split('\n');
        if (this.lines.length == 0)
            return false;


        for (let line of this.lines) {
            if (line[0] == "\t") { // line of code starts with a tab
                this.infoByFinalLine[this.currentFinalLine].code = line.substr(1);
                this.inCommitData = false;
                this.currentSha1 = "";
            }
            else if (this.inCommitData) {
                var tokens = line.split(" ");
                this.parseCommitLine(tokens);
            }
            else {
                var tokens = line.split(" ");
                /*  40-byte SHA-1 of the commit the line is attributed to;
                    the line number of the line in the original file;
                    the line number of the line in the final file;
                    on a line that starts a group of lines from a different commit than the previous one, the number of lines in this group. On subsequent lines this field is absent.
                */
                if (tokens[0].length == 40) { // header line
                    let li: LineInfo = {
                        code: '',
                        sha1: tokens[0],
                        originalLine: parseInt(tokens[1]),
                        finalLine: parseInt(tokens[2]),
                        numLines: parseInt(tokens[3]),
                    };
                    this.infoByFinalLine[li.finalLine] = li;

                    this.currentSha1 = li.sha1;
                    this.currentFinalLine = li.finalLine;

                    if (this.commitBySha1[li.sha1] == null) {
                        this.inCommitData = true;
                        let ci: CommitInfo = { author: '', authorMail: '', authorTime: '', authorTz: '', committer: '', committerMail: '', committerTime: '', committerTz: '', summary: '', filename: '', previous: '' };
                        this.commitBySha1[li.sha1] = ci;
                    }
                }
            }
        }

        return true;
    }

    lineParsers: { [key: string]: (data: CommitInfo, tokens: string[]) => void } = {
        "author": (data, tokens) => data.author = tokens.slice(1).join(" "),
        "author-mail": (data, tokens) => data.authorMail = tokens[1],
        "author-time": (data, tokens) => data.authorTime = tokens[1],
        "author-tz": (data, tokens) => data.authorTz = tokens[1],
        "committer": (data, tokens) => data.committer = tokens.slice(1).join(" "),
        "committer-mail": (data, tokens) => data.committerMail = tokens[1],
        "committer-time": (data, tokens) => data.committerTime = tokens[1],
        "committer-tz": (data, tokens) => data.committerTz = tokens[1],
        "summary": (data, tokens) => data.summary = tokens.slice(1).join(" "),
        "filename": (data, tokens) => data.filename = tokens[1],
        "previous": (data, tokens) => data.previous = tokens.slice(1).join(" "),
    };

    parseCommitLine(tokens: string[]) {
        var data = this.commitBySha1[this.currentSha1];
        let func = this.lineParsers[tokens[0]];
        if (func == null)
            return;
        func(data, tokens);
    }
}

export interface CommitInfo {
    committer: string;
    committerMail: string;
    committerTime: string;
    committerTz: string;

    author: string;
    authorMail: string;
    authorTime: string;
    authorTz: string;

    summary: string;
    filename: string;

    previous: string;
}

export interface LineInfo {
    code: string;
    sha1: string;
    originalLine: number;
    finalLine: number;
    numLines: number;
}