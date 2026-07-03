import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
}

/**
 * Rendu Markdown enrichi avec support de :
 * - Tableaux (remark-gfm)
 * - Listes (ordonnées/non-ordonnées, à puces)
 * - Titres (h1-h6)
 * - Blocs de code avec coloration syntaxique (SyntaxHighlighter)
 * - Citations (blockquote)
 * - Cases à cocher (remark-gfm)
 * - Formules mathématiques (remark-math + rehype-katex)
 * 
 * En mode streaming, on affiche du texte brut pour éviter que ReactMarkdown
 * ne génère des balises bloc qui décaleraient le curseur.
 */
export default function MarkdownRenderer({ content, isStreaming }: MarkdownRendererProps) {
  if (isStreaming) {
    return (
      <div className="chat-msg__content chat-msg__content--streaming">
        {content}
        <span className="chat-msg__cursor" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="chat-msg__content markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Tableaux
          table({ children }) {
            return <div className="markdown-table-wrapper"><table>{children}</table></div>;
          },
          thead({ children }) {
            return <thead>{children}</thead>;
          },
          tbody({ children }) {
            return <tbody>{children}</tbody>;
          },
          tr({ children }) {
            return <tr>{children}</tr>;
          },
          th({ children }) {
            return <th>{children}</th>;
          },
          td({ children }) {
            return <td>{children}</td>;
          },
          // Listes
          ul({ children }) {
            return <ul className="markdown-list">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="markdown-list markdown-list--ordered">{children}</ol>;
          },
          li({ children }) {
            return <li>{children}</li>;
          },
          // Titres
          h1({ children }) {
            return <h1 className="markdown-heading markdown-heading--1">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="markdown-heading markdown-heading--2">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="markdown-heading markdown-heading--3">{children}</h3>;
          },
          h4({ children }) {
            return <h4 className="markdown-heading markdown-heading--4">{children}</h4>;
          },
          // Blocs de code
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : 'text';
            const codeString = String(children).replace(/\n$/, '');

            if (!className) {
              // Code inline
              return <code className="markdown-code-inline" {...props}>{children}</code>;
            }

            return (
              <div className="markdown-code-block">
                <div className="markdown-code-block__header">
                  <span className="markdown-code-block__lang">{language}</span>
                  <button
                    type="button"
                    className="markdown-code-block__copy"
                    onClick={() => navigator.clipboard.writeText(codeString)}
                    title="Copier le code"
                    style={{fontSize: '25px'}}
                  >
                    📋
                  </button>
                </div>
                <SyntaxHighlighter
                  language={language}
                  style={oneDark}
                  customStyle={{
                    margin: 0,
                    borderRadius: '0 0 8px 8px',
                    fontSize: '13px',
                  }}
                >
                  {codeString}
                </SyntaxHighlighter>
              </div>
            );
          },
          // Citations
          blockquote({ children }) {
            return <blockquote className="markdown-blockquote">{children}</blockquote>;
          },
          // Cases à cocher
          input({ type, checked, ...props }) {
            if (type === 'checkbox') {
              return (
                <input
                  type="checkbox"
                  checked={checked}
                  readOnly
                  className="markdown-checkbox"
                  {...props}
                />
              );
            }
            return <input type={type} {...props} />;
          },
          // Liens
          a({ children, href }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" className="markdown-link">
                {children}
              </a>
            );
          },
          // Paragraphes
          p({ children }) {
            return <p className="markdown-paragraph">{children}</p>;
          },
          // Texte en gras
          strong({ children }) {
            return <strong className="markdown-bold">{children}</strong>;
          },
          // Texte en italique
          em({ children }) {
            return <em className="markdown-italic">{children}</em>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}