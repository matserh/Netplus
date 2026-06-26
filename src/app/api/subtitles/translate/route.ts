import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import ZAI from 'z-ai-web-dev-sdk';

interface SubtitleLine {
  index: number;
  startTime: number;
  endTime: number;
  text: string;
}

export async function POST(req: NextRequest) {
  try {
    // Auth check — prevent unauthorized abuse of expensive LLM calls
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 });
    }

    const { lines, targetLang = 'fr', sourceLang = 'en' } = await req.json();

    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ error: 'Lines requises' }, { status: 400 });
    }

    // Limit batch size to prevent abuse
    if (lines.length > 200) {
      return NextResponse.json({ error: 'Trop de lignes (200 max)' }, { status: 400 });
    }

    // We batch translate to avoid too many API calls
    // Group lines into chunks of ~20 for efficient translation
    const CHUNK_SIZE = 20;
    const chunks: SubtitleLine[][] = [];
    
    for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
      chunks.push(lines.slice(i, i + CHUNK_SIZE));
    }

    const zai = await ZAI.create();
    const translatedLines: SubtitleLine[] = [];

    for (const chunk of chunks) {
      const numberedText = chunk
        .map((l: SubtitleLine, i: number) => `[${i + 1}] ${l.text}`)
        .join('\n');

      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `Tu es un traducteur professionnel de sous-titres de films/séries. Traduis les lignes suivantes de ${sourceLang === 'en' ? "l'anglais" : sourceLang === 'es' ? "l'espagnol" : sourceLang === 'de' ? "l'allemand" : 'la langue source'} vers le français. 

RÈGLES STRICTES :
- Traduis UNIQUEMENT le texte, conserve les numéros [1], [2], etc.
- Conserve le ton et le style du dialogue (familier si familier, formel si formel)
- Les noms propres restent en anglais sauf s'il y a une traduction officielle connue
- Les onomatopées peuvent rester (Oh, Ah, Hmm...)
- Si une ligne est déjà en français, laisse-la telle quelle
- Réponds UNIQUEMENT avec les lignes traduites, aucun commentaire
- Chaque ligne doit commencer par [numéro] suivi du texte traduit`
          },
          {
            role: 'user',
            content: numberedText
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const translated = completion.choices[0]?.message?.content || '';
      
      // Parse the translated lines
      const translatedTexts = translated.split('\n').filter((l: string) => l.trim());
      
      for (let i = 0; i < chunk.length; i++) {
        const original = chunk[i];
        let translatedText = original.text; // fallback to original

        // Try to find the matching [number] in translation
        const matchLine = translatedTexts.find(
          (t: string) => t.trim().startsWith(`[${i + 1}]`)
        );
        
        if (matchLine) {
          // Extract text after [number]
          const textMatch = matchLine.replace(/^\[\d+\]\s*/, '').trim();
          if (textMatch) translatedText = textMatch;
        } else if (translatedTexts[i]) {
          // Fallback: use line by position
          const textMatch = translatedTexts[i].replace(/^\[\d+\]\s*/, '').trim();
          if (textMatch) translatedText = textMatch;
        }

        translatedLines.push({
          ...original,
          text: translatedText,
        });
      }
    }

    return NextResponse.json({
      translated: translatedLines,
      total: translatedLines.length,
      targetLang,
    });
  } catch (error) {
    console.error('[subtitles/translate/api] POST error:', error);
    return NextResponse.json({ error: 'Erreur de traduction' }, { status: 500 });
  }
}
