
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

async function setPatterns(data) {
    debug("Resetting patterns", data);
    if (!data)
        throw new Error("Empty argument");
    matchingPatternsText.value = data.join("\n");;
}

function wrapErrors(asyncFunction) {
    function wrapper(...args) {
        asyncFunction(...args).catch(onError);
    }
    return wrapper;
}

const form = document.querySelector('form');


const blacklist_text = form.querySelector("#blacklist_text");
const blacklist = form.querySelector("#blacklist");
blacklist_text.addEventListener("input", () => {
    blacklist.disabled = !blacklist_text.value;
});
form.querySelector("#blacklist").addEventListener("click", wrapErrors(async () => {
    let choice = blacklist_text.value;
    choice = choice.replace(/[.]/g, "\\.");
    await addPattern(".*" + choice + "(.*)");
    blacklist_text.value = "";
    blacklist.disabled = true;
}));


const multidomain_text = form.querySelector("#multidomain_text");
const apply_multidomain = form.querySelector("#apply_multidomain");
multidomain_text.addEventListener("input", () => {
    let array = multidomain_text.value.split("\n");
    array = array.filter(s => !!s);
    apply_multidomain.disabled = array.length < 2;
});
apply_multidomain.addEventListener("click", wrapErrors(async () => {
    let choice = multidomain_text.value.split("\n").join("|");
    choice = choice.replace(/[.]/g, "\\.");
    await addPattern(`https://(?:${choice})/.*`, `http://(?:${choice})/.*`);
    multidomain_text.value = "";
    apply_multidomain.disabled = true;
}));

async function restore() {
    await setPatterns(await loadPatterns());
}
const matchingPatternsText = form.querySelector('#regular_expressions_text');
if (!matchingPatternsText)
    throw new Error("Patterns textarea is not found");
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
