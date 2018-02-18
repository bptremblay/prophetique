/**
 * @module js/util
 * @requires underscore
 */
"use strict";
const _ = require('underscore');
/**
 * @param dest
 * @param source
 * merge
 */
function merge(dest, source) {
  return _.extend(dest, source);
}
/**
 * Returns true if is array.
 * @param input
 * @return {Object} boolean
 * isArray
 */
function isArray(input) {
  return input && input.length && input.pop && input.concat;
}
/**
 * Returns true if hash code.
 * @param s
 * @return {Object} boolean
 * hashCode
 */
function hashCode(s) {
  return s.split("").reduce(function (a, b) {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
}
module.exports = {
  merge: merge,
  isArray: isArray
};