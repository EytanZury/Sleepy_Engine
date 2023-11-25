///////////////////////////////////////
//          Material Module          //
///////////////////////////////////////

// MDN web docs - Document Object Model:
// https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model
// https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API

// 
// (more info in the "Script handling" section below)
import { wasm, wasmLoadPromise } from "../../libs/codemirror-5.65.13/mode/rhai-playground/wasm_loader.js";

//
const materialsection = document.querySelector(".editor > .material-section");

//
let onSwitchOf = {
    'config': null,
    'script': null,
    'preview': null
}

//
let onChangeTo = {
    'config': null,
    'script': null
}

//
let beforeChange = {
    'config-input': null,
    'config-minus': null
}

//
const modeComponents = {
    'sprite': ['config', 'preview'],
    'audio': ['preview'],
    'font': ['preview'],
    'object': ['config', 'preview', 'script'],
    'scene': ['config', 'preview', 'script'],
    'state': ['config', 'script'],
    'loading': ['preview'],
    'none': ['preview'],
}

//
const toConfigButton = document.querySelector("#toConfig-button");
//
const toScriptButton = document.querySelector("#toScript-button");

//
function materialSetup(switchFn = {}, changeFn = {}, beforeChangeFn = {}) {
    //
    onSwitchOf = switchFn;
    onChangeTo = changeFn;
    beforeChange = beforeChangeFn;
    //
    configSetup();
    scriptSetup();
    //
    toConfigButton.onclick = () => {
        //
        const curTab = document.querySelector("#tabSelected");
        //
        curTab.removeAttribute("data-in-script");
        //
        switchMaterial();
    }
    toScriptButton.onclick = () => {
        //
        const curTab = document.querySelector("#tabSelected");
        //
        curTab.setAttribute("data-in-script", '');
        //
        switchMaterial();
    }
}

//
function switchMaterial() {
    //
    const curTab = document.querySelector("#tabSelected");
    //
    const prvMode = materialsection.dataset['mode'];
    //
    switchMode('loading');
    //
    if (prvMode == 'script') {
        //
        scriptBlob = 0;
        rhaiScript.swapDoc(codemirrorDocMap.get(scriptBlob));
        //
        rhaiScript.refresh();
        //
        switchMode(curTab.hasAttribute("data-in-script") ? "script" : curTab.dataset['type'], 
        curTab.dataset['table'], curTab.dataset['tableId']);
        //
        rhaiScript.refresh();
        return;
    }
    //
    for (let comp of modeComponents[prvMode]) {
        switch(comp) {
            //
            case 'config':
                //
                clearConfig(prvMode);
                //
                configInfo.JSON = {};
                configInfo.form = '';
                configInfo.blob = 0;
                break;
            //
            case 'preview':
                break;
            //
            case 'script':
                break;
            default:

        }
    }
    //
    switchMode(curTab.hasAttribute("data-in-script") ? "script" : curTab.dataset['type'], 
        curTab.dataset['table'], curTab.dataset['tableId']);
}

//
function switchMode(mode, table, rowid) {
    //
    if (mode === undefined) {
        mode = 'none';
    }
    //
    if (mode == 'script' && table !== undefined && rowid !== undefined) {
        //
        const scriptInfo = onSwitchOf['script'](table, rowid);
        scriptBlob = scriptInfo.rowid;
        if (codemirrorDocMap.get(scriptBlob) === undefined) {
            codemirrorDocMap.set(0,rhaiScript.getDoc().copy(true));
            rhaiScript.setValue(scriptInfo.text);
            rhaiScript.clearHistory();
            codemirrorDocMap.set(scriptBlob, rhaiScript.getDoc());
        } else {
            rhaiScript.swapDoc(codemirrorDocMap.get(scriptBlob));
            if (rhaiScript.getValue() != scriptInfo.text) {
                rhaiScript.setValue(scriptInfo.text);
            }
        }
        
        //
        materialsection.dataset['mode'] = mode;
        //
        rhaiScript.refresh();
        return;
    }
    //
    for (let comp of modeComponents[mode]) {
        switch(comp) {
            case 'config':
                if (table === undefined || rowid === undefined) {
                    break;
                }
                const configBlobInfo = onSwitchOf['config'](table, rowid);
                configInfo.JSON = configBlobInfo.JSON;
                configInfo.form = mode;
                configInfo.blob = configBlobInfo.blobID;
                loadConfig(mode);
                break;
            case 'script':
                break;
            case 'preview':
                break;
            default:
                
        }
    }
    //
    materialsection.dataset['mode'] = mode;
}

