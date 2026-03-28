import { Camera, Loader2, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

interface AvatarUploadProps {
  initialUrl?: string;
  onUpload: (file: File) => Promise<void>;
}

export default function AvatarUpload({ initialUrl, onUpload }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const localPreview = useMemo(() => {
    if (!selectedFile) return undefined;
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const avatarSrc = localPreview ?? initialUrl;

  function openPicker() {
    inputRef.current?.click();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setProgress(0);
  }

  async function handleUpload() {
    if (!selectedFile) return;

    setIsUploading(true);
    setProgress(10);

    const ticker = window.setInterval(() => {
      setProgress((value) => (value >= 90 ? value : value + 10));
    }, 120);

    try {
      await onUpload(selectedFile);
      setProgress(100);
      setSelectedFile(null);
    } finally {
      window.clearInterval(ticker);
      setIsUploading(false);
      window.setTimeout(() => setProgress(0), 500);
    }
  }

  return (
    <div className="rounded-container border border-white/10 bg-deep-slate p-6 shadow-elevated">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Profile Photo</h3>
        <button
          type="button"
          onClick={openPicker}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-midnight-navy px-3 py-1.5 text-xs text-white hover:bg-white/10 transition-colors"
        >
          <Camera className="h-3.5 w-3.5" />
          Edit
        </button>
      </div>

      {/* Avatar Preview */}
      <div className="mt-5 flex flex-col items-center gap-4">
        <div className="relative h-28 w-28 overflow-hidden rounded-full border-2 border-veridian-emerald/50 bg-midnight-navy">
          {avatarSrc ? (
            <img src={avatarSrc} alt="Profile avatar" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-slate-caption">No Image</div>
          )}

          <button
            type="button"
            onClick={openPicker}
            className="absolute bottom-1 right-1 rounded-full bg-veridian-emerald p-2 text-white shadow hover:brightness-110 transition-all"
            aria-label="Edit profile photo"
          >
            <Camera className="h-3.5 w-3.5" />
          </button>
        </div>

        <input ref={inputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

        {selectedFile ? (
          <div className="w-full max-w-xs space-y-3">
            <p className="truncate text-center text-xs text-slate-caption">{selectedFile.name}</p>

            {/* Progress Bar */}
            {progress > 0 ? (
              <div className="h-2 w-full overflow-hidden rounded-full bg-midnight-navy">
                <div
                  className="h-2 rounded-full bg-veridian-emerald transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            ) : null}

            {/* Upload Button */}
            <button
              type="button"
              disabled={isUploading}
              onClick={handleUpload}
              className="veridian-btn-primary w-full inline-flex items-center justify-center gap-2"
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {isUploading ? 'Uploading...' : 'Upload Photo'}
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-caption">PNG or JPG recommended, max 5MB.</p>
        )}
      </div>
    </div>
  );
}
