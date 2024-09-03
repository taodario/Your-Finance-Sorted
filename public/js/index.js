function createEditButton() {
    const editButton = document.createElement('button');
    editButton.textContent = 'Edit';
    editButton.classList.add('edit-button');
    return editButton;
}

document.addEventListener('DOMContentLoaded', (event) => {
    const inputField = document.querySelectorAll('.editableInput');

    inputField.forEach(inputField => {
        inputField.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault(); // prevents default enter key behaviours
                const text = inputField.value;
                console.log(text);
    
                const parentTd = inputField.parentElement;
                
                const textNode = document.createElement('span');
                textNode.textContent = text;
                parentTd.replaceChild(textNode, inputField);
            }
        })
    })
})