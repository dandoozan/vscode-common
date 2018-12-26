

//todo: i shouldn't need to point to "out" to get the module--figure out how to
//make it work by just requiring "../utils"
const { findEnclosingString, generateAst } = require('../../out/utils');

describe('Tbx', () => {
    it('should true', () => {
        expect(true).toBe(true);
    });
});

describe('findEnclosingString', () => {
    it('should find string when cursor is at beginning of a double-quote string', () => {
        const code = '("String contents")';
        const ast = generateAst(code, 'javascript');
        const cursorLocation = 5;
        const enclosingString = findEnclosingString(ast, cursorLocation);

        expect(enclosingString.start).toBe(1);
    });
});
