import { ConfiguracaoAPI, EstadoApp } from '@/types';

const CHAVE_ESTADO_APP = 'wize-embeddings-estado';

// Estado padrão do aplicativo
const estadoPadrao: EstadoApp = {
  configurado: false,
  configuracaoAPI: {
    supabaseUrl: '',
    supabaseKey: '',
    openaiKey: '',
  },
};

// Função para salvar o estado do aplicativo no localStorage
export const salvarEstadoApp = (estado: EstadoApp): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(CHAVE_ESTADO_APP, JSON.stringify(estado));
  }
};

// Função para carregar o estado do aplicativo do localStorage
export const carregarEstadoApp = (): EstadoApp => {
  if (typeof window !== 'undefined') {
    const estadoSalvo = localStorage.getItem(CHAVE_ESTADO_APP);
    if (estadoSalvo) {
      try {
        const estado = JSON.parse(estadoSalvo) as EstadoApp;
        
        // Validar se o estado tem a estrutura correta
        if (!estado || typeof estado !== 'object') {
          throw new Error('Estado inválido');
        }
        
        // Garantir que o estado tenha todas as propriedades necessárias
        const estadoCompleto: EstadoApp = {
          configurado: typeof estado.configurado === 'boolean' ? estado.configurado : false,
          configuracaoAPI: {
            supabaseUrl: estado.configuracaoAPI?.supabaseUrl || '',
            supabaseKey: estado.configuracaoAPI?.supabaseKey || '',
            openaiKey: estado.configuracaoAPI?.openaiKey || '',
          }
        };
        
        // Verificar se o estado está marcado como configurado, mas faltam chaves
        if (estadoCompleto.configurado && 
            (!estadoCompleto.configuracaoAPI.supabaseUrl || 
             !estadoCompleto.configuracaoAPI.supabaseKey || 
             !estadoCompleto.configuracaoAPI.openaiKey)) {
          console.warn('Estado marcado como configurado, mas faltam chaves de API');
          estadoCompleto.configurado = false;
        }
        
        return estadoCompleto;
      } catch (e) {
        console.error('Erro ao carregar estado do aplicativo:', e);
      }
    }
  }
  return estadoPadrao;
};

// Função para salvar a configuração da API
export const salvarConfiguracaoAPI = (config: ConfiguracaoAPI): void => {
  const estadoAtual = carregarEstadoApp();
  const novoEstado: EstadoApp = {
    ...estadoAtual,
    configurado: true,
    configuracaoAPI: config,
  };
  salvarEstadoApp(novoEstado);
};

// Função para limpar a configuração da API
export const limparConfiguracaoAPI = (): void => {
  salvarEstadoApp(estadoPadrao);
};
