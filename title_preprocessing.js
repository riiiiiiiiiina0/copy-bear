document.addEventListener('DOMContentLoaded', () => {
    const rulesContainer = document.getElementById('rules-container');
    const addRuleBtn = document.getElementById('add-rule-btn');
    const saveRulesBtn = document.getElementById('save-rules-btn');
    const ruleTemplate = document.getElementById('rule-template');
    const actionTemplate = document.getElementById('action-template');

    // Load existing rules from storage
    loadRules();

    addRuleBtn.addEventListener('click', () => {
        const newRule = createRuleElement();
        rulesContainer.appendChild(newRule);
    });

    saveRulesBtn.addEventListener('click', () => {
        saveRules();
    });

    function createRuleElement(ruleData = { url: '', actions: [] }) {
        const ruleFragment = ruleTemplate.content.cloneNode(true);
        const ruleElement = ruleFragment.querySelector('.rule');
        const urlInput = ruleElement.querySelector('.rule-url');
        const actionsContainer = ruleElement.querySelector('.actions-container');
        const addActionBtn = ruleElement.querySelector('.add-action-btn');
        const removeRuleBtn = ruleElement.querySelector('.remove-rule-btn');

        urlInput.value = ruleData.url;

        ruleData.actions.forEach(actionData => {
            const actionElement = createActionElement(actionData);
            actionsContainer.appendChild(actionElement);
        });

        addActionBtn.addEventListener('click', () => {
            const newAction = createActionElement();
            actionsContainer.appendChild(newAction);
        });

        removeRuleBtn.addEventListener('click', () => {
            ruleElement.remove();
        });

        return ruleElement;
    }

    function createActionElement(actionData = { type: 'add_prefix', value1: '', value2: '' }) {
        const actionFragment = actionTemplate.content.cloneNode(true);
        const actionElement = actionFragment.querySelector('.action');
        const typeSelect = actionElement.querySelector('.action-type');
        const value1Input = actionElement.querySelector('.action-value-1');
        const value2Input = actionElement.querySelector('.action-value-2');
        const removeActionBtn = actionElement.querySelector('.remove-action-btn');

        typeSelect.value = actionData.type;
        value1Input.value = actionData.value1;
        value2Input.value = actionData.value2;

        function toggleValue2Input() {
            if (typeSelect.value === 'replace') {
                value2Input.style.display = 'block';
            } else {
                value2Input.style.display = 'none';
            }
        }

        toggleValue2Input();
        typeSelect.addEventListener('change', toggleValue2Input);

        removeActionBtn.addEventListener('click', () => {
            actionElement.remove();
        });

        return actionElement;
    }

    async function loadRules() {
        const result = await chrome.storage.sync.get({ titlePreprocessingRules: [] });
        const rules = result.titlePreprocessingRules;
        rules.forEach(ruleData => {
            const ruleElement = createRuleElement(ruleData);
            rulesContainer.appendChild(ruleElement);
        });
    }

    async function saveRules() {
        const rules = [];
        const ruleElements = rulesContainer.querySelectorAll('.rule');
        ruleElements.forEach(ruleElement => {
            const url = ruleElement.querySelector('.rule-url').value;
            const actions = [];
            const actionElements = ruleElement.querySelectorAll('.action');
            actionElements.forEach(actionElement => {
                const type = actionElement.querySelector('.action-type').value;
                const value1 = actionElement.querySelector('.action-value-1').value;
                const value2 = actionElement.querySelector('.action-value-2').value;
                actions.push({ type, value1, value2 });
            });
            if (url) { // Only save rules that have a URL
                rules.push({ url, actions });
            }
        });

        await chrome.storage.sync.set({ titlePreprocessingRules: rules });
        // You can add a status message here to confirm saving
        alert('Rules saved!');
    }
});
