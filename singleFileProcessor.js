var ERROR_THRESHOLD = 50;
var WRITE_ENABLED = false;
var _fs = require('fs');
var _path = require('path');
var _wrench = require('wrench');
var FILE_ENCODING = 'utf8';
var finishedProcessingChain = null;
var _uglifyjs = require('uglify-js');
var newJsDoccerEngine = require('./jsdoccer');
var addMissingComments = newJsDoccerEngine.addMissingComments;
var FILE_IS_EMPTY = false;
var logger = require('./logger');

function mapModuleName(mappedModuleName, modulePaths) {
    for (var p in modulePaths) {
        if (modulePaths.hasOwnProperty(p)) {
            var pattern = modulePaths[p];
            if (mappedModuleName.indexOf(pattern) !== -1) {
                mappedModuleName = mappedModuleName.split(pattern).join(p);
                break;
            }
        }
    }
    if (mappedModuleName.charAt(0) === '/') {
        mappedModuleName = mappedModuleName.substring(1);
    }
    return mappedModuleName;
}
var headerProc = {
    id: 'headerProc',
    type: 'processor',
    description: 'SAMPLE: Adds a bogus header to the file.',
    process: function (input, doneCallback) {
        input.source = '// Copyright 1987 Robot Donkey, Inc.' + '\n\n' + input.source;
        doneCallback(input);
    }
};
var singleJsDocProc = {
    id: 'singleJsDocProc',
    type: 'processor',
    description: 'Stub for necessary proc: generate the JSDOC for a single file.',
    process: function (input, doneCallback) {
        doneCallback(input);
    }
};
var uid = 0;
var nodes = [];

function walk(node, attr, val, results, parentNode) {
    if (parentNode == null) {
        parentNode = {
            type: 'ROOT'
        };
        parentNode.uid = -1;
    }
    if (node.type != null) {
        node.parentNode = parentNode.uid;
        node.uid = uid++;
    }
    if (node.length != null) {
        logger.error('Walking an Array!!!');
    }
    if (results == null) {
        results = [];
    }
    nodes.push(node);
    if (node.hasOwnProperty(attr)) {
        if (node[attr] === val) {
            results.push(node);
        }
    }
    for (var e in node) {
        if (attr === e) {
            continue;
        }
        if (e === 'comments') {
            continue;
        }
        if (e === 'uid') {
            continue;
        }
        if (e === 'parentNode') {
            continue;
        }
        if (node.hasOwnProperty(e)) {
            var child = node[e];
            if (child == null) {
                continue;
            }
            if (typeof child === 'object' && child.length != null) {
                for (var index = 0; index < child.length; index++) {
                    var elem = child[index];
                    if (elem != null) {
                        walk(elem, attr, val, results, node);
                    }
                }
            } else if (typeof child === 'object') {
                child.parentNode = node;
                walk(child, attr, val, results, node);
            } else if (typeof child === 'string') {} else {}
        }
    }
    return results;
}

function getNodeByUid(uid) {
    for (var index = 0; index < nodes.length; index++) {
        var node = nodes[index];
        if (node.uid === uid) {
            return node;
        }
    }
    return null;
}

function getNodesByType(ast, nodeType) {
    var results = walk(ast, 'type', nodeType);
    for (var index = 0; index < results.length; index++) {
        var node = results[index];
        var returnType = '';
        if (node.body != null) {
            var returnStatements = getNodesByType(node.body, 'ReturnStatement');
            if (returnStatements.length > 0) {
                if (returnStatements[0].argument != null) {
                    var statement = returnStatements[0].argument;
                    if (statement.type === 'Literal') {
                        if (statement.raw === 'null') {
                            returnType = '';
                        } else if (statement.raw === 'undefined') {
                            returnType = '';
                        } else {
                            returnType = '{' + (typeof statement.value) + '}';
                        }
                    } else if (statement.type === 'Identifier') {
                        returnType = '?';
                        if (statement.name != null) {
                            if (statement.name === 'null') {
                                returnType = '';
                            } else if (statement.name === 'undefined') {
                                returnType = '';
                            } else {
                                returnType = '?';
                            }
                        }
                    } else if (statement.type === 'CallExpression') {
                        returnType = '?';
                        if (statement.name != null) {
                            returnType = statement.name;
                        }
                    } else if (statement.type === 'LogicalExpression') {
                        returnType = '{boolean}';
                    } else if (statement.type === 'FunctionExpression') {
                        returnType = '{function}';
                    } else if (statement.type === 'BinaryExpression') {
                        returnType = '?';
                    } else if (statement.type === 'MemberExpression') {
                        returnType = '?';
                    } else if (statement.type === 'ObjectExpression') {
                        returnType = '?';
                    } else if (statement.type === 'ArrayExpression') {
                        returnType = '{array}';
                    } else {
                        returnType = '';
                        if (statement.name != null) {
                            returnType = statement.name;
                        } else if (statement.type != null) {
                            returnType = statement.type;
                        } else {
                            logger.warn(statement);
                        }
                    }
                } else {
                    returnType = '';
                }
            }
        }
        node.returnType = returnType;
    }
    return results;
}

function getParentOfType(nodeIn, typeName) {
    var parentNode = nodeIn;
    var type;
    while (true && parentNode) {
        parentNode = getNodeByUid(parentNode.parentNode);
        if (!parentNode) {
            return null;
        }
        type = parentNode.type;
        if (type === typeName) {
            return parentNode;
        }
    }
}
var fixDecaffeinateProc = {
    id: 'fixDecaffeinateProc',
    type: 'processor',
    description: 'Any fixes we consider mandatory for post-processing decaf files.',
    process: function (input, doneCallback) {
        logger.log('****************** fixDecaffeinateProc *******************');
        var source = input.source;
        var amdProcData = input.results.amdProc;
        var isAMD = (source.indexOf('define (') !== -1 || source.indexOf('define(') !== -1);
        if (!isAMD) {
            logger.log('fixDecaffeinateProc BAILING; this file is not AMD.');
            doneCallback(input);
            return;
        }
        var importPaths = [];
        var lines = source.split('\n');
        for (var index = 0; index < lines.length; index++) {
            var line = lines[index];
            if (line.indexOf('return ') !== -1 && line.indexOf('.initClass();') !== -1) {
                logger.log('DO NOT RETURN initClass()');
                line = line.split('return ').join('');
                var theClass = line.split('.')[0];
                line = line.trim() + '\n' + 'return ' + theClass;
                lines[index] = line;
            }
        }
        input.source = lines.join('\n');
        var isSpec = (input.source.indexOf('describe(') !== -1);
        if (isSpec) {
            input.source = input.source.split('return it').join('it');
            input.source = input.source.split('return expect').join('expect');
            input.source = input.source.split('return describe').join('describe');
        }
        var importNames = amdProcData.usedAs;
        var ast = null;
        try {
            var _esprima = require('esprima');
            ast = _esprima.parse(input.source, {
                comment: true,
                tolerant: true,
                range: true,
                raw: true,
                tokens: true
            });
        } catch (esError) {
            console.error(esError);
            throw (esError);
        }
        var expressionStatements = getNodesByType(ast, 'ExpressionStatement');
        var defineBlocks = [];
        var es = 0;
        var defineCount = 0;
        var firstDefineBlock = null;
        var oneDefine = null;
        var exportReturned = null;
        var exportReturnedNode = null;
        var someNode = null;
        for (es = 0; es < expressionStatements.length; es++) {
            someNode = expressionStatements[es];
            if (someNode.expression.callee && someNode.expression.callee.name === 'define') {
                oneDefine = someNode;
                if (oneDefine.expression.arguments.length === 0) {
                    throw (new Error('unknown define structure'));
                } else if (oneDefine.expression.arguments.length === 1) {
                    exportReturnedNode = oneDefine.expression.arguments[0];
                } else if (oneDefine.expression.arguments.length === 2) {
                    var imports = oneDefine.expression.arguments[0].elements;
                    var importedAs = oneDefine.expression.arguments[1].params;
                    exportReturnedNode = oneDefine.expression.arguments[1];
                    for (var index = 0; index < imports.length; index++) {
                        var path = imports[index].value;
                        importPaths.push({
                            path: path,
                            name: ''
                        });
                    }
                    for (var index = 0; index < importedAs.length; index++) {
                        var name = importedAs[index].name;
                        if (importPaths.length > index) {
                            importPaths[index].name = name;
                        }
                    }
                } else if (oneDefine.expression.arguments.length === 3) {
                    var argZero = oneDefine.expression.arguments[0];
                    var imports = oneDefine.expression.arguments[1].elements;
                    var importedAs = oneDefine.expression.arguments[2].params;
                    exportReturnedNode = oneDefine.expression.arguments[2];
                    for (var index = 0; index < imports.length; index++) {
                        var path = imports[index].value;
                        importPaths.push({
                            path: path,
                            name: ''
                        });
                    }
                    for (var index = 0; index < importedAs.length; index++) {
                        var name = importedAs[index].name;
                        if (importPaths.length > index) {
                            importPaths[index].name = name;
                        }
                    }
                }
                break;
            }
        }
        if (!oneDefine) {
            logger.log('oneDefine not found, trying alternate');
            var callExpressionStatements = getNodesByType(ast, 'CallExpression');
            for (es = 0; es < callExpressionStatements.length; es++) {
                someNode = callExpressionStatements[es];
                if (someNode.callee && someNode.callee.name === 'define') {
                    oneDefine = someNode;
                    if (oneDefine.arguments.length === 1) {
                        exportReturnedNode = oneDefine.arguments[0];
                    } else if (oneDefine.arguments.length === 2) {
                        var imports = oneDefine.arguments[0].elements;
                        var importedAs = oneDefine.arguments[1].params;
                        exportReturnedNode = oneDefine.arguments[1];
                        for (var index = 0; index < imports.length; index++) {
                            var path = imports[index].value;
                            importPaths.push({
                                path: path,
                                name: ''
                            });
                        }
                        for (var index = 0; index < importedAs.length; index++) {
                            var name = importedAs[index].name;
                            if (importPaths.length > index) {
                                importPaths[index].name = name;
                            }
                        }
                    }
                    break;
                }
            }
        }
        var codeSandwich = null;
        if (oneDefine) {
            var exactReturn = null;
            var body = exportReturnedNode.body;
            if (body.body) {
                body = body.body;
            }
            var explicit_return = false;
            var node = exportReturnedNode;
            if (exportReturnedNode.type === 'ArrowFunctionExpression') {
                var range = node.range;
                exactReturn = input.source.substring(range[0], range[1]).trim();
                logger.log(">>>EXACT: " + exactReturn);
                node = node.body;
                var codeBody = null;
                if (node.type === 'ObjectExpression') {
                    range = node.range;
                    exportReturned = input.source.substring(range[0], range[1]).trim();
                    logger.log(">>>EXPORTED from ObjectExpression: ", exportReturned);
                } else {
                    range = node.range;
                    exportReturned = input.source.substring(range[0], range[1]).trim();
                    logger.log(">>>EXPORTED: ", exportReturned);
                }
                var exportedValue = null;
                try {
                    eval('var foo = ' + exportReturned);
                    exportedValue = foo;
                } catch (ex) {
                    logger.log('Could not parse the exported expression.', ex);
                }
                if (exportedValue && exportedValue.root) {
                    codeBody = 'export const root = ' + JSON.stringify(exportedValue.root, null, 2) + ';';
                } else if (node.type === 'CallExpression') {
                    codeBody = exportReturned + ';';
                } else if (node.type === 'ReturnStatement') {
                    codeBody = codeBody.split(exactReturn).join('export default ' + exportReturned + ';');
                } else {
                    codeBody = 'export default ' + exportReturned + ';';
                }
                var codeHeader = '';
                codeHeader += '/**\n';
                codeHeader += ' * @module ' + amdProcData.moduleName + '\n';
                if (input.camelName === exportReturned) {
                    codeHeader += ' * @exports ' + exportReturned + '\n';
                    amdProcData.exports = exportReturned;
                    input.results.amdProc.exports = exportReturned;
                }
                for (var index = 0; index < importPaths.length; index++) {
                    var importItem = importPaths[index];
                    codeHeader += ' * @requires ' + importItem.path + '\n';
                }
                codeHeader += ' */\n\n';
                for (var index = 0; index < importPaths.length; index++) {
                    var importItem = importPaths[index];
                    if (importItem.name) {
                        codeHeader += 'import ' + importItem.name + ' from \'' + importItem.path + '\';\n';
                    } else {
                        codeHeader += 'import \'' + importItem.path + '\';\n';
                    }
                }
                codeHeader += '\n';
                if (input.source.indexOf(codeHeader.trim()) !== -1) {
                    codeHeader = '';
                }
                var newSource = codeHeader + codeBody + '\n';
                input.source = newSource;
            } else {
                for (var index = 0; index < body.length; index++) {
                    var node = body[index];
                    if (node.type === 'ReturnStatement') {
                        var range = node.range;
                        exactReturn = input.source.substring(range[0], range[1]).trim();
                        logger.log(">>>exactReturn: " + exactReturn);
                        range = node.argument.range;
                        exportReturned = input.source.substring(range[0], range[1]).trim();
                        logger.log(">>>exportReturned: ", exportReturned);
                        break;
                    }
                }
                var codeNode = exportReturnedNode.body;
                var range = codeNode.range;
                var codeBody = input.source.substring(range[0], range[1]).trim();
                codeSandwich = input.source.split(codeBody);
                codeBody = codeBody.substring(1, (codeBody.length - 1)).trim();
                logger.log('exportReturned: ', exportReturned);
                if (exportReturned) {
                    var exportedValue = null;
                    try {
                        eval('var foo = ' + exportReturned);
                        exportedValue = foo;
                    } catch (ex) {
                        logger.log('Could not parse the exported expression.', ex);
                    }
                    logger.log('What kind? ', node, exportedValue);
                    if (exportedValue && exportedValue.root) {
                        codeBody = 'export const root = ' + JSON.stringify(exportedValue.root, null, 2) + ';';
                    } else if (node.type === 'CallExpression' || node.type === 'ExpressionStatement') {
                        codeBody = exportReturned + ';';
                    } else if (node.type === 'ReturnStatement') {
                        codeBody = codeBody.split(exactReturn).join('export default ' + exportReturned + ';');
                    } else {
                        codeBody = 'export default ' + exportReturned + ';';
                    }
                }
                var codeHeader = '';
                codeHeader += '/**\n';
                codeHeader += ' * @module ' + amdProcData.moduleName + '\n';
                if (input.camelName === exportReturned) {
                    codeHeader += ' * @exports ' + exportReturned + '\n';
                    amdProcData.exports = exportReturned;
                    input.results.amdProc.exports = exportReturned;
                }
                for (var index = 0; index < importPaths.length; index++) {
                    var importItem = importPaths[index];
                    codeHeader += ' * @requires ' + importItem.path + '\n';
                }
                codeHeader += ' */\n\n';
                for (var index = 0; index < importPaths.length; index++) {
                    var importItem = importPaths[index];
                    if (importItem.name) {
                        codeHeader += 'import ' + importItem.name + ' from \'' + importItem.path + '\';\n';
                    } else {
                        codeHeader += 'import \'' + importItem.path + '\';\n';
                    }
                }
                codeHeader += '\n';
                if (codeSandwich[0].indexOf('define(') !== -1) {
                    logger.log('>>>>>>> codeSandwich.length = ', codeSandwich.length);
                    codeSandwich[0] = '';
                    var codeSandwichTail = codeSandwich[1].split('');
                    for (var c = 0; c < codeSandwichTail.length; c++) {
                        var char = codeSandwichTail[c];
                        if (char === ';' || char === ')' || char === ']' || char === '}') {
                            codeSandwichTail[c] = '';
                        } else {
                            break;
                        }
                    }
                    codeSandwich[1] = codeSandwichTail.join('');
                } else {
                    throw ('Irregular code sandwich!');
                }
                if (input.source.indexOf(codeHeader.trim()) !== -1) {
                    codeHeader = '';
                }
                codeBody = codeSandwich.join(codeBody);
                var newSource = codeHeader + codeBody + '\n';
                input.source = newSource;
            }
        } else {
            console.log('fixDecaffeinateProc did not find AMD');
            var codeHeader = '';
            codeHeader += '/**\n';
            codeHeader += ' * @module ' + amdProcData.moduleName + '\n';
            codeHeader += ' */\n\n';
            if (input.source.indexOf(codeHeader.trim()) === -1) {
                input.source = codeHeader + '\n' + input.source;
            }
        }
        for (var index = 0; index < importPaths.length; index++) {
            var importItem = importPaths[index];
            var symbol = importItem.name;
            if (symbol.length > 0) {
                var assignmentTest = ' ' + symbol + ' = ';
                if (input.source.indexOf(assignmentTest) !== -1) {
                    logger.log('Attempting to re-assign a const: ', symbol);
                    input.source = input.source.split(assignmentTest).join('// ' + assignmentTest);
                }
                assignmentTest = '\n' + symbol + ' = ';
                if (input.source.indexOf(assignmentTest) !== -1) {
                    logger.log('Attempting to re-assign a const: ', symbol);
                    input.source = input.source.split(assignmentTest).join('\n// ' + symbol + ' = ');
                }
            }
        }
        writeFile(input.processedFilePath, input.source.trim() + '\n');
        doneCallback(input);
    }
};
/**
 * Build the header.
 * @param   {object}   input
 * @returns {String} Just the header.
 */
