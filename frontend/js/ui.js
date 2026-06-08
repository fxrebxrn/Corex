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
