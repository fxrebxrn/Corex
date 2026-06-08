function showToast(message, duration = 4000) {
    let container = document.querySelector('#toast-container');

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;

    container.appendChild(toast);

    const existingToasts = container.querySelectorAll('.toast-notification');
        if (existingToasts.length >= 4) {
            const oldestToast = existingToasts[0];
            oldestToast.classList.remove('show');

            setTimeout(() => {
                oldestToast.remove();
            }, 300);
        }

    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, duration);
}

const formatErrorMessage = (errorItem, fieldName) => {
    const friendlyName = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);

    switch (errorItem.type) {
        case "string_too_short":
            return `${friendlyName} must be at least ${errorItem.ctx.min_length} characters`;
        case "string_too_long":
            return `${friendlyName} must be no more than ${errorItem.ctx.max_length} characters`;
        case "value_error":
            return errorItem.msg.replace("Value error, ", "");
        case "missing":
            return `${friendlyName} is required`;
        default:
            return errorItem.msg.replace("String", friendlyName);
    }
};
