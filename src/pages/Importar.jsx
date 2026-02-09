import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function Importar() {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const queryClient = useQueryClient();

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setResult(null);

    try {
      // Upload do arquivo
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      setUploading(false);
      setProcessing(true);

      // Extrair dados da planilha
      const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            vendas: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  produto: { type: "string" },
                  assessor_comercial: { type: "string" },
                  time: { type: "string" },
                  valor: { type: "number" },
                  data: { type: "string" },
                  forma_pagamento: { type: "string" },
                  parcelamento: { type: "string" },
                  cpf_cnpj: { type: "string" },
                  cliente: { type: "string" },
                  bitrix: { type: "string" },
                  observacao: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (extractResult.status === 'success' && extractResult.output?.vendas) {
        const vendas = extractResult.output.vendas;
        
        // Criar vendas em lote
        await base44.entities.Venda.bulkCreate(vendas);
        
        queryClient.invalidateQueries(['vendas']);
        setResult({ success: true, count: vendas.length });
        toast.success(`${vendas.length} vendas importadas com sucesso!`);
      } else {
        setResult({ success: false, message: extractResult.details || 'Erro ao processar arquivo' });
        toast.error('Erro ao processar arquivo');
      }
    } catch (error) {
      setResult({ success: false, message: error.message });
      toast.error('Erro ao importar arquivo');
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Importar Planilha</h1>
          <p className="text-gray-600 mt-1">Faça upload de planilhas Excel ou CSV para importar vendas</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload de Arquivo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-lg font-medium mb-2">Arraste um arquivo ou clique para selecionar</p>
              <p className="text-sm text-gray-500 mb-4">Suporta arquivos Excel (.xlsx) e CSV</p>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                disabled={uploading || processing}
              />
              <label htmlFor="file-upload">
                <Button asChild disabled={uploading || processing}>
                  <span>
                    {uploading || processing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {uploading ? 'Enviando...' : 'Processando...'}
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Selecionar Arquivo
                      </>
                    )}
                  </span>
                </Button>
              </label>
            </div>

            {result && (
              <div className={`p-4 rounded-lg flex items-start gap-3 ${
                result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                )}
                <div>
                  <p className={`font-medium ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                    {result.success ? 'Importação Concluída!' : 'Erro na Importação'}
                  </p>
                  <p className={`text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                    {result.success 
                      ? `${result.count} vendas foram importadas com sucesso.` 
                      : result.message
                    }
                  </p>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="font-medium text-blue-900 mb-2">Formato esperado da planilha:</p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• PRODUTO - nome do produto</li>
                <li>• ASSESSOR COMERCIAL - nome do vendedor</li>
                <li>• ENTRADA/ADESÃO - valor numérico</li>
                <li>• DATA - data da venda</li>
                <li>• FORMA DE PAGAMENTO - forma de pagamento</li>
                <li>• CLIENTE - nome do cliente (opcional)</li>
                <li>• CPF/CNPJ - documento (opcional)</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}