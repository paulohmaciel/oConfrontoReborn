// Gera os ícones dos locais de caça (arte própria do projeto, não TibiaWiki): frontend/public/assets/regions/<chave>.svg
// Uso: node scripts/region-icons.mjs   — rode de novo depois de ajustar um desenho.
import { mkdirSync, writeFileSync } from 'node:fs';

const INK = '#2a1a10';
const svg = body => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
<g stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">${body}</g></svg>
`;
const shadow = '<ellipse cx="32" cy="57" rx="25" ry="4" fill="#000" fill-opacity=".22" stroke="none"/>';
// Algarismos romanos desenhados em barras (não dependem de fonte).
const roman = (n, x, y, color = '#f3d27a') => {
  const bar = (bx) => `<rect x="${bx}" y="${y}" width="4" height="12" rx="1" fill="${color}"/>`;
  if (n === 4) return bar(x) + `<path d="M${x + 7} ${y} L${x + 11} ${y + 12} L${x + 15} ${y}" fill="none" stroke="${color}" stroke-width="3.5"/>`;
  return Array.from({ length: n }, (_, i) => bar(x + i * 6)).join('');
};

const icons = {
  // Campos de Thais: colina, casinha de telhado vermelho e cerca.
  outskirts: shadow + `<path d="M3 54 Q17 33 33 44 Q47 34 61 54 Z" fill="#6f9e4c"/>
<path d="M40 46 v8 M47 45 v9 M54 47 v7 M38 49 h19" fill="none" stroke="#7a4b26"/>
<rect x="14" y="32" width="20" height="16" fill="#e2c491"/><path d="M10 33 L24 20 L38 33 Z" fill="#b5482f"/>
<rect x="21" y="39" width="6" height="9" fill="#6b3d22"/><rect x="16" y="35" width="4" height="4" fill="#f2d27a" stroke-width="1.5"/>
<circle cx="50" cy="14" r="6" fill="#f6c94a"/>`,
  // Pedreira: pilha de pedras e uma picareta fincada.
  quarry: shadow + `<path d="M6 54 L14 38 L26 34 L34 42 L44 36 L56 44 L59 54 Z" fill="#8a8f96"/>
<path d="M14 38 L20 47 L26 34 M34 42 L38 52 M44 36 L48 47" fill="none" stroke="#5c6168"/>
<path d="M16 41 L19 39 M45 39 L49 41" fill="none" stroke="#c4c8cd" stroke-width="1.5"/>
<path d="M44 10 L28 40" fill="none" stroke="#7a4b26" stroke-width="4"/><path d="M44 10 L28 40" fill="none" stroke="#a8713d" stroke-width="2"/>
<path d="M33 10 Q44 2 56 12 Q45 8 41 14 Z" fill="#c9ccd1"/>`,
  // Ruínas Flamejantes: colunas partidas com chamas atrás.
  ruins: shadow + `<path d="M22 50 Q14 34 24 20 Q26 30 31 26 Q30 14 38 8 Q36 22 44 24 Q50 30 42 50 Z" fill="#e8662a"/>
<path d="M27 50 Q24 40 30 32 Q31 38 35 36 Q36 30 40 28 Q42 40 38 50 Z" fill="#f6c94a"/>
<rect x="10" y="26" width="10" height="28" fill="#cdb98e"/><rect x="8" y="23" width="14" height="5" fill="#b9a476"/>
<path d="M44 54 V36 L48 33 L50 37 L54 34 V54 Z" fill="#cdb98e"/><path d="M14 30 v20 M49 40 v12" fill="none" stroke="#a08c62"/>
<path d="M4 54 h56" fill="none"/>`,
  // Acampamento Orc: tenda listrada e estandarte com caveira.
  orc_camp: shadow + `<path d="M8 54 L28 18 L48 54 Z" fill="#7c6a3a"/><path d="M28 18 L22 54 M28 18 L34 54" fill="none" stroke="#5b4c27"/>
<path d="M24 54 L28 40 L32 54 Z" fill="#2d2416"/>
<path d="M52 54 V10" fill="none" stroke="#7a4b26" stroke-width="3"/><path d="M52 12 h-14 l4 6 l-4 6 h14 Z" fill="#a83232"/>
<circle cx="46" cy="18" r="3.5" fill="#efe6d2" stroke-width="1.5"/><path d="M44.5 18 h0.1 M47.5 18 h0.1" stroke-width="1.6"/>`,
  // Portões do Abismo: arco de pedra escura com brilho vermelho e espinhos.
  abyss: shadow + `<defs><radialGradient id="g" cx="50%" cy="60%" r="60%"><stop offset="0" stop-color="#ffb347"/><stop offset=".45" stop-color="#d1361f"/><stop offset="1" stop-color="#3a0a0a"/></radialGradient></defs>
