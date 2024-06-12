import { ModelProviderCard } from '@/types/llm';

// ref https://docs.perplexity.ai/docs/model-cards
const Dify: ModelProviderCard = {
  chatModels: [
    {
      description: 'Dify Chat',
      displayName: 'Dify Chat',
      enabled: true,
      id: 'dify-chat',
      tokens: 32_768,
    },
  ],
  checkModel: 'dify-chat',
  id: 'dify',
  name: 'Dify',
  proxyUrl: {
    placeholder: 'https://api.dify.ai/v1',
  },
};

export default Dify;
