"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var vscode_1 = require("vscode");
var parser_1 = require("@babel/parser");
var types_1 = require("@babel/types");
var lodash_1 = require("lodash");
/* vscode stuff */
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
function getRangeFromBoundary(document, boundary) {
    return new vscode_1.Range(document.positionAt(boundary.start), document.positionAt(boundary.end));
}
exports.getRangeFromBoundary = getRangeFromBoundary;
function deleteBetweenBoundary(editor, boundary) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!boundary) return [3 /*break*/, 2];
                    return [4 /*yield*/, editor.edit(function (editBuilder) {
                            editBuilder.delete(getRangeFromBoundary(editor.document, boundary));
                        })];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2: return [2 /*return*/];
            }
        });
    });
}
exports.deleteBetweenBoundary = deleteBetweenBoundary;
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
/* AST stuff */
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
    if (astNode) {
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
    }
    return filteredNodes;
}
exports.filterAst = filterAst;
function isString(node) {
    return types_1.isStringLiteral(node) || types_1.isTemplateLiteral(node);
}
exports.isString = isString;
function isCursorInsideNode(cursorLocation, node) {
    return (lodash_1.isNumber(node.start) &&
        lodash_1.isNumber(node.end) &&
        node.start < cursorLocation &&
        cursorLocation < node.end);
}
exports.isCursorInsideNode = isCursorInsideNode;
function isCursorTouchingNode(cursorLocation, node) {
    return (lodash_1.isNumber(node.start) &&
        lodash_1.isNumber(node.end) &&
        node.start <= cursorLocation &&
        cursorLocation <= node.end);
}
exports.isCursorTouchingNode = isCursorTouchingNode;
function getBoundary(node) {
    if (node && lodash_1.isNumber(node.start) && lodash_1.isNumber(node.end)) {
        return { start: node.start, end: node.end };
    }
}
exports.getBoundary = getBoundary;
function getBoundaryExcludingBraces(stringNode) {
    var nodeBoundaries = getBoundary(stringNode);
    if (nodeBoundaries) {
        return {
            start: nodeBoundaries.start + 1,
            end: nodeBoundaries.end - 1,
        };
    }
}
exports.getBoundaryExcludingBraces = getBoundaryExcludingBraces;
//# sourceMappingURL=utils.js.map