export const Slider = ({ value, setValue, step = 1 }) => {
  const handleChange = (event) => {
    setValue(parseFloat(event.target.value));
  };

  return (
    <input
      type="range"
      min="0"
      max="1"
      step={step}
      value={value}
      onChange={handleChange}
      style={{ width: "100%" }}
    />
  );
};

export const Select = ({ value, setValue, options, displayForOption = (value) => value }) => {
  const handleChange = (event) => {
    setValue(event.target.value);
  };

  return (
    <select value={value} onChange={handleChange}>
      {options.map(option => (
        <option key={option} value={option}>{displayForOption(option)}</option>
      ))}
    </select>
  );
}