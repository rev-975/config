/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
var __webpack_exports__ = {};

;// CONCATENATED MODULE: ./src/autofill/services/collect-autofill-content.service.ts
var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class CollectAutofillContentService {
    constructor(domElementVisibilityService) {
        this.noFieldsFound = false;
        this.domRecentlyMutated = true;
        this.autofillFormElements = new Map();
        this.autofillFieldElements = new Map();
        this.currentLocationHref = "";
        this.updateAfterMutationTimeoutDelay = 1000;
        /**
         * Builds an AutofillField object from the given form element. Will only return
         * shared field values if the element is a span element. Will not return any label
         * values if the element is a hidden input element.
         * @param {ElementWithOpId<FormFieldElement>} element
         * @param {number} index
         * @returns {Promise<AutofillField>}
         * @private
         */
        this.buildAutofillFieldItem = (element, index) => __awaiter(this, void 0, void 0, function* () {
            element.opid = `__${index}`;
            const existingAutofillField = this.autofillFieldElements.get(element);
            if (existingAutofillField) {
                existingAutofillField.opid = element.opid;
                existingAutofillField.elementNumber = index;
                this.autofillFieldElements.set(element, existingAutofillField);
                return existingAutofillField;
            }
            const autofillFieldBase = {
                opid: element.opid,
                elementNumber: index,
                maxLength: this.getAutofillFieldMaxLength(element),
                viewable: yield this.domElementVisibilityService.isFormFieldViewable(element),
                htmlID: this.getPropertyOrAttribute(element, "id"),
                htmlName: this.getPropertyOrAttribute(element, "name"),
                htmlClass: this.getPropertyOrAttribute(element, "class"),
                tabindex: this.getPropertyOrAttribute(element, "tabindex"),
                title: this.getPropertyOrAttribute(element, "title"),
                tagName: this.getAttributeLowerCase(element, "tagName"),
            };
            if (element instanceof HTMLSpanElement) {
                this.autofillFieldElements.set(element, autofillFieldBase);
                return autofillFieldBase;
            }
            let autofillFieldLabels = {};
            const elementType = this.getAttributeLowerCase(element, "type");
            if (elementType !== "hidden") {
                autofillFieldLabels = {
                    "label-tag": this.createAutofillFieldLabelTag(element),
                    "label-data": this.getPropertyOrAttribute(element, "data-label"),
                    "label-aria": this.getPropertyOrAttribute(element, "aria-label"),
                    "label-top": this.createAutofillFieldTopLabel(element),
                    "label-right": this.createAutofillFieldRightLabel(element),
                    "label-left": this.createAutofillFieldLeftLabel(element),
                    placeholder: this.getPropertyOrAttribute(element, "placeholder"),
                };
            }
            const autofillField = Object.assign(Object.assign(Object.assign({}, autofillFieldBase), autofillFieldLabels), { rel: this.getPropertyOrAttribute(element, "rel"), type: elementType, value: this.getElementValue(element), checked: this.getAttributeBoolean(element, "checked"), autoCompleteType: this.getAutoCompleteAttribute(element), disabled: this.getAttributeBoolean(element, "disabled"), readonly: this.getAttributeBoolean(element, "readonly"), selectInfo: element instanceof HTMLSelectElement ? this.getSelectElementOptions(element) : null, form: element.form ? this.getPropertyOrAttribute(element.form, "opid") : null, "aria-hidden": this.getAttributeBoolean(element, "aria-hidden", true), "aria-disabled": this.getAttributeBoolean(element, "aria-disabled", true), "aria-haspopup": this.getAttributeBoolean(element, "aria-haspopup", true), "data-stripe": this.getPropertyOrAttribute(element, "data-stripe") });
            this.autofillFieldElements.set(element, autofillField);
            return autofillField;
        });
        /**
         * Map over all the label elements and creates a
         * string of the text content of each label element.
         * @param {Set<HTMLElement>} labelElementsSet
         * @returns {string}
         * @private
         */
        this.createLabelElementsTag = (labelElementsSet) => {
            return Array.from(labelElementsSet)
                .map((labelElement) => {
                const textContent = labelElement
                    ? labelElement.textContent || labelElement.innerText
                    : null;
                return this.trimAndRemoveNonPrintableText(textContent || "");
            })
                .join("");
        };
        /**
         * Handles observed DOM mutations and identifies if a mutation is related to
         * an autofill element. If so, it will update the autofill element data.
         * @param {MutationRecord[]} mutations
         * @private
         */
        this.handleMutationObserverMutation = (mutations) => {
            if (this.currentLocationHref !== globalThis.location.href) {
                this.handleWindowLocationMutation();
                return;
            }
            for (let mutationsIndex = 0; mutationsIndex < mutations.length; mutationsIndex++) {
                const mutation = mutations[mutationsIndex];
                if (mutation.type === "childList" &&
                    (this.isAutofillElementNodeMutated(mutation.removedNodes, true) ||
                        this.isAutofillElementNodeMutated(mutation.addedNodes))) {
                    this.domRecentlyMutated = true;
                    this.noFieldsFound = false;
                    continue;
                }
                if (mutation.type === "attributes") {
                    this.handleAutofillElementAttributeMutation(mutation);
                }
            }
            if (this.domRecentlyMutated) {
                this.updateAutofillElementsAfterMutation();
            }
        };
        this.domElementVisibilityService = domElementVisibilityService;
    }
    /**
     * Builds the data for all forms and fields found within the page DOM.
     * Sets up a mutation observer to verify DOM changes and returns early
     * with cached data if no changes are detected.
     * @returns {Promise<AutofillPageDetails>}
     * @public
     */
    getPageDetails() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.mutationObserver) {
                this.setupMutationObserver();
            }
            if (!this.domRecentlyMutated && this.noFieldsFound) {
                return this.getFormattedPageDetails({}, []);
            }
            if (!this.domRecentlyMutated &&
                this.autofillFormElements.size &&
                this.autofillFieldElements.size) {
                return this.getFormattedPageDetails(this.getFormattedAutofillFormsData(), this.getFormattedAutofillFieldsData());
            }
            const { formElements, formFieldElements } = this.queryAutofillFormAndFieldElements();
            const autofillFormsData = this.buildAutofillFormsData(formElements);
            const autofillFieldsData = yield this.buildAutofillFieldsData(formFieldElements);
            this.sortAutofillFieldElementsMap();
            if (!Object.values(autofillFormsData).length || !autofillFieldsData.length) {
                this.noFieldsFound = true;
            }
            this.domRecentlyMutated = false;
            return this.getFormattedPageDetails(autofillFormsData, autofillFieldsData);
        });
    }
    /**
     * Find an AutofillField element by its opid, will only return the first
     * element if there are multiple elements with the same opid. If no
     * element is found, null will be returned.
     * @param {string} opid
     * @returns {FormFieldElement | null}
     */
    getAutofillFieldElementByOpid(opid) {
        const cachedFormFieldElements = Array.from(this.autofillFieldElements.keys());
        const formFieldElements = (cachedFormFieldElements === null || cachedFormFieldElements === void 0 ? void 0 : cachedFormFieldElements.length)
            ? cachedFormFieldElements
            : this.getAutofillFieldElements();
        const fieldElementsWithOpid = formFieldElements.filter((fieldElement) => fieldElement.opid === opid);
        if (!fieldElementsWithOpid.length) {
            const elementIndex = parseInt(opid.split("__")[1], 10);
            return formFieldElements[elementIndex] || null;
        }
        if (fieldElementsWithOpid.length > 1) {
            // eslint-disable-next-line no-console
            console.warn(`More than one element found with opid ${opid}`);
        }
        return fieldElementsWithOpid[0];
    }
    /**
     * Queries the DOM for all the nodes that match the given filter callback
     * and returns a collection of nodes.
     * @param {Node} rootNode
     * @param {Function} filterCallback
     * @param {boolean} isObservingShadowRoot
     * @returns {Node[]}
     */
    queryAllTreeWalkerNodes(rootNode, filterCallback, isObservingShadowRoot = true) {
        const treeWalkerQueryResults = [];
        this.buildTreeWalkerNodesQueryResults(rootNode, treeWalkerQueryResults, filterCallback, isObservingShadowRoot);
        return treeWalkerQueryResults;
    }
    /**
     * Sorts the AutofillFieldElements map by the elementNumber property.
     * @private
     */
    sortAutofillFieldElementsMap() {
        if (!this.autofillFieldElements.size) {
            return;
        }
        this.autofillFieldElements = new Map([...this.autofillFieldElements].sort((a, b) => a[1].elementNumber - b[1].elementNumber));
    }
    /**
     * Formats and returns the AutofillPageDetails object
     * @param {Record<string, AutofillForm>} autofillFormsData
     * @param {AutofillField[]} autofillFieldsData
     * @returns {AutofillPageDetails}
     * @private
     */
    getFormattedPageDetails(autofillFormsData, autofillFieldsData) {
        return {
            title: document.title,
            url: (document.defaultView || window).location.href,
            documentUrl: document.location.href,
            forms: autofillFormsData,
            fields: autofillFieldsData,
            collectedTimestamp: Date.now(),
        };
    }
    /**
     * Queries the DOM for all the forms elements and
     * returns a collection of AutofillForm objects.
     * @returns {Record<string, AutofillForm>}
     * @private
     */
    buildAutofillFormsData(formElements) {
        for (let index = 0; index < formElements.length; index++) {
            const formElement = formElements[index];
            formElement.opid = `__form__${index}`;
            const existingAutofillForm = this.autofillFormElements.get(formElement);
            if (existingAutofillForm) {
                existingAutofillForm.opid = formElement.opid;
                this.autofillFormElements.set(formElement, existingAutofillForm);
                continue;
            }
            this.autofillFormElements.set(formElement, {
                opid: formElement.opid,
                htmlAction: this.getFormActionAttribute(formElement),
                htmlName: this.getPropertyOrAttribute(formElement, "name"),
                htmlID: this.getPropertyOrAttribute(formElement, "id"),
                htmlMethod: this.getPropertyOrAttribute(formElement, "method"),
            });
        }
        return this.getFormattedAutofillFormsData();
    }
    /**
     * Returns the action attribute of the form element. If the action attribute
     * is a relative path, it will be converted to an absolute path.
     * @param {ElementWithOpId<HTMLFormElement>} element
     * @returns {string}
     * @private
     */
    getFormActionAttribute(element) {
        return new URL(this.getPropertyOrAttribute(element, "action"), window.location.href).href;
    }
    /**
     * Iterates over all known form elements and returns an AutofillForm object
     * containing a key value pair of the form element's opid and the form data.
     * @returns {Record<string, AutofillForm>}
     * @private
     */
    getFormattedAutofillFormsData() {
        const autofillForms = {};
        const autofillFormElements = Array.from(this.autofillFormElements);
        for (let index = 0; index < autofillFormElements.length; index++) {
            const [formElement, autofillForm] = autofillFormElements[index];
            autofillForms[formElement.opid] = autofillForm;
        }
        return autofillForms;
    }
    /**
     * Queries the DOM for all the field elements and
     * returns a list of AutofillField objects.
     * @returns {Promise<AutofillField[]>}
     * @private
     */
    buildAutofillFieldsData(formFieldElements) {
        return __awaiter(this, void 0, void 0, function* () {
            const autofillFieldElements = this.getAutofillFieldElements(100, formFieldElements);
            const autofillFieldDataPromises = autofillFieldElements.map(this.buildAutofillFieldItem);
            return Promise.all(autofillFieldDataPromises);
        });
    }
    /**
     * Queries the DOM for all the field elements that can be autofilled,
     * and returns a list limited to the given `fieldsLimit` number that
     * is ordered by priority.
     * @param {number} fieldsLimit - The maximum number of fields to return
     * @param {FormFieldElement[]} previouslyFoundFormFieldElements - The list of all the field elements
     * @returns {FormFieldElement[]}
     * @private
     */
    getAutofillFieldElements(fieldsLimit, previouslyFoundFormFieldElements) {
        var _a;
        const formFieldElements = previouslyFoundFormFieldElements ||
            this.queryAllTreeWalkerNodes(document.documentElement, (node) => this.isNodeFormFieldElement(node));
        if (!fieldsLimit || formFieldElements.length <= fieldsLimit) {
            return formFieldElements;
        }
        const priorityFormFields = [];
        const unimportantFormFields = [];
        const unimportantFieldTypesSet = new Set(["checkbox", "radio"]);
        for (const element of formFieldElements) {
            if (priorityFormFields.length >= fieldsLimit) {
                return priorityFormFields;
            }
            const fieldType = (_a = this.getPropertyOrAttribute(element, "type")) === null || _a === void 0 ? void 0 : _a.toLowerCase();
            if (unimportantFieldTypesSet.has(fieldType)) {
                unimportantFormFields.push(element);
                continue;
            }
            priorityFormFields.push(element);
        }
        const numberUnimportantFieldsToInclude = fieldsLimit - priorityFormFields.length;
        for (let index = 0; index < numberUnimportantFieldsToInclude; index++) {
            priorityFormFields.push(unimportantFormFields[index]);
        }
        return priorityFormFields;
    }
    /**
     * Identifies the autocomplete attribute associated with an element and returns
     * the value of the attribute if it is not set to "off".
     * @param {ElementWithOpId<FormFieldElement>} element
     * @returns {string}
     * @private
     */
    getAutoCompleteAttribute(element) {
        const autoCompleteType = this.getPropertyOrAttribute(element, "x-autocompletetype") ||
            this.getPropertyOrAttribute(element, "autocompletetype") ||
            this.getPropertyOrAttribute(element, "autocomplete");
        return autoCompleteType !== "off" ? autoCompleteType : null;
    }
    /**
     * Returns a boolean representing the attribute value of an element.
     * @param {ElementWithOpId<FormFieldElement>} element
     * @param {string} attributeName
     * @param {boolean} checkString
     * @returns {boolean}
     * @private
     */
    getAttributeBoolean(element, attributeName, checkString = false) {
        if (checkString) {
            return this.getPropertyOrAttribute(element, attributeName) === "true";
        }
        return Boolean(this.getPropertyOrAttribute(element, attributeName));
    }
    /**
     * Returns the attribute of an element as a lowercase value.
     * @param {ElementWithOpId<FormFieldElement>} element
     * @param {string} attributeName
     * @returns {string}
     * @private
     */
    getAttributeLowerCase(element, attributeName) {
        var _a;
        return (_a = this.getPropertyOrAttribute(element, attributeName)) === null || _a === void 0 ? void 0 : _a.toLowerCase();
    }
    /**
     * Returns the value of an element's property or attribute.
     * @returns {AutofillField[]}
     * @private
     */
    getFormattedAutofillFieldsData() {
        return Array.from(this.autofillFieldElements.values());
    }
    /**
     * Creates a label tag used to autofill the element pulled from a label
     * associated with the element's id, name, parent element or from an
     * associated description term element if no other labels can be found.
     * Returns a string containing all the `textContent` or `innerText`
     * values of the label elements.
     * @param {FillableFormFieldElement} element
     * @returns {string}
     * @private
     */
    createAutofillFieldLabelTag(element) {
        var _a, _b;
        const labelElementsSet = new Set(element.labels);
        if (labelElementsSet.size) {
            return this.createLabelElementsTag(labelElementsSet);
        }
        const labelElements = this.queryElementLabels(element);
        for (let labelIndex = 0; labelIndex < (labelElements === null || labelElements === void 0 ? void 0 : labelElements.length); labelIndex++) {
            labelElementsSet.add(labelElements[labelIndex]);
        }
        let currentElement = element;
        while (currentElement && currentElement !== document.documentElement) {
            if (currentElement instanceof HTMLLabelElement) {
                labelElementsSet.add(currentElement);
            }
            currentElement = currentElement.parentElement.closest("label");
        }
        if (!labelElementsSet.size &&
            ((_a = element.parentElement) === null || _a === void 0 ? void 0 : _a.tagName.toLowerCase()) === "dd" &&
            ((_b = element.parentElement.previousElementSibling) === null || _b === void 0 ? void 0 : _b.tagName.toLowerCase()) === "dt") {
            labelElementsSet.add(element.parentElement.previousElementSibling);
        }
        return this.createLabelElementsTag(labelElementsSet);
    }
    /**
     * Queries the DOM for label elements associated with the given element
     * by id or name. Returns a NodeList of label elements or null if none
     * are found.
     * @param {FillableFormFieldElement} element
     * @returns {NodeListOf<HTMLLabelElement> | null}
     * @private
     */
    queryElementLabels(element) {
        let labelQuerySelectors = element.id ? `label[for="${element.id}"]` : "";
        if (element.name) {
            const forElementNameSelector = `label[for="${element.name}"]`;
            labelQuerySelectors = labelQuerySelectors
                ? `${labelQuerySelectors}, ${forElementNameSelector}`
                : forElementNameSelector;
        }
        if (!labelQuerySelectors) {
            return null;
        }
        return element.getRootNode().querySelectorAll(labelQuerySelectors.replace(/\n/g, ""));
    }
    /**
     * Gets the maxLength property of the passed FormFieldElement and
     * returns the value or null if the element does not have a
     * maxLength property. If the element has a maxLength property
     * greater than 999, it will return 999.
     * @param {FormFieldElement} element
     * @returns {number | null}
     * @private
     */
    getAutofillFieldMaxLength(element) {
        const elementHasMaxLengthProperty = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement;
        const elementMaxLength = elementHasMaxLengthProperty && element.maxLength > -1 ? element.maxLength : 999;
        return elementHasMaxLengthProperty ? Math.min(elementMaxLength, 999) : null;
    }
    /**
     * Iterates over the next siblings of the passed element and
     * returns a string of the text content of each element. Will
     * stop iterating if it encounters a new section element.
     * @param {FormFieldElement} element
     * @returns {string}
     * @private
     */
    createAutofillFieldRightLabel(element) {
        const labelTextContent = [];
        let currentElement = element;
        while (currentElement && currentElement.nextSibling) {
            currentElement = currentElement.nextSibling;
            if (this.isNewSectionElement(currentElement)) {
                break;
            }
            const textContent = this.getTextContentFromElement(currentElement);
            if (textContent) {
                labelTextContent.push(textContent);
            }
        }
        return labelTextContent.join("");
    }
    /**
     * Recursively gets the text content from an element's previous siblings
     * and returns a string of the text content of each element.
     * @param {FormFieldElement} element
     * @returns {string}
     * @private
     */
    createAutofillFieldLeftLabel(element) {
        const labelTextContent = this.recursivelyGetTextFromPreviousSiblings(element);
        return labelTextContent.reverse().join("");
    }
    /**
     * Assumes that the input elements that are to be autofilled are within a
     * table structure. Queries the previous sibling of the parent row that
     * the input element is in and returns the text content of the cell that
     * is in the same column as the input element.
     * @param {FormFieldElement} element
     * @returns {string | null}
     * @private
     */
    createAutofillFieldTopLabel(element) {
        var _a, _b;
        const tableDataElement = element.closest("td");
        if (!tableDataElement) {
            return null;
        }
        const tableDataElementIndex = tableDataElement.cellIndex;
        const parentSiblingTableRowElement = (_a = tableDataElement.closest("tr")) === null || _a === void 0 ? void 0 : _a.previousElementSibling;
        return ((_b = parentSiblingTableRowElement === null || parentSiblingTableRowElement === void 0 ? void 0 : parentSiblingTableRowElement.cells) === null || _b === void 0 ? void 0 : _b.length) > tableDataElementIndex
            ? this.getTextContentFromElement(parentSiblingTableRowElement.cells[tableDataElementIndex])
            : null;
    }
    /**
     * Check if the element's tag indicates that a transition to a new section of the
     * page is occurring. If so, we should not use the element or its children in order
     * to get autofill context for the previous element.
     * @param {HTMLElement} currentElement
     * @returns {boolean}
     * @private
     */
    isNewSectionElement(currentElement) {
        if (!currentElement) {
            return true;
        }
        const transitionalElementTagsSet = new Set([
            "html",
            "body",
            "button",
            "form",
            "head",
            "iframe",
            "input",
            "option",
            "script",
            "select",
            "table",
            "textarea",
        ]);
        return ("tagName" in currentElement &&
            transitionalElementTagsSet.has(currentElement.tagName.toLowerCase()));
    }
    /**
     * Gets the text content from a passed element, regardless of whether it is a
     * text node, an element node or an HTMLElement.
     * @param {Node | HTMLElement} element
     * @returns {string}
     * @private
     */
    getTextContentFromElement(element) {
        if (element.nodeType === Node.TEXT_NODE) {
            return this.trimAndRemoveNonPrintableText(element.nodeValue);
        }
        return this.trimAndRemoveNonPrintableText(element.textContent || element.innerText);
    }
    /**
     * Removes non-printable characters from the passed text
     * content and trims leading and trailing whitespace.
     * @param {string} textContent
     * @returns {string}
     * @private
     */
    trimAndRemoveNonPrintableText(textContent) {
        return (textContent || "")
            .replace(/[^\x20-\x7E]+|\s+/g, " ") // Strip out non-primitive characters and replace multiple spaces with a single space
            .trim(); // Trim leading and trailing whitespace
    }
    /**
     * Get the text content from the previous siblings of the element. If
     * no text content is found, recursively get the text content from the
     * previous siblings of the parent element.
     * @param {FormFieldElement} element
     * @returns {string[]}
     * @private
     */
    recursivelyGetTextFromPreviousSiblings(element) {
        const textContentItems = [];
        let currentElement = element;
        while (currentElement && currentElement.previousSibling) {
            // Ensure we are capturing text content from nodes and elements.
            currentElement = currentElement.previousSibling;
            if (this.isNewSectionElement(currentElement)) {
                return textContentItems;
            }
            const textContent = this.getTextContentFromElement(currentElement);
            if (textContent) {
                textContentItems.push(textContent);
            }
        }
        if (!currentElement || textContentItems.length) {
            return textContentItems;
        }
        // Prioritize capturing text content from elements rather than nodes.
        currentElement = currentElement.parentElement || currentElement.parentNode;
        let siblingElement = currentElement instanceof HTMLElement
            ? currentElement.previousElementSibling
            : currentElement.previousSibling;
        while ((siblingElement === null || siblingElement === void 0 ? void 0 : siblingElement.lastChild) && !this.isNewSectionElement(siblingElement)) {
            siblingElement = siblingElement.lastChild;
        }
        if (this.isNewSectionElement(siblingElement)) {
            return textContentItems;
        }
        const textContent = this.getTextContentFromElement(siblingElement);
        if (textContent) {
            textContentItems.push(textContent);
            return textContentItems;
        }
        return this.recursivelyGetTextFromPreviousSiblings(siblingElement);
    }
    /**
     * Get the value of a property or attribute from a FormFieldElement.
     * @param {HTMLElement} element
     * @param {string} attributeName
     * @returns {string | null}
     * @private
     */
    getPropertyOrAttribute(element, attributeName) {
        if (attributeName in element) {
            return element[attributeName];
        }
        return element.getAttribute(attributeName);
    }
    /**
     * Gets the value of the element. If the element is a checkbox, returns a checkmark if the
     * checkbox is checked, or an empty string if it is not checked. If the element is a hidden
     * input, returns the value of the input if it is less than 254 characters, or a truncated
     * value if it is longer than 254 characters.
     * @param {FormFieldElement} element
     * @returns {string}
     * @private
     */
    getElementValue(element) {
        if (element instanceof HTMLSpanElement) {
            const spanTextContent = element.textContent || element.innerText;
            return spanTextContent || "";
        }
        const elementValue = element.value || "";
        const elementType = String(element.type).toLowerCase();
        if ("checked" in element && elementType === "checkbox") {
            return element.checked ? "✓" : "";
        }
        if (elementType === "hidden") {
            const inputValueMaxLength = 254;
            return elementValue.length > inputValueMaxLength
                ? `${elementValue.substring(0, inputValueMaxLength)}...SNIPPED`
                : elementValue;
        }
        return elementValue;
    }
    /**
     * Get the options from a select element and return them as an array
     * of arrays indicating the select element option text and value.
     * @param {HTMLSelectElement} element
     * @returns {{options: (string | null)[][]}}
     * @private
     */
    getSelectElementOptions(element) {
        const options = Array.from(element.options).map((option) => {
            const optionText = option.text
                ? String(option.text)
                    .toLowerCase()
                    .replace(/[\s~`!@$%^&#*()\-_+=:;'"[\]|\\,<.>?]/gm, "") // Remove whitespace and punctuation
                : null;
            return [optionText, option.value];
        });
        return { options };
    }
    /**
     * Queries all potential form and field elements from the DOM and returns
     * a collection of form and field elements. Leverages the TreeWalker API
     * to deep query Shadow DOM elements.
     * @returns {{formElements: Node[], formFieldElements: Node[]}}
     * @private
     */
    queryAutofillFormAndFieldElements() {
        const formElements = [];
        const formFieldElements = [];
        this.queryAllTreeWalkerNodes(document.documentElement, (node) => {
            if (node instanceof HTMLFormElement) {
                formElements.push(node);
                return true;
            }
            if (this.isNodeFormFieldElement(node)) {
                formFieldElements.push(node);
                return true;
            }
            return false;
        });
        return { formElements, formFieldElements };
    }
    /**
     * Checks if the passed node is a form field element.
     * @param {Node} node
     * @returns {boolean}
     * @private
     */
    isNodeFormFieldElement(node) {
        const nodeIsSpanElementWithAutofillAttribute = node instanceof HTMLSpanElement && node.hasAttribute("data-bwautofill");
        const ignoredInputTypes = new Set(["hidden", "submit", "reset", "button", "image", "file"]);
        const nodeIsValidInputElement = node instanceof HTMLInputElement && !ignoredInputTypes.has(node.type);
        const nodeIsTextAreaOrSelectElement = node instanceof HTMLTextAreaElement || node instanceof HTMLSelectElement;
        const nodeIsNonIgnoredFillableControlElement = (nodeIsTextAreaOrSelectElement || nodeIsValidInputElement) &&
            !node.hasAttribute("data-bwignore");
        return nodeIsSpanElementWithAutofillAttribute || nodeIsNonIgnoredFillableControlElement;
    }
    /**
     * Attempts to get the ShadowRoot of the passed node. If support for the
     * extension based openOrClosedShadowRoot API is available, it will be used.
     * @param {Node} node
     * @returns {ShadowRoot | null}
     * @private
     */
    getShadowRoot(node) {
        var _a;
        if (!(node instanceof HTMLElement)) {
            return null;
        }
        if ((_a = chrome.dom) === null || _a === void 0 ? void 0 : _a.openOrClosedShadowRoot) {
            return chrome.dom.openOrClosedShadowRoot(node);
        }
        return node.openOrClosedShadowRoot || node.shadowRoot;
    }
    /**
     * Recursively builds a collection of nodes that match the given filter callback.
     * If a node has a ShadowRoot, it will be observed for mutations.
     * @param {Node} rootNode
     * @param {Node[]} treeWalkerQueryResults
     * @param {Function} filterCallback
     * @param {boolean} isObservingShadowRoot
     * @private
     */
    buildTreeWalkerNodesQueryResults(rootNode, treeWalkerQueryResults, filterCallback, isObservingShadowRoot) {
        const treeWalker = document === null || document === void 0 ? void 0 : document.createTreeWalker(rootNode, NodeFilter.SHOW_ELEMENT);
        let currentNode = treeWalker === null || treeWalker === void 0 ? void 0 : treeWalker.currentNode;
        while (currentNode) {
            if (filterCallback(currentNode)) {
                treeWalkerQueryResults.push(currentNode);
            }
            const nodeShadowRoot = this.getShadowRoot(currentNode);
            if (nodeShadowRoot) {
                if (isObservingShadowRoot) {
                    this.mutationObserver.observe(nodeShadowRoot, {
                        attributes: true,
                        childList: true,
                        subtree: true,
                    });
                }
                this.buildTreeWalkerNodesQueryResults(nodeShadowRoot, treeWalkerQueryResults, filterCallback, isObservingShadowRoot);
            }
            currentNode = treeWalker === null || treeWalker === void 0 ? void 0 : treeWalker.nextNode();
        }
    }
    /**
     * Sets up a mutation observer on the body of the document. Observes changes to
     * DOM elements to ensure we have an updated set of autofill field data.
     * @private
     */
    setupMutationObserver() {
        this.currentLocationHref = globalThis.location.href;
        this.mutationObserver = new MutationObserver(this.handleMutationObserverMutation);
        this.mutationObserver.observe(document.documentElement, {
            attributes: true,
            childList: true,
            subtree: true,
        });
    }
    /**
     * Handles a mutation to the window location. Clears the autofill elements
     * and updates the autofill elements after a timeout.
     * @private
     */
    handleWindowLocationMutation() {
        this.currentLocationHref = globalThis.location.href;
        this.domRecentlyMutated = true;
        this.noFieldsFound = false;
        this.autofillFormElements.clear();
        this.autofillFieldElements.clear();
        this.updateAutofillElementsAfterMutation();
    }
    /**
     * Checks if the passed nodes either contain or are autofill elements.
     * @param {NodeList} nodes
     * @param {boolean} isRemovingNodes
     * @returns {boolean}
     * @private
     */
    isAutofillElementNodeMutated(nodes, isRemovingNodes = false) {
        if (!nodes.length) {
            return false;
        }
        let isElementMutated = false;
        const mutatedElements = [];
        for (let index = 0; index < nodes.length; index++) {
            const node = nodes[index];
            if (!(node instanceof HTMLElement)) {
                continue;
            }
            if (node instanceof HTMLFormElement || this.isNodeFormFieldElement(node)) {
                isElementMutated = true;
                mutatedElements.push(node);
                continue;
            }
            const childNodes = this.queryAllTreeWalkerNodes(node, (node) => node instanceof HTMLFormElement || this.isNodeFormFieldElement(node));
            if (childNodes.length) {
                isElementMutated = true;
                mutatedElements.push(...childNodes);
            }
        }
        if (isRemovingNodes) {
            for (let elementIndex = 0; elementIndex < mutatedElements.length; elementIndex++) {
                this.deleteCachedAutofillElement(mutatedElements[elementIndex]);
            }
        }
        return isElementMutated;
    }
    /**
     * Deletes any cached autofill elements that have been
     * removed from the DOM.
     * @param {ElementWithOpId<HTMLFormElement> | ElementWithOpId<FormFieldElement>} element
     * @private
     */
    deleteCachedAutofillElement(element) {
        if (element instanceof HTMLFormElement && this.autofillFormElements.has(element)) {
            this.autofillFormElements.delete(element);
            return;
        }
        if (this.autofillFieldElements.has(element)) {
            this.autofillFieldElements.delete(element);
        }
    }
    /**
     * Updates the autofill elements after a DOM mutation has occurred.
     * Is debounced to prevent excessive updates.
     * @private
     */
    updateAutofillElementsAfterMutation() {
        if (this.updateAutofillElementsAfterMutationTimeout) {
            clearTimeout(this.updateAutofillElementsAfterMutationTimeout);
        }
        this.updateAutofillElementsAfterMutationTimeout = setTimeout(this.getPageDetails.bind(this), this.updateAfterMutationTimeoutDelay);
    }
    /**
     * Handles observed DOM mutations related to an autofill element attribute.
     * @param {MutationRecord} mutation
     * @private
     */
    handleAutofillElementAttributeMutation(mutation) {
        var _a;
        const targetElement = mutation.target;
        if (!(targetElement instanceof HTMLElement)) {
            return;
        }
        const attributeName = (_a = mutation.attributeName) === null || _a === void 0 ? void 0 : _a.toLowerCase();
        const autofillForm = this.autofillFormElements.get(targetElement);
        if (autofillForm) {
            this.updateAutofillFormElementData(attributeName, targetElement, autofillForm);
            return;
        }
        const autofillField = this.autofillFieldElements.get(targetElement);
        if (!autofillField) {
            return;
        }
        this.updateAutofillFieldElementData(attributeName, targetElement, autofillField);
    }
    /**
     * Updates the autofill form element data based on the passed attribute name.
     * @param {string} attributeName
     * @param {ElementWithOpId<HTMLFormElement>} element
     * @param {AutofillForm} dataTarget
     * @private
     */
    updateAutofillFormElementData(attributeName, element, dataTarget) {
        const updateAttribute = (dataTargetKey) => {
            this.updateAutofillDataAttribute({ element, attributeName, dataTarget, dataTargetKey });
        };
        const updateActions = {
            action: () => (dataTarget.htmlAction = this.getFormActionAttribute(element)),
            name: () => updateAttribute("htmlName"),
            id: () => updateAttribute("htmlID"),
            method: () => updateAttribute("htmlMethod"),
        };
        if (!updateActions[attributeName]) {
            return;
        }
        updateActions[attributeName]();
        this.autofillFormElements.set(element, dataTarget);
    }
    /**
     * Updates the autofill field element data based on the passed attribute name.
     * @param {string} attributeName
     * @param {ElementWithOpId<FormFieldElement>} element
     * @param {AutofillField} dataTarget
     * @returns {Promise<void>}
     * @private
     */
    updateAutofillFieldElementData(attributeName, element, dataTarget) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const updateAttribute = (dataTargetKey) => {
                this.updateAutofillDataAttribute({ element, attributeName, dataTarget, dataTargetKey });
            };
            const updateActions = {
                maxlength: () => (dataTarget.maxLength = this.getAutofillFieldMaxLength(element)),
                id: () => updateAttribute("htmlID"),
                name: () => updateAttribute("htmlName"),
                class: () => updateAttribute("htmlClass"),
                tabindex: () => updateAttribute("tabindex"),
                title: () => updateAttribute("tabindex"),
                rel: () => updateAttribute("rel"),
                tagname: () => (dataTarget.tagName = this.getAttributeLowerCase(element, "tagName")),
                type: () => (dataTarget.type = this.getAttributeLowerCase(element, "type")),
                value: () => (dataTarget.value = this.getElementValue(element)),
                checked: () => (dataTarget.checked = this.getAttributeBoolean(element, "checked")),
                disabled: () => (dataTarget.disabled = this.getAttributeBoolean(element, "disabled")),
                readonly: () => (dataTarget.readonly = this.getAttributeBoolean(element, "readonly")),
                autocomplete: () => (dataTarget.autoCompleteType = this.getAutoCompleteAttribute(element)),
                "data-label": () => updateAttribute("label-data"),
                "aria-label": () => updateAttribute("label-aria"),
                "aria-hidden": () => (dataTarget["aria-hidden"] = this.getAttributeBoolean(element, "aria-hidden", true)),
                "aria-disabled": () => (dataTarget["aria-disabled"] = this.getAttributeBoolean(element, "aria-disabled", true)),
                "aria-haspopup": () => (dataTarget["aria-haspopup"] = this.getAttributeBoolean(element, "aria-haspopup", true)),
                "data-stripe": () => updateAttribute("data-stripe"),
            };
            if (!updateActions[attributeName]) {
                return;
            }
            updateActions[attributeName]();
            const visibilityAttributesSet = new Set(["class", "style"]);
            if (visibilityAttributesSet.has(attributeName) &&
                !((_a = dataTarget.htmlClass) === null || _a === void 0 ? void 0 : _a.includes("com-bitwarden-browser-animated-fill"))) {
                dataTarget.viewable = yield this.domElementVisibilityService.isFormFieldViewable(element);
            }
            this.autofillFieldElements.set(element, dataTarget);
        });
    }
    /**
     * Gets the attribute value for the passed element, and returns it. If the dataTarget
     * and dataTargetKey are passed, it will set the value of the dataTarget[dataTargetKey].
     * @param UpdateAutofillDataAttributeParams
     * @returns {string}
     * @private
     */
    updateAutofillDataAttribute({ element, attributeName, dataTarget, dataTargetKey, }) {
        const attributeValue = this.getPropertyOrAttribute(element, attributeName);
        if (dataTarget && dataTargetKey) {
            dataTarget[dataTargetKey] = attributeValue;
        }
        return attributeValue;
    }
}
/* harmony default export */ const collect_autofill_content_service = (CollectAutofillContentService);

;// CONCATENATED MODULE: ./src/autofill/services/dom-element-visibility.service.ts
var dom_element_visibility_service_awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class DomElementVisibilityService {
    constructor() {
        this.cachedComputedStyle = null;
    }
    /**
     * Checks if a form field is viewable. This is done by checking if the element is within the
     * viewport bounds, not hidden by CSS, and not hidden behind another element.
     * @param {FormFieldElement} element
     * @returns {Promise<boolean>}
     */
    isFormFieldViewable(element) {
        return dom_element_visibility_service_awaiter(this, void 0, void 0, function* () {
            const elementBoundingClientRect = element.getBoundingClientRect();
            if (this.isElementOutsideViewportBounds(element, elementBoundingClientRect) ||
                this.isElementHiddenByCss(element)) {
                return false;
            }
            return this.formFieldIsNotHiddenBehindAnotherElement(element, elementBoundingClientRect);
        });
    }
    /**
     * Check if the target element is hidden using CSS. This is done by checking the opacity, display,
     * visibility, and clip-path CSS properties of the element. We also check the opacity of all
     * parent elements to ensure that the target element is not hidden by a parent element.
     * @param {HTMLElement} element
     * @returns {boolean}
     * @public
     */
    isElementHiddenByCss(element) {
        this.cachedComputedStyle = null;
        if (this.isElementInvisible(element) ||
            this.isElementNotDisplayed(element) ||
            this.isElementNotVisible(element) ||
            this.isElementClipped(element)) {
            return true;
        }
        let parentElement = element.parentElement;
        while (parentElement && parentElement !== element.ownerDocument.documentElement) {
            this.cachedComputedStyle = null;
            if (this.isElementInvisible(parentElement)) {
                return true;
            }
            parentElement = parentElement.parentElement;
        }
        return false;
    }
    /**
     * Gets the computed style of a given element, will only calculate the computed
     * style if the element's style has not been previously cached.
     * @param {HTMLElement} element
     * @param {string} styleProperty
     * @returns {string}
     * @private
     */
    getElementStyle(element, styleProperty) {
        if (!this.cachedComputedStyle) {
            this.cachedComputedStyle = (element.ownerDocument.defaultView || window).getComputedStyle(element);
        }
        return this.cachedComputedStyle.getPropertyValue(styleProperty);
    }
    /**
     * Checks if the opacity of the target element is less than 0.1.
     * @param {HTMLElement} element
     * @returns {boolean}
     * @private
     */
    isElementInvisible(element) {
        return parseFloat(this.getElementStyle(element, "opacity")) < 0.1;
    }
    /**
     * Checks if the target element has a display property of none.
     * @param {HTMLElement} element
     * @returns {boolean}
     * @private
     */
    isElementNotDisplayed(element) {
        return this.getElementStyle(element, "display") === "none";
    }
    /**
     * Checks if the target element has a visibility property of hidden or collapse.
     * @param {HTMLElement} element
     * @returns {boolean}
     * @private
     */
    isElementNotVisible(element) {
        return new Set(["hidden", "collapse"]).has(this.getElementStyle(element, "visibility"));
    }
    /**
     * Checks if the target element has a clip-path property that hides the element.
     * @param {HTMLElement} element
     * @returns {boolean}
     * @private
     */
    isElementClipped(element) {
        return new Set([
            "inset(50%)",
            "inset(100%)",
            "circle(0)",
            "circle(0px)",
            "circle(0px at 50% 50%)",
            "polygon(0 0, 0 0, 0 0, 0 0)",
            "polygon(0px 0px, 0px 0px, 0px 0px, 0px 0px)",
        ]).has(this.getElementStyle(element, "clipPath"));
    }
    /**
     * Checks if the target element is outside the viewport bounds. This is done by checking if the
     * element is too small or is overflowing the viewport bounds.
     * @param {HTMLElement} targetElement
     * @param {DOMRectReadOnly | null} targetElementBoundingClientRect
     * @returns {boolean}
     * @private
     */
    isElementOutsideViewportBounds(targetElement, targetElementBoundingClientRect = null) {
        const documentElement = targetElement.ownerDocument.documentElement;
        const documentElementWidth = documentElement.scrollWidth;
        const documentElementHeight = documentElement.scrollHeight;
        const elementBoundingClientRect = targetElementBoundingClientRect || targetElement.getBoundingClientRect();
        const elementTopOffset = elementBoundingClientRect.top - documentElement.clientTop;
        const elementLeftOffset = elementBoundingClientRect.left - documentElement.clientLeft;
        const isElementSizeInsufficient = elementBoundingClientRect.width < 10 || elementBoundingClientRect.height < 10;
        const isElementOverflowingLeftViewport = elementLeftOffset < 0;
        const isElementOverflowingRightViewport = elementLeftOffset + elementBoundingClientRect.width > documentElementWidth;
        const isElementOverflowingTopViewport = elementTopOffset < 0;
        const isElementOverflowingBottomViewport = elementTopOffset + elementBoundingClientRect.height > documentElementHeight;
        return (isElementSizeInsufficient ||
            isElementOverflowingLeftViewport ||
            isElementOverflowingRightViewport ||
            isElementOverflowingTopViewport ||
            isElementOverflowingBottomViewport);
    }
    /**
     * Checks if a passed FormField is not hidden behind another element. This is done by
     * checking if the element at the center point of the FormField is the FormField itself
     * or one of its labels.
     * @param {FormFieldElement} targetElement
     * @param {DOMRectReadOnly | null} targetElementBoundingClientRect
     * @returns {boolean}
     * @private
     */
    formFieldIsNotHiddenBehindAnotherElement(targetElement, targetElementBoundingClientRect = null) {
        var _a;
        const elementBoundingClientRect = targetElementBoundingClientRect || targetElement.getBoundingClientRect();
        const elementRootNode = targetElement.getRootNode();
        const rootElement = elementRootNode instanceof ShadowRoot ? elementRootNode : targetElement.ownerDocument;
        const elementAtCenterPoint = rootElement.elementFromPoint(elementBoundingClientRect.left + elementBoundingClientRect.width / 2, elementBoundingClientRect.top + elementBoundingClientRect.height / 2);
        if (elementAtCenterPoint === targetElement) {
            return true;
        }
        const targetElementLabelsSet = new Set(targetElement.labels);
        if (targetElementLabelsSet.has(elementAtCenterPoint)) {
            return true;
        }
        const closestParentLabel = (_a = elementAtCenterPoint === null || elementAtCenterPoint === void 0 ? void 0 : elementAtCenterPoint.parentElement) === null || _a === void 0 ? void 0 : _a.closest("label");
        return targetElementLabelsSet.has(closestParentLabel);
    }
}
/* harmony default export */ const dom_element_visibility_service = (DomElementVisibilityService);

;// CONCATENATED MODULE: ./src/autofill/constants.ts
const TYPE_CHECK = {
    FUNCTION: "function",
    NUMBER: "number",
    STRING: "string",
};
const EVENTS = {
    CHANGE: "change",
    INPUT: "input",
    KEYDOWN: "keydown",
    KEYPRESS: "keypress",
    KEYUP: "keyup",
};
/* Context Menu item Ids */
const AUTOFILL_CARD_ID = "autofill-card";
const AUTOFILL_ID = "autofill";
const AUTOFILL_IDENTITY_ID = "autofill-identity";
const COPY_IDENTIFIER_ID = "copy-identifier";
const COPY_PASSWORD_ID = "copy-password";
const COPY_USERNAME_ID = "copy-username";
const COPY_VERIFICATIONCODE_ID = "copy-totp";
const CREATE_CARD_ID = "create-card";
const CREATE_IDENTITY_ID = "create-identity";
const CREATE_LOGIN_ID = "create-login";
const GENERATE_PASSWORD_ID = "generate-password";
const NOOP_COMMAND_SUFFIX = "noop";
const ROOT_ID = "root";
const SEPARATOR_ID = "separator";

;// CONCATENATED MODULE: ./src/autofill/services/insert-autofill-content.service.ts

class InsertAutofillContentService {
    /**
     * InsertAutofillContentService constructor. Instantiates the
     * DomElementVisibilityService and CollectAutofillContentService classes.
     */
    constructor(domElementVisibilityService, collectAutofillContentService) {
        this.autofillInsertActions = {
            fill_by_opid: ({ opid, value }) => this.handleFillFieldByOpidAction(opid, value),
            click_on_opid: ({ opid }) => this.handleClickOnFieldByOpidAction(opid),
            focus_by_opid: ({ opid }) => this.handleFocusOnFieldByOpidAction(opid),
        };
        /**
         * Runs the autofill action based on the action type and the opid.
         * Each action is subsequently delayed by 20 milliseconds.
         * @param {FillScriptActions} action
         * @param {string} opid
         * @param {string} value
         * @param {number} actionIndex
         */
        this.runFillScriptAction = ([action, opid, value], actionIndex) => {
            if (!opid || !this.autofillInsertActions[action]) {
                return;
            }
            const delayActionsInMilliseconds = 20;
            setTimeout(() => this.autofillInsertActions[action]({ opid, value }), delayActionsInMilliseconds * actionIndex);
        };
        this.domElementVisibilityService = domElementVisibilityService;
        this.collectAutofillContentService = collectAutofillContentService;
    }
    /**
     * Handles autofill of the forms on the current page based on the
     * data within the passed fill script object.
     * @param {AutofillScript} fillScript
     * @public
     */
    fillForm(fillScript) {
        var _a;
        if (!((_a = fillScript.script) === null || _a === void 0 ? void 0 : _a.length) ||
            this.fillingWithinSandboxedIframe() ||
            this.userCancelledInsecureUrlAutofill(fillScript.savedUrls) ||
            this.userCancelledUntrustedIframeAutofill(fillScript)) {
            return;
        }
        fillScript.script.forEach(this.runFillScriptAction);
    }
    /**
     * Identifies if the execution of this script is happening
     * within a sandboxed iframe.
     * @returns {boolean}
     * @private
     */
    fillingWithinSandboxedIframe() {
        var _a;
        return (String(self.origin).toLowerCase() === "null" ||
            ((_a = window.frameElement) === null || _a === void 0 ? void 0 : _a.hasAttribute("sandbox")) ||
            window.location.hostname === "");
    }
    /**
     * Checks if the autofill is occurring on a page that can be considered secure. If the page is not secure,
     * the user is prompted to confirm that they want to autofill on the page.
     * @param {string[] | null} savedUrls
     * @returns {boolean}
     * @private
     */
    userCancelledInsecureUrlAutofill(savedUrls) {
        if (!(savedUrls === null || savedUrls === void 0 ? void 0 : savedUrls.some((url) => url.startsWith(`https://${window.location.hostname}`))) ||
            window.location.protocol !== "http:" ||
            !this.isPasswordFieldWithinDocument()) {
            return false;
        }
        const confirmationWarning = [
            chrome.i18n.getMessage("insecurePageWarning"),
            chrome.i18n.getMessage("insecurePageWarningFillPrompt", [window.location.hostname]),
        ].join("\n\n");
        return !confirm(confirmationWarning);
    }
    /**
     * Checks if there is a password field within the current document. Includes
     * password fields that are present within the shadow DOM.
     * @returns {boolean}
     * @private
     */
    isPasswordFieldWithinDocument() {
        var _a;
        return Boolean((_a = this.collectAutofillContentService.queryAllTreeWalkerNodes(document.documentElement, (node) => node instanceof HTMLInputElement && node.type === "password", false)) === null || _a === void 0 ? void 0 : _a.length);
    }
    /**
     * Checking if the autofill is occurring within an untrusted iframe. If the page is within an untrusted iframe,
     * the user is prompted to confirm that they want to autofill on the page. If the user cancels the autofill,
     * the script will not continue.
     *
     * Note: confirm() is blocked by sandboxed iframes, but we don't want to fill sandboxed iframes anyway.
     * If this occurs, confirm() returns false without displaying the dialog box, and autofill will be aborted.
     * The browser may print a message to the console, but this is not a standard error that we can handle.
     * @param {AutofillScript} fillScript
     * @returns {boolean}
     * @private
     */
    userCancelledUntrustedIframeAutofill(fillScript) {
        if (!fillScript.untrustedIframe) {
            return false;
        }
        const confirmationWarning = [
            chrome.i18n.getMessage("autofillIframeWarning"),
            chrome.i18n.getMessage("autofillIframeWarningTip", [window.location.hostname]),
        ].join("\n\n");
        return !confirm(confirmationWarning);
    }
    /**
     * Queries the DOM for an element by opid and inserts the passed value into the element.
     * @param {string} opid
     * @param {string} value
     * @private
     */
    handleFillFieldByOpidAction(opid, value) {
        const element = this.collectAutofillContentService.getAutofillFieldElementByOpid(opid);
        this.insertValueIntoField(element, value);
    }
    /**
     * Handles finding an element by opid and triggering a click event on the element.
     * @param {string} opid
     * @private
     */
    handleClickOnFieldByOpidAction(opid) {
        const element = this.collectAutofillContentService.getAutofillFieldElementByOpid(opid);
        this.triggerClickOnElement(element);
    }
    /**
     * Handles finding an element by opid and triggering click and focus events on the element.
     * @param {string} opid
     * @private
     */
    handleFocusOnFieldByOpidAction(opid) {
        const element = this.collectAutofillContentService.getAutofillFieldElementByOpid(opid);
        this.simulateUserMouseClickAndFocusEventInteractions(element, true);
    }
    /**
     * Identifies the type of element passed and inserts the value into the element.
     * Will trigger simulated events on the element to ensure that the element is
     * properly updated.
     * @param {FormFieldElement | null} element
     * @param {string} value
     * @private
     */
    insertValueIntoField(element, value) {
        const elementCanBeReadonly = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement;
        const elementCanBeFilled = elementCanBeReadonly || element instanceof HTMLSelectElement;
        if (!element ||
            !value ||
            (elementCanBeReadonly && element.readOnly) ||
            (elementCanBeFilled && element.disabled)) {
            return;
        }
        if (element instanceof HTMLSpanElement) {
            this.handleInsertValueAndTriggerSimulatedEvents(element, () => (element.innerText = value));
            return;
        }
        const isFillableCheckboxOrRadioElement = element instanceof HTMLInputElement &&
            new Set(["checkbox", "radio"]).has(element.type) &&
            new Set(["true", "y", "1", "yes", "✓"]).has(String(value).toLowerCase());
        if (isFillableCheckboxOrRadioElement) {
            this.handleInsertValueAndTriggerSimulatedEvents(element, () => (element.checked = true));
            return;
        }
        this.handleInsertValueAndTriggerSimulatedEvents(element, () => (element.value = value));
    }
    /**
     * Simulates pre- and post-insert events on the element meant to mimic user interactions
     * while inserting the autofill value into the element.
     * @param {FormFieldElement} element
     * @param {Function} valueChangeCallback
     * @private
     */
    handleInsertValueAndTriggerSimulatedEvents(element, valueChangeCallback) {
        this.triggerPreInsertEventsOnElement(element);
        valueChangeCallback();
        this.triggerPostInsertEventsOnElement(element);
        this.triggerFillAnimationOnElement(element);
    }
    /**
     * Simulates a mouse click event on the element, including focusing the event, and
     * the triggers a simulated keyboard event on the element. Will attempt to ensure
     * that the initial element value is not arbitrarily changed by the simulated events.
     * @param {FormFieldElement} element
     * @private
     */
    triggerPreInsertEventsOnElement(element) {
        const initialElementValue = "value" in element ? element.value : "";
        this.simulateUserMouseClickAndFocusEventInteractions(element);
        this.simulateUserKeyboardEventInteractions(element);
        if ("value" in element && initialElementValue !== element.value) {
            element.value = initialElementValue;
        }
    }
    /**
     * Simulates a keyboard event on the element before assigning the autofilled value to the element, and then
     * simulates an input change event on the element to trigger expected events after autofill occurs.
     * @param {FormFieldElement} element
     * @private
     */
    triggerPostInsertEventsOnElement(element) {
        const autofilledValue = "value" in element ? element.value : "";
        this.simulateUserKeyboardEventInteractions(element);
        if ("value" in element && autofilledValue !== element.value) {
            element.value = autofilledValue;
        }
        this.simulateInputElementChangedEvent(element);
        element.blur();
    }
    /**
     * Identifies if a passed element can be animated and sets a class on the element
     * to trigger a CSS animation. The animation is removed after a short delay.
     * @param {FormFieldElement} element
     * @private
     */
    triggerFillAnimationOnElement(element) {
        const skipAnimatingElement = !(element instanceof HTMLSpanElement) &&
            !new Set(["email", "text", "password", "number", "tel", "url"]).has(element === null || element === void 0 ? void 0 : element.type);
        if (this.domElementVisibilityService.isElementHiddenByCss(element) || skipAnimatingElement) {
            return;
        }
        element.classList.add("com-bitwarden-browser-animated-fill");
        setTimeout(() => element.classList.remove("com-bitwarden-browser-animated-fill"), 200);
    }
    /**
     * Simulates a click  event on the element.
     * @param {HTMLElement} element
     * @private
     */
    triggerClickOnElement(element) {
        if (typeof (element === null || element === void 0 ? void 0 : element.click) !== TYPE_CHECK.FUNCTION) {
            return;
        }
        element.click();
    }
    /**
     * Simulates a focus event on the element. Will optionally reset the value of the element
     * if the element has a value property.
     * @param {HTMLElement | undefined} element
     * @param {boolean} shouldResetValue
     * @private
     */
    triggerFocusOnElement(element, shouldResetValue = false) {
        if (typeof (element === null || element === void 0 ? void 0 : element.focus) !== TYPE_CHECK.FUNCTION) {
            return;
        }
        let initialValue = "";
        if (shouldResetValue && "value" in element) {
            initialValue = String(element.value);
        }
        element.focus();
        if (initialValue && "value" in element) {
            element.value = initialValue;
        }
    }
    /**
     * Simulates a mouse click and focus event on the element.
     * @param {FormFieldElement} element
     * @param {boolean} shouldResetValue
     * @private
     */
    simulateUserMouseClickAndFocusEventInteractions(element, shouldResetValue = false) {
        this.triggerClickOnElement(element);
        this.triggerFocusOnElement(element, shouldResetValue);
    }
    /**
     * Simulates several keyboard events on the element, mocking a user interaction with the element.
     * @param {FormFieldElement} element
     * @private
     */
    simulateUserKeyboardEventInteractions(element) {
        [EVENTS.KEYDOWN, EVENTS.KEYPRESS, EVENTS.KEYUP].forEach((eventType) => element.dispatchEvent(new KeyboardEvent(eventType, { bubbles: true })));
    }
    /**
     * Simulates an input change event on the element, mocking behavior that would occur if a user
     * manually changed a value for the element.
     * @param {FormFieldElement} element
     * @private
     */
    simulateInputElementChangedEvent(element) {
        [EVENTS.INPUT, EVENTS.CHANGE].forEach((eventType) => element.dispatchEvent(new Event(eventType, { bubbles: true })));
    }
}
/* harmony default export */ const insert_autofill_content_service = (InsertAutofillContentService);

;// CONCATENATED MODULE: ./src/autofill/content/autofill-init.ts
var autofill_init_awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};



class AutofillInit {
    /**
     * AutofillInit constructor. Initializes the DomElementVisibilityService,
     * CollectAutofillContentService and InsertAutofillContentService classes.
     */
    constructor() {
        this.extensionMessageHandlers = {
            collectPageDetails: ({ message }) => this.collectPageDetails(message),
            collectPageDetailsImmediately: ({ message }) => this.collectPageDetails(message, true),
            fillForm: ({ message }) => this.fillForm(message.fillScript),
        };
        /**
         * Handles the extension messages
         * sent to the content script.
         * @param {AutofillExtensionMessage} message
         * @param {chrome.runtime.MessageSender} sender
         * @param {(response?: any) => void} sendResponse
         * @returns {boolean}
         * @private
         */
        this.handleExtensionMessage = (message, sender, sendResponse) => {
            const command = message.command;
            const handler = this.extensionMessageHandlers[command];
            if (!handler) {
                return false;
            }
            const messageResponse = handler({ message, sender });
            if (!messageResponse) {
                return false;
            }
            Promise.resolve(messageResponse).then((response) => sendResponse(response));
            return true;
        };
        this.domElementVisibilityService = new dom_element_visibility_service();
        this.collectAutofillContentService = new collect_autofill_content_service(this.domElementVisibilityService);
        this.insertAutofillContentService = new insert_autofill_content_service(this.domElementVisibilityService, this.collectAutofillContentService);
    }
    /**
     * Initializes the autofill content script, setting up
     * the extension message listeners. This method should
     * be called once when the content script is loaded.
     * @public
     */
    init() {
        this.setupExtensionMessageListeners();
    }
    /**
     * Collects the page details and sends them to the
     * extension background script. If the `sendDetailsInResponse`
     * parameter is set to true, the page details will be
     * returned to facilitate sending the details in the
     * response to the extension message.
     * @param {AutofillExtensionMessage} message
     * @param {boolean} sendDetailsInResponse
     * @returns {AutofillPageDetails | void}
     * @private
     */
    collectPageDetails(message, sendDetailsInResponse = false) {
        return autofill_init_awaiter(this, void 0, void 0, function* () {
            const pageDetails = yield this.collectAutofillContentService.getPageDetails();
            if (sendDetailsInResponse) {
                return pageDetails;
            }
            chrome.runtime.sendMessage({
                command: "collectPageDetailsResponse",
                tab: message.tab,
                details: pageDetails,
                sender: message.sender,
            });
        });
    }
    /**
     * Fills the form with the given fill script.
     * @param {AutofillScript} fillScript
     * @private
     */
    fillForm(fillScript) {
        this.insertAutofillContentService.fillForm(fillScript);
    }
    /**
     * Sets up the extension message listeners
     * for the content script.
     * @private
     */
    setupExtensionMessageListeners() {
        chrome.runtime.onMessage.addListener(this.handleExtensionMessage);
    }
}
(function () {
    if (!window.bitwardenAutofillInit) {
        window.bitwardenAutofillInit = new AutofillInit();
        window.bitwardenAutofillInit.init();
    }
})();

/******/ })()
;