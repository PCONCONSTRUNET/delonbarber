import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Parsing WhatsApp message:', message);

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const today = new Date();
    
    // Lista de serviços disponíveis na barbearia para matching
    const availableServices = [
      "Barba",
      "cabelo+barba",
      "Corte degradê",
      "Corte na navalha",
      "Corte raspado",
      "Pigmentação de barba",
      "Platinado",
      "Sobrancelha"
    ];
    
    const systemPrompt = `Você é um assistente especializado em interpretar mensagens de WhatsApp para agendamentos de barbearia.

SERVIÇOS DISPONÍVEIS NA BARBEARIA:
${availableServices.map(s => `- ${s}`).join('\n')}

Extraia as seguintes informações da mensagem do cliente:
- Nome do cliente (se mencionado)
- Número de telefone do cliente (se mencionado - pode estar em qualquer formato: com DDD, com 55, com espaços, parênteses, etc. Extraia EXATAMENTE como está escrito na mensagem)
- Data desejada (converta para formato DD/MM/YYYY, considerando que hoje é ${today.toLocaleDateString('pt-BR')})
- Horário desejado (formato HH:MM)
- Serviços desejados - IMPORTANTE: mapeie para os nomes EXATOS dos serviços disponíveis listados acima
- Observações adicionais

REGRAS DE MAPEAMENTO DE SERVIÇOS:
- "corte tradicional", "corte", "corte simples", "corte normal" → "Corte degradê"
- "degradê", "degradé", "fade" → "Corte degradê"
- "barba", "fazer barba", "aparar barba" → "Barba"
- "corte + barba", "cabelo e barba", "corte e barba" → use SEPARADAMENTE: ["Corte degradê", "Barba"]
- "navalha", "corte navalha" → "Corte na navalha"
- "raspado", "zero", "máquina zero" → "Corte raspado"
- "sobrancelha", "design sobrancelha" → "Sobrancelha"
- "platinado", "descolorir", "loiro" → "Platinado"
- "pigmentação", "pigmento barba" → "Pigmentação de barba"

IMPORTANTE:
- Se alguma informação não estiver clara, deixe como null.
- Para datas relativas como "amanhã", "sexta", "próxima semana", converta para a data real.
- O telefone deve ser extraído EXATAMENTE como aparece na mensagem, apenas removendo caracteres especiais como parênteses, traços e espaços.
- Números de telefone brasileiros geralmente têm 10-11 dígitos (com DDD).
- SEMPRE retorne os serviços como ARRAY separado, não combine serviços.

Responda APENAS com um JSON válido no formato:
{
  "client_name": "string ou null",
  "client_phone": "string com apenas números ou null",
  "date": "DD/MM/YYYY ou null",
  "time": "HH:MM ou null",
  "services": ["array de strings com nomes EXATOS dos serviços"] ou [],
  "notes": "string ou null"
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.1, // Lower temperature for more consistent extraction
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns segundos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Adicione créditos ao workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || '';

    console.log('AI response:', content);

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Ensure client_phone only contains digits
    if (parsed.client_phone) {
      parsed.client_phone = parsed.client_phone.replace(/\D/g, '');
    }

    console.log('Parsed data:', parsed);

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});