function buildES6Header(input) {
    logger.log('****************** buildES6Header *******************');
    var source = input.source;
    var someNode;
    var importPaths = [];
    var amdProcData = input.results.amdProc;
    var exportReturned = null;
    var isAMD = (source.indexOf('define (') !== -1 || source.indexOf('define(') !== -1);
    if (isAMD) {
        logger.log('buildES6Header BAILING; this file is AMD.');
        return input;
    }
    var ast = null;
    try {
        var _esprima = require('esprima');
        ast = _esprima.parse(input.source, {
            comment: true,
            tolerant: true,
            range: true,
            raw: true,
            tokens: true
        });
    } catch (esError) {
        console.error(esError);
        throw (esError);
    }
    var importStatements = getNodesByType(ast, 'ImportDeclaration');
    var es;
    for (es = 0; es < importStatements.length; es++) {
        someNode = importStatements[es];
        var symbol = someNode.specifiers[0].local.name;
        var path = someNode.source.value;
        importPaths.push({
            path: path,
            name: symbol
        });
    }
    var exportStatements = getNodesByType(ast, 'ExportDefaultDeclaration');
    exportReturned = '';
    if (exportStatements.length) {
        var exportsDefault = exportStatements[0];
        var whatExported = exportsDefault.declaration;
        var exportedSymbol = '';
        if (whatExported.type === 'ClassDeclaration') {
            exportedSymbol = whatExported.id.name;
        } else if (whatExported.type === 'Identifier') {
            exportedSymbol = whatExported.name;
        }
        exportReturned = exportedSymbol;
    }
    var exportSpecialStatements = getNodesByType(ast, 'ExportNamedDeclaration');
    var codeHeader = '';
    codeHeader += '/**\n';
    codeHeader += ' * @module ' + amdProcData.moduleName + '\n';
    if (input.camelName === exportReturned) {
        codeHeader += ' * @exports ' + exportReturned + '\n';
    }
    for (var index = 0; index < importPaths.length; index++) {
        var importItem = importPaths[index];
        codeHeader += ' * @requires ' + importItem.path + '\n';
    }
    codeHeader += ' */\n\n';
    codeHeader += '\n';
    return codeHeader;
}
var fixES6ModulesProc = {
    id: 'fixES6ModulesProc',
    type: 'processor',
    description: 'Fixes imports/exports.',
    process: function (input, doneCallback) {
        logger.log('****************** fixES6ModulesProc *******************');
        var source = input.source;
        var amdProcData = input.results.amdProc;
        var isAMD = (source.indexOf('define (') !== -1 || source.indexOf('define(') !== -1);
        if (isAMD) {
            logger.log('fixES6ModulesProc BAILING; this file is AMD.');
            doneCallback(input);
            return;
        }
        var header = buildES6Header(input);
        if (source.indexOf('@module ') === -1) {
            source = header + '\n' + source;
            input.source = source;
        }
        writeFile(input.processedFilePath, input.source.trim() + '\n');
        doneCallback(input);
    }
};

function isAlpha(input) {
    return (input >= 'a' && input <= 'z\uffff') || (input >= 'A' && input <= 'Z\uffff');
}

function isDigit(input) {
    return (input >= '0' && input <= '9');
}
var fixMyJsProc = {
    id: 'fixMyJsProc',
    type: 'processor',
    description: 'Runs fixmyjs.',
    process: function (input, doneCallback) {
        var jshint = require('jshint').JSHINT;
        var fixmyjs = require('fixmyjs');
        if (input.errors[this.id] == null) {
            input.errors[this.id] = [];
        }
        var JSHINT = require('jshint')
            .JSHINT;
        var options = {
            browser: true,
            curly: true,
            eqnull: true,
            camelcase: true,
            yui: true,
            jquery: true,
            undef: true,
            shadow: false,
            validthis: false,
            newcap: true
        };
        var globals = {
            'YUI_config': false,
            'define': false,
            'require': false,
            'FB': false,
            'OA_output': false
        };
        JSHINT.errors = null;
        var success = JSHINT(input.source, options, globals);
        input.errors[this.id] = JSHINT.errors;
        input.source = fixmyjs(jshint.data(), input.source, options).run();
        success = JSHINT(input.source, options, globals);
        input.errors[this.id] = JSHINT.errors;
        JSHINT.errors = null;
        doneCallback(input);
    }
};
/**
 * using eslint
 */
var esLintFixProc = {
    id: 'esLintFixProc',
    type: 'processor',
    description: 'Runs eslint --fix.',
    process: function (input, doneCallback) {
        var path = require('path');
        var exePath = path.normalize('node_modules/.bin/eslint --fix');
        var exec = require('child_process').exec;
        var cmdLine = exePath;
        cmdLine += ' ' + input.processedFilePath;
        logger.log(cmdLine);
        var child = exec(cmdLine, function (error, stdout, stderr) {
            if (stderr) {
                console.error(stderr);
            }
        });
        /**
         * Close.
         * @param code
         */
        child.on('close', function (code) {
            logger.log('lintFix process exited with code ' + code);
            doneCallback(input);
        });
        child.on('error', function (code) {
            logger.log('lintFix process errored with code ' + code);
        });
    }
};
var uglifyProc = {
    id: 'uglifyProc',
    type: 'processor',
    description: 'Calls uglify2 on the content.',
    process: function (input, doneCallback) {
        if (input.errors[this.id] == null) {
            input.errors[this.id] = [];
        }
        var uglyResult = uglyDucklify(this.id, input.source);
        if (uglyResult.code !== '<ERROR>') {
            input.source = uglyResult.code;
        }
        doneCallback(input);
    }
};

