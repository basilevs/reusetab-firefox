"use strict";

import { RegexMatcher } from "./matcher.mjs";

const storage = browser.storage;
const sync = storage.sync;
if (!sync)
    throw new Error("Storage is not available");

function debug(...args) {
    //console.debug(...args);
}

function functionEntry(functionName, ...args) {
    debug("Entered function: ", functionName, ...args);
}

function onError(error) {
    console.error(error);
}


async function loadPatterns() {
    functionEntry("loadPatterns");
    let result = RegexMatcher.defaultPatterns();
    if (!result)
        throw new Error("No default patterns found");
    const data = await sync.get("patterns");
    debug("Storage now: ", data);
    if (data && data.patterns) {
        result = data.patterns;
    }
    debug("Resolved current patterns:", result);
    if (!result instanceof Array)
        throw new Error("Array of strings is expected");
    return result;
}

async function addPattern(...patterns) {
    functionEntry("addPattern", ...patterns);
    for (let pattern of patterns) {
        const error = RegexMatcher.validatePattern(pattern);
        if (error)
            throw new Error(`Pattern ${pattern} is invalid: ${error}`);
    }
    const stored = await loadPatterns();
    debug("old pattern set: ", ...stored);
    for (let pattern of patterns) {
        stored.unshift(pattern);
    }
    if (!stored instanceof Array)
        throw new Error("Array of strings is expected");
    debug("new pattern set: ", ...stored);
    await sync.set({
        "patterns": stored
    });
}

function wrapErrors(asyncFunction) {
    function wrapper(...args) {
        try {
            Promise.resolve(asyncFunction(...args)).catch(onError);
        } catch (e) {
            onError(e);
        }
    }
    return wrapper;
}

function installValidator(input, validityConsumer, validate) {
    if (!input)
        throw new Error("null input");
    if (!validityConsumer)
        throw new Error("null button");
    if (!validate)
        throw new Error("null validate");
    const form = input.closest("form");
    if (!form)
        throw new Error("Can't find form");
    function report(value, result) {
        debug("Validating ", value, ":", result);
        input.setCustomValidity(result);
        validityConsumer(!result);
    }
    function check() {
        const value = input.value;
        Promise.resolve(validate(value))
            .then(e => {
                report(value, e);
            })
            .catch(e => {
                report(value, e);
                onError(e);
            });
    }
    input.addEventListener("input", check);
    form.addEventListener("reset", () => {
      debug("Form reset");
      input.setCustomValidity("");
      validityConsumer(false);
    });
}

function installAddingSubmitter(button, newPatternsProvider) {
    const form = button.closest("form");
    if (!form)
        throw new Error("Can't find form");

    button.addEventListener("click", wrapErrors(async () => {
        const patterns = await newPatternsProvider();
        await addPattern(patterns);
        form.reset();
    }));
}

function checkURL(string) {
    try {
        new URL(string)
    } catch (e) {
        return e.message;
    }
    return "";
}

{
    const form = document.querySelector('form#blacklist_form');
    const blacklist_text = form.querySelector("input");
    const blacklist = form.querySelector("button");
    installValidator(blacklist_text,
        isValid => blacklist.disabled = !isValid,
        value => {
            return checkURL(value);
        });
    installAddingSubmitter(blacklist, async () => {
        let choice = blacklist_text.value;
        choice = choice.replace(/[.]/g, "\\.");
        return [choice + "(.*)"];
    });
}


{
    const form = document.querySelector('form#multidomain_form');
    const multidomain_text = form.querySelector("textarea");
    const apply_multidomain = form.querySelector("button");

    function uniq(array) {
        array = array.filter(s => !!s);
        array = Array.from(new Set(array));
        return array;
    }
    installValidator(multidomain_text,
        isValid => apply_multidomain.disabled = !isValid,
        value => {
            let array = value.split("\n");
            array = uniq(array);
            for (const url of array) {
                const e = checkURL(url);
                if (e) {
                    return e;
                }
            }
            if (array.length < 2) {
                return "Add another URL";
            }
            return "";
        });
    installAddingSubmitter(apply_multidomain, async () => {
        let choice = multidomain_text.value.split("\n");
        choice = uniq(choice);
        choice = choice.join("|");
        choice = choice.replace(/[.]/g, "\\.");
        return [`(?:${choice}).*`];
    });
}

{
    const form = document.querySelector('form#patterns_form');
    const matchingPatternsText = form.querySelector('textarea#regular_expressions_text');
    if (!matchingPatternsText)
        throw new Error("Patterns textarea is not found");

    function fireInputEvent(input) {
        const event = input.ownerDocument.createEvent("Event");
        event.initEvent("input", true, true);
        event.synthetic = true;
        input.dispatchEvent(event);
    }

    async function setPatterns(data) {
        debug("Resetting patterns", data);
        if (!data)
            throw new Error("Empty argument");
        matchingPatternsText.value = data.join("\n");
        fireInputEvent(matchingPatternsText);
    }

    async function restore() {
        await setPatterns(await loadPatterns());
    }
    installValidator(matchingPatternsText, () => { }, async value => {
        let result = [];
        RegexMatcher.parsePatterns(value, (lineNumber, error, pattern) => {
            result.push(`Line ${lineNumber}: ${pattern} : ${error.message}`);
        });
        return result.join("\n");
    });
    form.querySelector("#save").addEventListener("click", wrapErrors(async event => {
        debug("Saving", event, matchingPatternsText.value);
        await sync.set({
            "patterns": matchingPatternsText.value.split("\n")
        });
    }));
    form.querySelector("#default").addEventListener("click", wrapErrors(async event => {
        debug("Form set to default", event, matchingPatternsText.value);
        await setPatterns(RegexMatcher.defaultPatterns());
    }));
    form.querySelector("#restore").addEventListener("click", wrapErrors(restore));
    const storageListener = wrapErrors(async (changes, areaName) => {
        if (areaName !== "sync")
            return;
        if (changes.patterns) {
            await restore();
        }
    });
    const onChanged = storage.onChanged;
    onChanged.addListener(storageListener);
    // If listeners are not cleaned up, exception occurs on page refresh:
    // sendRemoveListener on closed conduit jid1-K8e1vROHVMoXWQ@jetpack.274877907499
    window.addEventListener("unload", () => onChanged.removeListener(storageListener));

    restore().catch(onError);
}
