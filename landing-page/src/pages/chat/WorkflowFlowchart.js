import CloseIcon from '@mui/icons-material/Close';
import {Dialog, IconButton} from '@mui/material';
import React, {useMemo, useState, useCallback, useId} from 'react';

const COLORS = {
  agent: '#6C63FF',
  user: '#4CAF50',
  scheduled: '#FF9800',
  default: '#6C63FF',
  completed: '#2E7D32',
  bg: '#1a1a2e',
  text: '#e0e0e0',
  muted: '#888',
  edge: '#555',
  edgeActive: '#6C63FF',
};

const NODE_W = 200;
const NODE_H = 60;
const LAYER_GAP = 80;
const ROW_GAP = 30;
const PAD = 40;

function getNodeColor(action, vlm) {
  if (vlm?.status === 'done') return COLORS.completed;
  if (vlm?.can_perform_without_user_input === 'no') return COLORS.user;
  if (vlm?.scheduled_tasks?.length > 0) return COLORS.scheduled;
  return COLORS.agent;
}

function truncate(text, max = 28) {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '...' : text;
}

function parseRecipe(recipe) {
  if (!recipe) return {nodes: [], edges: []};

  const nodes = [];
  const edges = [];

  if (recipe.flows && Array.isArray(recipe.flows)) {
    // Agent config format: flows[].actions[]
    let globalIdx = 0;
    recipe.flows.forEach((flow, fi) => {
      const actions = flow.actions || [];
      let prevId = null;

      actions.forEach((action, ai) => {
        const id = `f${fi}_a${ai}`;
        const actionText =
          typeof action === 'string'
            ? action
            : action.action || `Action ${ai + 1}`;

        nodes.push({
          id,
          label: actionText,
          flow: flow.flow_name || `Flow ${fi + 1}`,
          persona: flow.persona || null,
          flowIndex: fi,
          actionIndex: ai,
          globalIndex: globalIdx++,
          vlm: typeof action === 'object' ? action : null,
        });

        if (prevId) {
          edges.push({from: prevId, to: id});
        }
        prevId = id;
      });
    });

    // Cross-flow dependencies (from VLM recipes if available)
    nodes.forEach((node) => {
      const deps = node.vlm?.actions_this_action_depends_on || [];
      deps.forEach((dep) => {
        const depNode = nodes.find(
          (n) => n.actionIndex === dep.action_id && n.flowIndex === dep.flow_id
        );
        if (
          depNode &&
          !edges.find((e) => e.from === depNode.id && e.to === node.id)
        ) {
          edges.push({from: depNode.id, to: node.id, cross: true});
        }
      });
    });
  } else if (recipe.recipe && Array.isArray(recipe.recipe)) {
    // VLM agent recipe format: single action with recipe[] steps
    recipe.recipe.forEach((step, si) => {
      const id = `s${si}`;
      nodes.push({
        id,
        label: step.steps || `Step ${si + 1}`,
        flow: recipe.action || 'Task',
        persona: step.agent_to_perform_this_action || recipe.persona,
        flowIndex: 0,
        actionIndex: si,
        globalIndex: si,
        vlm: recipe,
        tool: step.tool_name,
      });
      if (si > 0) {
        edges.push({from: `s${si - 1}`, to: id});
      }
    });
  }

  return {nodes, edges};
}

function layoutNodes(nodes, edges) {
  if (!nodes.length) return {positioned: [], width: 0, height: 0};

  // Topological sort (Kahn's algorithm) for layer assignment
  const adjList = {};
  const inDegree = {};
  nodes.forEach((n) => {
    adjList[n.id] = [];
    inDegree[n.id] = 0;
  });
  edges.forEach((e) => {
    if (adjList[e.from]) adjList[e.from].push(e.to);
    if (inDegree[e.to] !== undefined) inDegree[e.to]++;
  });

  const layers = [];
  const layerOf = {};
  const queue = Object.keys(inDegree).filter((id) => inDegree[id] === 0);

  while (queue.length) {
    const nextQueue = [];
    const layer = [];
    queue.forEach((id) => {
      layer.push(id);
      layerOf[id] = layers.length;
      (adjList[id] || []).forEach((to) => {
        inDegree[to]--;
        if (inDegree[to] === 0) nextQueue.push(to);
      });
    });
    layers.push(layer);
    queue.length = 0;
    queue.push(...nextQueue);
  }

  // Handle cycles (nodes not in any layer)
  nodes.forEach((n) => {
    if (layerOf[n.id] === undefined) {
      layerOf[n.id] = layers.length;
      if (!layers[layers.length]) layers.push([]);
      layers[layers.length - 1].push(n.id);
    }
  });

  const positioned = nodes.map((n) => {
    const li = layerOf[n.id] || 0;
    const layerNodes = layers[li] || [n.id];
    const ri = layerNodes.indexOf(n.id);
    return {
      ...n,
      x: PAD + li * (NODE_W + LAYER_GAP),
      y: PAD + ri * (NODE_H + ROW_GAP),
      layer: li,
    };
  });

  const maxX = Math.max(...positioned.map((n) => n.x)) + NODE_W + PAD;
  const maxY = Math.max(...positioned.map((n) => n.y)) + NODE_H + PAD;

  return {positioned, width: maxX, height: maxY};
}

