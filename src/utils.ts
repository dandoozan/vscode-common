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
    workspace,
} from 'vscode';

export interface Boundary {
    start: number;
    end: number;
}

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

export async function createEditor(language: string) {
    const doc = await workspace.openTextDocument({
        language,
    });

    //show the editor so that it's the "activeTextEditor"
    const editor = await window.showTextDocument(doc);

    return editor;
}

async function setEditorText(editor: TextEditor, newText: string) {
    const oldTextRange = new Range(
        editor.document.positionAt(0),
        editor.document.positionAt(editor.document.getText().length)
    );
    await editor.edit((editBuilder: TextEditorEdit) => {
        editBuilder.replace(oldTextRange, newText);
    });
}

export async function runTestCaseInEditor(
    testCase,
    editor: TextEditor,
    command: Function,
    thisObj: any = {}
) {
    const { startingCode, cursorPosition } = testCase;

    await setEditorText(editor, startingCode);
    await setCursor(editor, cursorPosition);

    await command.call(thisObj, editor);

    return editor;
}

export function getExtensionName() {
    return require('../package.json').displayName;
}

export function getExtensionCommands() {
    return require('../package.json').contributes.commands;
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
export function getBoundaryText(boundary: Boundary, editor: TextEditor) {
    return editor.document.getText(
        createRangeFromBoundary(editor.document, boundary)
    );
}
export function getTextBetween(start: number, end: number, editor: TextEditor) {
    const doc = editor.document;
    return doc.getText(new Range(doc.positionAt(start), doc.positionAt(end)));
}

export function getLineNumberAtOffset(offset: number, document: TextDocument) {
    return document.positionAt(offset).line;
}

export function getFirstNonWhitespaceCharOnLine(
    lineNumber: number,
    document: TextDocument
) {
    const lineText = document.lineAt(lineNumber).text;
    return lineText[
        document.lineAt(lineNumber).firstNonWhitespaceCharacterIndex
    ];
}

export function getLengthOfLine(lineNumber: number, document: TextDocument) {
    return document.lineAt(lineNumber).text.length;
}

export function getOffsetOfLineAndChar(
    lineNumber: number,
    characterNumber: number,
    document: TextDocument
) {
    return document.offsetAt(new Position(lineNumber, characterNumber));
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
    return await editor.edit(
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
    if (!require('lodash').isArray(offsets)) {
        offsets = [offsets as number];
    }

    editor.selections = (offsets as number[]).map(offset => {
        const pos = editor.document.positionAt(offset);
        return new Selection(pos, pos);
    });
    await updateEditor(editor);
}

export function notify(msg: any) {
    window.showInformationMessage(`[${getExtensionName()}] ${msg}`);
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
export function traverseBabelAst(babelAst, fnToApplyToEveryNode: Function) {
    require('@babel/types').traverse(babelAst, {
        enter(babelNode) {
            fnToApplyToEveryNode(babelNode);
        },
    });
}

export function traverseJsonAst(jsonAstNode, fnToApplyToEveryNode: Function) {
    if (jsonAstNode) {
        //if the current child is an array, just call traverse on all it's elements
        let { isArray, isObject } = require('lodash');
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

export function generateJsonAst(code: string) {
    return require('json-to-ast')(code);
}

export function generateBabelAst(code: string, isTypeScript: boolean = false) {
    const parserOptions = {
        sourceType: 'unambiguous', //auto-detect "script" vs "module" files

        //make the parser as lenient as possible
        allowImportExportEverywhere: true,
        allowAwaitOutsideFunction: true,
        allowReturnOutsideFunction: true,
        allowSuperOutsideMethod: true,

        //include plugins for experimental features so that the
        //parser is more lenient when parsing code
        plugins: [
            'asyncGenerators',
            'bigInt',
            'classProperties',
            'classPrivateProperties',
            'classPrivateMethods',
            'doExpressions',
            'dynamicImport',
            'exportDefaultFrom',
            'exportNamespaceFrom',
            'functionBind',
            'functionSent',
            'importMeta',
            'nullishCoalescingOperator',
            'numericSeparator',
            'objectRestSpread',
            'optionalCatchBinding',
            'optionalChaining',
            'throwExpressions',
        ],
    };

    if (isTypeScript) {
        parserOptions.plugins.push('typescript');
    }

    //use try-catch b/c babel will throw an error if it can't parse the file
    //(ie. if it runs into a "SyntaxError" or something that it can't handle)
    try {
        return require('@babel/parser').parse(code, parserOptions);
    } catch (error) {
        console.log('​error=', error);
        notify(
            `Failed to parse file.  Error: ${error.toString()}`
        );
    }
}
