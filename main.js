"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) =>
  function __require() {
    return (
      mod ||
        (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod),
      mod.exports
    );
  };
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if ((from && typeof from === "object") || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, {
          get: () => from[key],
          enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable,
        });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (
  (target = mod != null ? __create(__getProtoOf(mod)) : {}),
  __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule
      ? __defProp(target, "default", { value: mod, enumerable: true })
      : target,
    mod
  )
);
var __toCommonJS = (mod) =>
  __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/fuzzysort/fuzzysort.js
var require_fuzzysort = __commonJS({
  "node_modules/fuzzysort/fuzzysort.js"(exports2, module2) {
    ((root, UMD) => {
      if (typeof define === "function" && define.amd) define([], UMD);
      else if (typeof module2 === "object" && module2.exports)
        module2.exports = UMD();
      else root["fuzzysort"] = UMD();
    })(exports2, (_) => {
      "use strict";
      var single = (search, target) => {
        if (!search || !target) return NULL;
        var preparedSearch = getPreparedSearch(search);
        if (!isPrepared(target)) target = getPrepared(target);
        var searchBitflags = preparedSearch.bitflags;
        if ((searchBitflags & target._bitflags) !== searchBitflags) return NULL;
        return algorithm(preparedSearch, target);
      };
      var go = (search, targets, options) => {
        if (!search) return options?.all ? all(targets, options) : noResults;
        var preparedSearch = getPreparedSearch(search);
        var searchBitflags = preparedSearch.bitflags;
        var containsSpace = preparedSearch.containsSpace;
        var threshold = denormalizeScore(options?.threshold || 0);
        var limit = options?.limit || INFINITY;
        var resultsLen = 0;
        var limitedCount = 0;
        var targetsLen = targets.length;
        function push_result(result2) {
          if (resultsLen < limit) {
            q.add(result2);
            ++resultsLen;
          } else {
            ++limitedCount;
            if (result2._score > q.peek()._score) q.replaceTop(result2);
          }
        }
        if (options?.key) {
          var key = options.key;
          for (var i = 0; i < targetsLen; ++i) {
            var obj = targets[i];
            var target = getValue(obj, key);
            if (!target) continue;
            if (!isPrepared(target)) target = getPrepared(target);
            if ((searchBitflags & target._bitflags) !== searchBitflags)
              continue;
            var result = algorithm(preparedSearch, target);
            if (result === NULL) continue;
            if (result._score < threshold) continue;
            result.obj = obj;
            push_result(result);
          }
        } else if (options?.keys) {
          var keys = options.keys;
          var keysLen = keys.length;
          outer: for (var i = 0; i < targetsLen; ++i) {
            var obj = targets[i];
            {
              var keysBitflags = 0;
              for (var keyI = 0; keyI < keysLen; ++keyI) {
                var key = keys[keyI];
                var target = getValue(obj, key);
                if (!target) {
                  tmpTargets[keyI] = noTarget;
                  continue;
                }
                if (!isPrepared(target)) target = getPrepared(target);
                tmpTargets[keyI] = target;
                keysBitflags |= target._bitflags;
              }
              if ((searchBitflags & keysBitflags) !== searchBitflags) continue;
            }
            if (containsSpace)
              for (let i2 = 0; i2 < preparedSearch.spaceSearches.length; i2++)
                keysSpacesBestScores[i2] = NEGATIVE_INFINITY;
            for (var keyI = 0; keyI < keysLen; ++keyI) {
              target = tmpTargets[keyI];
              if (target === noTarget) {
                tmpResults[keyI] = noTarget;
                continue;
              }
              tmpResults[keyI] = algorithm(
                preparedSearch,
                target,
                /*allowSpaces=*/
                false,
                /*allowPartialMatch=*/
                containsSpace
              );
              if (tmpResults[keyI] === NULL) {
                tmpResults[keyI] = noTarget;
                continue;
              }
              if (containsSpace)
                for (
                  let i2 = 0;
                  i2 < preparedSearch.spaceSearches.length;
                  i2++
                ) {
                  if (allowPartialMatchScores[i2] > -1e3) {
                    if (keysSpacesBestScores[i2] > NEGATIVE_INFINITY) {
                      var tmp =
                        (keysSpacesBestScores[i2] +
                          allowPartialMatchScores[i2]) /
                        4;
                      if (tmp > keysSpacesBestScores[i2])
                        keysSpacesBestScores[i2] = tmp;
                    }
                  }
                  if (allowPartialMatchScores[i2] > keysSpacesBestScores[i2])
                    keysSpacesBestScores[i2] = allowPartialMatchScores[i2];
                }
            }
            if (containsSpace) {
              for (let i2 = 0; i2 < preparedSearch.spaceSearches.length; i2++) {
                if (keysSpacesBestScores[i2] === NEGATIVE_INFINITY)
                  continue outer;
              }
            } else {
              var hasAtLeast1Match = false;
              for (let i2 = 0; i2 < keysLen; i2++) {
                if (tmpResults[i2]._score !== NEGATIVE_INFINITY) {
                  hasAtLeast1Match = true;
                  break;
                }
              }
              if (!hasAtLeast1Match) continue;
            }
            var objResults = new KeysResult(keysLen);
            for (let i2 = 0; i2 < keysLen; i2++) {
              objResults[i2] = tmpResults[i2];
            }
            if (containsSpace) {
              var score = 0;
              for (let i2 = 0; i2 < preparedSearch.spaceSearches.length; i2++)
                score += keysSpacesBestScores[i2];
            } else {
              var score = NEGATIVE_INFINITY;
              for (let i2 = 0; i2 < keysLen; i2++) {
                var result = objResults[i2];
                if (result._score > -1e3) {
                  if (score > NEGATIVE_INFINITY) {
                    var tmp = (score + result._score) / 4;
                    if (tmp > score) score = tmp;
                  }
                }
                if (result._score > score) score = result._score;
              }
            }
            objResults.obj = obj;
            objResults._score = score;
            if (options?.scoreFn) {
              score = options.scoreFn(objResults);
              if (!score) continue;
              score = denormalizeScore(score);
              objResults._score = score;
            }
            if (score < threshold) continue;
            push_result(objResults);
          }
        } else {
          for (var i = 0; i < targetsLen; ++i) {
            var target = targets[i];
            if (!target) continue;
            if (!isPrepared(target)) target = getPrepared(target);
            if ((searchBitflags & target._bitflags) !== searchBitflags)
              continue;
            var result = algorithm(preparedSearch, target);
            if (result === NULL) continue;
            if (result._score < threshold) continue;
            push_result(result);
          }
        }
        if (resultsLen === 0) return noResults;
        var results = new Array(resultsLen);
        for (var i = resultsLen - 1; i >= 0; --i) results[i] = q.poll();
        results.total = resultsLen + limitedCount;
        return results;
      };
      var highlight = (result, open = "<b>", close = "</b>") => {
        var callback = typeof open === "function" ? open : void 0;
        var target = result.target;
        var targetLen = target.length;
        var indexes = result.indexes;
        var highlighted = "";
        var matchI = 0;
        var indexesI = 0;
        var opened = false;
        var parts = [];
        for (var i = 0; i < targetLen; ++i) {
          var char = target[i];
          if (indexes[indexesI] === i) {
            ++indexesI;
            if (!opened) {
              opened = true;
              if (callback) {
                parts.push(highlighted);
                highlighted = "";
              } else {
                highlighted += open;
              }
            }
            if (indexesI === indexes.length) {
              if (callback) {
                highlighted += char;
                parts.push(callback(highlighted, matchI++));
                highlighted = "";
                parts.push(target.substr(i + 1));
              } else {
                highlighted += char + close + target.substr(i + 1);
              }
              break;
            }
          } else {
            if (opened) {
              opened = false;
              if (callback) {
                parts.push(callback(highlighted, matchI++));
                highlighted = "";
              } else {
                highlighted += close;
              }
            }
          }
          highlighted += char;
        }
        return callback ? parts : highlighted;
      };
      var prepare = (target) => {
        if (typeof target === "number") target = "" + target;
        else if (typeof target !== "string") target = "";
        var info = prepareLowerInfo(target);
        return new_result(target, {
          _targetLower: info._lower,
          _targetLowerCodes: info.lowerCodes,
          _bitflags: info.bitflags,
        });
      };
      var cleanup = () => {
        preparedCache.clear();
        preparedSearchCache.clear();
      };
      class Result {
        get ["indexes"]() {
          return this._indexes
            .slice(0, this._indexes.len)
            .sort((a, b) => a - b);
        }
        set ["indexes"](indexes) {
          return (this._indexes = indexes);
        }
        ["highlight"](open, close) {
          return highlight(this, open, close);
        }
        get ["score"]() {
          return normalizeScore(this._score);
        }
        set ["score"](score) {
          this._score = denormalizeScore(score);
        }
      }
      class KeysResult extends Array {
        get ["score"]() {
          return normalizeScore(this._score);
        }
        set ["score"](score) {
          this._score = denormalizeScore(score);
        }
      }
      var new_result = (target, options) => {
        const result = new Result();
        result["target"] = target;
        result["obj"] = options.obj ?? NULL;
        result._score = options._score ?? NEGATIVE_INFINITY;
        result._indexes = options._indexes ?? [];
        result._targetLower = options._targetLower ?? "";
        result._targetLowerCodes = options._targetLowerCodes ?? NULL;
        result._nextBeginningIndexes = options._nextBeginningIndexes ?? NULL;
        result._bitflags = options._bitflags ?? 0;
        return result;
      };
      var normalizeScore = (score) => {
        if (score === NEGATIVE_INFINITY) return 0;
        if (score > 1) return score;
        return Math.E ** (((-score + 1) ** 0.04307 - 1) * -2);
      };
      var denormalizeScore = (normalizedScore) => {
        if (normalizedScore === 0) return NEGATIVE_INFINITY;
        if (normalizedScore > 1) return normalizedScore;
        return 1 - Math.pow(Math.log(normalizedScore) / -2 + 1, 1 / 0.04307);
      };
      var prepareSearch = (search) => {
        if (typeof search === "number") search = "" + search;
        else if (typeof search !== "string") search = "";
        search = search.trim();
        var info = prepareLowerInfo(search);
        var spaceSearches = [];
        if (info.containsSpace) {
          var searches = search.split(/\s+/);
          searches = [...new Set(searches)];
          for (var i = 0; i < searches.length; i++) {
            if (searches[i] === "") continue;
            var _info = prepareLowerInfo(searches[i]);
            spaceSearches.push({
              lowerCodes: _info.lowerCodes,
              _lower: searches[i].toLowerCase(),
              containsSpace: false,
            });
          }
        }
        return {
          lowerCodes: info.lowerCodes,
          _lower: info._lower,
          containsSpace: info.containsSpace,
          bitflags: info.bitflags,
          spaceSearches,
        };
      };
      var getPrepared = (target) => {
        if (target.length > 999) return prepare(target);
        var targetPrepared = preparedCache.get(target);
        if (targetPrepared !== void 0) return targetPrepared;
        targetPrepared = prepare(target);
        preparedCache.set(target, targetPrepared);
        return targetPrepared;
      };
      var getPreparedSearch = (search) => {
        if (search.length > 999) return prepareSearch(search);
        var searchPrepared = preparedSearchCache.get(search);
        if (searchPrepared !== void 0) return searchPrepared;
        searchPrepared = prepareSearch(search);
        preparedSearchCache.set(search, searchPrepared);
        return searchPrepared;
      };
      var all = (targets, options) => {
        var results = [];
        results.total = targets.length;
        var limit = options?.limit || INFINITY;
        if (options?.key) {
          for (var i = 0; i < targets.length; i++) {
            var obj = targets[i];
            var target = getValue(obj, options.key);
            if (target == NULL) continue;
            if (!isPrepared(target)) target = getPrepared(target);
            var result = new_result(target.target, {
              _score: target._score,
              obj,
            });
            results.push(result);
            if (results.length >= limit) return results;
          }
        } else if (options?.keys) {
          for (var i = 0; i < targets.length; i++) {
            var obj = targets[i];
            var objResults = new KeysResult(options.keys.length);
            for (var keyI = options.keys.length - 1; keyI >= 0; --keyI) {
              var target = getValue(obj, options.keys[keyI]);
              if (!target) {
                objResults[keyI] = noTarget;
                continue;
              }
              if (!isPrepared(target)) target = getPrepared(target);
              target._score = NEGATIVE_INFINITY;
              target._indexes.len = 0;
              objResults[keyI] = target;
            }
            objResults.obj = obj;
            objResults._score = NEGATIVE_INFINITY;
            results.push(objResults);
            if (results.length >= limit) return results;
          }
        } else {
          for (var i = 0; i < targets.length; i++) {
            var target = targets[i];
            if (target == NULL) continue;
            if (!isPrepared(target)) target = getPrepared(target);
            target._score = NEGATIVE_INFINITY;
            target._indexes.len = 0;
            results.push(target);
            if (results.length >= limit) return results;
          }
        }
        return results;
      };
      var algorithm = (
        preparedSearch,
        prepared,
        allowSpaces = false,
        allowPartialMatch = false
      ) => {
        if (allowSpaces === false && preparedSearch.containsSpace)
          return algorithmSpaces(preparedSearch, prepared, allowPartialMatch);
        var searchLower = preparedSearch._lower;
        var searchLowerCodes = preparedSearch.lowerCodes;
        var searchLowerCode = searchLowerCodes[0];
        var targetLowerCodes = prepared._targetLowerCodes;
        var searchLen = searchLowerCodes.length;
        var targetLen = targetLowerCodes.length;
        var searchI = 0;
        var targetI = 0;
        var matchesSimpleLen = 0;
        for (;;) {
          var isMatch = searchLowerCode === targetLowerCodes[targetI];
          if (isMatch) {
            matchesSimple[matchesSimpleLen++] = targetI;
            ++searchI;
            if (searchI === searchLen) break;
            searchLowerCode = searchLowerCodes[searchI];
          }
          ++targetI;
          if (targetI >= targetLen) return NULL;
        }
        var searchI = 0;
        var successStrict = false;
        var matchesStrictLen = 0;
        var nextBeginningIndexes = prepared._nextBeginningIndexes;
        if (nextBeginningIndexes === NULL)
          nextBeginningIndexes = prepared._nextBeginningIndexes =
            prepareNextBeginningIndexes(prepared.target);
        targetI =
          matchesSimple[0] === 0
            ? 0
            : nextBeginningIndexes[matchesSimple[0] - 1];
        var backtrackCount = 0;
        if (targetI !== targetLen)
          for (;;) {
            if (targetI >= targetLen) {
              if (searchI <= 0) break;
              ++backtrackCount;
              if (backtrackCount > 200) break;
              --searchI;
              var lastMatch = matchesStrict[--matchesStrictLen];
              targetI = nextBeginningIndexes[lastMatch];
            } else {
              var isMatch =
                searchLowerCodes[searchI] === targetLowerCodes[targetI];
              if (isMatch) {
                matchesStrict[matchesStrictLen++] = targetI;
                ++searchI;
                if (searchI === searchLen) {
                  successStrict = true;
                  break;
                }
                ++targetI;
              } else {
                targetI = nextBeginningIndexes[targetI];
              }
            }
          }
        var substringIndex =
          searchLen <= 1
            ? -1
            : prepared._targetLower.indexOf(searchLower, matchesSimple[0]);
        var isSubstring = !!~substringIndex;
        var isSubstringBeginning = !isSubstring
          ? false
          : substringIndex === 0 ||
            prepared._nextBeginningIndexes[substringIndex - 1] ===
              substringIndex;
        if (isSubstring && !isSubstringBeginning) {
          for (
            var i = 0;
            i < nextBeginningIndexes.length;
            i = nextBeginningIndexes[i]
          ) {
            if (i <= substringIndex) continue;
            for (var s = 0; s < searchLen; s++)
              if (searchLowerCodes[s] !== prepared._targetLowerCodes[i + s])
                break;
            if (s === searchLen) {
              substringIndex = i;
              isSubstringBeginning = true;
              break;
            }
          }
        }
        var calculateScore = (matches) => {
          var score2 = 0;
          var extraMatchGroupCount = 0;
          for (var i2 = 1; i2 < searchLen; ++i2) {
            if (matches[i2] - matches[i2 - 1] !== 1) {
              score2 -= matches[i2];
              ++extraMatchGroupCount;
            }
          }
          var unmatchedDistance =
            matches[searchLen - 1] - matches[0] - (searchLen - 1);
          score2 -= (12 + unmatchedDistance) * extraMatchGroupCount;
          if (matches[0] !== 0) score2 -= matches[0] * matches[0] * 0.2;
          if (!successStrict) {
            score2 *= 1e3;
          } else {
            var uniqueBeginningIndexes = 1;
            for (
              var i2 = nextBeginningIndexes[0];
              i2 < targetLen;
              i2 = nextBeginningIndexes[i2]
            )
              ++uniqueBeginningIndexes;
            if (uniqueBeginningIndexes > 24)
              score2 *= (uniqueBeginningIndexes - 24) * 10;
          }
          score2 -= (targetLen - searchLen) / 2;
          if (isSubstring) score2 /= 1 + searchLen * searchLen * 1;
          if (isSubstringBeginning) score2 /= 1 + searchLen * searchLen * 1;
          score2 -= (targetLen - searchLen) / 2;
          return score2;
        };
        if (!successStrict) {
          if (isSubstring)
            for (var i = 0; i < searchLen; ++i)
              matchesSimple[i] = substringIndex + i;
          var matchesBest = matchesSimple;
          var score = calculateScore(matchesBest);
        } else {
          if (isSubstringBeginning) {
            for (var i = 0; i < searchLen; ++i)
              matchesSimple[i] = substringIndex + i;
            var matchesBest = matchesSimple;
            var score = calculateScore(matchesSimple);
          } else {
            var matchesBest = matchesStrict;
            var score = calculateScore(matchesStrict);
          }
        }
        prepared._score = score;
        for (var i = 0; i < searchLen; ++i)
          prepared._indexes[i] = matchesBest[i];
        prepared._indexes.len = searchLen;
        const result = new Result();
        result.target = prepared.target;
        result._score = prepared._score;
        result._indexes = prepared._indexes;
        return result;
      };
      var algorithmSpaces = (preparedSearch, target, allowPartialMatch) => {
        var seen_indexes = /* @__PURE__ */ new Set();
        var score = 0;
        var result = NULL;
        var first_seen_index_last_search = 0;
        var searches = preparedSearch.spaceSearches;
        var searchesLen = searches.length;
        var changeslen = 0;
        var resetNextBeginningIndexes = () => {
          for (let i2 = changeslen - 1; i2 >= 0; i2--)
            target._nextBeginningIndexes[
              nextBeginningIndexesChanges[i2 * 2 + 0]
            ] = nextBeginningIndexesChanges[i2 * 2 + 1];
        };
        var hasAtLeast1Match = false;
        for (var i = 0; i < searchesLen; ++i) {
          allowPartialMatchScores[i] = NEGATIVE_INFINITY;
          var search = searches[i];
          result = algorithm(search, target);
          if (allowPartialMatch) {
            if (result === NULL) continue;
            hasAtLeast1Match = true;
          } else {
            if (result === NULL) {
              resetNextBeginningIndexes();
              return NULL;
            }
          }
          var isTheLastSearch = i === searchesLen - 1;
          if (!isTheLastSearch) {
            var indexes = result._indexes;
            var indexesIsConsecutiveSubstring = true;
            for (let i2 = 0; i2 < indexes.len - 1; i2++) {
              if (indexes[i2 + 1] - indexes[i2] !== 1) {
                indexesIsConsecutiveSubstring = false;
                break;
              }
            }
            if (indexesIsConsecutiveSubstring) {
              var newBeginningIndex = indexes[indexes.len - 1] + 1;
              var toReplace =
                target._nextBeginningIndexes[newBeginningIndex - 1];
              for (let i2 = newBeginningIndex - 1; i2 >= 0; i2--) {
                if (toReplace !== target._nextBeginningIndexes[i2]) break;
                target._nextBeginningIndexes[i2] = newBeginningIndex;
                nextBeginningIndexesChanges[changeslen * 2 + 0] = i2;
                nextBeginningIndexesChanges[changeslen * 2 + 1] = toReplace;
                changeslen++;
              }
            }
          }
          score += result._score / searchesLen;
          allowPartialMatchScores[i] = result._score / searchesLen;
          if (result._indexes[0] < first_seen_index_last_search) {
            score -= (first_seen_index_last_search - result._indexes[0]) * 2;
          }
          first_seen_index_last_search = result._indexes[0];
          for (var j = 0; j < result._indexes.len; ++j)
            seen_indexes.add(result._indexes[j]);
        }
        if (allowPartialMatch && !hasAtLeast1Match) return NULL;
        resetNextBeginningIndexes();
        var allowSpacesResult = algorithm(
          preparedSearch,
          target,
          /*allowSpaces=*/
          true
        );
        if (allowSpacesResult !== NULL && allowSpacesResult._score > score) {
          if (allowPartialMatch) {
            for (var i = 0; i < searchesLen; ++i) {
              allowPartialMatchScores[i] =
                allowSpacesResult._score / searchesLen;
            }
          }
          return allowSpacesResult;
        }
        if (allowPartialMatch) result = target;
        result._score = score;
        var i = 0;
        for (let index of seen_indexes) result._indexes[i++] = index;
        result._indexes.len = i;
        return result;
      };
      var remove_accents = (str) =>
        str
          .replace(/\p{Script=Latin}+/gu, (match) => match.normalize("NFD"))
          .replace(/[\u0300-\u036f]/g, "");
      var prepareLowerInfo = (str) => {
        str = remove_accents(str);
        var strLen = str.length;
        var lower = str.toLowerCase();
        var lowerCodes = [];
        var bitflags = 0;
        var containsSpace = false;
        for (var i = 0; i < strLen; ++i) {
          var lowerCode = (lowerCodes[i] = lower.charCodeAt(i));
          if (lowerCode === 32) {
            containsSpace = true;
            continue;
          }
          var bit =
            lowerCode >= 97 && lowerCode <= 122
              ? lowerCode - 97
              : lowerCode >= 48 && lowerCode <= 57
              ? 26
              : lowerCode <= 127
              ? 30
              : 31;
          bitflags |= 1 << bit;
        }
        return { lowerCodes, bitflags, containsSpace, _lower: lower };
      };
      var prepareBeginningIndexes = (target) => {
        var targetLen = target.length;
        var beginningIndexes = [];
        var beginningIndexesLen = 0;
        var wasUpper = false;
        var wasAlphanum = false;
        for (var i = 0; i < targetLen; ++i) {
          var targetCode = target.charCodeAt(i);
          var isUpper = targetCode >= 65 && targetCode <= 90;
          var isAlphanum =
            isUpper ||
            (targetCode >= 97 && targetCode <= 122) ||
            (targetCode >= 48 && targetCode <= 57);
          var isBeginning =
            (isUpper && !wasUpper) || !wasAlphanum || !isAlphanum;
          wasUpper = isUpper;
          wasAlphanum = isAlphanum;
          if (isBeginning) beginningIndexes[beginningIndexesLen++] = i;
        }
        return beginningIndexes;
      };
      var prepareNextBeginningIndexes = (target) => {
        target = remove_accents(target);
        var targetLen = target.length;
        var beginningIndexes = prepareBeginningIndexes(target);
        var nextBeginningIndexes = [];
        var lastIsBeginning = beginningIndexes[0];
        var lastIsBeginningI = 0;
        for (var i = 0; i < targetLen; ++i) {
          if (lastIsBeginning > i) {
            nextBeginningIndexes[i] = lastIsBeginning;
          } else {
            lastIsBeginning = beginningIndexes[++lastIsBeginningI];
            nextBeginningIndexes[i] =
              lastIsBeginning === void 0 ? targetLen : lastIsBeginning;
          }
        }
        return nextBeginningIndexes;
      };
      var preparedCache = /* @__PURE__ */ new Map();
      var preparedSearchCache = /* @__PURE__ */ new Map();
      var matchesSimple = [];
      var matchesStrict = [];
      var nextBeginningIndexesChanges = [];
      var keysSpacesBestScores = [];
      var allowPartialMatchScores = [];
      var tmpTargets = [];
      var tmpResults = [];
      var getValue = (obj, prop) => {
        var tmp = obj[prop];
        if (tmp !== void 0) return tmp;
        if (typeof prop === "function") return prop(obj);
        var segs = prop;
        if (!Array.isArray(prop)) segs = prop.split(".");
        var len = segs.length;
        var i = -1;
        while (obj && ++i < len) obj = obj[segs[i]];
        return obj;
      };
      var isPrepared = (x) => {
        return typeof x === "object" && typeof x._bitflags === "number";
      };
      var INFINITY = Infinity;
      var NEGATIVE_INFINITY = -INFINITY;
      var noResults = [];
      noResults.total = 0;
      var NULL = null;
      var noTarget = prepare("");
      var fastpriorityqueue = (r) => {
        var e = [],
          o = 0,
          a = {},
          v = (r2) => {
            for (var a2 = 0, v2 = e[a2], c = 1; c < o; ) {
              var s = c + 1;
              (a2 = c),
                s < o && e[s]._score < e[c]._score && (a2 = s),
                (e[(a2 - 1) >> 1] = e[a2]),
                (c = 1 + (a2 << 1));
            }
            for (
              var f = (a2 - 1) >> 1;
              a2 > 0 && v2._score < e[f]._score;
              f = ((a2 = f) - 1) >> 1
            )
              e[a2] = e[f];
            e[a2] = v2;
          };
        return (
          (a.add = (r2) => {
            var a2 = o;
            e[o++] = r2;
            for (
              var v2 = (a2 - 1) >> 1;
              a2 > 0 && r2._score < e[v2]._score;
              v2 = ((a2 = v2) - 1) >> 1
            )
              e[a2] = e[v2];
            e[a2] = r2;
          }),
          (a.poll = (r2) => {
            if (0 !== o) {
              var a2 = e[0];
              return (e[0] = e[--o]), v(), a2;
            }
          }),
          (a.peek = (r2) => {
            if (0 !== o) return e[0];
          }),
          (a.replaceTop = (r2) => {
            (e[0] = r2), v();
          }),
          a
        );
      };
      var q = fastpriorityqueue();
      return { single: single, go: go, prepare: prepare, cleanup: cleanup };
    });
  },
});

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => QueercodePlugin,
});
module.exports = __toCommonJS(main_exports);
var import_obsidian3 = require("obsidian");

