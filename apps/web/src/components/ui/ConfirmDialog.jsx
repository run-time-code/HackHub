import { useState } from "react";
import Dialog from "./Dialog";
import Button from "./Button";
import { Field, Input } from "./Field";

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
  variant = "danger",
  confirmPhrase,
  onConfirm,
  children,
}) {
  const [phrase, setPhrase] = useState("");

  const blockedByPhrase = Boolean(confirmPhrase) && phrase.trim() !== confirmPhrase;

  function handleOpenChange(nextOpen) {
    if (!nextOpen) setPhrase("");
    onOpenChange?.(nextOpen);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant}
            onClick={onConfirm}
            loading={loading}
            disabled={blockedByPhrase}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
      {confirmPhrase && (
        <Field
          label={`Type “${confirmPhrase}” to continue`}
          htmlFor="confirm-phrase"
          hint="This action cannot be undone."
        >
          <Input
            id="confirm-phrase"
            value={phrase}
            onChange={(event) => setPhrase(event.target.value)}
            autoComplete="off"
            placeholder={confirmPhrase}
          />
        </Field>
      )}
    </Dialog>
  );
}
