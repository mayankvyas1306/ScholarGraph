import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import cytoscape from 'cytoscape';

import {
  Network,
  Info,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Lightbulb,
  CheckCircle,
  AlertCircle,
  XCircle,
  BookOpen,
  TrendingDown,
  Eye,
} from 'lucide-react';


/* =========================================================
   GAP INTERPRETATION
========================================================= */

function getGapLevel(density) {
  if (density == null) {
    return {
      label: 'Coverage unavailable',
      sublabel:
        'Citation data is unavailable for this cluster.',
      color: '#6f7f8c',
      bg: 'rgba(111,127,140,0.08)',
      border: 'rgba(111,127,140,0.22)',
      Icon: AlertCircle,
      pct: null,
      explanation:
        'Citation connectivity could not be calculated for this cluster.',
    };
  }

  if (density <= 0) {
    return {
      label: 'Critical gap',
      sublabel:
        'The papers in this cluster are not directly connected by citation links.',
      color: '#b15345',
      bg: 'rgba(177,83,69,0.07)',
      border: 'rgba(177,83,69,0.24)',
      Icon: XCircle,
      pct: 0,
      explanation:
        'Very few or no citation links connect the papers in this cluster. This suggests that the literature is fragmented and the ideas have not yet been strongly connected.',
    };
  }

  if (density < 3) {
    return {
      label: 'Significant gap',
      sublabel:
        'Some citation links exist, but the literature remains fragmented.',
      color: '#9a7140',
      bg: 'rgba(154,113,64,0.07)',
      border: 'rgba(154,113,64,0.24)',
      Icon: AlertCircle,
      pct: Math.min(100, Math.round((density / 6) * 100)),
      explanation:
        'Some connections exist between papers, but the cluster remains relatively fragmented. This may indicate an opportunity to connect approaches that have developed separately.',
    };
  }

  if (density < 6) {
    return {
      label: 'Moderate coverage',
      sublabel:
        'The literature is connected, but additional synthesis is possible.',
      color: '#7e7a45',
      bg: 'rgba(126,122,69,0.07)',
      border: 'rgba(126,122,69,0.24)',
      Icon: AlertCircle,
      pct: Math.min(100, Math.round((density / 6) * 100)),
      explanation:
        'The cluster contains meaningful citation activity, although the literature is not strongly interconnected.',
    };
  }

  return {
    label: 'Well covered',
    sublabel:
      'Research within this cluster is strongly interconnected.',
    color: '#527564',
    bg: 'rgba(82,117,100,0.07)',
    border: 'rgba(82,117,100,0.24)',
    Icon: CheckCircle,
    pct: 100,
    explanation:
      'Papers in this cluster frequently reference one another, indicating a mature and well-connected research area.',
  };
}


/* =========================================================
   MAIN
========================================================= */