function bezierPath(x1, y1, x2, y2) {
  const midX = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
}

function Tooltip({node, x, y}) {
  if (!node) return null;
  return (
    <foreignObject x={x + 10} y={y - 80} width={260} height={120}>
      <div
        xmlns="http://www.w3.org/1999/xhtml"
        style={{
          background: '#222',
          border: '1px solid #444',
          borderRadius: '8px',
          padding: '10px',
          color: COLORS.text,
          fontSize: '12px',
          lineHeight: '1.4',
          maxHeight: '110px',
          overflow: 'hidden',
        }}
      >
        <div style={{fontWeight: 600, marginBottom: 4}}>{node.label}</div>
        {node.persona && (
          <div style={{color: COLORS.muted}}>Persona: {node.persona}</div>
        )}
        {node.tool && (
          <div style={{color: COLORS.muted}}>Tool: {node.tool}</div>
        )}
        {node.vlm?.fallback_action && (
          <div style={{color: '#FF9800'}}>
            Fallback: {truncate(node.vlm.fallback_action, 50)}
          </div>
        )}
        {node.vlm?.status && (
          <div
            style={{
              color:
                node.vlm.status === 'done' ? COLORS.completed : COLORS.muted,
            }}
          >
            Status: {node.vlm.status}
          </div>
        )}
      </div>
    </foreignObject>
  );
}

function Legend() {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 16,
        marginTop: 8,
        paddingLeft: 4,
        fontSize: 11,
        color: COLORS.muted,
      }}
    >
      <span>
        <span style={{color: COLORS.agent}}>■</span> Agent
      </span>
      <span>
        <span style={{color: COLORS.user}}>■</span> User required
      </span>
      <span>
        <span style={{color: COLORS.scheduled}}>■</span> Scheduled
      </span>
      <span>
        <span style={{color: COLORS.completed}}>■</span> Completed
      </span>
      <span>┈┈ Pending</span>
    </div>
  );
}

