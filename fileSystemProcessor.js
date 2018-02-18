/**
 * fileSystemProcessor.js.
 *
 * @module file_system_processor
 */
var _fs = require('fs');
var _path = require('path');
var _wrench = require('wrench');
var _minimatch = require('minimatch');
var sfp = require('./singleFileProcessor');
var sys = require('util');
var FILE_ENCODING = 'utf8';
/**
 * Cb.
 *
 * @param resultz
 */
var cb = function (resultz) {
  console.log('ALL DONE');
};
var SCAN_PATH = '';
var outPath = '';
var testPath = '';
var docPath = '';
var resultsPath = '';
var WRITE_NEW_FILES = false;
var processingChain = [];
var stat;
var outputPath = '';
var modules = {};
var allSource = '';
var totalFiles = [];
var modulePaths = {};
var emptyFiles = [];
/**
 * Filter files.
 *
 * @param files
 * @param excludes
 */
function filterFiles(files, excludes) {
  var globOpts = {
    matchBase: true,
    dot: true
  };
  excludes = excludes.map(function (val) {
    return _minimatch.makeRe(val, globOpts);
  });
  files = files.map(function (filePath) {
    return _path.normalize(filePath).replace(/\\/g, '/');
  });
  return files.filter(function (filePath) {
    return !excludes.some(function (glob) {
      return glob.test(filePath);
    });
  });
}
/**
 * Normalize name.
 *
 * @param input
 */
function normalizeName(input) {
  return input.split('_').join('-');
}
/** Next file. */
function nextFile() {
  setTimeout(__nextFile, 50);
}

function __nextFile() {
  var nextPath = queue.shift();
  var basePath = SCAN_PATH;
  var inPath = nextPath;
  sfp.processFile(modulePaths, basePath, inPath, outPath, testPath, docPath,
    processingChain,
    function (result) {
      if (result.corrupted) {
        console.error('HALTED');
        return;
      }
      if (result.EMPTY) {
        emptyFiles.push(result.fileName);
      }
      results.push(result);
      delete result.undoBuffer;
      result.source = result.rawSource;
      delete result.rawSource;
      var resultsPathFile = '';
      if (result.packagePath.length === 0) {
        resultsPathFile = resultsPath + '/' + result.fileName + '.json';
      } else {
        resultsPathFile = resultsPath + '/' + result.packagePath + '/' + result.fileName + '.json';
      }
      var resultsJSON = "{}";
      try {
        result.rewrittenReturnBody = null;
        result.rewrittenReturnBodyNode = null;
        delete result.rewrittenReturnBody;
        delete result.rewrittenReturnBodyNode;
        resultsJSON = JSON.stringify(result, null, 2);
      } catch (jsonError) {
        console.warn(jsonError);
      }
      sfp.writeFile(resultsPathFile, resultsJSON);
      if (queue.length > 0) {
        nextFile();
      } else {
        var now = new Date().getTime() - then;
        console.log('Processed ' + results.length + ' files. Took ' + now / 1000 + ' seconds.');
        if (emptyFiles.length) {
          console.warn('Some script files were EMPTY: \n' + emptyFiles.join('\n'));
        }
        var resultsBlock = {};
        resultsBlock.results = results;
        resultsBlock.path = SCAN_PATH;
        resultsBlock.timeInSeconds = now / 1000;
        resultsBlock.outPath = outPath;
        resultsBlock.testPath = testPath;
        resultsBlock.docPath = docPath;
        resultsBlock.resultsPath = resultsPath;
        sfp.setWriteEnable(true);
        var resultsJSON = '{}';
        try {
          resultsJSON = JSON.stringify(resultsBlock, null, 2);
        } catch (stringifyErr) {
          console.warn(stringifyErr);
        }
        sfp.writeFile(resultsPath + '/jsdoc-prep.json', resultsJSON);
        if (cb != null) {
          cb(resultsBlock);
        }
      }
    }, WRITE_NEW_FILES);
}
var queue = [];
var results = [];
var then = 0;
/**
 * Gets the number of characters in an indentation.
 * @param   {string}   input
 * @returns {number}
 */
function getIndent(input) {
  var temp = input.split('');
  for (var index = 0; index < temp.length; index++) {
    var theChar = temp[index];
    if (theChar !== ' ') {
      return index;
    }
  }
  return -1;
}

function joinLines(input, a, b) {
  return input.slice(a, b).join('\n');
}

function spliceLinesBelow(lines, belowHere, a, b) {
  var result = [];
  var head = lines.slice(0, belowHere + 1);
  var ctorChunk = lines.slice(a, b);
  for (var index = a; index < b; index++) {
    lines[index] = '';
  }
  var tail = lines.slice(belowHere + 1);
  result = result.concat(head);
  result = result.concat(ctorChunk);
  result = result.concat(tail);
  return result.join('\n');
}
/**
 * Safe create file dir.
 *
 * @name safeCreateFileDir
 * @method safeCreateFileDir
 * @param path
 */
