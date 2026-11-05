import ReactMarkdown from 'react-markdown';

export default function ManualArticleBody({ block }) {
  return (
    <div className="manual-article-body space-y-7 text-[15px] leading-8 text-foreground/80">
      {block.text && <ReactMarkdown className="manual-markdown">{block.text}</ReactMarkdown>}
      {block.steps && (
        <ol className="space-y-5">
          {block.steps.map((step, index) => (
            <li key={index} className="flex gap-4">
              <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">{index + 1}</span>
              <ReactMarkdown className="manual-markdown min-w-0 flex-1">{step}</ReactMarkdown>
            </li>
          ))}
        </ol>
      )}
      {block.items && (
        <ul className="space-y-4">
          {block.items.map((item, index) => (
            <li key={index} className="flex gap-4">
              <span aria-hidden="true" className="mt-3.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
              <ReactMarkdown className="manual-markdown min-w-0 flex-1">{item}</ReactMarkdown>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}