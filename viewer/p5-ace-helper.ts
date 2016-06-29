import {
    AstNode, TextFile, Unit, Package, Global, Token, TextFilePos, Tokenizer, EtReport, AstNodeFixator, AstWriter,
    TokenTypes, RefArrayToRefUtil, ExpressionTester, AstQuery, EntityResolver, Expression, InvocationExpression,
    NamedMemberExpression, Logger, Parser, SubroutineExpression, TokenReader, Entity, Subroutine, Member,
    TextFileRange,
} from "perl-parser";
import {PackageResolution, Helper, TokenUtils, CancellablePromise} from "./common";
import {P5Service, P5File, CritiqueResponse, CritiqueViolation, GitBlameItem, PerlDocRequest, GitLogItem, GitShow, GitShowFile, GitGrepItem, GitGrepMatch} from "./p5-service";
import {PropertyChangeTracker, ObjProperty} from "./property-change-tracker";
import {PerlModuleClassify} from "./p5-service";
import {PopupMarker} from "./p5-ace-editor";
import "./extensions";
import { monitor, Monitor} from "./monitor";
import { PerlFile        } from "./perl-file";
import "ace/ext/linking";
import "ace/ext/language_tools";

import * as ace         from "ace/ace";
import * as ModeList    from "ace/ext/modelist";
import * as aceConfig   from "ace/config";

import {Annotation as AceAnnotation} from "ace/annotation";
import {snippetCompleter, textCompleter, keyWordCompleter} from "ace/ext/language_tools";

import { Editor          } from "ace/editor";
import { IEditSession    } from "ace/edit_session";
import { Range           } from "ace/range";
import { TokenInfo       } from "ace/token_info";
import { TokenIterator   } from "ace/token_iterator";
import { Position        } from "ace/position";
import { MouseEvent as AceMouseEvent     } from "ace/mouse/mouse_event";
import { Tooltip         } from "ace/tooltip";
import { StatusBar       } from "ace/ext/statusbar";
import { Config          } from "ace/config";
import { EditSession     } from "ace/edit_session";
import { GutterRenderer  } from "ace/layer/gutter";
import { VirtualRenderer } from "ace/virtual_renderer";
import { Completer       } from "ace/ext/language_tools";
import { UndoManager     } from "ace/undomanager";
import { Autocomplete    } from "ace/autocomplete";
import {EventEmitter, SimpleEventEmitter } from "./common";



export class P5AceHelper {
    static createPopupHtmlFromEntity(x: Entity) {
        let info = <EntityInfo>{ name: x.name, docText: x.documentation, type: x.constructor.name };
        return this.createPopupHtml(info);
    }
    static createPopupHtml(x: EntityInfo) {
        if (x.docText != null && x.docHtml == null)
            x.docHtml = `<div class="pod">${this.toDocHtml(x.docText)}</div>`;
        let attsText = x.attributes != null && x.attributes.length > 0 ? `${x.attributes.join()} ` : "";
        let hrefAtt = x.href ? ` href="${x.href}"` : "";
        let html = `<div><div class="popup-header"><a target="_blank"${hrefAtt}>(${attsText}${x.type}) ${x.name}</a></div>${x.docHtml || ""}</div>`;
        return html;
    }

    static toDocHtml(text: string): string {
        if (text == null || text.length == 0)
            return text;
        let html = text.lines().map(t => `<p>${Helper.htmlEncode(t)}</p>`).join("");
        return html;
    }

    static toAcePosition(pos: TextFilePos): Position {
        return { row: pos.line - 1, column: pos.column - 1 };
    }
    static toAceRange(range: TextFileRange): Range {
        return new Range(range.start.line - 1, range.start.column - 1, range.end.line - 1, range.end.column - 1);
    }

    static toTextFilePos(pos: Position): TextFilePos {
        let pos2 = new TextFilePos();
        pos2.line = pos.row + 1;
        pos2.column = pos.column + 1;
        return pos2;
    }


}


export class EntityType {
    static package = "package";
    static builtinFunction = "builtinFunction";
    static subroutine = "subroutine";
}
export interface EntityInfo {
    name: string;
    /** package, builtinFunction, subroutine - EntityType.X */
    type: string;
    attributes?: string[];
    docHtml?: string;
    docText?: string;
    href?: string;
    /** if it's a package, the resolution response */
    resolvedPackage?: PerlModuleClassify;
}
