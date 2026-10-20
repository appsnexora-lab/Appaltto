/**
 * samplePdfGenerator.ts
 * Generates valid multi-page PDF 1.4 binary documents in pure TypeScript.
 * Allows instant reading of Christian classic literature with real pages, chapters, and text
 * using pdfjs-dist and the built-in reader.
 */

import { Book } from '@/types';
import { generateOriginalBookCover } from '../bookCoverGenerator';

export interface ClassicBookDefinition {
  id: string;
  title: string;
  author: string;
  description: string;
  year?: string;
  pages: {
    chapterTitle: string;
    paragraphs: string[];
  }[];
}

export const CLASSIC_BOOKS: ClassicBookDefinition[] = [
  {
    id: 'classic-peregrino-pdf',
    title: 'O Peregrino',
    author: 'John Bunyan',
    description: 'A célebre alegoria da jornada de Cristão da Cidade da Destruição até a Cidade Celestial.',
    year: '1678',
    pages: [
      {
        chapterTitle: 'Capítulo I — O Sonho e a Partida',
        paragraphs: [
          'Caminhando pelo deserto deste mundo, cheguei a um lugar onde havia uma caverna; ali me deitei para dormir e, enquanto dormia, tive um sonho.',
          'Vi um homem vestido de farrapos, de pé em certo lugar, com as costas voltadas para a sua própria casa, um fardo pesado sobre os ombros e um livro nas mãos.',
          'Olhei, e vi-o abrir o livro e ler nele; e, enquanto lia, chorava e tremia; e, não podendo conter-se por mais tempo, deu um grito angustioso dizendo: "Que farei eu para ser salvo?"',
          'Nesse estado voltou para casa, e conteve-se o melhor que pôde, para que a mulher e os filhos não percebessem a sua aflição. Mas não pôde calar-se por muito tempo, porque a sua dor aumentava.',
        ],
      },
      {
        chapterTitle: 'Capítulo II — O Encontro com Evangelista',
        paragraphs: [
          'Então vi um homem chamado Evangelista aproximar-se dele e perguntar: "Por que choras?" Ele respondeu: "Senhor, vejo por este livro que estou condenado a morrer e depois a juízo."',
          'Disse-lhe Evangelista: "Se este é o teu estado, por que estás aqui parado?" Ele respondeu: "Porque não sei para onde ir."',
          'Então Evangelista deu-lhe um rolo de pergaminho, no qual estava escrito com letras de ouro: "Foge da ira futura!"',
          'O homem olhou atentamente para o rolo e perguntou: "Para onde devo fugir?" Evangelista apontou com o dedo sobre um campo mui espaçoso e disse: "Vês além aquela Porta Estreita?"',
        ],
      },
      {
        chapterTitle: 'Capítulo III — A Porta Estreita e a Colina da Dificuldade',
        paragraphs: [
          'O homem começou a correr. Não tinha corrido ainda longe da sua porta quando a mulher e os filhos começaram a gritar para que voltasse; mas o homem pôs os dedos nos ouvidos.',
          'Corria exclamando: "Vida! Vida! Vida eterna!" E não olhou para trás, mas continuou apressado para o meio da planície.',
          'Chegando à Porta Estreita, bateu repetidamente: "Aqui pode entrar um pecador indigno como eu?"',
          'A porta foi aberta por um homem de semblante grave chamado Boa Vontade, que o puxou para dentro com amor paternal, dizendo: "Com prazer acolhemos todo viajante sincero."',
        ],
      },
      {
        chapterTitle: 'Capítulo IV — A Cruz e a Queda do Fardo',
        paragraphs: [
          'Ele subiu então por um caminho que era cercado de ambos os lados por um muro alto, e esse muro chamava-se Salvação.',
          'Por este caminho subia o Cristão, embora com grande dificuldade por causa do fardo que trazia às costas.',
          'Subiu até chegar a um lugar elevado sobre o qual estava erguida uma Cruz, e um pouco mais abaixo, uma sepultura aberta.',
          'E sucedeu que, quando Cristão chegou à Cruz, o fardo soltou-se de seus ombros, caiu pelas suas costas e começou a rolar pela encosta abaixo, até cair na boca da sepultura, onde desapareceu para sempre.',
          'Então Cristão ficou leve e alegre, e disse com coração jubiloso: "Ele me deu descanso pela Sua dor e vida pela Sua morte!"',
        ],
      },
    ],
  },
  {
    id: 'classic-imitacao-pdf',
    title: 'A Imitação de Cristo',
    author: 'Tomás de Kempis',
    description: 'Um dos maiores tesouros de devoção e disciplina espiritual cristã da história.',
    year: '1418',
    pages: [
      {
        chapterTitle: 'Livro I — Da Imitação de Cristo e Desprezo das Vaidades',
        paragraphs: [
          '"Aquele que me segue não anda em trevas", diz o Senhor (Jo 8,12). Com estas palavras Cristo nos exorta a imitar Sua vida e Seus costumes, se queremos ser verdadeiramente iluminados.',
          'Seja, pois, nosso principal estudo meditar continuamente na vida de Jesus Cristo.',
          'A doutrina de Cristo excede a todas as doutrinas dos santos; e quem tiver Seu Espírito encontrará nela o maná escondido da consolação celestial.',
          'De que te serve discutir profundamente sobre a Santíssima Trindade, se não fores humilde e por isso desagradares à Trindade?',
        ],
      },
      {
        chapterTitle: 'Livro I, Capítulo II — Do Sentimento Humilde de Si Mesmo',
        paragraphs: [
          'Todo homem naturalmente deseja saber; mas que vale a ciência sem o temor de Deus?',
          'Certamente mais vale um camponês humilde que serve a Deus do que um filósofo soberbo que, descuidando de si mesmo, contempla o curso das estrelas no firmamento.',
          'Se pensas que sabes muito e entendes bem as coisas, sabe também que é muito mais o que ignoras.',
          'A mais alta e útil ciência é o verdadeiro conhecimento e o desprezo de nós mesmos.',
        ],
      },
      {
        chapterTitle: 'Livro II — Da Vida Interior e Paz da Alma',
        paragraphs: [
          'O Reino de Deus está dentro de vós, diz o Senhor. Converte-te de todo o coração a Deus, e deixa este miserável mundo, e tua alma achará repouso.',
          'Aprende a desprezar as coisas exteriores e a dar-te às interiores, e verás vir a ti o Reino de Deus.',
          'Porque o Reino de Deus é paz e alegria no Espírito Santo, o que não é concedido aos ímpios.',
          'Cristo virá a ti manifestando-te a Sua consolação, se Lhe preparares no íntimo uma digna morada.',
        ],
      },
    ],
  },
  {
    id: 'classic-confissoes-pdf',
    title: 'Confissões',
    author: 'Santo Agostinho',
    description: 'As profundas orações e memórias do bispo de Hipona sobre a busca inquieta por Deus.',
    year: '397',
    pages: [
      {
        chapterTitle: 'Livro I — Grande és Tu, Senhor',
        paragraphs: [
          'Grande és Tu, Senhor, e mui digno de louvor; grande é o Teu poder, e a Tua sabedoria não tem medida.',
          'E o homem, simples partícula da Tua criação, deseja louvar-Te; o homem que carrega consigo a sua mortalidade e o testemunho do seu pecado.',
          'Tu nos incitas a nos deleitarmos no Teu louvor, porque nos fizeste para Ti, e inquieto está o nosso coração enquanto não repousar em Ti.',
          'Dá-me, Senhor, saber e compreender qual é o primeiro: se invocar-Te ou louvar-Te; se conhecer-Te ou invocar-Te.',
        ],
      },
      {
        chapterTitle: 'Livro X — Tarde Te Amei, Beleza Antiga e Nova',
        paragraphs: [
          'Tarde Te amei, ó Beleza tão antiga e tão nova, tarde Te amei! Eis que estavas dentro de mim e eu estava fora, e aí Te procurava.',
          'Eu, disforme, lançava-me sobre as belas formas das criaturas que fizeste. Estavas comigo, e eu não estava Contigo.',
          'Retinham-me longe de Ti aquelas coisas que, se não estivessem em Ti, nem existiriam.',
          'Chamaste-me, clamaste e rompeste a minha surdez; brilhaste, cintilaste e dissipaste a minha cegueira; espargiste Teu perfume e aspirei-o, e agora anseio por Ti; provei-Te e tenho fome e sede; tocaste-me e abrasei-me na Tua paz.',
        ],
      },
    ],
  },
  {
    id: 'classic-presenca-pdf',
    title: 'Prática da Presença de Deus',
    author: 'Irmão Lourenço',
    description: 'Conversas íntimas e cartas sobre encontrar Deus no trabalho simples do dia a dia.',
    year: '1692',
    pages: [
      {
        chapterTitle: 'Conversa Primeira — Encontrando a Deus na Cozinha',
        paragraphs: [
          'O Irmão Lourenço dizia que a santidade não consiste em mudar de ocupações, mas em fazer para Deus o que comumente fazemos para nós mesmos.',
          'O tempo de oração não deve ser diferente de qualquer outro tempo; estamos tão estritamente unidos a Deus durante a ação no meio da cozinha como na capela ajoelhados.',
          'Não há no mundo vida mais doce nem mais deliciosa que a de uma contínua conversação com Deus.',
          'Ele virava a sua omelete na frigideira para o amor de Deus, e quando terminava, prostrava-se em silêncio com o coração cheio de júbilo.',
        ],
      },
      {
        chapterTitle: 'Carta Segunda — A Comunhão Ininterrupta',
        paragraphs: [
          'Não é preciso grande coisa para agradar a Deus; basta oferecer-Lhe o pequeno afeto do coração e lembrar que Ele nos vê com infinita misericórdia.',
          'Acostume-se, peço-lhe, a adorá-Lo muitas vezes no fundo da alma; Ele não pede coisas difíceis, pede apenas fidelidade constante.',
          'Nas menores tarefas do dia, eleve o coração: "Meu Senhor, eis-me aqui todo Vosso; fazei em mim Tua vontade."',
        ],
      },
    ],
  },
  {
    id: 'classic-ortodoxia-pdf',
    title: 'Ortodoxia',
    author: 'G. K. Chesterton',
    description: 'A surpreendente defesa da fé cristã como a única chave que abre todos os enigmas da vida.',
    year: '1908',
    pages: [
      {
        chapterTitle: 'Capítulo I — Introdução em Defesa de Tudo',
        paragraphs: [
          'Este livro pretende ser uma autobiografia desajeitada de um homem que descobriu a velha verdade e pensou tê-la inventado.',
          'Eu tentei fundar uma heresia própria e, quando dei o último retoque nela, descobri que era a velha ortodoxia cristã.',
          'O objetivo desta obra é mostrar que a fé cristã não é um dogma cinzento, mas a única aventura emocionante que restou neste mundo.',
          'O homem que não acredita em Deus não acredita em nada; ele acredita em qualquer coisa.',
        ],
      },
      {
        chapterTitle: 'Capítulo V — A Bandeira do Mundo',
        paragraphs: [
          'O cristianismo veio ao mundo não para explicar tudo com lógica fria, mas para abraçar as contradições divinas que mantêm a vida viva.',
          'Ele combinou uma feroz coragem militar com a ternura de uma pomba; o leão e o cordeiro na mesma alma.',
          'A alegria do cristão é o gigantesco segredo do universo: no fundo de todas as dores do Calvário repousa a manhã eterna do Ressurreto.',
        ],
      },
    ],
  },
  {
    id: 'classic-graca-pdf',
    title: 'Graça Abundante ao Principal dos Pecadores',
    author: 'John Bunyan',
    description: 'A autobiografia espiritual de John Bunyan e sua libertação das trevas para a gloriosa luz de Cristo.',
    year: '1666',
    pages: [
      {
        chapterTitle: 'Capítulo I — A Mocidade e o Chamado da Consciência',
        paragraphs: [
          'Para que outros possam ser encorajados a confiar na infinita graça de Deus, resolvi relatar a obra da Sua mão sobre a minha pobre alma.',
          'Em meio aos meus maiores desvarios, o Senhor não me abandonou de todo; enviava-me sonhos apavorantes e visões da eternidade.',
          'Um dia, ouvi quatro senhoras idosas sentadas ao sol em Bedford falando das coisas do Reino com tal candura que meu coração foi profundamente tocado.',
          'Falavam de um novo nascimento, da obra de Deus nos corações e de como Cristo Se tornara a sua única esperança.',
        ],
      },
    ],
  },
  {
    id: 'classic-sermao-monte-pdf',
    title: 'O Sermão da Montanha e o Discipulado',
    author: 'João Crisóstomo',
    description: 'Comentários pastorais e aprofundamento das Bem-Aventuranças de Mateus 5 a 7.',
    year: '390',
    pages: [
      {
        chapterTitle: 'Homilia XV — Bem-Aventurados os Pobres de Espírito',
        paragraphs: [
          'Cristo sobe à montanha não para se afastar dos homens, mas para erigir o mais nobre púlpito da terra.',
          'Diz Ele: "Bem-aventurados os pobres de espírito, porque deles é o Reino dos Céus".',
          'Pobre de espírito é aquele que se reconhece necessitado da graça divina, que renuncia à soberba e à presunção dos fariseus.',
          'A humildade é o alicerce sólido sobre o qual se edifica todo o edifício das virtudes celestiais.',
        ],
      },
      {
        chapterTitle: 'Homilia XVI — O Sal da Terra e a Luz do Mundo',
        paragraphs: [
          '"Vós sois o sal da terra". O sal preserva da corrupção e dá sabor aos alimentos; assim os discípulos devem purificar e vivificar o mundo.',
          '"Vós sois a luz do mundo. Não se pode esconder uma cidade edificada sobre um monte."',
          'A fé não é para ser escondida sob o alqueire da covardia, mas para resplandecer em boas obras diante de todos.',
        ],
      },
    ],
  },
];

