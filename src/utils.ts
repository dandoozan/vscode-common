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
import {
    parse as babelParse,
    ParserOptions as BabelParserOptions,
} from '@babel/parser';
import {
    Node as BabelNode,
    traverse,
} from '@babel/types';
import { isArray, isObject, isNumber, isString, get } from 'lodash';
import Boundary from './Boundary';

export interface Modification {
    method: 'insert' | 'delete';
    params: any[];
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
    window.showInformationMessage(`${getExtensionName()}: ${msg}`);
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
export function isJavaScript(language: string) {
    return language === 'javascript';
}
export function isTypeScript(language: string) {
    return language === 'typescript';
}
export function isJson(language: string) {
    return language === 'json';
}

export function traverseBabelAst(babelAst: BabelNode, fnToApplyToEveryNode: Function) {
    traverse(babelAst, {
        enter(babelNode) {
            fnToApplyToEveryNode(babelNode);
        },
    });
}

function traverseJsonAst(jsonAstNode, fnToApplyToEveryNode: Function) {
    if (jsonAstNode) {
        //if the current child is an array, just call traverse on all
        //it's elements
        if (isArray(jsonAstNode)) {
            //call traverse on all children
            for (const item of jsonAstNode) {
                traverseJsonAst(item, fnToApplyToEveryNode);
            }
        } else if (isObject(jsonAstNode)) {
            //apply the function to this node
            fnToApplyToEveryNode(jsonAstNode);

            //then call traverse on all children
            for (const key in jsonAstNode) {
                if (jsonAstNode.hasOwnProperty(key)) {
                    traverseJsonAst(jsonAstNode[key], fnToApplyToEveryNode);
                }
            }
        }
    }
}

// function parseTypeScriptCode(code: string) {
//     return parseJavaScriptCode(code, true);
// }

// function parseJsonCode(code: string) {
//     const nodes: Node[] = [];

//     const jsonAst = generateJsonAst(code);
//     if (jsonAst) {
//         traverseJsonAst(jsonAst, jsonNode => {
//             const start = get(jsonNode, 'loc.start.offset');
//             const end = get(jsonNode, 'loc.end.offset');
//             if (isJsonNodeAString(jsonNode)) {
//                 const node = NodeFactory.createNode(
//                     'string',
//                     new Boundary(start, end)
//                 );
//                 if (node) {
//                     nodes.push(node);
//                 }
//             }
//         });
//     }

//     return nodes;
// }

// export function parseCode(code: string, language: string) {
//     try {
//         if (isJavaScript(language)) {
//             return parseJavaScriptCode(code);
//         } else if (isTypeScript(language)) {
//             return parseTypeScriptCode(code);
//         } else if (isJson(language)) {
//             return parseJsonCode(code);
//         } else {
//             //language is not supported
//             notify(`The language "${language}" is not supported at this time`);
//         }
//     } catch (err) {
//         console.log('​catch -> err=', err);
//         //failed to parse the file; notify the user
//         notify(
//             `Failed to parse the file.  Please fix any errors in the file and try again.`
//         );
//     }
// }

function generateJsonAst(code: string) {
    const jsonParse = require('json-to-ast');
    return jsonParse(code);
}

export function generateBabelAst(code: string, isTypeScript: boolean = false) {
    //use try-catch b/c babel will throw an error if it can't parse the file
    //(ie. if it runs into a "SyntaxError" or something that it can't handle)
    //In this case, display a notification that an error occurred so that the
    //user knows why the command didn't work
    const parserOptions: BabelParserOptions = {
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

    return babelParse(code, parserOptions);
}

export function filterBabelAst(
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
                    filterBabelAst(item, cursor, fnToApplyToEveryNode)
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
                        filterBabelAst(
                            astNode[key],
                            cursor,
                            fnToApplyToEveryNode
                        )
                    );
                }
            }
        }
    }
    return filteredNodes;
}



function isJsonNodeAString(node) {
    return (
        node.type === 'Identifier' ||
        (node.type === 'Literal' && isString(node.value))
    );
}
