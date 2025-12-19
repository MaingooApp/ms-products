import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

import { envs } from 'src/config';

export interface AllergenIdentificationResult {
  allergenCodes: string[];
  confidence: 'high' | 'medium' | 'low';
  reasoning?: string;
}

@Injectable()
export class OpenAiService {
  private readonly logger = new Logger(OpenAiService.name);
  private readonly client: OpenAI | null = null;

  constructor() {
    if (envs.openAiApiKey) {
      this.client = new OpenAI({
        apiKey: envs.openAiApiKey,
        baseURL: envs.baseURL,
        timeout: 30000,
      });
      this.logger.log('✅ OpenAI client initialized for allergen detection');
    } else {
      this.logger.warn('⚠️  OpenAI API key not provided. Allergen detection will be disabled.');
    }
  }

  /**
   * Sugiere la categoría más adecuada para un producto usando OpenAI
   */
  async suggestCategory(
    productName: string,
    categories: string[],
  ): Promise<{ category: string; confidence: string; reasoning?: string }> {
    if (!this.client) {
      this.logger.warn('OpenAI not configured, skipping category suggestion');
      return { category: '', confidence: 'low', reasoning: 'OpenAI not configured' };
    }

    if (!productName || categories.length === 0) {
      return { category: '', confidence: 'low', reasoning: 'No product name or categories' };
    }

    try {
      const prompt = `Eres un experto en clasificación de productos. Basado en el nombre del producto y la lista de categorías disponibles, sugiere la categoría más adecuada para el producto.\n\nNOMBRE DEL PRODUCTO: "${productName}"\nCATEGORÍAS DISPONIBLES: ${categories.map((c) => `"${c}"`).join(', ')}\n\nDevuelve un JSON con:\n- category: nombre exacto de la categoría sugerida (de la lista)\n- confidence: high, medium o low según certeza\n- reasoning: breve explicación (máx 100 caracteres)`;

      const schema = {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Nombre exacto de la categoría sugerida' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          reasoning: { type: 'string' },
        },
        required: ['category', 'confidence', 'reasoning'],
        additionalProperties: false,
      };

      const response = await this.client.responses.create({
        model: envs.openAiModel,
        input: [
          {
            role: 'user',
            content: [{ type: 'input_text', text: prompt }],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'category_suggestion',
            schema,
            strict: true,
          },
        },
        max_output_tokens: 200,
      });

      // Parse response
      const output = response.output?.[0];
      if (output && 'content' in output && Array.isArray(output.content)) {
        for (const item of output.content) {
          // output_text
          if (item.type === 'output_text' && typeof item.text === 'string') {
            try {
              return JSON.parse(item.text) as {
                category: string;
                confidence: string;
                reasoning?: string;
              };
            } catch (error) {
              this.logger.debug('Failed to parse OpenAI category response', error as Error);
            }
          }
          // refusal (no respuesta)
          if (item.type === 'refusal') {
            return { category: '', confidence: 'low', reasoning: 'OpenAI refused to answer' };
          }
        }
      }
      // fallback: try output.text if exists and is string
      if (output && 'text' in output && typeof (output as any).text === 'string') {
        try {
          return JSON.parse((output as any).text) as {
            category: string;
            confidence: string;
            reasoning?: string;
          };
        } catch (error) {
          this.logger.debug(
            'Failed to parse OpenAI category response (text fallback)',
            error as Error,
          );
        }
      }
      return { category: '', confidence: 'low', reasoning: 'Failed to parse OpenAI response' };
    } catch (error) {
      this.logger.error(
        `Error suggesting category for "${productName}":`,
        (error as Error).message,
      );
      return { category: '', confidence: 'low', reasoning: `Error: ${(error as Error).message}` };
    }
  }

  /**
   * Identifica alérgenos en la descripción de un producto usando OpenAI
   */
  async identifyAllergens(productDescription: string): Promise<AllergenIdentificationResult> {
    if (!this.client) {
      this.logger.warn('OpenAI not configured, skipping allergen detection');
      return {
        allergenCodes: [],
        confidence: 'low',
        reasoning: 'OpenAI not configured',
      };
    }

    if (!productDescription || productDescription.trim().length === 0) {
      return {
        allergenCodes: [],
        confidence: 'low',
        reasoning: 'Empty product description',
      };
    }

    try {
      const prompt = this.buildAllergenPrompt(productDescription);
      const schema = this.buildAllergenSchema();

      const response = await this.client.responses.create({
        model: envs.openAiModel,
        input: [
          {
            role: 'user',
            content: [{ type: 'input_text', text: prompt }],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'allergen_identification',
            schema,
            strict: true,
          },
        },
        max_output_tokens: 500,
      });

      const result = this.parseAllergenResponse(response);
      this.logger.log(
        `✅ Allergens identified for "${productDescription.substring(0, 50)}...": ${result.allergenCodes.join(', ') || 'none'}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `❌ Error identifying allergens for "${productDescription}":`,
        (error as Error).message,
      );
      return {
        allergenCodes: [],
        confidence: 'low',
        reasoning: `Error: ${(error as Error).message}`,
      };
    }
  }

  private buildAllergenPrompt(productDescription: string): string {
    return `Eres un experto en seguridad alimentaria y alérgenos. Analiza la siguiente descripción de producto e identifica TODOS los alérgenos presentes según la normativa europea (Reglamento UE 1169/2011).

DESCRIPCIÓN DEL PRODUCTO:
"${productDescription}"

CÓDIGOS DE ALÉRGENOS (14 alérgenos principales UE):
- GLU: Cereales con gluten (trigo, centeno, cebada, avena, espelta, kamut)
- CRU: Crustáceos (gambas, langostinos, cangrejos, langostas)
- EGG: Huevos y productos derivados
- FISH: Pescado y productos derivados
- PEA: Cacahuetes y productos derivados
- SOY: Soja y productos derivados
- MILK: Leche y derivados lácteos (incluida lactosa)
- NUTS: Frutos de cáscara (almendras, avellanas, nueces, anacardos, pacanas, nueces de Brasil, pistachos, nueces de macadamia)
- CEL: Apio y productos derivados
- MUS: Mostaza y productos derivados
- SES: Granos de sésamo y productos derivados
- SUL: Dióxido de azufre y sulfitos (>10 mg/kg o 10 mg/litro)
- LUP: Altramuces y productos derivados
- MOL: Moluscos (mejillones, almejas, ostras, caracoles, calamares, pulpos)

INSTRUCCIONES:
1. Lee cuidadosamente la descripción del producto
2. Identifica TODOS los alérgenos que puedan estar presentes
3. Considera ingredientes obvios Y derivados (ej: "mantequilla" contiene MILK, "pan" contiene GLUTEN)
4. Ten en cuenta formas alternativas de nombrar ingredientes
5. Si no estás seguro, incluye el alérgeno con confianza "medium" o "low"
6. Si el producto claramente NO contiene alérgenos, devuelve array vacío

EJEMPLOS:
- "Aceite de oliva virgen extra" → [] (sin alérgenos)
- "Pan de trigo integral" → ["GLU"]
- "Leche entera pasteurizada" → ["MILK"]
- "Yogur natural con trozos de nueces" → ["MILK", "NUTS"]
- "Gambas congeladas" → ["CRU"]
- "Salsa de soja" → ["SOY", "GLU"] (la mayoría contiene trigo)
- "Mayonesa" → ["EGG", "MUS"]
- "Queso rallado" → ["MILK"]
- "Harina de trigo" → ["GLU"]

Devuelve un JSON con:
- allergenCodes: Array de códigos de alérgenos detectados (vacío si no hay)
- confidence: "high", "medium" o "low" según certeza
- reasoning: Breve explicación de tu análisis (máximo 100 caracteres)`;
  }

  private buildAllergenSchema() {
    return {
      type: 'object',
      properties: {
        allergenCodes: {
          type: 'array',
          items: {
            type: 'string',
            enum: [
              'GLU',
              'CRU',
              'EGG',
              'FISH',
              'PEA',
              'SOY',
              'MILK',
              'NUTS',
              'CEL',
              'MUS',
              'SES',
              'SUL',
              'LUP',
              'MOL',
            ],
          },
          description: 'Array of allergen codes present in the product',
        },
        confidence: {
          type: 'string',
          enum: ['high', 'medium', 'low'],
          description: 'Confidence level of the allergen identification',
        },
        reasoning: {
          type: 'string',
          description: 'Brief explanation of the analysis (max 100 chars)',
        },
      },
      required: ['allergenCodes', 'confidence', 'reasoning'],
      additionalProperties: false,
    };
  }

  private parseAllergenResponse(response: any): AllergenIdentificationResult {
    const output = response.output?.[0]?.content ?? [];

    for (const item of output) {
      if (item.type === 'output_json' && item.json) {
        return item.json as AllergenIdentificationResult;
      }

      if ('text' in item && item.text) {
        try {
          return JSON.parse(item.text) as AllergenIdentificationResult;
        } catch (error) {
          this.logger.debug('Failed to parse OpenAI text response', error as Error);
        }
      }
    }

    return {
      allergenCodes: [],
      confidence: 'low',
      reasoning: 'Failed to parse OpenAI response',
    };
  }
}