function createJavaClass(input, amdProcData, classData) {
    var index = 0;
    var AMD = amdProcData.AMD;
    var ctorData = classData.namedConstructors;
    var methods = [];
    if (classData.jsDoccerProcData) {
        methods = classData.jsDoccerProcData.methods;
    } else {
        console.error("ERROR: no jsDoccerProcData");
    }
    var exportPath = 'javasrc';
    if (input.camelName.indexOf('/') !== -1) {
        input.camelName = input.camelName.split('/').join('_');
        input.camelName = camelize(input.camelName);
    }
    if (input.camelName.indexOf('.') !== -1) {
        input.camelName = input.camelName.split('.').join('_');
        input.camelName = camelize(input.camelName);
    }
    var classFileName = input.camelName + '.java';
    var packageSubpath = AMD ? amdProcData.webPath : input.packagePath;
    var deps = [];
    if (AMD) {
        deps = amdProcData.requires;
    } else if (input.NG) {
        deps = input.ngDeps;
    } else {
        deps = input.inlineDeps;
    }
    var subPackage = packageSubpath.split('/').join('.');
    var buffer = [];
    buffer.push('package com.ctct.galileo' + subPackage + ';');
    buffer.push('public class ' + capitalize(input.camelName) + ' {');
    if (deps == null) {
        deps = [];
    }
    for (index = 0; index < deps.length; index++) {
        var moduleName = deps[index];
        if (moduleName.indexOf('/') !== -1) {
            moduleName = moduleName.split('/').pop();
        }
        moduleName = moduleName.split('__').join('_');
        var pseudoClass = moduleName;
        if (typeof moduleName !== 'string') {
            continue;
        }
        if (moduleName.indexOf('/') !== -1) {
            moduleName = moduleName.split('/').join('.');
        }
        if (moduleName.indexOf('.') !== -1) {
            pseudoClass = moduleName.split('.')[0].trim();
            moduleName = moduleName.split('.').join('_');
        }
        moduleName = moduleName.split('__').join('_');
        moduleName = moduleName.split('_').join('');
        moduleName = camelize(moduleName);
        if (moduleName === 'Jquery') {
            moduleName = 'JQuery';
        }
        if (moduleName.length === 0) {
            continue;
        }
        if (moduleName.indexOf('.json') !== -1) {
            continue;
        }
        var camelName = camelize(moduleName);
        var memberName = camelName;
        memberName = memberName.split('');
        memberName[0] = memberName[0].toLowerCase();
        memberName = memberName.join('');
        buffer.push('  public ' + capitalize(camelName) + ' ' + memberName + ' = null;');
    }
    for (index = 0; index < methods.length; index++) {
        var method = methods[index];
        if (method.name.indexOf(']') !== -1) {
            continue;
        }
        if (method.name.indexOf('/') !== -1) {
            method.name = method.name.split('/').join('_');
        }
        if (method.name.indexOf('.') !== -1) {
            method.name = method.name.split('.').join('_');
        }
        method.name = method.name.split('__').join('_');
        method.name = method.name.split('__').join('_');
        method.name = camelize(method.name);
        if (method.name.indexOf("_") === 0) {
            buffer.push('private  void ' + method.name.split('_').join('') + '(){}');
        } else {
            buffer.push('public  void ' + method.name + '(){}');
        }
    }
    buffer.push('  public ' + capitalize(input.camelName) + '() {');
    buffer.push('  }');
    buffer.push('}');
    var src = buffer.join('\n');
    writeFile(exportPath + '/' + packageSubpath + '/' + classFileName, src);
}
var generateJavaProc = {
    id: 'generateJavaProc',
    type: 'processor',
    description: 'Writes a fake Java class for each module.',
    process: function (input, doneCallback) {
        if (input.errors[this.id] == null) {
            input.errors[this.id] = [];
        }
        var amdProcData = input.results.amdProc;
        createJavaClass(input, amdProcData, input);
        doneCallback(input);
    }
};
var AMD_DATA = {
    paths: {},
    shim: {}
};
var amdProc = {
    id: 'amdProc',
    type: 'processor',
    description: 'Gets the module name and requires[] array for the module, or nulls if not found.',
    process: function (input, doneCallback) {
        if (input.results[this.id] == null) {
            input.results[this.id] = {};
        }
        var result = input.results[this.id];
        result.requires = [];
        result.usedAs = [];
        result.moduleName = input.fileName.split('.js')[0];
        result.AMD = false;
        result.webPath = input.webPath;
        var converted = convert(input.source, input.path);

        function fixRequires(inputArray) {
            var result = [];
            for (var index = 0; index < inputArray.length; index++) {
                var temp = inputArray[index];
                var rawTemp = temp;
                if (temp == null) {
                    continue;
                }
                if (temp.length === 0) {
                    continue;
                }
                temp = temp.split('\'').join('');
                result.push(trim(temp));
            }
            return result;
        }
        result.requires = fixRequires(converted.requires);
        result.usedAs = converted.depVarnames;
        var inlineRequires = fixRequires(getInlineRequires(input));
        for (var ir = 0; ir < inlineRequires.length; ir++) {
            var inlineModule = inlineRequires[ir];
            result.requires.push(inlineModule);
        }
        result.convertedName = converted.name;
        result.AMD = converted.isModule;
        result.min = converted.min;
        result.main = converted.isMain;
        result.uses_$ = input.source.indexOf('$(') !== -1;
        result.uses_Y = converted.callsYuiApi;
        result.uses_alert = input.source.indexOf('alert(') !== -1;
        result.strict = input.source.indexOf('use strict') !== -1;
        logger.log('amdProc', 'DONE');
        doneCallback(input);
    }
};
/**
 * Gets all the instances of require() in the code body.
 *
 * @todo: Not robust! Not comment-proof!
 *          input The source script.
 * @param input
 */
function getInlineRequires(input) {
    var source = input.source;
    source = stripOneLineComments(stripCComments(source));
    var noSpaceRequire = source.indexOf("require(");
    var oneSpaceRequire = source.indexOf("require (");
    if (noSpaceRequire === -1 && oneSpaceRequire === -1) {
        return [];
    }
    var output = [];
    var chunks = [];
    if (noSpaceRequire > -1) {
        chunks = source.split("require(");
        for (var index = 1; index < chunks.length; index++) {
            var chunk = chunks[index];
            var trimChunk = chunk.trim();
            var startChar = trimChunk.charAt(0);
            var splitter = trimChunk.split(startChar);
            var moduleName = splitter[1].trim();
            moduleName = moduleName.split('*/').join('');
            if (startChar === "'" || startChar === '"') {
                output.push(moduleName);
            } else {
                logger.log('getInlineRequires() skipped: ' + moduleName);
            }
        }
    } else if (oneSpaceRequire > -1) {
        chunks = source.split("require (");
        for (var index = 1; index < chunks.length; index++) {
            var chunk = chunks[index];
            var trimChunk = chunk.trim();
            var startChar = trimChunk.charAt(0);
            var splitter = trimChunk.split(startChar);
            var moduleName = splitter[1].trim();
            moduleName = moduleName.split('*/').join('');
            if (startChar === "'" || startChar === '"') {
                output.push(moduleName);
            } else {
                logger.log('getInlineRequires() skipped: ' + moduleName);
            }
        }
    }
    return output;
}

function genDoc(fileName, callBackDone) {
    var jsdog = require('jsdog');
    var util = require('util');
    var fs = require('fs');
    var jade = require('jade');
    var jsdog = require('jsdog');
    var nopt = require('nopt');
    var Stream = require('stream')
        .Stream;
    var path = require('path');
    var knownOpts = {
            'source': path,
            'tests': path,
            'template': path,
            'title': String,
            'dump': Boolean,
            'loglevel': Number,
            'help': Boolean,
            'wrap': String,
            'ignore': Boolean
        },
        shortOpts = {
            's': '--source',
            't': '--tests',
            'm': '--template',
            'n': '--title',
            'v': ['--loglevel', '2'],
            'h': '--help',
            'w': '--wrap',
            'i': '--ignore'
        };
    var parsed = {
        'source': fileName
    };
    var jadeOpts = {},
        filename = parsed.source,
        qunitTestFile = parsed.tests ? fs
        .readFileSync(parsed.tests) + '' : '',
        templateFile = parsed.template ? parsed.template : path
        .dirname(require.resolve('jsdog')) + '/default.jade',
        pageTitle = parsed.title ? parsed.title : path
        .basename(filename),
        dumpAfterParse = parsed.dump ? parsed.dump : false,
        ll = parsed.loglevel ? parsed.loglevel : 0,
        wrapper = parsed.wrap ? parsed.wrap : false;
    if (!pageTitle) {
        pageTitle = filename;
    }
    jsdog.parseSourceFile(filename, parsed, function (data) {
        jadeOpts.locals = {
            pageTitle: pageTitle,
            docs: data.docs,
            genTime: data.genTime,
            src: data.src
        };
        jade.renderFile(templateFile, jadeOpts, function (err, html) {
            if (err) {
                throw err;
            }
            callBackDone(html);
        });
    });
}
var jsDogProc = {
    id: 'jsDogProc',
    type: 'processor',
    description: 'Generates jsDog markdown. TODO: template',
    process: function (input, doneCallback) {
        if (input.errors[this.id] == null) {
            input.errors[this.id] = [];
        }
        var jsdog = require('jsdog');
        var path = '';
        if (WRITE_ENABLED) {
            path = input.processedFilePath;
        } else {
            path = input.path;
        }
        try {
            genDoc(path, function done(html) {
                input.documentation = html;
                writeFile(input.processedFilePath + '.html', html);
                doneCallback(input);
            });
            input.errors[this.id] = ex.message;
            doneCallback(input);
        } catch (e) {}
    }
};
var yuiDocProc = {
    id: 'yuiDocProc',
    type: 'processor',
    description: 'Generates yuidoc JSON. TODO: template',
    process: function (input, doneCallback) {
        if (input.errors[this.id] == null) {
            input.errors[this.id] = [];
        }

        function runYuiDocOnFile(fileNameIn, sourceIn) {
            var yuidoc = require('yuidocjs');
            var _fs = require('fs');
            var _path = require('path');
            var jsonResult = {};
            var fileName = _path.normalize(fileNameIn);
            var fileParentDirectory = _path.dirname(fileName);
            var fileSource = '';
            var fileOutputDirectory = './out';
            if (sourceIn != null) {
                fileSource = sourceIn;
            } else {
                fileSource = readFile(fileName);
            }

            function readFile(filePathName) {
                var FILE_ENCODING = 'utf8';
                filePathName = _path.normalize(filePathName);
                var source = '';
                try {
                    source = _fs.readFileSync(filePathName, FILE_ENCODING);
                } catch (er) {}
                return source;
            }
            var options = {
                quiet: true,
                writeJSON: false,
                outdir: fileOutputDirectory,
                extension: '.js',
                norecurse: true,
                paths: [fileParentDirectory],
                syntaxtype: 'js',
                parseOnly: true
            };
            var docParserConfig = {
                syntaxtype: 'js',
                filemap: {
                    fileName: fileSource
                },
                dirmap: {
                    fileName: fileParentDirectory
                }
            };
            try {
                var yd = new yuidoc.YUIDoc(options);
                var parser = new yuidoc.DocParser(docParserConfig);
                var parsed = parser.parse();
                json = yd.writeJSON(parsed);
                jsonResult.result = json;
            } catch (e) {
                jsonResult.error = e;
            }
            return jsonResult;
        }
        var path = '';
        if (WRITE_ENABLED) {
            path = input.processedFilePath;
        } else {
            path = input.path;
        }
        var docData = runYuiDocOnFile(path, input.source);
        if (docData.error != null) {
            input.errors[this.id] = [docData.error];
        } else {
            input.results[this.id] = docData.result;
        }
        doneCallback(input);
    }
};
var fixClassDeclarationsProc = {
    id: 'fixClassDeclarationsProc',
    type: 'processor',
    description: 'Annotates class declarations that may not have a constructor.',
    process: function (input, doneCallback) {
        if (input.errors[this.id] == null) {
            input.errors[this.id] = [];
        }
        var lines = input.source.split('\n');
        for (var index = 0; index < lines.length; index++) {
            lines[index] = addExtendsAnnotation(input, lines, index);
        }
        input.source = lines.join('\n');
        writeFile(input.processedFilePath, input.source);
        doneCallback(input);
    }
};

function addExtendsAnnotation(inputObject, linesArray, whereInlines) {
    var instance = linesArray[whereInlines];
    if (instance.indexOf('.extend(') !== -1 || instance.indexOf('.extend (') !== -1) {
        var source = '<?source?>';
        var dest = '<?destination?>';
        var extender = '?';
        var usingBackBone = false;
        var notAClass = false;
        var splitter = instance.split('.extend');
        var leftOfExtend = trim(splitter[0]);
        if (leftOfExtend.indexOf('=') !== -1) {
            var extenderSplit = leftOfExtend.split('=');
            dest = trim(extenderSplit[0]);
            if (dest.indexOf('var ') !== -1) {
                dest = trim(dest.substring(4));
            }
            extender = trim(extenderSplit[1]);
            if (extenderSplit.indexOf(' new ') !== -1) {
                notAClass = true;
            }
        }
        if (extender == '$' || extender == '_' || extender == 'YUI()' || extender == 'Y') {
            if (extender == 'Y') {
                var expression = splitter[1];
                var afterLeftParenthesis = expression.split('(')[1];
                var firstItem = afterLeftParenthesis.split(',')[0];
                source = firstItem;
            } else if (extender == '$') {
                var expression = splitter[1];
                var afterLeftParenthesis = expression.split('(')[1];
                if (afterLeftParenthesis.indexOf(')') !== -1) {
                    afterLeftParenthesis = afterLeftParenthesis.split(')')[0];
                }
                var splitArgs = afterLeftParenthesis.split(',');
                var firstItem = splitArgs[0];
                source = firstItem;
                if (splitArgs.length > 1) {
                    var secondItem = '';
                    secondItem = afterLeftParenthesis.split(',')[1];
                    source = secondItem;
                }
            }
        } else {
            usingBackBone = true;
            source = extender;
        }
        if (dest.indexOf('.') !== -1) {
            notAClass = true;
        }
        if (!isUpperCase(dest.charAt(0))) {
            notAClass = true;
        }
        if (usingBackBone && !notAClass) {
            var previousComment = getLastJsDocComment(inputObject, linesArray,
                whereInlines);
            if (previousComment.description != null) {}
            instance = '/**\n * @constructor ' + dest + '\n * @augments ' + source + '\n */\n' + instance;
        }
        if (!notAClass) {}
    }
    return instance;
}

