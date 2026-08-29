function SourcesSidebar({ sources = [] }) {
  return (
    <aside aria-label="Research sources">
      <h2>Sources</h2>

      {sources.length === 0 ? (
        <p>No sources available.</p>
      ) : (
        <ul>
          {sources.map((source, index) => (
            <li key={source.id ?? source.url ?? index}>
              {source.url ? (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {source.title ?? source.url}
                </a>
              ) : (
                <span>{source.title ?? `Source ${index + 1}`}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}

export default SourcesSidebar
