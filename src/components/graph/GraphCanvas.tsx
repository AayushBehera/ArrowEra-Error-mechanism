import { useCallback, useEffect } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type NodeMouseHandler,
} from '@xyflow/react'
import { PipelineNode } from './PipelineNode'
import type { FlowEdge, FlowNode } from '../../graph/graphTypes'

const nodeTypes = { pipeline: PipelineNode }

interface Props {
  nodes: FlowNode[]
  edges: FlowEdge[]
  /** Changes whenever a fresh analysis is loaded — used to remount + refit. */
  graphKey: string
  onSelect: (id: string | null) => void
}

function Canvas({ nodes: incomingNodes, edges: incomingEdges, onSelect }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState(incomingNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(incomingEdges)

  useEffect(() => {
    setNodes(incomingNodes)
  }, [incomingNodes, setNodes])
  useEffect(() => {
    setEdges(incomingEdges)
  }, [incomingEdges, setEdges])

  const handleNodeClick: NodeMouseHandler<FlowNode> = useCallback(
    (_, node) => onSelect(node.id),
    [onSelect],
  )
  const handlePaneClick = useCallback(() => onSelect(null), [onSelect])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={handleNodeClick}
      onPaneClick={handlePaneClick}
      colorMode="dark"
      fitView
      fitViewOptions={{ padding: 0.25 }}
      minZoom={0.2}
      maxZoom={1.75}
      nodesConnectable={false}
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#27272a" />
      <MiniMap
        pannable
        zoomable
        nodeColor={() => '#3f3f46'}
        nodeStrokeColor={() => '#a1a1aa'}
        maskColor="rgba(0,0,0,0.72)"
      />
      <Controls showInteractive={false} />
    </ReactFlow>
  )
}

export function GraphCanvas(props: Props) {
  // Remount on a new analysis so the view re-fits to the fresh graph.
  return <Canvas key={props.graphKey} {...props} />
}
