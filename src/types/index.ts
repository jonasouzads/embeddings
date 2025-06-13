export interface ConfiguracaoAPI {
  supabaseUrl: string;
  supabaseKey: string;
  openaiKey: string;
}

export interface BaseConhecimento {
  id: string;
  titulo: string;
  conteudo: string;
  dataCriacao: string;
  dataAtualizacao: string;
  embedding?: number[];
}

export interface EstadoApp {
  configurado: boolean;
  configuracaoAPI: ConfiguracaoAPI;
}
