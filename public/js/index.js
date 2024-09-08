function createEditButton() {
    const editButton = document.createElement('button');
    editButton.textContent = 'Edit';
    editButton.classList.add('edit-button');
    return editButton;
}

/**
 * Switches to text (that can't be edited, after the user hits enter)
 * to be used after user hits Enter key
 * @param {Element} inputField the input field element
 * @param {Element} parentTd the parent <td> element
 */
async function switchToText(inputField, parentTd) {
    const text = inputField.value;
    console.log({
        'Entered text': text,
        'Transaction ID': inputField.getAttribute('data-transaction-id')
    });
    const textNode = document.createElement('span');
    textNode.textContent = text;

    const transactionId = inputField.dataset.transactionId;

    // checks body tag for isAuthenticated attributed
    const isAuthenticated = document.body.dataset.isAuthenticated === 'true';

    if (isAuthenticated) {
        try {
            // db stuff
            const response = await fetch('/update-description', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify( { transactionId, description: text} )
            });

            if (response.ok) {
                console.log('Description updated successfully');
            } else {
                console.error('Failed to update description');
            }
        } catch {
            console.error('Error:', error);
        }
    } else {
        console.log('User is not authenticated. Description is not saved to database.');
    }

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