function getLastJsDocComment(inputObject, linesIn, topOfBlock) {
    var inComment = false;
    var buffer = [];
    var comments = {};
    var indx = 0;
    for (indx = topOfBlock; indx > -1; indx--) {
        var line = trim(linesIn[indx]);
        if (line.length > 0) {
            if (line.indexOf('*/') !== -1) {
                if (line.indexOf('/**') !== -1) {
                    buffer.push(line);
                } else if (line.indexOf('/*') !== -1) {
                    buffer.push(line);
                } else {
                    inComment = true;
                    continue;
                }
            } else if (line.indexOf('/*') !== -1) {
                if (inComment) {
                    if (line.indexOf('/**') !== -1) {}
                }
                inComment = false;
                var inDescription = true;
                var desc = '';
                for (var x = 0; x < buffer.length; x++) {
                    var chunk = trim(buffer[x]);
                    chunk = chunk.split('*');
                    chunk.shift();
                    chunk = trim(chunk.join('*'));
                    if (chunk.indexOf('@') === 0) {
                        chunk = chunk.substring(1);
                        var tagName = chunk.split(' ')
                            .shift();
                        comments[tagName] = chunk;
                        if (inDescription) {
                            inDescription = false;
                        }
                    } else {
                        if (inDescription) {
                            if (desc.length > 0) {
                                desc += '\n';
                            }
                            desc += chunk;
                        }
                    }
                }
                comments.description = desc;
                return comments;
            }
            if (inComment) {
                buffer.push(line);
            }
        }
    }
    return comments;
}
var badCharactersProc = {
    id: 'badCharactersProc',
    type: 'processor',
    description: 'Substitutes some bad characters.',
    process: function (input, doneCallback) {
        if (input.errors[this.id] == null) {
            input.errors[this.id] = [];
        }

        function checkExpression(inputObject, id, src, wrong, right) {
            if (src.indexOf(wrong) !== -1) {
                var wrongName = wrong;
                if (wrongName == '\t') {
                    wrongName = '\'\\t\'';
                } else if (wrongName == '\r\n') {
                    wrongName = '\'\\r\\n\'';
                } else if (wrongName == '\r') {
                    wrongName = '\'\\r\'';
                }
                if (inputObject.errors[id] == null) {
                    inputObject.errors[id] = [];
                }
                var error = {
                    'id': '(error)',
                    'raw': 'Bad character(s) found.',
                    'code': 'wfBC',
                    'evidence': '',
                    'line': -1,
                    'character': -1,
                    'scope': '(main)',
                    'a': '',
                    'reason': 'Bad character(s) found: \'' + wrongName + '\'.'
                };
                inputObject.errors[id].push(error);
                src = src.split(wrong)
                    .join(right);
            }
            return src;
        }
        input.source = checkExpression(input, this.id, input.source, '\r\n',
            '\n');
        input.source = checkExpression(input, this.id, input.source, '\r', '\n');
        input.source = checkExpression(input, this.id, input.source, '\t', '  ');
        writeFile(input.processedFilePath, input.source);
        doneCallback(input);
    }
};
var jsDocNameFixerProc = {
    id: 'jsDocNameFixerProc',
    type: 'processor',
    description: 'Substitutes some jsDoc tokens.',
    process: function (input, doneCallback) {
        if (input.errors[this.id] == null) {
            input.errors[this.id] = [];
        }

        function checkExpression(inputObject, id, src, wrong, right) {
            if (src.indexOf(wrong) !== -1) {
                var wrongName = wrong;
                if (wrongName == '\t') {
                    wrongName = '\'\\t\'';
                } else if (wrongName == '\r\n') {
                    wrongName = '\'\\r\\n\'';
                } else if (wrongName == '\r') {
                    wrongName = '\'\\r\'';
                }
                var error = {
                    'id': '(error)',
                    'raw': 'jsDoc tag error.',
                    'code': 'wfJD',
                    'evidence': '',
                    'line': -1,
                    'character': -1,
                    'scope': '(main)',
                    'a': '',
                    'reason': 'jsDoc tag error: found \'' + wrongName + '\'.'
                };
                inputObject.errors[id].push(error);
                src = src.split(wrong)
                    .join(right);
            }
            return src;
        }
        var src = trim(input.source);
        var lineOne = src.split('\n')[0];
        if (lineOne.indexOf('/*') !== -1 && lineOne.indexOf('/**') === -1) {
            var error = {
                'id': '(error)',
                'raw': 'jsDoc tag error.',
                'code': 'wfJD',
                'evidence': lineOne,
                'line': 0,
                'character': 0,
                'scope': '(main)',
                'a': '',
                'reason': 'jsDoc tag error: Comment at top of file begins with /*, not /**.'
            };
            input.errors[this.id].push(error);
        }
        input.source = checkExpression(input, this.id, input.source,
            '@return nothing', '');
        input.source = checkExpression(input, this.id, input.source,
            '@return void', '');
        input.source = checkExpression(input, this.id, input.source,
            '@return nada', '');
        input.source = checkExpression(input, this.id, input.source,
            '@param Object', '@param {Object}');
        input.source = checkExpression(input, this.id, input.source,
            '@returns ', '@return ');
        input.source = checkExpression(input, this.id, input.source,
            '@param object', '@param {Object}');
        input.source = checkExpression(input, this.id, input.source,
            '@param Array', '@param {Array}');
        input.source = checkExpression(input, this.id, input.source,
            '@param String', '@param {String}');
        input.source = checkExpression(input, this.id, input.source,
            '@param bool', '@param {Boolean}');
        input.source = checkExpression(input, this.id, input.source,
            '@param boolean', '@param {Boolean}');
        input.source = checkExpression(input, this.id, input.source,
            '@param {bool}', '@param {Boolean}');
        input.source = checkExpression(input, this.id, input.source,
            '@param int', '@param {Number}');
        input.source = checkExpression(input, this.id, input.source,
            '@param float', '@param {Number}');
        writeFile(input.processedFilePath, input.source);
        doneCallback(input);
    }
};
var parseFilter = {
    id: 'parseFilter',
    type: 'filter',
    description: 'Filters out js files that cannot be parsed.',
    process: function (input, doneCallback) {
        if (input.errors[this.id] == null) {
            input.errors[this.id] = [];
        }
        var _esprima = require('esprima');
        try {
            var ast = _esprima.parse(input.source);
            doneCallback(input);
        } catch (ex) {
            input.errors[this.id] = ex.message;
            finishedProcessingChain();
        }
    }
};

