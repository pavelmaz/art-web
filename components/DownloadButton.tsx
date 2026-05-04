"use client";

type DownloadButtonProps = {
  imageUrl: string;
};

export function DownloadButton({ imageUrl }: DownloadButtonProps) {
  const guessFilename = (url: string): string => {
    try {
      const parsed = new URL(url);
      const parts = parsed.pathname.split("/").filter(Boolean);
      const raw = parts[parts.length - 1] ?? "artwork.jpg";
      return raw.includes(".") ? raw : `${raw}.jpg`;
    } catch {
      return "artwork.jpg";
    }
  };

  const triggerDownload = async () => {
    if (!imageUrl) return;

    const filename = guessFilename(imageUrl);

    try {
      const response = await fetch(imageUrl, { mode: "cors" });
      if (!response.ok) {
        throw new Error(`Download request failed: ${response.status}`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      return;
    } catch {
      // Fallback for servers/CDNs that block CORS on fetch downloads.
      const a = document.createElement("a");
      a.href = imageUrl;
      a.download = filename;
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  };

  return (
    <button
      type="button"
      onClick={triggerDownload}
      className="rounded-md bg-[#4CAF50] px-4 py-2 text-sm font-medium text-white hover:bg-[#43A047]"
    >
      Download
    </button>
  );
}
