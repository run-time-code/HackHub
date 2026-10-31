import { useRef, useState } from "react";
import { Camera, ImagePlus, LoaderCircle } from "lucide-react";
import Avatar from "../ui/Avatar";
import Button from "../ui/Button";
import { removeAvatar, uploadAvatar } from "../../lib/api/users";
import { errorMessage } from "../../lib/api/http";
import { useToast } from "../../providers/ToastProvider";
import { useAuth } from "../../context/auth-context";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;

export default function AvatarUploader({ name, avatarUrl, onUploaded, disabled }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();
  const { updateUser } = useAuth();

  async function handleFile(file) {
    if (!file || disabled || uploading) return;
    setError("");
    if (!ACCEPTED.includes(file.type)) {
      setError("Use a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Keep the image under 2 MB.");
      return;
    }

    setUploading(true);
    try {
      const url = await uploadAvatar(file);
      onUploaded(url);
      updateUser({ avatarUrl: url });
      toast.success("Portrait updated", "Your builder card has a new face.");
    } catch (uploadError) {
      setError(errorMessage(uploadError, "The upload did not land. Try again."));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    if (disabled || uploading) return;
    setError("");
    setUploading(true);
    try {
      const url = await removeAvatar();
      onUploaded(url);
      updateUser({ avatarUrl: url });
      toast.success("Portrait removed", "Your profile is using its initials again.");
    } catch (removeError) {
      setError(errorMessage(removeError, "The portrait could not be removed. Try again."));
    } finally {
      setUploading(false);
    }
  }

  function onDrop(event) {
    event.preventDefault();
    setDragging(false);
    handleFile(event.dataTransfer.files?.[0]);
  }

  return (
    <div className="avatar-uploader">
      <button
        type="button"
        className={`avatar-uploader__drop ${dragging ? "is-dragging" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        aria-label="Upload a profile portrait"
        disabled={disabled || uploading}
      >
        <Avatar src={avatarUrl} name={name} size="xl" />
        <span className="avatar-uploader__overlay">
          {uploading ? (
            <LoaderCircle className="spin-slow" aria-hidden="true" />
          ) : (
            <Camera aria-hidden="true" />
          )}
          {uploading ? "Uploading" : "Change"}
        </span>
      </button>

      <div className="avatar-uploader__copy">
        <strong>{uploading ? "Sending your portrait…" : "A face for the card."}</strong>
        <p>
          Square works best. JPG, PNG or WebP, under 2 MB. Drag a file onto the
          circle or choose one from your device.
        </p>
        {error && <p className="field__error">{error}</p>}
        <div className="avatar-uploader__actions">
          <Button
            size="sm"
            variant="secondary"
            icon={<ImagePlus />}
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading}
          >
            Choose image
          </Button>
          {avatarUrl && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRemove}
              disabled={disabled || uploading}
            >
              Remove
            </Button>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        hidden
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
    </div>
  );
}