/**
 * Builds a strictly compliant, lightweight multi-page PDF 1.4 binary (ArrayBuffer).
 * Contains real page trees, Type1 font resources, standard A4 MediaBox, and stream chunks.
 */
export function buildPdfBinary(
  title: string,
  author: string,
  pages: { chapterTitle: string; paragraphs: string[] }[]
): ArrayBuffer {
  const objects: string[] = [];
  function addObject(content: string): number {
    objects.push(content);
    return objects.length;
  }

  // Object 1: Catalog
  addObject('<< /Type /Catalog /Pages 2 0 R >>');

  // Object 2: Pages Parent (placeholder, replaced after generating pages)
  objects.push('');

  // Object 3: Font Resource (Helvetica)
  const fontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  // Object 4: Font Bold Resource (Helvetica-Bold)
  const fontBoldId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

  const pageIds: number[] = [];

  for (let i = 0; i < pages.length; i++) {
    const pageData = pages[i];
    let stream = '';

    // Page Header
    stream += 'BT\n';
    stream += `/F2 10 Tf\n`;
    stream += `50 800 Td\n`;
    const cleanHeader = `${title} — ${author}`.replace(/[\\()]/g, '');
    stream += `(${cleanHeader}) Tj\n`;
    stream += `0 -5 Td\n`;
    stream += 'ET\n';

    // Thin separator line
    stream += 'q 0.5 w 0.7 0.7 0.7 RG 50 790 m 545 790 l S Q\n';

    // Chapter Title
    stream += 'BT\n';
    stream += `/F2 16 Tf\n`;
    stream += `50 755 Td\n`;
    const cleanTitle = pageData.chapterTitle.replace(/[\\()]/g, '');
    stream += `(${cleanTitle}) Tj\n`;
    stream += 'ET\n';

    // Paragraphs with Word-Wrapping
    let currentY = 715;
    for (const paragraph of pageData.paragraphs) {
      const words = paragraph.split(' ');
      const lines: string[] = [];
      let curLine = '';
      const maxChars = 74;

      for (const word of words) {
        if ((curLine + ' ' + word).trim().length < maxChars) {
          curLine = (curLine + ' ' + word).trim();
        } else {
          if (curLine) lines.push(curLine);
          curLine = word;
        }
      }
      if (curLine) lines.push(curLine);

      stream += 'BT\n';
      stream += `/F1 11 Tf\n`;
      stream += `50 ${currentY} Td\n`;

      lines.forEach((l, idx) => {
        const cleanL = l.replace(/[\\()]/g, '');
        if (idx === 0) {
          stream += `(${cleanL}) Tj\n`;
        } else {
          stream += `0 -17 Td\n(${cleanL}) Tj\n`;
        }
      });
      stream += 'ET\n';

      currentY -= lines.length * 17 + 16;
      if (currentY < 90) break;
    }

    // Page Number Footer
    stream += 'BT\n';
    stream += `/F1 10 Tf\n`;
    stream += `270 45 Td\n`;
    stream += `(- ${i + 1} -) Tj\n`;
    stream += 'ET\n';

    const byteLen = stream.length;
    const contentObj = `<< /Length ${byteLen} >>\nstream\n${stream}\nendstream`;
    const contentId = addObject(contentObj);

    // Page object with A4 dimensions (595.28 x 841.89 points)
    const pageObj = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`;
    const pageId = addObject(pageObj);
    pageIds.push(pageId);
  }

  // Update object 2 (Pages root)
  objects[1] = `<< /Type /Pages /Kids [${pageIds.map(id => id + ' 0 R').join(' ')}] /Count ${pageIds.length} >>`;

  // Assemble complete PDF structure
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];

  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const startXref = pdf.length;
  pdf += 'xref\n';
  pdf += `0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (const offset of offsets) {
    pdf += offset.toString().padStart(10, '0') + ' 00000 n \n';
  }
  pdf += 'trailer\n';
  pdf += `<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += 'startxref\n';
  pdf += startXref + '\n';
  pdf += '%%EOF\n';

  // Convert to ArrayBuffer
  const buffer = new ArrayBuffer(pdf.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < pdf.length; i++) {
    view[i] = pdf.charCodeAt(i) & 0xff;
  }
  return buffer;
}

/**
 * Creates and returns all standard Christian classic PDF books complete with binary,
 * cover images, and metadata ready for IndexedDB persistence.
 */
export function generateAllClassicPdfBooks(): {
  book: Book;
  pdfBytes: ArrayBuffer;
  coverUrl: string;
}[] {
  return CLASSIC_BOOKS.map(def => {
    const coverUrl = generateOriginalBookCover(def.title, def.author, 'pdf');
    const pdfBytes = buildPdfBinary(def.title, def.author, def.pages);

    const book: Book = {
      id: def.id,
      title: def.title,
      author: def.author,
      description: def.description,
      format: 'pdf',
      fileBlobKey: def.id,
      coverUrl: coverUrl,
      coverType: 'image/jpeg',
      coverSource: 'metadata',
      coverGeneratedAt: new Date().toISOString(),
      totalPages: def.pages.length,
      fileSize: pdfBytes.byteLength,
      status: 'not_started',
      isFavorite: def.id.includes('peregrino') || def.id.includes('imitacao'),
      addedAt: new Date().toISOString(),
    };

    return { book, pdfBytes, coverUrl };
  });
}
