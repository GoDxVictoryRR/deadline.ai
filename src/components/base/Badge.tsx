
interface BadgeProps {
  color?: 'blue' | 'green' | 'amber' | 'red' | 'gray';
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ color = 'gray', children }) => {
  return (
    <span className={`badge-${color}`}>
      {children}
    </span>
  );
};

export default Badge;
