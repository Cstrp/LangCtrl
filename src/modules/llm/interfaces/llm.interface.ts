import { JsonOutputParser } from '@langchain/core/output_parsers';
import { BaseMessage } from '@langchain/core/messages';

export interface LLM {
  invokeAndParse<T extends Record<string, unknown>>(
    messages: BaseMessage[],
    parser: JsonOutputParser<T>
  ): Promise<T>;
}
