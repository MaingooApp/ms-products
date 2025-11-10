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
        timeout: 30000,
      });
      this.logger.log('✅ OpenAI client initialized for allergen detection');
    } else {
      this.logger.warn('⚠️  OpenAI API key not provided. Allergen detection will be disabled.');
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
- GLUTEN: Cereales con gluten (trigo, centeno, cebada, avena, espelta, kamut)
- CRUSTACEANS: Crustáceos (gambas, langostinos, cangrejos, langostas)
- EGGS: Huevos y productos derivados
- FISH: Pescado y productos derivados
- PEANUTS: Cacahuetes y productos derivados
- SOYA: Soja y productos derivados
- MILK: Leche y derivados lácteos (incluida lactosa)
- NUTS: Frutos de cáscara (almendras, avellanas, nueces, anacardos, pacanas, nueces de Brasil, pistachos, nueces de macadamia)
- CELERY: Apio y productos derivados
- MUSTARD: Mostaza y productos derivados
- SESAME: Granos de sésamo y productos derivados
- SULPHITES: Dióxido de azufre y sulfitos (>10 mg/kg o 10 mg/litro)
- LUPIN: Altramuces y productos derivados
- MOLLUSCS: Moluscos (mejillones, almejas, ostras, caracoles, calamares, pulpos)

INSTRUCCIONES:
1. Lee cuidadosamente la descripción del producto
2. Identifica TODOS los alérgenos que puedan estar presentes
3. Considera ingredientes obvios Y derivados (ej: "mantequilla" contiene MILK, "pan" contiene GLUTEN)
4. Ten en cuenta formas alternativas de nombrar ingredientes
5. Si no estás seguro, incluye el alérgeno con confianza "medium" o "low"
6. Si el producto claramente NO contiene alérgenos, devuelve array vacío

EJEMPLOS:
- "Aceite de oliva virgen extra" → [] (sin alérgenos)
- "Pan de trigo integral" → ["GLUTEN"]
- "Leche entera pasteurizada" → ["MILK"]
- "Yogur natural con trozos de nueces" → ["MILK", "NUTS"]
- "Gambas congeladas" → ["CRUSTACEANS"]
- "Salsa de soja" → ["SOYA", "GLUTEN"] (la mayoría contiene trigo)
- "Mayonesa" → ["EGGS", "MUSTARD"]
- "Queso rallado" → ["MILK"]
- "Harina de trigo" → ["GLUTEN"]

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
              'GLUTEN',
              'CRUSTACEANS',
              'EGGS',
              'FISH',
              'PEANUTS',
              'SOYA',
              'MILK',
              'NUTS',
              'CELERY',
              'MUSTARD',
              'SESAME',
              'SULPHITES',
              'LUPIN',
              'MOLLUSCS',
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
