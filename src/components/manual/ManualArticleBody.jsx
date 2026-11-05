import ReactMarkdown from 'react-markdown';

export default function ManualArticleBody({ block }) {
  return (
    <div className="manual-article-body space-y-7 text-[15px] leading-8 text-foreground/80">
      {block.text && <div className="manual-markdown"><ReactMarkdown>{block.text}</ReactMarkdown></div>}
      {block.steps && (
        <ol className="space-y-5">
          {block.steps.map((step, index) => (
            <li key={index} className="flex gap-4">
              <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-[linear-gradient(150deg,rgba(0,212,170,0.3),rgba(0,212,170,0.08))] text-xs font-semibold text-[#9df6e4] shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_8px_16px_-12px_rgba(0,212,170,0.9)]">{index + 1}</span>
              <div className="manual-markdown min-w-0 flex-1"><ReactMarkdown>{step}</ReactMarkdown></div>
            </li>
          ))}
        </ol>
      )}
      {block.items && (
        <ul className="space-y-4">
          {block.items.map((item, index) => (
            <li key={index} className="flex gap-4">
              <span aria-hidden="true" className="mt-3.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_8px_rgba(0,212,170,0.9)]" />
              <div className="manual-markdown min-w-0 flex-1"><ReactMarkdown>{item}</ReactMarkdown></div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}