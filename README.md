# VscodeKeyboardShortcuts

## Symlink vs. npm link

Here are my options:

1.  Symlink utils from a non-npm module
    -   benefits:
        -   the dir containing utils is simple (only has one file)
    -   drawbacks:
        -   i'll have to include tests for utils in the importing module
        -   it shows up as a symlink on github
2.  Symlink utils from an npm module
    -   benefits:
        -   i can create tests for utils in its npm module (not in this one)
    -   drawbacks:
        -   it shows up as a symlink on github
3.  npm link an npm module
    -   benefits:
        -   If i change the name/location of the npm module, i only need to
            update it in one spot (the global npm link)
    -   drawbacks:
        -   When i view the utils file, it adds the \_CommonVSCodeExtensions
            package in the source control sidebar
        -   the project won't work when ppl fork it on github (bc it relies on
            my local npm module)
4.  import the utils npm module from somewhere outside the project (eg. import ../../../etc)
    -   drawbacks:
        -   If i change the name/location of the module, i'll have to change
            that import statement everywhere i have it
        -   the project won't work when ppl fork it on github (bc it relies on
            my local npm module)
        -   my local file structure is revealed on github
5.  publish an npm package that contains my utils
    -   drawbacks:
        -   the utils are really for me only, so i dont want it to be public
        -   i dont want to have my custom pkg as a "dependency" on git projects
6.  copy code from utils into all projects that will use it
    -   drawbacks:
        -   copies of code everywhere
    -   benefits:
        -   the project is ready to go on github and can be viewed/forked by others

Conclusions:

-   npm link is better than importing from an external location (bc i only have
    to change one spot if i change the name/location of the utils module)

My strategy:

-   If the project is for myself only, then go with option 2
-   If the project is going to published to production somewhere (eg. for a
    vscode extension that has a link to the repository), then copy the code from
    the utils npm module (with all the tests) over to the project before
    releasing it. This is terrible because it creates a fork of the utils file,
    but I don't see any other way of getting around this (outside of publishing
    my utils in an npm package and including it as a dependency in the project).

## A note on testing

The way I see it, I have the following testing options

-   heavy integration tests (ie. test the commands), unit test where needed
    -   benefits:
        -   easier to develop (i can pass around complex objects, like Editors)
        -   you'll know the commands work
    -   drawbacks:
        -   i'll have to create and open a file when testing; options for how to do this:
            -   create a new file for each test
                -   benefits:
                    -   the file text and cursor location are close to the test
                -   drawbacks:
                    -   a new file is created for every test, meaning A LOT of
                        files are created
            -   create one file and erase and write the text for each test
                -   benefits:
                    -   only one file is created
                    -   the file text and cursor location are close to the test
                -   drawbacks:
                    -   it requires set up and teardown after each file
            -   create a separate file in the project
                -   drawbacks:
                    -   the text is far away from the test code that defines the
                        cursor position
-   heavy unit test, a few integration tests
    -   benefits:
        -   easier to test (i'll make the functions only take in primitive/simple
            types)
        -   i can write one set of tests for functions that are used multiple
            times, and then write simple tests for the commands
    -   drawbacks:
        -   harder to develop (i'll have to do setup in the code to avoid
            passing in complex objects)
        -   I'm not testing the actual "commands", so those could be broken
