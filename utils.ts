import {
    ExtensionContext,
    commands,
    window,
    TextEditor,
    Position,
    Selection,
} from 'vscode';
import { parse, ParserOptions } from '@babel/parser';
import { Node, isStringLiteral } from '@babel/types';
import { isArray, isObject, isNumber } from 'lodash';

export function addCommand(
    name: string,
    fn: (...args: any[]) => any,
    context: ExtensionContext
) {
    let toggleAsyncCommand = commands.registerCommand(name, fn);
    context.subscriptions.push(toggleAsyncCommand);
}

export function getExtensionName() {
    const packageJson = require('../package.json');
    return packageJson.displayName;
}

export function getCurrentEditor() {
    return window.activeTextEditor;
}

export function getCursorLocation(editor: TextEditor) {
    return editor.document.offsetAt(editor.selection.active);
}

export function getTextOfFile(editor: TextEditor) {
    return editor.document.getText();
}

export function getLanguage(editor: TextEditor) {
    return editor.document.languageId;
}

export function generateAst(code: string, language: string) {
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
        if (language === 'typescript') {
            parserOptions.plugins = ['typescript'];
        }

        return parse(code, parserOptions);
    } catch (e) {
        // console.log('​e=', e);
        //do nothing, it will just return null below
    }
    return null;
}

function filterAst(astNode: Node, fnToApplyToEveryNode: Function) {
    let filteredNodes: Node[] = [];

    //if the current child is an array, just call filterAst on all
    //it's elements
    if (isArray(astNode)) {
        //call filterAst on all children
        for (const item of astNode) {
            filteredNodes = filteredNodes.concat(
                filterAst(item, fnToApplyToEveryNode)
            );
        }
    } else if (isObject(astNode)) {
        //apply the function to this node
        if (fnToApplyToEveryNode(astNode)) {
            //if it returns truthy, add this node to filteredNodes
            filteredNodes.push(astNode);
        }
        //then call filterAst on all children
        for (const key in astNode) {
            if (astNode.hasOwnProperty(key)) {
                filteredNodes = filteredNodes.concat(
                    filterAst(astNode[key], fnToApplyToEveryNode)
                );
            }
        }
    }
    return filteredNodes;
}

function isCursorInsideNode(cursorLocation: number, node: Node) {
    return (
        isNumber(node.start) &&
        isNumber(node.end) &&
        node.start <= cursorLocation &&
        cursorLocation < node.end
    );
}

export function findEnclosingString(ast: Node, cursorLocation: number) {
    const allEnclosingStrings = filterAst(
        ast,
        (node: Node) =>
            isStringLiteral(node) && isCursorInsideNode(cursorLocation, node)
    );
    return allEnclosingStrings[0];
}

export function setCursor(editor: TextEditor, offset: number) {
    const pos = editor.document.positionAt(offset);
    editor.selection = new Selection(pos, pos);
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