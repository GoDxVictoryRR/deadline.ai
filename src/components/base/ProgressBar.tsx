
interface ProgressBarProps {
  value: number; // 0 to 100
  max?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value, max = 100 }) => {
  return (
    <div className="progress-bar-container">
      {/* Runtime-dynamic style justified: width depends on state input value/max */}
      <div className="progress-bar-fill" style={{ width: `${(value / max) * 100}%` }}></div>
    </div>
  );
};

export default ProgressBar;
