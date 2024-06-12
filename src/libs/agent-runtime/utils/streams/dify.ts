import { readableFromAsyncIterable } from 'ai';
import OpenAI from 'openai';

import { parseDifyResponse } from '../../dify';
import { ChatStreamCallbacks } from '../../types';
import { StreamEventData } from '../../types/dify';
import {
  StreamProtocolChunk,
  createCallbacksTransformer,
  createSSEProtocolTransformer,
} from './protocol';

export const transformDifyStream = (chunk: StreamEventData | any): StreamProtocolChunk => {
  switch (chunk.event) {
    case 'message':
    case 'agent_message': {
      let chunkContent = chunk.answer;
      return { data: chunkContent, id: chunk.message_id, type: 'text' };
    }
    case 'message_end': {
      return { data: 'stop', id: chunk.message_id, type: 'stop' };
    }
    case 'agent_thought': {
      return { data: chunk.thought, id: chunk.message_id, type: 'text' };
    }
    case 'message_file': {
      return { data: chunk.url, id: chunk.message_id, type: 'text' };
    }
    case 'message_replace': {
      // 消息内容替换事件
      return { data: chunk.answer, id: chunk.message_id, type: 'text' };
    }
    case 'error': {
      return { data: 'stop', id: chunk.message_id, type: 'text' };
    }
    case 'ping': {
      return { data: '', id: `dify-${Date.now()}`, type: 'text' };
    }
    case 'workflow_started':
    case 'node_started':
    case 'node_finished':
    case 'workflow_finished': {
      return { data: '', id: chunk.workflow_run_id, type: 'text' };
    }
    default: {
      return { data: 'stop', id: `dify-${Date.now()}`, type: 'text' };
    }
  }
};

const unit8ArrayToJSONChunk = (unit8Array: Uint8Array): StreamEventData => {
  const decoder = new TextDecoder();

  let chunkValue = decoder.decode(unit8Array, { stream: true });
  // 有可能一次返回多条
  // data: {"event": "message", "conversation_id": "47daa8d8-02a9-4e64-8272-97b76907af56", "message_id": "92538c31-ecec-4c3e-b3ea-1f104ea84df7", "created_at": 1718075777, "task_id": "59d216a9-5622-4f10-858f-89fb2d834787", "id": "92538c31-ecec-4c3e-b3ea-1f104ea84df7", "answer": "\u4f60\u597d"}

  // data: {"event": "message", "conversation_id": "47daa8d8-02a9-4e64-8272-97b76907af56", "message_id": "92538c31-ecec-4c3e-b3ea-1f104ea84df7", "created_at": 1718075777, "task_id": "59d216a9-5622-4f10-858f-89fb2d834787", "id": "92538c31-ecec-4c3e-b3ea-1f104ea84df7", "answer": "\uff01"}

  // event: ping

  console.log('unit8ArrayToJSONChunk', chunkValue);
  return parseDifyResponse(chunkValue);

  // if (chunkValue.startsWith('event:')) {
  //   return { event: 'ping' }
  // }

  // let lines = chunkValue.split("\n");
  // let answerAll = ''
  // let lastLineObj
  // for (let i = 0; i < lines.length - 1; i++) {
  //   let line = lines[i].trim();
  //   if (!line.startsWith("data:")) continue;

  //   line = line.slice(5).trim();
  //   if (line.startsWith("{")) {
  //     let chunkObj = JSON.parse(line);
  //     answerAll += chunkObj.answer

  //     lastLineObj = chunkObj
  //   } else {
  //     continue;
  //   }
  // }

  // lastLineObj.answer = answerAll
  // try {
  //   return lastLineObj
  // } catch (e) {
  //   console.error('dify chunk parse error:', e);
  //   return { raw: chunkValue } as any;
  // }
};

const chatStreamable = async function* (stream: AsyncIterable<OpenAI.ChatCompletionChunk>) {
  for await (const response of stream) {
    yield response;
  }
};

export const DifyStream = (stream: ReadableStream, callbacks?: ChatStreamCallbacks) => {
  const readableStream =
    stream instanceof ReadableStream ? stream : readableFromAsyncIterable(chatStreamable(stream));

  return readableStream
    .pipeThrough(
      createSSEProtocolTransformer((buffer) => {
        const chunk = unit8ArrayToJSONChunk(buffer);
        return transformDifyStream(chunk);
      }),
    )
    .pipeThrough(createCallbacksTransformer(callbacks));
};
