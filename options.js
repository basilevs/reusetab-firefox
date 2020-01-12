const form = document.querySelector('form');
const text = form.querySelector('#regular_expressions_text');

function debug() {
    console.debug.apply(console, arguments);
}

function onError(error) {
    console.error(error);
}

function submit(event) {
    debug("Form submitted", event, text.value);
    browser.storage.sync.set({
        "patterns": text.value
    });
}

function reset(event) {
    debug("Form set to default", event, text.value);
    setPatterns(null);
}

function setPatterns(data) {
    debug("Resetting patterns", data);
    if (!data) {
        data =
`https://(?:www.spotify.com|www.open.spotify.com)/.*
https://www.google.com/maps.*
https://([^/]+)/.*
http://([^/]+)/.*`;
    }
    text.value = data;
}

function restore() {
    browser.storage.sync.get("patterns").then(d => setPatterns(d.patterns), onError);
}

restore();

form.querySelector("#save").addEventListener("click", submit);
form.querySelector("#default").addEventListener("click", reset);
form.querySelector("#restore").addEventListener("click", restore);