function resetMaterial(mode) {
    //
    materialsection.dataset['mode'] = 'none';
    //
    clearConfig(mode);
    //
    configInfo.JSON = {};
    configInfo.form = '';
    configInfo.blob = 0;
    //
    if (mode == 'script') {
        scriptBlob = 0;
        rhaiScript.swapDoc(codemirrorDocMap.get(scriptBlob));
    }
    codemirrorDocMap.clear();
    //
    rhaiScript.refresh();
}



//////////////////////////////////////////////
//          Configuration handling          //


//
const configForms = {
    'sprite': document.querySelector("#sprite-config"),
    'object': document.querySelector("#object-config"),
    'scene': document.querySelector("#scene-config"),
    'state': document.querySelector("#state-config"),
};

//
let configInfo = {
    JSON: {},
    form: '',
    blob: 0
};

//
function getJSONScope(htmlElement) {
    //
    const path = [];
    //
    while (htmlElement.className != "config") {
        htmlElement = htmlElement.parentNode;
        if (htmlElement.hasAttribute("name")) {
            path.push(htmlElement.getAttribute("name"));
        }
    }
    //
    path.reverse();
    //
    let container = configInfo.JSON;
    //
    for (let key of path) {
        container = container[key];
    }
    //
    return container;
}

//
function configSetup() {
    //
    materialsection.addEventListener("input", (event) => {
        //
        if (event.target.matches(".li-template input, #game-icon-input, #rhai-script *")) {
            return;
        }
        //
        const input = event.target;
        //
        const value = beforeChange['config-input'](input, getJSONScope(input)[input.getAttribute("name")]);
        //
        input.value = value;
        //
        getJSONScope(input)[input.getAttribute("name")] = (input.type == "number" || input.type == "range") ? Number(input.value) : input.value;
        //
        onChangeTo['config'](configInfo);
    });

    //
    materialsection.addEventListener("click", (event) => {
        //
        if (event.target.matches(":not(.plus-button, .minus-button)")) {
            return;
        }
        //
        const button = event.target;
        //
        if (button.className == "plus-button") {
            //
            const item = addItemToConfigArray(button.parentNode, getJSONScope(button).length);
        //
        } else if (beforeChange['config-minus'](button.parentNode)) {
            const li = button.parentNode;
            //
            const liname = li.querySelector(":scope [name]").getAttribute("name");
            //
            const jsonArray = li.parentNode;
            //
            jsonArray.querySelectorAll(":scope > li").forEach((item) => {
                //
                item = item.querySelector(":scope [name]");
                //
                if (parseInt(item.getAttribute("name")) <= parseInt(liname) ) {
                    return;
                }
                //
                item.setAttribute("name", parseInt(item.getAttribute("name")) - 1);
            });
            //
            getJSONScope(li).splice(parseInt(liname), 1);
            //
            li.remove();
        }
        //
        onChangeTo['config'](configInfo);
    });
}

//
function clearConfig(form) {
    //
    form = configForms[form];
    //
    if (form === undefined) {
        return;
    }
    //
    form.querySelectorAll(".json-array:not([name=\"version\"]) > li").forEach((li) => {li.remove();});
    //
    form.querySelectorAll(".json-field:not(#game-icon) > input").forEach((input) => {
        //
        if (input.matches(".li-template input")) {
            return;
        }
        //
        input.removeAttribute("value");
    });
}

//
function loadConfig(form) {
    //
    form = configForms[form];
    //
    if (form === undefined) {
        return;
    }

    //
    function determineLoadMethod(htmlElement, scope) {
        if (htmlElement.className.includes('json-field')) {
            loadVariable(htmlElement.querySelector(":scope > input"), scope, "field");
        }
        if (htmlElement.className.includes('json-object')) {
            loadVariable(htmlElement, scope, "object");
        }
        if (htmlElement.className.includes('json-array')) {
            loadVariable(htmlElement, scope, "array");
        }
    }
    //
    function loadVariable(htmlElement, scope, method) {
        //
        let key = htmlElement.getAttribute("name");
        //
        if (key === null) {
            return;
        }

        //
        if (method == "field") {
            htmlElement.value = scope[key];
            return;
        }
        //
        if (method == "object") {
            //
            htmlElement.querySelectorAll(":scope > *").forEach((attr) => {
                //
                determineLoadMethod(attr, scope[key]);
            });
        }
        //
        if (method == "array") {
            //
            let li;
            //
            const isVersion = htmlElement.getAttribute("name") == "version";
            //
            for (let i = 0 ; i < scope[key].length ; i++) {
                //
                if (isVersion) {
                    //
                    li = htmlElement.querySelector(`input[name="${i}"]`);
                    //
                    loadVariable(li, scope[key], "field");
                    continue;
                }
                //
                li = addItemToConfigArray(htmlElement, i, false);
                //
                determineLoadMethod(li, scope[key]);
            }
        }
    }
    //
    const JSON = configInfo.JSON;
    //
    form.querySelectorAll(":scope > *:not(#game-icon)").forEach((htmlElement) => {
        determineLoadMethod(htmlElement, JSON);
    });
}

