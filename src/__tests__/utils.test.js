//notes: maybe create a mock of 'vscode' to workaround the error where it cant
//find 'vscode' module

const { findEnclosingString, generateAst } = require('../utils');

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
