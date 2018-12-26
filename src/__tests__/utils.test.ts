import { generateAst, findEnclosingString } from "../utils";

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

        if (enclosingString) {
            expect(enclosingString.start).toBe(1);
        } else {
            fail(`enclosingString should return an object. It returned: ${enclosingString}`);
        }
    });
});
