"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

interface PreviewProps {
  content: string;
}

/**
 * Renders Markdown content as HTML using react-markdown with GFM support.
 */
export function Preview({ content }: PreviewProps): React.JSX.Element {
  return (
    <div className="h-full overflow-y-auto bg-white p-6 dark:bg-neutral-900">
      <div className="prose prose-neutral max-w-none dark:prose-invert">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
