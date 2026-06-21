export function showToast(message, type = 'error', duration = 4000) {
    const container = document.querySelector('#toast-container');

    const toast = document.createElement('div');
    toast.className = 'toast-notification ' + type;
    toast.textContent = message;

    container.appendChild(toast);

    const activeToasts = Array.from(container.querySelectorAll('.toast-notification:not(.is-closing)'));

    if (activeToasts.length > 3) {
        const excess = activeToasts.length - 3;
        for (let i = 0; i < excess; i++) {
            const oldest = activeToasts[i];
            
            oldest.classList.remove('show');
            oldest.classList.add('is-closing');
            
            setTimeout(() => oldest.remove(), 350); 
        }
    }

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
    });

    setTimeout(() => {
        if (!toast.classList.contains('is-closing')) {
            toast.classList.remove('show');
            toast.classList.add('is-closing');
            
            setTimeout(() => toast.remove(), 350);
        }
    }, duration);
}

export const formatErrorMessage = (errorItem, fieldName) => {
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
