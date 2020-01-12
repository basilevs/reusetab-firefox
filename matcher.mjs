"use strict";

function areArraysEqual(array1, array2) {
    return array1.length === array2.length && array1.every((value, index) => value === array2[index]);
}

function checkTab(tab) {
    if (!tab)
        throw new Error("Tab can't be null");
    if (!tab.url)
        throw new Error("Tab should have URL");
}

const defaultConfiguration =
`https://(?:www.spotify.com|www.open.spotify.com)/.*
https://www.google.com/maps.*
https://([^/]+)/.*
http://([^/]+)/.*
`;

class RegexMatcher {
    static defaultPatterns() {
        return defaultConfiguration;
    }

    static parsePatterns(regexPatternsAsText, handleErrors) {
        if (typeof regexPatternsAsText !== "string")
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
        const input1 = "" + targetTab.url;
        const input2 = "" + sourceTab.url;
        for (const matcher of this.matchers) {
            this.debug("Matching", input1, input2, "with matcher", matcher);
            const match1 = matcher.exec(input1);
            const match2 = matcher.exec(input2);
            if (match1 || match2) {
                this.debug("Match!", match1, match2);

                if (!match1)
                    return false;
                if (!match2)
                    return false;

                match1.shift();
                match2.shift();


                return areArraysEqual(match1, match2);
            }
        }
        return false;
    }
}

export {RegexMatcher};