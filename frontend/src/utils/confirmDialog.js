/**
 * In-app confirmation / question popups (instead of the browser's
 * window.confirm / window.prompt / window.alert).
 *
 *   if (!(await confirmDialog({ title: "Delete section?", message: "…", confirmLabel: "Delete", tone: "danger" }))) return;
 *   const reason = await promptDialog({ title: "Add a note", label: "Reason", required: false }); // string, or null if cancelled
 *
 * Shown by <ConfirmDialogHost /> (mounted once in main.jsx). Several calls at
 * once are shown one after another.
 *
 * Options: title, message, confirmLabel ("Confirm"), cancelLabel ("Cancel"),
 *          tone "danger" | "warning" | "info" (default "info")
 * Prompt also: label, placeholder, defaultValue, required, multiline, maxLength
 */

let queue = [];
let nextId = 1;
const listeners = new Set();

const emit = () => listeners.forEach((l) => l());

export const subscribeDialogs = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const currentDialog = () => queue[0] || null;

const open = (kind, opts) =>
  new Promise((resolve) => {
    const o = typeof opts === "string" ? { message: opts } : opts || {};
    queue = [...queue, { ...o, kind, id: nextId++, resolve }];
    emit();
  });

export const confirmDialog = (opts) => open("confirm", opts);
export const promptDialog = (opts) => open("prompt", opts);

// the host answers: true/false (confirm) or text/null (prompt)
export const settleDialog = (id, value) => {
  const item = queue.find((d) => d.id === id);
  if (!item) return;
  queue = queue.filter((d) => d.id !== id);
  emit();
  item.resolve(value);
};
