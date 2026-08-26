# Desativar Assistente WhatsApp (IA)

## Contexto
O assistente de WhatsApp atual usa a Edge Function `parse-whatsapp`, que chama o Lovable AI Gateway (`google/gemini-2.5-flash`) para interpretar mensagens copiadas e extrair nome, telefone, data, horário e serviços. Cada chamada consome créditos de IA. A proposta é desativar completamente essa funcionalidade para zerar gastos de IA com esse recurso.

## O que será feito
1. Remover o menu "IA WhatsApp" da navegação admin (sidebar e menu mobile).
2. Remover a rota `/admin/ia` do roteamento principal.
3. Remover o componente de página `AdminIA` e a importação do `WhatsAppAI`.
4. Atualizar a Edge Function `parse-whatsapp` para retornar imediatamente uma mensagem de "recurso desativado", sem chamar o AI Gateway (garantia caso alguém acesse URL antiga).
5. (Opcional) Remover a Edge Function `parse-whatsapp` do deploy, se desejado.

## Resultado esperado
- O botão "IA WhatsApp" some do admin.
- Nenhuma requisição ao AI Gateway é mais feita por esse recurso.
- Créditos de IA deixam de ser consumidos pelo assistente de WhatsApp.
- O restante do sistema continua funcionando normalmente.

## Arquivos envolvidos
- `src/components/admin/AdminSidebar.tsx`
- `src/components/admin/MobileAdminNav.tsx`
- `src/App.tsx`
- `src/pages/Admin.tsx`
- `supabase/functions/parse-whatsapp/index.ts`
