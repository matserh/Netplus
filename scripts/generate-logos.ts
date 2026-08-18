import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const LOGOS = [
  { id: 'gold', prompt: 'App icon logo, bold letter N with golden amber gradient on dark navy background, premium luxury style, clean geometric design, centered, professional brand logo, high quality' },
  { id: 'fire', prompt: 'App icon logo, letter N made of flames and fire elements on black background, vibrant orange and red gradient, dynamic energetic style, clean design, professional brand logo, high quality' },
  { id: 'ocean', prompt: 'App icon logo, letter N with ocean wave pattern, deep blue and teal aqua gradient on dark background, fluid liquid style, clean modern design, professional brand logo, high quality' },
  { id: 'forest', prompt: 'App icon logo, letter N with forest green gradient and leaf motif, emerald and dark green on black background, nature organic style, clean design, professional brand logo, high quality' },
  { id: 'night', prompt: 'App icon logo, letter N with starry night sky pattern, deep purple and indigo gradient with small stars, cosmic style on dark background, clean design, professional brand logo, high quality' },
  { id: 'sunset', prompt: 'App icon logo, letter N with warm sunset gradient, orange pink and purple tones on dark background, warm atmospheric style, clean design, professional brand logo, high quality' },
  { id: 'ice', prompt: 'App icon logo, letter N with crystalline ice frost effect, light blue and white gradient on dark blue background, frozen crystalline style, clean design, professional brand logo, high quality' },
  { id: 'royal', prompt: 'App icon logo, letter N with royal purple and gold crown accent, rich purple gradient on black background, regal luxurious style, clean design, professional brand logo, high quality' },
  { id: 'emerald', prompt: 'App icon logo, letter N with faceted emerald gemstone effect, green sparkle gradient on dark background, jewel precious stone style, clean design, professional brand logo, high quality' },
  { id: 'ruby', prompt: 'App icon logo, letter N with faceted ruby gemstone effect, deep red sparkle gradient on dark background, jewel precious stone style, clean design, professional brand logo, high quality' },
  { id: 'amber', prompt: 'App icon logo, letter N with amber resin glow effect, warm golden orange gradient on dark background, organic glowing style, clean design, professional brand logo, high quality' },
  { id: 'violet', prompt: 'App icon logo, letter N with neon violet electric glow, purple and magenta neon lines on black background, cyberpunk electric style, clean design, professional brand logo, high quality' },
  { id: 'copper', prompt: 'App icon logo, letter N with brushed copper metal texture, warm brown and orange metallic gradient on dark background, industrial metal style, clean design, professional brand logo, high quality' },
  { id: 'silver', prompt: 'App icon logo, letter N with polished silver chrome effect, white and gray metallic gradient on dark background, sleek reflective style, clean design, professional brand logo, high quality' },
  { id: 'platinum', prompt: 'App icon logo, letter N with premium platinum metal effect, white silver gradient with subtle blue tint on dark background, luxury metal style, clean design, professional brand logo, high quality' },
  { id: 'crimson', prompt: 'App icon logo, letter N with deep crimson blood red gradient, dark red and black on black background, dramatic intense style, clean design, professional brand logo, high quality' },
  { id: 'teal', prompt: 'App icon logo, letter N with teal turquoise gradient and water ripple, cyan and green on dark background, refreshing aquatic style, clean design, professional brand logo, high quality' },
  { id: 'rose', prompt: 'App icon logo, letter N with rose gold pink gradient, soft pink and gold on dark background, elegant feminine style, clean design, professional brand logo, high quality' },
  { id: 'indigo', prompt: 'App icon logo, letter N with deep indigo blue gradient and lightning bolt accent, electric blue on black background, powerful electric style, clean design, professional brand logo, high quality' },
  { id: 'graphite', prompt: 'App icon logo, letter N with dark graphite carbon fiber texture, dark gray and black gradient on black background, stealth dark mode style, clean design, professional brand logo, high quality' },
];

async function main() {
  const zai = await ZAI.create();
  const outDir = '/home/z/my-project/public/logos';
  
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log(`Generating ${LOGOS.length} NetPlus logo icons...`);

  for (let i = 0; i < LOGOS.length; i++) {
    const logo = LOGOS[i];
    const outPath = path.join(outDir, `${logo.id}.png`);
    
    try {
      console.log(`[${i+1}/${LOGOS.length}] Generating ${logo.id}...`);
      
      const response = await zai.images.generations.create({
        prompt: logo.prompt,
        size: '1024x1024'
      });

      const imageBase64 = response.data[0].base64;
      const buffer = Buffer.from(imageBase64, 'base64');
      
      // Resize to 192x192 for profile icons
      fs.writeFileSync('/tmp/logo_temp.png', buffer);
      
      // Use Python to resize
      const { execSync } = await import('child_process');
      execSync(`python3 -c "
from PIL import Image
img = Image.open('/tmp/logo_temp.png')
img = img.resize((192, 192), Image.LANCZOS)
img.save('${outPath}')
"`);
      
      console.log(`  ✓ Saved ${logo.id}.png (192x192)`);
    } catch (err: any) {
      console.error(`  ✗ Failed ${logo.id}: ${err.message}`);
    }
  }

  console.log('Done!');
}

main().catch(console.error);
