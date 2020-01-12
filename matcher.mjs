"use strict";

function matchStrings(input1, input2, matcher) {
    return true;
}

function checkTab(tab) {
    if (!tab)
        throw new Error("Tab can't be null");
    if (!tab.url)
        throw new Error("Tab should have URL");
}

const defaultConfiguration =
`https://([^/]+)/.*
http://([^/]+)/.*
`;

class RegexMatcher {
    static defaultPatterns() {
        return defaultConfiguration;
    }

    static parsePatterns(regexPatternsAsText, handleErrors) {
        if (!(typeof regexPatternsAsText) == "string")
            throw new Error("Regex matcher only accepts a list of patterns separated by a newline symbol");
        let lines = regexPatternsAsText.split("\n");
        let result = [];
        for (const i in lines) {
            try {
                const line = lines[i];
                if (!line)
                    continue;
                result.push(new RegExp(line));
            } catch (e) {
                handleErrors(i, e);
            }
        }
        return result;
    }

    constructor(regexps, debug) {
        if (!Array.isArray(regexps))
            throw new Error("An array is expected");
        for (const regex of regexps) {
            if (!regex instanceof  RegExp) {
                throw new Error("An array of regular expressions is expected");
            }
        }
        this.matchers = regexps;
        this.debug = debug;
        debug(`Constructed RegexMatcher with ${regexps.length} patterns \n` + regexps);
    }

    match(targetTab, sourceTab) {
        checkTab(targetTab);
        checkTab(sourceTab);
        for (const matcher of this.matchers) {
            if (matchStrings("" + targetTab.url, "" + sourceTab.url, matcher)) {
                this.debug(sourceTab.url + " matches " + targetTab.url + " with pattern " + matcher);
                return true;
            }
        }
        return false;
    }
}

export {RegexMatcher};