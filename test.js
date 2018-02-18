var path = require('path');
var fs = require('fs');
var util = require('./util');
var files = require('./files');
var rimraf = require('rimraf');
var json2csv = require('json2csv');

function main() {
    console.log('main');

    var raw = files.readFile('./js/gensimple.js');
    var vocab = files.readFile('./hypertalk/VOCAB.TXT');

    var wordBanks = {};
    var wordGroups = [];
    var splitUp = vocab.split(',');
    var index;
    for (index = 0; index < splitUp.length; index++) {
        var list = splitUp[index];
        list = list.split('\n');
        wordGroups.push(list);
    }

    files.writeFile('./wordGroups.json', JSON.stringify(wordGroups, null, 2));

    var kinds = [];
    kinds.push('1 - subj w/o articles');
    kinds.push('2 - subj w/articles');
    kinds.push('3 - sing V');
    kinds.push('4 - plur V');
    kinds.push('5 - adv');
    kinds.push('6 - conj');
    kinds.push('7 - indir');
    kinds.push('8 - obj w/o articles');
    kinds.push('9 - adj');
    kinds.push('10- obj w/articles');
    kinds.push('11- prep');
    kinds.push('12- prePhrase');

    for (index = 0; index < kinds.length; index++) {
        var kind = kinds[index];
        wordBanks[kind] = wordGroups[index];
    }

    files.writeFile('./wordBanks.json', JSON.stringify(wordBanks, null, 2));

    // process hypertalk

    function resolveChunk(expression) {
        var output = '';
        return output;
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

    function resolveChunks(words, put, whatToPut) {
        if (words.length === 1) {
            return words[0];
        }
        //console.log('resolveChunks: ', words);
        var output = '';
        var typeChunk = words.shift();
        var type = capitalize(typeChunk);
        var index = words.shift();
        var next = words.shift();

        if (next === 'of') {
            var resolved = resolveChunks(words);
            if (type === 'Char' || type === 'Word' || type === 'Line' || type === 'Item') {
                if (put) {
                    output = 'put' + type + '(' + resolved + ',' + index + ',' + whatToPut + ')';
                } else {
                    output = 'get' + type + '(' + resolved + ',' + index + ')';
                }
            } else {
                console.warn('resolveChunks found non-chunk', typeChunk);
                // resolve until you find a chunk: numToChar(charToNum(char
            }
        } else {
            // console.warn('Warning: resolveChunks found irregular structure:', words.join(' '));
        }
        return output;
    }

    function processChunkExpressions(input) {
        var output = {};
        input = input.trim();
        var words = input.split(' ');
        var container = [];
        var expression = [];
        var expressionValue;
        var sourceValue = '';
        var op;

        if (words[0] === 'put') {
            var index;
            var foundExpression = false;
            for (index = 1; index < words.length; index++) {
                var word = words[index];
                if (word === 'into' || word === 'before' || word === 'after') {
                    op = word;
                    //console.log('Expression: ', expression);
                    sourceValue = '(' + expression.join(' ').trim() + ')';
                    expressionValue = resolveChunks(expression);
                    foundExpression = true;
                } else {
                    if (!foundExpression) {
                        expression.push(word);
                    } else {
                        container.push(word);
                    }
                }
            }
            //console.log('Container: ', container);

            if (container.length === 0) {
                console.warn('Warning in processChunkExpressions: no real container');
                return null;
            } else if (container.length > 1) {
                console.warn('Warning in processChunkExpressions: container is a chunk expression!!!! >>>', container);
                var containerExpressionValue = resolveChunks(container, true, expressionValue);
                console.log('>>> ', containerExpressionValue);
                //throw (new Error('Yow!'));
                return null;
            }
            //console.log(container[0], '=', expressionValue);
            output.op = op;
            output.container = container[0];
            output.expressionValue = expressionValue;
            var opOperator = ' = ';
            if (op === 'after') {
                opOperator = ' += '
            } else if (op === 'before') {
                opOperator = ' = ' + container[0] + ' + ';
            }
            if (expressionValue.trim().length === 0) {
                //sexpressionValue = expression.join(' ').trim();
                //console.log('NEED source VALUE FOR chunk operator', sourceValue);
                expressionValue = sourceValue;
            }
            output.grammar = container[0] + opOperator + expressionValue;
        } else {
            //console.warn('Warning: processChunkExpressions needs a line beginning with put!');
            return null;
        }

        return output;
    }

    //var sample = 'put char 1 of word 2 of line 3 of input into output';

    //console.log(sample);

    //console.log(processChunkExpressions(sample));

    function fixOperators(input) {
        return input.split('<>').join(' !== ').split(' is ').join(' === ').split(' = ').join(' === ').split(' & ').join(' + ').split(' or ').join(' || ').split(' and ').join(' && ');
    }
    raw = raw.split('--').join('//');
    raw = raw.split(' & ').join(' + ');
    raw = raw.split(' && ').join(" + ' ' + ");
    raw = raw.split('empty').join("''");
    raw = raw.split('exit repeat').join('// ORIGINAL: exit repeat\nbreak;\n');
    var lines = raw.split('\n');
    var definedVars = {};
    var currentFunctionName = '';
    for (index = 0; index < lines.length; index++) {
        var line = lines[index];

        var newLine = [];
        if (line.trim().indexOf('//') === 0) {
            continue;
        }
        if (line.trim().indexOf('function') === 0) {
            newLine.push('// ORIGINAL: //' + line);
            definedVars = {};
            var words = line.split(' ');
            var counter;
            var functionName = words[1];
            currentFunctionName = functionName;
            console.log('FOUND A FUNCTION', functionName);
            var params = [];
            for (counter = 2; counter < words.length; counter++) {
                var param = words[counter];
                param = param.split(',').join('');
                console.log('param', param);
                definedVars[param] = true;
                params.push(param.trim());
            }
            // parse line and define any vars passed as params

            newLine.push('function ' + functionName + '(' + params.join(',') + '){');
            lines[index] = newLine.join('\n');

            continue;
        }


        // the pernicous one-liner
        if (line.trim().indexOf('if') === 0 && line.indexOf(' then') !== -1) {
            line = fixOperators(line);
            var check = line.split(' then');
            if (check[1].trim().length > 0) {
                console.log('ONE-LINER');
                newLine.push('// ORIGINAL: //' + line);
                line = 'if (' + line.trim().substr(3);
                line = line.split(' then').join(') {') + '}';
                newLine.push(line);
                lines[index] = newLine.join('\n');
                console.log('ONE-LINER', newLine.join('\n'));
            } else {
                newLine.push('// ORIGINAL: //' + line);
                line = line.split(' then').join('');
                line = 'if (' + line.trim().substr(3) + ') {';

                newLine.push(line);
                lines[index] = newLine.join('\n');
            }
            continue;
        }


        if (line.trim().indexOf('if') === 0) {
            line = fixOperators(line);
            newLine.push('// ORIGINAL: //' + line);
            line = 'if (' + line.trim().substr(3) + ') ';
            newLine.push(line);
            lines[index] = newLine.join('\n');
            continue;
        }

        if (line.trim().indexOf('then') === 0) {
            newLine.push('// ORIGINAL: //' + line);
            newLine.push(line.split('then').join('{'));
            lines[index] = newLine.join('\n');
            continue;
        }

        if (line.trim().indexOf('else') === 0) {
            newLine.push('// ORIGINAL: //' + line);
            newLine.push('} else {');
            lines[index] = newLine.join('\n');
            continue;
        }

        if (line.trim().indexOf('end if') === 0) {
            newLine.push('// ORIGINAL: //' + line);
            newLine.push('\n}');
            lines[index] = newLine.join('\n');
            continue;
        }

        if (line.trim().indexOf('repeat') === 0) {
            newLine.push('// ORIGINAL: //' + line);
            newLine.push('while(true) {');
            lines[index] = newLine.join('\n');
            continue;
        }



        if (line.trim().indexOf('end repeat') === 0) {
            newLine.push('// ORIGINAL: //' + line);
            newLine.push('\n}');
            lines[index] = newLine.join('\n');
            continue;
        }

        if (line.trim().indexOf('end ') === 0) {
            newLine.push('// ORIGINAL: //' + line);
            newLine.push('}');
            lines[index] = newLine.join('\n');
            currentFunctionName = '';
            continue;
        }
        var proc = processChunkExpressions(line);
        if (proc) {
            newLine.push('// ORIGINAL: //' + line);
            if (!definedVars[proc.container]) {
                //console.log('var', proc.container);
                newLine.push('var ' + proc.container + ';');
            }
            definedVars[proc.container] = index;
            //console.log(proc.grammar);
            newLine.push(proc.grammar + ';');
            //console.log(newLine.join('\n'));
            lines[index] = newLine.join('\n');
        }
    }

    files.writeFile('./output.js', lines.join('\n'));

    console.log('done');
}

main();
