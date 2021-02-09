const assert = require('../assert.js').for('CustomElementRegistry');

const {parseHTML} = global[Symbol.for('linkedom')];

const {HTMLElement, HTMLButtonElement, HTMLTemplateElement, customElements, document} = parseHTML('<html></html>');

class CE extends HTMLElement {}

customElements.whenDefined('c-e').then(Class => {
  assert(Class, CE, 'c-e defined, and class passed along');
});

customElements.whenDefined('c-e').then(Class => {
  assert(Class, customElements.get('c-e'), 'c-e defined and available as get()');
});

try {
  new CE;
  assert(false, 'Custom Elements cannot be initialized before being registered');
}
catch (ok) {}

customElements.define('c-e', CE);
assert(customElements.get('c-e'), CE, 'correctly defined');

try {
  customElements.define('c-e', class extends HTMLElement {});
  assert(false, 'if a name has been taken, it cannot be redefined');
}
catch (OK) {}

try {
  customElements.define('c-e-duplicated', CE);
  assert(false, 'if a class has been taken, it cannot be redefined');
}
catch (OK) {}

let ce = new CE;

assert(ce.tagName, 'C-E', 'Custom Elements can be initialized once registered');
document.documentElement.appendChild(ce);
ce.setAttribute('test', 'value');
ce.removeAttribute('test');

let args = null;
class CEWithAttribute extends HTMLElement {
  static get observedAttributes() { return ['test']; }
  attributeChangedCallback() {
    args = arguments;
  }
}

customElements.define('c-e-w-a', CEWithAttribute);
ce = new CEWithAttribute;

assert(ce.toString(), '<c-e-w-a></c-e-w-a>', 'ce to string works');

ce.setAttribute('test', 'oldValue');
assert(args[0] === 'test' && args[1] === null && args[2] === 'oldValue', true, 'attributeChangedCallback added');

ce.setAttribute('test', 'value');
assert(args[0] === 'test' && args[1] === 'oldValue' && args[2] === 'value', true, 'attributeChangedCallback changed');

ce.removeAttribute('test');
assert(args[0] === 'test' && args[1] === 'value' && args[2] === null, true, 'attributeChangedCallback removed');

args = null;

ce.setAttribute('test2', 'value');
ce.removeAttribute('test2');

assert(args, null, 'non observed attributes are ... not observed');

customElements.whenDefined('c-e-w-a').then(Class => {
  assert(Class, CEWithAttribute, 'c-e-w-a defined, and class passed along');
});

ce = document.createElement('already-live');
document.documentElement.appendChild(ce);

customElements.define('already-live', class extends HTMLElement {
  connectedCallback() {
    args = 'connected';
  }
  disconnectedCallback() {
    args = 'disconnected';
  }
});

assert(args, 'connected', 'connectedCallback for already-live worked');

ce.remove();
assert(args, 'disconnected', 'disconnectedCallback for already-live worked');

document.documentElement.appendChild(document.createElement('template', {is: 'custom-template'}));

args = [];
customElements.define('custom-template', class extends HTMLTemplateElement {
  connectedCallback() {
    args.push(this);
  }
}, {extends: 'template'});

ce = document.createElement('template', {is: 'custom-template'});
assert(ce.toString(), '<template is="custom-template"></template>', 'builtin extends work');

assert(args.length === 1 && args.pop() === document.documentElement.lastChild, true, 'builtin connected');

customElements.upgrade(ce);

document.documentElement.insertBefore(ce, document.documentElement.lastChild);
assert(args.length === 1 && args.pop() === ce, true, 'connectedCallback via insertBefore');

node = document.createDocumentFragment();
node.appendChild(ce);

document.documentElement.insertBefore(node, document.documentElement.lastChild);
assert(args.length === 1 && args.pop() === ce, true, 'connectedCallback via insertBefore and fragment');

const TemplateExtend = customElements.get('custom-template');
assert((new TemplateExtend).toString(), '<template is="custom-template"></template>', 'builtin extends work');

assert(HTMLElement.observedAttributes.length, 0, 'default observedAttributes has length 0');

args = [];
customElements.define('outer-test', class extends HTMLElement {
  connectedCallback() {
    args.push('connected: ' + this.localName);
  }
  disconnectedCallback() {
    args.push('disconnected: ' + this.localName);
  }
});

customElements.define('inner-test', class extends HTMLElement {
  connectedCallback() {
    args.push('connected: ' + this.localName);
  }
  disconnectedCallback() {
    args.push('disconnected: ' + this.localName);
  }
});

let outer = document.createElement('outer-test');

outer.innerHTML = '<div>OK<inner-test>OK</inner-test>OK<inner-test>OK</inner-test>OK</div><inner-test>OK</inner-test>';
document.documentElement.appendChild(outer);

assert(args.splice(0).join(','), 'connected: outer-test,connected: inner-test,connected: inner-test,connected: inner-test', 'inner elements get connected too');

outer.remove();

assert(args.splice(0).join(','), 'disconnected: outer-test,disconnected: inner-test,disconnected: inner-test,disconnected: inner-test', 'inner elements get disconnected too');

outer.remove();
assert(args.length, 0, 'should not trigger disconnected again');

customElements.define('inner-button', class extends HTMLButtonElement {
  static get observedAttributes() { return ['test']; }
  attributeChangedCallback(name, oldValue, newValue) {
    args.push(name, oldValue, newValue);
  }
  connectedCallback() {
    args.push('connected: ' + this.localName + '[is="' + this.getAttribute('is') + '"]');
  }
  disconnectedCallback() {
    args.push('disconnected: ' + this.localName);
  }
}, {extends: 'button'});

outer.innerHTML = '<div><button test="123" is="inner-button">OK</button></div>';

assert(JSON.stringify(args.splice(0)), '["test",null,"123"]', 'attributes get initialized');

document.documentElement.appendChild(outer);

assert(args.splice(0).join(','), 'connected: outer-test,connected: button[is="inner-button"]', 'inner builtin elements get connected too');
assert(outer.querySelector('button').toString(), '<button test="123" is="inner-button">OK</button>', 'button with the correct content');
