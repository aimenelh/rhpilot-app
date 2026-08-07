import Anthropic from "@anthropic-ai/sdk";

// Utilisé uniquement si une clé est configurée — sinon la fonctionnalité
// se désactive proprement (voir askAboutOrganization), jamais un plantage.
const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const SYSTEM_PROMPT = `Tu es l'assistant de RH Pilot, un copilote RH pour TPE/PME. Un utilisateur RH te pose une question sur son organisation.

Règles strictes, sans exception :
- Utilise UNIQUEMENT les données fournies ci-dessous. N'invente jamais un fait, un nom ou une date qui n'y figure pas.
- Si l'information demandée n'est pas dans les données fournies, dis-le clairement plutôt que de deviner.
- Ne donne jamais de conseil juridique ni d'interprétation d'une convention collective — oriente vers la bonne ressource si la question s'y prête.
- Ne donne jamais de conseil médical.
- Reste factuel, concis (quelques phrases maximum), et cite les salariés concernés par leur nom quand c'est pertinent.
- Ne dis jamais "je pense que" ou "à mon avis" — dis "j'observe que" ou "les données montrent que", pour rester ancré dans les faits fournis, jamais une opinion.
- Tu n'as aucune capacité d'action : tu ne peux qu'informer, jamais déclencher quoi que ce soit toi-même.`;

export async function askAboutOrganization(question: string, context: string): Promise<string> {
  if (!client) {
    throw new Error("Fonctionnalité IA non configurée (ANTHROPIC_API_KEY manquante).");
  }

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Données de l'organisation :\n\n${context}\n\nQuestion : ${question}`,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock?.type === "text" ? textBlock.text : "Aucune réponse générée.";
}