function safeCreateFileDir(path) {
  var dir = _path.dirname(path);
  if (!_fs.existsSync(dir)) {
    _wrench.mkdirSyncRecursive(dir);
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
  if (!_fs.existsSync(dir)) {
    _wrench.mkdirSyncRecursive(dir);
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
  filePathName = _path.normalize(filePathName);
  safeCreateFileDir(filePathName);
  _fs.writeFileSync(filePathName, source);
}
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
    output.push(sfp.plugins[procId]);
  }
  return output;
}
/**
 * Run.
 *
 * @param options
 */
function run(options) {
  processingChain = [];
  outputPath = '';
  modules = {};
  allSource = '';
  totalFiles = [];
  queue = [];
  results = [];
  then = 0;
  emptyFiles = [];
  cb = options.callBack;
  modulePaths = options.modulePaths;
  SCAN_PATH = options.scanPath;
  outPath = options.writePath;
  testPath = options.writeTestPath;
  docPath = options.writeDocPath;
  resultsPath = options.writeResultsPath;
  WRITE_NEW_FILES = options.writeEnable;
  processingChain = getProcs(options.processingChain);
  console.log('scanning source directory: ' + SCAN_PATH);
  var files = _wrench.readdirSyncRecursive(SCAN_PATH);
  files = filterFiles(files, ['.*', '.DS_Store',
    /** ,}',. */
    /**
     * ', <br />
     */
  ]);
  files.forEach(function (path) {
    path = _path.normalize(SCAN_PATH + '/' + path);
    stat = _fs.statSync(path);
    if (stat.isFile() && path.indexOf('.js') != -1) {
      if (_path.extname(path) === '.js') {
        queue.push(path);
      }
    } else if (stat.isFile() && _path.extname(path) === '.coffeeXXX') {
      console.log('>>>>>>>>>>>> FOUND COFFEE');
      var coffeeCode = sfp.readFile(path);
      if (coffeeCode.indexOf('#fixed constructor order in class') === -1) {
        var ctorStart = -1;
        var ctorIndent = -1;
        var ctorEnd = -1;
        var currentIndent = -1;
        var topOfClass = -1;
        if (coffeeCode.indexOf('class ') !== -1) {
          var lines = coffeeCode.split('\n');
          var lineNumber = 0;
          for (lineNumber = 0; lineNumber < lines.length; lineNumber++) {
            var line = lines[lineNumber];
            if (line.trim() && line.trim().charAt(0) === '#') {
              continue;
            }
            currentIndent = getIndent(line);
            if (line.trim().indexOf('class ') === 0) {
              console.log('Found Coffee class def: ' + lineNumber);
              topOfClass = lineNumber;
            }
            if (ctorStart > -1) {
              if (currentIndent === ctorIndent || lineNumber === lines.length - 1) {
                ctorEnd = lineNumber;
                console.log('FOUND A CTOR BLOCK: ', ctorStart, ctorEnd);
                break;
              }
            } else if (ctorStart === -1 && line.indexOf('constructor:') !== -1) {
              ctorStart = lineNumber;
              ctorIndent = getIndent(line);
              console.log('FOUND constructor', ctorStart, ctorIndent);
            }
          }
          if (ctorStart > -1 && ctorEnd === -1) {
            if (currentIndent === ctorIndent || lineNumber === lines.length - 1) {
              ctorEnd = lineNumber;
              console.log('FOUND A CTOR BLOCK: ', ctorStart, ctorEnd);
            }
          }
          if (ctorStart > -1 && ctorEnd > -1) {
            console.log('SPLICE NOW');
            coffeeCode = spliceLinesBelow(lines, topOfClass, ctorStart, ctorEnd);
            coffeeCode = '#fixed constructor order in class\n' + coffeeCode;
            writeFile(path, coffeeCode);
          }
        }
      }
    }
  });
  if (queue.length === 0) {
    console.warn('no files found, bailing');
    return;
  }
  then = new Date().getTime();
  nextFile();
}
/**
 * Get plugins.
 *
 * @return {Object}
 */
function getPlugins() {
  var output = {};
  for (var pluginId in sfp.plugins) {
    if (!sfp.plugins.hasOwnProperty(pluginId)) {
      continue;
    }
    if (typeof sfp.plugins[pluginId] === 'function') {
      continue;
    }
    output[pluginId] = {
      id: pluginId,
      type: sfp.plugins[pluginId].type,
      description: sfp.plugins[pluginId].description
    };
  }
  return output;
}
module.exports = {
  'run': run,
  'getPlugins': getPlugins,
  'rimraf': require('rimraf'),
  'getProcs': getProcs
};