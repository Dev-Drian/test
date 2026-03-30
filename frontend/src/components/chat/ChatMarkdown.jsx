/**
 * renderMarkdown - Renderizador simple de markdown (images + links + bold).
 */
export default function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, lineIdx) => {
        // ── Imagen: ![alt](url) ──
        const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (imgMatch) {
          const [, alt, src] = imgMatch;
          return (
            <span key={lineIdx} style={{ display: 'block', margin: '6px 0' }}>
              <img
                src={src}
                alt={alt || 'imagen'}
                style={{
                  width: '100%',
                  maxWidth: '340px',
                  borderRadius: '10px',
                  display: 'block',
                  objectFit: 'cover',
                  maxHeight: '200px',
                  border: '1px solid rgba(100,116,139,0.25)',
                }}
                loading="lazy"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </span>
          );
        }

        // ── Texto con bold y links inline ──
        const parts = [];
        let remaining = line;
        let key = 0;
        while (remaining.length > 0) {
          const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
          const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
          let firstMatch = null;
          let matchType = null;
          if (linkMatch && boldMatch) {
            firstMatch = linkMatch.index < boldMatch.index ? linkMatch : boldMatch;
            matchType = linkMatch.index < boldMatch.index ? 'link' : 'bold';
          } else if (linkMatch) { firstMatch = linkMatch; matchType = 'link'; }
          else if (boldMatch) { firstMatch = boldMatch; matchType = 'bold'; }
          if (firstMatch) {
            const before = remaining.slice(0, firstMatch.index);
            if (before) parts.push(<span key={key++}>{before}</span>);
            if (matchType === 'link') {
              const [, linkText, linkUrl] = firstMatch;
              parts.push(
                <a key={key++} href={linkUrl}
                  target={linkUrl.startsWith('/') ? '_self' : '_blank'}
                  rel="noopener noreferrer"
                  className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors">
                  {linkText}
                </a>
              );
            } else {
              parts.push(<strong key={key++} className="font-semibold text-slate-100">{firstMatch[1]}</strong>);
            }
            remaining = remaining.slice(firstMatch.index + firstMatch[0].length);
          } else {
            parts.push(<span key={key++}>{remaining}</span>);
            break;
          }
        }
        return <span key={lineIdx}>{parts}{lineIdx < lines.length - 1 && <br />}</span>;
      })}
    </>
  );
}
