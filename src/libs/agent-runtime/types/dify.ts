interface BaseEventData {
  conversation_id: string;
  created_at: number;
  message_id: string;
  task_id: string;
}

interface MessageEventData extends BaseEventData {
  answer: string;
  event: 'message' | 'agent_message';
}

interface AgentThoughtEventData extends BaseEventData {
  event: 'agent_thought';
  id: string;
  // 更具体地，这应该是一个JSON对象，但在这里我们使用'object'作为类型
  message_files?: Array<{ file_id: string }>;
  observation: string;
  position: number;
  thought: string;
  tool: string;
  tool_input: object;
}

interface MessageFileEventData {
  belongs_to: 'user' | 'assistant';
  conversation_id: string;
  event: 'message_file';
  id: string;
  type: string;
  url: string;
}

interface MessageEndEventData {
  conversation_id: string;
  event: 'message_end';
  message_id: string;
  metadata: {
    // 具体类型未知，这里使用'object'
    retriever_resources: Array<object>;
    usage: object; // 同上
  };
  task_id: string;
}

interface MessageReplaceEventData extends BaseEventData {
  answer: string;
  event: 'message_replace';
}

interface ErrorEventData extends BaseEventData {
  code: string;
  event: 'error';
  message: string;
  status: number;
}

interface PingEventData {
  event: 'ping';
}

interface WorkflowStartedEventData {
  data: {
    created_at: Date;
    id: string;
    sequence_number: number;
    workflow_id: string;
  };
  event: 'workflow_started';
  task_id: string;
  workflow_run_id: string;
}

interface NodeStartedEventData {
  data: {
    created_at: Date;
    id: string;
    index: number;
    inputs: object[];
    node_id: string;
    node_type: string;
    predecessor_node_id: string;
    title: string;
  };
  event: 'node_started';
  task_id: string;
  workflow_run_id: string;
}

interface NodeFinishedEventData {
  data: {
    created_at: Date;
    elapsed_time?: number;
    error?: string;
    execution_metadata?: {
      currency?: string;
      total_price?: number;
      total_tokens?: number;
    };
    id: string;
    index: number;
    inputs: object[];
    node_id: string;
    outputs?: object;
    predecessor_node_id?: string;
    process_data?: object;
    status: string;
  };
  event: 'node_finished';
  task_id: string;
  workflow_run_id: string;
}

interface WorkflowFinishedEventData {
  data: {
    created_at: Date;
    elapsed_time?: number;
    error?: string;
    finished_at?: Date;
    id: string;
    outputs?: object;
    status: string;
    total_steps?: number;
    total_tokens?: number;
    workflow_id: string;
  };
  event: 'workflow_finished';
  task_id: string;
  workflow_run_id: string;
}

// 使用TypeScript的联合类型来表示可能的事件
export type StreamEventData =
  | MessageEventData
  | AgentThoughtEventData
  | MessageFileEventData
  | MessageEndEventData
  | MessageReplaceEventData
  | ErrorEventData
  | PingEventData
  | WorkflowStartedEventData
  | NodeStartedEventData
  | NodeFinishedEventData
  | WorkflowFinishedEventData;

export interface ChunkChatCompletionResponse {
  data: StreamEventData;
}
