function createEditButton() {
    const editButton = document.createElement('button');
    editButton.textContent = 'Edit';
    editButton.classList.add('edit-button');
    return editButton;
}

/**
 * Switches to text (that can't be edited)
 * to be used after user hits Enter key
 * @param {Element} inputField the input field element
 * @param {Element} parentTd the parent <td> element
 */
function switchToText(inputField, parentTd) {
    const text = inputField.value;
    console.log('Entered text: ', text);

    const textNode = document.createElement('span');
    textNode.textContent = text;

    parentTd.removeChild(inputField);

    const editButton = createEditButton();
    parentTd.appendChild(textNode);
    parentTd.appendChild(editButton); // we are adding the edit button here.

    editButton.addEventListener('click', () => {
        switchToInput(textNode, parentTd);
    });
}

/**
 * Switches to input, meaning that the user can now input things.
 * @param {Element} textNode 
 * @param {*} parentTd 
 */
function switchToInput(textNode, parentTd) {
    //find and remove edit button
    const previousEditButton = parentTd.querySelector('.edit-button');
    if (previousEditButton) {
        parentTd.removeChild(previousEditButton);
    }

    const inputField = document.createElement('input');
    inputField.type = 'text';
    inputField.classList.add('editableInput');
    inputField.value = textNode.textContent;

    parentTd.removeChild(textNode);

    // const editButton = createEditButton();
    parentTd.appendChild(inputField);
    // parentTd.appendChild(editButton);

    inputField.focus();

    inputField.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            switchToText(inputField, parentTd);
        }
    })
}

document.addEventListener('DOMContentLoaded', (event) => {
    const inputFields = document.querySelectorAll('.editableInput');

    inputFields.forEach(inputField => {
        inputField.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault(); // prevents default enter key behaviours

                const parentTd = inputField.parentElement;
                switchToText(inputField, parentTd);
            }
        })
    })
})