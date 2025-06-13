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
    <div className="min-h-screen p-6">
      <header className="container mx-auto mb-8">
        <h1 className="text-3xl font-bold mb-2">Wize Embeddings</h1>
        <p className="text-muted-foreground">
          Gerencie sua base de conhecimento com embeddings usando Supabase e OpenAI
        </p>
      </header>

      <main className="container mx-auto py-6">
        {estadoApp?.configurado ? (
          <>
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
                className="text-sm text-muted-foreground hover:text-destructive transition-colors"
              >
                Limpar configurações
              </button>
            </div>
            <GerenciadorConhecimento configuracaoAPI={estadoApp.configuracaoAPI} />
          </>
        ) : (
          <div className="max-w-md mx-auto">
            <h2 className="text-xl font-semibold mb-4 text-center">
              Bem-vindo ao Wize Embeddings
            </h2>
            
            <div className="mb-6 p-4 border border-amber-200 bg-amber-50 rounded-md">
              <h3 className="font-medium text-amber-800 mb-2">Aviso de Privacidade</h3>
              <p className="text-sm text-amber-700 mb-2">
                Este aplicativo não armazena suas chaves de API em nenhum servidor. Todas as chaves são armazenadas apenas
                localmente no navegador do seu dispositivo. Para limpar suas chaves, clique no botão &ldquo;Limpar configurações&rdquo;.                
              </p>
            </div>
            
            <p className="mb-4 text-center text-muted-foreground">
              Para começar, configure suas chaves de API abaixo.
            </p>
            <p className="mb-6 text-center text-sm">
              <a 
                href="https://github.com/jonasouzads/embeddings#configura%C3%A7%C3%A3o" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Consulte o README para instruções detalhadas sobre a configuração do Supabase
              </a>
            </p>
            <ConfiguracaoAPIForm onConfiguracao={handleConfiguracao} />
          </div>
        )}
      </main>

      <footer className="container mx-auto mt-12 pt-6 border-t text-center text-sm text-muted-foreground">
        <p className="mb-2">© {new Date().getFullYear()} Wize Embeddings - Gerenciador de Base de Conhecimento</p>
        <div className="mb-4">
          <p className="font-medium">Desenvolvido por Jonas Souza</p>
          <p>Contato para serviços: (91) 98568-1506</p>
          <div className="flex justify-center gap-4 mt-2">
            <a 
              href="https://www.youtube.com/@jonasouza_automacao" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              YouTube
            </a>
            <a 
              href="https://www.instagram.com/jonasouza.ads" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Instagram @jonasouza.ads
            </a>
          </div>
        </div>
      </footer>

      <Toaster />
    </div>
  );
}
