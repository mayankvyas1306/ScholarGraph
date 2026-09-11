import React, { useState } from 'react';
import {
  BookOpen, BarChart3, Target, Search, Database,
  Layers, ChevronDown, ChevronUp, ExternalLink, Hash
} from 'lucide-react';

function getPaperLink(paper) {
  if (paper?.url) return paper.url;
  if (paper?.arxiv_id) return `https://arxiv.org/abs/${paper.arxiv_id}`;
  if (paper?.doi) return `https://doi.org/${paper.doi}`;
  if (paper?.pdf_url) return paper.pdf_url;
  return null;
}

export default function OverviewPanel({ results, onTabChange }) {
  const [expandedAbstracts, setExpandedAbstracts] = useState({});
  const [showAllPapers, setShowAllPapers] = useState(false);

  const papers = results?.papers || [];
  const compTable = results?.comparison_table || [];
  const gapClaims = results?.gap_claims || [];
  const subQueries = results?.sub_queries || [];
  const paperCount = compTable.length || papers.length;

  /*
   * Supports both:
   * 1. New format: paper.sources = ['arxiv', 'semantic_scholar', 'ieee']
   * 2. Older format: paper.source = 'arxiv' / 'semantic_scholar' / 'merged' / 'ieee'
   */
  const hasSource = (paper, source) => {
    if (Array.isArray(paper.sources)) {
      return paper.sources.includes(source);
    }

    if (paper.source === source) {
      return true;
    }

    // Backward compatibility for older merged papers
    if (paper.source === 'merged') {
      if (source === 'arxiv' || source === 'semantic_scholar') {
        return true;
      }
    }

    return false;
  };

  const arxivCount = papers.filter(
    p => hasSource(p, 'arxiv')
  ).length;

  const s2Count = papers.filter(
    p => hasSource(p, 'semantic_scholar')
  ).length;

  const ieeeCount = papers.filter(
    p => hasSource(p, 'ieee')
  ).length;

  const withPdf = papers.filter(
    p => p.full_text_available
  ).length;

  const pdfCoverage =
    paperCount > 0
      ? Math.round((withPdf / paperCount) * 100)
      : null;

  const displayedPapers = showAllPapers
    ? papers
    : papers.slice(0, 8);

  const toggleAbstract = (id) =>
    setExpandedAbstracts(prev => ({
      ...prev,
      [id]: !prev[id]
    }));

  return (
    <div className="fade-in">

      {/* ── Stat cards ── */}
      <div className="overview-stats">
        <div className="stat-card">
          <div className="stat-value">{paperCount}</div>
          <div className="stat-label">Papers reviewed</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{gapClaims.length}</div>
          <div className="stat-label">Research gaps</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{withPdf}</div>
          <div className="stat-label">Full-text PDFs</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">
            {pdfCoverage != null ? `${pdfCoverage}%` : '—'}
          </div>
          <div className="stat-label">PDF coverage</div>
        </div>
      </div>

      {/* ── Source breakdown ── */}
      {papers.length > 0 && (
        <div
          className="differentiator-card"
          style={{ marginBottom: 16 }}
        >
          <div
            style={{
              display: 'flex',
              gap: 24,
              flexWrap: 'wrap',
              alignItems: 'center'
            }}
          >

            {/* arXiv */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <Database
                size={13}
                style={{
                  color: 'var(--accent-blue)'
                }}
              />

              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)'
                }}
              >
                <strong
                  style={{
                    color: 'var(--text-primary)'
                  }}
                >
                  {arxivCount}
                </strong>{' '}
                from arXiv
              </span>
            </div>

            {/* Semantic Scholar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <Layers
                size={13}
                style={{
                  color: 'var(--accent-purple)'
                }}
              />

              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)'
                }}
              >
                <strong
                  style={{
                    color: 'var(--text-primary)'
                  }}
                >
                  {s2Count}
                </strong>{' '}
                from Semantic Scholar
              </span>
            </div>

            {/* IEEE Xplore */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <Database
                size={13}
                style={{
                  color: 'var(--accent-teal)'
                }}
              />

              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)'
                }}
              >
                <strong
                  style={{
                    color: 'var(--text-primary)'
                  }}
                >
                  {ieeeCount}
                </strong>{' '}
                from IEEE Xplore
              </span>
            </div>

            {/* Full-text PDFs */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <BookOpen
                size={13}
                style={{
                  color: 'var(--accent-teal)'
                }}
              />

              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)'
                }}
              >
                <strong
                  style={{
                    color: 'var(--text-primary)'
                  }}
                >
                  {withPdf}
                </strong>{' '}
                full-text PDFs
              </span>
            </div>

          </div>
        </div>
      )}

      {/* ── Sub-queries used ── */}
      {subQueries.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 8
            }}
          >
            <Search
              size={12}
              style={{
                color: 'var(--text-muted)'
              }}
            />

            <span
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontWeight: 600
              }}
            >
              Sub-queries used
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6
            }}
          >
            {subQueries.map((q, i) => (
              <span
                key={i}
                style={{
                  display: 'inline-flex',
                  alignItems: 'flex-start',
                  gap: '5px',
                  maxWidth: '100%',
                  fontSize: '11px',
                  lineHeight: 1.5,
                  background: '#f8fafb',
                  border: '1px solid rgba(52,72,85,0.18)',
                  borderRadius: '999px',
                  padding: '5px 10px',
                  color: '#405260',
                  fontWeight: 500,
                  boxShadow: '0 1px 2px rgba(24,39,51,0.04)',
                }}
              >
                <Hash
                  size={10}
                  style={{
                    flexShrink: 0,
                    marginTop: 2,
                    color: 'var(--accent-blue)'
                  }}
                />

                {q}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Differentiator callout ── */}
      <div
        className="differentiator-card"
        style={{ marginBottom: 20 }}
      >
        <span className="differentiator-tag">
          Differentiator
        </span>

        <p className="differentiator-text">
          Every gap claim carries its exact supporting subgraph — open the{' '}
          <span
            className="differentiator-link"
            style={{ cursor: 'pointer' }}
            onClick={() => onTabChange?.('gap')}
          >
            Gap Evidence
          </span>{' '}
          tab and select a claim to see it{' '}
          <strong
            style={{
              color: 'var(--accent-purple)'
            }}
          >
            highlighted
          </strong>{' '}
          in the source rail. View the full report in the{' '}
          <span
            className="differentiator-link"
            style={{ cursor: 'pointer' }}
            onClick={() => onTabChange?.('report')}
          >
            Report
          </span>{' '}
          tab.
        </p>
      </div>

      {/* ── Papers list ── */}
      {papers.length > 0 && (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10
            }}
          >
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em'
              }}
            >
              Retrieved Papers ({papers.length})
            </span>

            <button
              onClick={() => onTabChange?.('comparison')}
              style={{
                fontSize: '11px',
                color: 'var(--accent-blue)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0
              }}
            >
              View comparison matrix →
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}
          >
            {displayedPapers.map((paper, i) => {
              const link = getPaperLink(paper);
              const isExpanded =
                expandedAbstracts[paper.id];

              const abstract =
                paper.abstract || '';

              const shortAbstract =
                abstract.length > 200
                  ? abstract.slice(0, 200) + '…'
                  : abstract;

              const authors =
                Array.isArray(paper.authors)
                  ? paper.authors
                      .slice(0, 3)
                      .join(', ') +
                    (paper.authors.length > 3
                      ? ' et al.'
                      : '')
                  : '';

              /*
               * Determine the source label.
               * New papers may have `sources`.
               * Older papers may have `source`.
               */
              const sourceLabel = Array.isArray(paper.sources)
                ? paper.sources
                    .map(source =>
                      source === 'semantic_scholar'
                        ? 'Semantic Scholar'
                        : source === 'ieee'
                          ? 'IEEE Xplore'
                          : 'arXiv'
                    )
                    .join(' + ')
                : paper.source === 'merged'
                  ? 'arXiv + Semantic Scholar'
                  : paper.source === 'ieee'
                    ? 'IEEE Xplore'
                    : paper.source === 'semantic_scholar'
                      ? 'Semantic Scholar'
                      : paper.source === 'arxiv'
                        ? 'arXiv'
                        : '';

              /*
               * Determine styling source.
               * IEEE gets teal, arXiv gets teal, S2 gets purple.
               */
              const primarySource = Array.isArray(paper.sources)
                ? paper.sources[0]
                : paper.source;

              const sourceBackground =
                primarySource === 'semantic_scholar'
                  ? 'rgba(167,139,250,0.1)'
                  : primarySource === 'ieee'
                    ? 'rgba(76,135,147,0.10)'
                    : primarySource === 'merged'
                      ? 'rgba(167,139,250,0.1)'
                      : 'rgba(45,212,191,0.1)';

              const sourceColor =
                primarySource === 'semantic_scholar'
                  ? 'var(--accent-purple)'
                  : primarySource === 'ieee'
                    ? 'var(--accent-teal)'
                    : primarySource === 'merged'
                      ? 'var(--accent-purple)'
                      : 'var(--accent-teal)';

              const sourceBorder =
                primarySource === 'semantic_scholar'
                  ? 'rgba(167,139,250,0.2)'
                  : primarySource === 'ieee'
                    ? 'rgba(76,135,147,0.20)'
                    : primarySource === 'merged'
                      ? 'rgba(167,139,250,0.2)'
                      : 'rgba(45,212,191,0.2)';

              return (
                <div
                  key={paper.id || i}
                  className="overview-paper-card"
                >

                  {/* Title row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 8
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0
                      }}
                    >
                      {link ? (
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="overview-paper-title-link"
                        >
                          {paper.title}

                          <ExternalLink
                            size={10}
                            style={{
                              marginLeft: 4,
                              flexShrink: 0
                            }}
                          />
                        </a>
                      ) : (
                        <span className="overview-paper-title">
                          {paper.title}
                        </span>
                      )}
                    </div>

                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--accent-blue)',
                        flexShrink: 0,
                        background:
                          'rgba(167,77,57,0.08)',
                        padding: '2px 6px',
                        borderRadius: 4
                      }}
                    >
                      {paper.year}
                    </span>
                  </div>

                  {/* Authors + venue */}
                  {(authors ||
                    (paper.venue &&
                      paper.venue !== 'Unknown')) && (
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        marginTop: 4
                      }}
                    >
                      {authors}

                      {authors &&
                      paper.venue &&
                      paper.venue !== 'Unknown'
                        ? ' · '
                        : ''}

                      {paper.venue !== 'Unknown'
                        ? paper.venue
                        : ''}
                    </div>
                  )}

                  {/* Abstract */}
                  {abstract && (
                    <div style={{ marginTop: 6 }}>
                      <p
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.6
                        }}
                      >
                        {isExpanded
                          ? abstract
                          : shortAbstract}
                      </p>

                      {abstract.length > 200 && (
                        <button
                          onClick={() =>
                            toggleAbstract(
                              paper.id
                            )
                          }
                          style={{
                            fontSize: '10px',
                            color: 'var(--accent-blue)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '2px 0',
                            marginTop: 2,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3
                          }}
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp size={10} />
                              Show less
                            </>
                          ) : (
                            <>
                              <ChevronDown size={10} />
                              Read more
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Tags */}
                  <div
                    style={{
                      display: 'flex',
                      gap: 6,
                      marginTop: 6,
                      flexWrap: 'wrap'
                    }}
                  >
                    {sourceLabel && (
                      <span
                        style={{
                          fontSize: '9px',
                          padding: '2px 6px',
                          borderRadius: 3,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          background: sourceBackground,
                          color: sourceColor,
                          border: `1px solid ${sourceBorder}`
                        }}
                      >
                        {sourceLabel}
                      </span>
                    )}

                    {paper.citation_count > 0 && (
                      <span
                        style={{
                          fontSize: '9px',
                          padding: '2px 6px',
                          borderRadius: 3,
                          background:
                            'rgba(76,135,147,0.08)',
                          color: 'var(--text-muted)',
                          border:
                            '1px solid var(--border)'
                        }}
                      >
                        {paper.citation_count} citations
                      </span>
                    )}

                    {paper.full_text_available && (
                      <span
                        style={{
                          fontSize: '9px',
                          padding: '2px 6px',
                          borderRadius: 3,
                          background:
                            'rgba(52,211,153,0.08)',
                          color:
                            'var(--accent-green)',
                          border:
                            '1px solid rgba(52,211,153,0.2)'
                        }}
                      >
                        Full PDF
                      </span>
                    )}
                  </div>

                </div>
              );
            })}
          </div>

          {/* Show more / less */}
          {papers.length > 8 && (
            <button
              className="show-more-btn"
              onClick={() =>
                setShowAllPapers(v => !v)
              }
              style={{ marginTop: 10 }}
            >
              {showAllPapers ? (
                <>
                  <ChevronUp size={12} />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown size={12} />
                  Show all {papers.length} papers
                </>
              )}
            </button>
          )}
        </div>
      )}

    </div>
  );
}