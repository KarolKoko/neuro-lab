import React, { useEffect } from "react";

type ErrorDialogProps = {
    message: string;
    title?: string;
    onClose: () => void;
};

export default function ErrorDialog({
    message,
    title = "Wystąpił błąd",
    onClose,
}: ErrorDialogProps) {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onMouseDown={onClose}
        >
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="error-dialog-title"
                aria-describedby="error-dialog-message"
                className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <div className="flex items-start gap-4 p-6">
                    <div
                        aria-hidden="true"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-xl font-bold text-red-600"
                    >
                        !
                    </div>
                    <div className="min-w-0">
                        <h2
                            id="error-dialog-title"
                            className="m-0 mb-1 text-lg font-bold text-gray-900"
                        >
                            {title}
                        </h2>
                        <p
                            id="error-dialog-message"
                            className="m-0 break-words text-sm text-gray-700"
                        >
                            {message}
                        </p>
                    </div>
                </div>
                <div className="flex justify-end bg-gray-50 px-6 py-3">
                    <button
                        type="button"
                        autoFocus
                        onClick={onClose}
                        className="cursor-pointer rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                    >
                        Zamknij
                    </button>
                </div>
            </div>
        </div>
    );
}