function scanForMinifiedLines(input) {
    var lines = input.split('\n');
    var linesLength = lines.length;
    var strikes = 0;
    for (var index = 0; index < linesLength; index++) {
        var line = lines[index].trim();
        if (line.length > 200) {
            strikes++;
            if (strikes > 2) {
                return true;
            }
        } else {
            strikes = 0;
        }
    }
    return false;
}
var minFilter = {
    id: 'minFilter',
    type: 'filter',
    description: 'Filters out js files that are minified.',
    process: function (input, doneCallback) {
        if (input.errors[this.id] == null) {
            input.errors[this.id] = [];
        }
        if (input.fileName.indexOf('.min.js') !== -1 || input.fileName.indexOf('-min.js') !== -1) {
            finishedProcessingChain();
        } else if (scanForMinifiedLines(input.source)) {
            finishedProcessingChain();
        } else {
            doneCallback(input);
        }
    }
};
var yuiFilter = {
    id: 'yuiFilter',
    type: 'filter',
    description: 'Filters out js files that are not YUI modules.',
    process: function (input, doneCallback) {
        if (input.errors[this.id] == null) {
            input.errors[this.id] = [];
        }
        var temp = input.source;
        var stripped = stripOneLineComments(stripCComments(temp));
        var yuiAdd_A = stripped.indexOf('YUI().add(') !== -1;
        var yuiAdd_B = stripped.indexOf('YUI.add(') !== -1;
        if (yuiAdd_A || yuiAdd_B) {
            doneCallback(input);
        } else {
            finishedProcessingChain();
        }
    }
};
var JSONFilter = {
    id: 'JSONFilter',
    type: 'filter',
    description: 'Filters out js files that ARE really just simple JSON files.',
    process: function (input, doneCallback) {
        if (input.errors[this.id] == null) {
            input.errors[this.id] = [];
        }
        temp = input.source;
        var stripped = stripOneLineComments(stripCComments(temp));
        var isJSON = stripped.trim().indexOf('{') === 0;
        if (!isJSON) {
            doneCallback(input);
        } else {
            finishedProcessingChain();
        }
    }
};
var amdFilter = {
    id: 'amdFilter',
    type: 'filter',
    description: 'Filters out js files that are not AfMD modules.',
    process: function (input, doneCallback) {
        if (input.errors[this.id] == null) {
            input.errors[this.id] = [];
        }
        temp = input.source;
        var stripped = stripOneLineComments(stripCComments(temp));
        var isModule = stripped.indexOf('define(') !== -1;
        var isMain = stripped.indexOf('require(') !== -1;
        if (isModule || isMain) {
            doneCallback(input);
        } else {
            finishedProcessingChain();
        }
    }
};
var thirdPartyFilter = {
    id: 'thirdPartyFilter',
    type: 'filter',
    description: 'Filters out js files in defined 3rd party directories.',
    process: function (input, doneCallback) {
        if (input.errors[this.id] == null) {
            input.errors[this.id] = [];
        }
        var temp = input.path;
        var pathDelim = temp.indexOf('/') == -1 ? '\\' : '/';
        if (input.fileName.indexOf('afc') === -1 && input.fileName.indexOf('corsframe') === -1 && input.fileName.indexOf('foresee') === -1) {
            if (temp.indexOf(pathDelim + 'lib') === -1 && temp.indexOf(pathDelim + 'yui_sdk') === -1 && temp.indexOf(pathDelim + 'infrastructure') === -1 && input.source.indexOf('ShockwaveFlash') === -1) {
                doneCallback(input);
            } else {
                input.errors[this.id] = 'In a designated 3rd party folder.';
                finishedProcessingChain();
            }
        } else {
            input.errors[this.id] = 'In a designated 3rd party folder.';
            finishedProcessingChain();
        }
    }
};
var libFilesFilter = {
    id: 'libFilesFilter',
    type: 'filter',
    description: 'Filters out js files in defined 3rd party directories.',
    process: function (input, doneCallback) {
        if (input.errors[this.id] == null) {
            input.errors[this.id] = [];
        }
        var temp = input.path;
        var pathDelim = temp.indexOf('/') == -1 ? '\\' : '/';
        var pathParse = temp.split(pathDelim);
        if (pathParse.pop() === 'lib') {
            input.errors[this.id] = 'In a designated 3rd party folder.';
            finishedProcessingChain();
        } else {
            doneCallback(input);
        }
    }
};
var amdOrYuiFilter = {
    id: 'amdOrYuiFilter',
    type: 'filter',
    description: 'Filters out js files that are not valid modules.',
    process: function (input, doneCallback) {
        if (input.errors[this.id] == null) {
            input.errors[this.id] = [];
        }
        temp = input.source;
        var stripped = stripOneLineComments(stripCComments(temp));
        var yuiAdd_A = stripped.indexOf('YUI().add(') !== -1;
        var yuiAdd_B = stripped.indexOf('YUI.add(') !== -1;
        var isModule = stripped.indexOf('define(') !== -1;
        var isMain = stripped.indexOf('require(') !== -1;
        if ((yuiAdd_A || yuiAdd_B || isModule || isMain) && temp.indexOf('@license') == -1 && temp.indexOf('define.amd') == -1 && temp.indexOf('Yahoo! Inc') == -1) {
            input.moduleFile = true;
            doneCallback(input);
        } else {
            input.moduleFile = false;
            finishedProcessingChain();
        }
    }
};
var jsBeautifyProc = {
    id: 'jsBeautifyProc',
    type: 'processor',
    description: 'node-js-beautify module. TODO: add options support.',
    process: function (input, doneCallback) {
        if (input.errors[this.id] == null) {
            input.errors[this.id] = [];
        }

        function unpacker_filter(source) {
            var trailing_comments = '',
                comment = '',
                unpacked = '',
                found = false;
            do {
                found = false;
                if (/^\s*\/\*/.test(source)) {
                    found = true;
                    comment = source.substr(0, source.indexOf('*/') + 2);
                    source = source.substr(comment.length)
                        .replace(/^\s+/, '');
                    trailing_comments += comment + '\n';
                } else if (/^\s*\/\//.test(source)) {
                    found = true;
                    comment = source.match(/^\s*\/\/.*/)[0];
                    source = source.substr(comment.length)
                        .replace(/^\s+/, '');
                    trailing_comments += comment + '\n';
                }
            } while (found);
            var unpackers = [P_A_C_K_E_R, Urlencoded, JavascriptObfuscator,
                MyObfuscate
            ];
            for (var i = 0; i < unpackers.length; i++) {
                if (unpackers[i].detect(source)) {
                    unpacked = unpackers[i].unpack(source);
                    if (unpacked != source) {
                        source = unpacker_filter(unpacked);
                    }
                }
            }
            return trailing_comments + source;
        }
        var beautify = require('js-beautify');
        input.source = beautify(input.source, {
            'indent_size': 2,
            'indent_char': ' ',
            'indent_level': 0,
            'indent_with_tabs': false,
            'preserve_newlines': true,
            'max_preserve_newlines': 1,
            'jslint_happy': true,
            'brace_style': 'collapse',
            'keep_array_indentation': false,
            'keep_function_indentation': false,
            'space_before_conditional': true,
            'break_chained_methods': false,
            'eval_code': false,
            'unescape_strings': false,
            'wrap_line_length': 200
        });
        writeFile(input.processedFilePath, input.source);
        doneCallback(input);
    }
};
var jsHintProc = {
    id: 'jsHintProc',
    type: 'processor',
    description: 'node jsHint module. TODO: add options support.',
    process: function (input, doneCallback) {
        if (input.errors[this.id] == null) {
            input.errors[this.id] = [];
        }
        var JSHINT = require('jshint')
            .JSHINT;
        var options = {
            browser: true,
            curly: true,
            eqnull: true,
            camelcase: true,
            yui: true,
            jquery: true,
            undef: true,
            shadow: false,
            validthis: false,
            newcap: true
        };
        var globals = {
            'YUI_config': false,
            'define': false,
            'require': false,
            'FB': false,
            'OA_output': false
        };
        JSHINT.errors = null;
        var success = JSHINT(input.source, options, globals);
        input.errors[this.id] = JSHINT.errors;
        JSHINT.errors = null;
        doneCallback(input);
    }
};
var trimProc = {
    id: 'trimProc',
    type: 'processor',
    description: 'Trim each line of the file.',
    process: function (input, doneCallback) {
        if (input.errors[this.id] == null) {
            input.errors[this.id] = [];
        }
        var source = input.source;
        var lines = source.split('\n');
        for (var index = 0; index < lines.length; index++) {
            var line = lines[index];
            line = trim(line);
            lines[index] = line;
        }
        input.source = lines.join('\n');
        doneCallback(input);
    }
};
var esFormatterProc = {
    id: 'esFormatterProc',
    type: 'processor',
    description: 'esprima beautify',
    process: function (input, doneCallback) {
        if (input.errors[this.id] == null) {
            input.errors[this.id] = [];
        }
        var source = input.source;
        var esformatter = require('esformatter');
        var options = {
            preset: 'default',
            indent: {
                value: '  '
            },
            lineBreak: {
                before: {
                    BlockStatement: 1,
                    DoWhileStatementOpeningBrace: 1
                }
            },
            whiteSpace: {}
        };
        input.source = esformatter.format(source, options);
        doneCallback(input);
    }
};
var jsDoccerProc = {
    id: 'jsDoccerProc',
    type: 'processor',
    description: 'Runs jsDoccer tool, generating a jsDoc coverage report.',
    process: function (input, doneCallback) {
        if (input.errors[this.id] == null) {
            input.errors[this.id] = [];
        }

        function runJsDoccer(fileName, id) {
            var basePath = _path.normalize(input.outputDirectory + '/' + input.packagePath);
            var name = input.fileName;
            var internalErrors = [];
            var inputSource = input.source;
            var stripped = stripOneLineComments(inputSource);
            stripped = stripCComments(stripped).trim();
            if (stripped.length === 0) {
                var lineNumber = 0;
                var reason = 'File does not contain JavaScript.';
                var error = {
                    'id': '(empty)',
                    'raw': 'emptyFileError',
                    'code': 'addMissingComments',
                    'evidence': '',
                    'line': 0,
                    'character': 0,
                    'scope': '(main)',
                    'a': '',
                    'reason': reason
                };
                input.errors[id].push(error);
                FILE_IS_EMPTY = true;
            }
            var stdout = null;
            try {
                stdout = addMissingComments(input, internalErrors);
            } catch (ex) {
                console.error(ex.stack);
            }
            if (internalErrors.length > 0) {
                var lineNumber = -1;
                var reason = 'Parse error. Aborted.';
                var error = {
                    'id': '(error)',
                    'raw': 'parseError',
                    'code': 'addMissingComments',
                    'evidence': '',
                    'line': -1,
                    'character': -1,
                    'scope': '(main)',
                    'a': '',
                    'reason': reason
                };
                input.errors[id].push(error);
            }
            var splitter = stdout.split('/*jsdoc_prep_data*/');
            try {
                input.jsDoccerProcData = JSON.parse(unescape(splitter[0]));
                var amdProcData = input.results.amdProc;
                input.jsDoccerProcData.requires = amdProcData.requires;
                input.jsDoccerProcData.is_module = amdProcData.AMD;
                input.jsDoccerProcData.min = amdProcData.min;
                input.jsDoccerProcData.main = amdProcData.main;
                input.jsDoccerProcData.uses_$ = amdProcData.uses_$;
                input.jsDoccerProcData.uses_Y = amdProcData.uses_Y;
                input.jsDoccerProcData.uses_alert = amdProcData.uses_alert;
                input.jsDoccerProcData.strict = amdProcData.strict;
                input.jsDoccerProcData.uses_console_log = input.source.indexOf('console.') !== -1;
                input.jsDoccerProcData.uses_backbone = input.source.indexOf('Backbone.') !== -1;
                var classes = input.jsDoccerProcData.classes;
                if (classes[input.camelName] == null) {
                    var classArray = [];
                    for (var c in classes) {
                        classArray.push(classes[c]);
                    }
                    if (classArray.length > 0) {
                        input.possibleClassname = classArray[0].name;
                    }
                }
                var methods = input.jsDoccerProcData.methods;
                for (var m = 0; m < methods.length; m++) {
                    var method = methods[m];
                    if (method.visibility === 'public') {
                        if (method.originalJsDocDescription == null) {
                            method.originalJsDocDescription = {};
                        }
                        var keys = [];
                        for (var k in method.originalJsDocDescription) {
                            if (method.originalJsDocDescription
                                .hasOwnProperty(k)) {
                                keys.push(method.originalJsDocDescription[k]);
                            }
                        }
                        if (keys.length === 0) {
                            var lineNumber = method.lineNumber;
                            var reason = 'No jsDoc Comments for method \'' + method.name + '\'.';
                            var error = {
                                'id': '(error)',
                                'raw': reason,
                                'code': 'wfJD',
                                'evidence': method.line,
                                'line': lineNumber,
                                'character': -1,
                                'scope': '(main)',
                                'a': '',
                                'reason': reason
                            };
                            input.errors[id].push(error);
                        }
                    }
                }
            } catch (ex) {
                input.jsDoccerProcData = null;
            }
            input.source = unescape(splitter[1]);
            input.testStubs = unescape(splitter[2]);
            writeFile(input.processedFilePath, input.source);
            doneCallback(input);
        }
        var path = '';
        if (WRITE_ENABLED) {
            path = input.processedFilePath;
        } else {
            path = input.path;
        }
        runJsDoccer(path, this.id);
    }
};

function test() {
    var basePath = 'jsdoc-preptoolkit';
    var inPath = 'jsdoc-preptoolkit\\includes\\js\\toolkit\\toolkit.js';
    var outPath = 'jsdoc-preptoolkit\\processed';
    var testPath = 'jsdoc-preptoolkit\\jstests';
    var docPath = 'jsdoc-preptoolkit\\jsdocs';
    processFile({}, basePath, inPath, outPath, testPath, docPath, [jsLintProc],
        function (result) {});
}

function readFile(filePathName) {
    filePathName = _path.normalize(filePathName);
    var source = '';
    try {
        source = _fs.readFileSync(filePathName, FILE_ENCODING);
    } catch (er) {}
    return source;
}

function writeFile(filePathName, source) {
    if (WRITE_ENABLED) {
        filePathName = _path.normalize(filePathName);
        safeCreateFileDir(filePathName);
        _fs.writeFileSync(filePathName, source);
    }
}

function setWriteEnable(val) {
    WRITE_ENABLED = val;
}

function processSingleFile(options, completionCallback) {
    var filePathName = options.sourceFile;
    var processingChain = options.processingChain;
    var coffeeModuleClassName = options.moduleClassName;
    var coffeeModuleExport = options.moduleExport;
    var writeEnable = true;
    var outputfilePathName = filePathName;
    FILE_IS_EMPTY = false;
    var output = {};
    output.results = {};
    output.errors = {};
    if (!filePathName) {
        output.error = 'filePathName is null';
        return output;
    }
    var pathDelim = filePathName.indexOf('/') == -1 ? '\\' : '/';
    WRITE_ENABLED = writeEnable = writeEnable != null ? writeEnable : false;
    finishedProcessingChain = _finishedProcessingChain;
    filePathName = _path.normalize(filePathName);
    var wholePath = filePathName.split(pathDelim);
    var fileName = wholePath.pop();
    wholePath = wholePath.join(pathDelim);
    output.fileName = fileName;
    output.fullFileName = filePathName;
    output.path = filePathName;
    output.processedFilePath = filePathName;
    logger.log('processSingleFile', 8);
    var libFile = false;
    var min = filePathName.indexOf('.min.') !== -1 || filePathName.indexOf('-min.') !== -1;
    libFile = filePathName.indexOf('infrastructure') !== -1 || filePathName.indexOf('yui_sdk') !== -1 || min;
    output.libFile = libFile;
    output.min = min;
    var moduleName = getModuleName(filePathName);
    if (moduleName.indexOf('/') !== -1) {
        moduleName = moduleName.split('/')
            .pop();
    }
    logger.log('processSingleFile', 9);
    output.realName = moduleName;
    output.name = normalizeName(moduleName);
    output.camelName = camelize(output.name);
    var source = readFile(filePathName);
    output.rawSource = source;
    output.source = source;
    var wholePath = filePathName.split(pathDelim);
    var fileName = wholePath.pop();
    wholePath = wholePath.join(pathDelim);
    output.folderPath = wholePath;
    output.fileName = fileName;
    var currentChainIndex = 0;
    logger.log('processSingleFile', 10);

    function runNextProcessor() {
        logger.log('runNextProcessor', 0);
        output.undoBuffer = output.source;
        if (!WRITE_ENABLED) {
            output.source = output.rawSource;
        }
        if (output.skip) {
            currentChainIndex++;
            if (currentChainIndex >= processingChain.length) {
                _finishedProcessingChain();
                return;
            }
        }
        var processor = processingChain[currentChainIndex];
        try {
            logger.log('process', processor.id, output.fileName);
            processor.process(output, function (result) {
                currentChainIndex++;
                if (currentChainIndex < processingChain.length) {
                    runNextProcessor();
                } else {
                    _finishedProcessingChain();
                }
            });
        } catch (ex) {
            console.error('ERROR: ' + ex.stack);
            throw (ex);
        }
    }
    var processor = processingChain[currentChainIndex];
    output.couldParseOriginalSource = canParse(filePathName, output.rawSource,
        processor.id);
    runNextProcessor();

    function _finishedProcessingChain() {
        logger.log('_finishedProcessingChain', 0);
        var VERIFY_PARSE = true;
        writeFile(outputfilePathName, output.source);
        output.couldParseProcessedSource = canParse(outputfilePathName,
            output.source, processor.id);
        output.corrupted = false;
        output.numberOfLines = output.source.split('\n')
            .length;
        for (var e in output.errors) {
            var error = output.errors[e];
            var numberOfErrors = error.length;
            if (typeof error === 'string') {
                numberOfErrors = 1;
            }
            var percent = Math.floor(numberOfErrors / output.numberOfLines * 100);
            if (percent > ERROR_THRESHOLD) {}
        }
        if (VERIFY_PARSE) {
            if (output.couldParseOriginalSource != output.couldParseProcessedSource) {
                if (!output.couldParseProcessedSource) {
                    logger.warn('COULD NOT PARSE MODIFIED SOURCE in file ' + output.name);
                    output.source = output.undoBuffer;
                    output.corrupted = false;
                    writeFile(outputfilePathName, output.source);
                }
            }
        }
        output.rawSource = null;
        output.EMPTY = FILE_IS_EMPTY;
        delete output.rawSource;
        completionCallback(output);
    }
    console.log(moduleName);
}

