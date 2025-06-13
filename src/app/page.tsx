"use client";

import { useState, useEffect } from "react";
import { ConfiguracaoAPIForm } from "@/components/configuracao-api";
import { GerenciadorConhecimento } from "@/components/gerenciador-conhecimento";
import { Toaster } from "@/components/ui/toaster";
import { carregarEstadoApp } from "@/lib/localStorage";
import { EstadoApp } from "@/types";

export default function Home() {
  const [estadoApp, setEstadoApp] = useState<EstadoApp | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Carregar o estado do aplicativo do localStorage ao montar o componente
  useEffect(() => {
    try {
      const estado = carregarEstadoApp();
      
      // Verificar se o estado tem as configurações necessárias
      if (estado?.configurado && 
          (!estado.configuracaoAPI?.supabaseUrl || 
           !estado.configuracaoAPI?.supabaseKey || 
           !estado.configuracaoAPI?.openaiKey)) {
        // Se estiver marcado como configurado mas faltar alguma chave, resetar o estado
        console.warn('Configuração incompleta detectada, resetando estado');
        setEstadoApp({
          configurado: false,
          configuracaoAPI: {
            supabaseUrl: '',
            supabaseKey: '',
            openaiKey: ''
          }
        });
      } else {
        setEstadoApp(estado);
      }
    } catch (error) {
      console.error('Erro ao carregar estado do aplicativo:', error);
      // Em caso de erro, inicializar com estado padrão
      setEstadoApp({
        configurado: false,
        configuracaoAPI: {
          supabaseUrl: '',
          supabaseKey: '',
          openaiKey: ''
        }
      });
    } finally {
      setCarregando(false);
    }
  }, []);

  // Função para atualizar o estado quando a configuração for concluída
  const handleConfiguracao = (configurado: boolean) => {
    // Recarregar o estado do localStorage para garantir que temos os dados mais recentes
    const estadoAtualizado = carregarEstadoApp();
    
    if (configurado && estadoAtualizado) {
      setEstadoApp({
        ...estadoAtualizado,
        configurado: true,
      });
    } else if (configurado) {
      // Caso o carregarEstadoApp retorne null, mas a configuração foi bem-sucedida
      console.warn('Estado não encontrado no localStorage, mas configuração foi bem-sucedida');
      // Recarregar a página para forçar uma nova leitura do localStorage
      window.location.reload();
    }
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      {/* Hero Section com gradiente e efeito de ondas */}
      <header className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-16">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQ0MCIgaGVpZ2h0PSI0MDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgMzk5LjQyNGMxNDQgMCAyODgtMTMzLjE0MSA0MzItMTMzLjE0MVM3MjAgMzk5LjQyNCA4NjQgMzk5LjQyNHMyODgtMTMzLjE0MSA0MzItMTMzLjE0MSAxNDQgMTMzLjE0MSAxNDQgMTMzLjE0MVYwSDBWMzk5LjQyNHoiIGZpbGw9IiNGRkYiIGZpbGwtcnVsZT0ibm9uemVybyIgZmlsbC1vcGFjaXR5PSIuMiIvPjwvc3ZnPg==')]" />
        </div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col items-center text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">Wize Embeddings</h1>
            <p className="text-xl md:text-2xl max-w-2xl mx-auto text-blue-100">
              Gerencie sua base de conhecimento com embeddings usando Supabase e OpenAI
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        {estadoApp?.configurado ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex justify-end mb-4">
              <button 
                onClick={() => {
                  if (window.confirm('Tem certeza que deseja limpar suas configurações de API? Isso removerá suas chaves salvas.')) {
                    // Importação dinâmica para evitar problemas de circular dependency
                    import('@/lib/localStorage').then(({ limparConfiguracaoAPI }) => {
                      limparConfiguracaoAPI();
                      window.location.reload();
                    });
                  }
                }}
                className="text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-4 py-2 rounded-md transition-colors"
              >
                Limpar configurações
              </button>
            </div>
            <GerenciadorConhecimento configuracaoAPI={estadoApp.configuracaoAPI} />
          </div>
        ) : (
          <div className="max-w-xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <div className="p-8">
                <div className="flex items-center justify-center mb-6">
                  <div className="bg-blue-600 p-3 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                
                <h2 className="text-2xl font-bold text-center mb-6 text-gray-800 dark:text-white">
                  Bem-vindo ao Wize Embeddings
                </h2>
                
                <div className="mb-8 p-4 border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700/50 rounded-lg">
                  <h3 className="font-medium text-amber-800 dark:text-amber-400 mb-2 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Aviso de Privacidade
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Este aplicativo não armazena suas chaves de API em nenhum servidor. Todas as chaves são armazenadas apenas
                    localmente no navegador do seu dispositivo. Para limpar suas chaves, clique no botão &ldquo;Limpar configurações&rdquo;.                
                  </p>
                </div>
                
                <p className="mb-6 text-center text-gray-600 dark:text-gray-300">
                  Para começar, configure suas chaves de API abaixo.
                </p>
                
                <p className="mb-8 text-center text-sm">
                  <a 
                    href="https://github.com/jonasouzads/embeddings#configura%C3%A7%C3%A3o" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Consulte o README para instruções detalhadas
                  </a>
                </p>
                
                <ConfiguracaoAPIForm onConfiguracao={handleConfiguracao} />
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white dark:bg-gray-800 shadow-inner py-12 mt-12">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <p className="mb-4 text-gray-600 dark:text-gray-300">&copy; {new Date().getFullYear()} Wize Embeddings - Gerenciador de Base de Conhecimento</p>
            
            <div className="mb-6">
              <p className="font-medium text-gray-800 dark:text-white mb-1">Desenvolvido por Jonas Souza</p>
              <p className="text-gray-600 dark:text-gray-300 mb-4">Contato para serviços: (91) 98568-1506</p>
              
              <div className="flex justify-center gap-6 mt-4">
                <a 
                  href="https://www.youtube.com/@jonasouza_automacao" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400 transition-colors flex items-center"
                >
                  <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 0 1-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418ZM15.194 12 10 15V9l5.194 3Z" clipRule="evenodd" />
                  </svg>
                  YouTube
                </a>
                <a 
                  href="https://www.instagram.com/jonasouzads" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-pink-600 dark:text-gray-300 dark:hover:text-pink-400 transition-colors flex items-center"
                >
                  <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                  </svg>
                  Instagram
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <Toaster />
    </div>
  );
}