//
function addItemToConfigArray(jsonArray, index, update = true) {
    //
    function determineAddMethod(htmlElement, scope) {
        if (htmlElement.className.includes('json-field')) {
            addVariable(htmlElement.querySelector(":scope > input"), scope, "field");
        }
        if (htmlElement.className.includes('json-object')) {
            addVariable(htmlElement, scope, "object");
        }
        if (htmlElement.className.includes('json-array')) {
            addVariable(htmlElement, scope, "array");
        }
    }
    //
    function addVariable(htmlElement, scope, method) {
        //
        let key = htmlElement.getAttribute("name");
        //
        if (key === null) {
            return;
        }

        //
        if (method == "field") {
            //
            scope[key] = (htmlElement.type == "number" || htmlElement.type == "range") ? Number(htmlElement.value) : htmlElement.value;
        }
        //
        if (method == "object") {
            scope[key] = {};
            //
            htmlElement.querySelectorAll(":scope > *").forEach((attr) => {
                //
                determineAddMethod(attr, scope[key]);
            });
        }
        //
        if (method == "array") {
            //
            scope[key] = [];
            //
            htmlElement.querySelectorAll(":scope > li > :is(json-field, json-object, json-array)").forEach((item) => {
                //
                determineAddMethod(item, scope[key]);
            });
        }
    }

    //
    const li = document.createElement("li");
    //
    li.innerHTML = jsonArray.querySelector(":scope > .li-template").innerHTML;
    //
    jsonArray.querySelector(":scope > .plus-button").before(li);
    //
    const licontent = li.querySelector(":scope > *");

    //
    if (licontent.className.includes('json-field')) {
        //
        const input = licontent.querySelector(":scope > input");
        //
        input.setAttribute("name", index);

        //
        if (update) {
            addVariable(input, getJSONScope(input), "field");
        }
        //
        return licontent;
    }
    //
    licontent.setAttribute("name", index);

    //
    if (update) {
        determineAddMethod(licontent, getJSONScope(licontent));
    }
    //
    return licontent;
}



///////////////////////////////////////
//          Script handling          //


// This part uses some codemirror addons
// and a special mode for rhai, which is
// used in the rhai playground demo.
// https://rhai.rs/playground/stable/
// The mode it defined in webassembly
// using rust, so it's a bit tricky to import.


//
const scriptForm = document.getElementById("rhai-script");

//
let scriptBlob = 0;

const codemirrorDocMap = new Map();

// 
const rhaiScript = CodeMirror(scriptForm, {
    value: "",
    mode: null,
    theme: "dracula",
    tabSize: 2,
    indentUnit: 2,
	indentWithTabs: true,
	smartIndent: true,
	lineNumbers: true,
	matchBrackets: true,
    highlightSelectionMatches: true,
    autoCloseBrackets: {
        pairs: `()[]{}''""`,
        closeBefore: `)]}'":;,`,
        triples: "",
        explode: "()[]{}",
    },
    scrollbarStyle: "native"
})

//
function scriptSetup() {
    rhaiScript.on("change", () => {
        //
        onChangeTo['script'](rhaiScript.getValue(), scriptBlob);
        codemirrorDocMap.set(scriptBlob, rhaiScript.getDoc());
    });
}

//
wasmLoadPromise.then(() => {
    //
    wasm.init_codemirror_pass(CodeMirror.Pass);

    //
    CodeMirror.defineMode("rhai", (cfg, mode) => {
        return new wasm.RhaiMode(cfg.indentUnit);
    });

    //
    rhaiScript.setOption("mode", "rhai");
});

//

export { switchMaterial, resetMaterial };
export default materialSetup;