// settings.ts
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  filetypePreference: "svg",
};
var QueercodeSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Queercode Settings" });
    new import_obsidian.Setting(containerEl)
      .setName("Preferred emoji filetype")
      .setDesc("Choose which file type to use when both SVG and PNG exist.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("svg", "SVG (recommended)")
          .addOption("png", "PNG")
          .addOption("auto", "Auto-detect (prefer SVG, fallback to PNG)")
          .setValue(this.plugin.settings.filetypePreference)
          .onChange(async (value) => {
            this.plugin.settings.filetypePreference = value;
            await this.plugin.saveSettings();
          })
      );
  }
};

// suggest.ts
var import_obsidian2 = require("obsidian");
var import_fuzzysort = __toESM(require_fuzzysort());
var EmojiSuggest = class extends import_obsidian2.EditorSuggest {
  constructor(app, plugin, emojiMap, availableEmojiFiles) {
    super(app);
    this.emojiContext = null;
    this.plugin = plugin;
    this.emojiMap = emojiMap;
    this.availableEmojiFiles = availableEmojiFiles;
  }
  onTrigger(cursor, editor, file) {
    const line = editor.getLine(cursor.line);
    const match = line.substring(0, cursor.ch).match(/(?:^|\s)(:\w*)$/);
    if (!match) return null;
    const triggerStart = cursor.ch - match[1].length;
    this.emojiContext = {
      editor,
      start: { line: cursor.line, ch: triggerStart },
      end: cursor,
    };
    return {
      start: this.emojiContext.start,
      end: this.emojiContext.end,
      query: match[1],
    };
  }
  getSuggestions(context) {
    const query = context.query.toLowerCase();
    const emojiShortcodes = Object.keys(this.emojiMap);
    const filteredShortcodes = emojiShortcodes.filter((shortcode) =>
      this.availableEmojiFiles.has(this.emojiMap[shortcode])
    );
    const results = import_fuzzysort.default.go(query, filteredShortcodes, {
      limit: 20,
    });
    return results.map((res) => ({
      shortcode: res.target,
      file: this.emojiMap[res.target],
    }));
  }
  renderSuggestion(entry, el) {
    el.addClass("emoji-suggest-item");
    const img = document.createElement("img");
    img.src = this.plugin.app.vault.adapter.getResourcePath(
      `${this.plugin.manifest.dir}/emoji/${entry.file}`
    );
    img.className = "queercode-emoji";
    el.appendChild(img);
    const span = document.createElement("span");
    span.textContent = ` ${entry.shortcode}`;
    el.appendChild(span);
  }
  selectSuggestion(entry) {
    if (!this.emojiContext) return;
    const { editor, start, end } = this.emojiContext;
    editor.replaceRange(entry.shortcode, start, end);
    this.emojiContext = null;
  }
};

