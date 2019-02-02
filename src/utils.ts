import {
    ExtensionContext,
    commands,
    window,
    TextEditor,
    Position,
    Selection,
    Range,
    TextDocument,
    TextEditorEdit,
} from 'vscode';
import { parse, ParserOptions } from '@babel/parser';
import {
    Node as BabelNode,
    isStringLiteral as isBabelStringLiteral,
    isTemplateLiteral as isBabelTemplateLiteral,
    isDirective as isBabelDirective,
    traverse,
} from '@babel/types';
import { isArray, isObject, isNumber } from 'lodash';

export interface Boundary {
    start: number;
    end: number;
}
// export interface Modification {
//     action: 'insert' | 'delete',
//     location: number | Boundary,
//     value?: string
// }
export interface Modification {
    method: 'insert' | 'delete';
    params: any[];
}

export interface Node {
    type: string;
    start: number;
    end: number;
}

/* vscode stuff */
export function addCommand(
    name: string,
    fn: (...args: any[]) => any,
    context: ExtensionContext
) {
    const command = commands.registerCommand(name, fn);
    context.subscriptions.push(command);
}

export function addTextEditorCommand(
    name: string,
    fn: (textEditor: TextEditor, edit: TextEditorEdit, ...args: any[]) => any,
    context: ExtensionContext,
    thisObj: { commandName: string }
) {
    const command = commands.registerTextEditorCommand(name, fn, thisObj);
    context.subscriptions.push(command);
}

export function getExtensionName() {
    const packageJson = require('../package.json');
    return packageJson.displayName;
}

export function getCurrentEditor() {
    return window.activeTextEditor;
}

export function getCursor(editor: TextEditor) {
    return editor.document.offsetAt(editor.selection.active);
}
export function getCursors(editor: TextEditor) {
    return editor.selections.map(selection =>
        editor.document.offsetAt(selection.active)
    );
}

export function getFileText(editor: TextEditor) {
    return editor.document.getText();
}
export function getSelectedText(editor: TextEditor) {
    if (editor.selections.length > 0) {
        return editor.selections.map(selection =>
            editor.document.getText(selection)
        );
    }
    return [''];
}

export function getLanguage(editor: TextEditor) {
    return editor.document.languageId;
}

export function createRangeFromBoundary(
    document: TextDocument,
    boundary: Boundary
) {
    return new Range(
        document.positionAt(boundary.start),
        document.positionAt(boundary.end)
    );
}

export function createSelectionFromBoundary(
    document: TextDocument,
    boundary: Boundary
) {
    return new Selection(
        document.positionAt(boundary.start),
        document.positionAt(boundary.end)
    );
}

export async function deleteBetweenBoundary(
    editor: TextEditor,
    boundary: Boundary
) {
    if (boundary) {
        await editor.edit(editBuilder => {
            editBuilder.delete(
                createRangeFromBoundary(editor.document, boundary)
            );
        });
    }
}

function createModification(method, params) {
    return {
        method,
        params,
    };
}

export function createDeleteModification(
    document: TextDocument,
    boundary: Boundary
) {
    if (document && boundary) {
        return createModification('delete', [
            createRangeFromBoundary(document, boundary),
        ]);
    }
}

export function createReplaceModification(
    document: TextDocument,
    boundary: Boundary,
    value: string
) {
    if (document && boundary) {
        return createModification('replace', [
            createRangeFromBoundary(document, boundary),
            value,
        ]);
    }
}

export async function makeModifications(
    editor: TextEditor,
    modifications: Modification[]
) {
    await editor.edit(
        editBuilder => {
            modifications.forEach(modification => {
                if (modification) {
                    const { method, params } = modification;
                    //@ts-ignore
                    editBuilder[method](...params);
                }
            });
        },
        {
            undoStopBefore: true, //default=true
            undoStopAfter: true, //default=true
        }
    );
}

async function updateEditor(editor: TextEditor) {
    //I don't know of another way to update the editor without "editing" it,
    //so I'm just inserting an empty string at the beginning (ie. not changing
    //anything)
    await editor.edit(editBuilder => {
        editBuilder.insert(editor.document.positionAt(0), '');
    });
}

export async function setCursor(
    editor: TextEditor,
    offsets: number | number[]
) {
    if (!isArray(offsets)) {
        offsets = [offsets];
    }

    editor.selections = offsets.map(offset => {
        const pos = editor.document.positionAt(offset);
        return new Selection(pos, pos);
    });
    await updateEditor(editor);
}

export function notify(msg: any) {
    window.showInformationMessage('' + msg);
}

export function getWordAtPosition(
    editor: TextEditor | undefined,
    position: Position | undefined
) {
    if (editor && position) {
        const range = editor.document.getWordRangeAtPosition(position);

        //range will be undefined when there is no word at the position (ie.
        //it's whitespace or on a semicolon, bracket, etc)
        if (range) {
            return editor.document.getText(range);
        }

        //if I don't find a word at the position, return empty string
        return '';
    }
}

/* clipboard stuff */
export function writeToClipboard(str: string) {
    require('clipboardy').writeSync(str);
}
export function readFromClipboard() {
    return require('clipboardy').readSync();
}
export async function paste() {
    await commands.executeCommand('editor.action.clipboardPasteAction');
}
export async function copy() {
    await commands.executeCommand('editor.action.clipboardCopyAction');
}