export default function GraphViewer({
  gapClaims,
  onHighlightPapers,
}) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);

  const [activeIdx, setActiveIdx] = useState(0);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showGraph, setShowGraph] = useState(false);
  const [showAuthors, setShowAuthors] = useState(false);
  const [showTip, setShowTip] = useState(true);

  const currentGap = gapClaims?.[activeIdx];

  const level = getGapLevel(
    currentGap?.citation_density
  );


  /* =======================================================
     BUILD GRAPH
  ======================================================= */

  useEffect(() => {
    if (
      !showGraph ||
      !containerRef.current ||
      !currentGap?.subgraph_snapshot
    ) {
      return;
    }

    const snapshot =
      currentGap.subgraph_snapshot;

    const rawNodes =
      snapshot.nodes || [];

    const rawEdges =
      snapshot.edges ||
      snapshot.links ||
      [];

    setSelectedNode(null);


    /* -------------------------------------------------------
       Nodes
    ------------------------------------------------------- */

    const nodes = rawNodes.map((node) => {
      const type =
        node.type || 'Paper';

      const fullTitle =
        node.title ||
        node.name ||
        node.label ||
        node.id;

      let visibleLabel = '';

      /*
       * We intentionally keep most labels hidden.
       * This is the primary fix for the crowded graph.
       */
      if (type === 'Topic') {
        visibleLabel = String(fullTitle || '').trim();
      }

      return {
        data: {
          id: String(node.id),
          label: visibleLabel,
          fullTitle,
          type,
          year: node.year,
          citations: node.citation_count,
        },

        classes:
          type === 'Author'
            ? 'author-node'
            : '',
      };
    });


    /* -------------------------------------------------------
       Edges
    ------------------------------------------------------- */

    const edges = rawEdges
      .filter(
        edge =>
          edge?.source &&
          edge?.target
      )
      .map((edge, idx) => ({
        data: {
          id:
            `edge-${idx}-${edge.source}-${edge.target}`,

          source: String(edge.source),
          target: String(edge.target),

          relationship:
            edge.type || '',
        },
      }));


    /* -------------------------------------------------------
       Rebuild
    ------------------------------------------------------- */

    if (cyRef.current) {
      cyRef.current.destroy();
    }


    cyRef.current =
      cytoscape({
        container:
          containerRef.current,

        elements: [
          ...nodes,
          ...edges,
        ],

        minZoom: 0.45,
        maxZoom: 3,
        wheelSensitivity: 0.12,

        boxSelectionEnabled: false,
        autounselectify: false,

        style: [

          /* ===========================
             PAPER
          ============================ */
          {
            selector:
              'node[type="Paper"]',

            style: {
              width: 30,
              height: 30,

              shape: 'ellipse',

              'background-color':
                '#5f8493',

              'border-width': 2,
              'border-color':
                '#ffffff',

              'overlay-opacity': 0,

              label: 'data(label)',

              color: '#314652',

              'font-family':
                'IBM Plex Sans, sans-serif',

              'font-size': 10,

              'font-weight': 600,

              'text-valign':
                'bottom',

              'text-halign':
                'center',

              'text-margin-y':
                8,

              'text-wrap':
                'wrap',

              'text-max-width':
                125,

              'text-background-color':
                '#f7f9fa',

              'text-background-opacity':
                0.88,

              'text-background-padding':
                3,
            },
          },


          /* ===========================
             PAPER SELECTED
          ============================ */
          {
            selector:
              'node[type="Paper"]:selected',

            style: {
              width: 34,
              height: 34,

              'border-width': 4,

              'border-color':
                '#a74d39',

              'background-color':
                '#446f7e',

              'overlay-color':
                '#a74d39',

              'overlay-opacity':
                0.08,
            },
          },


          /* ===========================
             AUTHOR
          ============================ */
          {
            selector:
              'node[type="Author"]',

            style: {
              width: 9,
              height: 9,

              'background-color':
                '#769489',

              'border-width': 1.5,
              'border-color':
                '#ffffff',

              opacity:
                showAuthors
                  ? 0.62
                  : 0,
            },
          },


          /* ===========================
             AUTHOR WHEN SELECTED
          ============================ */
          {
            selector:
              'node[type="Author"]:selected',

            style: {
              width: 20,
              height: 20,

              opacity: 1,

              'border-width': 3,

              'border-color':
                '#a74d39',

              label: 'data(fullTitle)',

              color: '#324651',

              'font-size': 9,

              'text-valign':
                'bottom',

              'text-margin-y':
                7,

              'text-background-color':
                '#f7f9fa',

              'text-background-opacity':
                0.95,

              'text-background-padding':
                3,
            },
          },


          /* ===========================
             TOPIC
          ============================ */
          {
            selector:
              'node[type="Topic"]',

            style: {
              width: 70,
              height: 70,

              shape: 'hexagon',

              'background-color':
                '#77748e',

              'border-width': 3,

              'border-color':
                '#ffffff',

              label: 'data(label)',

              color: '#303a45',

              'font-family':
                'IBM Plex Sans, sans-serif',

              'font-size': 13,

              'font-weight': 700,

              'text-valign':
                'center',

              'text-halign':
                'center',

              'text-wrap':
                'wrap',

              'text-max-width':
                130,

              'text-background-color':
                '#edf1f3',

              'text-background-opacity':
                0.96,

              'text-background-padding':
                3,
            },
          },


          /* ===========================
             EDGE
          ============================ */
          {
            selector: 'edge',

            style: {
              width: 1,

              'line-color':
                '#94a5ae',

              'target-arrow-color':
                '#7f929d',

              'target-arrow-shape':
                'triangle',

              'arrow-scale':
                0.62,

              'curve-style':
                'bezier',

              opacity: 0.26,

              'overlay-opacity': 0,
            },
          },


          /* ===========================
             EDGE SELECTED
          ============================ */
          {
            selector:
              'edge:selected',

            style: {
              width: 3,

              'line-color':
                '#a74d39',

              'target-arrow-color':
                '#a74d39',

              opacity: 1,
            },
          },


          /* ===========================
             HIGHLIGHT
          ============================ */
          {
            selector:
              'node.neighborhood',

            style: {
              'border-color':
                '#a74d39',

              'border-width': 3,

              opacity: 1,
            },
          },

          {
            selector:
              'edge.neighborhood-edge',

            style: {
              width: 2.5,

              'line-color':
                '#a74d39',

              'target-arrow-color':
                '#a74d39',

              opacity: 0.9,
            },
          },
        ],

        /* ===================================================
           LAYOUT
        =================================================== */

        layout: {
          name: 'cose',

          animate: true,

          animationDuration: 900,

          animationEasing:
            'ease-out-cubic',

          padding: 110,

          nodeRepulsion: 26000,

          idealEdgeLength: 220,

          edgeElasticity: 0.15,

          gravity: 0.12,

          nestingFactor: 0.4,

          componentSpacing: 220,

          nodeOverlap: 35,

          randomize: true,

          tilingPaddingVertical: 40,
          
          tilingPaddingHorizontal: 40,


          fit: true,
        },
      });


    /* -------------------------------------------------------
       Selection behavior
    ------------------------------------------------------- */

    cyRef.current.on(
      'tap',
      'node',
      evt => {
        const node =
          evt.target;

        cyRef.current
          .elements()
          .removeClass(
            'neighborhood'
          );

        cyRef.current
          .elements()
          .removeClass(
            'neighborhood-edge'
          );

        node
          .closedNeighborhood()
          .nodes()
          .addClass(
            'neighborhood'
          );

        node
          .connectedEdges()
          .addClass(
            'neighborhood-edge'
          );

        setSelectedNode({
          id:
            node.data('id'),

          label:
            node.data(
              'fullTitle'
            ),

          type:
            node.data('type'),

          year:
            node.data('year'),

          citations:
            node.data(
              'citations'
            ),
        });
      }
    );


    /* -------------------------------------------------------
       Click background
    ------------------------------------------------------- */

    cyRef.current.on(
      'tap',
      evt => {
        if (
          evt.target ===
          cyRef.current
        ) {
          cyRef.current
            .elements()
            .removeClass(
              'neighborhood'
            );

          cyRef.current
            .elements()
            .removeClass(
              'neighborhood-edge'
            );

          setSelectedNode(
            null
          );
        }
      }
    );


    /* -------------------------------------------------------
       Highlight papers in source rail
    ------------------------------------------------------- */

    if (onHighlightPapers) {
      onHighlightPapers(
        rawNodes
          .filter(
            node =>
              node.type ===
              'Paper'
          )
          .map(
            node =>
              node.id
          )
      );
    }


    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };

  }, [
    currentGap,
    activeIdx,
    showGraph,
    showAuthors,
    onHighlightPapers,
  ]);


  /* =======================================================
     CONTROLS
  ======================================================= */

  const zoomIn = () => {
    if (!cyRef.current) return;

    cyRef.current.zoom({
      level:
        cyRef.current.zoom() *
        1.2,
    });
  };


  const zoomOut = () => {
    if (!cyRef.current) return;

    cyRef.current.zoom({
      level:
        cyRef.current.zoom() *
        0.83,
    });
  };


  const fitView = () => {
    cyRef.current?.fit(
      undefined,
      55
    );
  };


  /* =======================================================
     EMPTY STATE
  ======================================================= */

  if (
    !gapClaims ||
    gapClaims.length === 0
  ) {
    return (
      <div className="panel-empty">
        <div className="panel-empty-icon">
          <Network
            size={22}
            color="var(--text-muted)"
          />
        </div>

        <p className="panel-empty-title">
          No gap evidence available
        </p>

        <p className="panel-empty-desc">
          Run the literature review to
          generate citation-based
          research-gap evidence.
        </p>
      </div>
    );
  }


  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="fade-in gv2-root">

      {/* Header */}
      <div className="gv2-page-header">

        <div className="gv2-page-title-row">
          <TrendingDown
            size={16}
            className="gv2-page-icon"
          />

          <h2 className="gv2-page-title">
            Research Gap Analysis
          </h2>

          <span className="gv2-page-count">
            {gapClaims.length}{' '}
            {gapClaims.length === 1
              ? 'gap'
              : 'gaps'}
          </span>
        </div>

        <p className="gv2-page-subtitle">
          ScholarGraph identifies areas where
          the retrieved literature remains
          weakly connected or leaves important
          questions unresolved.
        </p>
      </div>


      {/* Gap selector */}
      <div className="gv2-tabs">
        {gapClaims.map(
          (gap, index) => {
            const gapLevel =
              getGapLevel(
                gap.citation_density
              );

            const Icon =
              gapLevel.Icon;

            return (
              <button
                key={
                  gap.gap_id ||
                  index
                }

                className={`gv2-tab ${
                  activeIdx === index
                    ? 'active'
                    : ''
                }`}

                onClick={() => {
                  setActiveIdx(
                    index
                  );

                  setSelectedNode(
                    null
                  );
                }}

                style={
                  activeIdx === index
                    ? {
                        borderColor:
                          gapLevel.color,
                      }
                    : {}
                }
              >
                <Icon
                  size={13}
                  style={{
                    flexShrink: 0,
                    color:
                      activeIdx === index
                        ? gapLevel.color
                        : 'var(--text-muted)',
                  }}
                />

                <span className="gv2-tab-label">
                  {gap.topic_label}
                </span>

                <span
                  className="gv2-tab-badge"
                  style={
                    activeIdx === index
                      ? {
                          color:
                            gapLevel.color,
                          background:
                            gapLevel.bg,
                        }
                      : {}
                  }
                >
                  {gapLevel.label}
                </span>
              </button>
            );
          }
        )}
      </div>


      {currentGap && (
        <div className="gv2-detail">

          {/* =================================================
              Gap summary
          ================================================= */}
          <div
            className="gv2-risk-header"
            style={{
              borderColor:
                level.border,

              background:
                level.bg,
            }}
          >
            <div className="gv2-risk-left">

              <level.Icon
                size={23}
                style={{
                  color:
                    level.color,
                  flexShrink: 0,
                }}
              />

              <div>
                <div
                  className="gv2-risk-label"
                  style={{
                    color:
                      level.color,
                  }}
                >
                  {level.label}
                </div>

                <div className="gv2-risk-sublabel">
                  {level.sublabel}
                </div>
              </div>
            </div>

            {/* IMPORTANT:
                Do NOT render 0.00.
            */}
            {currentGap.citation_density != null &&
              Number(
                currentGap.citation_density
              ) > 0 && (
                <div
                  className="gv2-risk-score"
                  style={{
                    color:
                      level.color,
                  }}
                >
                  <span className="gv2-risk-num">
                    {Number(
                      currentGap.citation_density
                    ).toFixed(2)}
                  </span>

                  <span className="gv2-risk-unit">
                    citation links / paper
                  </span>
                </div>
              )}
          </div>


          {/* =================================================
              Gap topic
          ================================================= */}
          <section className="gv2-card">

            <div className="gv2-card-label">
              <BookOpen size={13} />
              Research gap
            </div>

            <h3 className="gv2-card-title">
              {currentGap.topic_label}
            </h3>

            <p className="gv2-card-desc">
              {currentGap.description}
            </p>

          </section>


          {/* =================================================
              Interpretation
          ================================================= */}
          <section className="gv2-card gv2-card--explain">

            <div className="gv2-card-label">
              <Info size={13} />
              Interpretation
            </div>

            <p className="gv2-explain-text">
              {level.explanation}
            </p>


            {level.pct != null && (
              <div className="gv2-meter-wrap">

                <div className="gv2-meter-labels">
                  <span className="gv2-meter-lbl">
                    Fragmented
                  </span>

                  <span className="gv2-meter-lbl">
                    Well connected
                  </span>
                </div>

                <div className="gv2-meter-track">

                  <div
                    className="gv2-meter-fill"
                    style={{
                      width:
                        `${Math.max(
                          2,
                          level.pct
                        )}%`,

                      background:
                        level.color,
                    }}
                  />

                  {level.pct > 0 && (
                    <div
                      className="gv2-meter-thumb"
                      style={{
                        left:
                          `${level.pct}%`,

                        borderColor:
                          level.color,
                      }}
                    />
                  )}
                </div>

                <div
                  className="gv2-meter-pct"
                  style={{
                    color:
                      level.color,
                  }}
                >
                  {level.pct === 0
                    ? 'No direct citation connectivity'
                    : `${level.pct}% connectivity`
                  }
                </div>

              </div>
            )}

          </section>


          {/* =================================================
              Suggested directions
          ================================================= */}
          {currentGap
            .suggested_directions
            ?.length > 0 && (
            <section className="gv2-card">

              <div className="gv2-card-label">
                <Lightbulb size={13} />
                Future research directions
              </div>

              <ol className="gv2-dirs-list">

                {currentGap
                  .suggested_directions
                  .map(
                    (direction, index) => (
                      <li
                        key={index}
                        className="gv2-dirs-item"
                      >
                        <span className="gv2-dirs-num">
                          {index + 1}
                        </span>

                        <span>
                          {direction}
                        </span>
                      </li>
                    )
                  )}

              </ol>
            </section>
          )}


          {/* =================================================
              Citation graph
          ================================================= */}
          <section className="gv2-graph-section">

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              <button
                className="gv2-graph-toggle"
                onClick={() =>
                  setShowGraph(
                    value => !value
                  )
                }
              >
                <Eye size={13} />

                {showGraph
                  ? 'Hide citation network'
                  : 'Explore citation network'}
              </button>

              {showGraph && (
                <button
                  className="gv2-graph-toggle"
                  onClick={() =>
                    setShowAuthors(
                      value => !value
                    )
                  }
                >
                  <Network size={13} />

                  {showAuthors
                    ? 'Hide authors'
                    : 'Show authors'}
                </button>
              )}
            </div>


            {showGraph && (
              <div
                className="gv2-canvas-wrap fade-in"
              >

                {/* Legend */}
                <div className="gv2-legend-strip">

                  <span className="gv2-legend-item">
                    <span
                      className="gv2-dot"
                      style={{
                        background:
                          '#5f8493',
                      }}
                    />
                    Paper
                  </span>

                  <span className="gv2-legend-item">
                    <span
                      className="gv2-dot gv2-dot--hex"
                      style={{
                        background:
                          '#77748e',
                      }}
                    />
                    Topic
                  </span>

                  {showAuthors && (
                    <span className="gv2-legend-item">
                      <span
                        className="gv2-dot"
                        style={{
                          background:
                            '#769489',
                        }}
                      />
                      Author
                    </span>
                  )}

                  <span className="gv2-legend-item">
                    <span className="gv2-edge-line" />
                    Citation
                  </span>

                  <span className="gv2-legend-note">
                    Select a node for details
                  </span>

                </div>


                {/* Graph */}
                <div
                  style={{
                    position:
                      'relative',
                  }}
                >

                  <div
                    ref={
                      containerRef
                    }
                    className="gv2-canvas"
                  />


                  {/* Zoom */}
                  <div className="gv2-zoom-controls">

                    <button
                      className="gv2-zoom-btn"
                      onClick={
                        zoomIn
                      }
                      title="Zoom in"
                    >
                      <ZoomIn
                        size={13}
                      />
                    </button>

                    <button
                      className="gv2-zoom-btn"
                      onClick={
                        zoomOut
                      }
                      title="Zoom out"
                    >
                      <ZoomOut
                        size={13}
                      />
                    </button>

                    <button
                      className="gv2-zoom-btn"
                      onClick={
                        fitView
                      }
                      title="Fit graph"
                    >
                      <Maximize2
                        size={13}
                      />
                    </button>

                  </div>


                  {/* Tip */}
                  {showTip && (
                    <div
                      className="gv2-tip"
                    >
                      <Info
                        size={11}
                      />

                      <span>
                        Click a paper or topic
                        for details · drag to pan
                        · scroll to zoom
                      </span>

                      <button
                        className="gv2-tip-close"
                        onClick={() =>
                          setShowTip(
                            false
                          )
                        }
                      >
                        ×
                      </button>
                    </div>
                  )}


                  {/* Selected node */}
                  {selectedNode && (
                    <div
                      className="gv2-node-popup"
                    >

                      <div className="gv2-node-type">
                        {
                          selectedNode.type
                        }
                      </div>

                      <div className="gv2-node-title">
                        {
                          selectedNode.label
                        }
                      </div>

                      {selectedNode.year && (
                        <div className="gv2-node-meta">
                          Published{' '}
                          {
                            selectedNode.year
                          }
                        </div>
                      )}

                      {selectedNode.citations !=
                        null && (
                        <div className="gv2-node-meta">
                          {
                            selectedNode.citations
                          }{' '}
                          citations
                        </div>
                      )}

                      <button
                        className="gv2-node-close"
                        onClick={() =>
                          setSelectedNode(
                            null
                          )
                        }
                      >
                        ×
                      </button>

                    </div>
                  )}

                </div>


                <p className="gv2-canvas-caption">
                  Citation relationships are shown
                  between papers. Authors remain
                  hidden by default to keep the network
                  readable; use “Show authors” when
                  author relationships are needed.
                </p>

              </div>
            )}
          </section>

        </div>
      )}
    </div>
  );
}