type BlogHtmlProps = {
  html: string;
  className?: string;
};

const BASE_CLASS =
  "blog-html text-sm leading-relaxed text-[#4a4a4a] space-y-4 [&_a]:text-[#1a1a1a] [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-black [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-[#1a1a1a] [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-[#1a1a1a] [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5";

export function BlogHtml({ html, className }: BlogHtmlProps) {
  if (!html?.trim()) return null;

  return (
    <div
      className={className ? `${BASE_CLASS} ${className}` : BASE_CLASS}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
