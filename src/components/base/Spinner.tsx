
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', label }) => {
  return (
    <div className={`spinner-container spinner-${size}`} role="status">
      <div className="spinner"></div>
      {label && <span className="spinner-label">{label}</span>}
    </div>
  );
};

export default Spinner;
