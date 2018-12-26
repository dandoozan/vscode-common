"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var utils_1 = require("../utils");
describe('Tbx', function () {
    it('should true', function () {
        expect(true).toBe(true);
    });
});
describe('findEnclosingString', function () {
    it('should find string when cursor is at beginning of a double-quote string', function () {
        var code = '("String contents")';
        var ast = utils_1.generateAst(code, 'javascript');
        var cursorLocation = 5;
        var enclosingString = utils_1.findEnclosingString(ast, cursorLocation);
        if (enclosingString) {
            expect(enclosingString.start).toBe(1);
        }
        else {
            fail("enclosingString should return an object. It returned: " + enclosingString);
        }
    });
});
//# sourceMappingURL=utils.test.js.map