function processFile(modulePaths, baseDirectory, filePathName, outputDirectory,
    testDirectory, docDirectory, processingChain, completionCallback,
    writeEnable) {
    FILE_IS_EMPTY = false;
    var output = {};
    output.results = {};
    output.errors = {};
    output.outputDirectory = outputDirectory;
    if (!filePathName) {
        output.error = 'filePathName is null';
        return output;
    }
    var pathDelim = filePathName.indexOf('/') == -1 ? '\\' : '/';
    WRITE_ENABLED = writeEnable = writeEnable != null ? writeEnable : false;
    finishedProcessingChain = _finishedProcessingChain;
    var outputfilePathName = '';
    baseDirectory = _path.normalize(baseDirectory);
    filePathName = _path.normalize(filePathName);
    outputDirectory = _path.normalize(outputDirectory);
    output.path = filePathName;
    if (filePathName.indexOf(baseDirectory) == -1) {
        output.error = 'filePathName does not contain base directory';
        return output;
    }
    safeCreateDir(testDirectory);
    safeCreateDir(docDirectory);
    safeCreateDir(outputDirectory);
    var wholePath = filePathName.split(pathDelim);
    var fileName = wholePath.pop();
    wholePath = wholePath.join(pathDelim);
    output.folderPath = wholePath;
    output.fileName = fileName;
    output.modulePaths = modulePaths;
    output.packagePath = wholePath.substring(baseDirectory.length);
    if (pathDelim === '\\') {
        output.webPath = output.packagePath.split('\\')
            .join('/');
    } else {
        output.webPath = output.packagePath;
    }
    var outputSourceDir = _path.normalize(outputDirectory + '/' + output.packagePath);
    safeCreateDir(outputSourceDir);
    outputfilePathName = outputSourceDir + '/' + output.fileName;
    outputfilePathName = _path.normalize(outputfilePathName);
    var libFile = false;
    var min = filePathName.indexOf('.min.') !== -1 || filePathName.indexOf('-min.') !== -1;
    libFile = filePathName.indexOf('infrastructure') !== -1 || filePathName.indexOf('yui_sdk') !== -1 || min;
    output.libFile = libFile;
    output.min = min;
    var moduleName = getModuleName(filePathName);
    if (moduleName.indexOf('/') !== -1) {
        moduleName = moduleName.split('/')
            .pop();
    }
    output.realName = moduleName;
    output.name = normalizeName(moduleName);
    output.camelName = camelize(output.name);
    var source = readFile(filePathName);
    output.rawSource = source;
    output.source = source;
    output.processedFilePath = outputfilePathName;
    var mmn = mapModuleName(output.packagePath, modulePaths);
    if (mmn.length > 0) {
        mmn += '/';
    }
    output.mappedModuleName = mmn + output.fileName.split('.js')[0];
    var currentChainIndex = 0;

    function runNextProcessor() {
        output.undoBuffer = output.source;
        if (!WRITE_ENABLED) {
            output.source = output.rawSource;
        }
        if (output.skip) {
            currentChainIndex++;
            if (currentChainIndex >= processingChain.length) {
                _finishedProcessingChain();
                logger.warn('>>>>>>>>>>>>>>>>>>>>>> SKIPPING THIS MODULE');
                return;
            }
        }
        //console.log(processingChain, currentChainIndex);
        var processor = processingChain[currentChainIndex];
        //  console.log(processor);
        logger.log(processor.id);
        processor.process(output, function (result) {
            currentChainIndex++;
            if (currentChainIndex < processingChain.length) {
                runNextProcessor();
            } else {
                _finishedProcessingChain();
            }
        });
    }
    var processor = processingChain[currentChainIndex];
    output.couldParseOriginalSource = canParse(filePathName, output.rawSource,
        processor.id);
    runNextProcessor();

    function _finishedProcessingChain() {
        var VERIFY_PARSE = true;
        writeFile(outputfilePathName, output.source);
        output.couldParseProcessedSource = canParse(outputfilePathName,
            output.source, processor.id);
        output.corrupted = false;
        output.numberOfLines = output.source.split('\n')
            .length;
        for (var e in output.errors) {
            var error = output.errors[e];
            var numberOfErrors = error.length;
            if (typeof error === 'string') {
                numberOfErrors = 1;
            }
            var percent = Math.floor(numberOfErrors / output.numberOfLines * 100);
            if (percent > ERROR_THRESHOLD) {}
        }
        if (VERIFY_PARSE) {
            if (output.couldParseOriginalSource != output.couldParseProcessedSource) {
                if (!output.couldParseProcessedSource) {
                    logger.warn('COULD NOT PARSE MODIFIED SOURCE in file ' + output.name);
                    output.source = output.undoBuffer;
                    output.corrupted = false;
                    writeFile(outputfilePathName, output.source);
                }
            }
        }
        output.rawSource = null;
        output.EMPTY = FILE_IS_EMPTY;
        delete output.rawSource;
        completionCallback(output);
    }
    console.log(moduleName);
}

function decamelize(input) {
    var test = input.split('_');
    if (test.length > 1 && input.indexOf('_') > 0) {
        var output = trim(input.toLowerCase());
        return output;
    }
    test = input.split('-');
    if (test.length > 1 && input.indexOf('-') > 0) {
        var output = trim(input.toLowerCase());
        return output;
    }
    var words = [];
    var word = '';
    for (var c = 0; c < input.length; c++) {
        var chararcter = input.charAt(c);
        if (chararcter == '_') {
            chararcter = ' ';
        }
        if (isUpperCase(chararcter)) {
            chararcter = chararcter.toLowerCase();
            words.push(trim(word));
            word = '';
            word += chararcter;
        } else {
            word += chararcter;
        }
    }
    if (trim(word)
        .length > 0) {
        words.push(trim(word));
    }
    var name = trim(words.join(' '));
    name = name.split(' ')
        .join('_');
    return name.split('-')
        .join('_');
}

function getModuleName(filePathName) {
    var moduleName = filePathName.split('.');
    moduleName.pop();
    moduleName = moduleName.join('.');
    if (filePathName.indexOf('/') !== -1) {
        moduleName = moduleName.split('/');
    } else {
        moduleName = moduleName.split('\\');
    }
    var modName = moduleName.pop();
    return decamelize(modName);
}

function capitalize(input) {
    if (input == null) {
        return '';
    }
    input = input.split('');
    if (input.length === 0) {
        return '';
    }
    input[0] = input[0].toUpperCase();
    return input.join('');
}

function trim(input) {
    return input.trim();
}

function trimRight(s) {
    return s.replace(new RegExp('/s+$/'), '');
}

function camelize(input) {
    var test = input.split('_');
    if (test.length > 1 && input.indexOf('_') > 0) {
        for (var index = 0; index < test.length; index++) {
            test[index] = capitalize(test[index]);
        }
        return test.join('');
    }
    test = input.split('-');
    if (test.length > 1 && input.indexOf('-') > 0) {
        for (var index = 0; index < test.length; index++) {
            test[index] = capitalize(test[index]);
        }
        return test.join('');
    }
    return capitalize(input);
}

function camelizeVariable(input) {
    var test = input.split('_');
    if (test.length > 1 && input.indexOf('_') > 0) {
        for (var index = 0; index < test.length; index++) {
            test[index] = capitalize(test[index]);
        }
        test[0] = test[0].toLowerCase();
        return test.join('');
    }
    test = input.split('-');
    if (test.length > 1 && input.indexOf('-') > 0) {
        for (var index = 0; index < test.length; index++) {
            test[index] = capitalize(test[index]);
        }
        test[0] = test[0].toLowerCase();
        return test.join('');
    }
    input = input.split('');
    input[0] = input[0].toLowerCase();
    input = input.join('');
    return input;
}

function isUpperCase(aCharacter) {
    return aCharacter >= 'A' && aCharacter <= 'Z';
}

function normalizeName(input) {
    return input.split('-')
        .join('_');
}

function safeCreateFileDir(path) {
    if (!WRITE_ENABLED) {
        return;
    }
    var dir = _path.dirname(path);
    if (!_fs.existsSync(dir)) {
        _wrench.mkdirSyncRecursive(dir);
    }
}

function safeCreateDir(dir) {
    if (!WRITE_ENABLED) {
        return;
    }
    if (!_fs.existsSync(dir)) {
        _wrench.mkdirSyncRecursive(dir);
    }
}

function stripCComments(input) {
    if (input.indexOf('/*') !== -1) {
        while (true) {
            var splitter = input.split('/*');
            if (splitter.length == 1) {
                return input;
            }
            var beforeComment = splitter[0];
            splitter.shift();
            var afterCommentBody = splitter.join('/*');
            var afterComment = afterCommentBody.split('*/');
            afterComment.shift();
            input = beforeComment + afterComment.join('*/');
        }
    } else {
        return input;
    }
}

function stripOneLineComments(input) {
    var lines = input.split('\n');
    var L = 0;
    for (L = 0; L < lines.length; L++) {
        if (lines[L].trim().indexOf('//') === 0) {
            var commentCheck = lines[L].split('//');
            lines[L] = commentCheck[0];
        }
    }
    return lines.join('\n');
}

function canParseSource(source) {
    var _esprima = require('esprima');
    var ast = null;
    try {
        ast = _esprima.parse(source, {
            comment: true,
            tolerant: true,
            range: true,
            raw: true,
            tokens: true
        });
    } catch (esError) {
        logger.warn(esError);
        return false;
    }
    return true;
}

function canParse(moduleName, input, procId) {
    return true;
}

function esprimafy(moduleName, input) {
    var _esprima = require('esprima');
    var then = new Date()
        .getTime();
    try {
        var response = {};
        var ast = _esprima.parse(input);
        var optimized = _esmangle.optimize(ast, null);
        var result = _esmangle.mangle(optimized);
        var output = _escodegen.generate(result, {
            format: {
                renumber: true,
                hexadecimal: true,
                escapeless: true,
                compact: true,
                semicolons: false,
                parentheses: false
            }
        });
        response.moduleName = moduleName;
        response.code = output;
        response.timeTaken = new Date()
            .getTime() - then;
        response.ratio = response.code.length / input.length;
        return response;
    } catch (ex) {}
    return null;
}

function uglyDucklify(moduleName, input) {
    var then = new Date()
        .getTime();
    try {
        var result = _uglifyjs.minify(input, {
            fromString: true
        });
        result.timeTaken = new Date()
            .getTime() - then;
        result.moduleName = moduleName;
        result.ratio = result.code.length / input.length;
        return result;
    } catch (ex) {}
    return {
        code: '<ERROR>'
    };
}
var modules = {};

