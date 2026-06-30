
interface TimelineItem {
  id: string;
  title: string;
  time: string;
  description?: string;
  status?: 'pending' | 'completed' | 'failed';
}

interface TimelineProps {
  items: TimelineItem[];
}

export const Timeline: React.FC<TimelineProps> = ({ items }) => {
  return (
    <div className="timeline">
      {items.map((item) => (
        <div key={item.id} className="timeline-item">
          <span className="timeline-time">{item.time}</span>
          <span className="timeline-title">{item.title}</span>
          {item.description && <p className="timeline-desc">{item.description}</p>}
        </div>
      ))}
    </div>
  );
};

export default Timeline;
