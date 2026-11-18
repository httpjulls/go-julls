import { Link } from 'react-router-dom';
import { useApp } from '../app/AppContext';
import { claudePrompt, materialForTopic } from '../data/materials';
import { Icon } from '../ui/kit';

/** "Ler material" quando a biblioteca tem o tópico; senão, "Pedir ao Claude" (copia o prompt e abre o claude.ai). */
export function MaterialButtons({ topicId, topicName, subjectName }: { topicId: string; topicName: string; subjectName: string }) {
  const { toast } = useApp();
  const m = materialForTopic(topicId);
  if (m)
    return (
      <Link to={`/material/${m.id}`} className="btn-primary col-span-2">
        <Icon name="book" size={18} /> {m.rapida ? `Revisão rápida de ${subjectName}` : `Ler material: ${m.titulo}`}
      </Link>
    );
  const ask = async () => {
    const prompt = claudePrompt(topicName, subjectName, topicId);
    try {
      await navigator.clipboard.writeText(prompt);
      toast('Pedido copiado. Cole no Claude.');
    } catch {
      // sem acesso à área de transferência: mostra o pedido para copiar à mão
      window.prompt('Copie este pedido e cole no Claude:', prompt);
    }
    window.open('https://claude.ai/new', '_blank', 'noopener');
  };
  return (
    <button className="btn-primary col-span-2" onClick={() => void ask()}>
      <Icon name="pen" size={18} /> Pedir material ao Claude
    </button>
  );
}