function convert(input, filePathname) {
    logger.log('convert', 0, filePathname);
    var pathDelim = filePathname.indexOf('/') == -1 ? '\\' : '/';
    var wholePath = filePathname.split(pathDelim);
    wholePath.pop();
    wholePath = wholePath.join(pathDelim);
    var temp = trim(input);
    var moduleName = '?';
    var requires = [];
    var output = {};
    output.callsYuiApi = false;
    output.rawSource = input;
    var libFile = false;
    var min = filePathname.indexOf('.min.') !== -1 || filePathname.indexOf('-min.') !== -1;
    libFile = filePathname.indexOf('infrastructure') !== -1 || filePathname.indexOf('yui_sdk') !== -1 || min;
    output.name = moduleName;
    output.isShim = false;
    output.min = min;
    logger.log('convert', 1);
    if (pathDelim === '\\') {
        filePathname = filePathname.split('\\')
            .join('/');
    }
    output.path = filePathname;
    var stripped = stripOneLineComments(stripCComments(temp));
    var yuiAdd_A = stripped.indexOf('YUI().add(') !== -1;
    var yuiAdd_B = stripped.indexOf('YUI.add(') !== -1;
    logger.log('convert', 1.1);
    if (false) {
        var yuiAdd = 'YUI().add(';
        if (yuiAdd_B) {
            yuiAdd = 'YUI.add(';
        }
        var yuiChunk = temp.split(yuiAdd);
        moduleName = yuiChunk[1].split(',')[0];
        moduleName = trim(moduleName.split('\'')
            .join('')
            .split('"')
            .join(''));
        if (modules[moduleName] != null) {
            moduleName = getModuleName(filePathname);
        }
        if (moduleName.indexOf('/') !== -1) {
            moduleName = moduleName.split('/')
                .pop();
        }
        output.isModule = true;
        var requiresString = yuiChunk[1].split(',')[1].split('(')[1].split(')')[0];
        if (requiresString.length > 1) {}
        if (stripped.indexOf('Y.') !== -1) {
            if (JSON.stringify(requires)
                .indexOf('"yui"') == -1) {
                requires.push('yui');
            }
            output.callsYuiApi = true;
        }
        if (stripped.indexOf('$(') !== -1) {
            if (JSON.stringify(requires)
                .indexOf('"jquery"') == -1) {
                requires.push('jquery');
            }
        }
        yuiChunk = temp.split('requires: [');
        var hasRequiresBlock = false;
        if (yuiChunk.length > 1) {
            hasRequiresBlock = true;
            requiresString = trim(yuiChunk[1].split(']')[0]);
            var requiredModules = [];
            if (requiresString.indexOf(',') !== -1) {
                requiredModules = requiresString.split(',');
                if (requiresString.indexOf('*') !== -1) {
                    requiredModules = eval('[' + requiredModules + ']');
                }
            } else {
                requiredModules.push(requiresString);
            }
            for (var index = 0; index < requiredModules.length; index++) {
                var mod = trim(requiredModules[index].split('\'')
                    .join('')
                    .split('"')
                    .join(''));
                if (mod.length == 0) {
                    continue;
                }
                if (mod == 'jQuery') {
                    mod = 'jquery';
                }
                if (JSON.stringify(requires)
                    .indexOf('"' + mod + '"') == -1) {
                    requires.push(mod);
                }
            }
        }
        yuiChunk = temp.split(yuiAdd);
        var afterAdd = yuiChunk[1];
        afterAdd = afterAdd.split('{');
        afterAdd.shift();
        afterAdd = afterAdd.join('{');
        yuiChunk[1] = afterAdd;
        var requireSkeleton = 'define("' + moduleName + '", [';
        for (var r = 0; r < requires.length; r++) {
            if (r > 0) {
                requireSkeleton += ', ';
            }
            requireSkeleton += '"' + requires[r] + '"';
        }
        requireSkeleton += '], function(';
        for (var r = 0; r < requires.length; r++) {
            if (r > 0) {
                requireSkeleton += ', ';
            }
            if (requires[r].toLowerCase()
                .indexOf('jquery.') !== -1) {
                requires[r] = 'jquery';
                requireSkeleton += '$';
            } else if (requires[r].toLowerCase() == 'jquery') {
                requires[r] = 'jquery';
                requireSkeleton += '$';
            } else if (requires[r].toLowerCase() == 'yui') {
                requires[r] = 'yui';
                requireSkeleton += 'Y';
            } else if (requires[r].toLowerCase() == 'underscore') {
                requires[r] = 'underscore';
                requireSkeleton += '_';
            } else {
                requireSkeleton += camelize(requires[r]);
            }
        }
        requireSkeleton += '){';
        var newBody = yuiChunk.join(requireSkeleton);
        yuiChunk = newBody.split('}');
        if (hasRequiresBlock) {
            yuiChunk.pop();
        }
        yuiChunk.pop();
        newBody = yuiChunk.join('}');
        newBody += '\n});';
        temp = newBody;
    } else {
        logger.log('convert', 1.2);
        moduleName = getModuleName(filePathname);
        temp = input;
        stripped = stripped.split('define (')
            .join('define(');
        stripped = stripped.split('require (')
            .join('require(');
        var indexOfDefine = stripped.indexOf('define(');
        output.isModule = stripped.indexOf('define(') !== -1;
        var indexOfRequire = stripped.indexOf('require(');
        output.isMain = (output.isModule) & (indexOfRequire !== -1) && (indexOfRequire < indexOfDefine);
        var defineBlock = stripped.indexOf('define(') !== -1 && !libFile;
        logger.log('convert', 1.3);
        if (defineBlock && (!output.isMain)) {
            var afterDefine = stripped.split('define(')[1];
            afterDefine = afterDefine.split(')')[0].trim();
            if (afterDefine.charAt(0) !== '{' && afterDefine.indexOf('[') !== -1) {
                afterDefine = afterDefine.split('[')[1];
                var depsRaw = trim(afterDefine.split(']')[0]);
                if (depsRaw.indexOf(',') !== -1) {
                    depsRaw = depsRaw.split(',');
                    depsRaw = eval('[' + depsRaw + ']');
                } else {
                    var tempDeps = depsRaw;
                    depsRaw = [];
                    depsRaw.push(tempDeps);
                }
                requires = depsRaw;
                var afterDefineSplit = afterDefine.split('(');
                if (afterDefineSplit.length > 1) {
                    var depVarnames = afterDefineSplit[1];
                    depVarnames = depVarnames.split(')')[0];
                    depVarnames = depVarnames.split(',');
                    for (var index = 0; index < depVarnames.length; index++) {
                        var item = depVarnames[index];
                        item = trim(item);
                        if (item.indexOf('*' !== -1)) {}
                        depVarnames[index] = item;
                    }
                    output.depVarnames = depVarnames;
                } else {
                    logger.warn('afterDefine: ' + afterDefine);
                    logger.warn('Problem file: ' + filePathname);
                }
            }
            afterDefine = stripped.split('define(')[1];
            afterDefine = afterDefine.split(')')[0];
            if (afterDefine.indexOf(moduleName) == -1) {
                var all = temp.split('define(');
                all[1] = '"' + moduleName + '",' + all[1];
                temp = all.join('define(');
            }
        } else {
            var requireBlock = stripped.indexOf('require(') !== -1 && !libFile;
            if (requireBlock) {
                var afterDefine = stripped.split('require(')[1];
                afterDefine = afterDefine.split(')')[0];
                if (afterDefine.indexOf('[') !== -1) {
                    afterDefine = afterDefine.split('[')[1];
                    var depsRaw = afterDefine.split(']')[0];
                    depsRaw = depsRaw.split(',');
                    for (var index = 0; index < depsRaw.length; index++) {
                        var item = depsRaw[index];
                        var rawItem = item;
                        logger.warn("require()--> " + rawItem);
                        item = item.split('"')
                            .join('');
                        item = trim(item);
                        depsRaw[index] = item;
                    }
                    requires = depsRaw;
                    var depVarnames = afterDefine.split('(')[1];
                    depVarnames = depVarnames.split(')')[0];
                    depVarnames = depVarnames.split(',');
                    for (var index = 0; index < depVarnames.length; index++) {
                        var item = depVarnames[index];
                        item = trim(item);
                        depVarnames[index] = item;
                    }
                    output.depVarnames = depVarnames;
                }
            }
        }
    }
    logger.log('convert', 1.4);
    output.name = moduleName;
    output.requires = requires;
    if (libFile) {
        output.source = input;
    } else {
        output.source = temp;
    }
    if (output.name.indexOf('*') !== -1 || output.name.indexOf('/') !== -1) {}
    if (output.name === 'backbone') {
        output.requires = ['underscore', 'jquery'];
    } else if (output.name === 'jquery') {
        output.requires = [];
    } else if (output.requires.length === 0) {
        if (temp.indexOf(' $.') !== -1 || temp.indexOf(' $(') !== -1) {
            output.requires = ['jquery'];
        }
    }
    if (output.name !== 'backbone') {
        if (input.indexOf('Backbone.') !== -1) {
            if (JSON.stringify(output.requires)
                .indexOf('"backbone"') == -1) {
                output.requires.push('backbone');
            }
            if (JSON.stringify(output.requires)
                .indexOf('"underscore"') == -1) {
                output.requires.push('underscore');
            }
        }
    }
    output.libFile = libFile;
    output.realName = output.name;
    output.name = normalizeName(output.name);
    logger.log('convert', 'DONE');
    return output;
}

function getRequiresTags(input) {
    logger.warn('getRequiresTags: ' + input.name);
    var output = '';
    var amdProcData = input.results.amdProc;
    if (!amdProcData.AMD) {
        return '';
    }
    for (var index = 0; index < amdProcData.requires.length; index++) {
        var moduleName = amdProcData.requires[index];
        if (typeof moduleName !== 'string') {
            continue;
        }
        if (moduleName.length === 0) {
            continue;
        }
        output += ' * @requires ' + moduleName + '\n';
    }
    return output;
}

function getLines(lines, x, y) {
    var buffer = [];
    for (var index = x; index < y + 1; index++) {
        buffer.push(lines[index]);
    }
    return buffer.join('\n');
}

function getNextLineOfCode(lines, x) {
    for (var index = x + 1; index < lines.length; index++) {
        var line = lines[index].trim();
        if (line.length > 0) {
            if (line.indexOf('//') !== 0 && line.indexOf('/*') !== 0) {
                return line;
            }
        }
    }
    return '';
}

function concatLines(lines, codeBlock) {
    var blockLines = codeBlock.split('\n');
    for (var index = 0; index < blockLines.length; index++) {
        lines.push(blockLines[index]);
    }
    return lines;
}

