const form = document.querySelector('form');
const text = form.querySelector('#regular_expressions_text');
if (!text)
    throw new Error("Patterns textarea is not found");

const sync = browser.storage.sync;
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

function submit(event) {
    debug("Form submitted", event, text.value);
    sync.set({
        "patterns": text.value
    });
}

function reset(event) {
    debug("Form set to default", event, text.value);
    setPatterns(null);
}

async function setPatterns(data) {
    debug("Resetting patterns", data);
    if (!data) {
        data = await defaultPatternsPromise;
        if (!data)
            throw new Error("No default patterns found");
    }
    text.value = data;
}

function restore() {
    sync.get("patterns").then(d => setPatterns(d.patterns), onError);
}

restore();

form.querySelector("#save").addEventListener("click", submit);
form.querySelector("#default").addEventListener("click", reset);
form.querySelector("#restore").addEventListener("click", restore);
