"use client";

type DownloadButtonProps = {
  imageUrl: string;
};

export function DownloadButton({ imageUrl }: DownloadButtonProps) {
  return (
    <button
      type="button"
      onClick={() => window.open(imageUrl, "_blank")}
      className="rounded-md bg-[#4CAF50] px-4 py-2 text-sm font-medium text-white hover:bg-[#43A047]"
    >
      Download
    </button>
  );
}
