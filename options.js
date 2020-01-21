const storage = browser.storage;
const sync = storage.sync;
if (!sync)
    throw new Error("Storage is not available");

const backgroundPage = browser.runtime.getBackgroundPage();
const defaultPatternsPromise = backgroundPage.then(x => x.defaultPatterns);

function debug() {
    console.debug.apply(console, arguments);
}

function onError(error) {
    console.error(error);
}

async function loadPatterns() {
    let result = await defaultPatternsPromise;
    if (!result)
        throw new Error("No default patterns found");
    const data = await sync.get("patterns");
    if (data && data.patterns) {
        result = data.patterns;
    }
    if (!result instanceof Array)
        throw new Error("Array of strings is expected");
    return result;
}

async function addPattern(...patterns) {
    const stored = await loadPatterns();
    for (let pattern of patterns) {
        stored.unshift(pattern);
    }
    if (!stored instanceof Array)
        throw new Error("Array of strings is expected");
    await sync.set({
        "patterns": stored
    });
}

function wrapErrors(asyncFunction) {
    function wrapper(...args) {
        asyncFunction(...args).catch(onError);
    }

    return wrapper;
}

function disableIfInvalid(input, button) {
    if (!button)
        throw new Error("Button is null");
    if (!input.validity)
        throw new Error("Input does not support validation");
    input.addEventListener("input", () => {
        button.disabled = !input.validity.valid;
    });
}

{
    const form = document.querySelector('form#blacklist_form');
    const blacklist_text = form.querySelector("input");
    const blacklist = form.querySelector("button");
    disableIfInvalid(blacklist_text, blacklist);
    blacklist.addEventListener("click", wrapErrors(async () => {
        if (!blacklist_text.validity.valid)
            return;
        let choice = blacklist_text.value;
        choice = choice.replace(/[.]/g, "\\.");
        await addPattern(".*" + choice + "(.*)");
    }));
}


{
    const site_match = /(?:[^\][)(]+\.)+\w+/;
    const form = document.querySelector('form#multidomain_form');
    const multidomain_text = form.querySelector("textarea");
    const apply_multidomain = form.querySelector("button");
    disableIfInvalid(multidomain_text, apply_multidomain);
    multidomain_text.addEventListener("input", () => {
        let array = multidomain_text.value.split("\n");
        array = array.filter(s => !!s);
        let error = "";
        if (!array.every( line => site_match.test(line) )) {
            error = "Only sites are allowed";
        } else {
            if (array.length < 2) {
                error = "Add another site";
            }
        }
        multidomain_text.setCustomValidity(error);
    });
    apply_multidomain.addEventListener("click", wrapErrors(async () => {
        let choice = multidomain_text.value.split("\n");
        choice = choice.filter(s => !!s);
        choice = choice.join("|");
        choice = choice.replace(/[.]/g, "\\.");
        await addPattern(`https://(?:${choice})/.*`, `http://(?:${choice})/.*`);
        multidomain_text.value = "";
        apply_multidomain.disabled = true;
    }));
}

{
    const form = document.querySelector('form#patterns_form');
    const matchingPatternsText = form.querySelector('textarea#regular_expressions_text');
    if (!matchingPatternsText)
        throw new Error("Patterns textarea is not found");

    async function setPatterns(data) {
        debug("Resetting patterns", data);
        if (!data)
            throw new Error("Empty argument");
        matchingPatternsText.value = data.join("\n");
    }

    async function restore() {
        await setPatterns(await loadPatterns());
    }


    form.querySelector("#save").addEventListener("click", wrapErrors(async event => {
        debug("Saving", event, matchingPatternsText.value);
        await sync.set({
            "patterns": matchingPatternsText.value.split("\n")
        });
    }));
    form.querySelector("#default").addEventListener("click", wrapErrors(async event => {
        debug("Form set to default", event, matchingPatternsText.value);
        await setPatterns(await defaultPatternsPromise);
    }));
    form.querySelector("#restore").addEventListener("click", wrapErrors(restore));
    storage.onChanged.addListener(wrapErrors(async (changes, areaName) => {
        if (areaName !== "sync")
            return;
        if (changes.patterns) {
            await restore();
        }
    }));
    restore().catch(onError);
}