<path d="M10 56 V26 Q10 8 32 8 Q54 8 54 26 V56 Z" fill="#3b2f3a"/><path d="M18 56 V28 Q18 16 32 16 Q46 16 46 28 V56 Z" fill="url(#g)"/>
<path d="M10 26 L5 22 M54 26 L59 22 M22 10 L19 4 M42 10 L45 4 M32 8 V2" fill="none" stroke="#3b2f3a" stroke-width="3"/>
<path d="M26 44 h12 M28 38 h8" fill="none" stroke="#ffd36b" stroke-opacity=".6"/>`,
  // Labirinto dos Minotauros: muros de pedra em espiral e chifres.
  labyrinth: shadow + `<rect x="10" y="18" width="44" height="36" rx="2" fill="#a99a7c"/>
<path d="M16 24 h32 v24 h-26 v-18 h20 v12 h-14" fill="none" stroke="#5e533d" stroke-width="3"/>
<path d="M16 16 Q8 8 12 2 Q16 10 24 12 Z M48 16 Q56 8 52 2 Q48 10 40 12 Z" fill="#efe3c4"/>`,
  // Terras Geladas: montanha nevada e floco de neve.
  frost: shadow + `<path d="M4 54 L24 18 L34 32 L42 22 L60 54 Z" fill="#7d93b0"/><path d="M24 18 L18 30 L23 28 L27 33 L30 27 L34 32 Z M42 22 L37 31 L42 29 L46 31 Z" fill="#f4f8fc"/>
<g stroke="#bfe3ff" stroke-width="2.4"><path d="M50 4 v16 M43 8 l14 8 M43 16 l14 -8"/></g>`,
  // Pântano Sombrio: água parada, junco, bolhas e árvore morta.
  swamp: shadow + `<ellipse cx="32" cy="50" rx="27" ry="8" fill="#3e5a3a"/><path d="M12 48 q6 -3 12 0 M34 52 q6 -3 12 0" fill="none" stroke="#6f8f5c"/>
<path d="M44 46 V22 L36 14 M44 30 L52 22 M44 36 L50 34" fill="none" stroke="#4a3622" stroke-width="3"/>
<path d="M14 48 V30 M18 48 V26 M22 48 V32" fill="none" stroke="#8a9b4a"/><ellipse cx="18" cy="25" rx="2" ry="4" fill="#7a5a2c" stroke-width="1.5"/>
<circle cx="30" cy="44" r="2" fill="#9fd08a" stroke-width="1.2"/><circle cx="35" cy="40" r="1.5" fill="#9fd08a" stroke-width="1"/>`,
  // Cripta Esquecida: lápide com cruz e névoa roxa.
  crypt: shadow + `<ellipse cx="32" cy="50" rx="24" ry="7" fill="#6b4f8a" fill-opacity=".55" stroke="none"/>
<path d="M18 54 V24 Q18 10 32 10 Q46 10 46 24 V54 Z" fill="#9aa0a8"/><path d="M32 18 v20 M25 25 h14" fill="none" stroke="#5a5f66" stroke-width="3.5"/>
<path d="M10 54 h44" fill="none"/><path d="M12 54 l2 -5 l2 5 M48 54 l2 -6 l2 6" fill="#5f8a3e"/>`,
  // Cidadela dos Renegados: torre com ameias e bandeira rasgada.
  citadel: shadow + `<path d="M18 56 V22 h4 v-5 h5 v5 h10 v-5 h5 v5 h4 V56 Z" fill="#8b8478"/>
<rect x="28" y="40" width="8" height="16" rx="4" fill="#2d2620"/><rect x="24" y="28" width="4" height="6" fill="#2d2620" stroke-width="1.5"/><rect x="36" y="28" width="4" height="6" fill="#2d2620" stroke-width="1.5"/>
<path d="M32 17 V4" fill="none" stroke="#5a4630" stroke-width="2.5"/><path d="M32 5 h16 l-4 3 l3 3 l-5 1 l2 3 h-12 Z" fill="#2b2b33"/>`,
  // Santuário Elemental: templo com quatro orbes (fogo, água, terra, ar).
  sanctuary: shadow + `<path d="M8 26 L32 12 L56 26 Z" fill="#e3d5b0"/><rect x="8" y="26" width="48" height="5" fill="#cbbb8e"/>