// The whole flow, readable: one column per flow, its steps top to bottom with
// their full text. The card in the chat draws every flow as one long row (an
// agent with 23 steps a flow is ~6,400 px wide), which the chat column can
// only show at about a tenth of its size, with each label cut at 28
// characters. Same steps, colours and dependencies as the card.
function FlowLanes({nodes, edges}) {
  const lanes = useMemo(() => {
    const byFlow = [];
    nodes.forEach((node) => {
      let lane = byFlow.find((l) => l.index === node.flowIndex);
      if (!lane) {
        lane = {index: node.flowIndex, name: node.flow, persona: node.persona, steps: []};
        byFlow.push(lane);
      }
      lane.steps.push(node);
    });
    return byFlow;
  }, [nodes]);

  // Steps that wait on a step in another flow (the card's dashed edges).
  const waitsOn = useMemo(() => {
    const byId = {};
    nodes.forEach((n) => (byId[n.id] = n));
    const after = {};
    edges.forEach((e) => {
      if (!e.cross || !byId[e.from]) return;
      const from = byId[e.from];
      (after[e.to] = after[e.to] || []).push(`${from.flow} #${from.actionIndex + 1}`);
    });
    return after;
  }, [nodes, edges]);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${lanes.length}, minmax(240px, 1fr))`,
        gap: 20,
        padding: 20,
        overflow: 'auto',
        flex: 1,
        alignItems: 'start',
      }}
    >
      {lanes.map((lane) => (
        <section key={lane.index} aria-label={lane.name} style={{minWidth: 0}}>
          <div style={{fontWeight: 600, fontSize: 14, wordBreak: 'break-word'}}>{lane.name}</div>
          {lane.persona && (
            <div style={{color: COLORS.muted, fontSize: 12, marginTop: 2}}>{lane.persona}</div>
          )}
          <ol style={{listStyle: 'none', margin: '12px 0 0', padding: 0}}>
            {lane.steps.map((node, i) => {
              const color = getNodeColor(node.label, node.vlm);
              const isDone = node.vlm?.status === 'done';
              const isPending = !isDone && !node.vlm?.status;
              const last = i === lane.steps.length - 1;
              return (
                <li
                  key={node.id}
                  style={{
                    position: 'relative',
                    border: `1.5px ${isPending ? 'dashed' : 'solid'} ${color}`,
                    borderRadius: 10,
                    background: '#1e1e3a',
                    padding: '8px 10px',
                    marginBottom: last ? 0 : 20,
                    fontSize: 13,
                    lineHeight: 1.45,
                    wordBreak: 'break-word',
                  }}
                >
                  <span style={{color: COLORS.muted, marginRight: 6}}>{i + 1}.</span>
                  <span>{node.label}</span>
                  {isDone && <span style={{color: COLORS.completed}}> ✓</span>}
                  {node.persona && node.persona !== lane.persona && (
                    <div style={{color, fontSize: 11}}>{node.persona}</div>
                  )}
                  {node.tool && (
                    <div style={{color: COLORS.muted, fontSize: 11}}>Tool: {node.tool}</div>
                  )}
                  {waitsOn[node.id] && (
                    <div style={{color: COLORS.muted, fontSize: 11}}>
                      After: {waitsOn[node.id].join(', ')}
                    </div>
                  )}
                  {node.vlm?.fallback_action && (
                    <div style={{color: COLORS.scheduled, fontSize: 11}}>
                      Fallback: {node.vlm.fallback_action}
                    </div>
                  )}
                  {!last && (
                    <span
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        left: '50%',
                        bottom: -19,
                        color: COLORS.edge,
                        fontSize: 13,
                      }}
                    >
                      ↓
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}

export default function WorkflowFlowchart({recipe}) {
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({x: 0, y: 0});
  const [zoomed, setZoomed] = useState(false);
  const titleId = useId();

  const {nodes, edges} = useMemo(() => parseRecipe(recipe), [recipe]);
  const {positioned, width, height} = useMemo(
    () => layoutNodes(nodes, edges),
    [nodes, edges]
  );

  const nodeMap = useMemo(() => {
    const m = {};
    positioned.forEach((n) => (m[n.id] = n));
    return m;
  }, [positioned]);

  const connectedEdges = useMemo(() => {
    if (!hoveredNode) return new Set();
    const s = new Set();
    edges.forEach((e, i) => {
      if (e.from === hoveredNode || e.to === hoveredNode) s.add(i);
    });
    return s;
  }, [hoveredNode, edges]);

  const handleMouseEnter = useCallback((node) => {
    setHoveredNode(node.id);
    setTooltipPos({x: node.x + NODE_W, y: node.y + NODE_H / 2});
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredNode(null);
  }, []);

  if (!positioned.length) {
    return (
      <div style={{color: COLORS.muted, padding: 16}}>
        No workflow data available
      </div>
    );
  }

  const goalText = recipe?.goal || recipe?.action || '';
  const openZoom = () => setZoomed(true);
  const closeZoom = () => setZoomed(false);

  return (
    <>
    <div
      role="button"
      tabIndex={0}
      aria-label="Open the whole workflow"
      title="Click to see the whole workflow"
      onClick={openZoom}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openZoom();
        }
      }}
      style={{
        background: COLORS.bg,
        borderRadius: '12px',
        padding: '16px',
        marginTop: 8,
        marginBottom: 8,
        maxWidth: '100%',
        overflowX: 'auto',
        cursor: 'zoom-in',
      }}
    >
      {goalText && (
        <div
          style={{
            color: COLORS.text,
            fontWeight: 600,
            fontSize: 14,
            marginBottom: 12,
            paddingLeft: 4,
          }}
        >
          {truncate(goalText, 80)}
        </div>
      )}

      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        style={{maxHeight: 500, display: 'block'}}
      >
        {/* Edges */}
        {edges.map((e, i) => {
          const from = nodeMap[e.from];
          const to = nodeMap[e.to];
          if (!from || !to) return null;

          const x1 = from.x + NODE_W;
          const y1 = from.y + NODE_H / 2;
          const x2 = to.x;
          const y2 = to.y + NODE_H / 2;
          const isHighlighted = connectedEdges.has(i);
          const isInProgress = !from.vlm?.status || from.vlm?.status !== 'done';

          return (
            <g key={`e${i}`}>
              <path
                d={bezierPath(x1, y1, x2, y2)}
                fill="none"
                stroke={isHighlighted ? COLORS.edgeActive : COLORS.edge}
                strokeWidth={isHighlighted ? 2.5 : 1.5}
                strokeDasharray={
                  e.cross ? '6 4' : isInProgress ? '8 4' : 'none'
                }
                opacity={hoveredNode && !isHighlighted ? 0.3 : 1}
              >
                {isInProgress && !e.cross && (
                  <animate
                    attributeName="stroke-dashoffset"
                    from="24"
                    to="0"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                )}
              </path>
              {/* Arrow head */}
              <polygon
                points={`${x2},${y2} ${x2 - 8},${y2 - 4} ${x2 - 8},${y2 + 4}`}
                fill={isHighlighted ? COLORS.edgeActive : COLORS.edge}
                opacity={hoveredNode && !isHighlighted ? 0.3 : 1}
              />
            </g>
          );
        })}

        {/* Nodes */}
        {positioned.map((node) => {
          const color = getNodeColor(node.label, node.vlm);
          const isHovered = hoveredNode === node.id;
          const isDone = node.vlm?.status === 'done';
          const isDashed = !isDone && !node.vlm?.status;

          return (
            <g
              key={node.id}
              onMouseEnter={() => handleMouseEnter(node)}
              onMouseLeave={handleMouseLeave}
              style={{cursor: 'pointer'}}
              opacity={
                hoveredNode && !isHovered && !connectedEdges.size ? 0.5 : 1
              }
            >
              <rect
                x={node.x}
                y={node.y}
                width={NODE_W}
                height={NODE_H}
                rx={10}
                fill={isHovered ? '#2a2a4a' : '#1e1e3a'}
                stroke={color}
                strokeWidth={isHovered ? 2.5 : 1.5}
                strokeDasharray={isDashed ? '6 3' : 'none'}
              />

              {/* Flow label (small, top-left) */}
              <text
                x={node.x + 8}
                y={node.y + 14}
                fontSize={9}
                fill={COLORS.muted}
                fontFamily="sans-serif"
              >
                {truncate(node.flow, 22)}
              </text>

              {/* Action label */}
              <text
                x={node.x + NODE_W / 2}
                y={node.y + 35}
                fontSize={11}
                fill={COLORS.text}
                textAnchor="middle"
                fontFamily="sans-serif"
                fontWeight={500}
              >
                {truncate(node.label)}
              </text>

              {/* Persona badge */}
              {node.persona && (
                <text
                  x={node.x + NODE_W / 2}
                  y={node.y + 50}
                  fontSize={8}
                  fill={color}
                  textAnchor="middle"
                  fontFamily="sans-serif"
                >
                  {truncate(node.persona, 24)}
                </text>
              )}

              {/* Done checkmark */}
              {isDone && (
                <text
                  x={node.x + NODE_W - 16}
                  y={node.y + 16}
                  fontSize={14}
                  fill={COLORS.completed}
                >
                  ✓
                </text>
              )}
            </g>
          );
        })}

        {/* Tooltip */}
        {hoveredNode && (
          <Tooltip
            node={positioned.find((n) => n.id === hoveredNode)}
            x={tooltipPos.x}
            y={tooltipPos.y}
          />
        )}
      </svg>

      <Legend />
    </div>

    <Dialog
      open={zoomed}
      onClose={closeZoom}
      fullScreen
      aria-labelledby={titleId}
      PaperProps={{style: {background: COLORS.bg, color: COLORS.text}}}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          padding: '14px 12px 12px 20px',
          borderBottom: '1px solid #2a2a4a',
        }}
      >
        <div id={titleId} style={{flex: 1, fontWeight: 600, fontSize: 16, lineHeight: 1.4}}>
          {goalText || 'Workflow'}
        </div>
        <IconButton aria-label="Close" onClick={closeZoom} style={{color: COLORS.text}}>
          <CloseIcon />
        </IconButton>
      </div>
      <FlowLanes nodes={nodes} edges={edges} />
      <div style={{padding: '0 20px 16px'}}>
        <Legend />
      </div>
    </Dialog>
    </>
  );
}
