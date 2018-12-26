"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var vscode_1 = require("vscode");
var parser_1 = require("@babel/parser");
var types_1 = require("@babel/types");
var lodash_1 = require("lodash");
function addCommand(name, fn, context) {
    var toggleAsyncCommand = vscode_1.commands.registerCommand(name, fn);
    context.subscriptions.push(toggleAsyncCommand);
}
exports.addCommand = addCommand;
function getExtensionName() {
    var packageJson = require('../package.json');
    return packageJson.displayName;
}
exports.getExtensionName = getExtensionName;
function getCurrentEditor() {
    return vscode_1.window.activeTextEditor;
}
exports.getCurrentEditor = getCurrentEditor;
function getCursorLocation(editor) {
    return editor.document.offsetAt(editor.selection.active);
}
exports.getCursorLocation = getCursorLocation;
function getTextOfFile(editor) {
    return editor.document.getText();
}
exports.getTextOfFile = getTextOfFile;
function getLanguage(editor) {
    return editor.document.languageId;
}
exports.getLanguage = getLanguage;
function generateAst(code, language) {
    //use try-catch b/c babel will throw an error if it can't parse the file
    //(ie. if it runs into a "SyntaxError" or something that it can't handle)
    //In this case, display a notification that an error occurred so that the
    //user knows why the command didn't work
    try {
        var parserOptions = {
            sourceType: 'unambiguous',
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
        return parser_1.parse(code, parserOptions);
    }
    catch (e) {
        // console.log('​e=', e);
        //do nothing, it will just return null below
    }
    return null;
}
exports.generateAst = generateAst;
function filterAst(astNode, fnToApplyToEveryNode) {
    var filteredNodes = [];
    //if the current child is an array, just call filterAst on all
    //it's elements
    if (lodash_1.isArray(astNode)) {
        //call filterAst on all children
        for (var _i = 0, astNode_1 = astNode; _i < astNode_1.length; _i++) {
            var item = astNode_1[_i];
            filteredNodes = filteredNodes.concat(filterAst(item, fnToApplyToEveryNode));
        }
    }
    else if (lodash_1.isObject(astNode)) {
        //apply the function to this node
        if (fnToApplyToEveryNode(astNode)) {
            //if it returns truthy, add this node to filteredNodes
            filteredNodes.push(astNode);
        }
        //then call filterAst on all children
        for (var key in astNode) {
            if (astNode.hasOwnProperty(key)) {
                filteredNodes = filteredNodes.concat(filterAst(astNode[key], fnToApplyToEveryNode));
            }
        }
    }
    return filteredNodes;
}
function isCursorInsideNode(cursorLocation, node) {
    return (lodash_1.isNumber(node.start) &&
        lodash_1.isNumber(node.end) &&
        node.start <= cursorLocation &&
        cursorLocation < node.end);
}
function findEnclosingString(ast, cursorLocation) {
    if (ast) {
        var allEnclosingStrings = filterAst(ast, function (node) {
            return types_1.isStringLiteral(node) &&
                isCursorInsideNode(cursorLocation, node);
        });
        return allEnclosingStrings[0];
    }
}
exports.findEnclosingString = findEnclosingString;
function setCursor(editor, offset) {
    var pos = editor.document.positionAt(offset);
    editor.selection = new vscode_1.Selection(pos, pos);
}
exports.setCursor = setCursor;
function notify(msg) {
    vscode_1.window.showInformationMessage('' + msg);
}
exports.notify = notify;
function getWordAtPosition(editor, position) {
    if (editor && position) {
        var range = editor.document.getWordRangeAtPosition(position);
        //range will be undefined when there is no word at the position (ie.
        //it's whitespace or on a semicolon, bracket, etc)
        if (range) {
            return editor.document.getText(range);
        }
        //if I don't find a word at the position, return empty string
        return '';
    }
}
exports.getWordAtPosition = getWordAtPosition;
//# sourceMappingURL=utils.js.map