/* AST stuff */
function isJavaScript(language: string) {
    //possible javascript languages:
    //  -"javascript"
    //  -"javascriptreact"
    return language.startsWith('javascript');
}
function isTypeScript(language: string) {
    //possible typescript languages:
    //  -"typescript"
    //  -"typescriptreact"
    return language.startsWith('typescript');
}
function isJson(language: string) {
    //possible json languages:
    //  -"json"
    //  -"jsonc"
    return language.startsWith('json');
}

function createNode(type: string, start: number, end: number) {
    return { type, start, end };
}

function createStringNode(start: number, end: number) {
    return createNode('string', start, end);
}
export function isString(node: Node) {
    return node.type === 'string';
}

function traverseBabelAst(babelAst: BabelNode, fnToApplyToEveryNode: Function) {
    traverse(babelAst, {
        enter(babelNode) {
            fnToApplyToEveryNode(babelNode);
        },
    });
}

function parseJavaScriptCode(code: string, isTypeScript: boolean = false) {
    const nodes: Node[] = [];

    //generate an ast from the code
    const ast = generateBabelAst(code, isTypeScript);
    if (ast) {
        //traverse the ast, making a Node for each babelNode along the way
        traverseBabelAst(ast, (babelNode: BabelNode) => {
            if (isNumber(babelNode.start) && isNumber(babelNode.end)) {
                if (isBabelNodeAString(babelNode)) {
                    nodes.push(
                        createStringNode(babelNode.start, babelNode.end)
                    );
                } else {
                    nodes.push(
                        createNode(
                            babelNode.type,
                            babelNode.start,
                            babelNode.end
                        )
                    );
                }
            }
        })
    }

    return nodes;
}

function parseTypeScriptCode(code: string) {
    return parseJavaScriptCode(code, true);
}

export function parseCode(code: string, language: string) {
    if (isJavaScript(language)) {
        return parseJavaScriptCode(code);
    } else if (isTypeScript(language)) {
        return parseTypeScriptCode(code);
    } else if (isJson(language)) {
    //     return parseJsonCode(code);
    }
}

export function generateBabelAst(code: string, isTypeScript: boolean = false) {
    //use try-catch b/c babel will throw an error if it can't parse the file
    //(ie. if it runs into a "SyntaxError" or something that it can't handle)
    //In this case, display a notification that an error occurred so that the
    //user knows why the command didn't work
    try {
        const parserOptions: ParserOptions = {
            sourceType: 'unambiguous', //auto-detect "script" files vs "module" files

            //make the parser as lenient as possible
            allowImportExportEverywhere: true,
            allowAwaitOutsideFunction: true,
            allowReturnOutsideFunction: true,
            allowSuperOutsideMethod: true,
        };

        //add "typescript" plugin if language is typescript
        if (isTypeScript) {
            parserOptions.plugins = ['typescript'];
        }

        return parse(code, parserOptions);
    } catch (e) {
        // console.log('​e=', e);
        //do nothing, it will just return null below
    }
    return null;
}

export function filterAst(
    astNode: BabelNode | null,
    cursor: number,
    fnToApplyToEveryNode: Function
) {
    let filteredNodes: BabelNode[] = [];

    if (astNode) {
        //if the current child is an array, just call filterAst on all
        //it's elements
        if (isArray(astNode)) {
            //call filterAst on all children
            for (const item of astNode) {
                filteredNodes = filteredNodes.concat(
                    filterAst(item, cursor, fnToApplyToEveryNode)
                );
            }
        } else if (isObject(astNode)) {
            //apply the function to this node
            if (fnToApplyToEveryNode(astNode, cursor)) {
                //if it returns truthy, add this node to filteredNodes
                filteredNodes.push(astNode);
            }
            //then call filterAst on all children
            for (const key in astNode) {
                if (astNode.hasOwnProperty(key)) {
                    filteredNodes = filteredNodes.concat(
                        filterAst(astNode[key], cursor, fnToApplyToEveryNode)
                    );
                }
            }
        }
    }
    return filteredNodes;
}

export function isBabelNodeAString(node: BabelNode) {
    return (
        isBabelStringLiteral(node) ||
        isBabelTemplateLiteral(node) ||
        isBabelDirective(node)
    );
}

export function isCursorInsideNode(cursorLocation: number, node: Node) {
    return (
        isNumber(node.start) &&
        isNumber(node.end) &&
        node.start < cursorLocation &&
        cursorLocation < node.end
    );
}
export function isCursorTouchingNode(cursorLocation: number, node: BabelNode) {
    return (
        isNumber(node.start) &&
        isNumber(node.end) &&
        node.start <= cursorLocation &&
        cursorLocation <= node.end
    );
}

export function getBoundary(node: Node | undefined) {
    if (node && isNumber(node.start) && isNumber(node.end)) {
        return { start: node.start, end: node.end };
    }
}

export function getBoundaryExcludingBraces(stringNode: Node | undefined) {
    const nodeBoundaries = getBoundary(stringNode);
    if (nodeBoundaries) {
        return {
            start: nodeBoundaries.start + 1,
            end: nodeBoundaries.end - 1,
        };
    }
}

export function excludeBracesFromBoundary(boundary: Boundary) {
    return {
        start: boundary.start + 1,
        end: boundary.end - 1,
    };
}