// main.ts
var QueercodePlugin = class extends import_obsidian3.Plugin {
  async onload() {
    console.log("Queercode plugin loaded");
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.addSettingTab(new QueercodeSettingTab(this.app, this));
    const emojiMap = await this.loadEmojiMap();
    const emojiFolder = `${this.manifest.dir}/emoji`;
    const files = await this.app.vault.adapter.list(emojiFolder);
    const availableEmojiFiles = new Set(
      files.files.map((f) => f.split("/").pop())
    );
    const emojiSuggest = new EmojiSuggest(
      this.app,
      this,
      emojiMap,
      availableEmojiFiles
    );
    this.registerEditorSuggest(emojiSuggest);
    const shortcodeRegex = new RegExp(
      Object.keys(emojiMap)
        .map((k) => k.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"))
        .join("|"),
      "g"
    );
    this.registerMarkdownPostProcessor(async (el, ctx) => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          if (!node.parentElement) return NodeFilter.FILTER_REJECT;
          const forbidden = ["CODE", "PRE", "A", "STYLE"];
          let current2 = node.parentElement;
          while (current2 !== null) {
            if (forbidden.includes(current2.tagName)) {
              return NodeFilter.FILTER_REJECT;
            }
            current2 = current2.parentElement;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
        // Accept nodes allowed for emoji replacement
      });
      const targets = [];
      let current = walker.nextNode();
      while (current) {
        if (shortcodeRegex.test(current.nodeValue || "")) {
          targets.push(current);
        }
        current = walker.nextNode();
      }
      for (const node of targets) {
        const parent = node.parentNode;
        if (!parent) continue;
        const parts = (node.nodeValue || "").split(shortcodeRegex);
        const matches = (node.nodeValue || "").match(shortcodeRegex) || [];
        const frag = document.createDocumentFragment();
        for (let i = 0; i < parts.length; i++) {
          if (parts[i]) frag.appendChild(document.createTextNode(parts[i]));
          if (matches[i]) {
            let readableLabel2 = function (shortcode) {
              return shortcode
                .replace(/^:/, "")
                .replace(/_+/g, " ")
                .replace(/:$/, "")
                .replace(/\b\w/g, (c) => c.toUpperCase());
            };
            var readableLabel = readableLabel2;
            const url = emojiMap[matches[i]];
            if (!url || (!url.endsWith(".png") && !url.endsWith(".svg"))) {
              console.warn(
                `Skipping emoji: ${matches[i]} (bad or unsupported file: ${url})`
              );
              continue;
            }
            const label = readableLabel2(matches[i]);
            const img = document.createElement("img");
            img.src = this.app.vault.adapter.getResourcePath(
              `${this.manifest.dir}/emoji/${url}`
            );
            img.alt = label;
            img.title = matches[i];
            img.setAttribute("aria-label", label);
            img.setAttribute("role", "img");
            img.className = "queercode-emoji";
            img.onerror = () => {
              img.replaceWith(document.createTextNode(matches[i]));
            };
            frag.appendChild(img);
          }
        }
        try {
          parent.replaceChild(frag, node);
        } catch (e) {
          console.warn("Queercode DOM replace failed", e);
        }
      }
    });
  }
  // Load emoji mapping JSON file from plugin directory
  async loadEmojiMap() {
    try {
      const file = await this.app.vault.adapter.read(
        `${this.manifest.dir}/emoji-map.json`
      );
      return JSON.parse(file);
    } catch (e) {
      if (e instanceof SyntaxError) {
        console.warn(
          "emoji-map.json contains invalid JSON. Please fix or regenerate the file.",
          e
        );
      } else {
        console.warn(
          "Could not load emoji-map.json (file missing or unreadable).",
          e
        );
      }
      return {};
    }
  }
  // Save plugin settings
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
