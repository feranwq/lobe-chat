import { LobeRuntimeAI } from '../BaseAI';
import { AgentRuntimeErrorType } from '../error';
import {
  ChatCompetitionOptions,
  ChatCompletionErrorPayload,
  ChatStreamPayload,
  ModelProvider,
} from '../types';
import { StreamEventData } from '../types/dify';
import { AgentRuntimeError } from '../utils/createError';
import { StreamingResponse } from '../utils/response';
import { DifyStream } from '../utils/streams';

const DEFAULT_BASE_URL = 'https://api.dify.ai/v1';
// let conversation_id: string;

// interface DifyBaseResponse {
//   code?: string;
//   message?: string;
//   status?: number;
// }

// type DifyResponse = Partial<StreamEventData> & DifyBaseResponse; // TODO ChatCompletionChunk

// function throwIfErrorResponse(data: DifyResponse) {
//   if (!data.status) {
//     return;
//   }
//   throw AgentRuntimeError.chat({
//     error: {
//       code: data.status,
//       message: data.message,
//     },
//     errorType: AgentRuntimeErrorType.ProviderBizError,
//     provider: ModelProvider.Dify,
//   });
// }

export function parseDifyResponse(chunk: string): StreamEventData {
  // 有可能一次返回多条
  // data: {"event": "message", "conversation_id": "47daa8d8-02a9-4e64-8272-97b76907af56", "message_id": "92538c31-ecec-4c3e-b3ea-1f104ea84df7", "created_at": 1718075777, "task_id": "59d216a9-5622-4f10-858f-89fb2d834787", "id": "92538c31-ecec-4c3e-b3ea-1f104ea84df7", "answer": "\u4f60\u597d"}

  // data: {"event": "message", "conversation_id": "47daa8d8-02a9-4e64-8272-97b76907af56", "message_id": "92538c31-ecec-4c3e-b3ea-1f104ea84df7", "created_at": 1718075777, "task_id": "59d216a9-5622-4f10-858f-89fb2d834787", "id": "92538c31-ecec-4c3e-b3ea-1f104ea84df7", "answer": "\uff01"}

  // event: ping

  console.log('parseDifyResponse', chunk);
  if (chunk.startsWith('event:')) {
    return { event: 'ping' };
  }

  // 特殊处理字符串超长断开
  if (!chunk.startsWith('data:')) {
    return { event: 'ping' };
  }

  // 特殊处理工作流
  if (
    chunk.startsWith('data: {"event": "node_started"') ||
    chunk.startsWith('data: {"event": "node_finished"') ||
    chunk.startsWith('data: {"event": "workflow_started"') ||
    chunk.startsWith('data: {"event": "workflow_finished"')
  ) {
    return { event: 'ping' };
  }

  let lines = chunk.split('\n');
  let answerAll = '';
  let lastLineObj;
  for (let i = 0; i < lines.length - 1; i++) {
    let line = lines[i].trim();
    if (!line.startsWith('data:')) continue;

    line = line.slice(5).trim();
    if (line.startsWith('{')) {
      let chunkObj = JSON.parse(line);

      answerAll += chunkObj.answer;

      lastLineObj = chunkObj;
    } else {
      continue;
    }
  }
  lastLineObj.answer = answerAll;

  // 记录会话id
  // if (lastLineObj.conversation_id) {
  //   conversation_id = lastLineObj.conversation_id;
  // }
  return lastLineObj;

  // let body = chunk;
  // if (body.startsWith('data:')) {
  //   body = body.slice(5).trim();
  // }
  // if (isEmpty(body)) {
  //   return;
  // }
  // return JSON.parse(body) as DifyResponse;
}

export class LobeDifyAI implements LobeRuntimeAI {
  apiKey: string;
  baseURL?: string;

  constructor({ apiKey, baseURL = DEFAULT_BASE_URL }: { apiKey?: string; baseURL?: string }) {
    if (!apiKey) throw AgentRuntimeError.createError(AgentRuntimeErrorType.InvalidProviderAPIKey);

    this.apiKey = apiKey;
    this.baseURL = baseURL;
  }

  async chat(payload: ChatStreamPayload, options?: ChatCompetitionOptions): Promise<Response> {
    try {
      const response = await fetch(`${this.baseURL}/chat-messages`, {
        body: JSON.stringify(this.buildCompletionsParams(payload, options)),
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });
      if (!response.body || !response.ok) {
        throw AgentRuntimeError.chat({
          error: {
            status: response.status,
            statusText: response.statusText,
          },
          errorType: AgentRuntimeErrorType.ProviderBizError,
          provider: ModelProvider.Dify,
        });
      }

      const [prod] = response.body.tee();

      // const [prod, body2] = response.body.tee();
      // const [prod2, debug] = body2.tee();

      // if (process.env.DEBUG_DIFY_CHAT_COMPLETION === '1') {
      //   debugStream(debug).catch(console.error);
      // }

      // await this.parseFirstResponse(prod2.getReader());

      return StreamingResponse(DifyStream(prod, options?.callback), { headers: options?.headers });
    } catch (error) {
      console.log('error', error);
      const err = error as Error | ChatCompletionErrorPayload;
      if ('provider' in err) {
        throw error;
      }
      const errorResult = {
        cause: err.cause,
        message: err.message,
        name: err.name,
        stack: err.stack,
      };
      throw AgentRuntimeError.chat({
        error: errorResult,
        errorType: AgentRuntimeErrorType.ProviderBizError,
        provider: ModelProvider.Dify,
      });
    }
  }

  private buildCompletionsParams(payload: ChatStreamPayload, options?: ChatCompetitionOptions) {
    const { messages, ...params } = payload;

    // TODO 不同类型应用传参不一样
    return {
      ...params,
      // conversation_id: conversation_id, // TODO 根据会话id切换
      conversation_id: '', // TODO 根据会话id切换
      inputs: {},
      query: messages.at(-1)?.content,
      response_mode: 'streaming',
      user: options?.user ? `lbc-user-${options?.user}` : 'lbc-user',
    };
  }

  // private async parseFirstResponse(reader: ReadableStreamDefaultReader<Uint8Array>) {
  //   const decoder = new TextDecoder();

  //   const { value } = await reader.read();
  //   const chunkValue = decoder.decode(value, { stream: true });
  //   let data;
  //   try {
  //     data = parseDifyResponse(chunkValue) as any;

  //     // 记录会话id
  //     if (data?.conversation_id) {
  //       conversation_id = data.conversation_id;
  //     }
  //   } catch {
  //     // parse error, skip it
  //     return;
  //   }
  //   // if (data) {
  //   //   throwIfErrorResponse(data);
  //   // }
  // }
}

export default LobeDifyAI;
