var fileSystem = require('fs');
var pathAPI = require('path');
var wrenchTool = require('wrench');
var uid = 0;
var nodes = [];
var COMMENT_VARIABLES = true;
var COMMENT_EVERYTHING = false;
var FIX_COMMENT_GRAMMAR = false;
var FIX_MODULE_NAMES = false;
var FIX_COFFEE = true;
var YUIDOC_MODE = false;
var logger = require('./logger');

function mapModuleName(mappedModuleName, walkerObj) {
    var modulePaths = walkerObj.modulePaths;
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

function fixModuleNameInText(text, walkerObj) {
    var splitter = text.split('module:');
    splitter.shift();
    var moduleName = splitter.join('module:').trim();
    moduleName = moduleName.split(' ')[0];
    text = 'module:' + mapModuleName(moduleName, walkerObj);
    return text;
}

function inferModuleName(walkerObj) {
    var usedModuleName = walkerObj.fileName.split('.js')[0];
    var packagePath = walkerObj.path.split('/');
    packagePath.shift();
    packagePath = packagePath.join('/');
    packagePath = packagePath.split('.js')[0];
    usedModuleName = packagePath;
    return usedModuleName;
}
/**
 * Read file.
 *
 * @name readFile
 * @method readFile
 * @param filePathName
 */
function readFile(filePathName) {
    var fileSystem = require('fs');
    var pathAPI = require('path');
    var FILE_ENCODING = 'utf8';
    filePathName = pathAPI.normalize(filePathName);
    var source = '';
    try {
        source = fileSystem.readFileSync(filePathName, FILE_ENCODING);
    } catch (er) {
        source = '';
    }
    return source;
}
/**
 * Decamelize.
 *
 * @name decamelize
 * @method decamelize
 * @param {String} input
 * @return {String}
 */
function decamelize(input) {
    var test = input.split('_');
    if ((test.length > 1) && (input.indexOf('_') > 0)) {
        var output = trim(input.toLowerCase());
        return output;
    }
    test = input.split('-');
    if ((test.length > 1) && (input.indexOf('-') > 0)) {
        var output = trim(input.toLowerCase());
        return output;
    }
    var words = [];
    var word = '';
    var previousCharUC = false;
    for (var c = 0; c < input.length; c++) {
        var chararcter = input.charAt(c);
        if (chararcter == '_') {
            chararcter = ' ';
        }
        if (isUpperCase(chararcter)) {
            if (!previousCharUC) {
                chararcter = chararcter.toLowerCase();
                words.push(trim(word));
                word = '';
                word += chararcter;
            } else {
                word = word.toUpperCase();
                word += chararcter;
                previousCharUC = false;
            }
            previousCharUC = true;
        } else {
            word += chararcter;
            previousCharUC = false;
        }
    }
    if (trim(word).length > 0) {
        words.push(trim(word));
    }
    var name = trim(words.join(' '));
    name = name.split(' ').join('_');
    return name.split('-').join('_');
}
/**
 * Get module name.
 *
 * @name getModuleName
 * @method getModuleName
 * @param filePathName
 * @return {Object}
 */
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
/**
 * Capitalize.
 *
 * @name capitalize
 * @method capitalize
 *            input
 * @return {string}
 * @param input
 */
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
/**
 * De-capitalize.
 *
 * @name decapitalize
 * @method decapitalize
 *            input
 * @return {string}
 * @param input
 */
function decapitalize(input) {
    if (input == null) {
        return '';
    }
    input = input.split('');
    if (input.length === 0) {
        return '';
    }
    input[0] = input[0].toLowerCase();
    return input.join('');
}
/**
 * Trim.
 *
 * @name trim
 * @method trim
 *            input
 * @param input
 */
function trim(input) {
    return input.replace(/^\s*(\S*(\s+\S+)*)\s*$/, '$1');
}
/**
 * Trim right.
 *
 * @name trimRight
 * @method trimRight
 * @param s
 */
function trimRight(s) {
    return s.replace(new RegExp('/\s+$/'), '');
}
/**
 * Camelize.
 *
 * @name camelize
 * @method camelize
 *            input
 * @param input
 */
function camelize(input) {
    var test = input.split('_');
    if ((test.length > 1) && (input.indexOf('_') > 0)) {
        for (var index = 0; index < test.length; index++) {
            test[index] = capitalize(test[index]);
        }
        return test.join('');
    }
    test = input.split('-');
    if ((test.length > 1) && (input.indexOf('-') > 0)) {
        for (var index = 0; index < test.length; index++) {
            test[index] = capitalize(test[index]);
        }
        return test.join('');
    }
    return capitalize(input);
}
/**
 * Camelize variable.
 *
 * @name camelizeVariable
 * @method camelizeVariable
 *            input
 * @param input
 */
function camelizeVariable(input) {
    var test = input.split('_');
    if ((test.length > 1) && (input.indexOf('_') > 0)) {
        for (var index = 0; index < test.length; index++) {
            test[index] = capitalize(test[index]);
        }
        test[0] = test[0].toLowerCase();
        return test.join('');
    }
    test = input.split('-');
    if ((test.length > 1) && (input.indexOf('-') > 0)) {
        for (var index = 0; index < test.length; index++) {
            test[index] = capitalize(test[index]);
        }
        test[0] = test[0].toLowerCase();
        return test.join('');
    }
    input = input.split('');
    input[0] = input[0].toLowerCase();
    input = input.join('');
    return (input);
}
/**
 * Is upper case.
 *
 * @name isUpperCase
 * @method isUpperCase
 * @param aCharacter
 * @return {Object}
 */
function isUpperCase(aCharacter) {
    return (aCharacter >= 'A') && (aCharacter <= 'Z');
}
/**
 * Normalize name.
 *
 * @name normalizeName
 * @method normalizeName
 *            input
 * @param input
 */
function normalizeName(input) {
    return input.split('-').join('_');
}
/**
 * Safe create file dir.
 *
 * @name safeCreateFileDir
 * @method safeCreateFileDir
 * @param path
 */
function safeCreateFileDir(path) {
    if (!WRITE_ENABLED) {
        return;
    }
    var dir = pathAPI.dirname(path);
    if (!fileSystem.existsSync(dir)) {
        wrenchTool.mkdirSyncRecursive(dir);
    }
}
/**
 * Safe create dir.
 *
 * @name safeCreateDir
 * @method safeCreateDir
 * @param dir
 */
function safeCreateDir(dir) {
    if (!WRITE_ENABLED) {
        return;
    }
    if (!fileSystem.existsSync(dir)) {
        wrenchTool.mkdirSyncRecursive(dir);
    }
}
/**
 * Strip 'C'-style comments.
 *
 * @name stripCComments
 * @method stripCComments
 *            input
 * @param input
 */
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
/**
 * Strip one line comments.
 *
 * @name stripOneLineComments
 * @method stripOneLineComments
 *            input
 * @param input
 */
function stripOneLineComments(input) {
    var lines = input.split('\n');
    var L = 0;
    for (L = 0; L < lines.length; L++) {
        var commentCheck = lines[L].split('//');
        lines[L] = commentCheck[0];
    }
    return lines.join('\n');
}
/**
 * Safe create file dir.
 *
 * @name safeCreateFileDir
 * @method safeCreateFileDir
 * @param path
 */
function safeCreateFileDir(path) {
    var dir = pathAPI.dirname(path);
    if (!fileSystem.existsSync(dir)) {
        wrenchTool.mkdirSyncRecursive(dir);
    }
}
/**
 * Safe create dir.
 *
 * @name safeCreateDir
 * @method safeCreateDir
 * @param dir
 */
function safeCreateDir(dir) {
    if (!fileSystem.existsSync(dir)) {
        wrenchTool.mkdirSyncRecursive(dir);
    }
}
/**
 * Write file.
 *
 * @name writeFile
 * @method writeFile
 * @param filePathName
 * @param source
 */
function writeFile(filePathName, source) {
    filePathName = pathAPI.normalize(filePathName);
    safeCreateFileDir(filePathName);
    fileSystem.writeFileSync(filePathName, source);
}

function printDoclet(docletData, defineModuleInTopOfFile) {
    var has_description = false;
    var printableTags = {
        'abstract': 1,
        'access': 1,
        'alias': 1,
        'augments': 1,
        'extends': 1,
        'author': 1,
        'borrows': 1,
        'callback': 1,
        'classdesc': 1,
        'constant': 1,
        'const': 1,
        'constructs': 1,
        'copyright': 1,
        'default': 1,
        'deprecated': 1,
        'desc': 1,
        'enum': 1,
        'event': 1,
        'example': 1,
        'exports': 1,
        'external': 1,
        'file': 1,
        'fires': 1,
        'global': 1,
        'ignore': 1,
        'inner': 1,
        'instance': 1,
        'kind': 1,
        'lends': 1,
        'license': 1,
        'link': 1,
        'member': 1,
        'mixes': 1,
        'mixin': 1,
        'module': 1,
        'name': 1,
        'namespace': 1,
        'private': 1,
        'property': 1,
        'protected': 1,
        'public': 1,
        'readonly': 1,
        'returns': 1,
        'return': 1,
        'see': 1,
        'since': 1,
        'static': 1,
        'summary': 1,
        'this': 1,
        'throws': 1,
        'todo': 1,
        'tutorial': 1,
        'type': 1,
        'typedef': 1,
        'variation': 1,
        'version': 1
    };
    var buffer = [];
    var hasAttributes = false;
    for (var a in docletData) {
        if (docletData.hasOwnProperty(a)) {
            if (a.charAt(0) === '@') {
                hasAttributes = true;
            }
        }
    }
    if (!defineModuleInTopOfFile && docletData['@exports'] != null) {
        if (firstDoclet.description != null && firstDoclet.description.length > 0) {
            buffer.push(' * ' + firstDoclet.description);
            has_description = true;
        }
        if (firstDoclet.freeText != null && firstDoclet.freeText.length > 0) {
            buffer.push(' * ' + firstDoclet.freeText);
            if (hasAttributes) {
                buffer.push(' * ');
            }
            has_description = true;
        }
    }
    if (docletData.description != null && docletData.description.length > 0) {
        buffer.push(' * ' + docletData.description);
        has_description = true;
    }
    if (docletData.freeText != null && docletData.freeText.length > 0) {
        buffer.push(' * ' + docletData.freeText);
        if (hasAttributes) {
            buffer.push(' * ');
        }
        has_description = true;
    }
    var atCount = 0;
    if (docletData.nodeType != null) {
        var nodeType = docletData.nodeType;
        var correctNodeName = '';
        if (nodeType === 'CLASS') {
            correctNodeName = 'constructor';
            buffer.push(' * @' + correctNodeName);
            atCount++;
        }
        if (docletData['@module'] != null) {
            docletData.moduleName = docletData['@module'];
            delete docletData['@module'];
        }
        if (defineModuleInTopOfFile || YUIDOC_MODE) {
            correctNodeName = 'module';
            buffer.push(' * @' + correctNodeName + ' ' + docletData.moduleName);
            atCount++;
            try {
                for (var r = 0; r < docletData.requiresList.length; r++) {
                    var include = docletData.requiresList[r];
                    if (typeof include === 'string') {
                        buffer.push(' * @requires ' + include);
                    } else {
                        buffer.push(' * @requires ' + include.name);
                    }
                    atCount++;
                }
            } catch (reqEr) {
                logger.error('ERROR BUILDING REQUIRES: ' + reqEr);
            }
        } else if (docletData['@exports'] != null) {
            for (var f in firstDoclet) {
                if (f.indexOf('@') === 0) {
                    docletData[f] = firstDoclet[f];
                }
            }
        }
    }
    var returnTag = '';
    for (var e in docletData) {
        var rawName = e;
        if (e.indexOf('@') === 0) {
            rawName = e.substring(1);
        }
        if (docletData.hasOwnProperty(e) && printableTags[rawName] === 1 && typeof docletData[e] === 'string') {
            if (rawName === 'type') {
                var typeText = docletData[e];
                typeText = fixReturnText(typeText, docletData);
                buffer.push(' * ' + e + ' ' + typeText);
            } else {
                buffer.push(' * ' + e + ' ' + docletData[e]);
            }
            atCount++;
        }
    }
    if (docletData['@return'] != null) {
        var returnBlock = docletData['@return'];
        returnTag = ' * ' + '@return' + ' ' + returnBlock.type + ' ' + returnBlock.description;
    }
    if (docletData['@exports'] != null) {
        try {
            for (var r = 0; r < docletData.requiresList.length; r++) {
                var include = docletData.requiresList[r];
                if (typeof include === 'string') {
                    buffer.push(' * @requires ' + include);
                } else {
                    buffer.push(' * @requires ' + include.name);
                }
                atCount++;
            }
        } catch (reqEr) {
            logger.error('ERROR BUILDING REQUIRES for @exports: ' + reqEr);
        }
    }
    var docletParams = docletData['params'];
    if (docletParams == null) {
        logger.error(typeof docletData);
        logger.error('docletData["params"] is NULL NULL NULL!!!!');
    }
    if (docletParams.length > 0) {
        for (var p = 0; p < docletParams.length; p++) {
            var param = docletParams[p];
            if (param.type != null) {
                param.type = param.type.toLowerCase();
                if (param.type === '{string}') {
                    param.type = '{String}';
                } else if (param.type === '{object}') {
                    param.type = '{Object}';
                } else if (param.type === '{number}') {
                    param.type = '{Number}';
                } else if (param.type === '{int}') {
                    param.type = '{Number}';
                } else if (param.type === '{integer}') {
                    param.type = '{Number}';
                } else if (param.type === '{long}') {
                    param.type = '{Number}';
                } else if (param.type === '{double}') {
                    param.type = '{Number}';
                } else if (param.type === '{float}') {
                    param.type = '{Number}';
                } else if (param.type === '{boolean}') {
                    param.type = '{Boolean}';
                } else if (param.type === '{bool}') {
                    param.type = '{Boolean}';
                }
            }
            if (param.name == null) {} else {
                if (param.type.length > 0 && param.description.length > 0) {
                    buffer.push(' * @param ' + param.type + ' ' + param.name + ' ' + param.description);
                } else if (param.type.length > 0) {
                    buffer.push(' * @param ' + param.type + ' ' + param.name);
                } else if (param.description.length > 0) {
                    buffer.push(' * @param ' + param.name + ' ' + param.description);
                } else {
                    buffer.push(' * @param ' + param.name);
                }
            }
        }
    }
    if (returnTag.length > 0) {
        buffer.push(returnTag);
    }
    var docletMarkup = '';
    if (buffer.length === 1) {
        docletMarkup = '/** ' + buffer[0].split('* ')[1] + ' */' + '';
    } else {
        docletMarkup = '/**\n' + buffer.join('\n') + '\n */' + '';
    }
    if (docletMarkup.indexOf('@') === -1 && !has_description) {
        logger.error('!!!!!!!!!!!!!!!!!!!!!!!!! empty doclet');
        return '/** ' + '@todo Please add a description.' + ' */' + '';
    }
    return docletMarkup;
}

function getLines(lines, x, y, buffer) {
    if (buffer == null) {
        buffer = [];
    }
    for (var index = x; index < (y + 1); index++) {
        buffer.push(lines[index]);
    }
    return buffer.join('\n');
}
/**
 * Gets the non-tag lines _around_ a tag. Where tag = {tag : 'param',line :
 * 0,lastLine: -1 }.
 *
 * @param {Array
 *            <String>} buffer
 * @param {Array
 *            <String>} lines
 * @param tag
 * @param getPreamble
 *            tag
 *            getPreamble
 */
function getTagLines(lines, tag, buffer, getPreamble) {
    var start = tag.line;
    var end = tag.lastLine;
    if (getPreamble) {
        start = 0;
        end = tag.line - 1;
        if (start < 1 && end < 1) {
            return;
        }
    }
    if (end === -1) {
        end = lines.length - 1;
    }
    tag.textStartsOnSameLine = false;
    getLines(lines, start, end, buffer);
    if ((!getPreamble) && (buffer.length > 0)) {
        var firstLine = buffer[0];
        var realTag = '@' + tag.tag;
        var where = firstLine.indexOf(realTag);
        firstLine = firstLine.substring(where + realTag.length);
        if (firstLine.length > 0) {
            tag.textStartsOnSameLine = true;
        }
        if (buffer.length > 0) {
            tag.textStartsOnSameLine = true;
        }
        buffer[0] = firstLine;
    }
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
/**
 * concatLines
 */
function concatLines(lines, codeBlock) {
    var blockLines = codeBlock.split('\n');
    for (var index = 0; index < blockLines.length; index++) {
        lines.push(blockLines[index]);
    }
    return lines;
}
/**
 * duh
 */
function replace(source, original, token) {
    var array = source.split(original);
    return array.join(token);
}

function getRequiresTags(input) {
    var output = '';
    var amdProcData = input.results.amdProc;
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
/**
 * Gets all the instances of require() in the code body.
 * @todo: Not robust! Not comment-proof!
 * @param {String} input The source script.
 * @returns {Array}
 */
function getInlineRequires(input) {
    var source = input.source;
    source = stripOneLineComments(stripCComments(source));
    var noSpaceRequire = source.indexOf('require(');
    var oneSpaceRequire = source.indexOf('require (');
    if (noSpaceRequire === -1 && oneSpaceRequire === -1) {
        return [];
    }
    var output = [];
    var chunks = [];
    if (noSpaceRequire > -1) {
        chunks = source.split('require(');
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
        chunks = source.split('require (');
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
var firstDoclet = null;
var typesMap = {
    'function': 'Function',
    'number': 'Number',
    'int': 'Number',
    'float': 'Number',
    'long': 'Number',
    'bool': 'Boolean',
    'boolean': 'Boolean',
    'string': 'String',
    'array': 'Array',
    'object': 'Object'
};

function getType(input) {
    var lowerInput = input.toLowerCase();
    var theType = typesMap[lowerInput];
    if (theType != null) {
        return theType;
    }
    if (lowerInput === 'null' || lowerInput === 'void' || lowerInput === 'nothing') {
        return 'null';
    }
    if (input.indexOf('$') === 0) {
        return input;
    }
    return null;
}

function fixWords(input) {
    var splitter = input.split(' ');
    var output = [];
    for (var index = 0; index < splitter.length; index++) {
        var word = splitter[index].trim();
        if (word.length > 0) {
            output.push(word);
        }
    }
    return output.join(' ');
}

function replaceWord(text, whichWord, withWhat) {
    text = text.trim();
    var buffer = text.split(' ');
    buffer[whichWord] = withWhat;
    return buffer.join(' ');
}

function fixReturnText(input, docletData) {
    input = input.trim();
    var saveInput = input;
    input = fixWords(input);
    var firstWord = input.split(' ')[0];
    var theType = getType(firstWord);
    if (input.indexOf('{') === 0) {
        var splitter = input.split('}');
        var type = splitter[0];
        splitter[0] = '{' + fixTypes(type, true);
        input = splitter.join('}');
    } else if (input.indexOf('{') !== -1) {} else {
        if (input.indexOf(' ') === -1) {
            input = fixTypes(input);
        } else {
            if (theType != null && theType != 'null') {
                input = replaceWord(saveInput, 0, '{' + theType + '}');
            } else {
                return '{Object} FIXME: Nonstandard comment in line: "' + saveInput + '"';
            }
        }
    }
    return input;
}

function fixTypes(input, dontCuddle) {
    input = input.trim();
    if (input.length === 0) {
        return input;
    }
    if (input.indexOf('<') !== -1 && input.indexOf('>') !== -1) {
        return input;
    }
    input = input.split('<').join('');
    input = input.split('>').join('');
    input = input.split('{').join('');
    input = input.split('}').join('');
    input = input.split('[').join('');
    input = input.split(']').join('');
    var swap = typesMap[input.toLowerCase()];
    if (swap != null) {
        input = swap;
    } else {
        input = capitalize(input);
    }
    if (dontCuddle) {
        return input;
    }
    return '{' + input + '}';
}
/**
 *
 *            input
 * @return {String}
 * @param input
 */
function stripStars(input) {
    if (input.trim().indexOf('*') === 0) {
        input = input.split('');
        input.shift();
        input = input.join('');
    }
    return input;
}
/**
 * Add * to a line in a doclet.
 *
 * @param input
 * @returns
 */
function addStars(input) {
    if (input.trim().indexOf('*') !== 0) {
        input = input.split('');
        input.unshift(' * ');
        input = input.join('');
    }
    return input;
}
/**
 * Add * to each line in a block of doclet text.
 *
 * @param lines
 * @param tag
 * @returns
 */
function addStarLines(lines, tag) {
    lines = lines.split('\n');
    var linesLength = lines.length;
    for (var index = 0; index < linesLength; index++) {
        if (index === 0) {
            if (!tag.textStartsOnSameLine) {
                var line = lines[index];
                line = addStars(line);
                lines[index] = line;
            }
        } else {
            var line = lines[index];
            line = addStars(line);
            lines[index] = line;
        }
    }
    lines = lines.join('\n');
    return lines;
}
/**
 *
 * @param {Array
 *            <String>} lines
 * @return {Array<String>}
 */
function stripStarLines(lines) {
    var linesLength = lines.length;
    for (var index = 0; index < linesLength; index++) {
        var line = lines[index].trim();
        line = stripStars(line);
        lines[index] = line;
    }
    return lines;
}
/**
 *
 * @param lines
 * @return {boolean}
 */
function linesAreEmpty(lines) {
    var linesLength = lines.length;
    for (var index = 0; index < linesLength; index++) {
        var line = lines[index].trim();
        if (stripStars(line).length !== 0) {
            return false;
        }
    }
    return true;
}

function parseDoclet(input, doclet, defineModuleInTopOfFile, nextLineOfCode, chunkIndex) {
    doclet = doclet.split('@Returns').join('@return');
    doclet = doclet.split('@returns').join('@return');
    doclet = doclet.split('@Desc').join('@desc');
    doclet = doclet.split('@Param').join('@param');
    doclet = doclet.split('@desc ').join('@description ');
    var commentBuffer = '';
    var docletData = {};
    docletData.params = [];
    docletData.tags = [];
    docletData.requiresList = input.results.amdProc.requires;
    docletData.moduleName = input.name;
    docletData.camelName = input.camelName;
    if (nextLineOfCode.indexOf('.extend') !== -1) {
        var splitCode = nextLineOfCode.split('.extend');
        var leftOfExtend = splitCode[0].trim();
        var rightOfExtend = splitCode[1].trim();
        var leftOfEquals = '';
        var rightOfEquals = '';
        if (leftOfExtend.indexOf('=') != -1) {
            leftOfEquals = leftOfExtend.split('=')[0].trim();
            rightOfEquals = leftOfExtend.split('=')[1].trim();
            if (leftOfEquals.indexOf('var ') !== -1) {
                leftOfEquals = leftOfEquals.split('var ')[1].trim();
            }
            docletData['@augments'] = rightOfEquals;
        } else {
            if (rightOfExtend.indexOf('(') !== -1) {
                rightOfExtend = rightOfExtend.substring(1);
            }
            if (rightOfExtend.indexOf(',') !== -1) {
                rightOfExtend = rightOfExtend.split(',')[0].trim();
            }
            docletData['@augments'] = rightOfExtend;
        }
    }
    if (firstDoclet == null) {
        firstDoclet = docletData;
    }
    if (doclet.indexOf('/**') === -1 || doclet.indexOf('*/') === -1) {
        logger.error('parseDoclet FORMAT ERROR: ' + doclet);
        return docletData;
    }
    var chunker = doclet.split('/**')[1];
    chunker = chunker.split('*/')[0];
    var lines = chunker.split('\n');
    var index = 0;
    var linesLength = lines.length;
    var currentTag = '';
    var firstTag = false;
    var currentTagObject = null;
    var quotedHTML = false;
    for (index = 0; index < linesLength; index++) {
        var line = lines[index].trim();
        if (line.length === 0) {
            continue;
        }
        if (line.indexOf('*') === 0) {
            line = line.substring(1).trim();
        } else {
            line = line.trim();
        }
        if (line.indexOf('@') === 0) {
            if (!firstTag) {
                docletData['freeText'] = commentBuffer.trim();
                commentBuffer = '';
            } else if (currentTagObject != null) {
                if (currentTagObject.description != null) {
                    currentTagObject.description += (' ' + commentBuffer.trim());
                    commentBuffer = '';
                }
            }
            firstTag = true;
            line = fixWords(line);
            var tag = line.split(' ')[0];
            tag = tag.split('@')[1];
            var tagData = line.split(' ');
            tagData.shift();
            var lastTag = null;
            if (docletData.tags.length > 0) {
                lastTag = docletData.tags[docletData.tags.length - 1];
            }
            var newTag = {
                tag: tag,
                line: index,
                lastLine: -1
            };
            if (lastTag !== null) {
                lastTag.lastLine = index - 1;
            }
            docletData.tags.push(newTag);
            if (tag === 'param') {
                if (tagData.length === 0) {
                    logger.log('(' + input.name + ')' + " Can't parse data for this param tag: " + line);
                    continue;
                }
                var paramDescription = '';
                var paramChunk = tagData[0].trim();
                var paramName = '';
                var paramType = '';
                if (paramChunk.indexOf('{') === 0 && tagData.length > 1) {
                    paramType = paramChunk;
                    paramName = tagData[1].trim();
                    tagData.shift();
                    tagData.shift();
                } else {
                    paramName = paramChunk;
                    tagData.shift();
                }
                paramDescription = tagData.join(' ').trim();
                paramType = fixTypes(paramType);
                if (paramType.length === 0) {
                    if (paramDescription.indexOf('}') !== -1) {
                        var paramParser = paramDescription.split('}');
                        paramType = fixTypes(paramParser[0]);
                        paramDescription = paramParser[1];
                        paramDescription = paramDescription.trim();
                        if (paramDescription.indexOf('{') !== -1) {
                            paramDescription += '}';
                        }
                    }
                }
                var paramObject = {
                    tagName: tag,
                    name: paramName,
                    type: paramType,
                    description: paramDescription
                };
                currentTagObject = paramObject;
                docletData.params.push(paramObject);
            } else if (tag === 'return') {
                if (tagData.length === 0) {
                    logger.error('(' + input.name + ')' + " Can't parse data for this return tag: " + line);
                    continue;
                }
                var returnDescription = '';
                var returnChunk = tagData[0].trim();
                var returnType = '';
                if (returnChunk.indexOf('{') === 0 && tagData.length > 1) {
                    returnType = tagData[0].trim();
                    tagData.shift();
                    tagData.shift();
                } else {
                    returnType = returnChunk;
                    tagData.shift();
                }
                returnDescription = tagData.join(' ').trim();
                returnType = fixTypes(returnType);
                if (returnType.length === 0) {
                    if (returnDescription.indexOf('}') !== -1) {
                        var returnParser = returnDescription.split('}');
                        returnType = fixTypes(returnParser[0]);
                        returnDescription = returnParser[1];
                        returnDescription = returnDescription.trim();
                        if (returnDescription.indexOf('{') !== -1) {
                            returnDescription += '}';
                        }
                    }
                }
                var returnObject = {
                    tagName: tag,
                    type: returnType,
                    description: returnDescription,
                    line: line
                };
                currentTagObject = returnObject;
                docletData['@return'] = currentTagObject;
            } else if (tag === 'requires') {
                var paramDescription = '';
                var paramChunk = tagData[0].trim();
                var paramName = '';
                var paramType = ''; // '{Module}';
                if (paramChunk.indexOf('{') === 0) {
                    paramType = paramChunk;
                    paramName = tagData[1].trim();
                    tagData.shift();
                    tagData.shift();
                } else {
                    paramName = paramChunk;
                    tagData.shift();
                }
                paramDescription = tagData.join(' ').trim();
                if (paramDescription.indexOf('in {@link') != -1) {
                    paramDescription = '';
                }
                currentTagObject = null;
            } else {
                if (tagData.length === 0) {
                    docletData['@' + tag] = tagData.join(' ').trim();
                    currentTagObject = docletData['@' + tag];
                    currentTagObject.tagName = tag;
                    currentTagObject.description = '';
                } else {
                    docletData['@' + tag] = tagData.join(' ').trim();
                    currentTagObject = docletData['@' + tag];
                    currentTagObject.tagName = tag;
                    currentTagObject.description = tagData.join(' ').trim();
                }
            }
            currentTag = tag;
        }
    }
    var preamble = [];
    if (docletData.tags.length > 0) {
        for (var index = 0; index < docletData.tags.length; index++) {
            var tag = docletData.tags[index];
            var textBuffer = [];
            if (index === 0) {
                getTagLines(lines, tag, preamble, true);
                preamble = stripStarLines(preamble);
            }
            getTagLines(lines, tag, textBuffer, false);
            textBuffer = stripStarLines(textBuffer);
            tag.text = textBuffer.join('\n');
            if (tag.text.trim().indexOf(':') === 0 && FIX_COMMENT_GRAMMAR && tag.tag !== 'function' && tag.tag !== 'method') {
                var stringBuffer = tag.text.trim().split('');
                stringBuffer.shift();
                tag.text = stringBuffer.join('');
                tag.text = capitalize(decamelize(tag.text).split('_').join(' '));
                var lastChar = tag.text.charAt(tag.text.length - 1);
                if (lastChar !== '.' && lastChar !== '?' && lastChar !== '!' && lastChar !== ':') {
                    tag.text += '.';
                }
            }
        }
    } else {
        if (!linesAreEmpty(lines)) {
            preamble = stripStarLines(lines);
        }
    }
    docletData.preamble = preamble.join('\n');
    if (linesAreEmpty(preamble)) {
        preamble = [];
        docletData.preamble = '';
    } else {
        docletData['freeText'] = docletData.preamble;
    }
    var nodeType = 'NONFUNCTION';
    if (docletData['@constructor'] != null) {
        nodeType = 'CLASS';
    }
    if (docletData['@class'] != null) {
        nodeType = 'CLASS';
    }
    if (docletData['@constructor'] != null && docletData['@constructor'].length > 0) {
        docletData['className'] = docletData['@constructor'];
    } else if (docletData['@class'] != null && docletData['@class'].length > 0) {
        docletData['constructor'] = docletData['@class'];
        docletData['className'] = docletData['@class'];
        delete docletData['@class'];
    }
    if (docletData['className'] != null && docletData['className'].length > 0) {
        if (docletData['@name'] != null && docletData['@name'].length > 0) {
            docletData['className'] = docletData['@class'];
        }
        nodeType = 'CLASS';
    }
    if (docletData['@exports'] != null || docletData['@module'] != null) {
        nodeType = 'MODULE';
    } else if (docletData['@lends'] != null) {
        nodeType = 'LENDS';
    } else if (docletData['@mixes'] != null) {} else if (docletData['@var'] != null) {
        nodeType = 'VAR';
    } else if (docletData['@type'] != null) {
        nodeType = 'VAR';
    }
    docletData.nodeType = nodeType;
    if ((docletData['freeText'] != null) && docletData['freeText'].length > 0) {
        if (docletData['freeText'].trim().charAt(docletData['freeText'].trim().length - 1) !== '.') {
            if (docletData['freeText'].trim().indexOf('</pre>') === -1) {
                docletData['freeText'] += '.';
            }
        }
        docletData['freeText'] = docletData['freeText'].split('<br />').join('<br />\r\n * ');
    }
    return docletData;
}

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
            } else if (typeof child === 'string') {}
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

function getLineNumber(input, obj) {
    var range = obj.range;
    var corpus = input.substring(0, range[0]);
    var lineCount = corpus.split('\n').length;
    return lineCount;
}

function stripWhite(input) {
    input = input.replace(/^\s+|\s+$/g, '');
    return input.trim();
}
/**
 * Return a single comment or null.
 *
 * @param input
 * @param nodeStart
 * @param ast
 * @param wrapper
 */
function getClosestComment(input, nodeStart, ast, wrapper) {
    var endpoint = ast.comments.length - 1;
    var lines = input.split('\n');
    for (var index = endpoint; index > -1; index--) {
        var comment = ast.comments[index];
        if (comment.lineNumber != null) {
            continue;
        }
        var range = comment.range;
        var commentBody = input.substring(range[0], range[1]).trim();
        if (commentBody.indexOf('/**') === -1) {
            continue;
        }
        var commentEnd = range[1];
        if (nodeStart > commentEnd) {
            var corpus = (input.substring(commentEnd, nodeStart).trim());
            if (corpus.length === 0) {
                var lineNumber = getLineNumber(input, comment);
                var block = getLines(lines, lineNumber - 1, wrapper.lineNumber - 1);
                var funxChunx = block.split('function ');
                if (block.split('/**').length > 3 || funxChunx.length > 3) {
                    return -1;
                }
                comment.lineNumber = lineNumber;
                return index;
            }
        }
    }
    return -1;
}
/**
 * getExistingComment must traverse from obj upwards through parent nodes
 *
 * @param input
 * @param obj
 * @param ast
 * @param wrapper
 * @returns {Number}
 */
function getExistingComment(input, obj, ast, wrapper) {
    var astNodeType = obj.type;
    var range = obj.range;
    var rangeStart = range[0];
    var nearComment = getClosestComment(input, rangeStart, ast, wrapper);
    if (nearComment === -1 && obj.parentNode != -1) {
        var parentNode = getNodeByUid(obj.parentNode);
        astNodeType = parentNode.type;
        var range = parentNode.range;
        var rangeStart = range[0];
        var nearComment = getClosestComment(input, rangeStart, ast, wrapper);
        if (nearComment === -1 && parentNode.parentNode != -1) {
            parentNode = getNodeByUid(parentNode.parentNode);
            if (parentNode == null) {
                logger.error('getExistingComment fatal error');
            }
            astNodeType = parentNode.type;
            if (astNodeType === 'FunctionExpression') {
                return -1;
            } else if (astNodeType === 'ObjectExpression') {
                return -1;
            }
            range = parentNode.range;
            rangeStart = range[0];
            nearComment = getClosestComment(input, rangeStart, ast, wrapper);
        }
    }
    return nearComment;
}

function getFunctionFullName(input, obj) {
    var parentNode = getNodeByUid(obj.parentNode);
    if (parentNode.type === 'Property') {
        return parentNode.key.name;
    }
    if (parentNode.left) {
        var range = parentNode.left.range;
        return input.substring(range[0], range[1]);
    } else if (parentNode.id) {
        var range = parentNode.id.range;
        return input.substring(range[0], range[1]);
    }
    return '';
}

function dumpParams(params) {
    var output = [];
    for (var index = 0; index < params.length; index++) {
        var param = params[index];
        var paramName = '';
        if (param.type === 'RestElement') {
            paramName = param.argument.name;
        } else {
            paramName = param.name;
        }
        output.push(paramName);
    }
    return output;
}

function unsquareName(input) {
    if (input.indexOf('[\'') !== -1) {
        input = input.split('[\'').join('.');
        input = input.split('\']').join('.');
    } else if (input.indexOf('["') !== -1) {
        input = input.split('["').join('.');
        input = input.split('"]').join('.');
    }
    if (input.charAt(input.length - 1) === '.') {
        input = input.split('');
        input.pop();
        input = input.join('');
    }
    return input;
}

function getParentClass(obj, classes) {
    for (var e in classes) {
        if (classes.hasOwnProperty(e)) {
            var klass = classes[e];
            var classRange = klass.range;
            if (obj.range[0] >= classRange[0] && obj.range[1] <= classRange[1]) {
                return klass;
            }
        }
    }
    return null;
}
/**
 * Need to include anonymous functions too?
 *
 * @param walkerObj
 * @param map
 * @param ast
 * @param output
 * @returns {object}
 */
function dumpNamedFunctions(walkerObj, map, ast, output) {
    var input = walkerObj.source;
    var lines = input.split('\n');
    var checkForReturnNode = true;
    if (output == null) {
        checkForReturnNode = true;
    }
    output = output != null ? output : {};
    output.classes = output.classes != null ? output.classes : {};
    output.methods = output.methods != null ? output.methods : {};
    for (var index = 0; index < map.length; index++) {
        if (true) {
            var obj = map[index];
            if (obj.key) {
                function getParentClassDeclaration(method) {
                    var parentNode = method;
                    var type;
                    while (parentNode) {
                        parentNode = getNodeByUid(parentNode.parentNode);
                        if (parentNode) {
                            type = parentNode.type;
                            if (type === 'ClassDeclaration' || type === 'ClassExpression') {
                                return parentNode;
                            }
                        } else {
                            return null;
                        }
                    }
                }
                var ownerClass = null;
                if (obj.kind === 'method') {
                    parent = getParentClassDeclaration(obj);
                    ownerClass = parent.id.name;
                }
                var key = obj.key;
                var staticVal = obj.static;
                var kind = obj.kind;
                obj = obj.value;
                obj.static = staticVal;
                obj.id = key;
            }
            var functionWrapper = {
                name: '',
                todos: []
            };
            if (obj.id !== null) {
                functionWrapper.name = obj.id.name;
            } else {
                functionWrapper.name = getFunctionFullName(input, obj);
            }
            if (obj.params.length > 0) {
                functionWrapper.params = dumpParams(obj.params);
                functionWrapper.paramsRaw = obj.params;
            }
            if (obj.returnType !== '') {
                functionWrapper.returnType = obj.returnType;
            }
            if (obj.static) {
                functionWrapper.static = obj.static;
            }
            if (obj.kind) {
                functionWrapper.kind = obj.kind;
            }
            if (obj.type) {
                functionWrapper.type = obj.type;
            }
            if (index === 0 && checkForReturnNode && walkerObj.preprocessed && functionWrapper.name === '') {
                var bodyNodes = obj.body.body;
                var returnNode = null;
                for (var n = 0; n < bodyNodes.length; n++) {
                    var node = bodyNodes[n];
                    if (node.type === 'ReturnStatement') {
                        if (node.argument && node.argument.type === 'ObjectExpression') {
                            returnNode = node;
                            break;
                        } else if (node.argument && node.argument.type === 'FunctionExpression') {
                            returnNode = node;
                            break;
                        }
                    }
                }
                if (returnNode) {
                    var rrange = returnNode.range;
                    var returnBody = input.substring(rrange[0], rrange[1]);
                    var textMinusReturn = returnBody.substring(6).trim();
                    var packagePath = walkerObj.path.split('/');
                    packagePath.shift();
                    packagePath = packagePath.join('/');
                    packagePath = packagePath.split('.js')[0];
                    var foundNode = false;
                    if (walkerObj.results.amdProc.AMD) {
                        if (textMinusReturn.charAt(0) === '{') {
                            returnBody = 'return /**@alias module:' + packagePath + ' */ ' + textMinusReturn;
                            foundNode = true;
                        } else if (returnNode.argument.id) {
                            var constructorName = returnNode.argument.id.name;
                            textMinusReturn = textMinusReturn.split(constructorName).join(capitalize(constructorName));
                            logger.log('Renaming class to "' + capitalize(constructorName) + '".');
                            returnBody = 'return /** @constructor */\n' + textMinusReturn;
                            foundNode = true;
                        } else if (!returnNode.argument.id) {}
                    } else {
                        if (textMinusReturn.charAt(0) === '{') {
                            var textBefore = input.substring(0, rrange[0]).trim();
                            textBefore = textBefore.split('\n');
                            textBefore = textBefore[textBefore.length - 1];
                            textBefore = textBefore.split('(')[1];
                            textBefore = textBefore.split(',')[0];
                            var ngClassName = textBefore.split('"').join('').split("'").join('').trim();
                            if (walkerObj.NG) {
                                returnBody = 'return /**@lends module:' + packagePath + '~' + capitalize(ngClassName) + '#' + ' */ ' + textMinusReturn;
                                foundNode = true;
                            }
                        }
                    }
                    if (foundNode) {
                        walkerObj.rewrittenReturnBody = returnBody;
                        walkerObj.rewrittenReturnBodyNode = returnNode;
                        var source = walkerObj.source;
                        var range = returnNode.range;
                        var beginningOfFile = source.substring(0, range[0]);
                        var endOfFile = source.substring(range[1]);
                        walkerObj.source = beginningOfFile + returnBody + endOfFile;
                        return 'AMD_RETURN_BLOCK';
                    }
                }
            }
            var ctor = false;
            functionWrapper.memberOf = '';
            if (functionWrapper.name && functionWrapper.name !== '') {
                var firstChar = functionWrapper.name.charAt(0);
                if (!isAlpha(firstChar)) {
                    for (var ccc = 0; ccc < functionWrapper.name.length; ccc++) {
                        firstChar = functionWrapper.name.charAt(ccc);
                        if (isAlpha(firstChar)) {
                            break;
                        }
                    }
                }
                if (functionWrapper.name.indexOf('.') !== -1 || functionWrapper.name.indexOf(']') !== -1) {
                    functionWrapper.realName = functionWrapper.name;
                    functionWrapper.longName = unsquareName(functionWrapper.name);
                    var longSplit = functionWrapper.longName.split('.');
                    functionWrapper.name = longSplit.pop();
                    functionWrapper.memberOf = longSplit.join('.');
                    if (functionWrapper.memberOf !== 'this' && (functionWrapper.memberOf.indexOf('.prototype') === -1)) {
                        functionWrapper.todos.push('MEMBEROF');
                    }
                } else {
                    if (firstChar.toUpperCase() === firstChar) {
                        if (functionWrapper.name === walkerObj.camelName) {
                            ctor = true;
                            functionWrapper.returnType = '';
                            output.classes[functionWrapper.name] = obj.uid;
                        } else {
                            ctor = true;
                            functionWrapper.returnType = '';
                            output.classes[functionWrapper.name] = obj.uid;
                        }
                    }
                }
                functionWrapper.ctor = ctor;
                functionWrapper.ctor = functionWrapper.name.indexOf('constructor') !== -1;
                var lineNumber = getLineNumber(input, obj);
                functionWrapper.lineNumber = lineNumber;
                functionWrapper.line = trim(lines[lineNumber - 1]);
                functionWrapper.comment = -1;
                var comment = getExistingComment(input, obj, ast, functionWrapper);
                if (comment != -1) {
                    functionWrapper.comment = comment;
                }
                if (functionWrapper.returnType === '?') {
                    functionWrapper.todos.push('RETURNWHAT');
                }
                functionWrapper.range = obj.range;
                if (ownerClass) {
                    functionWrapper.memberOf = ownerClass;
                }
                output.methods[functionWrapper.name] = functionWrapper;
                functionWrapper.name = null;
                delete functionWrapper.name;
            }
        }
    }
    return output;
}

function dumpNamedClassDeclarations(walkerObj, map, ast, output) {
    var input = walkerObj.source;
    var lines = input.split('\n');
    output = output != null ? output : [];
    for (var index = 0; index < map.length; index++) {
        var obj = map[index];
        var varWrapper = {
            name: '?',
            type: '',
            range: null,
            decamelizedName: ''
        };
        if (obj.id !== null) {
            varWrapper.name = obj.id.name;
            varWrapper.decamelizedName = capitalize(decamelize(varWrapper.name).split('_').join(' '));
        }
        if (obj.type) {
            varWrapper.type = obj.type;
        }
        if (obj.kind) {
            varWrapper.kind = obj.kind;
        }
        if (obj.static) {
            varWrapper.static = obj.static;
        }
        varWrapper.range = obj.range;
        var lineNumber = getLineNumber(input, obj);
        varWrapper.lineNumber = lineNumber;
        varWrapper.line = trim(lines[lineNumber - 1]);
        varWrapper.comment = -1;
        var comment = getExistingComment(input, obj, ast, varWrapper);
        if (comment !== -1) {
            varWrapper.comment = comment;
        }
        output.push(varWrapper);
    }
    return output;
}
/**
 * Dump variable declarations.
 *
 * @param walkerObj
 * @param map
 * @param ast
 * @param output
 * @returns {array}
 */
function dumpNamedVariables(walkerObj, map, ast, output) {
    var input = walkerObj.source;
    var lines = input.split('\n');
    output = output != null ? output : [];
    for (var index = 0; index < map.length; index++) {
        var obj = map[index];
        var decl = obj.declarations[0];
        var initVal = decl.init;
        var varWrapper = {
            name: '?',
            kind: '?',
            type: '',
            range: null,
            decamelizedName: ''
        };
        if (initVal) {
            if (initVal.type === 'Literal') {
                varWrapper.type = typeof (initVal.value);
            } else if (initVal.type === 'FunctionExpression') {
                continue;
            }
        }
        var lineNumber = getLineNumber(input, obj);
        varWrapper.lineNumber = lineNumber;
        varWrapper.line = trim(lines[lineNumber - 1]);
        if (decl.id) {
            if (decl.id.type === 'Identifier') {
                varWrapper.name = decl.id.name;
                varWrapper.decamelizedName = capitalize(decamelize(varWrapper.name).split('_').join(' '));
            }
        }
        if (obj.kind !== '') {
            varWrapper.kind = obj.kind;
        }
        varWrapper.range = obj.range;
        varWrapper.comment = -1;
        var comment = getExistingComment(input, obj, ast, varWrapper);
        if (comment !== -1) {
            varWrapper.comment = comment;
        }
        output.push(varWrapper);
    }
    return output;
}
/**
 *
 * @param doclet
 * @param name
 * @return the tag
 */
function searchTags(doclet, name) {
    var tags = enumTags(doclet);
    if (tags == null) {
        return null;
    }
    if (!tags.hasOwnProperty(name)) {
        return null;
    }
    var tagHash = tags[name];
    if (tagHash == null) {
        return null;
    }
    if (tagHash.join !== null) {
        return tagHash;
    } else {
        return tagHash;
    }
}
/**
 *
 * @param doclet
 *            from parseDoclet()
 * @returns {Object} simple mapping of tags
 */
function enumTags(doclet) {
    var output = {};
    var tags = doclet.tags;
    if (tags == null) {
        return output;
    }
    for (var i = 0; i < tags.length; i++) {
        var tag = tags[i];
        if (tag.tag === 'param') {
            var params = output.params;
            if (params == null) {
                params = [];
                output.params = params;
            }
            params.push(tag);
        } else if (tag.tag === 'requires') {
            var requires = output.requires;
            if (requires == null) {
                requires = [];
                output.requires = requires;
            }
            requires.push(tag);
        } else if (tag.tag === 'augments') {
            var augments = output.augments;
            if (augments == null) {
                augments = [];
                output.augments = augments;
            }
            augments.push(tag);
        } else if (tag.tag === 'lends') {
            var lends = output.lends;
            if (lends == null) {
                lends = [];
                output.lends = lends;
            }
            lends.push(tag);
        } else if (tag.tag === 'mixes') {
            var mixes = output.mixes;
            if (mixes == null) {
                mixes = [];
                output.mixes = mixes;
            }
            mixes.push(tag);
        } else if (tag.tag === 'borrows') {
            var borrows = output.borrows;
            if (borrows == null) {
                borrows = [];
                output.borrows = borrows;
            }
            borrows.push(tag);
        } else if (tag.tag === 'author') {
            var author = output.author;
            if (author == null) {
                author = [];
                output.author = author;
            }
            author.push(tag);
        } else {
            output[tag.tag] = tag;
        }
    }
    return output;
}

function getCommentWith(input, comments, whatTag) {
    for (var index = 0; index < comments.length; index++) {
        var comment = comments[index];
        var range = comment.range;
        if (comment.type === 'Line') {
            continue;
        }
        var commentBody = input.substring(range[0], range[1]);
        if (commentBody.indexOf('/**') === -1) {
            continue;
        }
        comment.commentBody = commentBody;
        if (commentBody.indexOf(whatTag) !== -1) {
            return comment;
        }
    }
    return null;
}
/**
 *
 * @param message
 * @param error
 * @param errors
 * @param walkerObj
 * @returns {Array}
 */
function reportError(message, error, errors, walkerObj) {
    if (errors == null) {
        message = '';
    }
    if (errors == null) {
        errors = [];
    }
    if (error == null) {
        error = new Error();
        error.message = message;
    }
    if (walkerObj != null) {
        error.module = walkerObj;
    }
    error.description = message;
    errors.push(error);
    logger.warn(error);
    return errors;
}
/*
 * get the last non-empty line of a body of text
 * @param {String} input
 * @return {String} the last line
 */
function lastLineOf(input) {
    input = input.trim();
    if (input.length === 0) {
        logger.log('lastLineOf: input was empty, returning empty string');
        return '';
    }
    var lines = input.split('\n');
    var lastLineNumber = lines.length - 1;
    return lines[lastLineNumber];
}
/*
 * get the line of a body of text given its offset
 * @param {String} input
 * @param {Number} offset
 * @return {String} the last line
 */
function lineFromOffset(input, offset) {
    if (input.length === 0) {
        logger.log('lineFromOffset: input was empty, returning empty string');
        return '';
    }
    input = input.substring(0, offset);
    var lines = input.split('\n');
    var lastLineNumber = lines.length - 1;
    return lines[lastLineNumber];
}
/*
 * get the last word of a body of text
 * @param {String} input
 * @return {String} the last word
 */
function lastWordOf(input) {
    input = input.trim();
    if (input.length === 0) {
        logger.log('lastWordOf: input was empty, returning empty string');
        return '';
    }
    var words = input.split(' ');
    var lastWordNumber = words.length - 1;
    return words[lastWordNumber];
}
/**
 * Add a comment knowing only the index of the found pattern.
 * @param {String} input
 * @param {Number} offset
 * @param {String} comment
 * @param {String} lendsDoc
 * @return {String} modified input
 */
function prependLineByOffset(input, offset, comment, lendsDoc) {
    var lines = input.split('\n');
    var linesUpTo = input.substring(0, offset);
    var lineOffset = linesUpTo.split('\n').length - 1;
    if (lineOffset < 0) {
        logger.log('prependLineByOffset: invalid offset');
    }
    if (lendsDoc) {
        var nextLine = lines[lineOffset + 1];
        if (nextLine.indexOf('return') !== -1) {
            lines[lineOffset + 1] = '  return ' + lendsDoc + ' {';
        }
    }
    lines.splice(lineOffset, 0, comment);
    input = lines.join('\n');
    return input;
}
/**
 * Indicate that an Angular constructor/factory makes a class.
 * @param {String} input
 * @param {String} ngModName
 * @param {String} ngBaseClass
 * @param packagePath
 * @returns {String}
 */
function commentAngularClasses(input, ngModName, ngBaseClass, packagePath) {
    var originalInput = input;
    var chunkToSearch = '.' + ngBaseClass + '(';
    var offset = input.indexOf(chunkToSearch);
    if (offset !== -1) {
        input = stripOneLineComments(stripCComments(input));
        var allSplits = input.split(chunkToSearch);
        var tempInput = input;
        for (var index = 1; index < allSplits.length; index++) {
            var ngChunkSplit = allSplits[index];
            ngChunkSplit = ngChunkSplit.split(',')[0].trim();
            if (ngChunkSplit.indexOf('(') === -1) {
                ngChunkSplit = ngChunkSplit.split('"').join('').split("'").join('').trim();
                var constructorDoc = '/**\n * @class ' + capitalize(ngChunkSplit) + '\n * @extends ' + ngBaseClass + '\n */';
                if (ngBaseClass === 'module') {
                    constructorDoc = '/**\n * @module ' + ngChunkSplit + '\n */';
                }
                var originalChunk = allSplits[index];
                var newOffset = tempInput.indexOf(originalChunk);
                var lendsDoc = '/** @lends module:' + packagePath + '~' + capitalize(ngChunkSplit) + '# */';
                tempInput = prependLineByOffset(tempInput, newOffset, constructorDoc, lendsDoc);
            } else {
                input = originalInput;
                tempInput = originalInput;
            }
        }
        input = tempInput;
    }
    return input;
}
var incompleteLends = null;
var spliceInlineConstructor = null;

function deleteFile(filePathName) {
    filePathName = pathAPI.normalize(filePathName);
    var success = false;
    try {
        fileSystem.unlinkSync(filePathName);
        success = true;
    } catch (er) {}
    return success;
}
/**
 * Return 0-based index of line number for char offset.
 * @param   {string}   input [[Description]]
 * @param   {number} index [[Description]]
 * @returns {string} [[Description]]
 */
function getLineNumberForIndex(input, index) {
    var temp = input.substring(0, index);
    return temp.split('\n').length - 1;
}
/**
 *
 * @param walkerObj
 * @param errors
 * @returns
 */
function addMissingComments(walkerObj, errors) {
    walkerObj.namedConstructors = {};
    if (errors == null) {
        errors = [];
    }
    if (walkerObj.checkForRequiresMismatch == null) {
        walkerObj.checkForRequiresMismatch = true;
    }
    walkerObj.preprocessed = false;
    logger.log('addMissingComments ' + walkerObj.path);
    var beautify = require('js-beautify');
    var input = walkerObj.source;
    var _esprima = require('esprima');
    var ast = {};
    uid = 0;
    nodes = [];
    try {
        ast = _esprima.parse(input, {
            comment: true,
            tolerant: true,
            range: true,
            raw: true,
            tokens: true
        });
    } catch (esError) {
        reportError('ESPRIMA ERROR at top of addMissingComments', esError, errors, walkerObj);
        writeFile('error.js', input);
        return 'ERROR';
    }
    try {
        writeFile('ast.json', JSON.stringify(ast, null, 2));
    } catch (writeJsonErr) {}
    var expressionStatements = getNodesByType(ast, 'ExpressionStatement');
    var defineBlocks = [];
    var es = 0;
    var defineCount = 0;
    var firstDefineBlock = null;
    for (es = 0; es < expressionStatements.length; es++) {
        var oneDefine = expressionStatements[es];
        if (oneDefine.expression.callee && oneDefine.expression.callee.name === 'define') {
            var defBlock = {};
            defBlock.name = oneDefine.expression.arguments[0].value;
            defBlock.range = oneDefine.range;
            if (defineCount === 0) {
                firstDefineBlock = oneDefine;
            }
            defineCount++;
            if (defineCount > 1) {
                break;
            }
        }
    }
    if (defineCount > 1) {
        for (es = 0; es < expressionStatements.length; es++) {
            var oneDefine = expressionStatements[es];
            if (oneDefine.expression.callee && oneDefine.expression.callee.name === 'define') {
                var defBlock = {};
                defBlock.name = oneDefine.expression.arguments[0].value;
                defBlock.range = oneDefine.range;
                defineBlocks.push(defBlock);
                if (defBlock.name && defBlock.name.indexOf('/') === -1) {
                    var tempModuleSource = input.substring(defBlock.range[0], defBlock.range[1]);
                    writeFile('test-source/' + defBlock.name + '.js', tempModuleSource);
                }
            }
        }
        return 'REDO_FILE_TREE';
    }
    if (firstDefineBlock && FIX_COFFEE) {
        //        if (input.indexOf('// Generated by CoffeeScript') === 0 || input.indexOf('(function () {') !== -1) {
        //            var whereDefine = input.indexOf('define(');
        //            var boilerPlate = input.substring(0, whereDefine - 1);
        //            var remainder = input.substring(whereDefine);
        //            remainder = remainder.trim();
        //            remainder = remainder.split('\n');
        //            if (remainder[remainder.length - 1].trim() === '}).call(this);') {
        //                remainder[remainder.length - 1] = ''
        //            }
        //            remainder = remainder.join('\n').trim();
        //            walkerObj.source = remainder;
        //            return addMissingComments(walkerObj, errors);
        //        }
        var moduleName = 'module:' + walkerObj.results.amdProc.moduleName;
        var packagePath = walkerObj.path.split('/');
        packagePath.shift();
        packagePath = packagePath.join('/');
        packagePath = packagePath.split('.js')[0];
        if (firstDefineBlock.expression.arguments && firstDefineBlock.expression.arguments[0]) {
            var exArgs = firstDefineBlock.expression.arguments[0];
            if (exArgs.type === 'ArrayExpression') {
                exArgs = firstDefineBlock.expression.arguments[1];
            } else if (exArgs.type === 'StringExpression') {
                exArgs = firstDefineBlock.expression.arguments[2];
            }
            if (exArgs.type === 'FunctionExpression') {
                var funcBody = exArgs.body.body;
                var block = null;
                for (var statement = 0; statement < funcBody.length; statement++) {
                    block = funcBody[statement];
                    if (block.type === 'ReturnStatement') {
                        break;
                    }
                }
                if (block.type === 'ReturnStatement') {
                    var lines = input.split('\n');
                    var iifeToken = 'return (function (';
                    var whereToEdit = input.indexOf(iifeToken);
                    if (whereToEdit === -1) {
                        iifeToken = ' = (function (';
                        whereToEdit = input.indexOf(iifeToken);
                    }
                    if (whereToEdit === -1) {} else {
                        var whichLine = getLineNumberForIndex(input, whereToEdit);
                        var editInput = '';
                        var classNameFromModule = capitalize(camelize(walkerObj.results.amdProc.moduleName));
                        var editedLine = lines[whichLine];
                        if (editedLine.indexOf(' = ') !== -1) {
                            var words = editedLine.trim().split(' ');
                            classNameFromModule = words[1];
                        }
                        var newCode = '/**@lends module:' + packagePath + '~' + classNameFromModule + '#' + ' */';
                        if (whereToEdit === -1 && input.indexOf('@lends module:') === -1) {
                            logger.error('>>>>> COULD NOT FIND IIFE!!!: ' + walkerObj.name + '.');
                            return 'ERROR';
                        }
                        if (input.indexOf('@lends module:') === -1) {
                            editedLine = editedLine.split('function').join(newCode + ' function');
                            lines[whichLine] = editedLine;
                            editInput = lines.join('\n');
                            walkerObj.source = editInput;
                            logger.log('>>>>> Need to re-parse an IIFE-wrapped module: ' + walkerObj.name + '.');
                            return addMissingComments(walkerObj, errors);
                        }
                    }
                }
            }
        }
    }
    if (!walkerObj.NG && input.indexOf('angular.module') !== -1) {
        var ngSplit = input.split('angular.module')[1];
        ngSplit = ngSplit.split(']')[0];
        var ngModName = ngSplit.split(',')[0];
        ngModName = ngModName.split('(')[1].trim();
        var deps = ngSplit.split('[')[1].trim();
        deps = deps.split('\'').join('');
        deps = stripOneLineComments(stripCComments(deps));
        deps = deps.split(',');
        ngModName = ngModName.split('\'').join('');
        for (var d = 0; d < deps.length; d++) {
            var dep = deps[d];
            deps[d] = dep.trim();
        }
        walkerObj.NG = true;
        walkerObj.ngModule = ngModName;
        walkerObj.ngDeps = deps;
        input = commentAngularClasses(input, ngModName, 'module', packagePath);
        input = commentAngularClasses(input, ngModName, 'directive', packagePath);
        input = commentAngularClasses(input, ngModName, 'controller', packagePath);
        input = commentAngularClasses(input, ngModName, 'service', packagePath);
        input = commentAngularClasses(input, ngModName, 'filter', packagePath);
        input = commentAngularClasses(input, ngModName, 'factory', packagePath);
        input = commentAngularClasses(input, ngModName, 'provider', packagePath);
        walkerObj.source = input;
        logger.log('>>>>> Need to recalculate NG module: ' + walkerObj.name + '.');
        return addMissingComments(walkerObj, errors);
    }
    if (!walkerObj.NG && input.indexOf('.factory(') !== -1 && input.indexOf('$http') !== -1) {
        var deps = [];
        var ngModName = walkerObj.results.amdProc.moduleName;
        walkerObj.NG = true;
        walkerObj.ngModule = ngModName;
        walkerObj.ngDeps = deps;
        input = commentAngularClasses(input, ngModName, 'module', packagePath);
        input = commentAngularClasses(input, ngModName, 'directive', packagePath);
        input = commentAngularClasses(input, ngModName, 'controller', packagePath);
        input = commentAngularClasses(input, ngModName, 'service', packagePath);
        input = commentAngularClasses(input, ngModName, 'filter', packagePath);
        input = commentAngularClasses(input, ngModName, 'factory', packagePath);
        input = commentAngularClasses(input, ngModName, 'provider', packagePath);
        walkerObj.source = input;
        return addMissingComments(walkerObj, errors);
    }
    walkerObj.NODEJS = false;
    walkerObj.ES6 = false;
    if (!walkerObj.NG && !walkerObj.results.amdProc.AMD) {
        if (input.indexOf('require(') !== -1 || input.indexOf('.exports') !== -1) {
            if (input.indexOf("require('express')") !== -1) {
                logger.log('Express.js');
                var expressOffset = input.indexOf('= express(');
                if (expressOffset !== -1 && !walkerObj.EXPRESS) {
                    var expressSplit = input.split('= express(')[0];
                    expressSplit = lastLineOf(expressSplit);
                    expressSplit = lastWordOf(expressSplit);
                    logger.log('App derived from Express: ', expressSplit);
                    var constructorDoc = '/**\n * @constructor\n * @extends express\n */';
                    input = prependLineByOffset(input, expressOffset, constructorDoc);
                    walkerObj.source = input;
                    logger.log('>>>>> 1)Need to recalculate node module: ' + walkerObj.name + '.');
                    walkerObj.EXPRESS = true;
                    walkerObj.NODEJS = true;
                    return addMissingComments(walkerObj, errors);
                }
            } else if (input.indexOf('module.exports') !== -1 && !walkerObj.NODE_EXPORTS) {
                var exportsOffset = input.indexOf('module.exports');
                var exportsSplit = input.split('module.exports')[1].trim();
                exportsSplit = exportsSplit.split('=')[1].trim();
                exportsSplit = exportsSplit.split(';').join('');
                logger.log('I think the node module exports a symbol: ', exportsSplit);
                if (exportsSplit.split('\n').length < 2 && (input.indexOf('@constructor') === -1 && input.indexOf('@class') === -1)) {
                    var constructorDoc = '/**\n * @constructor\n */';
                    // FIXME: ctorOffset fails if exportsSplit is in a comment!!!
                    var ctorOffset = input.indexOf(exportsSplit);
                    input = prependLineByOffset(input, ctorOffset, constructorDoc);
                    walkerObj.source = input;
                    logger.log('>>>>> 2)Need to recalculate node module: ' + walkerObj.name + '.');
                    walkerObj.NODEJS = true;
                    walkerObj.NODE_EXPORTS = exportsSplit;
                    return addMissingComments(walkerObj, errors);
                }
            }
            walkerObj.NODEJS = true;
        }
    }
    if (input.indexOf('@exports') !== -1) {
        var modChunk = input.split('@exports')[1];
        modChunk = modChunk.split('\n')[0].trim();
        moduleName = 'module:' + modChunk;
        logger.log('Infer module name from @exports definition.');
    } else if (input.indexOf('@module') !== -1) {
        var modChunk = input.split('@module')[1];
        modChunk = modChunk.split('\n')[0].trim();
        moduleName = 'module:' + modChunk;
        logger.log('Infer module name from @module definition.');
    } else {
        moduleName = 'module:' + walkerObj.results.amdProc.moduleName;
        if (!walkerObj.NG) {
            logger.log('Infer module name from file or AMD definition.');
        }
    }
    walkerObj.moduleName = moduleName;
    walkerObj.moduleName = walkerObj.mappedModuleName;
    if (walkerObj.NG) {
        moduleName = 'module:' + walkerObj.ngModule;
    }
    var hasLends = getCommentWith(input, ast.comments, '@lends');
    if (hasLends != null && incompleteLends == null) {
        if (hasLends.value.indexOf('module:') !== -1) {
            if (hasLends.value.indexOf('~') === -1) {
                logger.warn('@lends used with a Module but not with a Class.');
                logger.warn(hasLends);
                incompleteLends = hasLends;
            }
        }
    }
    var nodeWithRequiresBlock = null;
    if (walkerObj.checkForRequiresMismatch) {
        var hasModule = getCommentWith(input, ast.comments, '@module');
        var hasExports = getCommentWith(input, ast.comments, '@exports');
        if (hasExports != null) {
            logger.log('Found @exports.');
            nodeWithRequiresBlock = hasExports;
        } else if (hasModule != null) {
            logger.log('Did not find @exports but found @module.');
            nodeWithRequiresBlock = hasModule;
        }
        if (nodeWithRequiresBlock != null) {
            var statusCheck = {
                merge: false
            };
            var newComment = generateComment(null, ast, walkerObj, input, nodeWithRequiresBlock, statusCheck);
            var oldComment = nodeWithRequiresBlock.commentBody;
            if (statusCheck.merge) {
                logger.warn('Replace with new doclet:');
                logger.warn(newComment);
                var head = walkerObj.source.substring(0, nodeWithRequiresBlock.range[0] - 1);
                var tail = walkerObj.source.substring(nodeWithRequiresBlock.range[1] + 1);
                walkerObj.source = (head + newComment + '\n' + tail);
                logger.log('>>>>> Need to rewrite requires on ' + walkerObj.name + '.');
                walkerObj.checkForRequiresMismatch = false;
                return addMissingComments(walkerObj, errors);
            } else {
                logger.log('No need to rewrite requires on ' + walkerObj.name + '.');
            }
        }
    }
    var moduleAtTop = input.indexOf('@exports') === -1;
    var defineModuleInTopOfFile = moduleAtTop;
    var newFile = '';
    var cursor = 0;
    var functionExpressions = getNodesByType(ast, 'FunctionExpression');
    var functionDeclarations = getNodesByType(ast, 'FunctionDeclaration');
    var expressionFunctions = dumpNamedFunctions(walkerObj, functionExpressions, ast);
    var allMethods = dumpNamedFunctions(walkerObj, functionDeclarations, ast, expressionFunctions);
    var classDeclarations = getNodesByType(ast, 'ClassDeclaration');
    var methodDefinitions = getNodesByType(ast, 'MethodDefinition');
    allMethods = dumpNamedFunctions(walkerObj, methodDefinitions, ast, allMethods);
    for (var c in classDeclarations) {
        if (classDeclarations.hasOwnProperty(c)) {
            var classObj = classDeclarations[c];
            allMethods.classes[c] = classObj.uid;
        }
    }
    var methods = allMethods.methods;
    var varExpressions = getNodesByType(ast, 'VariableDeclaration');
    var varExpressionDeclarations = dumpNamedVariables(walkerObj, varExpressions, ast);
    var classExpressionDeclarations = dumpNamedClassDeclarations(walkerObj, classDeclarations, ast);
    if (classExpressionDeclarations.length > 1) {
        console.log('THIS es6 MODULE HAS MORE THAN ONE CLASS!!!!');
    } else if (classExpressionDeclarations.length === 1) {
        walkerObj.ES6 = true;
        var lines = input.split('\n');
        var classDef = classExpressionDeclarations[0];
        var lineNumber = 0;
        for (var index = 0; index < lines.length; index++) {
            var line = lines[index];
            if (line.trim().indexOf(classDef.line.trim()) !== -1) {
                lineNumber = index;
                break;
            }
        }
        var declarationLine = lines[lineNumber];
        if (declarationLine.indexOf('export default') !== -1) {
            declarationLine = declarationLine.split('export default')[1];
            lines[lineNumber] = declarationLine;
            var classBody = input.substring(classDef.range[0], classDef.range[1]);
            var classBodyLines = classBody.split('\n');
            var classLength = classBodyLines.length;
            var whereToAdd = lineNumber + classLength - 1;
            lines[whereToAdd] = lines[whereToAdd] + '\n// Export the class below instead of same line as class declaration.';
            lines[whereToAdd] = lines[whereToAdd] + '\nexport default ' + classDef.name + ';';
            input = lines.join('\n') + '\n';
            walkerObj.source = input;
            return addMissingComments(walkerObj, errors);
        }
    }
    var methodArray = [];
    for (var m in methods) {
        if (methods.hasOwnProperty(m)) {
            var method = methods[m];
            method.name = m;
            methodArray.push(method);
        }
    }
    methodArray = methodArray.sort(function compare(a, b) {
        if (a.range[0] < b.range[0]) {
            return -1;
        } else if (a.range[0] > b.range[0]) {
            return 1;
        }
        return 0;
    });
    varExpressionDeclarations = varExpressionDeclarations.sort(function compare(a, b) {
        if (a.range[0] < b.range[0]) {
            return -1;
        } else if (a.range[0] > b.range[0]) {
            return 1;
        }
        return 0;
    });
    var lines = input.split('\n');
    var newFileLines = [];
    var rewriteLines = true;
    for (var lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        var line = lines[lineIndex];
        var trimLine = line.trim();
        if (trimLine.indexOf('//') === 0 || trimLine.length === 0) {
            newFileLines.push(line);
            continue;
        }
        var method = getMethodOnLine(methodArray, lineIndex + 1, ast, input);
        var variable = null;
        if (COMMENT_VARIABLES) {
            variable = getMethodOnLine(varExpressionDeclarations, lineIndex + 1, ast, input);
        }
        var classDeclaration = null;
        if (!method && !variable) {
            classDeclaration = getMethodOnLine(classExpressionDeclarations, lineIndex + 1, ast, input);
        }
        var itemToComment = null;
        if (method) {
            itemToComment = method;
        } else if (variable) {
            itemToComment = variable;
        } else if (classDeclaration) {
            itemToComment = classDeclaration;
        }
        if (rewriteLines) {
            var newComment = '';
            if (itemToComment != null && itemToComment.comment === -1) {
                newComment = generateComment(itemToComment, ast, walkerObj, input);
                itemToComment.jsDoc = newComment;
                newFileLines.push(newComment);
                newFileLines.push(line);
            } else if (itemToComment != null && itemToComment.comment !== -1) {
                newComment = generateComment(itemToComment, ast, walkerObj, input);
                itemToComment.jsDoc = newComment;
                newFileLines.push(newComment);
                lineIndex = itemToComment.lineNumber - 1;
                line = lines[lineIndex];
                newFileLines.push(line);
            } else {
                newFileLines.push(line);
            }
        } else {
            newFileLines.push(line);
        }
    }
    newFile = newFileLines.join('\n');
    newFile = beautify(newFile, {
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
    if (!walkerObj.preprocessed) {
        logger.log('checking... re-written code');
        walkerObj.source = newFile;
        walkerObj.preprocessed = true;
        try {
            ast = _esprima.parse(walkerObj.source, {
                comment: true,
                tolerant: true,
                range: true,
                raw: true,
                tokens: true
            });
        } catch (esError) {
            writeFile(walkerObj.processedFilePath, walkerObj.source);
            reportError('ESPRIMA ERROR 2nd time parse in addMissingComments', esError, errors, walkerObj);
            ex();
            return 'ERROR';
        }
        try {
            writeFile('ast.json', JSON.stringify(ast, null, 2));
        } catch (writeJsonErr) {}
        functionExpressions = getNodesByType(ast, 'FunctionExpression');
        functionDeclarations = getNodesByType(ast, 'FunctionDeclaration');
        var check = expressionFunctions = dumpNamedFunctions(walkerObj, functionExpressions, ast);
        if (check === 'AMD_RETURN_BLOCK') {
            newFile = walkerObj.source;
        }
    }
    if (walkerObj.source.indexOf('@typedef') !== -1) {
        newFile = walkerObj.source;
        logger.warn('SKIPPING FILE ' + walkerObj.name + ' because it\'s got @typedef');
        walkerObj.skip = true;
    }
    var outputArray = [];
    var builtPath = walkerObj.folderPath + pathAPI.sep + walkerObj.fileName;
    var fileNamePath = fileSystem.realpathSync(builtPath);
    var dir = pathAPI.dirname(fileNamePath);
    var fileNameOnly = pathAPI.basename(fileNamePath);
    var fileNameMinusExt = fileNameOnly.split('.')[0];
    var basePath = pathAPI.normalize(fileNamePath.split(walkerObj.fileName)[0]);
    var splitPath = basePath.split(pathAPI.sep);
    if (splitPath[splitPath.length - 1] === '') {
        splitPath.pop();
        basePath = splitPath.join(pathAPI.sep);
    }
    var wrappedMethods = [];
    for (var meth = 0; meth < methodArray.length; meth++) {
        var realMethod = methodArray[meth];
        var visibility = 'public';
        var staticScope = false;
        var docletNode = realMethod.doclet;
        if (!docletNode) {
            logger.error(new Error('Method in addMissingComments() lacks a doclet: ' + realMethod.name));
            continue;
        }
        var description = '';
        var preamble = '';
        if (docletNode.preamble) {
            preamble = docletNode.preamble;
        }
        if (docletNode.freeText) {
            description = docletNode.freeText;
        }
        var originalJsDocDescription = {};
        if (docletNode.tags) {
            var desc = searchTags(docletNode, 'description');
            originalJsDocDescription = enumTags(docletNode);
            if (desc != null) {
                description = desc.text;
            }
        }
        if (preamble != description) {
            if (preamble.length > 0) {
                description = preamble + '\n' + description;
            }
        }
        var doclet = realMethod.jsDoc != null ? realMethod.jsDoc : '';
        wrappedMethods.push({
            'name': realMethod.name,
            'visibility': visibility,
            'static': staticScope,
            'lineNumber': realMethod.lineNumber,
            'memberOf': realMethod.memberOf,
            'doclet': doclet,
            'args': realMethod.params,
            'description': description,
            'return': realMethod.returnType,
            'classDeclarationFlag': realMethod.ctor,
            'line': realMethod.line,
            'originalJsDocDescription': originalJsDocDescription
        });
    }
    if (incompleteLends != null && incompleteLends.possibleClassName != null) {
        var lendsPath = incompleteLends.value.trim();
        if (lendsPath.charAt(lendsPath.length - 1) === '#') {
            lendsPath = lendsPath.substring(0, lendsPath.length - 1);
            logger.log('removed hash: ' + lendsPath);
            lendsPath += '~' + incompleteLends.possibleClassName;
        } else {
            lendsPath += '~' + incompleteLends.possibleClassName;
        }
        lendsPath += '#';
        logger.log('Added class to @lends: ' + lendsPath);
        newFile = newFile.split(incompleteLends.value).join(lendsPath);
        incompleteLends = null;
    }
    if (spliceInlineConstructor != null) {
        var ctorName = spliceInlineConstructor.name;
        var ctorLine = spliceInlineConstructor.line;
        if (ctorLine.indexOf('(') !== -1) {
            ctorLine = ctorLine.split('(')[0];
        }
        if (newFile.indexOf(ctorLine) !== -1) {
            var where = ctorLine.indexOf(':');
            var fixedCtorLine = ctorLine.substring(0, where + 1);
            fixedCtorLine += ' /** @constructor ' + ctorName + ' */';
            fixedCtorLine += ctorLine.substring(where + 1);
            var ctorSimple = '@constructor ' + ctorName;
            if (newFile.indexOf(ctorSimple) !== -1) {
                newFile = newFile.split(ctorSimple).join('@fixme: do not use the constructor tag unless it precedes directly a constructor function');
            }
        } else {
            logger.log('SPLICE IN CONSTRUCTOR TAG for ' + ctorName);
            logger.log('COULD NOT FIND ' + ctorLine);
        }
        spliceInlineConstructor = null;
    }
    var ngClassName = null;
    if (newFile.indexOf('@module') === -1) {
        var inlineDeps = getInlineRequires(walkerObj);
        walkerObj.inlineDeps = inlineDeps;
        if (walkerObj.NG) {
            ngClassName = capitalize(walkerObj.ngModule);
            var ngHeader = '/**\n * ';
            ngHeader += '@module ' + walkerObj.moduleName + '\n *';
            var ngDeps = walkerObj.ngDeps.concat(inlineDeps);
            for (var ngd = 0; ngd < ngDeps.length; ngd++) {
                var dep = ngDeps[ngd].trim();
                if (dep.length) {
                    ngHeader += ' @requires ' + dep + '\n *';
                }
            }
            ngHeader += '/\n';
            newFile = ngHeader + newFile;
        } else if (walkerObj.NODEJS) {
            var nodeModName = (walkerObj.moduleName);
            var nodeHeader = '/**\n * ';
            nodeHeader += '@module ' + nodeModName + '\n *';
            if (walkerObj.NODE_EXPORTS) {
                nodeHeader += ' @exports ' + walkerObj.NODE_EXPORTS + '\n *';
            }
            var ngDeps = inlineDeps;
            for (var ngd = 0; ngd < ngDeps.length; ngd++) {
                var dep = ngDeps[ngd].trim();
                if (dep.length) {
                    nodeHeader += ' @requires ' + dep + '\n *';
                }
            }
            nodeHeader += '/\n';
            newFile = nodeHeader + newFile;
        } else if (walkerObj.results.amdProc.AMD && YUIDOC_MODE) {
            var nodeModName = (walkerObj.moduleName);
            var nodeHeader = '/**\n * ';
            nodeHeader += '@module ' + nodeModName + '\n *';
            var ngDeps = walkerObj.results.amdProc.requires;
            for (var ngd = 0; ngd < ngDeps.length; ngd++) {
                var dep = ngDeps[ngd].trim();
                if (dep.length) {
                    nodeHeader += ' @requires ' + dep + '\n *';
                }
            }
            nodeHeader += '/\n';
            newFile = nodeHeader + newFile;
        }
    }
    var jsDoccerBlob = {
        'lines': lines.length,
        'requires': [],
        'className': 'n/a',
        'packagePath': '',
        'directoryPath': dir,
        'uses_Y': false,
        'no_lib': true,
        'inferencedClassName': (ngClassName ? ngClassName : 'n/a'),
        'uses_$': false,
        'chars': input.length,
        'uses_YUI': false,
        'uses_NG': walkerObj.NG,
        'fields': [],
        'moduleName': pathAPI.dirname(walkerObj.fileName) + '/' + fileNameMinusExt,
        'uses_console_log': false,
        'uses_backbone': false,
        'classes': allMethods.classes,
        'methods': wrappedMethods,
        'is_module': false,
        'uses_alert': false,
        'uses_y_log': false,
        'requiresRaw': [],
        'basePath': basePath,
        'fileName': fileNameOnly,
        'strict': false
    };
    outputArray.push(JSON.stringify(jsDoccerBlob, null, 2));
    outputArray.push(newFile);
    outputArray.push('');
    logger.log('done ' + walkerObj.name);
    return outputArray.join('\n/*jsdoc_prep_data*/\n');
}
/**
 * This method scans the raw list of esprima comments. Note: some comments
 * should be ignored, so unless we use the same skip test everywhere, the
 * comments offsets could be wrong.
 *
 * @param methodArray
 * @param lineNumber
 * @param ast
 * @param input
 * @return our own method object derived from ast method node
 */
function getMethodOnLine(methodArray, lineNumber, ast, input) {
    for (var m = 0; m < methodArray.length; m++) {
        var method = methodArray[m];
        if (method.comment !== -1) {
            var comment = ast.comments[method.comment];
            var commentBody = input.substring(comment.range[0], comment.range[1]).trim();
            if (commentBody.indexOf('/**') === -1) {
                continue;
            }
            if (comment.type.toLowerCase() === 'line') {
                continue;
            }
            if (lineNumber === comment.lineNumber) {
                method.commentBody = commentBody;
                method.oldComment = comment;
                return method;
            }
        }
        if (lineNumber === method.lineNumber) {
            return method;
        }
    }
    return null;
}
/**
 * Combine physical/logical requires so doclet will print with all.
 *
 * @param doclet
 */
function mergeRequires(doclet) {
    logger.log('mergeRequires');
    var needToMerge = false;
    var allRequires = searchTags(doclet, 'requires');
    if (allRequires == null) {
        allRequires = [];
    }
    var requiresList = doclet.requiresList;
    if (requiresList == null) {
        requiresList = [];
    }
    var diffRequires = getValuesNotInTags(allRequires, requiresList);
    if (diffRequires.length > 0) {
        logger.log(diffRequires);
        logger.log('These require modules were not included: ' + diffRequires.toString());
        var line = 1;
        var lastLine = 1;
        if (allRequires.length > 0) {
            var lastTag = allRequires[allRequires.length - 1];
            line = lastTag.line + 1;
            lastLine = lastTag.lastLine + 1;
            lastTag.text = lastTag.text.trim();
        }
        for (var i = 0; i < diffRequires.length; i++) {
            var diffRequire = diffRequires[i];
            var newTag = {
                tag: 'requires',
                line: line,
                lastLine: lastLine,
                textStartsOnSameLine: true,
                text: diffRequire
            };
            line++;
            lastLine++;
            doclet.tags.push(newTag);
            needToMerge = true;
        }
    }
    return needToMerge;
}
/**
 *
 * @param tagList
 * @param valueList
 * @returns {Array}
 */
function getValuesNotInTags(tagList, valueList) {
    var output = [];
    var textValues = getTextFromTags(tagList);
    for (var i = 0; i < valueList.length; i++) {
        var value = valueList[i];
        var leaf = value;
        if (leaf.indexOf('/') !== -1) {
            leaf = leaf.split('/').pop();
        }
        if (textValues.join(' ').indexOf(leaf) === -1) {
            logger.log('ADDING new REQUIRE: ', value);
            output.push(value);
        }
    }
    return output;
}
/**
 *
 * @param tagList
 * @returns {Array}
 */
function getTextFromTags(tagList) {
    var output = [];
    for (var i = 0; i < tagList.length; i++) {
        output.push(tagList[i].text.trim());
    }
    return output;
}
/**
 *
 * @param doclet
 * @param tagName
 * @returns {object}
 */
function searchAndDestroy(doclet, tagName) {
    if (doclet && doclet.tags) {
        var revised = [];
        for (var t = 0; t < doclet.tags.length; t++) {
            var tag = doclet.tags[t];
            if (tag.tag !== tagName) {
                revised.push(tag);
            }
        }
        doclet.tags = revised;
    }
    return doclet;
}
/**
 * Generate a new comment, or fix an existing one.
 *
 * @param functionWrapper
 * @param ast
 * @param walkerObj
 * @param input
 * @param commentBodyOpt
 * @param statusCheck
 * @returns
 */
function generateComment(functionWrapper, ast, walkerObj, input, commentBodyOpt, statusCheck) {
    var kind = '';
    var type = '';
    if (functionWrapper) {
        if (functionWrapper.kind) {
            kind = functionWrapper.kind;
        }
        if (functionWrapper.type) {
            type = functionWrapper.type;
        }
    }
    var funkyName = '';
    var doclet = {
        params: [],
        returnValue: '',
        tags: []
    };
    var tags = [];
    var oldComment = null;
    if (statusCheck == null) {
        statusCheck = {};
    }
    statusCheck.merge = false;
    if (functionWrapper != null) {
        if (functionWrapper.name.charAt(0) === functionWrapper.name.charAt(0).toUpperCase()) {
            if (input.indexOf(functionWrapper.name + '.prototype') !== -1) {
                //functionWrapper.ctor = true;
                if (functionWrapper.line.trim().indexOf('function ' + functionWrapper.name) === -1) {
                    if (input.indexOf('function ' + functionWrapper.name) === -1) {
                        functionWrapper.ctor = true;
                    }
                } else if (!functionWrapper.ctor) {
                    functionWrapper.ctor = true;
                }
            }
        }
        funkyName = decamelize(functionWrapper.name);
        funkyName = funkyName.split('_');
        funkyName[0] = capitalize(funkyName[0]);
        funkyName = funkyName.join(' ');
        if (funkyName.indexOf('.') !== -1) {
            funkyName = '';
        }
        if (functionWrapper.ctor) {
            if (functionWrapper.name !== 'constructor') {
                funkyName = 'Creates a new instance of class ' + functionWrapper.name + '.';
            }
        }
        if (funkyName.indexOf('[') !== -1) {
            funkyName = '';
        }
        if (functionWrapper.comment !== -1) {
            oldComment = ast.comments[functionWrapper.comment];
            var range = oldComment.range;
            var commentBody = input.substring(range[0], range[1]).trim();
            if (commentBody.indexOf('/**') !== -1) {
                var commentText = commentBody;
                doclet = parseDoclet(walkerObj, commentText, false, '', 0, functionWrapper);
                functionWrapper.oldComment = oldComment;
            }
        }
    } else {
        commentText = commentBodyOpt.commentBody;
        functionWrapper = {};
        doclet = parseDoclet(walkerObj, commentText, false, '', 0, functionWrapper);
        if (mergeRequires(doclet)) {
            statusCheck.merge = true;
        }
    }
    if (doclet != null && doclet.tags) {
        tags = doclet.tags;
        var descText = '';
        if (kind !== '') {
            descText = funkyName;
            if (kind === 'const') {
                kind = 'constant';
            } else if (kind === 'let' || kind === 'var') {
                if (functionWrapper && functionWrapper.type) {
                    kind = 'type';
                    descText = '{' + functionWrapper.type + '}';
                } else {
                    kind = '';
                }
            }
            if (kind !== '') {
                if (!searchTags(doclet, kind)) {
                    var pseudoTag = {
                        'tag': kind,
                        'line': 0,
                        'lastLine': -1,
                        'textStartsOnSameLine': true,
                        'text': descText
                    };
                    tags.push(pseudoTag);
                }
            }
        }
        var ft = '';
        if (doclet.freeText != null) {
            ft = doclet.freeText;
        } else {
            var commentContext = 'normal';
            if (functionWrapper.line.indexOf('function') !== -1 || functionWrapper.type === 'FunctionExpression') {
                commentContext = 'function';
                if (functionWrapper.name.indexOf('is') === 0 || functionWrapper.name.indexOf('has') === 0) {
                    doclet.freeText = 'Returns true if ' + decapitalize(funkyName) + '.';
                    if (functionWrapper.todos && functionWrapper.todos.RETURNWHAT) {
                        delete functionWrapper.todos.RETURNWHAT;
                    }
                    functionWrapper.returnType = 'boolean';
                }
            } else if (functionWrapper.line.indexOf('for (') !== -1) {
                commentContext = 'loop';
                doclet = searchAndDestroy(doclet, 'type');
                functionWrapper.kind = '';
                functionWrapper.type = '';
            } else if (functionWrapper.type === 'ClassDeclaration') {
                doclet.freeText = 'The class ' + functionWrapper.name + '.';
            } else if (functionWrapper.memberOf) {} else {
                doclet.freeText = 'The ' + decapitalize(funkyName) + '.';
            }
        }
    }
    var hasConstructsTag = null;
    var hasConstructorTag = null;
    var hasLendsTag = null;
    var commentBlock = [];
    commentBlock.push('/**');
    if (doclet != null) {
        hasConstructsTag = searchTags(doclet, 'constructs');
        hasConstructorTag = searchTags(doclet, 'constructor');
        hasLendsTag = searchTags(doclet, 'lends');
        //      { todos: [ 'RETURNWHAT' ],
        //  returnType: '?',
        //  type: 'FunctionExpression',
        //  memberOf: 'FooterService.prototype',
        //  realName: 'FooterService.prototype.ready',
        //  longName: 'FooterService.prototype.ready',
        //  ctor: false,
        //  lineNumber: 13,
        //  line: 'FooterService.prototype.ready = function () {',
        //  comment: -1,
        //  range: [ 579, 641 ],
        //  name: 'ready' }
        if (functionWrapper.kind == null) {
            if (YUIDOC_MODE && !hasConstructsTag && !hasConstructorTag && !hasLendsTag && !functionWrapper.ctor) {
                commentBlock.push(' * @method ' + functionWrapper.name);
                if (functionWrapper.memberOf) {
                    commentBlock.push(' * @memberOf ' + functionWrapper.memberOf);
                }
            } else if (functionWrapper.memberOf) {
                //  commentBlock.push(' * @memberOf ' + functionWrapper.memberOf);
            }
        }
        if (doclet.freeText && doclet.freeText != '') {
            var freeText = doclet.freeText.trim();
            freeText = addStarLines(freeText, {});
            commentBlock.push(freeText);
        }
        for (var tIndex = 0; tIndex < tags.length; tIndex++) {
            var newTag = tags[tIndex];
            var t = '@' + newTag.tag;
            if (t !== '@return' && t !== '@param') {
                var tag = doclet[t];
                if (hasConstructsTag === newTag) {
                    var text = hasConstructsTag.text.trim();
                    if (text.indexOf(functionWrapper.name) === -1) {
                        hasConstructsTag.text = text + '~' + functionWrapper.name;
                        if (incompleteLends != null) {
                            incompleteLends.possibleClassName = functionWrapper.name;
                        }
                    }
                }
                if (typeof tag === 'object') {
                    commentBlock.push(' * ' + tag.line);
                } else {
                    var newComment = '';
                    if (newTag.text.trim().length > 0) {
                        var textOfTag = newTag.text.trim();
                        if (textOfTag.indexOf('module:') === 0) {
                            newTag.text = fixModuleNameInText(textOfTag, walkerObj);
                        }
                        newComment = ' * ' + t + ' ' + addStarLines(newTag.text, newTag);
                        commentBlock.push(newComment);
                    } else {
                        newComment = ' * ' + t;
                        commentBlock.push(newComment);
                    }
                }
            }
        }
    } else {
        doclet = {
            params: [],
            returnValue: ''
        };
        logger.warn('Non-tag lines: ' + funkyName);
        if (funkyName.trim().length > 0) {
            commentBlock.push(' * ' + funkyName + '.');
        }
    }
    var params = functionWrapper.params;
    if (params == null) {
        params = [];
    }
    var returnValue = functionWrapper.returnType;
    if (returnValue == null) {
        returnValue = '';
    }
    var ctor = functionWrapper.ctor;
    if (ctor && (incompleteLends != null)) {
        if (incompleteLends.possibleClassName == null) {
            incompleteLends.possibleClassName = functionWrapper.name;
        }
    }
    var moduleName = walkerObj.mappedModuleName;
    if (!moduleName) {
        moduleName = walkerObj.results.amdProc.moduleName;
        if (!moduleName) {
            console.log(walkerObj);
            moduleNameNotFound();
        }
    }
    //console.log(functionWrapper);
    if (ctor && hasConstructorTag == null && hasConstructsTag == null) {
        if (incompleteLends != null && incompleteLends.possibleClassName === functionWrapper.name) {
            var justPath = incompleteLends.value;
            if (justPath.indexOf('module:') !== -1) {
                justPath = justPath.split('module:')[1];
                justPath = justPath.split('#').join('');
                justPath = justPath.trim();
                if (justPath.indexOf(functionWrapper.name) === -1) {
                    justPath += '~' + functionWrapper.name;
                }
                justPath = 'module:' + justPath;
                incompleteLends.fullClassName = justPath;
                logger.log('!!! Add full path to constructor? ' + incompleteLends.fullClassName);
            }
        }
        if (functionWrapper.line.indexOf('constructor: function') !== -1) {
            if (incompleteLends != null && incompleteLends.fullClassName != null) {
                if (walkerObj.namedConstructors[incompleteLends.fullClassName] == null) {
                    functionWrapper.ctorType = '@constructs';
                    walkerObj.namedConstructors[incompleteLends.fullClassName] = functionWrapper;
                    commentBlock.push(' * @constructs ' + incompleteLends.fullClassName);
                    logger.log(' * @constructs ' + incompleteLends.fullClassName);
                }
                incompleteLends.fullClassName = null;
                delete incompleteLends.fullClassName;
            } else {
                var constructsMarkup = ' * @constructs ' + moduleName + '~' + functionWrapper.name;
                if (walkerObj.namedConstructors[moduleName + '~' + functionWrapper.name] == null) {
                    functionWrapper.ctorType = '@constructs';
                    walkerObj.namedConstructors[moduleName + '~' + functionWrapper.name] = functionWrapper;
                    logger.log('ZZZZZZZZZZZ ' + constructsMarkup);
                    commentBlock.push(constructsMarkup);
                }
            }
            spliceInlineConstructor = functionWrapper;
        } else {
            var context = functionWrapper.line;
            if (context.indexOf('=') !== -1) {
                context = context.split('=')[0].trim();
            } else if (context.indexOf(':') !== -1) {
                context = context.split(':')[0].trim();
            } else {
                context = functionWrapper.name;
            }
            logger.log('What is left of this "constructor" ? ' + context, walkerObj.results.amdProc.moduleName);
            if (walkerObj.namedConstructors[moduleName + '~' + context] == null) {
                if (YUIDOC_MODE) {
                    commentBlock.push(' * @class ' + context);
                } else {
                    commentBlock.push(' * @constructor');
                }
                commentBlock.push(' * @memberOf module:' + moduleName);
                functionWrapper.ctorType = '@constructor';
                walkerObj.namedConstructors[moduleName + '~' + context] = functionWrapper;
            } else {
                logger.log('Constructor for ' + moduleName + '~' + context + ' already found.');
            }
        }
    } else if (ctor && (hasConstructorTag != null || hasConstructsTag != null)) {
        functionWrapper.ctorType = '@constructor';
        walkerObj.namedConstructors[moduleName + '~' + functionWrapper.name] = functionWrapper;
    }
    if (type === 'ClassDeclaration') {
        var srcLine = functionWrapper.line;
        if (srcLine.indexOf('extends ') !== -1) {
            srcLine = srcLine.split('extends ')[1];
            srcLine = srcLine.split('{').join('');
            srcLine = srcLine.trim();
            var extendsTags = searchTags(doclet, 'extends');
            if (!extendsTags) {
                commentBlock.push(' * @extends ' + srcLine);
            }
        }
    }
    functionWrapper.doclet = doclet;
    if (functionWrapper.name && functionWrapper.name.charAt(0) === '_') {
        commentBlock.push(' * @private ');
    }
    if (doclet.params.length > 0) {
        for (var index = 0; index < doclet.params.length; index++) {
            var param = doclet.params[index];
            var paramLine = ' * @param';
            if (param.type !== '') {
                paramLine += ' ' + param.type;
            }
            if (param.name !== '') {
                paramLine += ' ' + param.name;
            }
            if (param.description !== '') {
                paramLine += ' ' + param.description;
            }
            commentBlock.push(paramLine);
        }
    } else if (params.length > 0) {
        for (var index = 0; index < params.length; index++) {
            var rawParam = functionWrapper.paramsRaw[index];
            if (rawParam.type === 'RestElement') {
                commentBlock.push(' * @param {...*} ' + params[index]);
            } else {
                commentBlock.push(' * @param ' + params[index]);
            }
        }
    }
    if (doclet['@return'] != null) {
        commentBlock.push(' * ' + doclet['@return'].line.trim());
    } else if (returnValue !== '') {
        if (returnValue !== '?') {
            if (returnValue.indexOf('{') === -1) {
                commentBlock.push(' * @return {object} ' + returnValue);
            } else {
                commentBlock.push(' * @return ' + returnValue);
            }
        }
    }
    // add a simple comment
    if (functionWrapper.comment === -1 && commentBlock.join('\n').indexOf(functionWrapper.name) === -1) {
        commentBlock.push(' * ' + functionWrapper.name);
    }
    if (commentBlock.length === 1) {
        if (COMMENT_EVERYTHING) {
            commentBlock.push(' * @todo Add some jsDoc comments here!');
            commentBlock.push(' */');
            return commentBlock.join('\n');
        } else {
            return '';
        }
    } else {
        var hasConstructor = false;
        if (commentBlock.join(' ').indexOf('@constructor') !== -1) {
            //console.log(commentBlock);
            hasConstructor = true;
        }
        commentBlock.push(' */');
        if (hasConstructor) {
            for (var cb = 0; cb < commentBlock.length; cb++) {
                var cbx = commentBlock[cb];
                if (commentBlock[cb].indexOf('@constant') !== -1) {
                    console.warn('@@@@@@@@@@@@@@@ skipping comment ', commentBlock[cb]);
                    commentBlock[cb] = ' * ';
                } else {
                    commentBlock[cb] = cbx.split('\n * ').join('');
                }
            }
        } else {
            for (var cb = 0; cb < commentBlock.length; cb++) {
                var cbx = commentBlock[cb];
                commentBlock[cb] = cbx.split('\n * ').join('');
            }
        }
        return commentBlock.join('\n');
    }
}

function isAlpha(input) {
    return (input >= 'a' && input <= 'z\uffff') || (input >= 'A' && input <= 'Z\uffff');
}

function isDigit(input) {
    return (input >= '0' && input <= '9');
}
module.exports = {
    'addMissingComments': addMissingComments
};
if (false) {
    var testFileName = 'index.js';
    var input = {
        name: getModuleName(testFileName),
        source: '',
        fileName: testFileName,
        folderPath: 'test-source',
        camelName: camelize(getModuleName(testFileName)),
        results: {
            'amdProc': {
                'requires': [],
                'moduleName': testFileName,
                'AMD': false,
                'webPath': ''
            }
        }
    };
    var source = readFile(input.folderPath + pathAPI.sep + testFileName);
    input.source = source;
    var testResult = addMissingComments(input);
    testResult = testResult.split('/*jsdoc_prep_data*/')[1];
    writeFile('test-output' + pathAPI.sep + testFileName, testResult);
}