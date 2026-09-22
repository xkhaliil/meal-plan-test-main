import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { generateImagenImageBuffer } from "../lib/nanoBanana";

const CHEF_LOGO_PROMPT = `App logo for a product named Chef, maximalist busy style: overcrowded square icon, clashing neon magenta, acid yellow-green, electric cyan and muddy brown in one composition, tiny unreadable tagline text, photorealistic chef hat with sparkles and lens flare mixed with glossy 3D chrome letters spelling CHEF in a different font, busy food photo collage background, heavy drop shadows and rainbow gradients, no single clear silhouette, details turn to mud when scaled down, amateur clip-art energy, centered chaos`;

async function main() {
  const buf = await generateImagenImageBuffer({
    prompt: CHEF_LOGO_PROMPT,
    aspectRatio: "1:1",
    imageSize: "2K",
    mimeType: "image/png",
  });
  const outPath = path.join(process.cwd(), "public", "images", "chef-logo.png");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buf);
  console.log("Wrote", outPath);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
