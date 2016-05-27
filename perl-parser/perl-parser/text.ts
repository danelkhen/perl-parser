/// <reference path="extensions.ts" />
"use strict";

export class TextFileRange {
    constructor(public file: TextFile, public start: TextFilePos, public end?: TextFilePos) {
        if (this.end == null)
            this.end = this.start;
    }
    get index(): number { return this.start.index; }
    get length(): number { return this.end.index - this.start.index; }
    get text(): string { return this.file.text.substr(this.index, this.length); }
    containsPos(pos: TextFilePos): boolean {
        let start = this.start;
        let end = this.end;
        var contains = this.start.compareWith(pos) >= 0 && this.end.compareWith(pos) <= 0;
        return contains;
    }
}

export class TextFile {
    constructor(name, text) {
        this.name = name;
        this.text = text;
        this.scanNewLines();
    }
    name: string;
    text: string;

    get startPos(): TextFilePos { return this.getPos(0); }
    getLineStartIndex(line: number): number {
        if (line == 1)
            return 0;
        let res = this.newLineIndexes[line - 2] + 1;
        if (isNaN(res))
            return null;
        return res;
    }
    ////last index relative to start of line, without the line ending char. empty line has startIndex=endIndex=0
    //getLineEndIndex(line: number): number {
    //    let nextLineStartIndex = this.getLineStartIndex(line + 1);
    //    if (nextLineStartIndex == null)
    //        return this.text.length - 1;
    //    return nextLineStartIndex - 1;
    //}
    getLineText(line: number): string {
        return this.lines[line - 1];
    }
    findLine(index: number): number {
        let line = 1;
        for (let i = 0; i < this.newLineIndexes.length; i++) {
            let li = this.newLineIndexes[i];
            if (li >= index)
                break;
            line++;
        }
        return line;
    }
    getPos3(line: number, column: number): TextFilePos {
        let lineStartIndex = this.getLineStartIndex(line);
        let lineStartPos = this.getPos(lineStartIndex);
        let pos = this.getPos2(lineStartPos, column-1);
        return pos;
    }
    getPos(index: number): TextFilePos {
        let line = this.findLine(index);
        let lineIndex = this.getLineStartIndex(line);
        let pos = new TextFilePos();
        pos.line = line; //lineIndex + 1;
        pos.column = index - lineIndex + 1;
        pos.index = index;
        if (pos.column == 0)
            throw new Error();
        pos.file = this;
        return pos;
    }
    getPos2(start: TextFilePos, length: number) {
        if (length == 0)
            return start;
        let col = start.column;
        let line = start.line;
        let index = start.index;
        for (let i = 1; i <= length; i++) {
            index++;
            if (start.file.text[index - 1] == "\n") {
                line++;
                col = 1;
            }
            else {
                col++
            }
        }
        let pos = new TextFilePos();
        pos.file = start.file;
        pos.line = line;
        pos.column = col;
        pos.index = index;
        return pos;
    }
    getRange(index: number, length: number): TextFileRange {
        let start = this.getPos(index);
        let end = this.getPos(index + length);
        let range = new TextFileRange(this, start, end);
        return range;
    }
    getRange2(start: TextFilePos, length: number): TextFileRange {
        let end = this.getPos2(start, length);
        let range = new TextFileRange(this, start, end);
        return range;
    }

    lines: string[];
    scanNewLines() {
        this.lines = this.text.split(/\n/g);
        let regex = /\n/g;
        while (true) {
            let match = regex.exec(this.text);
            if (match == null)
                break;
            this.newLineIndexes.push(match.index);
        }
    }
    newLineIndexes: number[] = [];
}

export class TextFilePos {
    line: number;
    column: number;
    index: number;
    file: TextFile;
    skip(length: number): TextFilePos {
        return this.file.getPos2(this, length);//this.index + length);
    }
    selectNext(length: number): TextFileRange {
        return this.file.getRange2(this, length);
    }
    _nextText: string;
    get nextText(): string {
        if (this._nextText == null)
            this._nextText = this.file.text.substr(this.index);
        return this._nextText;
    }
    evalNext(regex: RegExp): TextFileRange {
        var res = regex.exec(this.nextText);
        if (res == null)
            return null;
        let start = this.skip(res.index);
        let range = start.selectNext(res[0].length);
        return range;
    }
    next(length: number): string {
        return this.file.text.substr(this.index, length);
    }

    startsWith(s: string): boolean {
        return this.next(s.length) == s;
    }

    equalsTo(pos: TextFilePos): boolean {
        return this.compareWith(pos) == 0;
    }
    compareWith(pos: TextFilePos): number {
        if (pos.line == this.line) {
            if (pos.column == this.column)
                return 0;
            return pos.column - this.column;
        }
        return pos.line - this.line;
    }

}


export class Cursor {
    constructor(public pos: TextFilePos) {
    }

    clone(): Cursor {
        return new Cursor(this.pos);
    }
    get file(): TextFile { return this.pos.file; }
    get src(): string { return this.file.text; }
    get index(): number { return this.pos.index; }
    startsWith(s: string): boolean {
        return this.pos.startsWith(s);
    }
    next(regex: RegExp): TextFileRange {
        return this.pos.evalNext(regex);
    }

    nextAny(list: RegExp[]): TextFileRange {
        return list.selectFirstNonNull(t => this.next(t));
    }
    captureAny(list: RegExp[]): TextFileRange {
        return list.selectFirstNonNull(t => this.capture(t));
    }

    capture(regex: RegExp): TextFileRange {
        let regex2 = regex;
        let s = this.src.substr(this.index);
        var res = regex2.exec(s);
        if (res == null || res[1] == null) //res.length <= 1
            return null;
        let index = s.indexOf(res[1]);
        let range = this.file.getRange(this.index + index, res[1].length);
        return range;
    }


}



