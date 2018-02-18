/**
 * @module js/files
 * @requires util
 * @requires fs
 * @requires path
 */
"use strict";
/**
 * The sys.
 */
const sys = require('util');
/**
 * The fs.
 * @private 
 * _fs
 */
const _fs = require('fs');
/**
 * The path.
 * @private 
 * _path
 */
const _path = require('path');
/**
 * The write enabled.
 * @type {Boolean}
 * WRITE_ENABLED
 */
const WRITE_ENABLED = true;
/**
 * The file encoding.
 * @type {String}
 * FILE_ENCODING
 */
const FILE_ENCODING = 'utf8';
/**
 * Read file.
 * @param {String}  
 * @return {String}
 */
function readFile(filePathName) {
  /**
   * The file encoding.
   * @type {String}
   * FILE_ENCODING
   */
  const FILE_ENCODING = 'utf8';
  filePathName = _path.normalize(filePathName);
  /**
   * The source.
   * @type {String}
   */
  let source = '';
  try {
    source = _fs.readFileSync(filePathName, FILE_ENCODING);
  } catch (er) {}
  return source;
}
/**
 * @param path
 * safeCreateFileDir
 */
function safeCreateFileDir(path) {
  if (!WRITE_ENABLED) {
    return;
  }
  /**
   * The dir.
   */
  const dir = _path.dirname(path);
  if (!_fs.existsSync(dir)) {
    _wrench.mkdirSyncRecursive(dir);
  }
}
/**
 * Safe create dir.
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
module.exports = {
  readFile: readFile,
  writeFile: writeFile
};