<path d="M13 31 v19 M24 31 v19 M40 31 v19 M51 31 v19" fill="none" stroke="#e3d5b0" stroke-width="5"/><path d="M13 31 v19 M24 31 v19 M40 31 v19 M51 31 v19" fill="none" stroke="${INK}" stroke-width="1" stroke-opacity=".35"/>
<rect x="6" y="50" width="52" height="6" fill="#cbbb8e"/>
<circle cx="32" cy="40" r="7" fill="#fff6d6" fill-opacity=".9"/>
<circle cx="20" cy="6" r="3.5" fill="#e8662a"/><circle cx="28" cy="4" r="3.5" fill="#3d8be0"/><circle cx="36" cy="4" r="3.5" fill="#5aa04a"/><circle cx="44" cy="6" r="3.5" fill="#e9eef3"/>`,
  // Eras: lugares antigos voltando muito mais fortes, com o numeral da Era.
  era1: shadow + `<path d="M8 56 V24 Q8 10 22 10 V18 Q16 18 16 26 V56 Z M56 56 V24 Q56 10 42 10 V18 Q48 18 48 26 V56 Z" fill="#b9a476"/>
<path d="M22 10 h6 l2 6 h-8 Z M42 10 h-4 l-1 5 h5 Z" fill="#cdb98e"/><rect x="20" y="30" width="24" height="18" rx="2" fill="#4a3a26"/>` + roman(1, 30, 33),
  era2: shadow + `<path d="M10 56 L16 26 L22 40 L28 14 L36 36 L42 22 L54 56 Z" fill="#a9d6f0"/><path d="M16 26 L18 50 M28 14 L30 50 M42 22 L44 50" fill="none" stroke="#e8f6ff"/>
<rect x="20" y="40" width="24" height="16" rx="2" fill="#24435a"/>` + roman(2, 26, 42, '#dff3ff'),
  era3: shadow + `<path d="M8 56 V30 h6 v-6 h5 v6 h8 V18 h4 v-6 h2 v6 h4 v12 h8 v-6 h5 v6 h6 V56 Z" fill="#6f6a8a"/>
<rect x="20" y="38" width="24" height="16" rx="2" fill="#2e2a44"/>` + roman(3, 23, 40, '#e9d8ff'),
  era4: shadow + `<circle cx="32" cy="32" r="24" fill="#2a1630"/><path d="M32 12 Q50 14 50 32 Q50 46 34 46 Q22 46 22 34 Q22 26 32 26 Q38 26 38 32" fill="none" stroke="#c0392b" stroke-width="3"/>
<path d="M32 12 Q14 14 14 32" fill="none" stroke="#7d2a8a" stroke-width="3"/><rect x="18" y="44" width="28" height="14" rx="2" fill="#3a0a0a"/>` + roman(4, 22, 45, '#ffb38a'),
  // Vale da Perdição: o lugar mais temido — picos escuros, lua vermelha e uma caveira.
  capriel: shadow + `<circle cx="32" cy="18" r="13" fill="#c0261c"/><circle cx="36" cy="15" r="3" fill="#e8463a" stroke="none"/>
<path d="M2 56 L14 22 L24 40 L32 34 L40 40 L50 20 L62 56 Z" fill="#1d1620"/><path d="M14 22 L18 36 M50 20 L46 36" fill="none" stroke="#3d2f44"/>
<path d="M24 54 Q24 42 32 42 Q40 42 40 54 Z" fill="#e8e0cf"/><circle cx="29" cy="48" r="2" fill="${INK}" stroke="none"/><circle cx="35" cy="48" r="2" fill="${INK}" stroke="none"/>
<path d="M30 53 v-2 M32 53 v-2 M34 53 v-2" fill="none" stroke-width="1.2"/>`,
};

const dir = 'frontend/public/assets/regions';
mkdirSync(dir, { recursive: true });
for (const [key, body] of Object.entries(icons)) writeFileSync(`${dir}/${key}.svg`, svg(body));
console.log(`${Object.keys(icons).length} ícones gerados em ${dir}`);