function replace(source, original, token) {
    var array = source.split(original);
    return array.join(token);
}
var jsDoc3PrepProc = {
    id: 'jsDoc3PrepProc',
    type: 'processor',
    description: 'Fixes annotations. Less is more.',
    process: function jsDoc3PrepProcess(input, doneCallback) {
        var PROC_DOCLETS = true;
        if (input.errors[this.id] == null) {
            input.errors[this.id] = [];
        }
        input.name = input.fileName.split('.js')[0];
        var source = input.source;
        source = replace(source, '{string}', '{String}');
        source = replace(source, '{object}', '{Object}');
        source = replace(source, '{number}', '{Number}');
        source = replace(source, '{int}', '{Number}');
        source = replace(source, '{long}', '{Number}');
        source = replace(source, '{double}', '{Number}');
        source = replace(source, '{boolean}', '{Boolean}');
        source = replace(source, '{bool}', '{Boolean}');
        source = replace(source, '{function}', '{Function}');
        input.source = source;
        firstDoclet = null;
        var lines = input.source.split('\n');
        var index = 0;
        var linesLength = lines.length;
        var lastLine = '';
        for (index = 0; index < linesLength; index++) {
            var line = lines[index];
            if (line.trim()
                .indexOf('//') === 0) {
                continue;
            }
            if (line.indexOf('* @lends') !== -1 || line.indexOf('*@lends') !== -1) {
                if (lastLine.indexOf('.extend') === -1) {
                    lines[index] = line;
                } else {
                    if (line.indexOf('~') === -1) {
                        logger.warn('hacking a @lends tag with reference to a class');
                        var lendSplit = line.split('@lends ');
                        lendSplit[1] = 'module:' + input.name + '~' + lendSplit[1];
                        line = lendSplit.join('@lends ');
                        lines[index] = line;
                    } else {
                        logger.warn('leave the @lends tag alone');
                        lines[index] = line;
                    }
                }
            }
            lastLine = line;
        }
        input.source = lines.join('\n');
        var whereDefine = input.source.indexOf('define(\'');
        // console.log('whereDefine', whereDefine);
        if (whereDefine === -1) {
            whereDefine = input.source.indexOf('define("');
        }
        // console.log('whereDefine', whereDefine);
        if (whereDefine === -1) {
            whereDefine = input.source.indexOf('define(');
        }
        //console.log('whereDefine', whereDefine);
        if (input.source.indexOf('define = function') !== -1) {
            whereDefine = -1;
        }
        // console.log('whereDefine', whereDefine);
        var saveWhereDefine = whereDefine;
        if (whereDefine !== -1) {
            var source = input.source.substring(whereDefine);
            var whereVar = source.indexOf('var ');
            var whereFunctionNoSpace = source.indexOf('function(');
            var whereFunction = source.indexOf('function ');
            var whereDefineLocal = source.indexOf('define(');
            if (source.indexOf('@exports ') === -1) {
                if (whereVar > 0 || (whereFunction > 0 || whereFunctionNoSpace > 0)) {
                    if (whereFunctionNoSpace === -1 && whereFunction === -1 && whereDefineLocal === -1) {
                        logger.warn('jsDoc3PrepProc: could not find a function or define() in the module?');
                    } else {
                        logger.warn('jsDoc3PrepProc: found @exports in the module');
                        var splitter = [];
                        if (whereFunctionNoSpace === -1) {
                            splitter = source.split('function (');
                        } else if (whereFunction === -1) {
                            splitter = source.split('function(');
                        } else if (whereFunctionNoSpace < whereFunction) {
                            splitter = source.split('function(');
                        } else {
                            splitter = source.split('function (');
                        }
                        var combiner = [];
                        var packagePath = input.mappedModuleName;
                        logger.warn(packagePath);
                        combiner.push(splitter[0] + '\n' + '/**\n * @exports ' + packagePath + '\n' + getRequiresTags(input) + ' */\n');
                        var splitterLength = splitter.length;
                        for (index = 1; index < splitterLength; index++) {
                            combiner.push(splitter[index]);
                        }
                        source = combiner.join('function(');
                    }
                } else if (whereDefineLocal !== -1 && source.indexOf('@module') === -1) {
                    var combiner = [];
                    var packagePath = input.mappedModuleName;
                    source = ('/**\n * @module ' + packagePath + '\n' + getRequiresTags(input) + ' */\n') + source;
                } else {
                    logger.warn('jsDoc3PrepProc: whereVar??: ' + whereVar + ',' + whereFunction + ',' + whereFunctionNoSpace);
                }
            }
            var originalHeader = input.source.substring(0, whereDefine);
            //logger.warn('jsDoc3PrepProc: splicing header', whereDefine, originalHeader);
            input.source = originalHeader + '\n' + source;
            //console.log(source);
            if (!canParseSource(input.source)) {
                input.source = input.undoBuffer;
            }
        }
        var prototypal = false;
        if (input.source.indexOf(input.camelName + '.prototype.') !== -1) {
            prototypal = true;
        }
        if (input.possibleName != null) {
            if (input.source.indexOf(input.possibleName + '.prototype.') !== -1) {
                prototypal = true;
            }
        }
        if (!prototypal && input.source.indexOf('@exports ') !== -1) {
            if (input.source.indexOf('@constructor') !== -1) {
                logger.warn('exports @constructor');
                var splitter = input.source.split('@constructor');
                input.source = splitter.join('@constructor');
            } else if (input.source.indexOf('var exports') !== -1) {
                if (input.source.indexOf('@alias module') === -1) {
                    logger.warn('exports var exports');
                    var splitter = input.source.split('@module');
                    input.source = splitter.join('<br />Module');
                    splitter = input.source.split('var exports');
                    var newDoc = '\n /**\n * @alias module:' + input.name + '\n */';
                    input.source = splitter.join('/** @alias module:' + input.name + ' */\n var exports');
                    splitter = input.source.split('@class exports');
                    input.source = splitter.join('');
                }
            } else if (input.source.indexOf('var utils ') !== -1) {
                if (input.source.indexOf('@alias module') === -1) {
                    logger.warn('exports var utils');
                    var splitter = input.source.split('@module');
                    input.source = splitter.join('<br />Module');
                    splitter = input.source.split('var utils ');
                    var newDoc = '\n /**\n * @alias module:' + input.name + '\n */';
                    input.source = splitter.join('/** @alias module:' + input.name + ' */\n var utils ');
                    splitter = input.source.split('@class utils');
                    input.source = splitter.join('');
                }
            } else if (input.source.indexOf('@class') !== -1) {
                logger.warn('exports @class');
                var splitter = input.source.split('@class');
                input.source = splitter.join('@class');
            }
        }
        var splitter = input.source.split('@class');
        splitter = input.source.split('@extends');
        writeFile(input.processedFilePath, input.source);
        doneCallback(input);
    }
};
var splitModulesProc = {
    id: 'splitModulesProc',
    type: 'processor',
    description: 'Split concatenated modules into individual files.',
    process: function (input, doneCallback) {
        var tempSource = input.source;
        var splitter = tempSource.split('@module');
        if (splitter.length > 2) {
            logger.warn('!!!!!!!!! More than one module in this file!!!!!', splitter.length);
            doneCallback(input);
        } else {
            doneCallback(input);
        }
    }
};

function getIndent(text) {
    var buffer = '';
    if (text == null) {
        var err = (new Error('getIndent FAILED, input is null'));
        console.error(err.stack);
    }
    text = text.split('');
    for (var index = 0; index < text.length; index++) {
        var char = text[index];
        if (char === ' ') {
            buffer += char;
        }
    }
    return buffer;
}

function convertComments(input) {
    var lines = input.split('\n');
    var inComment = false;
    var startOfComment = -1;
    for (var index = 0; index < lines.length; index++) {
        var line = lines[index];
        var originalLine = line;
        var indent = getIndent(line);
        line = line.trim();
        if (!inComment && (line.indexOf('//') === 0)) {
            if (lines[index + 1].trim().indexOf('//') === -1) {
                continue;
            }
        }
        if (line.indexOf('//') === 0) {
            line = line.substring(2);
            if (!inComment) {
                startOfComment = index;
                inComment = true;
                line = indent + '/**\n' + indent + ' * ' + line;
            } else {
                line = '<br />' + indent + ' * ' + line;
            }
        } else {
            if (inComment) {
                line = indent + ' */ \n' + line;
                inComment = false;
            } else {
                line = originalLine;
            }
        }
        lines[index] = line;
    }
    lines = lines.join('\n');
    return lines;
}
var convertCommentsProc = {
    id: 'convertCommentsProc',
    type: 'processor',
    description: 'Convert comments from one-line to jsdoc-style.',
    process: function (input, doneCallback) {
        input.source = convertComments(input.source);
        doneCallback(input);
    }
};
var allModules = {};
var exportAMDData = {
    id: 'exportAMDData',
    type: 'processor',
    description: 'Exports the AMD data for analysis.',
    process: function (input, doneCallback) {
        if (input.errors[this.id] == null) {
            input.errors[this.id] = [];
        }
        var amdProcData = input.results.amdProc;
        //      {
        //        "requires": [
        //          "jquery"
        //        ],
        //        "moduleName": "state-migrations",
        //        "AMD": true,
        //        "webPath": "/cheeks",
        //        "convertedName": "state_migrations",
        //        "min": false,
        //        "main": 0,
        //        "uses_$": true,
        //        "uses_Y": false,
        //        "uses_alert": false,
        //        "strict": false
        //      }
        var depends = {
            'requires': {},
            //name: amdProcData.moduleName,
            exports: amdProcData.exports ? amdProcData.exports : null
        };
        for (var index = 0; index < amdProcData.requires.length; index++) {
            var module = amdProcData.requires[index];
            depends.requires[module] = 1;
        }
        allModules[amdProcData.moduleName] = depends;
        //writeFile(input.processedFilePath + '.amd.json', JSON.stringify(depends, null, 2));
        writeFile('./modules.json', JSON.stringify(allModules, null, 2));
        doneCallback(input);
    }
};
var stripCommentsProc = {
    id: 'stripCommentsProc',
    type: 'processor',
    description: 'Remove comments.',
    process: function (input, doneCallback) {
        input.source = (stripOneLineComments(input.source));
        doneCallback(input);
    }
};
var esNextCommonJSProc = {
    id: 'esNextCommonJSProc',
    type: 'processor',
    description: 'Runs esnext  -I -b modules.commonjs',
    process: function (input, doneCallback) {
        var path = require('path');
        var exePath = path.normalize('node_modules/.bin/esnext  -I -b modules.commonjs');
        var exec = require('child_process').exec;
        var cmdLine = exePath;
        cmdLine += ' ' + input.processedFilePath;
        logger.log(cmdLine);
        var child = exec(cmdLine, function (error, stdout, stderr) {
            if (stderr) {
                console.error(stderr);
            }
        });
        /**
         * Close.
         * @param code
         */
        child.on('close', function (code) {
            logger.log('esnext process exited with code ' + code);
            var newSource = readFile(input.processedFilePath);
            input.source = newSource;
            doneCallback(input);
        });
        child.on('error', function (code) {
            logger.log('esnext process errored with code ' + code);
        });
    }
};
var esNextProc = {
    id: 'esNextProc',
    type: 'processor',
    description: 'Runs esnext -I file.js',
    process: function (input, doneCallback) {
        var path = require('path');
        var exePath = path.normalize('node_modules/.bin/esnext  -I');
        var exec = require('child_process').exec;
        var cmdLine = exePath;
        cmdLine += ' ' + input.processedFilePath;
        logger.log(cmdLine);
        var child = exec(cmdLine, function (error, stdout, stderr) {
            if (stderr) {
                console.error(stderr);
            }
        });
        /**
         * Close.
         * @param code
         */
        child.on('close', function (code) {
            logger.log('esnext process exited with code ' + code);
            var newSource = readFile(input.processedFilePath);
            input.source = newSource;
            doneCallback(input);
        });
        child.on('error', function (code) {
            logger.log('esnext process errored with code ' + code);
        });
    }
};
var plugins = {
    'esNextProc': esNextProc,
    'trimProc': trimProc,
    'headerProc': headerProc,
    'fixMyJsProc': fixMyJsProc,
    'jsBeautifyProc': jsBeautifyProc,
    'jsHintProc': jsHintProc,
    'esFormatterProc': esFormatterProc,
    'parseFilter': parseFilter,
    'yuiFilter': yuiFilter,
    'amdFilter': amdFilter,
    'minFilter': minFilter,
    'amdOrYuiFilter': amdOrYuiFilter,
    'jsDoccerProc': jsDoccerProc,
    'jsDocNameFixerProc': jsDocNameFixerProc,
    'badCharactersProc': badCharactersProc,
    'jsDogProc': jsDogProc,
    'fixClassDeclarationsProc': fixClassDeclarationsProc,
    'thirdPartyFilter': thirdPartyFilter,
    'yuiDocProc': yuiDocProc,
    'amdProc': amdProc,
    'uglifyProc': uglifyProc,
    'jsDoc3PrepProc': jsDoc3PrepProc,
    'generateJavaProc': generateJavaProc,
    'JSONFilter': JSONFilter,
    'singleJsDocProc': singleJsDocProc,
    'splitModulesProc': splitModulesProc,
    'fixDecaffeinateProc': fixDecaffeinateProc,
    'esLintFixProc': esLintFixProc,
    'fixES6ModulesProc': fixES6ModulesProc,
    'convertCommentsProc': convertCommentsProc,
    'exportAMDData': exportAMDData,
    'stripCommentsProc': stripCommentsProc,
    'libFilesFilter': libFilesFilter
};
/**
 * Get procs.
 *
 * @param procList
 * @return {Object}
 */
function getProcs(procList) {
    var output = [];
    for (var index = 0; index < procList.length; index++) {
        var procId = procList[index];
        output.push(plugins[procId]);
    }
    return output;
}

function getAmdConfig() {
    return AMD_DATA;
}
module.exports = {
    'plugins': plugins,
    'getProcs': getProcs,
    'processFile': processFile,
    'writeFile': writeFile,
    'readFile': readFile,
    'setWriteEnable': setWriteEnable,
    'processSingleFile': processSingleFile,
    'getAmdConfig': getAmdConfig,
    'mapModuleName': function (moduleName) {
        return mapModuleName(moduleName, modulePaths);
    }
};
